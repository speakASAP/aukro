import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
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

