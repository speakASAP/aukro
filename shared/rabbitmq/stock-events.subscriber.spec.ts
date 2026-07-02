import { strict as assert } from 'assert';
import { StockEventsSubscriber } from './stock-events.subscriber';

const productId = '22222222-2222-4222-8222-222222222222';

function makeLogger() {
  return { log: () => undefined, warn: () => undefined, error: () => undefined } as any;
}

async function main() {
  const updates: any[] = [];
  const offer = { id: 'offer-1', aukroOfferId: 'A-1', stockQuantity: 5, isActive: true, rawData: {} };
  const prisma = {
    aukroOffer: {
      findMany: async () => [offer],
      update: async (args: any) => {
        updates.push(args);
        return { ...offer, ...args.data };
      },
    },
  } as any;
  const service = new StockEventsSubscriber(makeLogger(), prisma);

  await (service as any).handleStockEvent({ eventId: 'stock-out-1', type: 'stock.out', productId, available: 5 });

  assert.equal(updates.length, 1);
  assert.equal(updates[0].data.stockQuantity, 0);
  assert.equal(updates[0].data.isActive, false);
  assert.equal(updates[0].data.rawData.warehouseStockSync.eventId, 'stock-out-1');
  assert.equal(updates[0].data.rawData.warehouseStockSync.externalBlocker, '[MISSING: approved Aukro external de-listing endpoint/policy]');

  const idempotentPrisma = {
    aukroOffer: {
      findMany: async () => [{ ...offer, rawData: { warehouseStockSync: { eventId: 'stock-out-1', status: 'applied', targetQuantity: 0 } } }],
      update: async (args: any) => {
        updates.push(args);
        return args;
      },
    },
  } as any;
  const idempotent = new StockEventsSubscriber(makeLogger(), idempotentPrisma);
  await (idempotent as any).handleStockEvent({ eventId: 'stock-out-1', type: 'stock.out', productId });
  assert.equal(updates.length, 1);

  console.log('PASS aukro stock-events subscriber spec');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
