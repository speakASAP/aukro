import {
  AukroOfferAttributeInput,
  AukroOfferImageInput,
  AukroOfferLocation,
  AukroOfferResponse,
  AukroOfferV2Request,
  AukroPublicApiNormalizedError,
} from '../public-api';

export const AUKRO_EXECUTOR_VERSION = 'task-014-executor-v1';

export type AukroExecutorOfferPriceMode = 'buy_now' | 'auction';

export interface AukroExecutorActorEvidence {
  actorId: string;
  source?: string;
}

export interface AukroExecutorPolicyEvidence {
  allowed: boolean;
  blockers?: string[];
  evaluatedAt?: string;
  reasonCodes?: string[];
}

export interface AukroExecutorHumanApprovalEvidence {
  approved: boolean;
  actorId: string;
  approvedAt?: string;
  approvalId?: string;
}

export interface AukroExecutorRateLimitEvidence {
  ready: boolean;
  checkedAt?: string;
  source?: string;
}

export interface AukroExecutorLocalBudgetEvidence {
  approved: boolean;
  remainingCreates?: number;
  budgetId?: string;
}

export interface AukroExecutorAccountReadinessEvidence {
  ready: boolean;
  accountId?: string;
  checkedAt?: string;
}

export interface AukroExecutorPriceEvidence {
  amount: number | string;
  currency: string;
  mode?: AukroExecutorOfferPriceMode;
}

export interface AukroExecutorImageEvidence {
  id?: number | string;
  url?: string;
}

export interface AukroExecutorPayloadEvidence {
  categoryId: number | string;
  shippingTemplateId: number | string;
  location: AukroOfferLocation;
  stockQuantity: number;
  price: AukroExecutorPriceEvidence;
  images: AukroExecutorImageEvidence[];
  attributes?: AukroOfferAttributeInput[];
  duration?: number;
  language?: string;
}

export interface AukroExecutorExecutionEvidence {
  actor: AukroExecutorActorEvidence;
  idempotencyKey: string;
  policy: AukroExecutorPolicyEvidence;
  humanApproval: AukroExecutorHumanApprovalEvidence;
  rateLimit?: AukroExecutorRateLimitEvidence;
  localBudget?: AukroExecutorLocalBudgetEvidence;
  account: AukroExecutorAccountReadinessEvidence;
  payload: AukroExecutorPayloadEvidence;
}

export interface AukroExecutorOfferLikeRecord {
  id?: string | number;
  name?: string;
  title?: string;
  language?: string;
  description?: string;
  plainDescription?: string;
  htmlDescription?: string;
  attributes?: AukroOfferAttributeInput[];
  duration?: number;
  [key: string]: unknown;
}

export type AukroExecutorExecutionStatus =
  | 'blocked'
  | 'dry_run'
  | 'success'
  | 'failed'
  | 'skipped';

export interface AukroExecutorGateFailure {
  code: string;
  message: string;
}

export interface AukroExecutorPayloadSummary {
  name: string;
  categoryId: number;
  shippingTemplateId: number;
  quantity: number;
  imageCount: number;
  priceCurrency: string;
  priceMode: AukroExecutorOfferPriceMode;
  payloadDigest: string;
}

export interface AukroExecutorExecutionRecord {
  executorVersion: string;
  action: 'create_offer_v2';
  status: AukroExecutorExecutionStatus;
  idempotencyKey: string;
  actorId?: string;
  sourceOfferId?: string;
  dryRun: boolean;
  createdAt: string;
  finishedAt?: string;
  aukroOfferId?: string;
  aukroStatus?: string;
  apiStatus?: number;
  apiError?: AukroPublicApiNormalizedError;
  gateFailures?: AukroExecutorGateFailure[];
  skippedReason?: string;
  reusedFrom?: string;
  payloadSummary?: AukroExecutorPayloadSummary;
}

export interface AukroExecutorCreateInput {
  offer: AukroExecutorOfferLikeRecord;
  evidence: AukroExecutorExecutionEvidence;
  dryRun?: boolean;
  priorExecutions?: AukroExecutorExecutionRecord[];
  now?: string | Date;
}

export type AukroExecutorCreateResultStatus =
  | 'blocked'
  | 'dry_run'
  | 'created'
  | 'failed'
  | 'reused';

export interface AukroExecutorCreateResult {
  ok: boolean;
  status: AukroExecutorCreateResultStatus;
  calledApi: boolean;
  payload?: AukroOfferV2Request;
  response?: AukroOfferResponse;
  record: AukroExecutorExecutionRecord;
  gateFailures?: AukroExecutorGateFailure[];
  error?: AukroPublicApiNormalizedError;
}

export type AukroExecutorPublicApiClient = {
  createOffer(input: AukroOfferV2Request): Promise<{
    ok: boolean;
    data?: AukroOfferResponse;
    status?: number;
    error?: AukroPublicApiNormalizedError;
  }>;
};

export type NormalizedAukroOfferImage = Required<Pick<AukroOfferImageInput, never>> & AukroOfferImageInput;
