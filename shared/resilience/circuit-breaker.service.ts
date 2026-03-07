/**
 * Circuit Breaker Service
 * Provides circuit breaker pattern for external service calls
 */

import { Injectable } from '@nestjs/common';

export interface CircuitBreakerOptions {
  timeout?: number;
  errorThresholdPercentage?: number;
  resetTimeout?: number;
}

@Injectable()
export class CircuitBreakerService {
  /**
   * Create a circuit breaker for a service
   * Simplified version - returns the function directly
   */
  create<T>(
    serviceName: string,
    fn: () => Promise<T>,
    options?: CircuitBreakerOptions,
  ): () => Promise<T> {
    // Simplified: just return the function
    // Full implementation would use opossum library
    return fn;
  }
}
