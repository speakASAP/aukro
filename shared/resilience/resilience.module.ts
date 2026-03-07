/**
 * Resilience Module
 * Provides circuit breaker, retry, and fallback services
 */

import { Module } from '@nestjs/common';
import { CircuitBreakerService } from './circuit-breaker.service';
import { RetryService } from './retry.service';
import { FallbackService } from './fallback.service';
import { ResilienceMonitor } from './resilience.monitor';

@Module({
  providers: [
    CircuitBreakerService,
    RetryService,
    FallbackService,
    ResilienceMonitor,
  ],
  exports: [
    CircuitBreakerService,
    RetryService,
    FallbackService,
    ResilienceMonitor,
  ],
})
export class ResilienceModule {}
