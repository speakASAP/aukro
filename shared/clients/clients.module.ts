import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CatalogClientService } from './catalog-client.service';
import { WarehouseClientService } from './warehouse-client.service';
import { OrderClientService } from './order-client.service';
import { AiClientService } from './ai-client.service';
import { LeadsClientService } from './leads-client.service';
import { MarketingClientService } from './marketing-client.service';
import { MinioClientService } from './minio-client.service';
import { NotificationsClientService } from './notifications-client.service';
import { PaymentsClientService } from './payments-client.service';
import { SuppliersClientService } from './suppliers-client.service';
import { LoggingClientService } from './logging-client.service';
import { LoggerModule } from '../logger/logger.module';

const clientProviders = [
  CatalogClientService,
  WarehouseClientService,
  OrderClientService,
  AiClientService,
  LeadsClientService,
  MarketingClientService,
  MinioClientService,
  NotificationsClientService,
  PaymentsClientService,
  SuppliersClientService,
  LoggingClientService,
];

@Global()
@Module({
  imports: [HttpModule, LoggerModule],
  providers: clientProviders,
  exports: clientProviders,
})
export class ClientsModule {}
