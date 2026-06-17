import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService, LoggerService } from '@aukro/shared';
import {
  WorkbenchBulkPreviewQuery,
  WorkbenchBulkPreviewResponse,
  WorkbenchMetricSummary,
  WorkbenchOfferDetailResponse,
  WorkbenchQuery,
  WorkbenchReviewItem,
  WorkbenchReviewItemType,
  WorkbenchReviewPriority,
  WorkbenchReviewQueueResponse,
  WorkbenchSummaryResponse,
} from './workbench.types';

@Injectable()
export class WorkbenchService {
  private readonly logger: LoggerService;

  constructor(
    private readonly prisma: PrismaService,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService;
    this.logger.setContext('WorkbenchService');
  }

  async getSummary(query: WorkbenchQuery = {}): Promise<WorkbenchSummaryResponse> {
    const [accounts, offers, orders] = await this.loadWorkbenchRecords(query);
    return {
      success: true,
      generatedAt: new Date().toISOString(),
      filters: this.safeFilters(query),
      metrics: this.buildSummary(accounts, offers, orders),
    };
  }

  async getReviewQueue(query: WorkbenchQuery = {}): Promise<WorkbenchReviewQueueResponse> {
    const [, offers, orders] = await this.loadWorkbenchRecords(query);
    const items = [
      ...offers.flatMap((offer) => this.offerReviewItems(offer)),
      ...orders.flatMap((order) => this.orderReviewItems(order)),
    ].sort((left, right) => this.priorityRank(right.priority) - this.priorityRank(left.priority));

    return {
      success: true,
      generatedAt: new Date().toISOString(),
      filters: this.safeFilters(query),
      items,
      counts: this.countItems(items),
    };
  }

  async getBulkPreview(query: WorkbenchBulkPreviewQuery = {}): Promise<WorkbenchBulkPreviewResponse> {
    const queue = await this.getReviewQueue(query);
    const type = this.safeReviewType(query.type);
    const minPriority = this.safePriority(query.minPriority);
    const limit = this.safeLimit(query.limit);
    const candidates = queue.items.filter((item) => {
      if (type && item.type !== type) return false;
      if (minPriority && this.priorityRank(item.priority) < this.priorityRank(minPriority)) return false;
      return true;
    });
    const items = candidates.slice(0, limit);

    return {
      success: true,
      generatedAt: new Date().toISOString(),
      filters: {
        ...this.safeFilters(query),
        ...(type ? { type } : {}),
        ...(minPriority ? { minPriority } : {}),
        limit,
      },
      totalCandidates: candidates.length,
      returnedCount: items.length,
      remainingCount: Math.max(candidates.length - items.length, 0),
      counts: this.countItems(candidates),
      items,
    };
  }

  async getOfferDetail(id: string): Promise<WorkbenchOfferDetailResponse> {
    const offer = await this.prisma.aukroOffer.findUnique({
      where: { id },
      include: { account: true },
    });
    if (!offer) {
      throw new NotFoundException(`Offer ${id} not found`);
    }

    const orders = await this.prisma.aukroOrder.findMany({
      where: { accountId: offer.accountId },
      include: { account: false },
    });
    const rawData = this.asRecord(offer.rawData);
    return {
      success: true,
      generatedAt: new Date().toISOString(),
      offer: {
        id: offer.id,
        accountId: offer.accountId,
        productId: offer.productId || undefined,
        title: offer.title || undefined,
        isActive: Boolean(offer.isActive),
        stockQuantity: this.numberOrUndefined(offer.stockQuantity),
        price: this.numberOrUndefined(offer.price),
        draft: this.asRecord(rawData.draft),
        aiProposals: this.safeArray(rawData.aiProposals),
        humanReviews: this.safeArray(rawData.humanReviews),
        publishQueue: this.asRecord(rawData.publishQueue),
        reconciliation: this.asRecord(rawData.reconciliation),
        revenueAnalytics: this.asRecord(rawData.revenueAnalytics),
        linkedOrders: orders.map((order) => this.safeOrder(order)),
      },
    };
  }

  private async loadWorkbenchRecords(query: WorkbenchQuery): Promise<[any[], any[], any[]]> {
    const accountWhere = { isActive: true, ...(query.accountId ? { id: query.accountId } : {}) };
    const scopedWhere = query.accountId ? { accountId: query.accountId } : {};
    return Promise.all([
      this.prisma.aukroAccount.findMany({ where: accountWhere }),
      this.prisma.aukroOffer.findMany({ where: scopedWhere, include: { account: true } }),
      this.prisma.aukroOrder.findMany({ where: scopedWhere, include: { account: true } }),
    ]);
  }

