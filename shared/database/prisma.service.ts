/**
 * Prisma Service
 * Provides Prisma Client instance for database access
 */

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    let databaseUrl = process.env.DATABASE_URL;

    let isValidUrl = false;
    if (databaseUrl) {
      if (databaseUrl.includes('DATABASE_URL=')) {
        databaseUrl = databaseUrl.replace(/^DATABASE_URL=/, '');
      }

      if (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')) {
        try {
          new URL(databaseUrl);
          isValidUrl = true;
        } catch {
          isValidUrl = false;
        }
      }
    }

    if (!isValidUrl) {
      const dbHost = process.env.DB_HOST;
      const dbPort = process.env.DB_PORT;
      const dbUser = process.env.DB_USER;
      const dbPassword = process.env.DB_PASSWORD || '';
      const dbName = process.env.DB_NAME;

      if (!dbHost || !dbPort || !dbUser || !dbName) {
        throw new Error('Missing required database configuration. Please set DB_HOST, DB_PORT, DB_USER, and DB_NAME environment variables, or provide a valid DATABASE_URL.');
      }

      const encodedPassword = encodeURIComponent(dbPassword);
      databaseUrl = `postgresql://${dbUser}:${encodedPassword}@${dbHost}:${dbPort}/${dbName}?schema=public&connection_limit=10&pool_timeout=5&connect_timeout=2`;
      process.env.DATABASE_URL = databaseUrl;
    } else {
      if (databaseUrl && !databaseUrl.includes('connection_limit=')) {
        const separator = databaseUrl.includes('?') ? '&' : '?';
        databaseUrl = `${databaseUrl}${separator}connection_limit=10&pool_timeout=5&connect_timeout=2`;
        process.env.DATABASE_URL = databaseUrl;
      }
    }

    super({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Prisma Client connected to database');
      try {
        await this.$queryRaw`SELECT 1`;
        this.logger.log('Prisma connection pool warmed up');
        await this.ensureAukroSchema();
      } catch (warmupError) {
        this.logger.warn('Prisma connection warmup query failed (non-critical)', warmupError);
      }
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }


  private async ensureAukroSchema() {
    await this.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.aukro_accounts (
        id uuid PRIMARY KEY,
        name varchar(200) NOT NULL,
        email varchar(200) NOT NULL,
        "apiKey" text,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "aukro_accounts_email_idx" ON public.aukro_accounts (email)');
    await this.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "aukro_accounts_isActive_idx" ON public.aukro_accounts ("isActive")');

    await this.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.aukro_offers (
        id uuid PRIMARY KEY,
        "accountId" uuid NOT NULL REFERENCES public.aukro_accounts(id) ON DELETE CASCADE,
        "productId" uuid,
        "aukroOfferId" varchar(100),
        title varchar(500) NOT NULL,
        description text,
        price numeric(10,2) NOT NULL,
        "stockQuantity" integer NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "rawData" jsonb,
        "createdAt" timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "aukro_offers_productId_idx" ON public.aukro_offers ("productId")');
    await this.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "aukro_offers_accountId_idx" ON public.aukro_offers ("accountId")');
    await this.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "aukro_offers_aukroOfferId_idx" ON public.aukro_offers ("aukroOfferId")');
    await this.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "aukro_offers_isActive_idx" ON public.aukro_offers ("isActive")');

    await this.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.aukro_orders (
        id uuid PRIMARY KEY,
        "accountId" uuid NOT NULL REFERENCES public.aukro_accounts(id) ON DELETE CASCADE,
        "aukroOrderId" varchar(100) NOT NULL UNIQUE,
        "orderId" uuid,
        "customerEmail" varchar(200),
        "customerPhone" varchar(50),
        total numeric(10,2) NOT NULL,
        currency varchar(3) NOT NULL DEFAULT 'CZK',
        status varchar(50) NOT NULL DEFAULT 'pending',
        forwarded boolean NOT NULL DEFAULT false,
        "rawData" jsonb,
        "createdAt" timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "aukro_orders_accountId_idx" ON public.aukro_orders ("accountId")');
    await this.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "aukro_orders_aukroOrderId_idx" ON public.aukro_orders ("aukroOrderId")');
    await this.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "aukro_orders_status_idx" ON public.aukro_orders (status)');
    await this.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "aukro_orders_forwarded_idx" ON public.aukro_orders (forwarded)');
    this.logger.log('Aukro database schema verified');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma Client disconnected from database');
  }
}

