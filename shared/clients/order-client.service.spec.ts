process.env.LOGGING_SERVICE_URL = process.env.LOGGING_SERVICE_URL || 'http://logging-microservice:3209';

const { strict: assert } = require('assert');
const { of, throwError } = require('rxjs');
const { OrderClientService } = require('./order-client.service');

const baseOrder = {
  externalOrderId: 'aukro-order-1',
  channel: 'aukro',
  channelAccountId: 'aukro-account-1',
  items: [{
    productId: '22222222-2222-4222-8222-222222222222',
    warehouseId: '55555555-5555-4555-8555-555555555555',
    title: 'Mapped item',
    quantity: 1,
    unitPrice: 10,
    totalPrice: 10,
  }],
  subtotal: 10,
  shippingCost: 0,
  taxAmount: 0,
  total: 10,
  currency: 'CZK',
};

function createHarness(getError = null) {
  const requests = [];
  const httpService = {
    post: (url, payload, options) => {
      requests.push({ method: 'POST', url, payload, options });
      return of({ data: { data: { id: 'central-order-1' } } });
    },
    get: (url, options) => {
      requests.push({ method: 'GET', url, options });
      if (getError) {
        return throwError(() => getError);
      }
      return of({
        data: {
          data: {
            id: 'central-order-1',
            status: 'paid',
            lifecycleStage: 'paid_not_delivered',
            paymentStatus: 'paid',
          },
        },
      });
    },
  };
  const warnings = [];
  const logger = { log() {}, warn(message) { warnings.push(message); }, error() {} };
  return { client: new OrderClientService(httpService, logger), requests, warnings };
}

async function run() {
  const previousToken = process.env.AUKRO_INTERNAL_SERVICE_TOKEN;
  const previousUrl = process.env.ORDER_SERVICE_URL;
  try {
    process.env.AUKRO_INTERNAL_SERVICE_TOKEN = 'test-orders-token';

    const harness = createHarness();
    const created = await harness.client.createOrder(baseOrder);

    assert.equal(created.id, 'central-order-1');
    assert.equal(harness.requests.length, 1);
    assert.equal(harness.requests[0].options.headers['x-internal-service-token'], 'test-orders-token');
    assert.equal(harness.requests[0].options.headers['x-service-name'], 'aukro-service');
    assert.equal(harness.requests[0].payload.contractVersion, 'orders.create.v1');
    assert.equal(harness.requests[0].payload.channelAccountId, 'aukro-account-1');

    const centralOrder = await harness.client.getOrderReadModel('central-order-1');
    assert.equal(centralOrder.id, 'central-order-1');
    assert.equal(centralOrder.status, 'paid');
    assert.equal(centralOrder.lifecycleStage, 'paid_not_delivered');
    assert.equal(harness.requests[1].method, 'GET');
    assert.equal(harness.requests[1].url.endsWith('/api/orders/central-order-1'), true);
    assert.equal(harness.requests[1].options.headers['x-internal-service-token'], 'test-orders-token');

    await assert.rejects(() => harness.client.createOrder({
      ...baseOrder,
      items: [{ ...baseOrder.items[0], warehouseId: '' }],
    }), /ORDER_FORWARDING_WAREHOUSE_ID_MISSING/);

    delete process.env.AUKRO_INTERNAL_SERVICE_TOKEN;
    const missingTokenHarness = createHarness();
    await assert.rejects(() => missingTokenHarness.client.createOrder(baseOrder), /ORDER_SERVICE_AUTH_TOKEN_MISSING/);
    assert.equal(missingTokenHarness.requests.length, 0);

    const missingTokenRead = await missingTokenHarness.client.getOrderReadModel('central-order-1');
    assert.equal(missingTokenRead, null);
    assert.equal(missingTokenHarness.requests.length, 0);

    process.env.AUKRO_INTERNAL_SERVICE_TOKEN = 'test-orders-token';
    const forbiddenHarness = createHarness({ response: { status: 403 }, message: 'Forbidden' });
    const forbiddenRead = await forbiddenHarness.client.getOrderReadModel('central-order-1');
    assert.equal(forbiddenRead, null);
    assert.equal(forbiddenHarness.requests.length, 1);
    assert.equal(forbiddenHarness.warnings[0].includes('HTTP_403'), true);
  } finally {
    if (previousToken === undefined) {
      delete process.env.AUKRO_INTERNAL_SERVICE_TOKEN;
    } else {
      process.env.AUKRO_INTERNAL_SERVICE_TOKEN = previousToken;
    }
  }

  if (previousUrl === undefined) {
    delete process.env.ORDER_SERVICE_URL;
  } else {
    process.env.ORDER_SERVICE_URL = previousUrl;
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
