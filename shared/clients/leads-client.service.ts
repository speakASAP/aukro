import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { LoggerService } from '../logger/logger.service';
import { EcosystemClientBase } from './ecosystem-client.base';
import { AukroClientContext, EcosystemClientResult } from './ecosystem-client.types';

@Injectable()
export class LeadsClientService extends EcosystemClientBase {
  constructor(httpService: HttpService, logger: LoggerService) {
    super(
      httpService,
      logger,
      'leads-microservice',
      process.env.LEADS_SERVICE_URL || 'http://leads-microservice:4400',
      Number(process.env.LEADS_SERVICE_TIMEOUT || process.env.HTTP_TIMEOUT || 5000),
    );
  }

  createAukroLead(input: Record<string, any>, context?: AukroClientContext): Promise<EcosystemClientResult> {
    return this.post('/api/leads/aukro', 'aukro.leads.create.v1', { input, context, source: 'aukro' });
  }
}
