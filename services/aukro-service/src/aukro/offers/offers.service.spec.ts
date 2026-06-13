import { strict as assert } from 'assert';

process.env.LOGGING_SERVICE_URL = process.env.LOGGING_SERVICE_URL || 'http://logging-microservice:3209';

const { OffersService } = require('./offers.service');
const { OfferPolicyService } = require('./policy/offer-policy.service');

const fresh = '2026-06-13T12:00:00.000Z';

function createHarness(overrides: { stock?: number; media?: any[]; pricing?: any; product?: any; existingOffer?: any; aiResult?: any } = {}) {
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
  let existingOffer = overrides.existingOffer || null;
  let createCount = 0;

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
  };
  const warehouseClient = { getTotalAvailable: async () => stock };
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
  const logger = { setContext() {}, log() {}, warn() {}, error() {} };
  const service = new OffersService(
    prisma as any,
    catalogClient as any,
    warehouseClient as any,
    new OfferPolicyService(),
    aiClient as any,
    notificationsClient as any,
    logger as any,
  );

  return { service, getCreateCount: () => createCount, account, product };
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
