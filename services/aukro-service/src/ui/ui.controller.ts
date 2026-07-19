import { BadRequestException, Body, Controller, ForbiddenException, Get, Header, HttpException, Param, Post, Query, Req, StreamableFile, UseGuards } from '@nestjs/common';
import { AuthResponse, AuthService, AuthUser, CATALOG_PRODUCT_QUALITY_POLICY_ID, CATALOG_PRODUCT_QUALITY_UNAVAILABLE_BLOCKER, CatalogClientService, CatalogProductQualityIssue, CatalogProductReadiness, OrderClientService, PrismaService, JwtAuthGuard } from '@aukro/shared';
import { OffersService } from '../aukro/offers/offers.service';
import { FAVICON_ICO } from './favicon.assets';
import { consentBannerSource, consentCoreSource } from './consent.assets';

interface UiAuthRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

interface UiPublishRequest {
  productId: string;
  accountId?: string;
}

interface UiBulkPublishRequest {
  productIds: string[];
  accountId?: string;
}

interface UiResaleEnabledRequest {
  resaleEnabled: boolean;
}

@Controller()
export class UiController {
  constructor(
    private readonly authService: AuthService,
    private readonly catalogClient: CatalogClientService,
    private readonly offersService: OffersService,
    private readonly orderClient: OrderClientService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  landing(): string {
    return this.renderShell({ page: 'landing' });
  }

  // Oba moduly leží pod /ui/, protože consent-banner.js importuje
  // './consent-core.js' a prohlížeč to řeší vůči stejnému prefixu.
  @Get('ui/consent-core.js')
  @Header('Content-Type', 'application/javascript; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  consentCore(): string {
    return consentCoreSource;
  }

  @Get('ui/consent-banner.js')
  @Header('Content-Type', 'application/javascript; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  consentBanner(): string {
    return consentBannerSource;
  }

  @Get('favicon.ico')
  @Header('Content-Type', 'image/x-icon')
  @Header('Cache-Control', 'public, max-age=604800')
  favicon(): StreamableFile {
    return new StreamableFile(FAVICON_ICO);
  }

  @Get('dashboard')
  @Header('Content-Type', 'text/html; charset=utf-8')
  dashboard(): string {
    return this.renderShell({ page: 'dashboard' });
  }

  @Post('ui/auth/login')
  async login(@Body() body: UiAuthRequest) {
    const response = await this.authService.login({ email: body.email, password: body.password });
    await this.provisionCatalogForAuthResponse(response);
    return response;
  }

  @Post('ui/auth/register')
  async register(@Body() body: UiAuthRequest) {
    const response = await this.authService.register({
      email: body.email,
      password: body.password,
      firstName: body.firstName,
      lastName: body.lastName,
    });
    await this.provisionCatalogForAuthResponse(response);
    return response;
  }

  @Get('ui/me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: any) {
    const user = req.user as AuthUser;
    const account = await this.ensureAukroAccount(user);

    return {
      user,
      account: this.publicAccount(account),
      authLinks: this.authAccountLinks(),
      isAukroAdmin: this.isAukroAdmin(user),
    };
  }

  @Post('ui/catalog/provision')
  @UseGuards(JwtAuthGuard)
  async provisionCatalog(@Req() req: any) {
    const user = req.user as AuthUser;
    await this.ensureAukroAccount(user);
    await this.catalogClient.provisionUserCatalog(this.humanAuthorizationOrThrow(req), 'aukro');
    return { success: true, sourceApplication: 'aukro' };
  }

  @Get('ui/dashboard')
  @UseGuards(JwtAuthGuard)
  async dashboardData(@Req() req: any) {
    const user = req.user as AuthUser;
    const account = await this.ensureAukroAccount(user);
    const [offers, orders] = await Promise.all([
      this.prisma.aukroOffer.findMany({
        where: { accountId: account.id },
        orderBy: { updatedAt: 'desc' },
        take: 24,
      }),
      this.prisma.aukroOrder.findMany({
        where: { accountId: account.id },
        orderBy: { createdAt: 'desc' },
        take: 12,
      }),
    ]);
    const hydratedOrders = await this.hydrateOrdersWithCentralReadModel(orders);

    return {
      user,
      account: this.publicAccount(account),
      authLinks: this.authAccountLinks(),
      isAukroAdmin: this.isAukroAdmin(user),
      summary: this.dashboardSummary(offers, hydratedOrders),
      offers: offers.map((offer) => this.publicOffer(offer)),
      orders: hydratedOrders.map((order) => this.publicOrder(order)),
    };
  }

  @Get('ui/catalog/products')
  @UseGuards(JwtAuthGuard)
  async catalogProducts(@Req() req: any, @Query() query: any) {
    const user = req.user as AuthUser;
    const account = await this.ensureAukroAccount(user);
    const authorization = this.humanAuthorizationOrThrow(req);
    const limit = this.safeNumber(query.limit, 12, 1, 50);
    const page = this.safeNumber(query.page, 1, 1, 1000);
    const search = query.search ? String(query.search) : undefined;
    const categoryId = query.categoryId ? String(query.categoryId) : undefined;
    const catalogSources = this.catalogSourcesFromQuery(query.catalogSources);
    const isActive = query.isActive === undefined ? true : String(query.isActive) === 'true';
    const localOffers = await this.prisma.aukroOffer.findMany({
      where: { accountId: account.id },
      orderBy: { updatedAt: 'desc' },
    });
    const offerByProductId = new Map(
      localOffers
        .filter((offer) => offer.productId)
        .map((offer) => [String(offer.productId), offer]),
    );
    const publishedProductIds = new Set(
      localOffers
        .filter((offer) => offer.productId && offer.isActive && offer.aukroOfferId)
        .map((offer) => String(offer.productId)),
    );

    const scanLimit = 50;
    const maxScanned = 1000;
    let scanPage = 1;
    let scanned = 0;
    let totalCatalog = 0;
    const candidates: any[] = [];

    while (scanned < maxScanned) {
      const result = await this.catalogClient.searchProducts({
        search,
        categoryId,
        isActive,
        page: scanPage,
        limit: scanLimit,
        catalogScope: 'effective',
        catalogSources,
        authorization,
      });
      const items = result.items || [];
      totalCatalog = result.total || totalCatalog;
      scanned += items.length;
      for (const item of items) {
        if (!item?.id || publishedProductIds.has(String(item.id))) continue;
        candidates.push(this.publicCatalogCandidate(item, offerByProductId.get(String(item.id)), user));
      }
      if (!items.length || items.length < scanLimit || scanned >= totalCatalog) break;
      scanPage++;
    }

    const start = (page - 1) * limit;
    const pagedItems = await Promise.all(
      candidates.slice(start, start + limit).map((candidate) => this.withCatalogQualityCandidate(candidate, authorization)),
    );
    return {
      items: pagedItems,
      total: candidates.length,
      page,
      limit,
      totalPages: Math.max(Math.ceil(candidates.length / limit), 1),
      scanned,
      scanTruncated: scanned >= maxScanned && scanned < totalCatalog,
      catalogScope: 'effective',
      catalogSources: catalogSources || ['own', 'alfares', 'community'],
    };
  }

  @Get('ui/offers')
  @UseGuards(JwtAuthGuard)
  async dashboardOffers(@Req() req: any, @Query() query: any) {
    const user = req.user as AuthUser;
    const account = await this.ensureAukroAccount(user);
    const limit = this.safeNumber(query.limit, 12, 1, 50);
    const page = this.safeNumber(query.page, 1, 1, 1000);
    const search = this.textOrNull(query.search);
    const status = this.textOrNull(query.status) || 'published';
    const where: any = { accountId: account.id };

    if (status === 'published') where.isActive = true;
    if (status === 'draft') where.isActive = false;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { aukroOfferId: { contains: search } },
      ];
    }

    const [offers, total] = await Promise.all([
      this.prisma.aukroOffer.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.aukroOffer.count({ where }),
    ]);

