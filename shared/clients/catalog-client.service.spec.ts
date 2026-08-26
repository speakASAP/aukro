export {};

process.env.LOGGING_SERVICE_URL = process.env.LOGGING_SERVICE_URL || 'http://logging-microservice:3209';

const { strict: assert } = require('assert');
const { of } = require('rxjs');
const { CatalogClientService } = require('./catalog-client.service');

function createHarness() {
  const requests: any[] = [];
  const httpService = {
    get: (url: string, options: any) => {
      requests.push({ method: 'GET', url, options });
      return of({ data: { success: true, data: [] } });
    },
    post: (url: string, payload: any, options: any) => {
      requests.push({ method: 'POST', url, payload, options });
      return of({ data: { success: true, data: {} } });
    },
    put: (url: string, payload: any, options: any) => {
      requests.push({ method: 'PUT', url, payload, options });
      return of({ data: { success: true, data: {} } });
    },
  };
  const logger = { log() {}, warn() {}, error() {}, setContext() {} };
  return { client: new CatalogClientService(httpService, logger), requests };
}

async function run() {
  const saved = {
    catalog: process.env.CATALOG_SERVICE_TOKEN,
    jwt: process.env.JWT_TOKEN,
    service: process.env.SERVICE_TOKEN,
  };

  try {
    // The per-pair RS256 principal is sent as a Bearer token.
    delete process.env.JWT_TOKEN;
    delete process.env.SERVICE_TOKEN;
    process.env.CATALOG_SERVICE_TOKEN = 'catalog-pair-token';

    const harness = createHarness();
    await harness.client.searchProducts({ limit: 1 });
    assert.equal(harness.requests.length, 1);
    assert.equal(
      harness.requests[0].options.headers.Authorization,
      'Bearer catalog-pair-token',
    );

    // An already-prefixed value must not be double-prefixed.
    process.env.CATALOG_SERVICE_TOKEN = 'Bearer prefixed-catalog-token';
    const prefixed = createHarness();
    await prefixed.client.searchProducts({ limit: 1 });
    assert.equal(
      prefixed.requests[0].options.headers.Authorization,
      'Bearer prefixed-catalog-token',
    );

    // JWT_TOKEN must NOT be reachable: it holds the shared a2880693 docs-rag
    // credential, which catalog rejects. Falling through to it is what made this
    // lane return 401 instead of failing with a clear configuration error.
    delete process.env.CATALOG_SERVICE_TOKEN;
    process.env.JWT_TOKEN = 'shared-a2880693-value';
    const sharedOnly = createHarness();
    await assert.rejects(
      () => sharedOnly.client.searchProducts({ limit: 1 }),
      /CATALOG_SERVICE_AUTH_TOKEN_MISSING/,
    );
    assert.equal(sharedOnly.requests.length, 0);

    // With no credential at all, the client must raise rather than send an
    // unauthenticated request (previously `return {}`).
    delete process.env.JWT_TOKEN;
    const noToken = createHarness();
    await assert.rejects(
      () => noToken.client.searchProducts({ limit: 1 }),
      /CATALOG_SERVICE_AUTH_TOKEN_MISSING/,
    );
    assert.equal(noToken.requests.length, 0);

    // SERVICE_TOKEN remains a valid fallback.
    process.env.SERVICE_TOKEN = 'generic-service-token';
    const generic = createHarness();
    await generic.client.searchProducts({ limit: 1 });
    assert.equal(
      generic.requests[0].options.headers.Authorization,
      'Bearer generic-service-token',
    );
  } finally {
    for (const [key, value] of [
      ['CATALOG_SERVICE_TOKEN', saved.catalog],
      ['JWT_TOKEN', saved.jwt],
      ['SERVICE_TOKEN', saved.service],
    ] as const) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
