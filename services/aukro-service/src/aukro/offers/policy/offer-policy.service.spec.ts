import { strict as assert } from 'assert';
import { OfferPolicyService } from './offer-policy.service';
import { OfferPolicyEvidence } from './offer-policy.types';

const now = '2026-06-13T12:00:00.000Z';
const fresh = '2026-06-13T11:30:00.000Z';
const stale = '2026-06-11T11:30:00.000Z';

function passingDraftEvidence(): OfferPolicyEvidence {
  return {
    catalogValidated: { passed: true, checkedAt: fresh },
    accountReady: { passed: true, checkedAt: fresh },
    categoryMapped: { passed: true, checkedAt: fresh },
    requiredParametersComplete: { passed: true, checkedAt: fresh },
    mediaReady: { passed: true, checkedAt: fresh },
    stockAvailable: { passed: true, checkedAt: fresh, quantity: 3 },
    priceValid: { passed: true, checkedAt: fresh, price: 199, marginPercent: 20, currency: 'CZK' },
    duplicateChecked: { passed: true, checkedAt: fresh },
    aiRiskCleared: { passed: true, checkedAt: fresh },
  };
}

function passingPublishEvidence(): OfferPolicyEvidence {
  return {
    ...passingDraftEvidence(),
    humanApproved: { passed: true, checkedAt: fresh, actorId: 'operator:masked' },
    rateLimitReady: { passed: true, checkedAt: fresh },
    idempotencyReady: { passed: true, checkedAt: fresh, idempotencyKey: 'aukro-offer-123-v1' },
  };
}

function run() {
  const service = new OfferPolicyService();

  const empty = service.evaluate({ mode: 'draft', now, evidence: {} });
  assert.equal(empty.allowed, false);
  assert.ok(empty.reasonCodes.includes('CATALOG_VALIDATION_MISSING'));
  assert.ok(empty.reasonCodes.includes('ACCOUNT_READINESS_MISSING'));
  assert.ok(empty.reasonCodes.includes('AI_RISK_MISSING'));

  const failedStock = service.evaluate({
    mode: 'draft',
    now,
    evidence: {
      ...passingDraftEvidence(),
      stockAvailable: { passed: true, checkedAt: fresh, quantity: 0 },
    },
  });
  assert.equal(failedStock.allowed, false);
  assert.ok(failedStock.reasonCodes.includes('STOCK_AVAILABILITY_FAILED'));

  const staleCatalog = service.evaluate({
    mode: 'draft',
    now,
    evidence: {
      ...passingDraftEvidence(),
      catalogValidated: { passed: true, checkedAt: stale },
    },
  });
  assert.equal(staleCatalog.allowed, false);
  assert.ok(staleCatalog.reasonCodes.includes('CATALOG_VALIDATION_STALE'));

  const failedPrice = service.evaluate({
    mode: 'draft',
    now,
    minMarginPercent: 10,
    evidence: {
      ...passingDraftEvidence(),
      priceValid: { passed: true, checkedAt: fresh, price: 199, marginPercent: 5 },
    },
  });
  assert.equal(failedPrice.allowed, false);
  assert.ok(failedPrice.reasonCodes.includes('PRICE_POLICY_FAILED'));

  const draftAllowed = service.evaluate({ mode: 'draft', now, evidence: passingDraftEvidence() });
  assert.equal(draftAllowed.allowed, true);
  assert.deepEqual(draftAllowed.reasonCodes, []);

  const publishMissingApproval = service.evaluate({ mode: 'publish', now, evidence: passingDraftEvidence() });
  assert.equal(publishMissingApproval.allowed, false);
  assert.ok(publishMissingApproval.reasonCodes.includes('HUMAN_APPROVAL_MISSING'));
  assert.ok(publishMissingApproval.reasonCodes.includes('RATE_LIMIT_READINESS_MISSING'));
  assert.ok(publishMissingApproval.reasonCodes.includes('IDEMPOTENCY_MISSING'));

  const publishMissingActor = service.evaluate({
    mode: 'publish',
    now,
    evidence: {
      ...passingPublishEvidence(),
      humanApproved: { passed: true, checkedAt: fresh },
    },
  });
  assert.equal(publishMissingActor.allowed, false);
  assert.ok(publishMissingActor.reasonCodes.includes('HUMAN_APPROVAL_FAILED'));

  const publishAllowed = service.evaluate({ mode: 'publish', now, evidence: passingPublishEvidence() });
  assert.equal(publishAllowed.allowed, true);
  assert.deepEqual(publishAllowed.reasonCodes, []);
}

run();
