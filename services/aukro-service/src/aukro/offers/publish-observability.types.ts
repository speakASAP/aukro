import { OfferPolicyEvaluation, OfferPolicyEvidence } from './policy/offer-policy.types';

export type PublishAttemptStatus = 'queued' | 'blocked';
export type PublishQueueStatus = 'idle' | PublishAttemptStatus;
export type ReconciliationStatus = 'aligned' | 'drift_detected';
export type ReconciliationDriftType = 'stock' | 'price' | 'status';

export interface EnqueuePublishRequest {
  actorId: string;
  idempotencyKey?: string;
  correlationId?: string;
  requestedAt?: string;
  policyEvidence?: OfferPolicyEvidence;
  rateLimitRemaining?: number;
  rateLimitResetAt?: string;
}

export interface PublishRateLimitSnapshot {
  ready: boolean;
  checkedAt?: string;
  remaining?: number;
  resetAt?: string;
}

export interface PublishQueueAttemptSnapshot {
  accountId: string;
  position: number;
  queuedCount: number;
  blockedCount: number;
  rateLimit: PublishRateLimitSnapshot;
}

export interface PublishAttemptRecord {
  id: string;
  idempotencyKey: string;
  offerId: string;
  accountId: string;
  productId?: string;
  actorId: string;
  requestedAt: string;
  status: PublishAttemptStatus;
  blockers: string[];
  policyEvidence: OfferPolicyEvidence;
  policySnapshot: OfferPolicyEvaluation;
  queue: PublishQueueAttemptSnapshot;
  mutation: {
    enabled: false;
    reason: 'TASK_007_RECORD_ONLY';
  };
  correlationId?: string;
}

export interface PublishQueueMetadata {
  version: 1;
  accountId: string;
  status: PublishQueueStatus;
  attempts: PublishAttemptRecord[];
  queuedCount: number;
  blockedCount: number;
  lastAttemptAt?: string;
  lastQueuedAt?: string;
  lastBlockedAt?: string;
  rateLimit: PublishRateLimitSnapshot;
}

export interface EnqueuePublishResponse {
  success: boolean;
  action: 'created' | 'reused';
  attempt: PublishAttemptRecord;
  queue: PublishQueueMetadata;
  compliancePolicy: OfferPolicyEvaluation;
  blockers: string[];
}

export interface MarketplaceReconciliationSnapshot {
  aukroOfferId?: string;
  status?: string;
  isActive?: boolean;
  stockQuantity?: number;
  price?: number | string;
  currency?: string;
}

export interface RecordReconciliationRequest {
  actorId: string;
  source?: string;
  observedAt?: string;
  correlationId?: string;
  marketplaceSnapshot?: MarketplaceReconciliationSnapshot;
  warehouseStockQuantity?: number;
  catalogPrice?: number | string;
}

export interface ReconciliationDrift {
  type: ReconciliationDriftType;
  internal: string | number | boolean | undefined;
  marketplace: string | number | boolean | undefined;
  severity: 'warning';
}

export interface ReconciliationReportRecord {
  id: string;
  offerId: string;
  accountId: string;
  productId?: string;
  actorId: string;
  source: string;
  observedAt: string;
  recordedAt: string;
  status: ReconciliationStatus;
  internalSnapshot: {
    stockQuantity?: number;
    price?: number;
    status: string;
  };
  marketplaceSnapshot: MarketplaceReconciliationSnapshot;
  drift: ReconciliationDrift[];
  mutation: {
    enabled: false;
    reason: 'RECONCILIATION_RECORD_ONLY';
  };
  correlationId?: string;
}

export interface ReconciliationMetadata {
  version: 1;
  reports: ReconciliationReportRecord[];
  lastReport?: ReconciliationReportRecord;
  driftCount: number;
  alignedCount: number;
}

export interface RecordReconciliationResponse {
  success: boolean;
  report: ReconciliationReportRecord;
  reconciliation: ReconciliationMetadata;
}
