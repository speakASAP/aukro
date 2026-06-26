import { Injectable } from '@nestjs/common';
import { PrismaService, LoggerService, OrderClientService } from '@aukro/shared';

type CentralOrderItem = {
  productId: string;
  sku?: string | null;
  title: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

@Injectable()
export class OrdersService {
  private readonly logger: LoggerService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly orderClient: OrderClientService,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService;
    this.logger.setContext('OrdersService');
  }

  async findAll(query: any): Promise<any> {
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

  async findOne(id: string): Promise<any> {
    return this.prisma.aukroOrder.findUnique({
      where: { id },
      include: { account: true },
    });
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
      this.logger.error(`Failed to forward order to orders-microservice: ${error.message}`);
    }

    return order;
  }

  async handleWebhook(data: any): Promise<any> {
    try {
      this.logger.log('Received Aukro webhook', { data });

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
    const productId = await this.resolveCatalogProductId(order, item);
    const quantity = this.positiveNumber(item.quantity ?? item.qty, 1);
    const unitPrice = this.numberValue(item.unitPrice ?? item.price ?? item.amount, 0);
    const totalPrice = this.numberValue(item.totalPrice ?? item.total ?? item.lineTotal, unitPrice * quantity);

    return {
      productId,
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
