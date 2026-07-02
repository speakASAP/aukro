import { strict as assert } from 'assert';
import { CatalogProductEventsSubscriber } from './catalog-product-events.subscriber';

const productId = '22222222-2222-4222-8222-222222222222';

function makeLogger() {
  return { log: () => undefined, warn: () => undefined, error: () => undefined } as any;
}

async function main() {
  const updates: any[] = [];
  const offer = { id: 'offer-1', aukroOfferId: 'A-1', stockQuantity: 3, isActive: true, rawData: {} };
  const prisma = {
    aukroOffer: {
      findMany: async () => [offer],
      update: async (args: any) => {
        updates.push(args);
        return { ...offer, ...args.data };
      },
    },
  } as any;
  const service = new CatalogProductEventsSubscriber(makeLogger(), prisma);

  await (service as any).handleCatalogProductEvent({ eventId: 'catalog-archived-1', type: 'catalog.product.archived.v1', productId });

  assert.equal(updates.length, 1);
  assert.equal(updates[0].data.stockQuantity, 0);
  assert.equal(updates[0].data.isActive, false);
  assert.equal(updates[0].data.rawData.catalogProductAvailabilitySync.reason, 'catalog_product_archived');
  assert.equal(updates[0].data.rawData.catalogProductAvailabilitySync.externalBlocker, '[MISSING: approved Aukro external de-listing endpoint/policy]');

  await (service as any).handleCatalogProductEvent({ eventId: 'catalog-updated-1', type: 'catalog.product.updated.v1', productId, afterSellable: true });
  assert.equal(updates.length, 1);

  console.log('PASS aukro catalog-product-events subscriber spec');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
