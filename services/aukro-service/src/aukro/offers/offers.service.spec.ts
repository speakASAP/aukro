import { strict as assert } from 'assert';

process.env.LOGGING_SERVICE_URL = process.env.LOGGING_SERVICE_URL || 'http://logging-microservice:3209';

const { OffersService } = require('./offers.service');
const { OfferPolicyService } = require('./policy/offer-policy.service');

const fresh = new Date().toISOString();

function createHarness(overrides: { stock?: number; warehouseError?: Error; media?: any[]; pricing?: any; product?: any; contentPreview?: any; qualityReadiness?: any; qualityError?: Error; existingOffer?: any; catalogProducts?: any[]; aiResult?: any; loggingResult?: any } = {}) {
  const account = { id: '11111111-1111-1111-1111-111111111111', isActive: true };
  const product = overrides.product || {
    id: '22222222-2222-2222-2222-222222222222',
    title: 'Synthetic Aukro Product',
    description: 'Synthetic description',
    isActive: true,
    categoryId: 'cat-1',
    attributes: { color: 'black' },
  };
  const pricing = overrides.pricing === undefined ? { basePrice: 199, currency: 'CZK', marginPercent: 20 } : overrides.pricing;
  const media = overrides.media === undefined ? [{ id: 'media-1' }] : overrides.media;
  const stock = overrides.stock === undefined ? 3 : overrides.stock;
  const qualityReadiness = overrides.qualityReadiness === undefined ? {
    productId: product.id,
    sku: product.sku,
    lifecycle: 'active',
    sellable: true,
    publishable: true,
    issues: [],
  } : overrides.qualityReadiness;
  const contentPreview = overrides.contentPreview === undefined ? {
    marketplace: 'aukro',
    label: 'Aukro',
    format: 'plain-text',
    content: {
      title: 'Synthetic Aukro Product',
      plainText: 'Canonical Aukro plain text',
      html: '<p>Canonical Aukro plain text</p>',
    },
    source: {
      canonicalDocumentVersion: 'doc-v1',
      legacyDescriptionFallback: false,
      sourceHash: 'hash-canonical-1',
      generatedAt: fresh,
    },
    overridesApplied: false,
    warnings: [],
  } : overrides.contentPreview;
  let existingOffer = overrides.existingOffer || null;
  let createCount = 0;
  let updateCount = 0;

  const prisma = {
    aukroAccount: {
      findUnique: async () => account,
    },
    aukroOffer: {
      findFirst: async (args: any) => {
        if (args?.where?.id?.not) return null;
        return existingOffer;
      },
      create: async (args: any) => {
        createCount++;
        existingOffer = { id: 'offer-1', ...args.data, account };
        return existingOffer;
      },
      update: async (args: any) => {
        updateCount++;
        existingOffer = { ...existingOffer, ...args.data, id: args.where.id, account };
        return existingOffer;
      },
      findUnique: async () => existingOffer,
    },
  };

  const catalogClient = {
    getProductById: async () => product,
    getProductPricing: async () => pricing,
    getProductMedia: async () => media,
    getProductContentPreview: async () => contentPreview,
    searchProducts: async () => ({ items: overrides.catalogProducts || [product], total: (overrides.catalogProducts || [product]).length, page: 1, limit: 100 }),
    getProductQualityReadiness: async () => {
      if (overrides.qualityError) throw overrides.qualityError;
      return qualityReadiness;
    },
  };
  const warehouseClient = {
    getTotalAvailable: async () => {
      if (overrides.warehouseError) throw overrides.warehouseError;
      return stock;
    },
  };
  const aiClient = {
    createListingProposal: async () => overrides.aiResult || {
      success: true,
      service: 'ai-microservice',
      contractVersion: 'aukro.ai.listing-proposal.v1',
      data: {
        model: 'synthetic-model',
        modelVersion: '2026-06-13',
        confidence: 0.91,
        riskLevel: 'low',
        proposedFields: { title: 'AI improved title', description: 'AI improved description', price: 209 },
      },
    },
    assessPolicyRisk: async () => overrides.aiResult || {
      success: true,
      service: 'ai-microservice',
      contractVersion: 'aukro.ai.policy-risk.v1',
      data: { confidence: 0.9, riskLevel: 'low', proposedFields: {} },
    },
  };
  const notificationsClient = {
    sendAukroNotification: async () => ({ success: true, service: 'notifications-microservice', contractVersion: 'aukro.notifications.send.v1' }),
  };
  const emittedEvents: any[] = [];
  const loggingClient = {
    emitAukroEvent: async (eventName: string, input: any, context: any) => {
      emittedEvents.push({ eventName, input, context });
      return overrides.loggingResult || { success: true, service: 'logging-microservice', contractVersion: 'aukro.logging.event.v1' };
    },
  };
  const logger = { setContext() {}, log() {}, warn() {}, error() {} };
  const service = new OffersService(
    prisma as any,
    catalogClient as any,
    warehouseClient as any,
    new OfferPolicyService(),
    aiClient as any,
    notificationsClient as any,
    loggingClient as any,
    logger as any,
  );

  return { service, getCreateCount: () => createCount, getUpdateCount: () => updateCount, account, product, emittedEvents };
}

