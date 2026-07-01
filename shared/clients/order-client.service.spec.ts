process.env.LOGGING_SERVICE_URL = process.env.LOGGING_SERVICE_URL || 'http://logging-microservice:3209';

const { strict: assert } = require('assert');
const { of } = require('rxjs');
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

function createHarness() {
  const requests = [];
  const httpService = {
    post: (url, payload, options) => {
      requests.push({ url, payload, options });
      return of({ data: { data: { id: 'central-order-1' } } });
    },
  };
  const logger = { log() {}, warn() {}, error() {} };
  return { client: new OrderClientService(httpService, logger), requests };
}

async function run() {
  const previousToken = process.env.AUKRO_INTERNAL_SERVICE_TOKEN;
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

    await assert.rejects(() => harness.client.createOrder({
      ...baseOrder,
      items: [{ ...baseOrder.items[0], warehouseId: '' }],
    }), /ORDER_FORWARDING_WAREHOUSE_ID_MISSING/);

    delete process.env.AUKRO_INTERNAL_SERVICE_TOKEN;
    const missingTokenHarness = createHarness();
    await assert.rejects(() => missingTokenHarness.client.createOrder(baseOrder), /ORDER_SERVICE_AUTH_TOKEN_MISSING/);
    assert.equal(missingTokenHarness.requests.length, 0);
  } finally {
    if (previousToken === undefined) {
      delete process.env.AUKRO_INTERNAL_SERVICE_TOKEN;
    } else {
      process.env.AUKRO_INTERNAL_SERVICE_TOKEN = previousToken;
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
