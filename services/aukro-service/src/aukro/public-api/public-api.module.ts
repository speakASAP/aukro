import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AukroPublicApiClient } from './public-api.client';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [AukroPublicApiClient],
  exports: [AukroPublicApiClient],
})
export class AukroPublicApiModule {}
