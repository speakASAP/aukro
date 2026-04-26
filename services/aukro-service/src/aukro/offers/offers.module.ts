import { Module } from '@nestjs/common';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';
import { PrismaModule, ClientsModule, AuthModule } from '@aukro/shared';

@Module({
  imports: [PrismaModule, ClientsModule, AuthModule],
  controllers: [OffersController],
  providers: [OffersService],
  exports: [OffersService],
})
export class OffersModule {}

