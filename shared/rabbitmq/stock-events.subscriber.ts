import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqplib';
import { createHash } from 'crypto';
import { LoggerService, PrismaService } from '../index';

const AUKRO_EXTERNAL_DELISTING_BLOCKER = '[MISSING: approved Aukro external de-listing endpoint/policy]';

@Injectable()
export class StockEventsSubscriber implements OnModuleInit, OnModuleDestroy {
  private connection: any = null;
  private channel: amqp.Channel | null = null;
  private readonly exchangeName = 'stock.events';
  private readonly queueName = 'stock.aukro-service';

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
      this.logger.log(`Connecting to RabbitMQ: ${url}`, 'StockEventsSubscriber');

      this.connection = await amqp.connect(url);
      const ch = await this.connection.createChannel();
      this.channel = ch as unknown as amqp.Channel;

      await this.channel.assertExchange(this.exchangeName, 'topic', { durable: true });
      await this.channel.assertQueue(this.queueName, { durable: true });
      await this.channel.bindQueue(this.queueName, this.exchangeName, 'stock.#');

      this.logger.log('Connected to RabbitMQ and subscribed to stock events', 'StockEventsSubscriber');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to connect to RabbitMQ: ${errorMessage}`, errorStack, 'StockEventsSubscriber');
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
            await this.handleStockEvent({ ...event, routingKey: msg.fields.routingKey || event?.routingKey });
            this.channel?.ack(msg);
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Error processing stock event: ${errorMessage}`, errorStack, 'StockEventsSubscriber');
            this.channel?.nack(msg, false, false);
          }
        },
        { noAck: false },
      );

      this.logger.log('Subscribed to stock events queue', 'StockEventsSubscriber');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to subscribe to stock events: ${errorMessage}`, errorStack, 'StockEventsSubscriber');
    }
  }

  private async handleStockEvent(event: any) {
    const eventType = this.eventType(event);
    const productId = this.normalizeProductId(event?.productId ?? event?.catalogProductId ?? event?.payload?.productId ?? event?.data?.productId);

    if (!productId) {
      this.logger.warn('Ignoring Warehouse stock event without productId', {
        eventType,
        eventId: event?.id || event?.eventId || null,
      });
      return;
    }

    switch (eventType) {
      case 'stock.updated':
        await this.applyWarehouseStockEvent(event, productId, this.normalizeQuantity(event?.available ?? event?.payload?.available ?? event?.data?.available), 'stock.updated');
        break;
      case 'stock.out':
        await this.applyWarehouseStockEvent(event, productId, 0, 'stock.out');
        break;
      case 'stock.low':
        this.logger.warn(`Low stock alert for product ${productId}: ${event?.available} available`, 'StockEventsSubscriber');
        break;
      default:
        this.logger.warn('Ignoring unsupported Warehouse stock event type', { eventType, productId });
    }
  }

  private async applyWarehouseStockEvent(event: any, productId: string, targetQuantity: number, eventType: 'stock.updated' | 'stock.out') {
    const eventId = this.eventId(event, eventType, productId, String(targetQuantity));
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
      this.logger.log('No Aukro offers found for Warehouse stock event', { eventType, eventId, productId, targetQuantity });
      return;
    }

    let updated = 0;
    let idempotent = 0;
    for (const offer of offers) {
      const rawData = this.jsonObject(offer.rawData);
      const existing = this.jsonObject((rawData as any).warehouseStockSync);
      if (existing.eventId === eventId && existing.status === 'applied' && existing.targetQuantity === targetQuantity) {
        idempotent += 1;
        continue;
      }

      const warehouseStockSync: Record<string, any> = {
        eventId,
        eventType,
        status: 'applied',
        source: 'warehouse-microservice',
        sourceField: eventType === 'stock.updated' ? 'available' : 'stock.out',
        targetQuantity,
        previousQuantity: Number.isFinite(Number(offer.stockQuantity)) ? Number(offer.stockQuantity) : null,
        previousIsActive: Boolean(offer.isActive),
        appliedAt: receivedAt.toISOString(),
        externalAction: 'not_attempted',
      };

      const data: Record<string, any> = {
        stockQuantity: targetQuantity,
        rawData: { ...rawData, warehouseStockSync } as any,
      };

      if (targetQuantity <= 0) {
        data.isActive = false;
        warehouseStockSync.externalBlocker = AUKRO_EXTERNAL_DELISTING_BLOCKER;
      }

      await this.prisma.aukroOffer.update({ where: { id: offer.id }, data });
      updated += 1;
    }

    this.logger.log('Aukro Warehouse stock event processed', {
      eventType,
      eventId,
      productId,
      targetQuantity,
      offers: offers.length,
      updated,
      idempotent,
      externalBlocker: targetQuantity <= 0 ? AUKRO_EXTERNAL_DELISTING_BLOCKER : undefined,
    });
  }

  private eventType(event: any): string {
    return String(event?.type || event?.eventType || event?.routingKey || '').trim();
  }

  private eventId(event: any, eventType: string, productId: string, value: string): string {
    const id = String(event?.eventId || event?.id || '').trim();
    if (id) return id;
    return `warehouse-stock-${createHash('sha256').update(`${eventType}:${productId}:${value}`).digest('hex').slice(0, 32)}`;
  }

  private normalizeProductId(value: unknown): string {
    const productId = String(value || '').trim();
    return productId || '';
  }

  private normalizeQuantity(value: unknown): number {
    const quantity = Number(value);
    if (!Number.isFinite(quantity) || quantity <= 0) return 0;
    return Math.floor(quantity);
  }

  private jsonObject(value: unknown): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value) ? { ...(value as Record<string, any>) } : {};
  }
}
