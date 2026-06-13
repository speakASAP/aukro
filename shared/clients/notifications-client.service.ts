import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { LoggerService } from '../logger/logger.service';
import { EcosystemClientBase } from './ecosystem-client.base';
import { AukroClientContext, EcosystemClientResult } from './ecosystem-client.types';

@Injectable()
export class NotificationsClientService extends EcosystemClientBase {
  constructor(httpService: HttpService, logger: LoggerService) {
    super(
      httpService,
      logger,
      'notifications-microservice',
      process.env.NOTIFICATION_SERVICE_URL || 'http://notifications-microservice:3368',
      Number(process.env.NOTIFICATION_SERVICE_TIMEOUT || process.env.HTTP_TIMEOUT || 5000),
    );
  }

  sendAukroNotification(input: Record<string, any>, context?: AukroClientContext): Promise<EcosystemClientResult> {
    return this.post('/api/notifications/send', 'aukro.notifications.send.v1', { input, context, source: 'aukro-service' });
  }
}
