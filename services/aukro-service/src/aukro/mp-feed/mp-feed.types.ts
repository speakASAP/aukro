export const MP_FEED_TEMPLATE_NAME = 'Manažer prodeje - XML';
export const MP_FEED_MAX_BYTES = 10 * 1024 * 1024;
export const MP_FEED_MAX_PRODUCTS = 10000;

export type MpFeedOfferType = 'BUY_NOW' | 'AUCTION';

export type MpFeedEvidenceSource =
  | 'catalog'
  | 'operator'
  | 'policy'
  | 'pricing'
  | 'warehouse'
  | 'media'
  | 'shipment'
  | 'synthetic-test';

export interface MpFeedEvidenceBase {
  passed: boolean;
  source: MpFeedEvidenceSource | string;
  checkedAt: string;
  reason?: string;
}

export interface MpFeedApprovalEvidence extends MpFeedEvidenceBase {
  approvedBy?: string;
}

export interface MpFeedPolicyEvidence extends MpFeedEvidenceBase {
  reasonCodes?: string[];
}

export interface MpFeedCategoryEvidence extends MpFeedEvidenceBase {
  categoryId: string | number;
}

export interface MpFeedPriceEvidence extends MpFeedEvidenceBase {
  currency: string;
  buyNowPrice?: number;
  startingPrice?: number;
}

export interface MpFeedStockEvidence extends MpFeedEvidenceBase {
  quantity: number;
  unit?: string;
}

export interface MpFeedShipmentEvidence extends MpFeedEvidenceBase {
  method: string;
  price?: number;
  currency?: string;
  templateId?: string | number;
}

export interface MpFeedImageEvidence extends MpFeedEvidenceBase {
  url: string;
  position?: number;
  alt?: string;
}

export interface MpFeedMapperEvidence {
  approval: MpFeedApprovalEvidence;
  policy: MpFeedPolicyEvidence;
  category: MpFeedCategoryEvidence;
  price: MpFeedPriceEvidence;
  stock: MpFeedStockEvidence;
  shipment: MpFeedShipmentEvidence;
  images: MpFeedImageEvidence[];
}

export interface MpFeedCatalogFieldInput {
  id?: string | number;
  name: string;
  value: string | number | boolean;
  unit?: string;
}

export interface MpFeedCatalogProductInput {
  catalogProductId: string;
  sku?: string;
  name: string;
  description: string;
  offerType: MpFeedOfferType;
  duration: number;
  place: string;
  fields?: MpFeedCatalogFieldInput[];
  evidence: MpFeedMapperEvidence;
}

export interface MpFeedField {
  id?: string;
  name: string;
  value: string;
  unit?: string;
}

export interface MpFeedImage {
  url: string;
  position: number;
  alt?: string;
}

export interface MpFeedShipment {
  method: string;
  price?: number;
  currency?: string;
  templateId?: string;
}

export interface MpFeedProduct {
  name: string;
  externalId: string;
  categoryId: string;
  description: string;
  quantity: number;
  quantityUnit: string;
  duration: number;
  offerType: MpFeedOfferType;
  place: string;
  shipment: MpFeedShipment;
  fields: MpFeedField[];
  images: MpFeedImage[];
  buyNowPrice?: number;
  startingPrice?: number;
  currency: string;
}

export interface MpFeedGenerationResult {
  xml: string;
  checksum: string;
  byteSize: number;
  productCount: number;
}

export type MpFeedValidationCode =
  | 'MP_FEED_APPROVAL_MISSING'
  | 'MP_FEED_POLICY_MISSING'
  | 'MP_FEED_CATEGORY_MISSING'
  | 'MP_FEED_PRICE_MISSING'
  | 'MP_FEED_STOCK_MISSING'
  | 'MP_FEED_SHIPMENT_MISSING'
  | 'MP_FEED_IMAGE_MISSING'
  | 'MP_FEED_IMAGE_NOT_PUBLIC'
  | 'MP_FEED_EXTERNAL_ID_MISSING'
  | 'MP_FEED_LIMIT_EXCEEDED';

export class MpFeedValidationError extends Error {
  constructor(
    public readonly code: MpFeedValidationCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'MpFeedValidationError';
  }
}
