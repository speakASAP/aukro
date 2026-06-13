import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { LoggerService } from '../logger/logger.service';
import { EcosystemClientBase } from './ecosystem-client.base';
import { AukroClientContext, EcosystemClientResult } from './ecosystem-client.types';

@Injectable()
export class MarketingClientService extends EcosystemClientBase {
  constructor(httpService: HttpService, logger: LoggerService) {
    super(
      httpService,
      logger,
      'marketing-microservice',
      process.env.MARKETING_SERVICE_URL || 'http://marketing-microservice:4600',
      Number(process.env.MARKETING_SERVICE_TIMEOUT || process.env.HTTP_TIMEOUT || 5000),
    );
  }

  getProductCampaignRecommendation(input: Record<string, any>, context?: AukroClientContext): Promise<EcosystemClientResult> {
    return this.post('/api/marketing/aukro/product-recommendations', 'aukro.marketing.product-recommendation.v1', { input, context });
  }
}
