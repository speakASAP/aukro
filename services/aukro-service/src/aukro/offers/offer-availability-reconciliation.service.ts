import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { CatalogClientService, LoggerService, PrismaService, WarehouseClientService } from '@aukro/shared';

const AUKRO_EXTERNAL_DELISTING_BLOCKER = '[MISSING: approved Aukro external de-listing endpoint/policy]';
const SAFE_REFRESH_BLOCKER = '[MISSING: safe catalog-event refresh policy]';

export type AukroAvailabilityReconciliationReason =
  | 'catalog_product_missing'
  | 'catalog_product_archived'
  | 'catalog_product_deleted'
  | 'catalog_product_inactive'
  | 'catalog_product_not_sellable'
  | 'warehouse_stock_unavailable';

export interface AukroAvailabilityReconciliationOptions {
  limit?: number;
  dryRun?: boolean;
  now?: Date;
}

export interface AukroAvailabilityReconciliationResult {
  scanned: number;
  disabled: number;
  kept: number;
  failed: number;
  dryRun: boolean;
  blocker: string;
  failures: Array<{ offerId: string; productId: string; error: string }>;
}

@Injectable()
export class AukroAvailabilityReconciliationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogClient: CatalogClientService,
    private readonly warehouseClient: WarehouseClientService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('AukroAvailabilityReconciliationService');
  }

  async reconcile(options: AukroAvailabilityReconciliationOptions = {}): Promise<AukroAvailabilityReconciliationResult> {
    const limit = this.limit(options.limit);
    const dryRun = Boolean(options.dryRun);
    const checkedAt = options.now || new Date();
    const offers = await this.prisma.aukroOffer.findMany({
      where: {
        productId: { not: null },
        OR: [
          { isActive: true },
          { stockQuantity: { gt: 0 } },
        ],
      },
      select: {
        id: true,
        productId: true,
        aukroOfferId: true,
        stockQuantity: true,
        isActive: true,
        rawData: true,
      },
      orderBy: { updatedAt: 'asc' },
      take: limit,
    });

    const result: AukroAvailabilityReconciliationResult = {
      scanned: offers.length,
      disabled: 0,
      kept: 0,
      failed: 0,
      dryRun,
      blocker: SAFE_REFRESH_BLOCKER,
      failures: [],
    };

    for (const offer of offers) {
      const productId = this.normalizeProductId(offer.productId);
      if (!productId) {
        result.kept += 1;
        continue;
      }

      try {
        const decision = await this.evaluate(productId);
        if (!decision.reason) {
          result.kept += 1;
          continue;
        }

        if (!dryRun) {
          await this.disableOffer(offer, decision.reason, decision, checkedAt);
        }
        result.disabled += 1;
      } catch (error: any) {
        result.failed += 1;
        result.failures.push({
          offerId: offer.id,
          productId,
          error: error?.message || String(error),
        });
        this.logger.warn('Aukro availability reconciliation failed for offer', {
          offerId: offer.id,
          productId,
          error: error?.message || String(error),
        });
      }
    }

    this.logger.log('Aukro availability reconciliation completed', result);
    return result;
  }

  private async evaluate(productId: string): Promise<{
    reason: AukroAvailabilityReconciliationReason | null;
    warehouseAvailable: number;
  }> {
    const catalogProduct = await this.getCatalogProduct(productId);
    const catalogReason = this.catalogNonSellableReason(catalogProduct);
    if (catalogReason) {
      return { reason: catalogReason, warehouseAvailable: 0 };
    }

    const warehouseAvailable = Number(await this.warehouseClient.getTotalAvailable(productId));
    if (!Number.isFinite(warehouseAvailable) || warehouseAvailable <= 0) {
      return { reason: 'warehouse_stock_unavailable', warehouseAvailable: 0 };
    }

    return { reason: null, warehouseAvailable };
  }

  private async getCatalogProduct(productId: string): Promise<any | null> {
    try {
      return await this.catalogClient.getProductById(productId);
    } catch (error: any) {
      this.logger.warn('Aukro availability reconciliation treating Catalog lookup failure as non-sellable', {
        productId,
        error: error?.message || String(error),
      });
      return null;
    }
  }

  private catalogNonSellableReason(product: any | null): AukroAvailabilityReconciliationReason | null {
    if (!product) return 'catalog_product_missing';
    const status = String(product.status || product.lifecycleStatus || product.state || '').trim().toLowerCase();
    if (status === 'deleted') return 'catalog_product_deleted';
    if (status === 'archived') return 'catalog_product_archived';
    if (status === 'inactive') return 'catalog_product_inactive';
    if (this.booleanFalse(product.isActive ?? product.active)) return 'catalog_product_inactive';
    if (this.booleanFalse(product.isSellable ?? product.sellable ?? product.offerable ?? product.isOfferable)) {
      return 'catalog_product_not_sellable';
    }
    return null;
  }

  private async disableOffer(offer: any, reason: AukroAvailabilityReconciliationReason, decision: { warehouseAvailable: number }, checkedAt: Date) {
    const rawData = this.jsonObject(offer.rawData);
    const reconciliationId = this.reconciliationId(offer.id, offer.productId, reason);
    const blockedQueue = this.blockPublishQueue(rawData.publishQueue, reason, checkedAt);
    await this.prisma.aukroOffer.update({
      where: { id: offer.id },
      data: {
        stockQuantity: 0,
        isActive: false,
        rawData: {
          ...rawData,
          publishQueue: blockedQueue,
          availabilityReconciliation: {
            reconciliationId,
            status: 'applied',
            reason,
            source: 'manual_reconciliation',
            catalogProductId: this.normalizeProductId(offer.productId),
            warehouseAvailable: Number.isFinite(Number(decision.warehouseAvailable)) ? Number(decision.warehouseAvailable) : 0,
            previousQuantity: Number.isFinite(Number(offer.stockQuantity)) ? Number(offer.stockQuantity) : null,
            previousIsActive: Boolean(offer.isActive),
            previousQueueStatus: this.jsonObject(rawData.publishQueue).status || null,
            appliedAt: checkedAt.toISOString(),
            externalAction: 'not_attempted',
            externalBlocker: AUKRO_EXTERNAL_DELISTING_BLOCKER,
            positiveRefreshBlocker: SAFE_REFRESH_BLOCKER,
          },
        } as any,
      },
    });
  }

  private blockPublishQueue(value: unknown, reason: string, checkedAt: Date): Record<string, any> {
    const queue = this.jsonObject(value);
    const attempts = Array.isArray(queue.attempts) ? queue.attempts : [];
    return {
      ...queue,
      status: 'blocked',
      blockedCount: Number(queue.blockedCount || 0) + 1,
      lastBlockedAt: checkedAt.toISOString(),
      attempts: [
        ...attempts,
        {
          id: `availability-reconciliation-${createHash('sha256').update(`${reason}:${checkedAt.toISOString()}`).digest('hex').slice(0, 12)}`,
          status: 'blocked',
          attemptedAt: checkedAt.toISOString(),
          reasonCodes: [reason],
          blockers: [reason, AUKRO_EXTERNAL_DELISTING_BLOCKER, SAFE_REFRESH_BLOCKER],
          mutation: { enabled: false, reason: 'LOCAL_RECONCILIATION_ONLY' },
        },
      ],
    };
  }

  private reconciliationId(offerId: string, productId: string, reason: string): string {
    return `aukro-availability-${createHash('sha256').update(`${offerId}:${productId}:${reason}:v1`).digest('hex').slice(0, 32)}`;
  }

  private normalizeProductId(value: unknown): string {
    const productId = String(value || '').trim();
    return productId || '';
  }

  private booleanFalse(value: unknown): boolean {
    if (value === false || value === 0) return true;
    const normalized = String(value ?? '').trim().toLowerCase();
    return normalized === 'false' || normalized === '0' || normalized === 'no';
  }

  private jsonObject(value: unknown): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value) ? { ...(value as Record<string, any>) } : {};
  }

  private limit(value: unknown): number {
    const parsed = Number(value || process.env.AUKRO_AVAILABILITY_RECONCILIATION_LIMIT || 200);
    if (!Number.isFinite(parsed)) return 200;
    return Math.max(1, Math.min(Math.floor(parsed), 1000));
  }
}
