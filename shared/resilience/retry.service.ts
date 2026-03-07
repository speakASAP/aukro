/**
 * Retry Service
 * Provides retry logic for failed operations
 */

import { Injectable } from '@nestjs/common';

@Injectable()
export class RetryService {
  /**
   * Retry a function with exponential backoff
   * If retries are needed, check logs to see what's failing.
   */
  async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000,
  ): Promise<T> {
    let lastError: Error;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
      }
    }
    throw lastError!;
  }
}
