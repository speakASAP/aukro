export interface WorkbenchQuery {
  accountId?: string;
}

export interface WorkbenchBulkPreviewQuery extends WorkbenchQuery {
  type?: WorkbenchReviewItemType | string;
  minPriority?: WorkbenchReviewPriority | string;
  limit?: number | string;
}

export interface WorkbenchMetricSummary {
  accounts: {
    active: number;
  };
  offers: {
    total: number;
    active: number;
    drafts: number;
    blockedDrafts: number;
    queuedPublishAttempts: number;
    blockedPublishAttempts: number;
    reconciliationDrift: number;
    blockedRevenue: number;
    recommendationEvents: number;
  };
  orders: {
    total: number;
    unforwarded: number;
    failedOrPending: number;
  };
}

export type WorkbenchReviewItemType =
  | 'draft_blocked'
  | 'ai_review_required'
  | 'publish_blocked'
  | 'reconciliation_drift'
  | 'blocked_revenue'
  | 'order_forwarding_failed';

export type WorkbenchReviewPriority = 'low' | 'medium' | 'high';

export interface WorkbenchReviewItem {
  id: string;
  type: WorkbenchReviewItemType;
  priority: WorkbenchReviewPriority;
  accountId: string;
  offerId?: string;
  orderId?: string;
  productId?: string;
  reasonCodes: string[];
  action: string;
  context: Record<string, any>;
  createdAt?: string;
}

export interface WorkbenchSummaryResponse {
  success: boolean;
  generatedAt: string;
  filters: WorkbenchQuery;
  metrics: WorkbenchMetricSummary;
}

export interface WorkbenchReviewQueueResponse {
  success: boolean;
  generatedAt: string;
  filters: WorkbenchQuery;
  items: WorkbenchReviewItem[];
  counts: Record<WorkbenchReviewItemType, number>;
}

export interface WorkbenchOfferDetailResponse {
  success: boolean;
  generatedAt: string;
  offer: {
    id: string;
    accountId: string;
    productId?: string;
    title?: string;
    isActive: boolean;
    stockQuantity?: number;
    price?: number;
    draft?: Record<string, any>;
    aiProposals: any[];
    humanReviews: any[];
    publishQueue?: Record<string, any>;
    reconciliation?: Record<string, any>;
    revenueAnalytics?: Record<string, any>;
    linkedOrders: Array<Record<string, any>>;
  };
}


export interface WorkbenchBulkPreviewResponse {
  success: boolean;
  generatedAt: string;
  filters: WorkbenchBulkPreviewQuery;
  totalCandidates: number;
  returnedCount: number;
  remainingCount: number;
  counts: Record<WorkbenchReviewItemType, number>;
  items: WorkbenchReviewItem[];
}
