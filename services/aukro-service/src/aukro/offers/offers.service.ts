import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService, LoggerService, CatalogClientService, WarehouseClientService } from '@aukro/shared';
import { AiClientService } from '@aukro/shared/clients/ai-client.service';
import { NotificationsClientService } from '@aukro/shared/clients/notifications-client.service';
import {
  CatalogDraftMetadata,
  CatalogDraftSourceSnapshot,
  CatalogSellActionRequest,
  CatalogSellActionResponse,
} from './catalog-draft.types';
import {
  AiProposalFields,
  AiProposalRecord,
  AiProposalResponse,
  CreateAiProposalRequest,
  HumanReviewRecord,
  ReviewAiProposalRequest,
} from './ai-proposal.types';
import { OfferPolicyService } from './policy/offer-policy.service';
import {
  OfferPolicyEvaluation,
  OfferPolicyEvidence,
  OfferPolicyInput,
  PolicyEvidenceFlag,
} from './policy/offer-policy.types';

@Injectable()
export class OffersService {
  private readonly logger: LoggerService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogClient: CatalogClientService,
    private readonly warehouseClient: WarehouseClientService,
    private readonly offerPolicyService: OfferPolicyService,
    private readonly aiClient: AiClientService,
    private readonly notificationsClient: NotificationsClientService,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService;
    this.logger.setContext('OffersService');
  }

  async findAll(query: any): Promise<any> {
    return this.prisma.aukroOffer.findMany({
      where: {
        isActive: query.isActive !== undefined ? query.isActive === 'true' : undefined,
        accountId: query.accountId,
      },
      include: {
        account: true,
      },
    });
  }

  async findOne(id: string): Promise<any> {
    const offer = await this.prisma.aukroOffer.findUnique({
      where: { id },
      include: { account: true },
    });

    if (offer && offer.productId) {
      try {
        const product = await this.catalogClient.getProductById(offer.productId);
        const stock = await this.warehouseClient.getTotalAvailable(offer.productId);
        return {
          ...offer,
          product,
          stock,
        };
      } catch (error: any) {
        this.logger.warn(`Failed to fetch product data for offer ${id}: ${error.message}`);
      }
    }

    return offer;
  }

  async create(data: any): Promise<any> {
    const { policyEvidence, ...offerData } = data || {};
    const offer = await this.prisma.aukroOffer.create({
      data: offerData,
    });

    return this.withDraftPolicySnapshot(offer, policyEvidence);
  }

  async update(id: string, data: any): Promise<any> {
    const { policyEvidence, ...offerData } = data || {};
    const offer = await this.prisma.aukroOffer.update({
      where: { id },
      data: offerData,
    });

    return this.withDraftPolicySnapshot(offer, policyEvidence);
  }

  async delete(id: string): Promise<any> {
    return this.prisma.aukroOffer.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async evaluatePolicy(id: string, input: OfferPolicyInput = {}): Promise<OfferPolicyEvaluation> {
    const evidence = await this.collectOfferPolicyEvidence(id, input.evidence);
    return this.offerPolicyService.evaluate({
      ...input,
      mode: input.mode || 'draft',
      evidence,
    });
  }


  async createFromCatalog(input: CatalogSellActionRequest): Promise<CatalogSellActionResponse> {
    if (!input?.accountId) {
      throw new BadRequestException('accountId is required');
    }
    if (!input?.productId) {
      throw new BadRequestException('productId is required');
    }

    const account = await this.prisma.aukroAccount.findUnique({ where: { id: input.accountId } });
    if (!account) {
      throw new NotFoundException(`Account ${input.accountId} not found`);
    }

    const [product, stockQuantity, pricing, media] = await Promise.all([
      this.catalogClient.getProductById(input.productId),
      this.warehouseClient.getTotalAvailable(input.productId),
      this.catalogClient.getProductPricing(input.productId),
      this.catalogClient.getProductMedia(input.productId),
    ]);

    const existingOffer = await this.prisma.aukroOffer.findFirst({
      where: {
        accountId: input.accountId,
        productId: input.productId,
      },
    });
    const duplicateFound = Boolean(
      await this.prisma.aukroOffer.findFirst({
        where: {
          ...(existingOffer ? { id: { not: existingOffer.id } } : {}),
          accountId: input.accountId,
          productId: input.productId,
          isActive: true,
        },
      }),
    );

    const price = Number(pricing?.basePrice ?? pricing?.price ?? 0);
    const sourceSnapshot = this.buildCatalogDraftSnapshot({ product, pricing, stockQuantity, media });
    const policyEvidence = this.mergePolicyEvidence(
      this.buildDerivedEvidence({
        offer: {
          account,
          rawData: {
            aukroCategoryId: product?.aukroCategoryId,
            aukroParametersComplete: product?.aukroParametersComplete,
          },
          stockQuantity,
          price,
        },
        product,
        stockQuantity,
        pricing,
        media,
        duplicateFound,
      }),
      input.policyEvidence,
    );
    const compliancePolicy = this.offerPolicyService.evaluateDraft(policyEvidence);
    const draftStatus = compliancePolicy.allowed ? 'ready_for_review' : 'blocked';
    const rawData = this.mergeDraftRawData(existingOffer?.rawData, {
      draftVersion: 1,
      draftStatus,
      source: 'catalog-sell-action',
      requestedBy: input.requestedBy,
      sourceSnapshot,
      policyEvidence,
      policyReasonCodes: compliancePolicy.reasonCodes,
    });
    const offerData = {
      accountId: input.accountId,
      productId: input.productId,
      title: sourceSnapshot.title,
      description: sourceSnapshot.description,
      price,
      stockQuantity,
      isActive: false,
      rawData,
    };

    const offer = existingOffer
      ? await this.prisma.aukroOffer.update({ where: { id: existingOffer.id }, data: offerData })
      : await this.prisma.aukroOffer.create({ data: offerData });

    return {
      success: true,
      action: existingOffer ? 'reused' : 'created',
      draftStatus,
      offer,
      sourceSnapshot,
      compliancePolicy,
      blockers: compliancePolicy.reasonCodes,
    };
  }



  async createAiProposal(id: string, input: CreateAiProposalRequest): Promise<AiProposalResponse> {
    if (!input?.requestedBy) {
      throw new BadRequestException('requestedBy is required');
    }

    const offer = await this.prisma.aukroOffer.findUnique({
      where: { id },
      include: { account: true },
    });
    if (!offer) {
      throw new NotFoundException(`Offer ${id} not found`);
    }

    const target = input.target || 'listing';
    const requestId = this.proposalRequestId(id, target);
    const aiInput = this.buildAiProposalInput(offer);
    const aiResult = target === 'policy-risk'
      ? await this.aiClient.assessPolicyRisk(aiInput, {
          correlationId: input.correlationId || requestId,
          actorId: input.requestedBy,
          accountId: offer.accountId,
          offerId: offer.id,
          productId: offer.productId,
        })
      : await this.aiClient.createListingProposal(aiInput, {
          correlationId: input.correlationId || requestId,
          actorId: input.requestedBy,
          accountId: offer.accountId,
          offerId: offer.id,
          productId: offer.productId,
        });

    const now = new Date().toISOString();
    const aiData = this.asRecord(aiResult.data);
    const proposedFields = this.normalizeProposalFields(this.asRecord(aiData.proposedFields || aiData.proposal || aiData));
    const confidence = aiData.confidence === undefined ? undefined : Number(aiData.confidence);
    const riskLevel = aiData.riskLevel ? String(aiData.riskLevel) : undefined;
    const blockers = this.aiProposalBlockers(aiResult.success, confidence, riskLevel, input.minConfidence ?? 0.7);
    const proposal: AiProposalRecord = {
      id: requestId,
      requestId,
      target,
      status: blockers.length ? 'blocked' : 'pending_review',
      requestedBy: input.requestedBy,
      createdAt: now,
      model: aiData.model ? String(aiData.model) : undefined,
      modelVersion: aiData.modelVersion ? String(aiData.modelVersion) : undefined,
      confidence,
      riskLevel,
      proposedFields,
      reviewRequired: true,
      blockers,
      aiService: {
        success: aiResult.success,
        unavailable: aiResult.unavailable,
        contractVersion: aiResult.contractVersion,
        errorCode: aiResult.errorCode,
      },
    };

    const rawData = this.appendAiProposal(offer.rawData, proposal);
    await this.prisma.aukroOffer.update({
      where: { id: offer.id },
      data: { rawData },
    });

    const notification = await this.notificationsClient.sendAukroNotification({
      type: 'aukro.ai.proposal.created',
      offerId: offer.id,
      accountId: offer.accountId,
      productId: offer.productId,
      proposalId: proposal.id,
      requestedBy: input.requestedBy,
      reviewRequired: true,
      blockers,
    }, {
      correlationId: input.correlationId || requestId,
      actorId: input.requestedBy,
      accountId: offer.accountId,
      offerId: offer.id,
      productId: offer.productId,
    });

    return {
      success: true,
      offerId: offer.id,
      proposal,
      notification: {
        success: notification.success,
        unavailable: notification.unavailable,
        errorCode: notification.errorCode,
      },
    };
  }

  async reviewAiProposal(id: string, proposalId: string, input: ReviewAiProposalRequest): Promise<any> {
    if (!input?.actorId) {
      throw new BadRequestException('actorId is required');
    }
    if (!['approve', 'reject'].includes(input.decision)) {
      throw new BadRequestException('decision must be approve or reject');
    }

    const offer = await this.prisma.aukroOffer.findUnique({
      where: { id },
      include: { account: true },
    });
    if (!offer) {
      throw new NotFoundException(`Offer ${id} not found`);
    }

    const rawData = this.asRecord(offer.rawData);
    const proposals = this.aiProposals(rawData);
    const proposalIndex = proposals.findIndex((item) => item.id === proposalId);
    if (proposalIndex < 0) {
      throw new NotFoundException(`AI proposal ${proposalId} not found`);
    }

    const proposal = proposals[proposalIndex];
    const approvedFields = input.decision === 'approve'
      ? this.normalizeProposalFields(input.editedFields || proposal.proposedFields)
      : {};
    const diff = input.decision === 'approve' ? this.diffOfferFields(offer, approvedFields) : {};
    const review: HumanReviewRecord = {
      proposalId,
      actorId: input.actorId,
      decision: input.decision,
      reviewedAt: new Date().toISOString(),
      reason: input.reason,
      editedFields: input.editedFields,
      diff,
    };

    proposals[proposalIndex] = {
      ...proposal,
      status: input.decision === 'approve' ? 'approved' : 'rejected',
    };
    const nextRawData = {
      ...rawData,
      aiProposals: proposals,
      humanReviews: [...this.humanReviews(rawData), review],
    };

    const data: Record<string, any> = { rawData: nextRawData };
    if (input.decision === 'approve') {
      if (approvedFields.title !== undefined) data.title = approvedFields.title;
      if (approvedFields.description !== undefined) data.description = approvedFields.description;
      if (approvedFields.price !== undefined) data.price = approvedFields.price;
    }

    const updatedOffer = await this.prisma.aukroOffer.update({
      where: { id: offer.id },
      data,
    });

    return {
      success: true,
      offer: updatedOffer,
      proposal: proposals[proposalIndex],
      review,
    };
  }

  async syncFromCatalog(data?: { accountId?: string; limit?: number; activeOnly?: boolean; policyEvidence?: OfferPolicyEvidence }) {
    try {
      const accountId = data?.accountId;
      const limit = data?.limit || 100;
      const activeOnly = data?.activeOnly !== false;

      if (!accountId) {
        throw new Error('accountId is required');
      }

      // Verify account exists
      const account = await this.prisma.aukroAccount.findUnique({
        where: { id: accountId },
      });

      if (!account) {
        throw new Error(`Account ${accountId} not found`);
      }

      // Fetch products from catalog-microservice
      const catalogResult = await this.catalogClient.searchProducts({
        isActive: activeOnly,
        limit,
        page: 1,
      });

      const products = catalogResult.items;
      this.logger.log(`Syncing ${products.length} products from catalog to Aukro`, { accountId });

      const results = {
        created: 0,
        updated: 0,
        failed: 0,
        policyBlocked: 0,
        errors: [] as string[],
      };

      // Process each product
      for (const product of products) {
        try {
          // Get stock from warehouse-microservice
          const stockQuantity = await this.warehouseClient.getTotalAvailable(product.id);

          // Check if offer already exists
          const existingOffer = await this.prisma.aukroOffer.findFirst({
            where: {
              accountId,
              productId: product.id,
            },
          });

          // Get pricing from catalog
          const pricing = await this.catalogClient.getProductPricing(product.id);
          const price = pricing?.basePrice || 0;

          // Get primary image
          const media = await this.catalogClient.getProductMedia(product.id);

          let offer: any;
          if (existingOffer) {
            // Update existing offer
            offer = await this.prisma.aukroOffer.update({
              where: { id: existingOffer.id },
              data: {
                title: product.title || product.name,
                description: product.description,
                price: price,
                stockQuantity: stockQuantity,
                isActive: stockQuantity > 0,
                updatedAt: new Date(),
              },
            });
            results.updated++;
          } else {
            // Create new offer
            offer = await this.prisma.aukroOffer.create({
              data: {
                accountId,
                productId: product.id,
                title: product.title || product.name,
                description: product.description,
                price: price,
                stockQuantity: stockQuantity,
                isActive: stockQuantity > 0,
              },
            });
            results.created++;
          }

          const policy = this.offerPolicyService.evaluateDraft(
            this.mergePolicyEvidence(
              this.buildDerivedEvidence({
                offer: { ...offer, account },
                product,
                stockQuantity,
                pricing: { basePrice: price },
                media,
                duplicateFound: false,
              }),
              data?.policyEvidence,
            ),
          );
          if (!policy.allowed) {
            results.policyBlocked++;
          }
        } catch (error: any) {
          results.failed++;
          results.errors.push(`Product ${product.id}: ${error.message}`);
          this.logger.error(`Failed to sync product ${product.id}: ${error.message}`, error.stack);
        }
      }

      this.logger.log('Sync from catalog completed', results);
      return {
        success: true,
        ...results,
        total: products.length,
      };
    } catch (error: any) {
      this.logger.error(`Failed to sync from catalog: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async withDraftPolicySnapshot(offer: any, policyEvidence?: OfferPolicyEvidence): Promise<any> {
    try {
      return {
        ...offer,
        compliancePolicy: await this.evaluatePolicy(offer.id, {
          mode: 'draft',
          evidence: policyEvidence,
        }),
      };
    } catch (error: any) {
      this.logger.warn(`Failed to evaluate draft policy for offer ${offer.id}: ${error.message}`);
      return {
        ...offer,
        compliancePolicy: this.offerPolicyService.evaluateDraft(policyEvidence || {}),
      };
    }
  }

  private async collectOfferPolicyEvidence(id: string, suppliedEvidence?: OfferPolicyEvidence): Promise<OfferPolicyEvidence> {
    const offer = await this.prisma.aukroOffer.findUnique({
      where: { id },
      include: { account: true },
    });

    if (!offer) {
      throw new NotFoundException(`Offer ${id} not found`);
    }

    let product: any = null;
    let stockQuantity = offer.stockQuantity;
    let pricing: any = { basePrice: offer.price };
    let media: any[] = [];

    if (offer.productId) {
      try {
        product = await this.catalogClient.getProductById(offer.productId);
      } catch (error: any) {
        this.logger.warn(`Policy evidence catalog lookup failed for offer ${id}: ${error.message}`);
      }

      try {
        stockQuantity = await this.warehouseClient.getTotalAvailable(offer.productId);
      } catch (error: any) {
        this.logger.warn(`Policy evidence stock lookup failed for offer ${id}: ${error.message}`);
      }

      try {
        pricing = (await this.catalogClient.getProductPricing(offer.productId)) || pricing;
      } catch (error: any) {
        this.logger.warn(`Policy evidence pricing lookup failed for offer ${id}: ${error.message}`);
      }

      try {
        media = await this.catalogClient.getProductMedia(offer.productId);
      } catch (error: any) {
        this.logger.warn(`Policy evidence media lookup failed for offer ${id}: ${error.message}`);
      }
    }

    const duplicateFound = offer.productId
      ? Boolean(await this.prisma.aukroOffer.findFirst({
          where: {
            id: { not: offer.id },
            accountId: offer.accountId,
            productId: offer.productId,
            isActive: true,
          },
        }))
      : false;

    return this.mergePolicyEvidence(
      this.rawPolicyEvidence(offer.rawData),
      this.buildDerivedEvidence({ offer, product, stockQuantity, pricing, media, duplicateFound }),
      suppliedEvidence,
    );
  }

  private buildDerivedEvidence(snapshot: {
    offer: any;
    product?: any;
    stockQuantity?: number;
    pricing?: any;
    media?: any[];
    duplicateFound?: boolean;
  }): OfferPolicyEvidence {
    const checkedAt = new Date().toISOString();
    const product = snapshot.product;
    const rawData = this.asRecord(snapshot.offer.rawData);
    const categoryMapped = Boolean(product?.categoryId || product?.category?.id || rawData?.aukroCategoryId);
    const requiredParametersComplete = Boolean(rawData?.aukroParametersComplete || (product?.attributes && Object.keys(product.attributes).length > 0));
    const stockQuantity = Number(snapshot.stockQuantity ?? snapshot.offer.stockQuantity ?? 0);
    const price = snapshot.pricing?.basePrice ?? snapshot.pricing?.price ?? snapshot.offer.price;
    const mediaReady = Boolean(snapshot.media?.length);

    return {
      catalogValidated: this.flag(Boolean(product && product.isActive !== false), checkedAt, 'catalog-microservice'),
      accountReady: this.flag(Boolean(snapshot.offer.account?.isActive), checkedAt, 'aukro-service'),
      categoryMapped: this.flag(categoryMapped, checkedAt, 'aukro-service'),
      requiredParametersComplete: this.flag(requiredParametersComplete, checkedAt, 'aukro-service'),
      mediaReady: this.flag(mediaReady, checkedAt, 'catalog-microservice'),
      stockAvailable: {
        ...this.flag(stockQuantity > 0, checkedAt, 'warehouse-microservice'),
        quantity: stockQuantity,
      },
      priceValid: {
        ...this.flag(Number(price) > 0, checkedAt, 'catalog-microservice'),
        price,
        currency: snapshot.pricing?.currency || 'CZK',
      },
      duplicateChecked: this.flag(!snapshot.duplicateFound, checkedAt, 'aukro-service'),
    };
  }


  private buildCatalogDraftSnapshot(snapshot: {
    product: any;
    pricing?: any;
    stockQuantity: number;
    media: any[];
  }): CatalogDraftSourceSnapshot {
    const product = snapshot.product || {};
    const price = Number(snapshot.pricing?.basePrice ?? snapshot.pricing?.price ?? 0);
    return {
      productId: product.id,
      title: product.title || product.name || 'Untitled catalog product',
      description: product.description,
      categoryId: product.categoryId || product.category?.id,
      price: Number.isFinite(price) ? price : 0,
      currency: snapshot.pricing?.currency || 'CZK',
      stockQuantity: Number(snapshot.stockQuantity || 0),
      mediaCount: snapshot.media?.length || 0,
      capturedAt: new Date().toISOString(),
    };
  }

  private mergeDraftRawData(rawData: any, draft: CatalogDraftMetadata): Record<string, any> {
    return {
      ...this.asRecord(rawData),
      draft,
    };
  }



  private proposalRequestId(offerId: string, target: string): string {
    const hash = createHash('sha256').update(`${offerId}:${target}:v1`).digest('hex').slice(0, 16);
    return `ai-${target}-${hash}`;
  }

  private buildAiProposalInput(offer: any): Record<string, any> {
    const rawData = this.asRecord(offer.rawData);
    const draft = this.asRecord(rawData.draft);
    return {
      offerId: offer.id,
      accountId: offer.accountId,
      productId: offer.productId,
      currentFields: {
        title: offer.title,
        description: offer.description,
        price: Number(offer.price),
        stockQuantity: offer.stockQuantity,
      },
      draftSourceSnapshot: this.asRecord(draft.sourceSnapshot),
      policyReasonCodes: Array.isArray(draft.policyReasonCodes) ? draft.policyReasonCodes : [],
    };
  }

  private normalizeProposalFields(fields: Record<string, any>): AiProposalFields {
    const price = fields.price === undefined ? undefined : Number(fields.price);
    return {
      title: fields.title === undefined ? undefined : String(fields.title),
      description: fields.description === undefined ? undefined : String(fields.description),
      categoryId: fields.categoryId === undefined ? undefined : String(fields.categoryId),
      parameters: this.asRecord(fields.parameters),
      price: Number.isFinite(price) ? price : undefined,
    };
  }

  private aiProposalBlockers(success: boolean, confidence: number | undefined, riskLevel: string | undefined, minConfidence: number): string[] {
    const blockers: string[] = [];
    if (!success) {
      blockers.push('AI_SERVICE_UNAVAILABLE');
    }
    if (confidence !== undefined && confidence < minConfidence) {
      blockers.push('AI_CONFIDENCE_LOW');
    }
    if (riskLevel && !['low', 'none'].includes(riskLevel.toLowerCase())) {
      blockers.push('AI_RISK_REVIEW_REQUIRED');
    }
    return blockers;
  }

  private appendAiProposal(rawData: any, proposal: AiProposalRecord): Record<string, any> {
    const raw = this.asRecord(rawData);
    return {
      ...raw,
      aiProposals: [...this.aiProposals(raw), proposal],
    };
  }

  private aiProposals(rawData: any): AiProposalRecord[] {
    const raw = this.asRecord(rawData);
    return Array.isArray(raw.aiProposals) ? raw.aiProposals : [];
  }

  private humanReviews(rawData: any): HumanReviewRecord[] {
    const raw = this.asRecord(rawData);
    return Array.isArray(raw.humanReviews) ? raw.humanReviews : [];
  }

  private diffOfferFields(offer: any, fields: AiProposalFields): Record<string, { before: any; after: any }> {
    const diff: Record<string, { before: any; after: any }> = {};
    for (const key of ['title', 'description', 'price'] as const) {
      if (fields[key] === undefined) continue;
      const before = key === 'price' ? Number(offer[key]) : offer[key];
      if (before !== fields[key]) {
        diff[key] = { before, after: fields[key] };
      }
    }
    return diff;
  }

  private rawPolicyEvidence(rawData: any): OfferPolicyEvidence {
    const raw = this.asRecord(rawData);
    return this.asRecord(raw?.policyEvidence) as OfferPolicyEvidence;
  }

  private mergePolicyEvidence(...items: Array<OfferPolicyEvidence | undefined>): OfferPolicyEvidence {
    return items.reduce((merged, item) => ({ ...merged, ...(item || {}) }), {} as OfferPolicyEvidence);
  }

  private flag(passed: boolean, checkedAt: string, source: string): PolicyEvidenceFlag {
    return { passed, checkedAt, source };
  }

  private asRecord(value: any): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }
}
