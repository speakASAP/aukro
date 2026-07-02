import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';
import { createHash } from 'crypto';
import { LoggerService, PrismaService } from '../index';

const DEFAULT_ROUTING_KEYS = [
  'catalog.product.archived.v1',
  'catalog.product.deleted.v1',
  'catalog.product.inactive.v1',
  'catalog.product.sellability_changed.v1',
  'catalog.product.status_changed.v1',
  'catalog.product.updated.v1',
  'catalog.product.upserted.v1',
  'catalog.product.category_changed.v1',
];

const AUKRO_EXTERNAL_DELISTING_BLOCKER = '[MISSING: approved Aukro external de-listing endpoint/policy]';

type NonOfferableReason =
  | 'catalog_product_archived'
  | 'catalog_product_deleted'
  | 'catalog_product_inactive'
  | 'catalog_product_not_sellable';

@Injectable()
export class CatalogProductEventsSubscriber implements OnModuleInit, OnModuleDestroy {
  private connection: any = null;
  private channel: amqp.Channel | null = null;
  private readonly exchangeName = process.env.CATALOG_EVENTS_EXCHANGE || 'catalog.events';
  private readonly queueName = process.env.CATALOG_PRODUCT_EVENTS_QUEUE || 'catalog.aukro-service';
  private readonly routingKeys = this.parseRoutingKeys();

  constructor(
    private readonly logger: LoggerService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    await this.connect();
    await this.subscribe();
  }

  async onModuleDestroy() {
    try {
      if (this.channel) await (this.channel as any).close();
      if (this.connection) await this.connection.close();
    } catch {
      // Ignore shutdown errors.
    }
  }

  private async connect() {
    try {
      const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';
      this.logger.log(`Connecting to RabbitMQ Catalog events: ${url}`, 'CatalogProductEventsSubscriber');

      this.connection = await amqp.connect(url);
      const ch = await this.connection.createChannel();
      this.channel = ch as unknown as amqp.Channel;

      await this.channel.assertExchange(this.exchangeName, 'topic', { durable: true });
      await this.channel.assertQueue(this.queueName, { durable: true });
      for (const routingKey of this.routingKeys) {
        await this.channel.bindQueue(this.queueName, this.exchangeName, routingKey);
      }

      this.logger.log('Connected to RabbitMQ and subscribed to Catalog product events', {
        exchangeName: this.exchangeName,
        queueName: this.queueName,
        routingKeys: this.routingKeys,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to connect to Catalog product events: ${errorMessage}`, errorStack, 'CatalogProductEventsSubscriber');
    }
  }

  private async subscribe() {
    if (!this.channel) return;

    try {
      await this.channel.consume(
        this.queueName,
        async (msg) => {
          if (!msg) return;

          try {
            const event = JSON.parse(msg.content.toString());
            await this.handleCatalogProductEvent({ ...event, routingKey: msg.fields.routingKey || event?.routingKey });
            this.channel?.ack(msg);
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Error processing Catalog product event: ${errorMessage}`, errorStack, 'CatalogProductEventsSubscriber');
            this.channel?.nack(msg, false, false);
          }
        },
        { noAck: false },
      );

