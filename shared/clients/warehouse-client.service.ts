import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { LoggerService } from '../logger/logger.service';

/**
 * API client for warehouse-microservice
 * Fetches stock levels and manages stock reservations
 */
@Injectable()
export class WarehouseClientService {
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly logger: LoggerService,
  ) {
    this.baseUrl = process.env.WAREHOUSE_SERVICE_URL || 'http://warehouse-microservice:3201';
  }

  private requestOptions() {
    // JWT_TOKEN is deliberately NOT in this chain: it holds the shared a2880693
    // docs-rag credential, which warehouse rejects. Falling through to it turned a
    // missing warehouse token into a 401 instead of a clear configuration error.
    const token = (
      process.env.WAREHOUSE_SERVICE_TOKEN ||
      process.env.SERVICE_TOKEN ||
      ''
    ).trim();

    if (!token) {
      // Was `return {}`, which sent an unauthenticated request and surfaced as a 401
      // that the callers below swallowed into empty stock.
      throw new HttpException('WAREHOUSE_SERVICE_AUTH_TOKEN_MISSING', HttpStatus.SERVICE_UNAVAILABLE);
    }

    return {
      headers: {
        Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
      },
    };
  }

  /**
   * A failed stock lookup must never be reported as zero stock.
   *
   * `getTotalAvailable` returning 0 and `getStockByProduct` returning [] behind a
   * logger.warn is why an expired WAREHOUSE_SERVICE_TOKEN (exp 2026-07-31) went
   * unnoticed for 26 days: every product read as out-of-stock and nothing
   * distinguished that from an auth failure. Only a 404 means "no stock record".
   */
  private rethrowStockLookupFailure(error: unknown, productId: string, operation: string): never {
    const status = (error as any)?.response?.status;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    this.logger.error(
      `${operation} failed against warehouse-microservice: productId=${productId}, `
        + `httpStatus=${status ?? 'n/a'}, error=${errorMessage}`,
      errorStack,
      'WarehouseClient',
    );
    throw new HttpException(
      `${operation} failed: ${errorMessage}`,
      status || HttpStatus.BAD_GATEWAY,
    );
  }

  /**
   * Get stock for a product across all warehouses
   */
  async getStockByProduct(productId: string): Promise<any[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/stock/${productId}`, this.requestOptions())
      );
      return response.data.data || [];
    } catch (error: unknown) {
      if ((error as any)?.response?.status === HttpStatus.NOT_FOUND) {
        return [];
      }
      this.rethrowStockLookupFailure(error, productId, 'Stock lookup');
    }
  }

  /**
   * Get total available stock for a product
   */
  async getTotalAvailable(productId: string): Promise<number> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/stock/${productId}/total`, this.requestOptions())
      );
      return response.data.data?.totalAvailable || 0;
    } catch (error: unknown) {
      if ((error as any)?.response?.status === HttpStatus.NOT_FOUND) {
        return 0;
      }
      this.rethrowStockLookupFailure(error, productId, 'Total stock lookup');
    }
  }

  /**
   * Reserve stock for an order
   */
  async reserveStock(productId: string, warehouseId: string, quantity: number, orderId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/stock/reserve`, {
          productId,
          warehouseId,
          quantity,
          orderId,
        }, this.requestOptions())
      );
      return response.data.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to reserve stock: ${errorMessage}`, errorStack, 'WarehouseClient');
      throw new HttpException(`Failed to reserve stock: ${errorMessage}`, HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Release reserved stock
   */
  async unreserveStock(productId: string, warehouseId: string, quantity: number, orderId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/stock/unreserve`, {
          productId,
          warehouseId,
          quantity,
          orderId,
        }, this.requestOptions())
      );
      return response.data.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to unreserve stock: ${errorMessage}`, errorStack, 'WarehouseClient');
      throw new HttpException(`Failed to unreserve stock: ${errorMessage}`, HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Decrement stock (after order shipped)
   */
  async decrementStock(productId: string, warehouseId: string, quantity: number, reason?: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/stock/decrement`, {
          productId,
          warehouseId,
          quantity,
          reason: reason || 'Order shipped',
        }, this.requestOptions())
      );
      return response.data.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to decrement stock: ${errorMessage}`, errorStack, 'WarehouseClient');
      throw new HttpException(`Failed to decrement stock: ${errorMessage}`, HttpStatus.BAD_REQUEST);
    }
  }
}

