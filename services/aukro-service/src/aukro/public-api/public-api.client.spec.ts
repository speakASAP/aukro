import { strict as assert } from 'assert';
import { of, throwError } from 'rxjs';
import { AukroPublicApiClient } from './public-api.client';
import { AukroOfferV2Request } from './public-api.types';

class FakeHttpService {
  calls: any[] = [];
  queue: any[] = [];

  request(config: any) {
    this.calls.push(config);
    const next = this.queue.shift();
    if (next instanceof Error || next?.response || next?.code) {
      return throwError(() => next);
    }
    return of(next || { status: 200, data: {} });
  }
}

class FakeConfigService {
  constructor(private readonly values: Record<string, string | undefined>) {}

  get(name: string) {
    return this.values[name];
  }
}

const completeConfig = {
  AUKRO_PUBLIC_API_BASE_URL: 'https://example.invalid/api/v2',
  AUKRO_PUBLIC_API_USERNAME: 'synthetic-user',
  AUKRO_PUBLIC_API_PASSWORD: 'synthetic-password',
  AUKRO_PUBLIC_API_KEY: 'synthetic-api-key',
  AUKRO_PUBLIC_API_TIMEOUT_MS: '1234',
};

const offer: AukroOfferV2Request = {
  name: 'Synthetic offer',
  language: 'cs-CZ',
  description: '<p>Synthetic description</p>',
  buyNowPrice: { amount: 199, currency: 'CZK' },
  quantity: 1,
  categoryId: 123,
  shippingTemplateId: 456,
  duration: 30,
  location: { countryCode: 'CZ', city: 'Praha', postCode: '11000' },
  attributes: [{ id: 789, value: 'black' }],
  images: [{ id: 101112 }],
};

async function run() {
  const missingHttp = new FakeHttpService();
  const missingClient = new AukroPublicApiClient(missingHttp as any, new FakeConfigService({}) as any);
  const missing = await missingClient.getCategories();
  assert.equal(missing.ok, false);
  assert.equal(missingHttp.calls.length, 0);
  assert.deepEqual(missing.error?.missing, ['username', 'password', 'apiKey']);

  const authHttp = new FakeHttpService();
  authHttp.queue.push({ status: 200, data: { token: 'secret-bearer-token', expiresIn: 60 } });
  const authClient = new AukroPublicApiClient(authHttp as any, new FakeConfigService(completeConfig) as any);
  const auth = await authClient.authenticate();
  assert.equal(auth.ok, true);
  assert.equal(auth.data?.tokenPresent, true);
  assert.equal(JSON.stringify(auth).includes('secret-bearer-token'), false);
  assert.equal(authHttp.calls[0].url, 'https://example.invalid/api/v2/authenticate');
  assert.equal(authHttp.calls[0].headers['X-Aukro-Api-Key'], 'synthetic-api-key');

  const readHttp = new FakeHttpService();
  readHttp.queue.push({ status: 200, data: { accessToken: 'another-secret-token' } });
  readHttp.queue.push({ status: 200, data: { categories: [{ id: 'cat-1' }] } });
  const readClient = new AukroPublicApiClient(readHttp as any, new FakeConfigService(completeConfig) as any);
  const categories = await readClient.getCategories();
  assert.equal(categories.ok, true);
  assert.equal(readHttp.calls[1].method, 'GET');
  assert.equal(readHttp.calls[1].url, 'https://example.invalid/api/v2/categories');
  assert.equal(readHttp.calls[1].headers.Authorization, 'Bearer another-secret-token');
  assert.equal(readHttp.calls[1].headers['X-Aukro-Api-Key'], 'synthetic-api-key');

  const createHttp = new FakeHttpService();
  createHttp.queue.push({ status: 200, data: { bearerToken: 'create-secret-token' } });
  createHttp.queue.push({ status: 201, data: { offerId: 'offer-1', status: 'ACTIVE' } });
  const createClient = new AukroPublicApiClient(createHttp as any, new FakeConfigService(completeConfig) as any);
  const created = await createClient.createOffer(offer);
  assert.equal(created.ok, true);
  assert.equal(createHttp.calls[1].method, 'POST');
  assert.equal(createHttp.calls[1].url, 'https://example.invalid/api/v2/offers-v2');
  assert.equal(createHttp.calls[1].data.name, 'Synthetic offer');

  const errorHttp = new FakeHttpService();
  errorHttp.queue.push({
    code: 'ECONNABORTED',
    message: 'failed with password synthetic-password and Bearer leaked-token',
    response: {
      status: 500,
      data: {
        message: 'apiKey synthetic-api-key token leaked-token',
        authorization: 'Bearer leaked-token',
      },
    },
  });
  const errorClient = new AukroPublicApiClient(errorHttp as any, new FakeConfigService(completeConfig) as any);
  const failedAuth = await errorClient.authenticate();
  assert.equal(failedAuth.ok, false);
  assert.equal(failedAuth.error?.retryable, true);
  assert.equal(JSON.stringify(failedAuth).includes('synthetic-password'), false);
  assert.equal(JSON.stringify(failedAuth).includes('synthetic-api-key'), false);
  assert.equal(JSON.stringify(failedAuth).includes('leaked-token'), false);

  const webhookHttp = new FakeHttpService();
  webhookHttp.queue.push({ status: 200, data: { token: 'webhook-token' } });
  webhookHttp.queue.push({ status: 200, data: { authorizationSet: true } });
  webhookHttp.queue.push({ status: 200, data: { subscriptions: [] } });
  webhookHttp.queue.push({ status: 200, data: { count: 0 } });
  const webhookClient = new AukroPublicApiClient(webhookHttp as any, new FakeConfigService(completeConfig) as any);
  const webhookStatus = await webhookClient.getWebhookStatus();
  assert.equal(webhookStatus.ok, true);
  assert.equal(webhookHttp.calls[1].url, 'https://example.invalid/api/v2/webhook/settings');
  assert.equal(webhookHttp.calls[2].url, 'https://example.invalid/api/v2/webhook/subscriptions');
  assert.equal(webhookHttp.calls[3].url, 'https://example.invalid/api/v2/webhook/event/failed/count');
}

run();
