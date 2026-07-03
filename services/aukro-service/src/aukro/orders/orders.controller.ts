import { Controller, Get, Post, Body, Headers, Param, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '@aukro/shared';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async getOrders(@Query() query: any, @Req() req: { user?: any }): Promise<any> {
    return this.ordersService.findAll(query, req.user || {});
  }

  @Get(':id')
  async getOrder(@Param('id') id: string, @Req() req: { user?: any }): Promise<any> {
    return this.ordersService.findOne(id, req.user || {});
  }

  @Post()
  async createOrder(@Body() data: any): Promise<any> {
    return this.ordersService.create(data);
  }

  @Post('webhook')
  async webhook(@Body() data: any): Promise<any> {
    return this.ordersService.handleWebhook(data);
  }
}

@Controller('internal/aukro/order-affinity')
export class InternalOrderAffinityController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly configService: ConfigService,
  ) {}

  @Get('replay-candidates')
  async getReplayCandidates(
    @Query() query: any,
    @Headers('x-internal-service-token') token?: string,
    @Headers('x-service-name') serviceName?: string,
  ): Promise<{ success: boolean; data: any }> {
    this.assertMarketingService(token, serviceName);
    const data = await this.ordersService.getOrderAffinityReplayCandidates(query);
    return { success: true, data };
  }

  private assertMarketingService(token?: string, serviceName?: string): void {
    const expected = (
      this.configService.get<string>('AUKRO_INTERNAL_SERVICE_TOKEN')
      || this.configService.get<string>('INTERNAL_SERVICE_TOKEN')
      || ''
    ).trim();
    const supplied = String(token || '').replace(/^Bearer\s+/i, '').trim();
    if (!expected || !supplied || supplied !== expected || serviceName !== 'marketing-microservice') {
      throw new UnauthorizedException('internal_service_auth_required');
    }
  }
}