async function run() {
  const createdHarness = createHarness();
  const created = await createdHarness.service.createFromCatalog({
    accountId: createdHarness.account.id,
    productId: createdHarness.product.id,
    requestedBy: 'operator:synthetic',
    policyEvidence: { aiRiskCleared: { passed: true, checkedAt: fresh, source: 'synthetic-test' } },
  });
  assert.equal(created.action, 'created');
  assert.equal(created.draftStatus, 'ready_for_review');
  assert.equal(created.compliancePolicy.allowed, true);
  assert.equal(created.offer.isActive, false);
  assert.equal(created.offer.rawData.draft.source, 'catalog-sell-action');
  assert.equal(created.offer.description, 'Canonical Aukro plain text');
  assert.equal(created.offer.rawData.draft.sourceSnapshot.descriptionSource, 'catalog-content-preview');
  assert.equal(created.offer.rawData.draft.sourceSnapshot.contentPreview.source.sourceHash, 'hash-canonical-1');
  assert.equal(created.offer.rawData.draft.sourceSnapshot.catalogQuality.policyId, 'catalog.product_quality.v1');
  assert.equal(created.offer.rawData.draft.sourceSnapshot.catalogQuality.canActivate, true);
  assert.equal(createdHarness.getCreateCount(), 1);

  const existingOffer = { ...created.offer, id: 'offer-1' };
  const reusedHarness = createHarness({ existingOffer });
  const reused = await reusedHarness.service.createFromCatalog({
    accountId: reusedHarness.account.id,
    productId: reusedHarness.product.id,
    policyEvidence: { aiRiskCleared: { passed: true, checkedAt: fresh, source: 'synthetic-test' } },
  });
  assert.equal(reused.action, 'reused');
  assert.equal(reusedHarness.getCreateCount(), 0);

  const fallbackHarness = createHarness({ contentPreview: null });
  const fallback = await fallbackHarness.service.createFromCatalog({
    accountId: fallbackHarness.account.id,
    productId: fallbackHarness.product.id,
    policyEvidence: { aiRiskCleared: { passed: true, checkedAt: fresh, source: 'synthetic-test' } },
  });
  assert.equal(fallback.offer.description, 'Synthetic description');
  assert.equal(fallback.sourceSnapshot.descriptionSource, 'catalog-product-description');

  const bundleHarness = createHarness({
    product: {
      id: '33333333-3333-3333-3333-333333333333',
      contractVersion: 'catalog.bundle.v1',
      productKind: 'catalog_bundle',
      bundleId: '44444444-4444-4444-4444-444444444444',
      title: 'Synthetic Catalog Bundle',
      description: 'Synthetic bundle description',
      isActive: true,
      categoryId: 'cat-1',
      attributes: { color: 'black' },
    },
  });
  const bundleDraft = await bundleHarness.service.createFromCatalog({
    accountId: bundleHarness.account.id,
    productId: bundleHarness.product.id,
    policyEvidence: {
      aiRiskCleared: { passed: true, checkedAt: fresh, source: 'synthetic-test' },
      catalogBundlePublication: { passed: true, checkedAt: fresh, source: 'caller-supplied', canPublishAsSingleListing: true },
    },
  });
  assert.equal(bundleDraft.draftStatus, 'blocked');
  assert.ok(bundleDraft.blockers.includes('CATALOG_BUNDLE_PUBLICATION_FAILED'));
  assert.equal(bundleDraft.offer.rawData.draft.policyEvidence.catalogBundlePublication.passed, false);
  assert.equal(bundleDraft.sourceSnapshot.contractVersion, 'catalog.bundle.v1');

  const blockedHarness = createHarness({ stock: 0, media: [], pricing: null });
  const blocked = await blockedHarness.service.createFromCatalog({
    accountId: blockedHarness.account.id,
    productId: blockedHarness.product.id,
  });
  assert.equal(blocked.action, 'created');
  assert.equal(blocked.draftStatus, 'blocked');
  assert.equal(blocked.compliancePolicy.allowed, false);
  assert.ok(blocked.blockers.includes('STOCK_AVAILABILITY_FAILED'));
  assert.ok(blocked.blockers.includes('PRICE_POLICY_FAILED'));
  assert.ok(blocked.blockers.includes('MEDIA_READINESS_FAILED'));
  assert.ok(blocked.blockers.includes('AI_RISK_MISSING'));


  const qualityBlockedHarness = createHarness({
    qualityReadiness: {
      productId: '22222222-2222-2222-2222-222222222222',
      lifecycle: 'active',
      issues: [
        { code: 'missing_description', field: 'description', severity: 'blocking', message: 'Description is required.' },
        { code: 'missing_ean', field: 'ean', severity: 'warning', message: 'EAN is optional.' },
      ],
    },
  });
  await assert.rejects(
    () => qualityBlockedHarness.service.createFromCatalog({
      accountId: qualityBlockedHarness.account.id,
      productId: qualityBlockedHarness.product.id,
    }),
    (error: any) => {
      const response = error.getResponse();
      assert.equal(error.getStatus(), 400);
      assert.deepEqual(response.blockers, ['missing_description']);
      assert.equal(response.policyId, 'catalog.product_quality.v1');
      assert.equal(qualityBlockedHarness.getCreateCount(), 0);
      return true;
    },
  );

  const qualityUnavailableHarness = createHarness({ qualityError: new Error('catalog quality unavailable') });
  await assert.rejects(
    () => qualityUnavailableHarness.service.createFromCatalog({
      accountId: qualityUnavailableHarness.account.id,
      productId: qualityUnavailableHarness.product.id,
    }),
    (error: any) => {
      const response = error.getResponse();
      assert.equal(error.getStatus(), 400);
      assert.deepEqual(response.blockers, ['CATALOG_QUALITY_REVIEW_UNAVAILABLE']);
      assert.equal(qualityUnavailableHarness.getCreateCount(), 0);
      return true;
    },
  );

  const directCreateBlockedHarness = createHarness({
    qualityReadiness: {
      productId: '22222222-2222-2222-2222-222222222222',
      lifecycle: 'active',
      issues: [{ code: 'duplicate_sku', field: 'sku', severity: 'blocking', message: 'SKU is already used.' }],
    },
  });
  await assert.rejects(
    () => directCreateBlockedHarness.service.create({
      accountId: directCreateBlockedHarness.account.id,
      productId: directCreateBlockedHarness.product.id,
      title: 'Direct linked offer',
      description: 'Direct linked description',
      price: 199,
      stockQuantity: 1,
    }),
    (error: any) => {
      assert.equal(error.getStatus(), 400);
      assert.deepEqual(error.getResponse().blockers, ['duplicate_sku']);
      assert.equal(directCreateBlockedHarness.getCreateCount(), 0);
      return true;
    },
  );

  const directUpdateBlockedHarness = createHarness({
    existingOffer,
    qualityReadiness: {
      productId: existingOffer.productId,
      lifecycle: 'active',
      issues: [{ code: 'missing_image', field: 'image', severity: 'blocking', message: 'Image is required.' }],
    },
  });
  await assert.rejects(
    () => directUpdateBlockedHarness.service.update(existingOffer.id, { isActive: true }),
    (error: any) => {
      assert.equal(error.getStatus(), 400);
      assert.deepEqual(error.getResponse().blockers, ['missing_image']);
      assert.equal(directUpdateBlockedHarness.getUpdateCount(), 0);
      return true;
    },
  );

  const syncBlockedHarness = createHarness({
    qualityReadiness: {
      productId: '22222222-2222-2222-2222-222222222222',
      lifecycle: 'active',
      issues: [{ code: 'missing_current_price', field: 'price', severity: 'blocking', message: 'Current price is required.' }],
    },
  });
  const syncBlocked = await syncBlockedHarness.service.syncFromCatalog({ accountId: syncBlockedHarness.account.id, limit: 1 });
  assert.equal(syncBlocked.success, true);
  assert.equal(syncBlocked.created, 0);
  assert.equal(syncBlocked.updated, 0);
  assert.equal(syncBlocked.policyBlocked, 1);
  assert.equal(syncBlockedHarness.getCreateCount(), 0);
  assert.equal(syncBlockedHarness.getUpdateCount(), 0);
  assert.ok(syncBlocked.errors[0].includes('missing_current_price'));

  const syncUnavailableHarness = createHarness({ qualityError: new Error('catalog quality unavailable') });
  const syncUnavailable = await syncUnavailableHarness.service.syncFromCatalog({ accountId: syncUnavailableHarness.account.id, limit: 1 });
  assert.equal(syncUnavailable.created, 0);
  assert.equal(syncUnavailable.updated, 0);
  assert.equal(syncUnavailable.policyBlocked, 1);
  assert.equal(syncUnavailableHarness.getCreateCount(), 0);
  assert.ok(syncUnavailable.errors[0].includes('CATALOG_QUALITY_REVIEW_UNAVAILABLE'));

  const proposalHarness = createHarness({ existingOffer: created.offer });
  const proposalResponse = await proposalHarness.service.createAiProposal(created.offer.id, {
    requestedBy: 'operator:synthetic',
  });
  assert.equal(proposalResponse.proposal.status, 'pending_review');
  assert.equal(proposalResponse.proposal.reviewRequired, true);
  assert.equal(proposalResponse.proposal.proposedFields.title, 'AI improved title');

  const approved = await proposalHarness.service.reviewAiProposal(created.offer.id, proposalResponse.proposal.id, {
    actorId: 'approver:synthetic',
    decision: 'approve',
    editedFields: { title: 'Human approved title', price: 215 },
  });
  assert.equal(approved.proposal.status, 'approved');
  assert.equal(approved.offer.title, 'Human approved title');
  assert.equal(approved.review.diff.title.before, 'Synthetic Aukro Product');
  assert.equal(approved.review.diff.title.after, 'Human approved title');

  const queued = await proposalHarness.service.enqueuePublish(created.offer.id, {
    actorId: 'publisher:synthetic',
    idempotencyKey: 'publish-synthetic-1',
    rateLimitRemaining: 1,
  });
  assert.equal(queued.action, 'created');
  assert.equal(queued.attempt.status, 'queued');
  assert.equal(queued.compliancePolicy.allowed, true);
  assert.equal(queued.attempt.mutation.enabled, false);
  assert.equal(queued.attempt.idempotencyKey, 'publish-synthetic-1');
  assert.equal(queued.queue.queuedCount, 1);

  const replayed = await proposalHarness.service.enqueuePublish(created.offer.id, {
    actorId: 'publisher:synthetic',
    idempotencyKey: 'publish-synthetic-1',
    rateLimitRemaining: 1,
  });
  assert.equal(replayed.action, 'reused');
  assert.equal(replayed.attempt.id, queued.attempt.id);
  assert.equal(replayed.queue.attempts.length, 1);


  const qualityBlockedPublishHarness = createHarness({
    existingOffer: approved.offer,
    qualityReadiness: {
      productId: created.offer.productId,
      lifecycle: 'active',
      issues: [{ code: 'missing_title', field: 'title', severity: 'blocking', message: 'Title is required.' }],
    },
  });
  const qualityBlockedPublish = await qualityBlockedPublishHarness.service.enqueuePublish(created.offer.id, {
    actorId: 'publisher:synthetic',
    idempotencyKey: 'publish-quality-blocked-1',
    rateLimitRemaining: 1,
  });
  assert.equal(qualityBlockedPublish.attempt.status, 'blocked');
  assert.equal(qualityBlockedPublish.compliancePolicy.allowed, false);
  assert.ok(qualityBlockedPublish.blockers.includes('CATALOG_VALIDATION_FAILED'));
  assert.deepEqual(qualityBlockedPublish.attempt.policyEvidence.catalogValidated.blockers, ['missing_title']);

  const zeroStockPublishHarness = createHarness({ stock: 0, existingOffer: approved.offer });
  const zeroStockPublish = await zeroStockPublishHarness.service.enqueuePublish(created.offer.id, {
    actorId: 'publisher:synthetic',
    idempotencyKey: 'publish-zero-stock-1',
    rateLimitRemaining: 1,
    policyEvidence: { stockAvailable: { passed: true, checkedAt: fresh, source: 'synthetic-test', quantity: 99 } },
  });
  assert.equal(zeroStockPublish.attempt.status, 'blocked');
  assert.equal(zeroStockPublish.compliancePolicy.allowed, false);
  assert.ok(zeroStockPublish.blockers.includes('STOCK_AVAILABILITY_FAILED'));
  assert.equal(zeroStockPublish.attempt.policyEvidence.stockAvailable.quantity, 0);
  assert.equal(zeroStockPublish.queue.queuedCount, 0);

  const unavailableStockPublishHarness = createHarness({
    warehouseError: new Error('warehouse unavailable'),
    existingOffer: approved.offer,
  });
  const unavailableStockPublish = await unavailableStockPublishHarness.service.enqueuePublish(created.offer.id, {
    actorId: 'publisher:synthetic',
    idempotencyKey: 'publish-warehouse-unavailable-1',
    rateLimitRemaining: 1,
  });
  assert.equal(unavailableStockPublish.attempt.status, 'blocked');
  assert.equal(unavailableStockPublish.compliancePolicy.allowed, false);
  assert.ok(unavailableStockPublish.blockers.includes('STOCK_AVAILABILITY_FAILED'));
  assert.equal(unavailableStockPublish.attempt.policyEvidence.stockAvailable.quantity, 0);
  assert.equal(unavailableStockPublish.queue.queuedCount, 0);

  const blockedPublishHarness = createHarness({ existingOffer: created.offer });
  const blockedPublish = await blockedPublishHarness.service.enqueuePublish(created.offer.id, {
    actorId: 'publisher:synthetic',
    idempotencyKey: 'publish-blocked-1',
  });
  assert.equal(blockedPublish.attempt.status, 'blocked');
  assert.equal(blockedPublish.compliancePolicy.allowed, false);
  assert.ok(blockedPublish.blockers.includes('HUMAN_APPROVAL_MISSING'));
  assert.ok(blockedPublish.blockers.includes('RATE_LIMIT_READINESS_MISSING'));
  assert.equal(blockedPublish.attempt.mutation.enabled, false);

  const reconciliation = await proposalHarness.service.recordReconciliation(created.offer.id, {
    actorId: 'ops:synthetic',
    source: 'synthetic-test',
    marketplaceSnapshot: { stockQuantity: 1, price: 999, status: 'active' },
  });
  assert.equal(reconciliation.report.status, 'drift_detected');
  assert.ok(reconciliation.report.drift.some((item: any) => item.type === 'stock'));
  assert.ok(reconciliation.report.drift.some((item: any) => item.type === 'price'));
  assert.ok(reconciliation.report.drift.some((item: any) => item.type === 'status'));
  assert.equal(reconciliation.report.mutation.enabled, false);
  assert.equal(reconciliation.reconciliation.driftCount, 1);



  const revenue = await proposalHarness.service.recordRevenueAnalytics(created.offer.id, {
    actorId: 'ops:synthetic',
    analyticsId: 'revenue-synthetic-1',
    source: 'synthetic-test',
    correlationId: 'corr-revenue-1',
    metrics: {
      views: 120,
      watchers: 8,
      conversionRate: 0.01,
      blockedRevenue: 1500,
      availableStock: 1,
      marginPercent: 8,
      stockAgeDays: 120,
      mediaCount: 0,
      policyReasonCodes: ['MEDIA_READINESS_FAILED'],
    },
  });
  assert.equal(revenue.action, 'created');
  assert.equal(revenue.record.blockedRevenue, 1500);
  assert.equal(revenue.record.mutation.enabled, false);
  assert.ok(revenue.recommendationEvents.some((event: any) => event.targetService === 'operations'));
  assert.ok(revenue.recommendationEvents.some((event: any) => event.targetService === 'marketing-microservice'));
  assert.ok(revenue.recommendationEvents.some((event: any) => event.targetService === 'catalog-microservice'));
  assert.ok(revenue.recommendationEvents.some((event: any) => event.targetService === 'suppliers-microservice'));
  assert.ok(revenue.recommendationEvents.some((event: any) => event.targetService === 'ai-microservice'));
  assert.equal(revenue.record.logging.successCount, revenue.recommendationEvents.length);
  assert.equal(proposalHarness.emittedEvents.length, revenue.recommendationEvents.length);
  assert.equal(proposalHarness.emittedEvents[0].eventName, 'aukro.revenue.recommendation');
  assert.equal(proposalHarness.emittedEvents[0].input.context.offerId, created.offer.id);
  assert.equal(JSON.stringify(proposalHarness.emittedEvents).includes('customer'), false);

  const revenueReplay = await proposalHarness.service.recordRevenueAnalytics(created.offer.id, {
    actorId: 'ops:synthetic',
    analyticsId: 'revenue-synthetic-1',
    metrics: { blockedRevenue: 9999 },
  });
  assert.equal(revenueReplay.action, 'reused');
  assert.equal(revenueReplay.record.blockedRevenue, 1500);
  assert.equal(revenueReplay.analytics.records.length, 1);

  const loggingUnavailableHarness = createHarness({
    existingOffer: created.offer,
    loggingResult: { success: false, unavailable: true, service: 'logging-microservice', contractVersion: 'aukro.logging.event.v1', errorCode: 'SERVICE_UNAVAILABLE' },
  });
  const unavailableRevenue = await loggingUnavailableHarness.service.recordRevenueAnalytics(created.offer.id, {
    actorId: 'ops:synthetic',
    analyticsId: 'revenue-synthetic-unavailable',
    metrics: { blockedRevenue: 100, policyReasonCodes: ['STOCK_AVAILABILITY_FAILED'] },
  });
  assert.equal(unavailableRevenue.action, 'created');
  assert.equal(unavailableRevenue.record.logging.unavailableCount, unavailableRevenue.recommendationEvents.length);
  assert.equal(unavailableRevenue.analytics.records.length, 1);

  const rejectHarness = createHarness({ existingOffer: created.offer });
  const risky = await rejectHarness.service.createAiProposal(created.offer.id, {
    requestedBy: 'operator:synthetic',
    minConfidence: 0.95,
  });
  assert.equal(risky.proposal.status, 'blocked');
  assert.ok(risky.proposal.blockers.includes('AI_CONFIDENCE_LOW'));
  const rejected = await rejectHarness.service.reviewAiProposal(created.offer.id, risky.proposal.id, {
    actorId: 'approver:synthetic',
    decision: 'reject',
    reason: 'Synthetic rejection',
  });
  assert.equal(rejected.proposal.status, 'rejected');
  assert.deepEqual(rejected.review.diff, {});
}

run();
