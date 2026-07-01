import { strict as assert } from 'assert';
import { AukroExecutorService } from './executor.service';
import {
  AUKRO_EXECUTOR_VERSION,
  AukroExecutorCreateInput,
  AukroExecutorPublicApiClient,
} from './executor.types';

class FakePublicApiClient implements AukroExecutorPublicApiClient {
  calls: any[] = [];
  queue: any[] = [];

  async createOffer(input: any) {
    this.calls.push(input);
    const next = this.queue.shift();
    if (next instanceof Error) throw next;
    return next || { ok: true, status: 201, data: { offerId: 'aukro-offer-default', status: 'ACTIVE' } };
  }
}

function completeInput(overrides: Partial<AukroExecutorCreateInput> = {}): AukroExecutorCreateInput {
  const input: AukroExecutorCreateInput = {
    offer: {
      id: 'local-offer-1',
      title: 'Synthetic Aukro executor offer',
      plainDescription: 'Executor description.',
      duration: 30,
    },
    evidence: {
      actor: { actorId: 'operator-1' },
      idempotencyKey: 'idem-1',
      policy: { allowed: true, blockers: [] },
      humanApproval: { approved: true, actorId: 'reviewer-1', approvedAt: '2026-06-30T10:00:00.000Z' },
      rateLimit: { ready: true },
      account: { ready: true, accountId: 'account-1' },
      payload: {
        categoryId: 123,
        shippingTemplateId: 456,
        location: { city: 'Praha', postCode: '11000', countryCode: 'CZ' },
        stockQuantity: 2,
        price: { amount: 199, currency: 'CZK' },
        images: [{ id: 101112 }],
        attributes: [{ id: 789, value: 'black' }],
        language: 'cs-CZ',
        duration: 30,
      },
    },
    now: '2026-06-30T12:00:00.000Z',
    ...overrides,
  };

  if (overrides.evidence) {
    input.evidence = {
      ...input.evidence,
      ...overrides.evidence,
      payload: {
        ...input.evidence.payload,
        ...overrides.evidence.payload,
      },
    };
  }

  if (overrides.offer) {
    input.offer = {
      ...input.offer,
      ...overrides.offer,
    };
  }

  return input;
}

async function run() {
  const missingClient = new FakePublicApiClient();
  const missingService = new AukroExecutorService(missingClient as any);
  const missing = await missingService.createOffer(completeInput({
    evidence: {
      actor: { actorId: '' },
      idempotencyKey: '',
      policy: { allowed: false, blockers: ['policy-blocker'] },
      humanApproval: { approved: false, actorId: '' },
      rateLimit: { ready: false },
      account: { ready: false },
      payload: {
        categoryId: 0,
        shippingTemplateId: 0,
        location: { city: '', postCode: '', countryCode: '' },
        stockQuantity: 0,
        price: { amount: 0, currency: '' },
        images: [],
      },
    },
    offer: { title: '', plainDescription: '' },
  }));
  assert.equal(missing.ok, false);
  assert.equal(missing.status, 'blocked');
  assert.equal(missing.calledApi, false);
  assert.equal(missingClient.calls.length, 0);
  assert.ok(missing.gateFailures?.some((failure) => failure.code === 'ACTOR_MISSING'));
  assert.ok(missing.gateFailures?.some((failure) => failure.code === 'IMAGE_MISSING'));

  const dryRunClient = new FakePublicApiClient();
  const dryRunService = new AukroExecutorService(dryRunClient as any);
  const dryRun = await dryRunService.createOffer(completeInput({ dryRun: true }));
  assert.equal(dryRun.ok, true);
  assert.equal(dryRun.status, 'dry_run');
  assert.equal(dryRun.calledApi, false);
  assert.equal(dryRunClient.calls.length, 0);
  assert.equal(dryRun.payload?.name, 'Synthetic Aukro executor offer');
  assert.deepEqual(dryRun.payload?.buyNowPrice, { amount: 199, currency: 'CZK' });
  assert.equal(dryRun.payload?.quantity, 2);
  assert.equal(dryRun.payload?.images[0].id, 101112);
  assert.equal(dryRun.record.payloadSummary?.payloadDigest.length, 64);

  const reusedClient = new FakePublicApiClient();
  const reusedService = new AukroExecutorService(reusedClient as any);
  const reused = await reusedService.createOffer(completeInput({
    priorExecutions: [{
      executorVersion: AUKRO_EXECUTOR_VERSION,
      action: 'create_offer_v2',
      status: 'success',
      idempotencyKey: 'idem-1',
      actorId: 'operator-0',
      sourceOfferId: 'local-offer-1',
      dryRun: false,
      createdAt: '2026-06-30T11:00:00.000Z',
      finishedAt: '2026-06-30T11:00:01.000Z',
      aukroOfferId: 'aukro-reused-1',
      aukroStatus: 'ACTIVE',
    }],
  }));
  assert.equal(reused.ok, true);
  assert.equal(reused.status, 'reused');
  assert.equal(reused.calledApi, false);
  assert.equal(reusedClient.calls.length, 0);
  assert.equal(reused.record.aukroOfferId, 'aukro-reused-1');
  assert.equal(reused.record.skippedReason, 'idempotent_reuse');

  const createClient = new FakePublicApiClient();
  createClient.queue.push({ ok: true, status: 201, data: { offerId: 'aukro-created-1', status: 'ACTIVE' } });
  const createService = new AukroExecutorService(createClient as any);
  const created = await createService.createOffer(completeInput());
  assert.equal(created.ok, true);
  assert.equal(created.status, 'created');
  assert.equal(created.calledApi, true);
  assert.equal(createClient.calls.length, 1);
  assert.equal(createClient.calls[0].categoryId, 123);
  assert.equal(created.record.status, 'success');
  assert.equal(created.record.aukroOfferId, 'aukro-created-1');

  const failClient = new FakePublicApiClient();
  failClient.queue.push({
    ok: false,
    status: 500,
    error: {
      code: 'HTTP_500',
      message: 'password synthetic-password token leaked-token Bearer another-leak',
      status: 500,
      retryable: true,
      details: {
        apiKey: 'synthetic-api-key',
        nested: 'secret leaked-secret',
      },
    },
  });
  const failService = new AukroExecutorService(failClient as any);
  const failed = await failService.createOffer(completeInput());
  const serializedFailure = JSON.stringify(failed);
  assert.equal(failed.ok, false);
  assert.equal(failed.status, 'failed');
  assert.equal(failed.calledApi, true);
  assert.equal(failed.error?.retryable, true);
  assert.equal(serializedFailure.includes('synthetic-password'), false);
  assert.equal(serializedFailure.includes('synthetic-api-key'), false);
  assert.equal(serializedFailure.includes('leaked-token'), false);
  assert.equal(serializedFailure.includes('leaked-secret'), false);
}

run();
