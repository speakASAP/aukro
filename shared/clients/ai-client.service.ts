import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { LoggerService } from '../logger/logger.service';
import { EcosystemClientBase } from './ecosystem-client.base';
import { AukroClientContext, EcosystemClientResult } from './ecosystem-client.types';

@Injectable()
export class AiClientService extends EcosystemClientBase {
  constructor(httpService: HttpService, logger: LoggerService) {
    super(
      httpService,
      logger,
      'ai-microservice',
      process.env.AI_SERVICE_URL || 'http://ai-microservice:3380',
      Number(process.env.AI_SERVICE_TIMEOUT || process.env.HTTP_TIMEOUT || 5000),
    );
  }

  createListingProposal(input: Record<string, any>, context?: AukroClientContext): Promise<EcosystemClientResult> {
    return this.post('/api/aukro/listing-proposals', 'aukro.ai.listing-proposal.v1', { input, context });
  }

  assessPolicyRisk(input: Record<string, any>, context?: AukroClientContext): Promise<EcosystemClientResult> {
    return this.post('/api/aukro/policy-risk', 'aukro.ai.policy-risk.v1', { input, context });
  }
}
