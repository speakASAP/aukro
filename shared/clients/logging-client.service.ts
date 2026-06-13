import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { LoggerService } from '../logger/logger.service';
import { EcosystemClientBase } from './ecosystem-client.base';
import { AukroClientContext, EcosystemClientResult } from './ecosystem-client.types';

@Injectable()
export class LoggingClientService extends EcosystemClientBase {
  constructor(httpService: HttpService, logger: LoggerService) {
    super(
      httpService,
      logger,
      'logging-microservice',
      process.env.LOGGING_SERVICE_URL || 'http://logging-microservice:3367',
      Number(process.env.LOGGING_SERVICE_TIMEOUT || process.env.HTTP_TIMEOUT || 5000),
    );
  }

  emitAukroEvent(eventName: string, input: Record<string, any>, context?: AukroClientContext): Promise<EcosystemClientResult> {
    return this.post('/api/logs', 'aukro.logging.event.v1', {
      level: 'info',
      service: 'aukro-service',
      eventName,
      input: this.maskEventInput(input),
      context,
    });
  }

  private maskEventInput(input: Record<string, any>): Record<string, any> {
    const masked = { ...(input || {}) };
    for (const key of Object.keys(masked)) {
      if (/token|secret|password|email|phone|address/i.test(key)) {
        masked[key] = '[masked]';
      }
    }
    return masked;
  }
}
