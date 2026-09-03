/**
 * Aukro Service App Module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';
import { AukroModule } from './aukro/aukro.module';
import { PrismaModule, LoggerModule, HealthModule, RabbitMQModule, AuthModule, ClientsModule } from '@aukro/shared';
import { HealthController } from './health/health.controller';
import { CredentialSelfReporter } from './health/credential-self-reporter';
import { UiController } from './ui/ui.controller';

import { BusinessHealthModule } from './business-health/business-health.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(process.cwd(), '../../.env'),
    }),
    PrismaModule,
    LoggerModule,
    HealthModule,
    RabbitMQModule,
    AuthModule,
    ClientsModule,
    AukroModule,
    BusinessHealthModule,
  ],
  controllers: [HealthController, UiController],
  providers: [CredentialSelfReporter],
})
export class AppModule {}

