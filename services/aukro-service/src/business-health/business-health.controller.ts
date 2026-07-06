import { Controller, Get } from '@nestjs/common';
import { BusinessHealthService } from './business-health.service';
import { AukroChannelReadbackBusinessHealthEnvelope } from './business-health.types';

@Controller('business-health')
export class BusinessHealthController {
  constructor(private readonly businessHealthService: BusinessHealthService) {}

  @Get('channel-readback')
  getChannelReadback(): AukroChannelReadbackBusinessHealthEnvelope {
    return this.businessHealthService.getChannelReadbackEnvelope();
  }
}
