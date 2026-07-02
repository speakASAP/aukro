import { Module } from '@nestjs/common';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';
import { AukroAvailabilityReconciliationService } from './offer-availability-reconciliation.service';
import { OfferPolicyService } from './policy/offer-policy.service';
import { PrismaModule, ClientsModule, AuthModule } from '@aukro/shared';

@Module({
  imports: [PrismaModule, ClientsModule, AuthModule],
  controllers: [OffersController],
  providers: [OffersService, OfferPolicyService, AukroAvailabilityReconciliationService],
  exports: [OffersService, OfferPolicyService, AukroAvailabilityReconciliationService],
})
export class OffersModule {}
