import { MpFeedCatalogProductInput } from './mp-feed.types';

const checkedAt = '2026-07-01T00:00:00.000Z';

export function createBuyNowCatalogFixture(overrides: Partial<MpFeedCatalogProductInput> = {}): MpFeedCatalogProductInput {
  return {
    catalogProductId: 'SKU-1001',
    sku: 'SKU-1001',
    name: 'Synthetic Buy Now Product',
    description: 'Synthetic description for MP XML feed.',
    offerType: 'BUY_NOW',
    duration: 30,
    place: 'Praha',
    fields: [
      { id: 11, name: 'Barva', value: 'cerna' },
      { id: 12, name: 'Stav', value: 'nove' },
    ],
    evidence: createPassedEvidence({ buyNowPrice: 199 }),
    ...overrides,
  };
}

export function createAuctionCatalogFixture(overrides: Partial<MpFeedCatalogProductInput> = {}): MpFeedCatalogProductInput {
  return createBuyNowCatalogFixture({
    catalogProductId: 'SKU-2002',
    name: 'Synthetic Auction Product',
    description: 'Auction description.',
    offerType: 'AUCTION',
    duration: 7,
    evidence: createPassedEvidence({ startingPrice: 49 }),
    ...overrides,
  });
}

export function createPassedEvidence(price: { buyNowPrice?: number; startingPrice?: number }) {
  return {
    approval: { passed: true, checkedAt, source: 'synthetic-test', approvedBy: 'operator:synthetic' },
    policy: { passed: true, checkedAt, source: 'synthetic-test', reasonCodes: [] },
    category: { passed: true, checkedAt, source: 'synthetic-test', categoryId: 12345 },
    price: { passed: true, checkedAt, source: 'synthetic-test', currency: 'CZK', ...price },
    stock: { passed: true, checkedAt, source: 'synthetic-test', quantity: 3, unit: 'ks' },
    shipment: { passed: true, checkedAt, source: 'synthetic-test', method: 'Balikovna', price: 79, currency: 'CZK', templateId: 'ship-1' },
    images: [
      { passed: true, checkedAt, source: 'synthetic-test', url: 'https://cdn.example.invalid/images/sku-1001-1.jpg', position: 1, alt: 'front' },
      { passed: true, checkedAt, source: 'synthetic-test', url: 'https://cdn.example.invalid/images/sku-1001-2.jpg', position: 2, alt: 'side' },
    ],
  };
}
