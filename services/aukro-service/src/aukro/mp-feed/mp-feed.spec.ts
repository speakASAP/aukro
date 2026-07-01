import { strict as assert } from 'assert';
import { mapCatalogProductsToMpFeedProducts, mapCatalogProductToMpFeedProduct } from './mp-feed.mapper';
import { MP_FEED_MAX_PRODUCTS, MpFeedValidationError } from './mp-feed.types';
import { generateMpFeedXml } from './mp-feed.xml';
import { createAuctionCatalogFixture, createBuyNowCatalogFixture } from './mp-feed.fixtures';

function assertValidationCode(error: unknown, code: string) {
  assert.ok(error instanceof MpFeedValidationError, `expected MpFeedValidationError, got ${String(error)}`);
  assert.equal((error as MpFeedValidationError).code, code);
}

function run() {
  const buyNow = mapCatalogProductToMpFeedProduct(createBuyNowCatalogFixture());
  assert.equal(buyNow.externalId, 'catalog-sku-1001');
  assert.equal(buyNow.buyNowPrice, 199);
  assert.equal(buyNow.offerType, 'BUY_NOW');

  const auction = mapCatalogProductToMpFeedProduct(createAuctionCatalogFixture());
  assert.equal(auction.externalId, 'catalog-sku-2002');
  assert.equal(auction.startingPrice, 49);
  assert.equal(auction.offerType, 'AUCTION');

  const escapedProduct = mapCatalogProductToMpFeedProduct(createBuyNowCatalogFixture({
    catalogProductId: 'ESC-1',
    name: 'A & B <C> "D"',
    description: 'Use <safe> & quoted "text" with apostrophe \'ok\'.',
    fields: [{ name: 'Material & size', value: '5 < 7' }],
  }));
  const escapedXml = generateMpFeedXml([escapedProduct]).xml;
  assert.ok(escapedXml.includes('A &amp; B &lt;C&gt; &quot;D&quot;'));
  assert.ok(escapedXml.includes('Use &lt;safe&gt; &amp; quoted &quot;text&quot; with apostrophe &apos;ok&apos;.'));
  assert.ok(escapedXml.includes('<TemplateName>Manažer prodeje - XML</TemplateName>'));

  const products = mapCatalogProductsToMpFeedProducts([
    createAuctionCatalogFixture(),
    createBuyNowCatalogFixture(),
  ]);
  const firstXml = generateMpFeedXml(products);
  const secondXml = generateMpFeedXml([...products].reverse());
  assert.equal(firstXml.xml, secondXml.xml);
  assert.equal(firstXml.checksum, secondXml.checksum);
  assert.equal(firstXml.productCount, 2);
  assert.ok(firstXml.byteSize > 0);
  assert.ok(firstXml.xml.indexOf('catalog-sku-1001') < firstXml.xml.indexOf('catalog-sku-2002'));

  assert.throws(() => mapCatalogProductToMpFeedProduct(createBuyNowCatalogFixture({
    evidence: {
      ...createBuyNowCatalogFixture().evidence,
      approval: { passed: false, checkedAt: '2026-07-01T00:00:00.000Z', source: 'synthetic-test', reason: 'missing approval' },
    },
  })), (error) => {
    assertValidationCode(error, 'MP_FEED_APPROVAL_MISSING');
    return true;
  });

  assert.throws(() => mapCatalogProductToMpFeedProduct(createBuyNowCatalogFixture({
    evidence: {
      ...createBuyNowCatalogFixture().evidence,
      images: [{ passed: true, checkedAt: '2026-07-01T00:00:00.000Z', source: 'synthetic-test', url: 'http://localhost/private.jpg' }],
    },
  })), (error) => {
    assertValidationCode(error, 'MP_FEED_IMAGE_NOT_PUBLIC');
    return true;
  });

  assert.throws(() => generateMpFeedXml([buyNow, { ...buyNow }]), (error) => {
    assertValidationCode(error, 'MP_FEED_DUPLICATE_EXTERNAL_ID');
    return true;
  });

  assert.throws(() => generateMpFeedXml(new Array(MP_FEED_MAX_PRODUCTS + 1).fill(buyNow)), (error) => {
    assertValidationCode(error, 'MP_FEED_LIMIT_EXCEEDED');
    return true;
  });

  const oversized = { ...buyNow, description: 'x'.repeat(10 * 1024 * 1024) };
  assert.throws(() => generateMpFeedXml([oversized]), (error) => {
    assertValidationCode(error, 'MP_FEED_LIMIT_EXCEEDED');
    return true;
  });
}

run();
