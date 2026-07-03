process.env.LOGGING_SERVICE_URL = process.env.LOGGING_SERVICE_URL || 'http://logging-microservice:3209';

const { strict: assert } = require('assert');
const { AUKRO_ORDER_AFFINITY_REPLAY_CONTRACT, OrdersService } = require('./orders.service');

const accountId = '11111111-1111-4111-8111-111111111111';
const catalogProductId = '22222222-2222-4222-8222-222222222222';
const otherCatalogProductId = '33333333-3333-4333-8333-333333333333';
const warehouseId = '55555555-5555-4555-8555-555555555555';
const otherWarehouseId = '66666666-6666-4666-8666-666666666666';

function createHarness(offers: any[] = [], stockRows: any[] = [], overrides: any = {}) {
  const centralOrders: any[] = [];
  const updates: any[] = [];
  const offerQueries: any[] = [];
  const errors: string[] = [];
  const stockLookups: string[] = [];

  const prisma = {
    aukroOrder: {
      create: async (args: any) => ({
        id: 'order-local-1',
        accountId: args.data.accountId,
        aukroOrderId: args.data.aukroOrderId,
        customerEmail: args.data.customerEmail || 'buyer@example.test',
        customerPhone: args.data.customerPhone || null,
        total: args.data.total ?? 299,
        currency: args.data.currency || 'CZK',
        status: args.data.status || 'pending',
        rawData: args.data.rawData,
        createdAt: new Date('2026-06-26T10:00:00.000Z'),
      }),
      update: async (args: any) => {
        updates.push(args);
        return { id: args.where.id, ...args.data };
      },
      findMany: async (args: any) => overrides.localOrders ?? [{ id: 'order-local-1', ...args.where }],
      findUnique: async (args: any) => args.where?.id === 'order-local-1' ? { id: 'order-local-1' } : null,
    },
    aukroOffer: {
      findFirst: async (args: any) => {
        offerQueries.push(args);
        const accountScoped = offers.filter((offer) => offer.accountId === args.where.accountId);
        return accountScoped.find((offer) => args.where.OR.some((condition: any) => {
          if (condition.id) return offer.id === condition.id;
          if (condition.aukroOfferId) return offer.aukroOfferId === condition.aukroOfferId;
          return false;
        })) || null;
      },
    },
    aukroAccount: {
      findMany: async () => [{ id: accountId, isActive: true }],
    },
  };

  const orderClient = {
    createOrder: async (payload: any) => {
      centralOrders.push(payload);
      return { id: 'central-order-1' };
    },
  };

  const warehouseClient = {
    getStockByProduct: async (productId: string) => {
      stockLookups.push(productId);
      return stockRows.filter((row) => row.productId === productId);
    },
  };

  const logger = {
    setContext() {},
    log() {},
    warn() {},
    error(message: string) { errors.push(message); },
  };

  const service = new OrdersService(prisma as any, orderClient as any, warehouseClient as any, logger as any);
  return { service, centralOrders, updates, offerQueries, errors, stockLookups };
}

