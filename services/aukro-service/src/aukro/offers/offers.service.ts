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
import {
  EnqueuePublishRequest,
  EnqueuePublishResponse,
  MarketplaceReconciliationSnapshot,
  PublishAttemptRecord,
  PublishQueueMetadata,
  PublishRateLimitSnapshot,
  RecordReconciliationRequest,
  RecordReconciliationResponse,
  ReconciliationDrift,
  ReconciliationMetadata,
  ReconciliationReportRecord,
} from './publish-observability.types';
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


  async enqueuePublish(id: string, input: EnqueuePublishRequest): Promise<EnqueuePublishResponse> {
    if (!input?.actorId) {
      throw new BadRequestException('actorId is required');
    }

    const offer = await this.prisma.aukroOffer.findUnique({
      where: { id },
      include: { account: true },
    });
    if (!offer) {
      throw new NotFoundException(`Offer ${id} not found`);
    }

    const rawData = this.asRecord(offer.rawData);
    const requestedKey = input.idempotencyKey?.trim();
    const idempotencyKey = requestedKey || this.publishIdempotencyKey(offer);
    const existingQueue = this.publishQueue(rawData, offer.accountId);
    const existingAttempt = existingQueue.attempts.find((attempt) => attempt.idempotencyKey === idempotencyKey);
    if (existingAttempt) {
      return {
        success: true,
        action: 'reused',
        attempt: existingAttempt,
        queue: existingQueue,
        compliancePolicy: existingAttempt.policySnapshot,
        blockers: existingAttempt.blockers,
      };
    }

    const requestedAt = input.requestedAt || new Date().toISOString();
    const policyEvidence = await this.collectPublishPolicyEvidence(offer, input, idempotencyKey, requestedAt);
    const compliancePolicy = this.offerPolicyService.evaluate({
      mode: 'publish',
      evidence: policyEvidence,
      now: requestedAt,
    });
    const status = compliancePolicy.allowed ? 'queued' : 'blocked';
    const queuedCount = existingQueue.attempts.filter((attempt) => attempt.status === 'queued').length + (status === 'queued' ? 1 : 0);
    const blockedCount = existingQueue.attempts.filter((attempt) => attempt.status === 'blocked').length + (status === 'blocked' ? 1 : 0);
    const attempt: PublishAttemptRecord = {
      id: `pub-${this.shortHash(idempotencyKey)}`,
      idempotencyKey,
      offerId: offer.id,
      accountId: offer.accountId,
      productId: offer.productId || undefined,
      actorId: input.actorId,
      requestedAt,
      status,
      blockers: compliancePolicy.reasonCodes,
      policyEvidence,
      policySnapshot: compliancePolicy,
      queue: {
        accountId: offer.accountId,
        position: status === 'queued' ? queuedCount : 0,
        queuedCount,
        blockedCount,
        rateLimit: this.rateLimitSnapshot(policyEvidence, input),
      },
      mutation: {
        enabled: false,
        reason: 'TASK_007_RECORD_ONLY',
      },
      correlationId: input.correlationId,
    };
    const queue = this.buildPublishQueueMetadata(offer, [...existingQueue.attempts, attempt], requestedAt, status, attempt.queue.rateLimit);

    await this.prisma.aukroOffer.update({
      where: { id: offer.id },
      data: { rawData: { ...rawData, publishQueue: queue } },
    });

    return {
      success: true,
      action: 'created',
      attempt,
      queue,
      compliancePolicy,
      blockers: compliancePolicy.reasonCodes,
    };
  }

  async recordReconciliation(id: string, input: RecordReconciliationRequest): Promise<RecordReconciliationResponse> {
    if (!input?.actorId) {
      throw new BadRequestException('actorId is required');
    }

    const offer = await this.prisma.aukroOffer.findUnique({
      where: { id },
      include: { account: true },
    });
    if (!offer) {
      throw new NotFoundException(`Offer ${id} not found`);
    }

    const recordedAt = new Date().toISOString();
    const observedAt = input.observedAt || recordedAt;
    const marketplaceSnapshot = this.normalizeMarketplaceSnapshot(input.marketplaceSnapshot || {});
    const internalSnapshot = await this.buildInternalReconciliationSnapshot(offer, input);
    const drift = this.reconciliationDrift(internalSnapshot, marketplaceSnapshot);
    const status = drift.length ? 'drift_detected' : 'aligned';
    const report: ReconciliationReportRecord = {
      id: `recon-${this.shortHash(`${offer.id}:${observedAt}:${input.source || 'manual'}:${JSON.stringify(marketplaceSnapshot)}`)}`,
      offerId: offer.id,
      accountId: offer.accountId,
      productId: offer.productId || undefined,
      actorId: input.actorId,
      source: input.source || 'manual',
      observedAt,
      recordedAt,
      status,
      internalSnapshot,
      marketplaceSnapshot,
      drift,
      mutation: {
        enabled: false,
        reason: 'RECONCILIATION_RECORD_ONLY',
      },
      correlationId: input.correlationId,
    };

    const rawData = this.asRecord(offer.rawData);
    const reconciliation = this.appendReconciliationReport(rawData, report);
    await this.prisma.aukroOffer.update({
      where: { id: offer.id },
      data: { rawData: { ...rawData, reconciliation } },
    });

    return {
      success: true,
      report,
      reconciliation,
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


  private async collectPublishPolicyEvidence(
    offer: any,
    input: EnqueuePublishRequest,
    idempotencyKey: string,
    checkedAt: string,
  ): Promise<OfferPolicyEvidence> {
    const evidence = await this.collectOfferPolicyEvidence(offer.id, input.policyEvidence);
    const generated: OfferPolicyEvidence = {};
    const approval = this.latestApprovedHumanReview(offer.rawData);

    if (!evidence.humanApproved && approval) {
      generated.humanApproved = {
        passed: true,
        checkedAt: approval.reviewedAt || checkedAt,
        source: 'aukro-service',
        actorId: approval.actorId,
      };
    }

    if (!evidence.rateLimitReady && input.rateLimitRemaining !== undefined) {
      const remaining = Number(input.rateLimitRemaining);
      generated.rateLimitReady = {
        ...this.flag(Number.isFinite(remaining) && remaining > 0, checkedAt, 'aukro-service'),
        remaining,
        resetAt: input.rateLimitResetAt,
        hint: remaining > 0 ? undefined : 'No publish rate-limit budget is available for this account.',
      } as PolicyEvidenceFlag;
    }

    if (!evidence.idempotencyReady) {
      generated.idempotencyReady = {
        ...this.flag(Boolean(idempotencyKey), checkedAt, 'aukro-service'),
        idempotencyKey,
      };
    }

    return this.mergePolicyEvidence(evidence, generated);
  }

  private publishIdempotencyKey(offer: any): string {
    return `publish-${this.shortHash(`${offer.id}:publish:v1`)}`;
  }

  private publishQueue(rawData: any, accountId: string): PublishQueueMetadata {
    const raw = this.asRecord(rawData);
    const queue = this.asRecord(raw.publishQueue);
    const attempts = Array.isArray(queue.attempts) ? queue.attempts as PublishAttemptRecord[] : [];
    const queuedCount = attempts.filter((attempt) => attempt.status === 'queued').length;
    const blockedCount = attempts.filter((attempt) => attempt.status === 'blocked').length;
    return {
      version: 1,
      accountId: String(queue.accountId || accountId),
      status: (queue.status as PublishQueueMetadata['status']) || (queuedCount ? 'queued' : blockedCount ? 'blocked' : 'idle'),
      attempts,
      queuedCount,
      blockedCount,
      lastAttemptAt: queue.lastAttemptAt ? String(queue.lastAttemptAt) : undefined,
      lastQueuedAt: queue.lastQueuedAt ? String(queue.lastQueuedAt) : undefined,
      lastBlockedAt: queue.lastBlockedAt ? String(queue.lastBlockedAt) : undefined,
      rateLimit: this.asRecord(queue.rateLimit) as PublishRateLimitSnapshot,
    };
  }

  private buildPublishQueueMetadata(
    offer: any,
    attempts: PublishAttemptRecord[],
    attemptedAt: string,
    attemptStatus: PublishAttemptRecord['status'],
    rateLimit: PublishRateLimitSnapshot,
  ): PublishQueueMetadata {
    const queuedCount = attempts.filter((attempt) => attempt.status === 'queued').length;
    const blockedCount = attempts.filter((attempt) => attempt.status === 'blocked').length;
    return {
      version: 1,
      accountId: offer.accountId,
      status: queuedCount ? 'queued' : blockedCount ? 'blocked' : 'idle',
      attempts,
      queuedCount,
      blockedCount,
      lastAttemptAt: attemptedAt,
      lastQueuedAt: attemptStatus === 'queued' ? attemptedAt : undefined,
      lastBlockedAt: attemptStatus === 'blocked' ? attemptedAt : undefined,
      rateLimit,
    };
  }

  private rateLimitSnapshot(evidence: OfferPolicyEvidence, input?: EnqueuePublishRequest): PublishRateLimitSnapshot {
    const remaining = input?.rateLimitRemaining === undefined ? undefined : Number(input.rateLimitRemaining);
    return {
      ready: evidence.rateLimitReady?.passed === true,
      checkedAt: evidence.rateLimitReady?.checkedAt,
      remaining: Number.isFinite(remaining) ? remaining : undefined,
      resetAt: input?.rateLimitResetAt,
    };
  }

  private latestApprovedHumanReview(rawData: any): HumanReviewRecord | undefined {
    return this.humanReviews(rawData)
      .filter((review) => review.decision === 'approve')
      .sort((left, right) => String(right.reviewedAt).localeCompare(String(left.reviewedAt)))[0];
  }

  private async buildInternalReconciliationSnapshot(
    offer: any,
    input: RecordReconciliationRequest,
  ): Promise<ReconciliationReportRecord['internalSnapshot']> {
    let stockQuantity = input.warehouseStockQuantity;
    let price = this.numberOrUndefined(input.catalogPrice);

    if (stockQuantity === undefined && offer.productId) {
      try {
        stockQuantity = await this.warehouseClient.getTotalAvailable(offer.productId);
      } catch (error: any) {
        this.logger.warn(`Reconciliation stock lookup failed for offer ${offer.id}: ${error.message}`);
      }
    }

    if (price === undefined && offer.productId) {
      try {
        const pricing = await this.catalogClient.getProductPricing(offer.productId);
        price = this.numberOrUndefined(pricing?.basePrice ?? pricing?.price);
      } catch (error: any) {
        this.logger.warn(`Reconciliation pricing lookup failed for offer ${offer.id}: ${error.message}`);
      }
    }

    return {
      stockQuantity: stockQuantity === undefined ? Number(offer.stockQuantity || 0) : Number(stockQuantity),
      price: price === undefined ? Number(offer.price || 0) : price,
      status: offer.isActive ? 'active' : 'inactive',
    };
  }

  private normalizeMarketplaceSnapshot(snapshot: MarketplaceReconciliationSnapshot): MarketplaceReconciliationSnapshot {
    return {
      aukroOfferId: snapshot.aukroOfferId ? String(snapshot.aukroOfferId) : undefined,
      status: snapshot.status ? String(snapshot.status) : snapshot.isActive === undefined ? undefined : (snapshot.isActive ? 'active' : 'inactive'),
      isActive: snapshot.isActive,
      stockQuantity: this.numberOrUndefined(snapshot.stockQuantity),
      price: this.numberOrUndefined(snapshot.price),
      currency: snapshot.currency ? String(snapshot.currency) : undefined,
    };
  }

  private reconciliationDrift(
    internal: ReconciliationReportRecord['internalSnapshot'],
    marketplace: MarketplaceReconciliationSnapshot,
  ): ReconciliationDrift[] {
    const drift: ReconciliationDrift[] = [];
    if (marketplace.stockQuantity !== undefined && internal.stockQuantity !== marketplace.stockQuantity) {
      drift.push({ type: 'stock', internal: internal.stockQuantity, marketplace: marketplace.stockQuantity, severity: 'warning' });
    }
    if (marketplace.price !== undefined && internal.price !== Number(marketplace.price)) {
      drift.push({ type: 'price', internal: internal.price, marketplace: Number(marketplace.price), severity: 'warning' });
    }
    if (marketplace.status !== undefined && internal.status !== marketplace.status) {
      drift.push({ type: 'status', internal: internal.status, marketplace: marketplace.status, severity: 'warning' });
    }
    return drift;
  }

  private appendReconciliationReport(rawData: any, report: ReconciliationReportRecord): ReconciliationMetadata {
    const existing = this.reconciliation(rawData);
    const reports = [...existing.reports, report];
    return {
      version: 1,
      reports,
      lastReport: report,
      driftCount: reports.filter((item) => item.status === 'drift_detected').length,
      alignedCount: reports.filter((item) => item.status === 'aligned').length,
    };
  }

  private reconciliation(rawData: any): ReconciliationMetadata {
    const raw = this.asRecord(rawData);
    const reconciliation = this.asRecord(raw.reconciliation);
    const reports = Array.isArray(reconciliation.reports) ? reconciliation.reports as ReconciliationReportRecord[] : [];
    return {
      version: 1,
      reports,
      lastReport: this.asRecord(reconciliation.lastReport) as ReconciliationReportRecord,
      driftCount: reports.filter((item) => item.status === 'drift_detected').length,
      alignedCount: reports.filter((item) => item.status === 'aligned').length,
    };
  }

  private numberOrUndefined(value: any): number | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  }

  private shortHash(value: string): string {
    return createHash('sha256').update(value).digest('hex').slice(0, 16);
  }

  private rawPolicyEvidence(rawData: any): OfferPolicyEvidence {
    const raw = this.asRecord(rawData);
    const draft = this.asRecord(raw.draft);
    return this.mergePolicyEvidence(
      this.asRecord(raw.policyEvidence) as OfferPolicyEvidence,
      this.asRecord(draft.policyEvidence) as OfferPolicyEvidence,
    );
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
