import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@aukro/shared';
import { AukroPublicApiClient, AukroPublicApiReadiness } from '../public-api';
import { AukroExecutorService } from './executor.service';
import { AukroExecutorCreateInput, AukroExecutorCreateResult } from './executor.types';

export interface AukroExecutorReadinessResponse {
  ready: boolean;
  status: 'ready' | 'missing_config';
  publicApi: AukroPublicApiReadiness;
  liveMutationEnabled: false;
  executorMode: 'dry_run_only';
  requiredExternalEvidence: string[];
}

export interface AukroExecutorDryRunResponse extends AukroExecutorCreateResult {
  liveMutationEnabled: false;
  executorMode: 'dry_run_only';
}

@Controller('executor')
@UseGuards(JwtAuthGuard)
export class AukroExecutorController {
  constructor(
    private readonly executorService: AukroExecutorService,
    private readonly publicApiClient: AukroPublicApiClient,
  ) {}

  @Get('readiness')
  getReadiness(): AukroExecutorReadinessResponse {
    const publicApi = this.publicApiClient.getReadiness();
    return {
      ready: publicApi.ready,
      status: publicApi.status,
      publicApi,
      liveMutationEnabled: false,
      executorMode: 'dry_run_only',
      requiredExternalEvidence: [
        'Aukro API username/password/API key configured outside source control',
        'Aukro account readiness and seller mapping evidence',
        'Aukro category, attributes, shipping template, location, price, stock, and image evidence',
        'human approval evidence for every live create',
        'rate-limit readiness or approved local create budget',
        'local idempotency record lookup before any live create',
      ],
    };
  }

  @Post('offers/dry-run')
  async dryRunOffer(@Body() input: AukroExecutorCreateInput): Promise<AukroExecutorDryRunResponse> {
    const result = await this.executorService.createOffer({
      ...input,
      dryRun: true,
    });

    return {
      ...result,
      liveMutationEnabled: false,
      executorMode: 'dry_run_only',
    };
  }
}
