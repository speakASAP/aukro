export type PolicyEvaluationMode = 'draft' | 'publish';

export type PolicyReasonCode =
  | 'CATALOG_VALIDATION_MISSING'
  | 'CATALOG_VALIDATION_FAILED'
  | 'CATALOG_VALIDATION_STALE'
  | 'ACCOUNT_READINESS_MISSING'
  | 'ACCOUNT_READINESS_FAILED'
  | 'ACCOUNT_READINESS_STALE'
  | 'CATEGORY_MAPPING_MISSING'
  | 'CATEGORY_MAPPING_FAILED'
  | 'CATEGORY_MAPPING_STALE'
  | 'REQUIRED_PARAMETERS_MISSING'
  | 'REQUIRED_PARAMETERS_FAILED'
  | 'REQUIRED_PARAMETERS_STALE'
  | 'MEDIA_READINESS_MISSING'
  | 'MEDIA_READINESS_FAILED'
  | 'MEDIA_READINESS_STALE'
  | 'STOCK_AVAILABILITY_MISSING'
  | 'STOCK_AVAILABILITY_FAILED'
  | 'STOCK_AVAILABILITY_STALE'
  | 'PRICE_POLICY_MISSING'
  | 'PRICE_POLICY_FAILED'
  | 'PRICE_POLICY_STALE'
  | 'DUPLICATE_RISK_MISSING'
  | 'DUPLICATE_RISK_FAILED'
  | 'DUPLICATE_RISK_STALE'
  | 'AI_RISK_MISSING'
  | 'AI_RISK_FAILED'
  | 'AI_RISK_STALE'
  | 'HUMAN_APPROVAL_MISSING'
  | 'HUMAN_APPROVAL_FAILED'
  | 'HUMAN_APPROVAL_STALE'
  | 'RATE_LIMIT_READINESS_MISSING'
  | 'RATE_LIMIT_READINESS_FAILED'
  | 'RATE_LIMIT_READINESS_STALE'
  | 'IDEMPOTENCY_MISSING'
  | 'IDEMPOTENCY_FAILED'
  | 'IDEMPOTENCY_STALE';

export interface PolicyEvidenceFlag {
  passed?: boolean;
  checkedAt?: string;
  source?: string;
  hint?: string;
  policyId?: string;
  blockers?: string[];
  nextAction?: string;
}

export interface StockEvidence extends PolicyEvidenceFlag {
  quantity?: number;
}

export interface PriceEvidence extends PolicyEvidenceFlag {
  price?: number | string;
  marginPercent?: number;
  currency?: string;
}

export interface HumanApprovalEvidence extends PolicyEvidenceFlag {
  actorId?: string;
}

export interface IdempotencyEvidence extends PolicyEvidenceFlag {
  idempotencyKey?: string;
}

export interface OfferPolicyEvidence {
  catalogValidated?: PolicyEvidenceFlag;
  accountReady?: PolicyEvidenceFlag;
  categoryMapped?: PolicyEvidenceFlag;
  requiredParametersComplete?: PolicyEvidenceFlag;
  mediaReady?: PolicyEvidenceFlag;
  stockAvailable?: StockEvidence;
  priceValid?: PriceEvidence;
  duplicateChecked?: PolicyEvidenceFlag;
  aiRiskCleared?: PolicyEvidenceFlag;
  humanApproved?: HumanApprovalEvidence;
  rateLimitReady?: PolicyEvidenceFlag;
  idempotencyReady?: IdempotencyEvidence;
}

export interface OfferPolicyInput {
  mode?: PolicyEvaluationMode;
  evidence?: OfferPolicyEvidence;
  now?: string | Date;
  maxEvidenceAgeMinutes?: number;
  minMarginPercent?: number;
}

export interface OfferPolicyReason {
  code: PolicyReasonCode;
  evidenceKey: keyof OfferPolicyEvidence;
  message: string;
  remediation: string;
}

export interface OfferPolicyEvaluation {
  mode: PolicyEvaluationMode;
  allowed: boolean;
  evaluatedAt: string;
  reasonCodes: PolicyReasonCode[];
  reasons: OfferPolicyReason[];
}