  private buildSummary(accounts: any[], offers: any[], orders: any[]): WorkbenchMetricSummary {
    return {
      accounts: {
        active: accounts.length,
      },
      offers: {
        total: offers.length,
        active: offers.filter((offer) => offer.isActive).length,
        drafts: offers.filter((offer) => this.asRecord(this.asRecord(offer.rawData).draft).draftVersion).length,
        blockedDrafts: offers.filter((offer) => this.asRecord(this.asRecord(offer.rawData).draft).draftStatus === 'blocked').length,
        queuedPublishAttempts: offers.reduce((total, offer) => total + this.publishAttempts(offer, 'queued'), 0),
        blockedPublishAttempts: offers.reduce((total, offer) => total + this.publishAttempts(offer, 'blocked'), 0),
        reconciliationDrift: offers.reduce((total, offer) => total + this.reconciliationDriftCount(offer), 0),
        blockedRevenue: offers.reduce((total, offer) => total + this.blockedRevenue(offer), 0),
        recommendationEvents: offers.reduce((total, offer) => total + this.recommendationCount(offer), 0),
      },
      orders: {
        total: orders.length,
        unforwarded: orders.filter((order) => !order.forwarded).length,
        failedOrPending: orders.filter((order) => ['failed', 'pending'].includes(String(order.status || '').toLowerCase())).length,
      },
    };
  }

  private offerReviewItems(offer: any): WorkbenchReviewItem[] {
    const rawData = this.asRecord(offer.rawData);
    const draft = this.asRecord(rawData.draft);
    const items: WorkbenchReviewItem[] = [];

    if (draft.draftStatus === 'blocked') {
      items.push(this.item('draft_blocked', 'high', offer, 'Review catalog draft blockers.', this.stringArray(draft.policyReasonCodes), {
        draftStatus: draft.draftStatus,
      }));
    }

    for (const proposal of this.safeArray(rawData.aiProposals)) {
      if (proposal.status === 'pending_review' || proposal.status === 'blocked') {
        items.push(this.item('ai_review_required', proposal.status === 'blocked' ? 'high' : 'medium', offer, 'Review AI proposal before publication.', this.stringArray(proposal.blockers), {
          proposalId: proposal.id,
          proposalStatus: proposal.status,
          confidence: this.numberOrUndefined(proposal.confidence),
        }, proposal.createdAt));
      }
    }

    const queue = this.asRecord(rawData.publishQueue);
    for (const attempt of this.safeArray(queue.attempts)) {
      if (attempt.status === 'blocked') {
        items.push(this.item('publish_blocked', 'high', offer, 'Resolve blocked publish attempt.', this.stringArray(attempt.blockers), {
          attemptId: attempt.id,
          idempotencyKey: attempt.idempotencyKey,
        }, attempt.requestedAt));
      }
    }

    const reconciliation = this.asRecord(rawData.reconciliation);
    const lastReport = this.asRecord(reconciliation.lastReport);
    if (lastReport.status === 'drift_detected') {
      items.push(this.item('reconciliation_drift', 'medium', offer, 'Review marketplace/internal drift evidence.', this.safeArray(lastReport.drift).map((drift) => String(drift.type)), {
        reportId: lastReport.id,
        driftCount: this.safeArray(lastReport.drift).length,
      }, lastReport.recordedAt));
    }

    const analytics = this.asRecord(rawData.revenueAnalytics);
    const lastRecord = this.asRecord(analytics.lastRecord);
    if (Number(lastRecord.blockedRevenue || 0) > 0) {
      items.push(this.item('blocked_revenue', 'high', offer, 'Review blocked revenue recommendation events.', this.safeArray(lastRecord.recommendationEvents).flatMap((event) => this.stringArray(event.reasonCodes)), {
        analyticsId: lastRecord.id,
        blockedRevenue: Number(lastRecord.blockedRevenue || 0),
        recommendationCount: this.safeArray(lastRecord.recommendationEvents).length,
      }, lastRecord.recordedAt));
    }

    return items;
  }

