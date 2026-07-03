/**
 * Aukro Service Main Entry Point
 */

import 'reflect-metadata';

// Node.js v22+ native Reflect.decorate breaks NestJS decorator metadata — patch before any imports
const _originalDecorate = (Reflect as any).decorate;
(Reflect as any).decorate = function (decorators: any[], target: any, key?: any, desc?: any) {
  if (key !== undefined && desc === null) {
    desc = Object.getOwnPropertyDescriptor(target, key) || null;
  }
  return _originalDecorate.call(this, decorators, target, key, desc);
};

import { config } from 'dotenv';
import { join } from 'path';

// Load .env file before any other imports
config({ path: join(process.cwd(), '../../.env') });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

export const AUKRO_GLOBAL_PREFIX_EXCLUDES = [
  { path: '', method: RequestMethod.GET },
  { path: 'health', method: RequestMethod.GET },
  { path: 'dashboard', method: RequestMethod.GET },
  { path: 'internal/aukro/order-affinity/replay-candidates', method: RequestMethod.GET },
];

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('aukro', {
    exclude: AUKRO_GLOBAL_PREFIX_EXCLUDES,
  });

  const port = configService.get<string>('AUKRO_SERVICE_PORT') || '3700';
  await app.listen(parseInt(port, 10));
  console.log(`Aukro service listening on http://localhost:${port}`);
}

if (require.main === module) {
  bootstrap();
}

