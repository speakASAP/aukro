import { createHash } from 'crypto';
import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService, LoggerService, OrderClientService, WarehouseClientService } from '@aukro/shared';

export const AUKRO_ORDER_AFFINITY_REPLAY_CONTRACT = 'marketplace.order_affinity_candidate.v1';

const AUKRO_ORDER_AFFINITY_ELIGIBLE_STATUSES = new Set([
  'paid',
  'payment_completed',
  'ready_for_processing',
  'processing',
  'shipped',
  'delivered',
  'completed',
]);

const AUKRO_ORDER_READ_ADMIN_ROLES = new Set([
  'global:superadmin',
  'global:platform_admin',
  'app:aukro-service:admin',
  'app:aukro:admin',
  'aukro:admin',
]);

type OrdersReadActor = { roles?: string[] | null };

type CentralOrderItem = {
  productId: string;
  sku?: string | null;
  title: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  warehouseId: string;
};

type OrderAffinityReplayQuery = {
  from?: string;
  to?: string;
  limit?: string | number;
  cursor?: string;
  dryRun?: string | boolean;
};

function positiveInteger(value: any, fallback: number, max: number): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function parseDate(value: any): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isoOrNull(value: any): string | null {
  const parsed = parseDate(value);
  return parsed ? parsed.toISOString() : null;
}

function hashedReplayRef(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 32);
}

