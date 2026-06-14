import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@aukro/shared';
import { WorkbenchService } from './workbench.service';
import { WorkbenchQuery } from './workbench.types';

@Controller('workbench')
@UseGuards(JwtAuthGuard)
export class WorkbenchController {
  constructor(private readonly workbenchService: WorkbenchService) {}

  @Get('summary')
  async summary(@Query() query: WorkbenchQuery) {
    return this.workbenchService.getSummary(query);
  }

  @Get('review-queue')
  async reviewQueue(@Query() query: WorkbenchQuery) {
    return this.workbenchService.getReviewQueue(query);
  }

  @Get('offers/:id')
  async offerDetail(@Param('id') id: string) {
    return this.workbenchService.getOfferDetail(id);
  }
}
