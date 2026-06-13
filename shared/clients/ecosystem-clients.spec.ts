import { strict as assert } from 'assert';
import { of, throwError } from 'rxjs';
import { AiClientService } from './ai-client.service';
import { NotificationsClientService } from './notifications-client.service';
import { LoggingClientService } from './logging-client.service';

function mockLogger() {
  return {
    warnCalls: [] as any[],
    warn(message: string, metadata?: any) {
      this.warnCalls.push({ message, metadata });
    },
    log() {},
    error() {},
    setContext() {},
  } as any;
}

async function run() {
  const successfulHttp = {
    lastRequest: undefined as any,
    request(config: any) {
      this.lastRequest = config;
      return of({ status: 202, data: { data: { accepted: true } } });
    },
  } as any;

  const ai = new AiClientService(successfulHttp, mockLogger());
  const proposal = await ai.createListingProposal({ productId: 'product-123' }, { correlationId: 'corr-1' });
  assert.equal(proposal.success, true);
  assert.equal(proposal.contractVersion, 'aukro.ai.listing-proposal.v1');
  assert.equal(successfulHttp.lastRequest.data.contractVersion, 'aukro.ai.listing-proposal.v1');
  assert.equal(successfulHttp.lastRequest.timeout, 5000);

  const failingLogger = mockLogger();
  const failingHttp = {
    request() {
      return throwError(() => ({ code: 'ECONNREFUSED', response: { status: 503 } }));
    },
  } as any;
  const notifications = new NotificationsClientService(failingHttp, failingLogger);
  const notification = await notifications.sendAukroNotification({ type: 'approval_required' });
  assert.equal(notification.success, false);
  assert.equal(notification.unavailable, true);
  assert.equal(notification.errorCode, 'ECONNREFUSED');
  assert.equal(failingLogger.warnCalls.length, 1);
  assert.equal(failingLogger.warnCalls[0].metadata.service, 'notifications-microservice');

  const health = await ai.checkHealth();
  assert.equal(health.success, true);
  assert.equal(successfulHttp.lastRequest.url.endsWith('/health'), true);

  const loggingHttp = {
    lastRequest: undefined as any,
    request(config: any) {
      this.lastRequest = config;
      return of({ status: 200, data: { data: { id: 'log-1' } } });
    },
  } as any;
  const logging = new LoggingClientService(loggingHttp, mockLogger());
  const logResult = await logging.emitAukroEvent('aukro.policy.blocked', {
    email: 'buyer@example.test',
    reasonCode: 'MEDIA_READINESS_FAILED',
  });
  assert.equal(logResult.success, true);
  assert.equal(loggingHttp.lastRequest.data.input.email, '[masked]');
  assert.equal(loggingHttp.lastRequest.data.input.reasonCode, 'MEDIA_READINESS_FAILED');
}

run();