@Injectable()
export class OrdersService {
  private readonly logger: LoggerService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly orderClient: OrderClientService,
    private readonly warehouseClient: WarehouseClientService,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService;
    this.logger.setContext('OrdersService');
  }

  async findAll(query: any, actor?: OrdersReadActor): Promise<any> {
    this.assertOrderReadAdmin(actor);
    return this.prisma.aukroOrder.findMany({
      where: {
        accountId: query.accountId,
        status: query.status,
        forwarded: query.forwarded !== undefined ? query.forwarded === 'true' : undefined,
      },
      include: {
        account: true,
      },
    });
  }

  async findOne(id: string, actor?: OrdersReadActor): Promise<any> {
    this.assertOrderReadAdmin(actor);
    return this.prisma.aukroOrder.findUnique({
      where: { id },
      include: { account: true },
    });
  }

  private assertOrderReadAdmin(actor?: OrdersReadActor): void {
    const roles = Array.isArray(actor?.roles) ? actor.roles : [];
    if (!roles.some((role) => AUKRO_ORDER_READ_ADMIN_ROLES.has(role))) {
      throw new ForbiddenException("Aukro order read requires admin role");
    }
  }

  async create(data: any): Promise<any> {
    const order = await this.prisma.aukroOrder.create({
      data,
    });

    try {
      const items = await this.buildCentralOrderItems(order);

      const centralOrder = await this.orderClient.createOrder({
        externalOrderId: order.aukroOrderId,
        channel: 'aukro',
        channelAccountId: order.accountId,
        customer: {
          email: order.customerEmail,
          phone: order.customerPhone,
        },
        items,
        subtotal: Number(order.total),
        shippingCost: 0,
        taxAmount: 0,
        total: Number(order.total),
        currency: order.currency,
        orderedAt: order.createdAt,
      });

      await this.prisma.aukroOrder.update({
        where: { id: order.id },
        data: {
          orderId: centralOrder.id,
          forwarded: true,
        },
      });

      this.logger.log(`Order ${order.id} forwarded to orders-microservice: ${centralOrder.id}`);
    } catch (error: any) {
      const message = error?.message || 'UNKNOWN_ORDER_FORWARDING_FAILURE';
      this.logger.error(`Failed to forward order to orders-microservice: ${message}`);
      throw error;
    }

    return order;
  }

  async handleWebhook(data: any): Promise<any> {
    try {
      this.logger.log('Received Aukro webhook');

      // Real Aukro webhook shape is [UNKNOWN]; keep parsing to the current synthetic/internal contract.
      const {
        orderId: aukroOrderId,
        accountId,
        customerEmail,
        customerPhone,
        total,
        currency = 'CZK',
        status = 'pending',
      } = data;

      if (!aukroOrderId) {
        throw new Error('orderId is required in webhook data');
      }

      const existingOrder = await this.prisma.aukroOrder.findUnique({
        where: { aukroOrderId },
      });

      if (existingOrder) {
        this.logger.log(`Order ${aukroOrderId} already exists, updating status`);
        if (existingOrder.status !== status) {
          await this.prisma.aukroOrder.update({
            where: { id: existingOrder.id },
            data: { status, updatedAt: new Date() },
          });
        }
        return existingOrder;
      }

      let finalAccountId = accountId;
      if (!finalAccountId) {
        const accounts = await this.prisma.aukroAccount.findMany({
          where: { isActive: true },
        });
        if (accounts.length === 1) {
          finalAccountId = accounts[0].id;
        } else {
          throw new Error('accountId is required when multiple accounts exist');
        }
      }

      const order = await this.create({
        accountId: finalAccountId,
        aukroOrderId,
        customerEmail,
        customerPhone,
        total: parseFloat(total) || 0,
        currency,
        status,
        rawData: {
          ...data,
          items: this.extractRawOrderItems(data),
        },
      });

      this.logger.log(`Order created from webhook: ${order.id}`);
      return order;
    } catch (error: any) {
      this.logger.error(`Failed to handle webhook: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async buildCentralOrderItems(order: any): Promise<CentralOrderItem[]> {
    const rawData = this.asRecord(order.rawData);
    const rawItems = this.extractRawOrderItems(rawData);

    if (rawItems.length === 0) {
      throw new Error(`Aukro order ${order.aukroOrderId} has no line items to forward`);
    }

    const items: CentralOrderItem[] = [];
    for (const rawItem of rawItems) {
      items.push(await this.buildCentralOrderItem(order, this.asRecord(rawItem)));
    }

    return items;
  }

  private async buildCentralOrderItem(order: any, item: Record<string, any>): Promise<CentralOrderItem> {
    const quantity = this.positiveNumber(item.quantity ?? item.qty, 1);
    const productId = await this.resolveCatalogProductId(order, item);
    const warehouseId = await this.resolveWarehouseId(order, item, productId, quantity);
    const unitPrice = this.numberValue(item.unitPrice ?? item.price ?? item.amount, 0);
    const totalPrice = this.numberValue(item.totalPrice ?? item.total ?? item.lineTotal, unitPrice * quantity);

    return {
      productId,
      warehouseId,
      sku: this.optionalString(item.sku),
      title: this.optionalString(item.title ?? item.name) || 'Unknown',
      quantity,
      unitPrice,
      totalPrice,
    };
  }

  private async resolveCatalogProductId(order: any, item: Record<string, any>): Promise<string> {
    const explicitCatalogProductId = this.explicitCatalogProductId(item);
    if (explicitCatalogProductId) {
      return explicitCatalogProductId;
    }

    const offerIdentifiers = this.offerIdentifiers(item);
    if (offerIdentifiers.length === 0) {
      throw new Error(`Aukro order ${order.aukroOrderId} item is missing an Aukro offer/listing identifier`);
    }

    const offer = await this.prisma.aukroOffer.findFirst({
      where: {
        accountId: order.accountId,
        OR: offerIdentifiers.flatMap((identifier) => {
          const conditions: any[] = [{ aukroOfferId: identifier }];
          if (this.isUuid(identifier)) {
            conditions.push({ id: identifier });
          }
          return conditions;
        }),
      },
      select: {
        id: true,
        aukroOfferId: true,
        productId: true,
      },
    });

    if (!offer?.productId) {
      throw new Error(`Aukro order ${order.aukroOrderId} item could not be mapped to a Catalog product via offer/listing ${offerIdentifiers.join(', ')}`);
    }

    return String(offer.productId);
  }

  private async resolveWarehouseId(order: any, item: Record<string, any>, productId: string, quantity: number): Promise<string> {
    const explicitWarehouseId = this.explicitWarehouseId(item);
    const stockRows = await this.warehouseClient.getStockByProduct(productId);
    const availableRows = stockRows
      .map((row) => this.asRecord(row))
      .map((row) => ({
        warehouseId: this.optionalString(row.warehouseId),
        available: this.availableStock(row),
      }))
      .filter((row): row is { warehouseId: string; available: number } => Boolean(row.warehouseId));

    if (explicitWarehouseId) {
      const matchingRow = availableRows.find((row) => row.warehouseId === explicitWarehouseId);
      if (!matchingRow) {
        throw new BadRequestException(`ORDER_FORWARDING_WAREHOUSE_ID_INVALID for product ${productId}`);
      }
      if (matchingRow.available < quantity) {
        throw new BadRequestException(`ORDER_FORWARDING_WAREHOUSE_STOCK_UNAVAILABLE for product ${productId}`);
      }
      return explicitWarehouseId;
    }

    const availableRow = availableRows.find((row) => row.available >= quantity);
    if (!availableRow) {
      throw new BadRequestException(`ORDER_FORWARDING_WAREHOUSE_ID_MISSING for product ${productId}`);
    }

    return availableRow.warehouseId;
  }

  private explicitWarehouseId(item: Record<string, any>): string | undefined {
    const warehouse = this.asRecord(item.warehouse);
    const stock = this.asRecord(item.stock);
    const availability = this.asRecord(item.availability);
    const inventory = this.asRecord(item.inventory);
    const candidates = [
      item.warehouseId,
      item.warehouse_id,
      warehouse.id,
      warehouse.warehouseId,
      stock.warehouseId,
      availability.warehouseId,
      inventory.warehouseId,
    ];

    return candidates.map((candidate) => this.optionalString(candidate)).find(Boolean);
  }

  private availableStock(row: Record<string, any>): number {
    const explicitAvailable = this.numberValue(row.available, Number.NaN);
    if (Number.isFinite(explicitAvailable)) {
      return explicitAvailable;
    }

    const quantity = this.numberValue(row.quantity, 0);
    const reserved = this.numberValue(row.reserved, 0);
    return Math.max(quantity - reserved, 0);
  }

  private extractRawOrderItems(rawData: any): any[] {
    const raw = this.asRecord(rawData);
    const directItems = raw.items;
    const orderItems = this.asRecord(raw.order).items;
    const orderLines = raw.orderItems;
    const lines = raw.lines;

    for (const candidate of [directItems, orderItems, orderLines, lines]) {
      if (Array.isArray(candidate)) {
        return candidate;
      }
    }

    return [];
  }

  private explicitCatalogProductId(item: Record<string, any>): string | undefined {
    const namedCanonical = this.optionalString(item.catalogProductId ?? item.canonicalProductId);
    if (namedCanonical) {
      return namedCanonical;
    }

    const productId = this.optionalString(item.productId);
    if (!productId) {
      return undefined;
    }

    const productIdType = this.optionalString(item.productIdType ?? item.productIdSource ?? item.productSource);
    if (productIdType && ['catalog', 'catalog-product', 'catalog_product', 'canonical'].includes(productIdType.toLowerCase())) {
      return productId;
    }

    return item.isCatalogProductId === true ? productId : undefined;
  }

  private offerIdentifiers(item: Record<string, any>): string[] {
    const candidates = [
      item.offerId,
      item.aukroOfferId,
      item.listingId,
      item.aukroListingId,
      item.externalOfferId,
      item.externalListingId,
      item.productId,
    ];

    return Array.from(new Set(candidates.map((candidate) => this.optionalString(candidate)).filter(Boolean) as string[]));
  }

  async getOrderAffinityReplayCandidates(query: OrderAffinityReplayQuery = {}): Promise<any> {
    const limit = positiveInteger(query.limit, 50, 200);
    const fetchLimit = Math.min(limit * 5, 1000);
    const createdAt: any = {};
    const from = isoOrNull(query.from);
    const to = isoOrNull(query.to);
    if (from) createdAt.gte = new Date(from);
    if (to) createdAt.lte = new Date(to);
    const rows = await this.prisma.aukroOrder.findMany({
      where: Object.keys(createdAt).length > 0 ? { createdAt } : {},
      take: fetchLimit,
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        aukroOrderId: true,
        total: true,
        currency: true,
        status: true,
        rawData: true,
        createdAt: true,
      },
    });
    const events = rows
      .map((order) => this.buildOrderAffinityReplayEvent(order))
      .filter((event): event is Record<string, unknown> => Boolean(event))
      .slice(0, limit);
    return {
      sourceOwner: 'aukro-service',
      consumerOwner: 'marketing-microservice',
      contract: AUKRO_ORDER_AFFINITY_REPLAY_CONTRACT,
      channel: 'aukro',
      filters: {
        from,
        to,
        limit,
        cursor: query.cursor || null,
        dryRun: query.dryRun === true || query.dryRun === 'true',
      },
      cursorBefore: query.cursor || null,
      cursorAfter: null,
      count: events.length,
      events,
      skippedRecords: Math.max(0, rows.length - events.length),
    };
  }

  private buildOrderAffinityReplayEvent(order: any): Record<string, unknown> | null {
    if (!this.isOrderAffinityReplayStatusEligible(order.status)) return null;

    const rawData = this.asRecord(order.rawData);
    const mappedItems = this.extractRawOrderItems(rawData)
      .map((item) => this.asRecord(item))
      .map((item) => this.buildReplayItem(item))
      .filter((item): item is Record<string, unknown> => Boolean(item));
    const distinctProductIds = new Set(mappedItems.map((item: any) => item.productId));
    if (distinctProductIds.size < 2) return null;
    const safeRef = hashedReplayRef(String(order.aukroOrderId || order.id));
    return {
      type: AUKRO_ORDER_AFFINITY_REPLAY_CONTRACT,
      eventVersion: 1,
      eventId: `aukro.order-affinity:${safeRef}`,
      occurredAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : String(order.createdAt || new Date().toISOString()),
      source: 'aukro-service',
      payload: {
        orderId: `aukro-replay:${safeRef}`,
        channel: 'aukro',
        currency: this.optionalString(order.currency) || 'CZK',
        items: mappedItems,
      },
    };
  }

  private isOrderAffinityReplayStatusEligible(status: any): boolean {
    const normalized = this.optionalString(status)?.toLowerCase().replace(/[\s-]+/g, '_');
    return Boolean(normalized && AUKRO_ORDER_AFFINITY_ELIGIBLE_STATUSES.has(normalized));
  }

  private buildReplayItem(item: Record<string, any>): Record<string, unknown> | null {
    const productId = this.explicitCatalogProductId(item);
    if (!productId) return null;
    const quantity = this.positiveNumber(item.quantity ?? item.qty, 1);
    const unitPrice = this.numberValue(item.unitPrice ?? item.price ?? item.amount, 0);
    const totalPrice = this.numberValue(item.totalPrice ?? item.total ?? item.lineTotal, unitPrice * quantity);
    return {
      productId,
      ...(this.optionalString(item.sku) ? { sku: this.optionalString(item.sku) } : {}),
      quantity,
      unitPrice,
      totalPrice,
    };
  }

  private asRecord(value: any): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  private optionalString(value: any): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    const trimmed = String(value).trim();
    return trimmed || undefined;
  }

  private numberValue(value: any, fallback: number): number {
    const parsed = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private positiveNumber(value: any, fallback: number): number {
    const parsed = this.numberValue(value, fallback);
    return parsed > 0 ? parsed : fallback;
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }
}
