const { strict: assert } = require('assert');

process.env.LOGGING_SERVICE_URL = process.env.LOGGING_SERVICE_URL || 'http://logging-microservice:3209';

const { WorkbenchService } = require('./workbench.service');

const account = { id: 'account-1', isActive: true };
const otherAccount = { id: 'account-2', isActive: true };
const offer = {
  id: 'offer-1',
  accountId: account.id,
  productId: 'product-1',
  title: 'Synthetic workbench offer',
  price: 199,
  stockQuantity: 2,
  isActive: false,
  account,
  rawData: {
    draft: { draftVersion: 1, draftStatus: 'blocked', policyReasonCodes: ['MEDIA_READINESS_FAILED'] },
    aiProposals: [{ id: 'proposal-1', status: 'pending_review', confidence: 0.8, blockers: [], createdAt: '2026-06-14T08:00:00.000Z' }],
    humanReviews: [],
    publishQueue: { attempts: [{ id: 'attempt-1', status: 'blocked', blockers: ['RATE_LIMIT_READINESS_MISSING'], idempotencyKey: 'publish-1', requestedAt: '2026-06-14T09:00:00.000Z' }] },
    reconciliation: { driftCount: 1, lastReport: { id: 'recon-1', status: 'drift_detected', drift: [{ type: 'stock' }], recordedAt: '2026-06-14T10:00:00.000Z' } },
    revenueAnalytics: {
      blockedRevenueTotal: 1500,
      recommendationCount: 2,
      lastRecord: {
        id: 'revenue-1',
        blockedRevenue: 1500,
        recommendationEvents: [{ reasonCodes: ['BLOCKED_REVENUE'] }, { reasonCodes: ['MEDIA_EVIDENCE_MISSING'] }],
        recordedAt: '2026-06-14T11:00:00.000Z',
      },
    },
  },
};
const activeOffer = { id: 'offer-2', accountId: otherAccount.id, productId: 'product-2', title: 'Other offer', isActive: true, rawData: {}, account: otherAccount };
const order = { id: 'order-1', accountId: account.id, status: 'pending', forwarded: false, total: 299, currency: 'CZK', createdAt: new Date('2026-06-14T12:00:00.000Z'), customerEmail: 'customer@example.test', rawData: { private: 'excluded' }, account };
const forwardedOrder = { id: 'order-2', accountId: otherAccount.id, status: 'created', forwarded: true, total: 100, currency: 'CZK', createdAt: new Date('2026-06-14T13:00:00.000Z'), account: otherAccount };

function createService() {
  const prisma = {
    aukroAccount: {
      findMany: async (args: any) => [account, otherAccount].filter((item) => item.isActive && (!args?.where?.id || item.id === args.where.id)),
    },
    aukroOffer: {
      findMany: async (args: any) => [offer, activeOffer].filter((item) => !args?.where?.accountId || item.accountId === args.where.accountId),
      findUnique: async (args: any) => [offer, activeOffer].find((item) => item.id === args.where.id) || null,
    },
    aukroOrder: {
      findMany: async (args: any) => [order, forwardedOrder].filter((item) => !args?.where?.accountId || item.accountId === args.where.accountId),
    },
  };
  const logger = { setContext() {}, log() {}, warn() {}, error() {} };
  return new WorkbenchService(prisma as any, logger as any);
}

async function run() {
  const service = createService();
  const summary = await service.getSummary();
  assert.equal(summary.metrics.accounts.active, 2);
  assert.equal(summary.metrics.offers.total, 2);
  assert.equal(summary.metrics.offers.blockedDrafts, 1);
  assert.equal(summary.metrics.offers.blockedPublishAttempts, 1);
  assert.equal(summary.metrics.offers.reconciliationDrift, 1);
  assert.equal(summary.metrics.offers.blockedRevenue, 1500);
  assert.equal(summary.metrics.orders.unforwarded, 1);

  const filtered = await service.getSummary({ accountId: account.id });
  assert.equal(filtered.metrics.accounts.active, 1);
  assert.equal(filtered.metrics.offers.total, 1);
  assert.equal(filtered.metrics.orders.total, 1);

  const queue = await service.getReviewQueue({ accountId: account.id });
  assert.equal(queue.counts.draft_blocked, 1);
  assert.equal(queue.counts.ai_review_required, 1);
  assert.equal(queue.counts.publish_blocked, 1);
  assert.equal(queue.counts.reconciliation_drift, 1);
  assert.equal(queue.counts.blocked_revenue, 1);
  assert.equal(queue.counts.order_forwarding_failed, 1);
  assert.ok(queue.items.every((item: any) => item.accountId === account.id));
  assert.equal(JSON.stringify(queue).includes('customer@example.test'), false);

  const preview = await service.getBulkPreview({ accountId: account.id, minPriority: 'high', limit: '2' });
  assert.equal(preview.totalCandidates, 4);
  assert.equal(preview.returnedCount, 2);
  assert.equal(preview.remainingCount, 2);
  assert.equal(preview.filters.limit, 2);
  assert.ok(preview.items.every((item: any) => item.accountId === account.id));
  assert.ok(preview.items.every((item: any) => item.priority === 'high'));
  assert.equal(JSON.stringify(preview).includes('customer@example.test'), false);

  const typedPreview = await service.getBulkPreview({ type: 'ai_review_required', minPriority: 'medium', limit: '200' });
  assert.equal(typedPreview.filters.type, 'ai_review_required');
  assert.equal(typedPreview.filters.limit, 100);
  assert.equal(typedPreview.totalCandidates, 1);
  assert.equal(typedPreview.items[0].type, 'ai_review_required');

  const detail = await service.getOfferDetail(offer.id);
  assert.equal(detail.offer.id, offer.id);
  assert.equal(detail.offer.draft?.draftStatus, 'blocked');
  assert.equal(detail.offer.linkedOrders.length, 1);
  assert.equal(detail.offer.linkedOrders[0].id, order.id);
  assert.equal(JSON.stringify(detail).includes('customerEmail'), false);
  assert.equal(JSON.stringify(detail).includes('private'), false);
}

run();