async function run() {
  const readScope = createHarness();
  await assert.rejects(() => readScope.service.findAll({}, { roles: [] }), /Aukro order read requires admin role/);
  const readable = await readScope.service.findAll({ status: 'pending' }, { roles: ['app:aukro-service:admin'] });
  assert.equal(readable[0].status, 'pending');
  await assert.rejects(() => readScope.service.findOne('order-local-1', { roles: [] }), /Aukro order read requires admin role/);
  const detail = await readScope.service.findOne('order-local-1', { roles: ['global:superadmin'] });
  assert.equal(detail.id, 'order-local-1');

  const mapped = createHarness([
    {
      id: '44444444-4444-4444-8444-444444444444',
      accountId,
      aukroOfferId: 'aukro-offer-123',
      productId: catalogProductId,
    },
  ], [
    { productId: catalogProductId, warehouseId, quantity: 5, reserved: 1, available: 4 },
  ]);

  await mapped.service.create({
    accountId,
    aukroOrderId: 'aukro-order-1',
    customerEmail: 'buyer@example.test',
    total: 251,
    currency: 'CZK',
    rawData: {
      items: [{
        offerId: 'aukro-offer-123',
        productId: 'raw-aukro-product-id-is-not-canonical',
        sku: 'SKU-123',
        title: 'Mapped item',
        quantity: 2,
        unitPrice: '125.50',
        totalPrice: '251.00',
      }],
    },
  });

  assert.equal(mapped.centralOrders.length, 1);
  assert.equal(mapped.centralOrders[0].externalOrderId, 'aukro-order-1');
  assert.equal(mapped.centralOrders[0].channel, 'aukro');
  assert.equal(mapped.centralOrders[0].channelAccountId, accountId);
  assert.equal(mapped.centralOrders[0].total, 251);
  assert.equal(mapped.centralOrders[0].items.length, 1);
  assert.equal(mapped.centralOrders[0].items[0].productId, catalogProductId);
  assert.equal(mapped.centralOrders[0].items[0].warehouseId, warehouseId);
  assert.equal(mapped.centralOrders[0].items[0].quantity, 2);
  assert.equal(mapped.centralOrders[0].items[0].unitPrice, 125.5);
  assert.equal(mapped.centralOrders[0].items[0].totalPrice, 251);
  assert.equal(mapped.updates[0].data.forwarded, true);

  const explicit = createHarness([], [
    { productId: otherCatalogProductId, warehouseId: otherWarehouseId, quantity: 3, reserved: 0, available: 3 },
  ]);
  await explicit.service.create({
    accountId,
    aukroOrderId: 'aukro-order-2',
    total: 50,
    rawData: {
      items: [{
        productId: otherCatalogProductId,
        productIdSource: 'catalog',
        title: 'Explicit catalog item',
        quantity: 1,
        price: 50,
      }],
    },
  });

  assert.equal(explicit.offerQueries.length, 0);
  assert.equal(explicit.centralOrders.length, 1);
  assert.equal(explicit.centralOrders[0].items[0].productId, otherCatalogProductId);
  assert.equal(explicit.centralOrders[0].items[0].warehouseId, otherWarehouseId);

  const explicitWarehouse = createHarness([], [
    { productId: otherCatalogProductId, warehouseId: otherWarehouseId, quantity: 1, reserved: 0, available: 1 },
  ]);
  await explicitWarehouse.service.create({
    accountId,
    aukroOrderId: 'aukro-order-2b',
    total: 50,
    rawData: {
      items: [{
        productId: otherCatalogProductId,
        productIdSource: 'catalog',
        warehouseId: otherWarehouseId,
        title: 'Explicit catalog and warehouse item',
        quantity: 1,
        price: 50,
      }],
    },
  });

  assert.equal(explicitWarehouse.centralOrders.length, 1);
  assert.equal(explicitWarehouse.centralOrders[0].items[0].warehouseId, otherWarehouseId);

  const unmapped = createHarness();
  await assert.rejects(() => unmapped.service.create({
    accountId,
    aukroOrderId: 'aukro-order-3',
    total: 75,
    rawData: {
      items: [{
        productId: 'raw-aukro-product-id-is-not-canonical',
        title: 'Unmapped item',
        quantity: 1,
        price: 75,
      }],
    },
  }), /could not be mapped to a Catalog product/);

  assert.equal(unmapped.centralOrders.length, 0);
  assert.equal(unmapped.updates.length, 0);
  assert.equal(unmapped.errors.length, 1);
  assert.match(unmapped.errors[0], /could not be mapped to a Catalog product/);

  const missingWarehouse = createHarness([
    {
      id: '77777777-7777-4777-8777-777777777777',
      accountId,
      aukroOfferId: 'aukro-offer-456',
      productId: catalogProductId,
    },
  ], []);

  await assert.rejects(() => missingWarehouse.service.create({
    accountId,
    aukroOrderId: 'aukro-order-4',
    total: 75,
    rawData: {
      items: [{
        offerId: 'aukro-offer-456',
        title: 'Warehouse missing item',
        quantity: 1,
        price: 75,
      }],
    },
  }), /ORDER_FORWARDING_WAREHOUSE_ID_MISSING/);

  assert.equal(missingWarehouse.centralOrders.length, 0);
  assert.equal(missingWarehouse.updates.length, 0);
  const replay = createHarness([], [], {
    localOrders: [
      {
        id: 'local-order-1',
        aukroOrderId: 'sensitive-aukro-order-1',
        total: 750,
        currency: 'CZK',
        status: 'paid',
        createdAt: new Date('2026-07-03T09:00:00.000Z'),
        rawData: {
          customerEmail: 'buyer@example.invalid',
          deliveryAddress: { city: 'Do not expose' },
          items: [
            { catalogProductId: catalogProductId, sku: 'SKU-1', quantity: 2, unitPrice: 100, totalPrice: 200 },
            { productId: otherCatalogProductId, productIdSource: 'catalog', quantity: 1, price: 550, total: 550 },
          ],
        },
      },
      {
        id: 'local-order-2',
        aukroOrderId: 'single-product-order',
        currency: 'CZK',
        createdAt: new Date('2026-07-03T10:00:00.000Z'),
        rawData: { items: [{ catalogProductId, quantity: 1, price: 100 }] },
      },
    ],
  } as any);

  const replayResult = await replay.service.getOrderAffinityReplayCandidates({ limit: 10, from: '2026-07-01T00:00:00.000Z' });
  assert.equal(replayResult.contract, AUKRO_ORDER_AFFINITY_REPLAY_CONTRACT);
  assert.equal(replayResult.sourceOwner, 'aukro-service');
  assert.equal(replayResult.consumerOwner, 'marketing-microservice');
  assert.equal(replayResult.channel, 'aukro');
  assert.equal(replayResult.count, 1);
  assert.equal(replayResult.skippedRecords, 1);
  assert.equal(replayResult.events[0].source, 'aukro-service');
  assert.equal(replayResult.events[0].payload.channel, 'aukro');
  assert.equal(replayResult.events[0].payload.items.length, 2);
  const serializedReplay = JSON.stringify(replayResult);
  assert.equal(serializedReplay.includes('buyer@example.invalid'), false);
  assert.equal(serializedReplay.includes('Do not expose'), false);
  assert.equal(serializedReplay.includes('sensitive-aukro-order-1'), false);

}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
