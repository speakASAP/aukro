import {
  MpFeedCatalogFieldInput,
  MpFeedCatalogProductInput,
  MpFeedEvidenceBase,
  MpFeedImageEvidence,
  MpFeedProduct,
  MpFeedValidationCode,
  MpFeedValidationError,
} from './mp-feed.types';

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

export function mapCatalogProductsToMpFeedProducts(inputs: MpFeedCatalogProductInput[]): MpFeedProduct[] {
  return inputs.map(mapCatalogProductToMpFeedProduct).sort((left, right) => left.externalId.localeCompare(right.externalId));
}

export function mapCatalogProductToMpFeedProduct(input: MpFeedCatalogProductInput): MpFeedProduct {
  const externalId = createStableCatalogExternalId(input.catalogProductId);
  if (!externalId) {
    throw new MpFeedValidationError('MP_FEED_EXTERNAL_ID_MISSING', 'Catalog product id is required for stable MP feed ExternalId.');
  }

  requirePassed(input.evidence?.approval, 'MP_FEED_APPROVAL_MISSING', 'MP feed approval evidence is required.');
  requirePassed(input.evidence?.policy, 'MP_FEED_POLICY_MISSING', 'MP feed policy evidence is required.');
  requirePassed(input.evidence?.category, 'MP_FEED_CATEGORY_MISSING', 'MP feed category evidence is required.');
  requirePassed(input.evidence?.price, 'MP_FEED_PRICE_MISSING', 'MP feed price evidence is required.');
  requirePassed(input.evidence?.stock, 'MP_FEED_STOCK_MISSING', 'MP feed stock evidence is required.');
  requirePassed(input.evidence?.shipment, 'MP_FEED_SHIPMENT_MISSING', 'MP feed shipment evidence is required.');

  const price = input.evidence.price;
  const stock = input.evidence.stock;
  const category = input.evidence.category;
  const shipment = input.evidence.shipment;

  if (!category.categoryId) {
    throw new MpFeedValidationError('MP_FEED_CATEGORY_MISSING', 'MP feed CategoryId is required.');
  }
  if (!Number.isFinite(stock.quantity) || stock.quantity <= 0) {
    throw new MpFeedValidationError('MP_FEED_STOCK_MISSING', 'Positive stock quantity evidence is required.', { quantity: stock.quantity });
  }
  if (!shipment.method) {
    throw new MpFeedValidationError('MP_FEED_SHIPMENT_MISSING', 'Shipment method evidence is required.');
  }
  if (!hasRequiredPrice(input.offerType, price.buyNowPrice, price.startingPrice)) {
    throw new MpFeedValidationError('MP_FEED_PRICE_MISSING', 'Required MP feed price evidence is missing.', {
      offerType: input.offerType,
      buyNowPrice: price.buyNowPrice,
      startingPrice: price.startingPrice,
    });
  }

  const images = mapPublicImages(input.evidence.images);

  return {
    name: requiredText(input.name, 'Name'),
    externalId,
    categoryId: String(category.categoryId),
    description: requiredText(input.description, 'Description'),
    quantity: Math.trunc(stock.quantity),
    quantityUnit: stock.unit || 'ks',
    duration: input.duration,
    offerType: input.offerType,
    place: requiredText(input.place, 'Place'),
    shipment: {
      method: shipment.method,
      price: shipment.price,
      currency: shipment.currency || price.currency,
      templateId: shipment.templateId === undefined ? undefined : String(shipment.templateId),
    },
    fields: mapFields(input.fields || []),
    images,
    buyNowPrice: price.buyNowPrice,
    startingPrice: price.startingPrice,
    currency: price.currency,
  };
}

export function createStableCatalogExternalId(catalogProductId: string): string {
  const normalized = String(catalogProductId || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized ? `catalog-${normalized}` : '';
}

export function isPublicHttpImageUrl(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch (_error) {
    return false;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
  const hostname = parsed.hostname.toLowerCase();
  if (LOCAL_HOSTNAMES.has(hostname)) return false;
  if (hostname.endsWith('.localhost') || hostname.endsWith('.local')) return false;
  if (/^10\./.test(hostname)) return false;
  if (/^192\.168\./.test(hostname)) return false;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)) return false;
  if (/^169\.254\./.test(hostname)) return false;
  if (/^127\./.test(hostname)) return false;
  if (/^\[?fc/i.test(hostname) || /^\[?fd/i.test(hostname) || /^\[?fe80/i.test(hostname)) return false;

  return true;
}

function requirePassed(evidence: MpFeedEvidenceBase | undefined, code: MpFeedValidationCode, message: string): void {
  if (!evidence || evidence.passed !== true) {
    throw new MpFeedValidationError(code, evidence?.reason || message, { evidence });
  }
}

function hasRequiredPrice(offerType: string, buyNowPrice?: number, startingPrice?: number): boolean {
  if (offerType === 'BUY_NOW') return Number.isFinite(buyNowPrice) && Number(buyNowPrice) > 0;
  if (offerType === 'AUCTION') return Number.isFinite(startingPrice) && Number(startingPrice) > 0;
  return false;
}

function mapFields(fields: MpFeedCatalogFieldInput[]) {
  return fields
    .map((field) => ({
      id: field.id === undefined ? undefined : String(field.id),
      name: requiredText(field.name, 'Field name'),
      value: String(field.value),
      unit: field.unit,
    }))
    .sort((left, right) => `${left.name}:${left.id || ''}`.localeCompare(`${right.name}:${right.id || ''}`));
}

function mapPublicImages(images: MpFeedImageEvidence[] | undefined) {
  if (!images || images.length === 0) {
    throw new MpFeedValidationError('MP_FEED_IMAGE_MISSING', 'At least one public image URL evidence item is required.');
  }

  const mapped = images.map((image, index) => {
    requirePassed(image, 'MP_FEED_IMAGE_MISSING', 'Image evidence must be passed.');
    if (!isPublicHttpImageUrl(image.url)) {
      throw new MpFeedValidationError('MP_FEED_IMAGE_NOT_PUBLIC', 'Image URL must be a public HTTP(S) URL.', { url: image.url });
    }
    return {
      url: image.url,
      position: image.position === undefined ? index + 1 : image.position,
      alt: image.alt,
    };
  });

  return mapped.sort((left, right) => left.position - right.position || left.url.localeCompare(right.url));
}

function requiredText(value: string, label: string): string {
  const text = String(value || '').trim();
  if (!text) {
    throw new MpFeedValidationError('MP_FEED_POLICY_MISSING', `${label} is required for MP feed export.`);
  }
  return text;
}
