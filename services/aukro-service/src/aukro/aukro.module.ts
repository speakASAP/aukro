/**
 * Aukro Module
 */

import { Module } from '@nestjs/common';
import { AccountsModule } from './accounts/accounts.module';
import { OffersModule } from './offers/offers.module';
import { OrdersModule } from './orders/orders.module';
import { WorkbenchModule } from './workbench/workbench.module';
import { AukroExecutorModule } from './executor';

@Module({
  imports: [AccountsModule, OffersModule, OrdersModule, WorkbenchModule, AukroExecutorModule],
  exports: [OffersModule, AukroExecutorModule],
})
export class AukroModule {}

