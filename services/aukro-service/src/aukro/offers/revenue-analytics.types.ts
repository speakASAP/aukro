export type RevenueRecommendationTarget =
  | 'operations'
  | 'catalog-microservice'
  | 'marketing-microservice'
  | 'suppliers-microservice'
  | 'ai-microservice';

export type RevenueRecommendationPriority = 'low' | 'medium' | 'high';

export interface RevenueMetricSnapshot {
  views?: number;
  watchers?: number;
  questions?: number;
  soldQuantity?: number;
  conversionRate?: number;
  grossRevenue?: number;
  contributionMargin?: number;
  marginPercent?: number;
  blockedRevenue?: number;
  stockAgeDays?: number;
  availableStock?: number;
  price?: number;
  currency?: string;
  mediaCount?: number;
  policyReasonCodes?: string[];
}

export interface RecordRevenueAnalyticsRequest {
  actorId: string;
  analyticsId?: string;
  source?: string;
  observedAt?: string;
  correlationId?: string;
  metrics?: RevenueMetricSnapshot;
}

export interface RevenueRecommendationEvent {
  id: string;
  targetService: RevenueRecommendationTarget;
  priority: RevenueRecommendationPriority;
  action: string;
  reasonCodes: string[];
  context: {
    offerId: string;
    accountId: string;
    productId?: string;
    analyticsId: string;
    blockedRevenue?: number;
    conversionRate?: number;
    availableStock?: number;
    marginPercent?: number;
    stockAgeDays?: number;
    policyReasonCodes: string[];
  };
}

export interface RevenueAnalyticsRecord {
  id: string;
  offerId: string;
  accountId: string;
  productId?: string;
  actorId: string;
  source: string;
  observedAt: string;
  recordedAt: string;
  correlationId?: string;
  metrics: RevenueMetricSnapshot;
  blockedRevenue: number;
  recommendationEvents: RevenueRecommendationEvent[];
  logging: {
    attempted: boolean;
    successCount: number;
    failureCount: number;
    unavailableCount: number;
  };
  mutation: {
    enabled: false;
    reason: 'REVENUE_ANALYTICS_RECORD_ONLY';
  };
}

export interface RevenueAnalyticsMetadata {
  version: 1;
  records: RevenueAnalyticsRecord[];
  lastRecord?: RevenueAnalyticsRecord;
  blockedRevenueTotal: number;
  recommendationCount: number;
}

export interface RecordRevenueAnalyticsResponse {
  success: boolean;
  action: 'created' | 'reused';
  record: RevenueAnalyticsRecord;
  analytics: RevenueAnalyticsMetadata;
  recommendationEvents: RevenueRecommendationEvent[];
}
