import { Module } from '@nestjs/common';
import { StockEventsSubscriber } from './stock-events.subscriber';
import { CatalogProductEventsSubscriber } from './catalog-product-events.subscriber';
import { LoggerModule } from '../logger/logger.module';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [LoggerModule, PrismaModule],
  providers: [StockEventsSubscriber, CatalogProductEventsSubscriber],
  exports: [StockEventsSubscriber, CatalogProductEventsSubscriber],
})
export class RabbitMQModule {}

