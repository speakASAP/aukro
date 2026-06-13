import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { LoggerService } from '../logger/logger.service';
import { EcosystemClientBase } from './ecosystem-client.base';
import { AukroClientContext, EcosystemClientResult } from './ecosystem-client.types';

@Injectable()
export class SuppliersClientService extends EcosystemClientBase {
  constructor(httpService: HttpService, logger: LoggerService) {
    super(
      httpService,
      logger,
      'suppliers-microservice',
      process.env.SUPPLIERS_SERVICE_URL || 'http://suppliers-microservice:3202',
      Number(process.env.SUPPLIERS_SERVICE_TIMEOUT || process.env.HTTP_TIMEOUT || 5000),
    );
  }

  getProductSupplierSignals(input: Record<string, any>, context?: AukroClientContext): Promise<EcosystemClientResult> {
    return this.post('/api/suppliers/aukro/product-signals', 'aukro.suppliers.product-signals.v1', { input, context });
  }
}
