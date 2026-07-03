import { Module } from '@nestjs/common';
import { InternalOrderAffinityController, OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule, ClientsModule, AuthModule } from '@aukro/shared';

@Module({
  imports: [PrismaModule, ClientsModule, AuthModule, ConfigModule],
  controllers: [OrdersController, InternalOrderAffinityController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}

