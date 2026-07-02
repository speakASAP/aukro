import { strict as assert } from 'assert';
import { AukroAvailabilityReconciliationService } from './offer-availability-reconciliation.service';

const productId = '22222222-2222-4222-8222-222222222222';

function makeOffer(overrides: any = {}) {
  return {
    id: overrides.id || 'offer-1',
    productId,
    aukroOfferId: 'A-1',
    stockQuantity: 3,
    isActive: true,
    rawData: {},
    ...overrides,
  };
}

function makeHarness(input: { offers: any[]; catalogProducts?: Record<string, any>; warehouseAvailable?: Record<string, number> }) {
  const offers = input.offers.map((offer) => ({ ...offer }));
  const updates: any[] = [];
  const prisma = {
    aukroOffer: {
      findMany: async () => offers.filter((offer) => offer.productId && (offer.isActive === true || Number(offer.stockQuantity) > 0)),
      update: async (args: any) => {
        updates.push(args);
        const index = offers.findIndex((offer) => offer.id === args.where.id);
        offers[index] = { ...offers[index], ...args.data };
        return offers[index];
      },
    },
  } as any;
  const catalogClient = {
    getProductById: async (id: string) => {
      if (!(id in (input.catalogProducts || {}))) throw new Error('Product not found');
      return input.catalogProducts?.[id];
    },
  } as any;
  const warehouseClient = {
    getTotalAvailable: async (id: string) => input.warehouseAvailable?.[id] ?? 0,
  } as any;
  const logger = { setContext: () => undefined, log: () => undefined, warn: () => undefined, error: () => undefined } as any;
  const service = new AukroAvailabilityReconciliationService(prisma, catalogClient, warehouseClient, logger);
  return { service, updates, offers };
}

async function main() {
  {
    const { service, updates } = makeHarness({
      offers: [makeOffer()],
      catalogProducts: {},
      warehouseAvailable: { [productId]: 5 },
    });

    const result = await service.reconcile({ now: new Date('2026-07-02T10:00:00.000Z') });

    assert.equal(result.disabled, 1);
    assert.equal(updates[0].data.stockQuantity, 0);
    assert.equal(updates[0].data.isActive, false);
    assert.equal(updates[0].data.rawData.availabilityReconciliation.reason, 'catalog_product_missing');
    assert.equal(updates[0].data.rawData.availabilityReconciliation.externalBlocker, '[MISSING: approved Aukro external de-listing endpoint/policy]');
    assert.equal(updates[0].data.rawData.publishQueue.status, 'blocked');
  }

  {
    const { service, updates } = makeHarness({
      offers: [makeOffer({ stockQuantity: 7 })],
      catalogProducts: { [productId]: { id: productId, status: 'active', isActive: true, isSellable: true } },
      warehouseAvailable: { [productId]: 0 },
    });

    const result = await service.reconcile();

    assert.equal(result.disabled, 1);
    assert.equal(updates[0].data.rawData.availabilityReconciliation.reason, 'warehouse_stock_unavailable');
    assert.equal(updates[0].data.rawData.availabilityReconciliation.warehouseAvailable, 0);
  }

  {
    const { service, updates } = makeHarness({
      offers: [makeOffer({ stockQuantity: 1 })],
      catalogProducts: { [productId]: { id: productId, isActive: false } },
      warehouseAvailable: { [productId]: 8 },
    });

    const first = await service.reconcile();
    const second = await service.reconcile();

    assert.equal(first.disabled, 1);
    assert.equal(second.scanned, 0);
    assert.equal(second.disabled, 0);
    assert.equal(updates.length, 1);
  }

  console.log('PASS aukro availability reconciliation service spec');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
