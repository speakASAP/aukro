/**
 * Aukro Service Main Entry Point
 */

import { config } from 'dotenv';
import { join } from 'path';

// Load .env file before any other imports
config({ path: join(process.cwd(), '../../.env') });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

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
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });

  const port = configService.get<string>('AUKRO_SERVICE_PORT') || '3700';
  await app.listen(parseInt(port, 10));
  console.log(`Aukro service listening on http://localhost:${port}`);
}

bootstrap();

