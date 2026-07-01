import { strict as assert } from 'assert';
import { AukroExecutorController } from './executor.controller';
import { AukroExecutorCreateInput } from './executor.types';

class FakeExecutorService {
  calls: AukroExecutorCreateInput[] = [];

  async createOffer(input: AukroExecutorCreateInput) {
    this.calls.push(input);
    return {
      ok: true,
      status: 'dry_run',
      calledApi: false,
      payload: { name: 'Synthetic', language: 'cs-CZ', description: '<p>Dry run</p>', quantity: 1, categoryId: 1, shippingTemplateId: 2, duration: 30, location: { city: 'Praha', postCode: '11000', countryCode: 'CZ' }, images: [{ id: 3 }], buyNowPrice: { amount: 10, currency: 'CZK' } },
      record: {
        executorVersion: 'task-014-executor-v1',
        action: 'create_offer_v2',
        status: 'dry_run',
        idempotencyKey: 'idem-controller',
        dryRun: true,
        createdAt: '2026-07-01T00:00:00.000Z',
      },
    };
  }
}

class FakePublicApiClient {
  getReadiness() {
    return {
      ready: false,
      status: 'missing_config',
      missing: ['username', 'password', 'apiKey'],
      baseUrlConfigured: true,
      usernameConfigured: false,
      passwordConfigured: false,
      apiKeyConfigured: false,
      environment: 'production',
      error: {
        code: 'AUKRO_PUBLIC_API_CONFIG_MISSING',
        message: 'Aukro Public API configuration is incomplete.',
        retryable: false,
        missing: ['username', 'password', 'apiKey'],
      },
    };
  }
}

const input: AukroExecutorCreateInput = {
  offer: {
    id: 'local-offer-1',
    title: 'Controller dry-run offer',
    plainDescription: 'Controller dry-run description.',
  },
  evidence: {
    actor: { actorId: 'operator-1' },
    idempotencyKey: 'idem-controller',
    policy: { allowed: true, blockers: [] },
    humanApproval: { approved: true, actorId: 'reviewer-1' },
    rateLimit: { ready: true },
    account: { ready: true },
    payload: {
      categoryId: 1,
      shippingTemplateId: 2,
      location: { city: 'Praha', postCode: '11000', countryCode: 'CZ' },
      stockQuantity: 1,
      price: { amount: 10, currency: 'CZK' },
      images: [{ id: 3 }],
    },
  },
};

async function run() {
  const executorService = new FakeExecutorService();
  const controller = new AukroExecutorController(executorService as any, new FakePublicApiClient() as any);

  const readiness = controller.getReadiness();
  assert.equal(readiness.ready, false);
  assert.equal(readiness.status, 'missing_config');
  assert.equal(readiness.liveMutationEnabled, false);
  assert.equal(readiness.executorMode, 'dry_run_only');
  assert.ok(readiness.publicApi.missing.includes('apiKey'));
  assert.ok(readiness.requiredExternalEvidence.some((item) => item.includes('human approval')));

  const result = await controller.dryRunOffer({ ...input, dryRun: false });
  assert.equal(result.ok, true);
  assert.equal(result.status, 'dry_run');
  assert.equal(result.calledApi, false);
  assert.equal(result.liveMutationEnabled, false);
  assert.equal(result.executorMode, 'dry_run_only');
  assert.equal(executorService.calls.length, 1);
  assert.equal(executorService.calls[0].dryRun, true);
}

run();
