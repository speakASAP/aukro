/**
 * Aukro Module
 */

import { Module } from '@nestjs/common';
import { AccountsModule } from './accounts/accounts.module';
import { OffersModule } from './offers/offers.module';
import { OrdersModule } from './orders/orders.module';
import { WorkbenchModule } from './workbench/workbench.module';

@Module({
  imports: [AccountsModule, OffersModule, OrdersModule, WorkbenchModule],
  exports: [OffersModule],
})
export class AukroModule {}

