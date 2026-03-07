/**
 * Fallback Service
 * Provides fallback mechanisms for failed operations
 */

import { Injectable } from '@nestjs/common';

@Injectable()
export class FallbackService {
  /**
   * Execute function with fallback
   */
  async executeWithFallback<T>(
    fn: () => Promise<T>,
    fallback: () => Promise<T>,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      return await fallback();
    }
  }
}
