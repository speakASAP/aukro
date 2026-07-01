process.env.LOGGING_SERVICE_URL = process.env.LOGGING_SERVICE_URL || 'http://logging-microservice:3209';

import { strict as assert } from 'assert';
import { of } from 'rxjs';
import { OrderClientService } from '@aukro/shared';
import { OrdersService } from './orders.service';

const accountId = 'synthetic-aukro-account-smoke';
const catalogProductId = '22222222-2222-4222-8222-222222222222';
const warehouseId = '55555555-5555-4555-8555-555555555555';
const externalOrderId = 'synthetic-aukro-order-smoke';

type CapturedRequest = {
  url: string;
  payload: any;
  headerNames: string[];
  hasInternalTokenHeader: boolean;
  serviceName: string;
};

function assertRuntimeTokenPresence() {
  if (!process.env.AUKRO_INTERNAL_SERVICE_TOKEN?.trim()) {
    throw new Error('ORDER_SYNTHETIC_SMOKE_TOKEN_MISSING');
  }
}

function createOrderClientHarness() {
  const requests: CapturedRequest[] = [];
  const httpService = {
    post: (url: string, payload: any, options: any) => {
      const headers = options?.headers || {};
      requests.push({
        url,
        payload,
        headerNames: Object.keys(headers).sort(),
        hasInternalTokenHeader: Boolean(headers['x-internal-service-token']),
        serviceName: headers['x-service-name'],
      });
      return of({ data: { data: { id: 'synthetic-central-order-smoke' } } });
    },
  };
  const logger = { log() {}, warn() {}, error() {} };
  return {
    orderClient: new OrderClientService(httpService as any, logger as any),
    requests,
  };
}

function createOrdersServiceHarness() {
  const { orderClient, requests } = createOrderClientHarness();
  const updates: any[] = [];
  const stockLookups: string[] = [];
  const offerLookups: any[] = [];
  const logs: string[] = [];

  const prisma = {
    aukroOrder: {
      create: async (args: any) => ({
        id: 'synthetic-local-order-smoke',
        accountId: args.data.accountId,
        aukroOrderId: args.data.aukroOrderId,
        customerEmail: args.data.customerEmail,
        customerPhone: args.data.customerPhone,
        total: args.data.total,
        currency: args.data.currency,
        status: args.data.status,
        rawData: args.data.rawData,
        createdAt: new Date('2026-07-01T00:00:00.000Z'),
      }),
      update: async (args: any) => {
        updates.push(args);
        return { id: args.where.id, ...args.data };
      },
      findUnique: async () => null,
    },
    aukroOffer: {
      findFirst: async (args: any) => {
        offerLookups.push(args);
        return null;
      },
    },
    aukroAccount: {
      findMany: async () => {
        throw new Error('ORDER_SYNTHETIC_SMOKE_ACCOUNT_LOOKUP_FORBIDDEN');
      },
    },
  };

  const warehouseClient = {
    getStockByProduct: async (productId: string) => {
      stockLookups.push(productId);
      return [{
        productId,
        warehouseId,
        quantity: 3,
        reserved: 0,
        available: 3,
      }];
    },
  };

  const logger = {
    setContext() {},
    log(message: string) { logs.push(message); },
    warn(message: string) { logs.push(message); },
    error(message: string) { logs.push(message); },
  };

  return {
    service: new OrdersService(prisma as any, orderClient as any, warehouseClient as any, logger as any),
    requests,
    updates,
    stockLookups,
    offerLookups,
    logs,
  };
}

async function run() {
  assertRuntimeTokenPresence();

  const harness = createOrdersServiceHarness();
  await harness.service.create({
    accountId,
    aukroOrderId: externalOrderId,
    customerEmail: undefined,
    customerPhone: undefined,
    total: 19.9,
    currency: 'CZK',
    status: 'synthetic_smoke',
    rawData: {
      items: [{
        productId: catalogProductId,
        productIdSource: 'catalog',
        warehouseId,
        title: 'Synthetic smoke item',
        quantity: 1,
        unitPrice: '19.90',
        totalPrice: '19.90',
      }],
    },
  });

  assert.equal(harness.requests.length, 1);
  assert.equal(harness.requests[0].url.endsWith('/api/orders'), true);
  assert.equal(harness.requests[0].payload.contractVersion, 'orders.create.v1');
  assert.equal(harness.requests[0].payload.externalOrderId, externalOrderId);
  assert.equal(harness.requests[0].payload.channel, 'aukro');
  assert.equal(harness.requests[0].payload.channelAccountId, accountId);
  assert.equal(harness.requests[0].payload.items.length, 1);
  assert.equal(harness.requests[0].payload.items[0].productId, catalogProductId);
  assert.equal(harness.requests[0].payload.items[0].warehouseId, warehouseId);
  assert.equal(harness.requests[0].payload.items[0].quantity, 1);
  assert.equal(harness.requests[0].hasInternalTokenHeader, true);
  assert.equal(harness.requests[0].serviceName, 'aukro-service');
  assert.deepEqual(harness.requests[0].headerNames, ['x-internal-service-token', 'x-service-name']);
  assert.deepEqual(harness.stockLookups, [catalogProductId]);
  assert.equal(harness.offerLookups.length, 0);
  assert.equal(harness.updates.length, 1);
  assert.equal(harness.updates[0].data.forwarded, true);
  assert.equal(harness.updates[0].data.orderId, 'synthetic-central-order-smoke');

  console.log(JSON.stringify({
    ok: true,
    smoke: 'orders.create.synthetic.v1',
    contractVersion: harness.requests[0].payload.contractVersion,
    network: {
      ordersMicroservice: 'mocked',
      warehouseMicroservice: 'synthetic-in-memory',
      database: 'synthetic-in-memory',
      marketplace: 'not-called',
      payments: 'not-called',
    },
    auth: {
      tokenEnvName: 'AUKRO_INTERNAL_SERVICE_TOKEN',
      tokenPresent: true,
      headerNames: harness.requests[0].headerNames,
      tokenValuePrinted: false,
    },
    payload: {
      channel: harness.requests[0].payload.channel,
      channelAccountId: harness.requests[0].payload.channelAccountId,
      itemCount: harness.requests[0].payload.items.length,
      productIdSource: 'catalog',
      warehouseIdSource: 'synthetic-warehouse-row',
      customerDataIncluded: false,
      paymentDataIncluded: false,
    },
  }));
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
