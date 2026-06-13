import { OfferPolicyEvaluation, OfferPolicyEvidence } from './policy/offer-policy.types';

export type CatalogDraftStatus = 'ready_for_review' | 'blocked';

export interface CatalogSellActionRequest {
  accountId: string;
  productId: string;
  requestedBy?: string;
  policyEvidence?: OfferPolicyEvidence;
}

export interface CatalogDraftSourceSnapshot {
  productId: string;
  title: string;
  description?: string;
  categoryId?: string;
  price: number;
  currency: string;
  stockQuantity: number;
  mediaCount: number;
  capturedAt: string;
}

export interface CatalogDraftMetadata {
  draftVersion: 1;
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