      this.logger.log('Subscribed to Catalog product events queue', 'CatalogProductEventsSubscriber');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to subscribe to Catalog product events: ${errorMessage}`, errorStack, 'CatalogProductEventsSubscriber');
    }
  }

  private async handleCatalogProductEvent(event: any) {
    const eventType = this.eventType(event);
    const productId = this.normalizeProductId(
      event?.catalogProductId
      ?? event?.productId
      ?? event?.payload?.catalogProductId
      ?? event?.payload?.productId
      ?? event?.aggregate?.id
      ?? event?.payload?.aggregate?.id
      ?? event?.data?.catalogProductId
      ?? event?.data?.productId
      ?? event?.data?.product?.catalogProductId
      ?? event?.data?.product?.id
      ?? event?.after?.id
      ?? event?.payload?.after?.id
      ?? event?.data?.after?.id,
    );

    if (!productId) {
      this.logger.warn('Ignoring Catalog product event without catalog product id', {
        eventType,
        eventId: event?.eventId || event?.id || null,
      });
      return;
    }

    const reason = this.nonOfferableReason(eventType, event);
    if (!reason) {
      this.logger.warn('Catalog product event is not applied to Aukro local state without a safe refresh policy', {
        eventType,
        productId,
        blocker: '[MISSING: safe catalog-event refresh policy]',
      });
      return;
    }

    await this.applyNonOfferableCatalogEvent(event, eventType, productId, reason);
  }

  private async applyNonOfferableCatalogEvent(event: any, eventType: string, productId: string, reason: NonOfferableReason) {
    const eventId = this.eventId(event, eventType, productId, reason);
    const receivedAt = new Date();
    const offers = await this.prisma.aukroOffer.findMany({
      where: { productId },
      select: {
        id: true,
        aukroOfferId: true,
        stockQuantity: true,
        isActive: true,
        rawData: true,
      },
      orderBy: { updatedAt: 'asc' },
    });

    if (offers.length === 0) {
      this.logger.log('No Aukro offers found for Catalog product availability event', { eventType, eventId, productId, reason });
      return;
    }

    let updated = 0;
    let idempotent = 0;
    for (const offer of offers) {
      const rawData = this.jsonObject(offer.rawData);
      const existing = this.jsonObject((rawData as any).catalogProductAvailabilitySync);
      if (existing.eventId === eventId && existing.status === 'applied') {
        idempotent += 1;
        continue;
      }

      await this.prisma.aukroOffer.update({
        where: { id: offer.id },
        data: {
          stockQuantity: 0,
          isActive: false,
          rawData: {
            ...rawData,
            catalogProductAvailabilitySync: {
              eventId,
              eventType,
              status: 'applied',
              reason,
              source: 'catalog-microservice',
              targetOfferable: false,
              previousQuantity: Number.isFinite(Number(offer.stockQuantity)) ? Number(offer.stockQuantity) : null,
              previousIsActive: Boolean(offer.isActive),
              appliedAt: receivedAt.toISOString(),
              externalAction: 'not_attempted',
              externalBlocker: AUKRO_EXTERNAL_DELISTING_BLOCKER,
            },
          } as any,
        },
      });
      updated += 1;
    }

    this.logger.log('Aukro Catalog product availability event processed', {
      eventType,
      eventId,
      productId,
      reason,
      offers: offers.length,
      updated,
      idempotent,
      externalBlocker: AUKRO_EXTERNAL_DELISTING_BLOCKER,
    });
  }

  private nonOfferableReason(eventType: string, event: any): NonOfferableReason | null {
    if (eventType === 'catalog.product.deleted.v1') return 'catalog_product_deleted';
    if (eventType === 'catalog.product.archived.v1') return 'catalog_product_archived';
    if (eventType === 'catalog.product.inactive.v1') return 'catalog_product_inactive';
    if (eventType === 'catalog.product.sellability_changed.v1' && this.booleanFalse(this.afterSellable(event))) {
      return 'catalog_product_not_sellable';
    }

    const status = this.afterStatus(event);
    if (status === 'deleted') return 'catalog_product_deleted';
    if (status === 'archived') return 'catalog_product_archived';
    if (status === 'inactive') return 'catalog_product_inactive';
    if (this.booleanFalse(this.afterActive(event))) return 'catalog_product_inactive';
    if (this.booleanFalse(this.afterSellable(event))) return 'catalog_product_not_sellable';
    return null;
  }

  private eventType(event: any): string {
    return String(event?.type || event?.eventType || event?.name || event?.routingKey || '').trim();
  }

  private eventId(event: any, eventType: string, productId: string, reason: string): string {
    const id = String(event?.eventId || event?.id || '').trim();
    if (id) return id;
    return `catalog-availability-${createHash('sha256').update(`${eventType}:${productId}:${reason}`).digest('hex').slice(0, 32)}`;
  }

  private afterSellable(event: any): unknown {
    return event?.afterSellable
      ?? event?.sellable
      ?? event?.payload?.afterSellable
      ?? event?.payload?.sellable
      ?? event?.payload?.after?.sellable
      ?? event?.data?.afterSellable
      ?? event?.data?.sellable
      ?? event?.data?.change?.afterSellable
      ?? event?.data?.product?.sellable
      ?? event?.data?.product?.isSellable
      ?? (typeof event?.data?.product?.isActive === "boolean" ? event.data.product.isActive : undefined)
      ?? event?.data?.after?.sellable
      ?? event?.after?.sellable;
  }

  private afterActive(event: any): unknown {
    return event?.afterActive
      ?? event?.isActive
      ?? event?.active
      ?? event?.payload?.afterActive
      ?? event?.payload?.isActive
      ?? event?.payload?.active
      ?? event?.payload?.after?.isActive
      ?? event?.payload?.after?.active
      ?? event?.data?.afterActive
      ?? event?.data?.isActive
      ?? event?.data?.active
      ?? event?.data?.product?.isActive
      ?? event?.data?.product?.active
      ?? event?.data?.after?.isActive
      ?? event?.data?.after?.active
      ?? event?.after?.isActive
      ?? event?.after?.active;
  }

  private afterStatus(event: any): string {
    return String(
      event?.afterStatus
      ?? event?.status
      ?? event?.payload?.afterStatus
      ?? event?.payload?.status
      ?? event?.payload?.after?.status
      ?? event?.data?.afterStatus
      ?? event?.data?.status
      ?? event?.data?.change?.afterStatus
      ?? event?.data?.change?.afterLifecycle
      ?? event?.data?.product?.lifecycle
      ?? event?.data?.product?.status
      ?? event?.data?.after?.status
      ?? event?.after?.status
      ?? '',
    ).trim().toLowerCase();
  }

  private booleanFalse(value: unknown): boolean {
    if (value === false || value === 0) return true;
    const normalized = String(value).trim().toLowerCase();
    return normalized === 'false' || normalized === '0' || normalized === 'no';
  }

  private normalizeProductId(value: unknown): string {
    const productId = String(value || '').trim();
    return productId || '';
  }

  private jsonObject(value: unknown): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value) ? { ...(value as Record<string, any>) } : {};
  }

  private parseRoutingKeys(): string[] {
    const configured = String(process.env.CATALOG_PRODUCT_EVENTS_ROUTING_KEYS || '').trim();
    if (!configured) return DEFAULT_ROUTING_KEYS;
    const keys = configured.split(',').map((key) => key.trim()).filter(Boolean);
    return keys.length > 0 ? keys : DEFAULT_ROUTING_KEYS;
  }
}