  private orderReviewItems(order: any): WorkbenchReviewItem[] {
    if (order.forwarded) return [];
    return [{
      id: `workbench-order-${order.id}`,
      type: 'order_forwarding_failed',
      priority: 'high',
      accountId: order.accountId,
      orderId: order.id,
      reasonCodes: ['ORDER_NOT_FORWARDED'],
      action: 'Review order forwarding status and retry through the approved order path.',
      context: {
        status: order.status,
        total: this.numberOrUndefined(order.total),
        currency: order.currency || 'CZK',
      },
      createdAt: this.isoString(order.createdAt),
    }];
  }

  private item(
    type: WorkbenchReviewItemType,
    priority: WorkbenchReviewPriority,
    offer: any,
    action: string,
    reasonCodes: string[],
    context: Record<string, any>,
    createdAt?: string,
  ): WorkbenchReviewItem {
    return {
      id: `workbench-${type}-${offer.id}-${this.shortContext(reasonCodes.join('|') + JSON.stringify(context))}`,
      type,
      priority,
      accountId: offer.accountId,
      offerId: offer.id,
      productId: offer.productId || undefined,
      reasonCodes,
      action,
      context,
      createdAt,
    };
  }

  private safeOrder(order: any): Record<string, any> {
    return {
      id: order.id,
      accountId: order.accountId,
      status: order.status,
      forwarded: Boolean(order.forwarded),
      total: this.numberOrUndefined(order.total),
      currency: order.currency || 'CZK',
      createdAt: this.isoString(order.createdAt),
    };
  }

  private countItems(items: WorkbenchReviewItem[]): Record<WorkbenchReviewItemType, number> {
    const counts = {
      draft_blocked: 0,
      ai_review_required: 0,
      publish_blocked: 0,
      reconciliation_drift: 0,
      blocked_revenue: 0,
      order_forwarding_failed: 0,
    };
    for (const item of items) counts[item.type]++;
    return counts;
  }

  private publishAttempts(offer: any, status: string): number {
    return this.safeArray(this.asRecord(this.asRecord(offer.rawData).publishQueue).attempts).filter((attempt) => attempt.status === status).length;
  }

  private reconciliationDriftCount(offer: any): number {
    const reconciliation = this.asRecord(this.asRecord(offer.rawData).reconciliation);
    return Number(reconciliation.driftCount || 0);
  }

  private blockedRevenue(offer: any): number {
    const analytics = this.asRecord(this.asRecord(offer.rawData).revenueAnalytics);
    return Number(analytics.blockedRevenueTotal || 0);
  }

  private recommendationCount(offer: any): number {
    const analytics = this.asRecord(this.asRecord(offer.rawData).revenueAnalytics);
    return Number(analytics.recommendationCount || 0);
  }

  private priorityRank(priority: WorkbenchReviewPriority): number {
    return priority === 'high' ? 3 : priority === 'medium' ? 2 : 1;
  }

  private safeFilters(query: WorkbenchQuery): WorkbenchQuery {
    return query.accountId ? { accountId: String(query.accountId) } : {};
  }

  private safeReviewType(value: any): WorkbenchReviewItemType | undefined {
    const type = String(value || '');
    return this.reviewTypes().includes(type as WorkbenchReviewItemType) ? type as WorkbenchReviewItemType : undefined;
  }

  private safePriority(value: any): WorkbenchReviewPriority | undefined {
    const priority = String(value || '');
    return ['low', 'medium', 'high'].includes(priority) ? priority as WorkbenchReviewPriority : undefined;
  }

  private safeLimit(value: any): number {
    const numeric = Number(value || 25);
    if (!Number.isFinite(numeric) || numeric < 1) return 25;
    return Math.min(Math.floor(numeric), 100);
  }

  private reviewTypes(): WorkbenchReviewItemType[] {
    return [
      'draft_blocked',
      'ai_review_required',
      'publish_blocked',
      'reconciliation_drift',
      'blocked_revenue',
      'order_forwarding_failed',
    ];
  }

  private asRecord(value: any): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  private safeArray(value: any): any[] {
    return Array.isArray(value) ? value : [];
  }

  private stringArray(value: any): string[] {
    return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
  }

  private numberOrUndefined(value: any): number | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  }

  private isoString(value: any): string | undefined {
    if (!value) return undefined;
    if (value instanceof Date) return value.toISOString();
    return String(value);
  }

  private shortContext(value: string): string {
    let hash = 0;
    for (let index = 0; index < value.length; index++) {
      hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
    }
    return Math.abs(hash).toString(36);
  }
}