    return {
      items: offers.map((offer) => this.publicOffer(offer)),
      total,
      page,
      limit,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    };
  }

  @Get('ui/catalog/products/:productId/content-preview')
  @UseGuards(JwtAuthGuard)
  async catalogContentPreview(@Req() req: any, @Param('productId') productId: string) {
    const authorization = this.humanAuthorizationOrThrow(req);
    const preview = await this.catalogClient.getProductContentPreview(productId, 'aukro', { authorization, catalogScope: 'effective' });
    if (preview) {
      return this.publicContentPreview(preview);
    }

    const product = await this.catalogClient.getProductById(productId, { authorization, catalogScope: 'effective' });
    return {
      success: false,
      marketplace: 'aukro',
      label: 'Aukro',
      format: 'plain-text',
      content: {
        title: this.textOrNull(product?.title ?? product?.name) || 'Produkt bez nazvu',
        plainText: this.textOrNull(product?.description) || '',
      },
      source: {
        legacyDescriptionFallback: true,
      },
      overridesApplied: false,
      warnings: ['CATALOG_CONTENT_PREVIEW_UNAVAILABLE'],
    };
  }

  @Post('ui/catalog/products/:productId/resale-enabled')
  @UseGuards(JwtAuthGuard)
  async setCatalogProductResaleEnabled(@Req() req: any, @Param('productId') productId: string, @Body() body: UiResaleEnabledRequest) {
    const user = req.user as AuthUser;
    const authorization = this.humanAuthorizationOrThrow(req);
    const normalizedProductId = this.textOrNull(productId);
    if (!normalizedProductId) {
      throw new BadRequestException('Vyberte produkt.');
    }

    const resaleEnabled = this.booleanOrNull(body?.resaleEnabled);
    if (resaleEnabled === null) {
      throw new BadRequestException('resaleEnabled musi byt boolean.');
    }

    const product = await this.catalogClient.getProductById(normalizedProductId, { authorization, catalogScope: 'effective' });
    const sourceSummary = this.catalogSourceSummary(product, user);
    if (sourceSummary.ownedByUser === false) {
      throw new ForbiddenException('Resale lze menit jen u vlastnich Catalog produktu. Tento zdroj je v Aukro kabinetu read-only.');
    }

    try {
      const updatedProduct = await this.catalogClient.updateProduct(normalizedProductId, { resaleEnabled }, { authorization });
      const publicProduct = this.publicCatalogCandidate(updatedProduct || { ...product, resaleEnabled }, undefined, user);

      return {
        success: true,
        resaleEnabled,
        product: publicProduct,
      };
    } catch (error: unknown) {
      const status = error instanceof HttpException ? error.getStatus() : 500;
      if (status === 401 || status === 403) {
        throw new ForbiddenException('Catalog odmitl zmenu resale. Zmenu muze ulozit pouze vlastnik produktu prihlaseny svym Bearer tokenem.');
      }
      if (status === 400) {
        throw new BadRequestException(error instanceof Error ? error.message : 'Catalog odmitl resale zmenu.');
      }
      throw error;
    }
  }

  @Post('ui/publish')
  @UseGuards(JwtAuthGuard)
  async publish(@Req() req: any, @Body() body: UiPublishRequest) {
    const user = req.user as AuthUser;
    const account = await this.resolveAukroAccountForUser(user, body.accountId);
    const authorization = this.humanAuthorizationOrThrow(req);
    await this.assertEffectiveCatalogProductAccess(req, body.productId, authorization);

    return this.offersService.createFromCatalog({
      accountId: account.id,
      productId: body.productId,
      requestedBy: user.email || user.id,
      catalogAuthorization: authorization,
    });
  }

  @Post('ui/publish/bulk')
  @UseGuards(JwtAuthGuard)
  async bulkPublish(@Req() req: any, @Body() body: UiBulkPublishRequest) {
    const user = req.user as AuthUser;
    const account = await this.resolveAukroAccountForUser(user, body.accountId);

    const productIds = Array.from(new Set((body.productIds || []).map((id) => String(id).trim()).filter(Boolean))).slice(0, 50);
    if (!productIds.length) {
      throw new BadRequestException('Vyberte alespon jeden produkt.');
    }

    const actorId = user.email || user.id;
    const authorization = this.humanAuthorizationOrThrow(req);
    const results: any[] = [];
    for (const productId of productIds) {
      try {
        await this.assertEffectiveCatalogProductAccess(req, productId, authorization);
        const draft = await this.offersService.createFromCatalog({
          accountId: account.id,
          productId,
          requestedBy: actorId,
          catalogAuthorization: authorization,
        });
        const offerId = draft?.offer?.id;
        let publishIntent: any = null;
        if (offerId) {
          publishIntent = await this.offersService.enqueuePublish(offerId, {
            actorId,
            idempotencyKey: `ui-bulk-${account.id}-${productId}`,
          });
        }
        results.push({
          productId,
          success: true,
          action: draft.action,
          draftStatus: draft.draftStatus,
          offerId,
          publishStatus: publishIntent?.attempt?.status || null,
          mutationEnabled: Boolean(publishIntent?.attempt?.mutation?.enabled),
          blockers: Array.from(new Set([...(draft.blockers || []), ...(publishIntent?.blockers || [])])),
        });
      } catch (error: any) {
        results.push({
          productId,
          success: false,
          error: error?.message || 'Produkt se nepodarilo zpracovat.',
          blockers: this.errorBlockers(error),
        });
      }
    }

    const created = results.filter((result) => result.success).length;
    return {
      success: true,
      requested: productIds.length,
      created,
      failed: results.length - created,
      mutationEnabled: false,
      note: 'Live Aukro mutation is still disabled; bulk action creates or refreshes drafts and records publish intent.',
      results,
    };
  }

  @Get('ui/admin/services')
  @UseGuards(JwtAuthGuard)
  async adminServices(@Req() req: any) {
    const user = req.user as AuthUser;
    if (!this.isAukroAdmin(user)) {
      throw new ForbiddenException('Admin sekce je dostupna pouze spravcum Aukro sluzby.');
    }

    const orders = await this.prisma.aukroOrder.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const hydratedOrders = await this.hydrateOrdersWithCentralReadModel(orders);

    return {
      admin: user.email,
      orderStats: this.adminOrderStats(hydratedOrders, 100),
      services: [
        { name: 'Auth microservice', role: 'Centralni prihlaseni, registrace a JWT', route: '/aukro/ui/auth/login', owner: 'auth-microservice' },
        { name: 'Catalog microservice', role: 'Zdroj produktu pro publikovani na Aukro', route: '/aukro/ui/catalog/products', owner: 'catalog-microservice' },
        { name: 'Warehouse microservice', role: 'Dostupne skladove mnozstvi pro nabidky', route: '[internal]', owner: 'warehouse-microservice' },
        { name: 'Aukro service', role: 'Priprava nabidek, policy gate a publikacni fronta', route: '/aukro/offers', owner: 'aukro-service' },
        { name: 'Orders microservice', role: 'Navazani objednavek z Aukro na centralni objednavky', route: '/aukro/orders', owner: 'orders-microservice' },
        { name: 'AI microservice', role: 'Navrhy textu nabidek a posouzeni rizik', route: '[internal]', owner: 'ai-microservice' },
        { name: 'Notifications microservice', role: 'Upozorneni operatorum a klientum', route: '[internal]', owner: 'notifications-microservice' },
        { name: 'Logging microservice', role: 'Audit a provozni udalosti', route: '[internal]', owner: 'logging-microservice' },
      ],
    };
  }

  private publicContentPreview(preview: any) {
    const content = this.asRecord(preview.content);
    const source = this.asRecord(preview.source);

    return {
      success: true,
      marketplace: this.textOrNull(preview.marketplace) || 'aukro',
      label: this.textOrNull(preview.label) || 'Aukro',
      format: this.textOrNull(preview.format) || 'plain-text',
      content: {
        title: this.textOrNull(content.title) || 'Produkt bez nazvu',
        plainText: this.textOrNull(content.plainText) || '',
      },
      source: {
        canonicalDocumentVersion: this.textOrNull(source.canonicalDocumentVersion),
        legacyDescriptionFallback: source.legacyDescriptionFallback === undefined ? undefined : Boolean(source.legacyDescriptionFallback),
        sourceHash: this.textOrNull(source.sourceHash),
        generatedAt: this.textOrNull(source.generatedAt),
      },
      overridesApplied: preview.overridesApplied === undefined ? undefined : Boolean(preview.overridesApplied),
      manualOverride: preview.manualOverride === undefined ? undefined : Boolean(preview.manualOverride),
      stale: preview.stale === undefined ? undefined : Boolean(preview.stale),
      requiresManualReview: preview.requiresManualReview === undefined ? undefined : Boolean(preview.requiresManualReview),
      propagation: this.asRecord(preview.propagation),
      profile: this.asRecord(preview.profile),
      fields: Array.isArray(preview.fields) ? preview.fields : [],
      staleManualFields: Array.isArray(preview.staleManualFields) ? preview.staleManualFields.map((item: any) => String(item)).filter(Boolean) : [],
      warnings: Array.isArray(preview.warnings) ? preview.warnings.map((item) => String(item)).filter(Boolean) : [],
    };
  }

  private async provisionCatalogForAuthResponse(response: AuthResponse) {
    if (!response?.accessToken) {
      throw new ForbiddenException('Catalog provisioning requires an Auth access token.');
    }
    await this.catalogClient.provisionUserCatalog(`Bearer ${response.accessToken}`, 'aukro');
  }

  private async resolveAukroAccountForUser(user: AuthUser, accountId?: string) {
    if (!accountId) {
      return this.ensureAukroAccount(user);
    }

    const email = this.userEmail(user);
    const account = await this.prisma.aukroAccount.findFirst({
      where: { id: accountId, email, isActive: true },
    });
    if (!account) {
      throw new ForbiddenException('Aukro ucet neni dostupny pro prihlaseneho uzivatele.');
    }
    return account;
  }

  private async assertEffectiveCatalogProductAccess(req: any, productId: string, authorization?: string) {
    const normalizedProductId = this.textOrNull(productId);
    if (!normalizedProductId) {
      throw new BadRequestException('Vyberte produkt.');
    }
    try {
      await this.catalogClient.getProductById(normalizedProductId, {
        authorization: authorization || this.humanAuthorizationOrThrow(req),
        catalogScope: 'effective',
      });
    } catch {
      throw new ForbiddenException('Produkt neni dostupny v effective Catalog scope prihlaseneho uzivatele.');
    }
  }

  private async ensureAukroAccount(user: AuthUser) {
    const email = this.userEmail(user);
    const existing = await this.prisma.aukroAccount.findFirst({ where: { email, isActive: true } });
    if (existing) return existing;

    return this.prisma.aukroAccount.create({
      data: {
        email,
        name: [user.firstName, user.lastName].filter(Boolean).join(' ') || email,
        isActive: true,
      },
    });
  }

  private publicAccount(account: any) {
    return {
      id: account.id,
      name: account.name,
      email: account.email,
      isActive: Boolean(account.isActive),
      isLinkedToAukro: Boolean(account.apiKey),
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  private publicOffer(offer: any) {
    const rawData = this.asRecord(offer.rawData);
    const draft = this.asRecord(rawData.draft);
    const publishQueue = this.asRecord(rawData.publishQueue);
    const reconciliation = this.asRecord(rawData.reconciliation);

    return {
      id: offer.id,
      accountId: offer.accountId,
      productId: offer.productId,
      aukroOfferId: offer.aukroOfferId,
      title: offer.title,
      description: offer.description,
      imageUrl: this.extractImageUrl(rawData),
      price: this.numberOrNull(offer.price),
      stockQuantity: offer.stockQuantity,
      isActive: Boolean(offer.isActive),
      draftStatus: draft.draftStatus || null,
      policyReasonCodes: Array.isArray(draft.policyReasonCodes) ? draft.policyReasonCodes : [],
      publishStatus: publishQueue.status || null,
      reconciliationStatus: this.asRecord(reconciliation.lastReport).status || null,
      updatedAt: offer.updatedAt,
    };
  }

  private publicCatalogCandidate(product: any, offer?: any, user?: AuthUser) {
    const rawData = this.asRecord(offer?.rawData);
    const draft = this.asRecord(rawData.draft);
    const publishQueue = this.asRecord(rawData.publishQueue);
    const title = this.textOrNull(product?.title ?? product?.name) || 'Produkt bez názvu';
    const imageUrl = this.extractImageUrl(product);
    const publishedOnAukro = Boolean(offer?.isActive && offer?.aukroOfferId);
    const sourceSummary = this.catalogSourceSummary(product, user);

    return {
      id: product.id,
      title,
      imageUrl,
      price: this.numberOrNull(product?.price ?? product?.basePrice ?? product?.pricing?.price ?? product?.pricing?.basePrice),
      isActive: product?.isActive === undefined ? undefined : Boolean(product.isActive),
      existingOfferId: offer?.id || null,
      aukroOfferId: offer?.aukroOfferId || null,
      publishedOnAukro,
      draftStatus: draft.draftStatus || null,
      publishStatus: publishQueue.status || null,
      catalogScope: 'effective',
      sourceLabel: sourceSummary.sourceLabel,
      accessLabel: sourceSummary.accessLabel,
      resaleEnabled: sourceSummary.resaleEnabled,
      resaleMutationAllowed: sourceSummary.ownedByUser !== false,
      resaleOwnershipKnown: sourceSummary.ownedByUser !== null,
      resaleOwnedByUser: sourceSummary.ownedByUser,
      resaleMutationHint: sourceSummary.resaleMutationHint,
      blockers: Array.isArray(draft.policyReasonCodes) ? draft.policyReasonCodes : [],
    };
  }


  private async withCatalogQualityCandidate(candidate: any, authorization: string) {
    const productId = this.textOrNull(candidate?.id);
    if (!productId) return candidate;

    try {
      const readiness = await this.catalogClient.getProductQualityReadiness(productId, { authorization });
      const quality = this.publicCatalogQuality(productId, readiness);
      return {
        ...candidate,
        catalogQualityPolicyId: quality.policyId,
        catalogQualityCanActivate: quality.canActivate,
        catalogQualityBlockers: quality.blockingIssueCodes,
        catalogQualityNextAction: quality.nextAction,
        blockers: Array.from(new Set([...(Array.isArray(candidate.blockers) ? candidate.blockers : []), ...quality.blockingIssueCodes])),
        selectable: quality.canActivate,
      };
    } catch {
      const blockers = [CATALOG_PRODUCT_QUALITY_UNAVAILABLE_BLOCKER];
      return {
        ...candidate,
        catalogQualityPolicyId: CATALOG_PRODUCT_QUALITY_POLICY_ID,
        catalogQualityCanActivate: false,
        catalogQualityBlockers: blockers,
        catalogQualityNextAction: 'retry_catalog_product_quality_review',
        blockers: Array.from(new Set([...(Array.isArray(candidate.blockers) ? candidate.blockers : []), ...blockers])),
        selectable: false,
      };
    }
  }

  private publicCatalogQuality(productId: string, readiness: CatalogProductReadiness) {
    const issues = this.catalogQualityIssues(readiness?.issues);
    const blockingIssues = issues.filter((issue) => this.isMandatoryCatalogQualityBlocker(issue));
    const blockingIssueCodes = Array.from(new Set(blockingIssues.map((issue) => issue.code)));
    return {
      policyId: CATALOG_PRODUCT_QUALITY_POLICY_ID,
      productId: readiness?.productId || productId,
      canActivate: blockingIssueCodes.length === 0,
      blockingIssues,
      blockingIssueCodes,
      nextAction: blockingIssueCodes.length ? `resolve_catalog_quality_blockers:${blockingIssueCodes.join(',')}` : 'ready_for_activation',
    };
  }

  private catalogQualityIssues(issues: CatalogProductQualityIssue[] | undefined): CatalogProductQualityIssue[] {
    if (!Array.isArray(issues)) return [];
    return issues
      .map((issue) => ({
        code: this.textOrNull(issue?.code) || 'unknown_catalog_quality_issue',
        field: this.textOrNull(issue?.field) || undefined,
        severity: this.textOrNull(issue?.severity) || 'warning',
        message: this.textOrNull(issue?.message) || undefined,
        source: this.textOrNull(issue?.source) || CATALOG_PRODUCT_QUALITY_POLICY_ID,
      }))
      .filter((issue) => Boolean(issue.code));
  }

  private isMandatoryCatalogQualityBlocker(issue: CatalogProductQualityIssue): boolean {
    if (!issue?.code || issue.severity !== 'blocking') return false;
    return !['draft_product', 'needs_review', 'inactive_product'].includes(issue.code);
  }

  private errorBlockers(error: any): string[] {
    const response = typeof error?.getResponse === 'function' ? error.getResponse() : error?.response;
    const blockers = response?.blockers || error?.blockers;
    return Array.isArray(blockers) ? blockers.map((item) => String(item)).filter(Boolean) : [];
  }

  private catalogSourceSummary(product: any, user?: AuthUser) {
    const source = this.asRecord(product?.source);
    const catalogSource = this.asRecord(product?.catalogSource);
    const settings = this.asRecord(product?.sourceSettings ?? product?.catalogSettings ?? source.settings ?? catalogSource.settings);
    const access = this.asRecord(product?.access ?? product?.catalogAccess ?? settings.access);
    const seller = this.asRecord(product?.seller ?? source.seller ?? catalogSource.seller);
    const sourceType = (this.textOrNull(product?.sourceType ?? source.type ?? catalogSource.type ?? settings.sourceType) || '').toLowerCase();
    const ownerType = (this.textOrNull(product?.ownerType ?? source.ownerType ?? catalogSource.ownerType ?? seller.type) || '').toLowerCase();
    const ownerName = this.textOrNull(product?.ownerName ?? source.ownerName ?? catalogSource.ownerName ?? seller.name ?? seller.email);
    const isAlfares = product?.isAlfaresProduct === true
      || sourceType === 'alfares'
      || ownerType === 'alfares'
      || ownerName?.toLowerCase() === 'alfares';
    const resaleEnabled = this.booleanOrNull(product?.resaleEnabled ?? settings.resaleEnabled ?? access.resaleEnabled ?? source.resaleEnabled ?? catalogSource.resaleEnabled);
    const ownedByUser = this.catalogProductOwnedByUser(product, user);
    const sourceLabel = isAlfares
      ? 'Alfares source'
      : (ownedByUser === true ? 'Vlastni Catalog produkt' : (ownerName ? `Seller source: ${ownerName}` : 'Seller/community source'));
    const accessLabel = isAlfares
      ? 'Catalog settings opt-in'
      : (resaleEnabled === true ? 'Community-visible resale' : 'Seller-only');
    const resaleMutationHint = ownedByUser === false
      ? 'Pouze vlastnik produktu muze menit resale nastaveni.'
      : (ownedByUser === true ? 'Resale nastavuje vlastnik produktu.' : 'Vlastnictvi overi Catalog pri ulozeni.');

    return { sourceLabel, accessLabel, resaleEnabled, ownedByUser, resaleMutationHint };
  }

  private catalogProductOwnedByUser(product: any, user?: AuthUser): boolean | null {
    if (!user) return null;

    const source = this.asRecord(product?.source);
    const catalogSource = this.asRecord(product?.catalogSource);
    const settings = this.asRecord(product?.sourceSettings ?? product?.catalogSettings ?? source.settings ?? catalogSource.settings);
    const access = this.asRecord(product?.access ?? product?.catalogAccess ?? settings.access);
    const seller = this.asRecord(product?.seller ?? source.seller ?? catalogSource.seller);
    const explicitOwner = this.booleanOrNull(
      product?.ownedByCurrentUser ??
      product?.isOwnedByCurrentUser ??
      product?.isOwner ??
      access.ownedByCurrentUser ??
      access.isOwner ??
      access.canUpdate ??
      access.canEdit,
    );
    if (explicitOwner !== null) return explicitOwner;

    const userIds = new Set([user.id, user.email].map((item) => this.textOrNull(item)?.toLowerCase()).filter(Boolean) as string[]);
    const ownerIds = [
      product?.ownerUserId,
      product?.owner_user_id,
      product?.ownerId,
      product?.userId,
      product?.createdByUserId,
      product?.createdById,
      source.ownerUserId,
      source.owner_user_id,
      source.ownerId,
      catalogSource.ownerUserId,
      catalogSource.owner_user_id,
      catalogSource.ownerId,
      seller.userId,
      seller.id,
    ].map((item) => this.textOrNull(item)?.toLowerCase()).filter(Boolean) as string[];
    if (ownerIds.length) {
      return ownerIds.some((ownerId) => userIds.has(ownerId));
    }

    const ownerEmails = [
      product?.ownerEmail,
      product?.owner_email,
      source.ownerEmail,
      source.owner_email,
      catalogSource.ownerEmail,
      catalogSource.owner_email,
      seller.email,
    ].map((item) => this.textOrNull(item)?.toLowerCase()).filter(Boolean) as string[];
    if (ownerEmails.length) {
      return ownerEmails.some((email) => userIds.has(email));
    }

    const fallbackSourceType = (this.textOrNull(product?.sourceType ?? source.type ?? catalogSource.type ?? settings.sourceType) || '').toLowerCase();
    const fallbackOwnerType = (this.textOrNull(product?.ownerType ?? source.ownerType ?? catalogSource.ownerType ?? seller.type) || '').toLowerCase();
    if (['own', 'mine', 'self'].includes(fallbackSourceType) || ['own', 'mine', 'self'].includes(fallbackOwnerType)) return true;
    if (['alfares', 'company', 'community', 'shared'].includes(fallbackSourceType) || ['alfares', 'company', 'community', 'shared'].includes(fallbackOwnerType)) return false;
    if (product?.isAlfaresProduct === true) return false;

    return null;
  }

  private async hydrateOrdersWithCentralReadModel(orders: any[]): Promise<any[]> {
    return Promise.all(orders.map(async (order) => {
      const centralOrderId = this.textOrNull(order.orderId);
      if (!centralOrderId) {
        return { ...order, centralOrderRead: { status: 'missing_order_id' } };
      }

      const centralOrder = await this.orderClient.getOrderReadModel(centralOrderId);
      if (!centralOrder) {
        return { ...order, centralOrderRead: { status: 'unavailable' } };
      }

      return { ...order, centralOrderRead: { status: 'available', order: centralOrder } };
    }));
  }

  private publicOrder(order: any) {
    const rawData = this.asRecord(order.rawData);
    const items = this.extractOrderItems(rawData);
    const title = this.textOrNull(rawData.title ?? rawData.name ?? rawData.orderTitle) || `Objednávka ${order.aukroOrderId || order.id}`;
    const centralRead = this.asRecord(order.centralOrderRead);
    const centralOrder = this.asRecord(centralRead.order);
    const centralLifecycle = this.asRecord(centralOrder.lifecycle);
    const readStatus = this.textOrNull(centralRead.status) || (order.orderId ? 'unavailable' : 'missing_order_id');
    const centralOrderId = this.textOrNull(centralOrder.id ?? order.orderId);
    const centralStatus = this.textOrNull(centralOrder.status);
    const lifecycleStage = this.textOrNull(centralOrder.lifecycleStage ?? centralLifecycle.lifecycleStage ?? centralLifecycle.stage);
    const paymentStatus = this.textOrNull(centralOrder.paymentStatus);
    const fulfillmentStatus = this.textOrNull(centralOrder.fulfillmentStatus);
    const deliveryStatus = this.textOrNull(centralOrder.deliveryStatus);
    const displayStage = lifecycleStage || centralStatus || 'unknown';

    return {
      id: order.id,
      aukroOrderId: order.aukroOrderId,
      orderId: order.orderId,
      centralOrderId,
      title,
      imageUrl: this.extractImageUrl(rawData),
      items: items.map((item) => this.publicOrderItem(item)).slice(0, 12),
      customerEmail: order.customerEmail,
      total: this.numberOrNull(order.total),
      currency: order.currency,
      localStatus: order.status,
      status: centralStatus || 'unknown',
      lifecycleStage: displayStage,
      lifecycleLabel: this.orderLifecycleLabel(displayStage),
      paymentStatus,
      fulfillmentStatus,
      deliveryStatus,
      ordersReadStatus: readStatus,
      statusSource: readStatus === 'available' ? 'orders' : 'unknown_stale',
      statusMessage: this.orderReadStatusMessage(readStatus),
      stale: readStatus !== 'available',
      forwarded: Boolean(order.forwarded),
      createdAt: order.createdAt,
    };
  }

  private publicOrderItem(item: any) {
    const record = this.asRecord(item);
    const title = this.textOrNull(record.title ?? record.name ?? record.productName ?? record.offerTitle ?? record.listingTitle) || 'Produkt bez názvu';

    return {
      title,
      imageUrl: this.extractImageUrl(record),
      quantity: this.numberOrNull(record.quantity ?? record.qty),
    };
  }

  private extractOrderItems(rawData: Record<string, any>): any[] {
    const order = this.asRecord(rawData.order);
    const candidates = [rawData.items, order.items, rawData.orderItems, rawData.lines, rawData.products];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate;
    }
    return [];
  }

  private extractImageUrl(value: any): string | null {
    if (!value) return null;
    if (typeof value === 'string') return value.trim() || null;

    const record = this.asRecord(value);
    const directCandidates = [
      record.imageUrl,
      record.thumbnailUrl,
      record.photoUrl,
      record.pictureUrl,
      record.mainImageUrl,
      record.primaryImageUrl,
      record.previewUrl,
      record.url,
      record.src,
      record.publicUrl,
    ];

    for (const candidate of directCandidates) {
      const url = this.textOrNull(candidate);
      if (url) return url;
    }

    const nestedCandidates = [record.image, record.thumbnail, record.photo, record.picture, record.mainImage, record.primaryImage];
    for (const candidate of nestedCandidates) {
      const url = this.extractImageUrl(candidate);
      if (url) return url;
    }

    const collections = [record.images, record.photos, record.media, record.pictures, record.assets, record.gallery];
    for (const collection of collections) {
      if (!Array.isArray(collection)) continue;
      for (const item of collection) {
        const url = this.extractImageUrl(item);
        if (url) return url;
      }
    }

    return null;
  }

  private textOrNull(value: any): string | null {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    return text || null;
  }

  private dashboardSummary(offers: any[], orders: any[]) {
    return {
      offersTotal: offers.length,
      activeOffers: offers.filter((offer) => offer.isActive).length,
      drafts: offers.filter((offer) => Boolean(this.asRecord(this.asRecord(offer.rawData).draft).draftVersion)).length,
      blockedDrafts: offers.filter((offer) => this.asRecord(this.asRecord(offer.rawData).draft).draftStatus === 'blocked').length,
      ordersTotal: orders.length,
      unforwardedOrders: orders.filter((order) => !order.forwarded).length,
      ordersWithCentralStatus: orders.filter((order) => this.asRecord(order.centralOrderRead).status === 'available').length,
      staleOrders: orders.filter((order) => this.asRecord(order.centralOrderRead).status !== 'available').length,
    };
  }

  private adminOrderStats(orders: any[], sampleLimit: number) {
    return {
      sampleLimit,
      sampledOrders: orders.length,
      totalOrders: orders.length,
      forwardedOrders: orders.filter((order) => order.forwarded).length,
      unforwardedOrders: orders.filter((order) => !order.forwarded).length,
      ordersWithCentralStatus: orders.filter((order) => this.orderReadStatusFor(order) === 'available').length,
      staleOrders: orders.filter((order) => this.orderReadStatusFor(order) !== 'available').length,
      byOrdersReadStatus: this.countOrdersBy(orders, (order) => this.orderReadStatusFor(order)),
      byOrderStatus: this.countOrdersBy(orders, (order) => this.centralOrderValue(order, 'status') || order.status),
      byLifecycleStage: this.countOrdersBy(orders, (order) => this.centralLifecycleStage(order) || this.centralOrderValue(order, 'status') || this.orderReadStatusFor(order)),
      byPaymentStatus: this.countOrdersBy(orders, (order) => this.centralOrderValue(order, 'paymentStatus')),
      byFulfillmentStatus: this.countOrdersBy(orders, (order) => this.centralOrderValue(order, 'fulfillmentStatus')),
      byDeliveryStatus: this.countOrdersBy(orders, (order) => this.centralOrderValue(order, 'deliveryStatus')),
    };
  }

  private orderReadStatusFor(order: any): string {
    return this.textOrNull(this.asRecord(order.centralOrderRead).status) || (order.orderId ? 'unavailable' : 'missing_order_id');
  }

  private centralOrderValue(order: any, field: string): string | null {
    const centralOrder = this.asRecord(this.asRecord(order.centralOrderRead).order);
    return this.textOrNull(centralOrder[field]);
  }

  private centralLifecycleStage(order: any): string | null {
    const centralOrder = this.asRecord(this.asRecord(order.centralOrderRead).order);
    const centralLifecycle = this.asRecord(centralOrder.lifecycle);
    return this.textOrNull(centralOrder.lifecycleStage ?? centralLifecycle.lifecycleStage ?? centralLifecycle.stage);
  }

  private countOrdersBy(orders: any[], selector: (order: any) => any): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const order of orders) {
      const key = (this.textOrNull(selector(order)) || 'unknown').toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
    }
    return Object.keys(counts).sort().reduce((result, key) => {
      result[key] = counts[key];
      return result;
    }, {} as Record<string, number>);
  }

  private orderLifecycleLabel(stage: string | null): string {
    const key = (this.textOrNull(stage) || 'unknown').toLowerCase();
    const labels: Record<string, string> = {
      ordered_unpaid: 'objednáno / čeká na platbu',
      payment_failed: 'platba selhala',
      paid_not_delivered: 'zaplaceno / čeká na doručení',
      warehouse_fulfillment_requested: 'předáno skladu',
      warehouse_collecting: 'sklad vybírá zboží',
      warehouse_forming: 'sklad balí zásilku',
      warehouse_formed: 'připraveno k odeslání',
      handed_to_delivery: 'předáno dopravě',
      in_delivery: 'v doručení',
      received: 'doručeno',
      not_received: 'nedoručeno',
      returned: 'vráceno',
      cancelled: 'zrušeno',
      pending: 'čeká',
      confirmed: 'potvrzeno',
      processing: 'zpracování',
      shipped: 'odesláno',
      delivered: 'doručeno',
      failed: 'selhalo',
      unknown: 'unknown/stale',
    };
    return labels[key] || key.replace(/_/g, ' ');
  }

  private orderReadStatusMessage(status: string): string {
    switch (status) {
      case 'available':
        return 'Orders stav načten';
      case 'missing_order_id':
        return 'chybí central Orders ID';
      default:
        return 'Orders stav je unknown/stale';
    }
  }

  private asRecord(value: any): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  private numberOrNull(value: any): number | null {
    if (value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private userEmail(user: AuthUser): string {
    return this.textOrNull(user.email) || `${user.id}@unknown`;
  }

  private humanAuthorizationOrThrow(req: any): string {
    const authorization = this.textOrNull(req?.headers?.authorization);
    if (!authorization || !/^Bearer\s+\S+/i.test(authorization)) {
      throw new ForbiddenException('Catalog requires the authenticated user Bearer token.');
    }
    return authorization;
  }

  private booleanOrNull(value: any): boolean | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'boolean') return value;
    const text = String(value).trim().toLowerCase();
    if (['true', '1', 'yes', 'enabled'].includes(text)) return true;
    if (['false', '0', 'no', 'disabled'].includes(text)) return false;
    return null;
  }

  private catalogSourcesFromQuery(value: any): string[] | undefined {
    const rawItems = Array.isArray(value) ? value : String(value || '').split(',');
    const allowed = new Set(['own', 'alfares', 'community']);
    const sources = rawItems
      .flatMap((item) => String(item || '').split(','))
      .map((item) => item.trim().toLowerCase())
      .filter((item) => allowed.has(item));

    return sources.length ? Array.from(new Set(sources)) : undefined;
  }

  private isAukroAdmin(user: AuthUser): boolean {
    const email = (user.email || '').toLowerCase();
    const configuredEmails = (process.env.AUKRO_ADMIN_EMAILS || 'test@example.com')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    const roles = new Set([...(user.roles || []), ...(user.permissions || [])].map((item) => item.toLowerCase()));

    return configuredEmails.includes(email)
      || roles.has('admin')
      || roles.has('aukro:admin')
      || roles.has('alfares:admin')
      || roles.has('app:aukro-service:admin')
      || roles.has('service:aukro:admin');
  }

  private safeNumber(value: any, fallback: number, min: number, max: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, Math.trunc(parsed)));
  }

  private authDashboardReturnUrl(): string {
    return process.env.AUKRO_DASHBOARD_URL || 'https://aukro.alfares.cz/dashboard';
  }

  private hostedAuthUrl(path: string, state: string): string {
    const authBaseUrl = (process.env.HOSTED_AUTH_URL || 'https://auth.alfares.cz').replace(/\/$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${authBaseUrl}${normalizedPath}?client_id=aukro&return_url=${encodeURIComponent(this.authDashboardReturnUrl())}&state=${encodeURIComponent(state)}&lang=cs`;
  }

  private authAccountLinks() {
    return {
      profileUrl: this.hostedAuthUrl('/profile', 'aukro-profile'),
      walletUrl: this.hostedAuthUrl('/wallet', 'aukro-wallet'),
      settingsUrl: this.hostedAuthUrl('/settings', 'aukro-settings'),
    };
  }

  private renderShell({ page }: { page: 'landing' | 'dashboard' }): string {
    const isDashboard = page === 'dashboard';
    const hostedLoginUrl = this.hostedAuthUrl('/login', 'aukro-dashboard');
    const hostedRegisterUrl = this.hostedAuthUrl('/register', 'aukro-dashboard');
    const authLinks = this.authAccountLinks();
    const catalogDashboardBaseUrl = (process.env.CATALOG_DASHBOARD_URL || 'https://catalog.alfares.cz').replace(/\/$/, '');
    const catalogProductsUrl = `${catalogDashboardBaseUrl}/dashboard/products`;
    const catalogNewProductUrl = `${catalogDashboardBaseUrl}/dashboard/products/new`;
    const catalogSettingsUrl = `${catalogDashboardBaseUrl}/dashboard/settings`;

    return `<!doctype html>
<html lang="cs">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Aukro Automation Alfares</title>
  <style>
    :root {
      color-scheme: light;
      --aukro-orange: #ff5a00;
      --aukro-orange-hover: #df4e00;
      --aukro-blue: #173cb8;
      --aukro-blue-soft: #e8f1fe;
      --aukro-orange-soft: #fff0ec;
      --ink: #202020;
      --ink-strong: #1d1d1f;
      --muted: #666666;
      --muted-2: #777777;
      --line: #dadde0;
      --line-strong: #b9bbbc;
      --bg: #f1f1f3;
      --surface: #ffffff;
      --surface-2: #fafafa;
      --ok: #16834a;
      --warn: #a85d12;
      --shadow: 0 1px 2px rgba(0, 0, 0, .14);
      --radius: 8px;
      --max: 1368px;
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      font-family: Ubuntu, Arial, sans-serif;
      color: var(--ink);
      background: var(--bg);
      font-size: 14px;
      line-height: 1.42;
    }
    a { color: inherit; text-decoration: none; }
    button, input, select { font: inherit; }
    .top { background: var(--surface); }
    .top-inner {
      max-width: var(--max);
      margin: 0 auto;
      min-height: 80px;
      display: grid;
      grid-template-columns: minmax(300px, 340px) minmax(320px, 600px) auto;
      gap: 28px;
      align-items: center;
      padding: 0 16px;
    }
    .logo {
      display: inline-flex;
      align-items: center;
      color: var(--aukro-orange);
      font-size: 40px;
      font-weight: 700;
      letter-spacing: 0;
      line-height: 1;
    }
    .search-shell {
      height: 44px;
      border-radius: 22px;
      background: var(--bg);
      display: grid;
      grid-template-columns: 34px 1fr auto;
      align-items: center;
      padding: 0 12px 0 16px;
      color: var(--muted);
      min-width: 0;
    }
    .search-shell input {
      min-width: 0;
      height: 40px;
      border: 0;
      outline: 0;
      background: transparent;
      color: #000;
      font-size: 16px;
      padding: 0 8px;
    }
    .search-shell span:last-child { color: var(--ink); font-size: 13px; white-space: nowrap; }
    .top-actions { display: flex; align-items: center; justify-content: flex-end; gap: 18px; }
    .account-link { display: grid; grid-template-columns: 32px auto; gap: 8px; align-items: center; font-size: 13px; line-height: 1.1; font-weight: 700; }
    .account-link span:last-child { display: block; min-width: 72px; max-width: 128px; overflow: hidden; text-overflow: ellipsis; }
    .account-link.is-authenticated { color: var(--aukro-orange); }
    .account-link.is-authenticated .account-icon { color: var(--aukro-orange); border-color: var(--aukro-orange); }
    .account-icon, .cart-icon, .brand-switch { width: 32px; height: 32px; border-radius: 999px; display: grid; place-items: center; font-weight: 700; }
    .account-icon { color: #777; border: 2px solid #777; }
    .cart-icon { color: #777; font-size: 23px; }
    .brand-switch { background: var(--aukro-blue); color: #fff; font-size: 24px; }
    .sell-button, button.primary, .button.primary {
      min-height: 40px;
      border: 1px solid var(--aukro-orange);
      border-bottom: 2px solid var(--aukro-orange-hover);
      border-radius: var(--radius);
      background: var(--aukro-orange);
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 0 14px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
    }
    .sell-button:hover, button.primary:hover, .button.primary:hover { background: var(--aukro-orange-hover); }
    .button, button {
      min-height: 40px;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: var(--surface);
      color: var(--ink);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 0 14px;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
    }
    button:disabled { opacity: .55; cursor: wait; }
    .logout-button {
      min-height: 36px;
      border-color: var(--line-strong);
      background: #fff;
      color: var(--ink);
      font-size: 14px;
      padding: 0 12px;
      white-space: nowrap;
    }
    .logout-button:hover { border-color: var(--aukro-orange); color: var(--aukro-orange); }
    .category-bar { background: var(--surface); border-top: 1px solid transparent; border-bottom: 1px solid var(--line); }
    .category-inner {
      max-width: var(--max);
      height: 48px;
      margin: 0 auto;
      display: flex;
      align-items: stretch;
      overflow-x: auto;
      padding: 0 16px;
    }
    .category-inner a {
      min-width: max-content;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 16px;
      border: 1px solid var(--line);
      border-bottom: 0;
      background: var(--bg);
      font-size: 14px;
      font-weight: 700;
    }
    .category-inner a.active { color: var(--aukro-orange); background: var(--surface); }
    .category-inner .brand-tab { min-width: 64px; background: var(--surface); border: 1px solid var(--line-strong); }
    .page {
      max-width: var(--max);
      margin: 0 auto;
      padding: 20px 16px 52px;
    }
    .market-layout {
      display: grid;
      grid-template-columns: 278px minmax(0, 1fr);
      gap: 16px;
      align-items: start;
    }
    .side-panel {
      background: var(--surface);
      min-height: calc(100vh - 150px);
      padding: 24px 18px;
      border-radius: 0;
    }
    .back-link { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; margin-bottom: 18px; }
    .side-list { display: grid; gap: 8px; color: var(--muted); margin: 0 0 18px; padding: 0; list-style: none; }
    .side-list a, .side-list span { display: block; color: var(--muted); padding: 2px 0; }
    .side-title { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--line-strong); padding-top: 12px; margin-top: 14px; font-weight: 700; }
    .reset { color: var(--aukro-blue); font-size: 12px; }
    .filter-group { margin-top: 22px; }
    .filter-group h3 { margin: 0 0 10px; font-size: 14px; }
    .check, .radio { display: flex; align-items: center; gap: 8px; min-height: 28px; color: var(--ink); }
    .check span, .radio span { color: var(--muted); }
    .fake-radio, .fake-check {
      width: 22px;
      height: 22px;
      display: inline-grid;
      place-items: center;
      border: 1px solid var(--line-strong);
      background: var(--surface);
    }
    .fake-radio { border-radius: 999px; }
    .fake-radio.active { border: 2px solid var(--aukro-orange); }
    .fake-radio.active::after { content: ""; width: 10px; height: 10px; border-radius: 999px; background: var(--aukro-orange); }
    .fake-check { border-radius: 4px; }
    .content { min-width: 0; }
    .hero-banner {
      min-height: 230px;
      background: linear-gradient(90deg, #ff5a00 0%, #ff6d1a 43%, #a7d35b 43%, #a7d35b 100%);
      color: #fff;
      display: grid;
      grid-template-columns: minmax(0, .95fr) minmax(340px, .85fr);
      overflow: hidden;
      margin-bottom: 24px;
      box-shadow: var(--shadow);
    }
    .hero-copy { padding: 38px 40px; display: grid; align-content: center; gap: 12px; }
    .hero-copy h1 { margin: 0; max-width: 680px; font-size: clamp(34px, 4.8vw, 58px); line-height: 1; letter-spacing: 0; }
    .hero-copy p { margin: 0; max-width: 680px; font-size: 20px; line-height: 1.35; }
    .hero-art { position: relative; min-height: 230px; display: grid; align-items: center; justify-items: center; padding: 22px; color: var(--ink); }
    .automation-card {
      width: min(460px, 92%);
      background: #fff;
      border-radius: var(--radius);
      box-shadow: 0 16px 38px rgba(0, 0, 0, .18);
      padding: 18px;
      color: var(--ink);
    }
    .automation-flow { display: grid; gap: 10px; }
    .flow-row { display: grid; grid-template-columns: 38px 1fr auto; align-items: center; gap: 12px; border: 1px solid var(--line); border-radius: var(--radius); padding: 10px; background: var(--surface-2); }
    .flow-icon { width: 38px; height: 38px; border-radius: 999px; display: grid; place-items: center; background: var(--aukro-orange-soft); color: var(--aukro-orange); font-weight: 700; }
    .flow-state { color: var(--ok); font-size: 12px; font-weight: 700; }
    .section-title { margin: 0 0 12px; font-size: 28px; line-height: 1.15; font-weight: 700; color: var(--ink); }
    .subline { margin: -4px 0 18px; color: var(--muted); }
    .quick-grid, .category-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 8px;
      margin-bottom: 24px;
    }
    .quick-tile, .category-tile, .metric {
      min-height: 54px;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: var(--surface);
      box-shadow: var(--shadow);
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 16px;
      font-weight: 700;
    }
    .quick-tile.accent { background: var(--aukro-orange); color: #fff; border-color: var(--aukro-orange); }
    .quick-tile.blue { background: var(--aukro-blue); color: #fff; border-color: var(--aukro-blue); }
    .quick-icon { color: var(--aukro-orange); font-size: 20px; line-height: 1; }
    .quick-tile.accent .quick-icon, .quick-tile.blue .quick-icon { color: #fff; }
    .offer-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 24px;
    }
    .product-card {
      min-width: 0;
      background: var(--surface);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      overflow: hidden;
      color: var(--ink-strong);
    }
    .product-media {
      height: 170px;
      background: linear-gradient(135deg, #f4f4f5, #ffffff);
      display: grid;
      place-items: center;
      position: relative;
      border-bottom: 1px solid #ececec;
    }
    .product-media .thumb {
      width: 94px;
      height: 94px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      background: var(--aukro-orange-soft);
      color: var(--aukro-orange);
      font-size: 42px;
      font-weight: 700;
      box-shadow: 0 6px 18px rgba(0, 0, 0, .13);
    }
    .heart {
      position: absolute;
      top: 12px;
      right: 12px;
      min-width: 52px;
      height: 38px;
      border-radius: var(--radius);
      background: #fff;
      box-shadow: var(--shadow);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-weight: 700;
    }
    .product-body { padding: 14px 16px 16px; display: grid; gap: 9px; }
    .condition { color: var(--aukro-orange); text-transform: uppercase; font-size: 12px; font-weight: 700; letter-spacing: .03em; }
    .product-title { margin: 0; font-size: 17px; line-height: 1.25; font-weight: 700; }
    .compact-product-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(132px, 148px));
      gap: 12px;
      align-items: start;
      justify-content: start;
      margin-top: 12px;
    }
    .compact-product-card {
      width: 100%;
      aspect-ratio: 1 / 1;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: var(--surface);
      box-shadow: var(--shadow);
      color: var(--ink-strong);
      display: grid;
      grid-template-rows: minmax(0, 1fr) auto;
      gap: 7px;
      padding: 8px;
      overflow: hidden;
      text-align: left;
      position: relative;
    }
    button.compact-product-card { cursor: pointer; }
    button.compact-product-card:hover { border-color: var(--aukro-orange); box-shadow: 0 4px 14px rgba(255, 90, 0, .18); }
    .compact-product-card.is-selected { border-color: var(--aukro-orange); box-shadow: 0 4px 14px rgba(255, 90, 0, .2); }
    .compact-product-card.is-disabled { opacity: .72; border-color: #f0b8a8; background: #fff8f5; }
    .product-select {
      position: absolute;
      top: 8px;
      left: 8px;
      z-index: 2;
      width: 22px;
      height: 22px;
      accent-color: var(--aukro-orange);
    }
    .card-preview-button {
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 2;
      min-height: 28px;
      padding: 0 8px;
      background: #fff;
      box-shadow: var(--shadow);
    }
    .resale-toggle {
      min-height: 32px;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: var(--surface-2);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 0 8px;
      color: var(--ink);
      font-size: 12px;
      font-weight: 700;
    }
    .resale-toggle input { width: 16px; height: 16px; accent-color: var(--aukro-orange); }
    .resale-toggle.is-on { border-color: var(--ok); color: var(--ok); background: #f1fff8; }
    .resale-toggle.is-disabled { color: var(--muted); cursor: not-allowed; opacity: .66; }
    .compact-product-media {
      min-height: 0;
      border-radius: 6px;
      background: linear-gradient(135deg, #f4f4f5, #ffffff);
      border: 1px solid #ececec;
      display: grid;
      place-items: center;
      overflow: hidden;
    }
    .compact-product-media img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .photo-placeholder {
      width: 52px;
      height: 52px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      background: var(--aukro-orange-soft);
      color: var(--aukro-orange);
      font-size: 26px;
      font-weight: 700;
    }
    .compact-product-title {
      min-height: 32px;
      color: var(--ink-strong);
      font-size: 13px;
      font-weight: 700;
      line-height: 1.2;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .compact-product-meta { min-height: 18px; color: var(--muted); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .compact-product-tags { min-height: 20px; display: flex; gap: 4px; flex-wrap: wrap; overflow: hidden; }
    .compact-product-tag { max-width: 100%; border: 1px solid var(--line); border-radius: 999px; padding: 2px 6px; background: var(--surface-2); color: var(--muted); font-size: 11px; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .price { font-size: 22px; font-weight: 700; text-align: right; }
    .muted { color: var(--muted); }
    .tabs-bar {
      background: var(--surface);
      display: flex;
      flex-wrap: wrap;
      gap: 0;
      align-items: center;
      padding: 16px;
      margin-bottom: 16px;
    }
    .tabs-bar .tab {
      min-width: 118px;
      min-height: 36px;
      border: 1px solid var(--line);
      border-radius: 0;
      background: var(--surface);
      color: var(--ink);
      padding: 0 16px;
      font-weight: 500;
    }
    .tabs-bar .tab.active { background: var(--aukro-orange); color: #fff; border-color: var(--aukro-orange); }
    .sort-control { margin-left: auto; display: flex; align-items: center; gap: 10px; }
    .select-like { min-height: 36px; border: 1px solid var(--line); background: #fff; padding: 0 12px; display: inline-flex; align-items: center; gap: 6px; }
    .panel { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow); padding: 18px; }
    .dashboard-head { display: grid; grid-template-columns: minmax(0, 1fr) 420px; gap: 16px; margin-bottom: 16px; }
    .metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
    .metric { min-height: 72px; display: block; }
    .metric strong { display: block; font-size: 26px; line-height: 1; }
    .metric span { display: block; margin-top: 8px; color: var(--muted); font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .status-line { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 12px 0; }
    .status-dot { width: 12px; height: 12px; border-radius: 99px; background: var(--warn); }
    .status-dot.ok { background: var(--ok); }
    .meta { color: var(--muted); font-size: 13px; display: flex; flex-wrap: wrap; gap: 8px; }
    .pill { border: 1px solid var(--line); border-radius: 999px; padding: 4px 9px; background: var(--surface-2); color: var(--muted); }
    .toolbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin: 14px 0; }
    .toolbar input, .field {
      width: min(100%, 360px);
      min-height: 40px;
      border: 1px solid var(--line);
      background: #fff;
      border-radius: 0;
      padding: 0 12px;
    }
    .catalog-action-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); margin-bottom: 0; }
    .catalog-action-grid .quick-tile { min-height: 64px; }
    .source-filter {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      min-height: 40px;
    }
    .source-check {
      min-height: 36px;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: var(--surface-2);
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 0 10px;
      font-weight: 700;
      color: var(--ink);
    }
    .source-check input { width: 16px; height: 16px; accent-color: var(--aukro-orange); }
    .message { min-height: 24px; color: var(--muted); }
    .message.ok { color: var(--ok); }
    .message.warn { color: var(--warn); }
    .bulk-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: var(--surface-2);
      padding: 10px 12px;
      margin: 8px 0 12px;
    }
    .pager {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 12px;
    }
    .pager button { min-width: 92px; }
    .catalog-preview {
      margin: 12px 0;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: var(--surface-2);
      padding: 14px;
      display: grid;
      gap: 10px;
    }
    .catalog-preview-head {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 12px;
      align-items: start;
    }
    .catalog-preview-title { margin: 0; font-size: 18px; line-height: 1.25; }
    .catalog-preview-text {
      max-height: 180px;
      overflow: auto;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #fff;
      padding: 10px;
      white-space: pre-wrap;
      color: var(--ink);
    }
    .catalog-review-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .catalog-review-badge {
      border-radius: 999px;
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 760;
    }
    .catalog-review-badge.manual { background: #e8f1ff; color: #174ea6; }
    .catalog-review-badge.stale { background: #fff4d6; color: #8a4b00; }
    .catalog-review-badge.review { background: #ffe4e6; color: #9f1239; }
    .workspace { display: grid; gap: 16px; }
    .list { display: grid; gap: 10px; }
    .listing-row {
      display: grid;
      grid-template-columns: 132px minmax(0, 1fr) 150px;
      gap: 16px;
      align-items: stretch;
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      overflow: hidden;
    }
    .listing-thumb { background: linear-gradient(135deg, var(--aukro-orange-soft), #fff); display: grid; place-items: center; font-size: 34px; color: var(--aukro-orange); font-weight: 700; }
    .listing-main { padding: 16px 0; min-width: 0; }
    .listing-main b { display: block; font-size: 18px; margin-bottom: 8px; }
    .listing-side { padding: 16px; border-left: 1px solid var(--line); display: grid; align-content: center; gap: 6px; text-align: right; }
    .services { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .service { border: 1px solid var(--line); border-radius: var(--radius); padding: 14px; background: #fff; box-shadow: var(--shadow); }
    .admin { display: none; margin-top: 16px; }
    .hidden { display: none !important; }
    .empty-state { background: #fff; box-shadow: var(--shadow); padding: 28px; border-radius: var(--radius); }
    @media (max-width: 1120px) {
      .top-inner { grid-template-columns: 1fr; gap: 12px; padding: 18px 16px; }
      .top-actions { justify-content: flex-start; flex-wrap: wrap; }
      .market-layout { grid-template-columns: 1fr; }
      .content { order: 1; }
      .side-panel { min-height: 0; order: 2; }
      .quick-grid, .category-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .offer-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .hero-banner, .dashboard-head { grid-template-columns: 1fr; }
      .sort-control { margin-left: 0; width: 100%; }
    }
    @media (max-width: 640px) {
      .logo { font-size: 38px; }
      .page { padding: 12px; }
      .hero-copy { padding: 26px 20px; }
      .hero-copy p { font-size: 17px; }
      .quick-grid, .category-grid, .offer-grid, .metrics, .services { grid-template-columns: 1fr; }
      .listing-row { grid-template-columns: 92px minmax(0, 1fr); }
      .listing-side { grid-column: 1 / -1; border-left: 0; border-top: 1px solid var(--line); text-align: left; }
      .category-inner { padding: 0 8px; }
    }
  </style>
</head>
<body data-page="${page}">
  <div class="top">
    <header class="top-inner">
      <a class="logo" href="/">Aukro.Alfares</a>
      <div class="search-shell" aria-label="Vyhledavani">
        <span>⌕</span>
        <input type="search" aria-label="Hledat" placeholder="Hledat" />
        <span>Všechny kategorie⌄</span>
      </div>
      <div class="top-actions">
        <a class="account-link" id="accountLoginLink" href="${hostedLoginUrl}" aria-label="Můj účet - přihlásit"><span class="account-icon">•</span><span id="accountNavLabel">Můj účet<br />Přihlásit</span></a>
        <button class="logout-button hidden" id="headerLogout" type="button" aria-label="Odhlásit z Aukro dashboardu">Odhlásit</button>
        <span class="cart-icon" aria-hidden="true">▰</span>
        <a class="sell-button" href="${hostedLoginUrl}">⊕ Prodat</a>
      </div>
    </header>
    <nav class="category-bar" aria-label="Kategorie">
      <div class="category-inner">
        <a class="active" href="/">Automatizace</a>
        <a href="/dashboard">Katalog</a>
        <a href="/dashboard">Publikace</a>
        <a href="/dashboard">Aktualizace</a>
        <a href="/dashboard">Objednávky</a>
        <a href="/dashboard">Sklad</a>
        <a href="/dashboard">Monitoring</a>
        <a href="/dashboard">Policy gate</a>
        <a href="/dashboard">Reporty</a>
        <a href="/dashboard">Vše</a>
        <a class="brand-tab" href="/"><span class="brand-switch">a</span></a>
      </div>
    </nav>
  </div>

  <main class="page">
    <section class="market-layout ${isDashboard ? 'hidden' : ''}">
      <aside class="side-panel" aria-label="Filtry automatizace">
        <a class="back-link" href="/">‹ Automatizace Aukro</a>
        <ul class="side-list">
          <li><a href="#workflow">Napojení katalogu (24)</a></li>
          <li><a href="#workflow">Publikace nabídek (18)</a></li>
          <li><a href="#workflow">Aktualizace cen a skladu (16)</a></li>
          <li><a href="#workflow">Hlídání změn Aukro (12)</a></li>
          <li><a href="#workflow">Objednávky a reporting (9)</a></li>
        </ul>
        <div class="side-title">Parametry <a class="reset" href="/">zrušit filtry</a></div>
        <div class="filter-group">
          <h3>Typ práce</h3>
          <label class="radio"><span class="fake-radio active"></span> Všechny procesy</label>
          <label class="radio"><span class="fake-radio"></span> Publikace</label>
          <label class="radio"><span class="fake-radio"></span> Monitoring</label>
          <label class="radio"><span class="fake-radio"></span> Synchronizace</label>
        </div>
        <div class="filter-group">
          <h3>Stav zboží</h3>
          <label class="check"><span class="fake-check"></span> Nové položky <span>(2542)</span></label>
          <label class="check"><span class="fake-check"></span> Rozbaleno <span>(43)</span></label>
          <label class="check"><span class="fake-check"></span> Použité <span>(31)</span></label>
        </div>
      </aside>

      <section class="content">
        <div class="hero-banner">
          <div class="hero-copy">
            <h1>Prodávejte na Aukru přes Alfares katalog, vlastní sortiment i sdílené produkty</h1>
            <p>Prodávejte zlevněné produkty Alfares a firemních dodavatelů, publikujte vlastní produkty a resellujte dostupné položky od dalších uživatelů nebo ze sdíleného katalogu. Alfares automatizuje listingy, naplnění marketplace účtu, platby a objednávky tam, kde to Aukro napojení dovoluje; zákazník spravuje produkty, připojuje přístup, prodává a expeduje.</p>
            <div class="toolbar"><a class="button primary" href="${hostedLoginUrl}">Vstoupit do dashboardu</a><a class="button" href="${hostedRegisterUrl}">Registrovat účet</a></div>
          </div>
          <div class="hero-art" aria-hidden="true">
            <div class="automation-card">
              <div class="automation-flow">
                <div class="flow-row"><span class="flow-icon">1</span><b>Dodavatelé, vlastní zboží, sdílený katalog</b><span class="flow-state">výběr</span></div>
                <div class="flow-row"><span class="flow-icon">2</span><b>Aukro listingy a účet</b><span class="flow-state">auto</span></div>
                <div class="flow-row"><span class="flow-icon">3</span><b>Objednávky, prodej a expedice</b><span class="flow-state">hlídáno</span></div>
              </div>
            </div>
          </div>
        </div>

        <h2 class="section-title">Co můžete prodávat přes Aukro Alfares</h2>
        <div class="quick-grid" id="workflow">
          <a class="quick-tile accent" href="${hostedLoginUrl}"><span class="quick-icon">▧</span> Katalog</a>
          <a class="quick-tile" href="${hostedLoginUrl}"><span class="quick-icon">◴</span> Končící aukce</a>
          <a class="quick-tile" href="${hostedLoginUrl}"><span class="quick-icon">①</span> Od 1 Kč</a>
          <a class="quick-tile" href="${hostedLoginUrl}"><span class="quick-icon">♨</span> Žhavé aukce</a>
          <a class="quick-tile" href="${hostedLoginUrl}"><span class="quick-icon">♕</span> Nejlepší prodejci</a>
          <a class="quick-tile blue" href="${hostedLoginUrl}"><span class="quick-icon">▣</span> Mobilní kontrola</a>
          <a class="quick-tile accent" href="${hostedLoginUrl}"><span class="quick-icon">i</span> Jak to funguje?</a>
        </div>

        <h2 class="section-title">Nabídky automatizace pro vás</h2>
        <p class="subline">Alfares propojuje zdroj produktu, marketplace listing a provozní kroky. Zákazník zůstává vlastníkem sortimentu, přístupu k Aukru, prodeje a odeslání.</p>
        <div class="offer-grid">
          <article class="product-card"><div class="product-media"><span class="thumb">A</span><span class="heart">♡ 32</span></div><div class="product-body"><span class="condition">Dodavatelé</span><h3 class="product-title">Alfares a firemní zboží se slevou</h3><p class="muted">Publikujte zvýhodněné dodavatelské produkty jako nabídky na Aukru.</p></div></article>
          <article class="product-card"><div class="product-media"><span class="thumb">↻</span><span class="heart">♡ 24</span></div><div class="product-body"><span class="condition">Vlastní zboží</span><h3 class="product-title">Produkty zákazníka v marketplace toku</h3><p class="muted">Přidejte vlastní sortiment a nechte Alfares připravit listingy a kontroly.</p></div></article>
          <article class="product-card"><div class="product-media"><span class="thumb">✓</span><span class="heart">♡ 22</span></div><div class="product-body"><span class="condition">Resell</span><h3 class="product-title">Sdílený katalog a produkty uživatelů</h3><p class="muted">Vyberte dostupné položky od dalších uživatelů a prodávejte je tam, kde máte oprávnění.</p></div></article>
          <article class="product-card"><div class="product-media"><span class="thumb">₭</span><span class="heart">♡ 19</span></div><div class="product-body"><span class="condition">Automatizace</span><h3 class="product-title">Listingy, platby a objednávky</h3><p class="muted">Alfares plní marketplace účet a provozní tok; zákazník prodává, řeší zákazníka a expeduje.</p></div></article>
        </div>
      </section>
    </section>

    <section id="dashboard" class="app ${isDashboard ? '' : 'hidden'}">
      <div class="market-layout">
        <aside class="side-panel" aria-label="Dashboard filtry">
          <a class="back-link" href="/">‹ Aukro dashboard</a>
          <ul class="side-list">
            <li><span>Moje nabídky</span></li>
            <li><span>Produkty k publikaci</span></li>
            <li><a href="${authLinks.profileUrl}" target="_blank" rel="noopener">Auth profil</a></li>
            <li><a href="${authLinks.walletUrl}" target="_blank" rel="noopener">Auth peněženka</a></li>
            <li><a href="${catalogProductsUrl}" target="_blank" rel="noopener">Spravovat Catalog produkty</a></li>
            <li><a href="${catalogNewProductUrl}" target="_blank" rel="noopener">Přidat Catalog produkt</a></li>
            <li><a href="${catalogSettingsUrl}" target="_blank" rel="noopener">Zdroje a resale</a></li>
            <li><span>Objednávky z Aukro</span></li>
            <li><span>Admin služby</span></li>
          </ul>
          <div class="side-title">Parametry <a class="reset" href="/">zrušit filtry</a></div>
          <div class="filter-group">
            <h3>Typ nabídky</h3>
            <label class="radio"><span class="fake-radio active"></span> Všechny nabídky</label>
            <label class="radio"><span class="fake-radio"></span> Drafty</label>
            <label class="radio"><span class="fake-radio"></span> Aktivní</label>
            <label class="radio"><span class="fake-radio"></span> Blokované</label>
          </div>
          <div class="filter-group">
            <h3>Stav zboží</h3>
            <label class="check"><span class="fake-check"></span> Nové</label>
            <label class="check"><span class="fake-check"></span> Rozbaleno</label>
            <label class="check"><span class="fake-check"></span> Použité</label>
          </div>
        </aside>

        <section class="content">
          <div class="panel" id="authView">
            <h1 class="section-title">Ověřuji přihlášení</h1>
            <p class="muted">Pro vstup do klientského dashboardu budete přesměrováni do Alfares Auth.</p>
            <div class="toolbar"><a class="button primary" href="${hostedLoginUrl}">Přihlásit přes Alfares Auth</a></div>
          </div>

          <div id="clientView" class="hidden">
            <div class="dashboard-head">
              <div class="panel">
                <h1 class="section-title">Aukro klientský dashboard</h1>
                <p class="muted" id="userLine"></p>
                <div class="status-line"><span class="status-dot" id="linkDot"></span><strong id="accountLink">Aukro účet se načítá</strong></div>
                <div class="meta" id="accountMeta"></div>
                <div class="toolbar"><a class="button" id="authProfileLink" href="${authLinks.profileUrl}" target="_blank" rel="noopener">Auth profil</a><a class="button" id="authWalletLink" href="${authLinks.walletUrl}" target="_blank" rel="noopener">Peněženka</a><button id="logout" type="button">Odhlásit</button></div>
              </div>
              <div class="panel">
                <h2 class="section-title">Přehled</h2>
                <div class="metrics" id="metrics"></div>
              </div>
            </div>

            <div class="tabs-bar">
              <button class="tab active" type="button">Vše</button>
              <button class="tab" type="button">Kup teď!</button>
              <button class="tab" type="button">Aukce</button>
              <button class="tab" type="button">🌶 Žhavé aukce</button>
              <button class="tab" type="button">⌖ V mém okolí</button>
              <div class="sort-control"><span class="select-like">Seřadit podle: <b>Relevance</b> ⌄</span><span class="quick-icon">▦</span><span>▥</span></div>
            </div>

            <div class="workspace">
              <div class="panel">
                <h2 class="section-title">Catalog v osobním účtu</h2>
                <div class="quick-grid catalog-action-grid">
                  <a class="quick-tile accent" href="${catalogProductsUrl}" target="_blank" rel="noopener"><span class="quick-icon">▧</span> Spravovat Catalog produkty</a>
                  <a class="quick-tile" href="${catalogNewProductUrl}" target="_blank" rel="noopener"><span class="quick-icon">⊕</span> Přidat Catalog produkt</a>
                  <a class="quick-tile blue" href="${catalogSettingsUrl}" target="_blank" rel="noopener"><span class="quick-icon">⚙</span> Zdroje a resale</a>
                </div>
                <p class="muted">Vlastní produkty, upload a veřejné resale nastavení spravuje Catalog Dashboard pod přihlášeným uživatelem.</p>
              </div>
              <div class="panel">
                <h2 class="section-title">Produkty k publikování na Aukro</h2>
                <div class="toolbar">
                  <input id="search" class="field" type="search" placeholder="Vyhledat produkt v katalogu" />
                  <div class="source-filter" aria-label="Zdroje Catalogu">
                    <label class="source-check"><input type="checkbox" value="own" data-catalog-source checked /> Moje</label>
                    <label class="source-check"><input type="checkbox" value="alfares" data-catalog-source checked /> Alfares</label>
                    <label class="source-check"><input type="checkbox" value="community" data-catalog-source checked /> Komunitní resale</label>
                  </div>
                  <button id="loadProducts" type="button">Načíst produkty</button>
                </div>
                <div class="bulk-bar">
                  <div><strong id="selectedCount">0 vybráno</strong><div class="muted">Zobrazujeme pouze produkty, které nejsou aktivně publikované v tomto Aukro účtu.</div></div>
                  <div class="toolbar"><button id="selectPageProducts" type="button">Vybrat stránku</button><button id="clearSelectedProducts" type="button">Zrušit výběr</button><button class="primary" id="bulkPublishProducts" type="button">Publikovat vybrané</button></div>
                </div>
                <div class="message" id="catalogMessage"></div>
                <div class="catalog-preview hidden" id="catalogPreview">
                  <div class="catalog-preview-head">
                    <div>
                      <h3 class="catalog-preview-title" id="catalogPreviewTitle"></h3>
                      <div class="meta" id="catalogPreviewMeta"></div>
                    </div>
                    <span class="pill" id="catalogPreviewFormat"></span>
                  </div>
                  <div class="catalog-preview-text" id="catalogPreviewText"></div>
                  <div class="message" id="catalogPreviewWarnings"></div>
                  <div class="toolbar"><button class="primary" id="confirmDraft" type="button">Vytvorit draft</button><button id="cancelPreview" type="button">Zavrit preview</button></div>
                </div>
                <div class="compact-product-grid" id="products"></div>
                <div class="pager" id="catalogPager"></div>
              </div>
              <div class="panel">
                <h2 class="section-title">Produkty na Aukro účtu</h2>
                <div class="toolbar"><input id="offerSearch" class="field" type="search" placeholder="Vyhledat v Aukro produktech" /><button id="loadOfferProducts" type="button">Načíst produkty</button></div>
                <div class="message" id="auctionProductsMessage"></div>
                <div class="compact-product-grid" id="auctionProducts"></div>
                <div class="pager" id="auctionProductsPager"></div>
              </div>
              <div class="panel">
                <div class="toolbar"><h2 class="section-title">Produkty prodané na Aukro</h2><button id="refreshOrders" type="button">Obnovit Orders</button></div>
                <div class="message" id="ordersMessage"></div>
                <div class="compact-product-grid" id="orders"></div>
              </div>
              <div class="panel">
                <h2 class="section-title">Aukro nabídky a drafty</h2>
                <div class="message" id="offersMessage"></div>
                <div class="list" id="offers"></div>
              </div>
            </div>

            <div class="admin panel" id="adminView">
              <h2 class="section-title">Admin sekce Alfares služeb</h2>
              <p class="muted">Viditelné pouze pro správce Aukro služby.</p>
              <div id="adminOrderStats"></div>
              <div class="services" id="services"></div>
            </div>
          </div>
        </section>
      </div>
    </section>
  </main>
  <script>
    const state = {
      token: localStorage.getItem('aukroAccessToken') || '',
      me: null,
      dashboard: null,
      pendingProductId: '',
      catalogPage: 1,
      catalogLimit: 12,
      catalogItems: [],
      catalogSources: ['own', 'alfares', 'community'],
      selectedProductIds: new Set(),
      offerPage: 1,
      offerLimit: 12,
      offerItems: [],
      dashboardPollTimer: null,
      dashboardPollInFlight: false,
      dashboardPollMs: 30000,
    };
    const $ = (id) => document.getElementById(id);
    const page = document.body.dataset.page;
    const hostedLoginUrl = '${hostedLoginUrl}';
    const hostedProfileUrl = '${authLinks.profileUrl}';
    const hostedWalletUrl = '${authLinks.walletUrl}';
    const api = async (url, options = {}) => {
      const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
      if (state.token) headers.Authorization = 'Bearer ' + state.token;
      const response = await fetch(url, { ...options, headers });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = Array.isArray(data.message) ? data.message.join(', ') : (data.message || data.error?.message || 'Požadavek selhal');
        const error = new Error(message);
        error.status = response.status;
        error.blockers = Array.isArray(data.blockers) ? data.blockers : (Array.isArray(data.error?.blockers) ? data.error.blockers : []);
        throw error;
      }
      return data;
    };
    const provisionCatalog = async () => {
      const result = await api('/aukro/ui/catalog/provision', { method: 'POST', body: JSON.stringify({}) });
      state.catalogProvisioned = true;
      return result;
    };
    const consumeAuthFragment = () => {
      const fragment = new URLSearchParams(location.hash.startsWith('#') ? location.hash.slice(1) : '');
      const accessToken = fragment.get('access_token');
      const returnedState = fragment.get('state');
      if (!accessToken) return false;
      if (returnedState && returnedState !== 'aukro-dashboard') {
        history.replaceState(null, '', location.pathname + location.search);
        return false;
      }
      state.token = accessToken;
      localStorage.setItem('aukroAccessToken', accessToken);
      history.replaceState(null, '', location.pathname + location.search);
      return true;
    };
    const stopDashboardPolling = () => {
      if (state.dashboardPollTimer) window.clearInterval(state.dashboardPollTimer);
      state.dashboardPollTimer = null;
    };
    const redirectToAuth = () => {
      stopDashboardPolling();
      state.token = '';
      localStorage.removeItem('aukroAccessToken');
      location.replace(hostedLoginUrl);
    };
    const logout = () => {
      stopDashboardPolling();
      state.token = '';
      localStorage.removeItem('aukroAccessToken');
      location.replace('/');
    };
    const updateHeaderAuth = (dashboard = null) => {
      const accountLink = $('accountLoginLink');
      const accountLabel = $('accountNavLabel');
      const headerLogout = $('headerLogout');
      if (!accountLink || !accountLabel || !headerLogout) return;
      if (state.token) {
        accountLink.href = '/dashboard';
        accountLink.setAttribute('aria-label', 'Můj účet - dashboard');
        const email = dashboard?.user?.email || dashboard?.user?.id || '';
        accountLabel.innerHTML = 'Můj účet<br />' + escapeHtml(email || 'Přihlášen');
        accountLink.classList.add('is-authenticated');
        headerLogout.classList.remove('hidden');
      } else {
        accountLink.href = hostedLoginUrl;
        accountLink.setAttribute('aria-label', 'Můj účet - přihlásit');
        accountLabel.innerHTML = 'Můj účet<br />Přihlásit';
        accountLink.classList.remove('is-authenticated');
        headerLogout.classList.add('hidden');
      }
    };
    const showDashboardError = (error) => {
      $('authView').classList.remove('hidden');
      $('clientView').classList.add('hidden');
      $('authView').innerHTML = '<div class="empty-state"><h1 class="section-title">Dashboard se nepodařilo načíst</h1><p class="muted">Přihlášení proběhlo, ale server vrátil chybu dashboardu.</p><p class="message warn">' + escapeHtml(error.message || 'Neočekávaná chyba serveru.') + '</p><div class="toolbar"><button id="retryDashboard" type="button">Zkusit znovu</button><button id="logoutAfterError" type="button">Odhlásit</button></div></div>';
      $('retryDashboard').addEventListener('click', () => showClient().catch(handleDashboardError));
      $('logoutAfterError').addEventListener('click', logout);
    };
    const handleDashboardError = (error) => {
      if (error.status === 401 || error.status === 403) redirectToAuth();
      else showDashboardError(error);
    };
    const refreshDashboard = async ({ silent = false } = {}) => {
      if (state.dashboardPollInFlight) return state.dashboard;
      state.dashboardPollInFlight = true;
      try {
        const dashboard = await api('/aukro/ui/dashboard');
        state.dashboard = dashboard;
        state.me = dashboard;
        updateHeaderAuth(dashboard);
        renderDashboard(dashboard);
        return dashboard;
      } catch (error) {
        if (!silent) throw error;
        if (error.status === 401 || error.status === 403) redirectToAuth();
        else if ($('ordersMessage')) {
          $('ordersMessage').textContent = 'Automatická aktualizace Orders stavu selhala: ' + (error.message || 'neznámá chyba');
        }
        return state.dashboard;
      } finally {
        state.dashboardPollInFlight = false;
      }
    };
    const startDashboardPolling = () => {
      stopDashboardPolling();
      state.dashboardPollTimer = window.setInterval(() => {
        if (document.hidden || !state.token) return;
        refreshDashboard({ silent: true });
      }, state.dashboardPollMs);
    };
    const showClient = async () => {
      let catalogProvisionError = null;
      try {
        await provisionCatalog();
      } catch (error) {
        catalogProvisionError = error;
      }
      const dashboard = await refreshDashboard();
      $('authView').classList.add('hidden');
      $('clientView').classList.remove('hidden');
      startDashboardPolling();
      if (catalogProvisionError && $('catalogMessage')) {
        $('catalogMessage').className = 'message warn';
        $('catalogMessage').textContent = catalogProvisionError.message || 'Catalog provisioning se nepodarilo dokoncit.';
      }
      loadProducts().catch((error) => {
        $('catalogMessage').className = 'message warn';
        $('catalogMessage').textContent = error.message || 'Produkty se nepodařilo načíst.';
      });
      loadOfferProducts().catch((error) => {
        $('auctionProductsMessage').className = 'message warn';
        $('auctionProductsMessage').textContent = error.message || 'Aukro produkty se nepodařilo načíst.';
      });
      if (dashboard.isAukroAdmin) {
        loadAdmin().catch(() => {
          $('adminView').style.display = 'none';
        });
      }
    };
    const renderDashboard = (dashboard) => {
      const account = dashboard.account || {};
      const summary = dashboard.summary || {};
      $('userLine').textContent = 'Přihlášen: ' + (dashboard.user.email || dashboard.user.id) + ' | Klientský účet: ' + (account.name || account.email || account.id);
      $('linkDot').classList.toggle('ok', Boolean(account.isLinkedToAukro));
      $('accountLink').textContent = account.isLinkedToAukro ? 'Aukro účet je připojený' : 'Aukro API účet zatím není připojený';
      $('accountMeta').innerHTML = '<span class="pill">' + escapeHtml(account.email || 'email nezadán') + '</span><span class="pill">' + (account.isActive ? 'aktivní' : 'neaktivní') + '</span><span class="pill">ID ' + escapeHtml(account.id || '-') + '</span>';
      const authLinks = dashboard.authLinks || {};
      $('authProfileLink').href = authLinks.profileUrl || hostedProfileUrl;
      $('authWalletLink').href = authLinks.walletUrl || hostedWalletUrl;
      $('metrics').innerHTML = metric(summary.offersTotal || 0, 'nabídky celkem') + metric(summary.activeOffers || 0, 'aktivní nabídky') + metric(summary.drafts || 0, 'drafty') + metric(summary.blockedDrafts || 0, 'blokované drafty') + metric(summary.ordersTotal || 0, 'objednávky') + metric(summary.ordersWithCentralStatus || 0, 'Orders stav načten') + metric(summary.staleOrders || 0, 'unknown/stale Orders') + metric(summary.unforwardedOrders || 0, 'nepředané objednávky');
      renderOffers(dashboard.offers || []);
      renderOrders(dashboard.orders || []);
    };
    const metric = (value, label) => '<div class="metric"><strong>' + escapeHtml(value) + '</strong><span>' + escapeHtml(label) + '</span></div>';
    const renderOffers = (offers) => {
      $('offersMessage').textContent = offers.length ? 'Našli jsme vám celkem ' + offers.length + ' nabídek.' : 'Zatím nemáte žádné Aukro nabídky ani drafty.';
      $('offers').innerHTML = offers.map((offer) => {
        const stateLabel = offer.aukroOfferId ? 'Aukro ID: ' + offer.aukroOfferId : (offer.draftStatus ? 'Draft: ' + offer.draftStatus : 'lokální záznam');
        const blockers = offer.policyReasonCodes && offer.policyReasonCodes.length ? '<span class="pill">blokery: ' + escapeHtml(offer.policyReasonCodes.join(', ')) + '</span>' : '';
        return '<article class="listing-row"><div class="listing-thumb">A</div><div class="listing-main"><span class="condition">' + (offer.isActive ? 'Aktivní' : 'Draft') + '</span><b>' + escapeHtml(offer.title || 'Nabídka bez názvu') + '</b><div class="meta"><span class="pill">' + escapeHtml(stateLabel) + '</span><span class="pill">sklad ' + escapeHtml(offer.stockQuantity ?? 0) + '</span>' + blockers + '</div></div><div class="listing-side"><span class="price">' + money(offer.price) + '</span><span class="muted">' + (offer.isActive ? 'publikováno' : 'čeká na kontrolu') + '</span></div></article>';
      }).join('');
    };
    const orderMeta = (order) => {
      if (order.stale) return order.statusMessage || 'unknown/stale Orders';
      const status = order.status && order.status !== order.lifecycleStage ? ' / ' + order.status : '';
      return (order.lifecycleLabel || order.lifecycleStage || 'Orders') + status;
    };
    const orderTags = (order) => {
      const tags = [];
      if (order.forwarded === false) tags.push('nepředáno');
      if (order.centralOrderId) tags.push('Orders ID ' + order.centralOrderId);
      if (order.lifecycleStage && order.lifecycleStage !== 'unknown') tags.push('lifecycle ' + order.lifecycleStage);
      if (order.status && order.status !== 'unknown') tags.push('status ' + order.status);
      if (order.stale) tags.push(order.statusMessage || 'unknown/stale');
      return tags;
    };
    const renderOrders = (orders) => {
      const soldProducts = orders.flatMap((order) => {
        const items = Array.isArray(order.items) ? order.items : [];
        const tags = orderTags(order);
        const meta = orderMeta(order);
        if (items.length) {
          return items.map((item) => ({
            title: item.title || order.title || ('Objednávka ' + (order.aukroOrderId || order.id)),
            imageUrl: item.imageUrl || order.imageUrl || '',
            meta,
            tags,
          }));
        }
        return [{
          title: order.title || ('Objednávka ' + (order.aukroOrderId || order.id)),
          imageUrl: order.imageUrl || '',
          meta,
          tags,
        }];
      });
      const staleCount = orders.filter((order) => order.stale).length;
      $('ordersMessage').textContent = soldProducts.length ? 'Prodáno na Aukro: ' + soldProducts.length + ' produktů.' + (staleCount ? ' Unknown/stale Orders stav: ' + staleCount + '.' : '') : 'Zatím nejsou uložené žádné prodané produkty z Aukro.';
      $('orders').innerHTML = soldProducts.map((item) => compactProductCard(item, false)).join('');
    };
    const updateSelectedCount = () => {
      $('selectedCount').textContent = state.selectedProductIds.size + ' vybráno';
      document.querySelectorAll('[data-select-product]').forEach((input) => {
        input.checked = state.selectedProductIds.has(input.dataset.selectProduct);
        const card = input.closest('.compact-product-card');
        if (card) card.classList.toggle('is-selected', input.checked);
      });
    };
    const selectedCatalogSources = () => Array.from(document.querySelectorAll('[data-catalog-source]:checked'))
      .map((input) => input.value)
      .filter(Boolean);
    const catalogSourceLabel = (sources) => {
      const labels = { own: 'moje', alfares: 'Alfares', community: 'komunitní resale' };
      return (sources || []).map((source) => labels[source] || source).join(', ');
    };
    const loadProducts = async () => {
      $('catalogMessage').className = 'message';
      $('catalogMessage').textContent = 'Načítám produkty z catalog-microservice...';
      const search = $('search').value.trim();
      const sources = selectedCatalogSources();
      if (!sources.length) {
        state.catalogItems = [];
        $('products').innerHTML = '';
        $('catalogPager').innerHTML = '';
        $('catalogMessage').className = 'message warn';
        $('catalogMessage').textContent = 'Vyberte alespoň jeden Catalog zdroj.';
        updateSelectedCount();
        return;
      }
      state.catalogSources = sources;
      const sourceQuery = '&catalogSources=' + encodeURIComponent(sources.join(','));
      const result = await api('/aukro/ui/catalog/products?limit=' + state.catalogLimit + '&page=' + state.catalogPage + sourceQuery + (search ? '&search=' + encodeURIComponent(search) : ''));
      const items = result.items || [];
      items.filter((item) => item.catalogQualityCanActivate === false).forEach((item) => state.selectedProductIds.delete(String(item.id)));
      state.catalogItems = items;
      $('catalogMessage').className = result.scanTruncated ? 'message warn' : 'message';
      $('catalogMessage').textContent = items.length
        ? 'Effective Catalog scope (' + catalogSourceLabel(result.catalogSources || sources) + '): ' + result.total + ' produktů. Stránka ' + result.page + ' z ' + result.totalPages + '.'
        : 'V effective Catalog scope nejsou žádné nepublikované produkty pro vybrané zdroje.';
      $('products').innerHTML = items.map((item) => productCard(item)).join('');
      renderPager('catalogPager', result.page, result.totalPages, (nextPage) => {
        state.catalogPage = nextPage;
        loadProducts().catch((error) => {
          $('catalogMessage').className = 'message warn';
          $('catalogMessage').textContent = error.message;
        });
      });
      updateSelectedCount();
      document.querySelectorAll('[data-preview]').forEach((button) => button.addEventListener('click', () => previewProduct(button.dataset.preview, button)));
      document.querySelectorAll('[data-resale-toggle]').forEach((input) => input.addEventListener('change', () => setProductResaleEnabled(input.dataset.resaleToggle, input.checked, input)));
      document.querySelectorAll('[data-select-product]').forEach((input) => input.addEventListener('change', () => {
        if (input.checked) state.selectedProductIds.add(input.dataset.selectProduct);
        else state.selectedProductIds.delete(input.dataset.selectProduct);
        updateSelectedCount();
      }));
    };
    const loadOfferProducts = async () => {
      $('auctionProductsMessage').className = 'message';
      $('auctionProductsMessage').textContent = 'Načítám produkty z Aukro účtu...';
      const search = $('offerSearch').value.trim();
      const result = await api('/aukro/ui/offers?status=published&limit=' + state.offerLimit + '&page=' + state.offerPage + (search ? '&search=' + encodeURIComponent(search) : ''));
      const items = result.items || [];
      state.offerItems = items;
      $('auctionProductsMessage').textContent = items.length
        ? 'Na Aukro účtu: ' + result.total + ' produktů. Stránka ' + result.page + ' z ' + result.totalPages + '.'
        : 'Zatím tu nejsou žádné aktivní produkty z Aukro účtu.';
      $('auctionProducts').innerHTML = items.map((item) => compactProductCard({
        id: item.id,
        title: item.title || 'Nabídka bez názvu',
        imageUrl: item.imageUrl || '',
        meta: item.aukroOfferId ? 'Aukro ID ' + item.aukroOfferId : 'aktivní lokální záznam',
      }, false)).join('');
      renderPager('auctionProductsPager', result.page, result.totalPages, (nextPage) => {
        state.offerPage = nextPage;
        loadOfferProducts().catch((error) => {
          $('auctionProductsMessage').className = 'message warn';
          $('auctionProductsMessage').textContent = error.message;
        });
      });
    };
    const productCard = (item) => {
      return compactProductCard({
        id: item.id,
        title: item.title || item.name || 'Produkt bez názvu',
        imageUrl: imageUrlFor(item),
        meta: item.draftStatus ? 'draft ' + item.draftStatus : 'nepublikováno',
        tags: [
          item.catalogScope ? 'scope ' + item.catalogScope : '',
          item.sourceLabel || '',
          item.accessLabel || '',
          item.catalogQualityCanActivate === false ? 'quality blocked' : 'quality ok',
          ...((item.catalogQualityBlockers || []).slice(0, 2).map((blocker) => 'blocker ' + blocker)),
        ].filter(Boolean),
        selectable: item.selectable !== false,
        catalogQualityBlockers: item.catalogQualityBlockers || [],
        resaleEnabled: item.resaleEnabled === true,
        resaleMutationAllowed: item.resaleMutationAllowed !== false,
        resaleMutationHint: item.resaleMutationHint || '',
      }, true);
    };
    const compactProductCard = (item, publishable) => {
      const title = item.title || 'Produkt bez názvu';
      const initial = String(title).trim().charAt(0).toUpperCase() || 'A';
      const imageUrl = item.imageUrl || imageUrlFor(item);
      const media = '<span class="compact-product-media">' + (imageUrl ? '<img src="' + escapeHtml(imageUrl) + '" alt="' + escapeHtml(title) + '" loading="lazy" />' : '<span class="photo-placeholder">' + escapeHtml(initial) + '</span>') + '</span>';
      const tags = Array.isArray(item.tags) && item.tags.length ? '<span class="compact-product-tags">' + item.tags.map((tag) => '<span class="compact-product-tag">' + escapeHtml(tag) + '</span>').join('') + '</span>' : '';
      const body = media + '<span class="compact-product-title">' + escapeHtml(title) + '</span>' + (item.meta ? '<span class="compact-product-meta">' + escapeHtml(item.meta) + '</span>' : '') + tags;
      if (publishable) {
        const selectable = item.selectable !== false;
        const checked = selectable && state.selectedProductIds.has(String(item.id)) ? ' checked' : '';
        const resaleChecked = item.resaleEnabled ? ' checked' : '';
        const resaleDisabled = item.resaleMutationAllowed === false ? ' disabled' : '';
        const resaleHint = item.resaleMutationHint ? ' title="' + escapeHtml(item.resaleMutationHint) + '"' : '';
        const resaleClass = 'resale-toggle' + (item.resaleEnabled ? ' is-on' : '') + (item.resaleMutationAllowed === false ? ' is-disabled' : '');
        const resaleToggle = '<label class="' + resaleClass + '"' + resaleHint + '><input type="checkbox" data-resale-toggle="' + escapeHtml(item.id) + '"' + resaleChecked + resaleDisabled + ' aria-label="Resale produkt" /> Resale</label>';
        const selectDisabled = selectable ? '' : ' disabled';
        const blockedTitle = !selectable && item.catalogQualityBlockers?.length ? ' title="Catalog blokery: ' + escapeHtml(item.catalogQualityBlockers.join(', ')) + '"' : '';
        return '<article class="compact-product-card' + (checked ? ' is-selected' : '') + (!selectable ? ' is-disabled' : '') + '"' + blockedTitle + '><input class="product-select" type="checkbox" data-select-product="' + escapeHtml(item.id) + '"' + checked + selectDisabled + ' aria-label="Vybrat produkt" />' + body + resaleToggle + '<button class="card-preview-button" type="button" data-preview="' + escapeHtml(item.id) + '">Preview</button></article>';
      }
      return '<article class="compact-product-card">' + body + '</article>';
    };
    const renderPager = (targetId, pageValue, totalPages, onPage) => {
      const pageNumber = Number(pageValue || 1);
      const pages = Math.max(Number(totalPages || 1), 1);
      const target = $(targetId);
      target.innerHTML = '<button type="button" data-page-prev ' + (pageNumber <= 1 ? 'disabled' : '') + '>Předchozí</button><span class="pill">Stránka ' + pageNumber + ' / ' + pages + '</span><button type="button" data-page-next ' + (pageNumber >= pages ? 'disabled' : '') + '>Další</button>';
      const prev = target.querySelector('[data-page-prev]');
      const next = target.querySelector('[data-page-next]');
      if (prev) prev.addEventListener('click', () => onPage(Math.max(pageNumber - 1, 1)));
      if (next) next.addEventListener('click', () => onPage(Math.min(pageNumber + 1, pages)));
    };
    const imageUrlFor = (source) => {
      if (!source) return '';
      if (typeof source === 'string') return source.trim();
      if (typeof source !== 'object') return '';
      const fromValue = (value) => {
        if (!value) return '';
        if (typeof value === 'string') return value.trim();
        if (typeof value !== 'object') return '';
        return value.imageUrl || value.thumbnailUrl || value.photoUrl || value.pictureUrl || value.mainImageUrl || value.primaryImageUrl || value.previewUrl || value.url || value.src || value.publicUrl || '';
      };
      const direct = fromValue(source);
      if (direct) return direct;
      for (const nested of [source.image, source.thumbnail, source.photo, source.picture, source.mainImage, source.primaryImage]) {
        const url = imageUrlFor(nested);
        if (url) return url;
      }
      for (const collection of [source.images, source.photos, source.media, source.pictures, source.assets, source.gallery]) {
        if (!Array.isArray(collection)) continue;
        for (const item of collection) {
          const url = imageUrlFor(item);
          if (url) return url;
        }
      }
      return '';
    };
    const catalogPreviewReview = (preview) => {
      const fields = Array.isArray(preview?.fields) ? preview.fields : [];
      const propagation = preview?.propagation || {};
      const profile = preview?.profile || {};
      const manualOverrides = profile.manualOverrides || preview?.manualOverrides || {};
      const staleManualFields = [
        ...(Array.isArray(propagation.staleManualFields) ? propagation.staleManualFields : []),
        ...(Array.isArray(profile.staleManualFields) ? profile.staleManualFields : []),
        ...(Array.isArray(preview?.staleManualFields) ? preview.staleManualFields : []),
        ...fields.filter((field) => field?.manualOverride && field?.stale).map((field) => field.key || field.name || field.field).filter(Boolean),
      ].filter(Boolean);
      const hasManualOverride = Boolean(
        preview?.manualOverride ||
        preview?.hasManualOverrides ||
        profile.hasManualOverrides ||
        Object.keys(manualOverrides).length ||
        fields.some((field) => field?.manualOverride)
      );
      const stale = Boolean(
        preview?.stale ||
        preview?.sourceChanged ||
        propagation.status === 'manual_review_required' ||
        staleManualFields.length ||
        fields.some((field) => field?.stale)
      );
      const requiresManualReview = Boolean(
        preview?.requiresManualReview ||
        propagation.status === 'manual_review_required' ||
        staleManualFields.length ||
        (hasManualOverride && stale)
      );
      return { hasManualOverride, stale, requiresManualReview, staleManualFields: Array.from(new Set(staleManualFields)) };
    };
    const catalogPreviewReviewMarkup = (preview) => {
      const review = catalogPreviewReview(preview);
      const badges = [
        review.hasManualOverride ? '<span class="catalog-review-badge manual">Manual override</span>' : '',
        review.stale ? '<span class="catalog-review-badge stale">Source changed</span>' : '',
        review.requiresManualReview ? '<span class="catalog-review-badge review">Review required</span>' : '',
      ].filter(Boolean).join('');
      const warning = review.requiresManualReview
        ? '<div class="message warn">Catalog source changed after manual Aukro edits. Review these fields before publishing: ' + escapeHtml(review.staleManualFields.length ? review.staleManualFields.join(', ') : 'manual marketplace fields') + '.</div>'
        : '';
      return (badges ? '<div class="catalog-review-badges">' + badges + '</div>' : '') + warning;
    };
    const renderCatalogPreview = (preview) => {
      state.pendingProductId = preview.productId || state.pendingProductId;
      $('catalogPreview').classList.remove('hidden');
      const content = preview.content || {};
      const source = preview.source || {};
      const warnings = Array.isArray(preview.warnings) ? preview.warnings : [];
      $('catalogPreviewTitle').textContent = content.title || 'Produkt bez nazvu';
      $('catalogPreviewFormat').textContent = preview.format || 'plain-text';
      $('catalogPreviewText').textContent = content.plainText || 'Bez textu preview.';
      $('catalogPreviewMeta').innerHTML = '<span class="pill">' + escapeHtml(preview.marketplace || 'aukro') + '</span>' +
        (source.canonicalDocumentVersion ? '<span class="pill">verze ' + escapeHtml(source.canonicalDocumentVersion) + '</span>' : '') +
        (source.sourceHash ? '<span class="pill">hash ' + escapeHtml(source.sourceHash) + '</span>' : '') +
        (source.generatedAt ? '<span class="pill">' + escapeHtml(source.generatedAt) + '</span>' : '') +
        (source.legacyDescriptionFallback ? '<span class="pill">fallback</span>' : '') +
        catalogPreviewReviewMarkup(preview);
      $('catalogPreviewWarnings').className = warnings.length ? 'message warn' : 'message ok';
      $('catalogPreviewWarnings').textContent = warnings.length ? 'Varovani: ' + warnings.join(', ') : 'Canonical content preview je pripraveny pro draft.';
    };
    const previewProduct = async (productId, button) => {
      state.pendingProductId = productId;
      button.disabled = true;
      $('catalogMessage').className = 'message';
      $('catalogMessage').textContent = 'Nacitam Aukro content preview...';
      try {
        const preview = await api('/aukro/ui/catalog/products/' + encodeURIComponent(productId) + '/content-preview');
        preview.productId = productId;
        renderCatalogPreview(preview);
        $('catalogMessage').className = preview.success ? 'message ok' : 'message warn';
        $('catalogMessage').textContent = preview.success ? 'Preview je pripravene pred vytvorenim draftu.' : 'Canonical preview neni dostupne; zobrazen je katalogovy fallback.';
      } catch (error) {
        $('catalogMessage').className = 'message warn';
        $('catalogMessage').textContent = error.message + (error.blockers?.length ? ' Blokery: ' + error.blockers.join(', ') : '');
      } finally { button.disabled = false; }
    };
    const setProductResaleEnabled = async (productId, resaleEnabled, input) => {
      input.disabled = true;
      $('catalogMessage').className = 'message';
      $('catalogMessage').textContent = resaleEnabled ? 'Zapinam resale v Catalogu...' : 'Vypinam resale v Catalogu...';
      try {
        await api('/aukro/ui/catalog/products/' + encodeURIComponent(productId) + '/resale-enabled', { method: 'POST', body: JSON.stringify({ resaleEnabled }) });
        $('catalogMessage').className = 'message ok';
        $('catalogMessage').textContent = resaleEnabled ? 'Resale je zapnute pro tento Catalog produkt.' : 'Resale je vypnute pro tento Catalog produkt.';
        await loadProducts();
      } catch (error) {
        input.checked = !resaleEnabled;
        $('catalogMessage').className = 'message warn';
        $('catalogMessage').textContent = error.message;
        input.disabled = false;
      }
    };
    const publishProduct = async (productId, button) => {
      const candidate = (state.catalogItems || []).find((item) => String(item.id) === String(productId));
      if (candidate && candidate.catalogQualityCanActivate === false) {
        $('catalogMessage').className = 'message warn';
        $('catalogMessage').textContent = 'Catalog kvalita blokuje Aukro draft: ' + ((candidate.catalogQualityBlockers || []).join(', ') || 'neznamy bloker');
        return;
      }
      button.disabled = true;
      $('catalogMessage').textContent = 'Vytvářím Aukro draft...';
      try {
        const result = await api('/aukro/ui/publish', { method: 'POST', body: JSON.stringify({ productId }) });
        $('catalogMessage').className = 'message ok';
        $('catalogMessage').textContent = 'Aukro draft ' + (result.action === 'reused' ? 'byl znovu použit' : 'byl vytvořen') + '. Stav: ' + result.draftStatus + '. ' + (result.blockers?.length ? 'Blokery: ' + result.blockers.join(', ') : 'Bez blokerů.');
        $('catalogPreview').classList.add('hidden');
        state.pendingProductId = '';
        await refreshDashboard({ silent: true });
        await loadProducts();
        await loadOfferProducts();
      } catch (error) {
        $('catalogMessage').className = 'message warn';
        $('catalogMessage').textContent = error.message + (error.blockers?.length ? ' Blokery: ' + error.blockers.join(', ') : '');
      } finally { button.disabled = false; }
    };
    const bulkPublishSelected = async () => {
      const productIds = Array.from(state.selectedProductIds);
      if (!productIds.length) {
        $('catalogMessage').className = 'message warn';
        $('catalogMessage').textContent = 'Vyberte alespoň jeden produkt.';
        return;
      }
      const button = $('bulkPublishProducts');
      button.disabled = true;
      $('catalogMessage').className = 'message';
      $('catalogMessage').textContent = 'Zpracovávám ' + productIds.length + ' produktů...';
      try {
        const result = await api('/aukro/ui/publish/bulk', { method: 'POST', body: JSON.stringify({ productIds }) });
        const blocked = (result.results || []).filter((item) => item.blockers && item.blockers.length).length;
        $('catalogMessage').className = result.failed ? 'message warn' : 'message ok';
        $('catalogMessage').textContent = 'Hotovo: ' + result.created + ' z ' + result.requested + ' produktů. Publish intent je record-only; live Aukro mutace zatím neběží.' + (blocked ? ' Blokery u ' + blocked + ' položek.' : '');
        state.selectedProductIds.clear();
        updateSelectedCount();
        await refreshDashboard({ silent: true });
        await loadProducts();
        await loadOfferProducts();
      } catch (error) {
        $('catalogMessage').className = 'message warn';
        $('catalogMessage').textContent = error.message;
      } finally { button.disabled = false; }
    };
    const renderAdminBreakdown = (title, values) => {
      const entries = Object.entries(values || {});
      const pills = entries.length ? entries.map(([key, value]) => '<span class="pill">' + escapeHtml(key) + ': ' + escapeHtml(value) + '</span>').join('') : '<span class="pill">žádná data</span>';
      return '<div class="service"><b>' + escapeHtml(title) + '</b><div class="meta">' + pills + '</div></div>';
    };
    const renderAdminOrderStats = (stats = {}) => {
      const metrics = '<div class="metrics">' + metric(stats.totalOrders || 0, 'objednávky ve vzorku') + metric(stats.forwardedOrders || 0, 'předáno Orders') + metric(stats.unforwardedOrders || 0, 'nepředáno') + metric(stats.ordersWithCentralStatus || 0, 'Orders stav načten') + metric(stats.staleOrders || 0, 'unknown/stale') + '</div>';
      const note = '<p class="muted">Agregace posledních ' + escapeHtml(stats.sampledOrders || 0) + ' z max. ' + escapeHtml(stats.sampleLimit || 0) + ' lokálních Aukro objednávek bez zákaznických detailů.</p>';
      const breakdowns = '<div class="services">' + renderAdminBreakdown('Orders read status', stats.byOrdersReadStatus) + renderAdminBreakdown('Order status', stats.byOrderStatus) + renderAdminBreakdown('Lifecycle', stats.byLifecycleStage) + renderAdminBreakdown('Platba', stats.byPaymentStatus) + renderAdminBreakdown('Fulfillment', stats.byFulfillmentStatus) + renderAdminBreakdown('Doručení', stats.byDeliveryStatus) + '</div>';
      return note + metrics + breakdowns;
    };
    const loadAdmin = async () => {
      const result = await api('/aukro/ui/admin/services');
      $('adminView').style.display = 'block';
      $('adminOrderStats').innerHTML = renderAdminOrderStats(result.orderStats || {});
      $('services').innerHTML = result.services.map((service) => '<div class="service"><b>' + escapeHtml(service.name) + '</b><p class="muted">' + escapeHtml(service.role) + '</p><div class="meta"><span class="pill">' + escapeHtml(service.owner) + '</span><span class="pill">' + escapeHtml(service.route) + '</span></div></div>').join('');
    };
    const money = (value, currency = 'CZK') => value === null || value === undefined ? 'cena nezadaná' : new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: currency || 'CZK' }).format(Number(value));
    const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    updateHeaderAuth();
    $('headerLogout').addEventListener('click', logout);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && page === 'dashboard' && state.token) refreshDashboard({ silent: true });
    });
    window.addEventListener('pagehide', stopDashboardPolling);
    if (page === 'dashboard') {
      consumeAuthFragment();
      updateHeaderAuth();
      $('refreshOrders')?.addEventListener('click', async () => {
        const button = $('refreshOrders');
        button.disabled = true;
        $('ordersMessage').textContent = 'Načítá se čerstvý Orders stav...';
        try { await refreshDashboard({ silent: true }); }
        finally { button.disabled = false; }
      });
      $('loadProducts').addEventListener('click', () => {
        state.catalogPage = 1;
        loadProducts().catch((error) => {
          $('catalogMessage').className = 'message warn';
          $('catalogMessage').textContent = error.message;
        });
      });
      document.querySelectorAll('[data-catalog-source]').forEach((input) => {
        input.addEventListener('change', () => {
          state.catalogPage = 1;
          loadProducts().catch((error) => {
            $('catalogMessage').className = 'message warn';
            $('catalogMessage').textContent = error.message;
          });
        });
      });
      $('loadOfferProducts').addEventListener('click', () => {
        state.offerPage = 1;
        loadOfferProducts().catch((error) => {
          $('auctionProductsMessage').className = 'message warn';
          $('auctionProductsMessage').textContent = error.message;
        });
      });
      $('selectPageProducts').addEventListener('click', () => {
        state.catalogItems.forEach((item) => state.selectedProductIds.add(String(item.id)));
        updateSelectedCount();
      });
      $('clearSelectedProducts').addEventListener('click', () => {
        state.selectedProductIds.clear();
        updateSelectedCount();
      });
      $('bulkPublishProducts').addEventListener('click', bulkPublishSelected);
      $('confirmDraft').addEventListener('click', () => {
        if (state.pendingProductId) publishProduct(state.pendingProductId, $('confirmDraft'));
      });
      $('cancelPreview').addEventListener('click', () => {
        state.pendingProductId = '';
        $('catalogPreview').classList.add('hidden');
      });
      $('logout').addEventListener('click', logout);
      if (state.token) showClient().catch(handleDashboardError);
      else redirectToAuth();
    }
  </script>
  <script type="module">
    import { mountConsentBanner } from '/ui/consent-banner.js';
    mountConsentBanner({
      version: 'alfares-consent-v1',
      policyUrl: 'https://alfares.cz/cs/legal/cookie-policy',
      text: {
        title: 'Cookies a úložiště',
        disclosureBody: 'Ukládáme jen údaje nezbytné pro přihlášení a chod služby. Nepoužíváme analytické ani marketingové cookies.',
        acknowledge: 'Rozumím',
        policyLabel: 'Zásady cookies',
      },
    });
  </script>
</body>
</html>`;
  }
}
