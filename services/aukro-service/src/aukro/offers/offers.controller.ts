import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { OffersService } from './offers.service';
import { JwtAuthGuard } from '@aukro/shared';
import { CatalogSellActionRequest } from './catalog-draft.types';
import { CreateAiProposalRequest, ReviewAiProposalRequest } from './ai-proposal.types';
import { EnqueuePublishRequest, RecordReconciliationRequest } from './publish-observability.types';
import { RecordRevenueAnalyticsRequest } from './revenue-analytics.types';
import { OfferPolicyInput } from './policy/offer-policy.types';

@Controller('offers')
@UseGuards(JwtAuthGuard)
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Get()
  async getOffers(@Query() query: any): Promise<any> {
    return this.offersService.findAll(query);
  }

  @Get(':id')
  async getOffer(@Param('id') id: string): Promise<any> {
    return this.offersService.findOne(id);
  }

  @Post()
  async createOffer(@Body() data: any): Promise<any> {
    return this.offersService.create(data);
  }

  @Post('sync')
  async syncOffers(@Body() data?: any): Promise<any> {
    return this.offersService.syncFromCatalog(data);
  }

  @Post('from-catalog')
  async createFromCatalog(@Body() data: CatalogSellActionRequest): Promise<any> {
    return this.offersService.createFromCatalog(data);
  }

  @Post(':id/ai-proposals')
  async createAiProposal(@Param('id') id: string, @Body() data: CreateAiProposalRequest): Promise<any> {
    return this.offersService.createAiProposal(id, data);
  }

  @Post(':id/ai-proposals/:proposalId/review')
  async reviewAiProposal(
    @Param('id') id: string,
    @Param('proposalId') proposalId: string,
    @Body() data: ReviewAiProposalRequest,
  ): Promise<any> {
    return this.offersService.reviewAiProposal(id, proposalId, data);
  }

  @Post(':id/enqueue-publish')
  async enqueuePublish(@Param('id') id: string, @Body() data: EnqueuePublishRequest): Promise<any> {
    return this.offersService.enqueuePublish(id, data);
  }

  @Post(':id/reconciliation')
  async recordReconciliation(@Param('id') id: string, @Body() data: RecordReconciliationRequest): Promise<any> {
    return this.offersService.recordReconciliation(id, data);
  }

  @Post(':id/revenue-analytics')
  async recordRevenueAnalytics(@Param('id') id: string, @Body() data: RecordRevenueAnalyticsRequest): Promise<any> {
    return this.offersService.recordRevenueAnalytics(id, data);
  }

  @Post(':id/policy-check')
  async checkOfferPolicy(@Param('id') id: string, @Body() data?: OfferPolicyInput): Promise<any> {
    return this.offersService.evaluatePolicy(id, data || {});
  }

  @Put(':id')
  async updateOffer(@Param('id') id: string, @Body() data: any): Promise<any> {
    return this.offersService.update(id, data);
  }

  @Delete(':id')
  async deleteOffer(@Param('id') id: string): Promise<any> {
    return this.offersService.delete(id);
  }
}
