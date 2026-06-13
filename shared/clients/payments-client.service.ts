import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { LoggerService } from '../logger/logger.service';
import { EcosystemClientBase } from './ecosystem-client.base';
import { AukroClientContext, EcosystemClientResult } from './ecosystem-client.types';

@Injectable()
export class PaymentsClientService extends EcosystemClientBase {
  constructor(httpService: HttpService, logger: LoggerService) {
    super(
      httpService,
      logger,
      'payments-microservice',
      process.env.PAYMENT_SERVICE_URL || 'http://payments-microservice:3468',
      Number(process.env.PAYMENT_SERVICE_TIMEOUT || process.env.HTTP_TIMEOUT || 5000),
    );
  }

  getAukroPaymentStatus(input: Record<string, any>, context?: AukroClientContext): Promise<EcosystemClientResult> {
    return this.post('/api/payments/aukro/status', 'aukro.payments.status.v1', { input, context });
  }
}
