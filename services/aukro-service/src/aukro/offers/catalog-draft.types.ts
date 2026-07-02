import { CatalogProductQualityIssue } from '@aukro/shared';
import { OfferPolicyEvaluation, OfferPolicyEvidence } from './policy/offer-policy.types';

export type CatalogDraftStatus = 'ready_for_review' | 'blocked';
export type CatalogDraftDescriptionSource = 'catalog-content-preview' | 'catalog-product-description' | 'empty';
export type CatalogDraftQualitySource = 'catalog-product-readiness' | 'catalog-product-quality-unavailable';

export interface CatalogDraftQualitySnapshot {
  policyId: 'catalog.product_quality.v1';
  productId: string;
  canActivate: boolean;
  source: CatalogDraftQualitySource;
  checkedAt: string;
  blockingIssues: CatalogProductQualityIssue[];
  blockingIssueCodes: string[];
  optionalOpportunities: CatalogProductQualityIssue[];
  nextAction: string;
}

export interface CatalogSellActionRequest {
  accountId: string;
  productId: string;
  requestedBy?: string;
  policyEvidence?: OfferPolicyEvidence;
  catalogAuthorization?: string | null;
}

export interface CatalogDraftContentPreviewSnapshot {
  marketplace: string;
  label?: string;
  format?: string;
  title?: string;
  plainText?: string;
  htmlAvailable: boolean;
  blocksAvailable: boolean;
  sectionsAvailable: boolean;
  source: {
    canonicalDocumentVersion?: string;
    legacyDescriptionFallback?: boolean;
    sourceHash?: string;
    generatedAt?: string;
  };
  overridesApplied?: boolean;
  warnings: string[];
}

export interface CatalogDraftSourceSnapshot {
  productId: string;
  title: string;
  description?: string;
  descriptionSource: CatalogDraftDescriptionSource;
  categoryId?: string;
  price: number;
  currency: string;
  stockQuantity: number;
  mediaCount: number;
  capturedAt: string;
  catalogQuality: CatalogDraftQualitySnapshot;
  contentPreview?: CatalogDraftContentPreviewSnapshot;
}

export interface CatalogDraftMetadata {
  draftVersion: 2;
  draftStatus: CatalogDraftStatus;
  source: 'catalog-sell-action';
  requestedBy?: string;
  sourceSnapshot: CatalogDraftSourceSnapshot;
  policyEvidence: OfferPolicyEvidence;
  policyReasonCodes: string[];
}

export interface CatalogSellActionResponse {
  success: boolean;
  action: 'created' | 'reused';
  draftStatus: CatalogDraftStatus;
  offer: any;
  sourceSnapshot: CatalogDraftSourceSnapshot;
  compliancePolicy: OfferPolicyEvaluation;
  blockers: string[];
}
