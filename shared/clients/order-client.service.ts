import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { LoggerService } from '../logger/logger.service';

const CREATE_ORDER_CONTRACT_VERSION = 'orders.create.v1';
const DEFAULT_CHANNEL_ACCOUNT_ID = 'default';

interface CreateCentralOrderRequest {
  externalOrderId: string;
  channel: string;
  channelAccountId?: string;
  customer?: any;
  shippingAddress?: any;
  billingAddress?: any;
  items: Array<{
    productId: string;
    sku?: string;
    title: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    warehouseId: string;
  }>;
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  total: number;
  currency: string;
  paymentMethod?: string;
  paymentStatus?: string;
  shippingMethod?: string;
  customerNote?: string;
  orderedAt?: Date;
}

export interface CentralOrderReadModel {
  [key: string]: any;
  id?: string;
  status?: string;
  lifecycleStage?: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
  deliveryStatus?: string;
  externalOrderId?: string;
  channel?: string;
  channelAccountId?: string;
}

/**
 * API client for orders-microservice.
 * Sends the Orders create contract idempotency fields so callers can retry safely.
 */
@Injectable()
export class OrderClientService {
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly logger: LoggerService,
  ) {
    this.baseUrl = process.env.ORDER_SERVICE_URL || 'http://orders-microservice:3203';
  }

  async createOrder(orderData: CreateCentralOrderRequest): Promise<any> {
    const payload = {
      contractVersion: CREATE_ORDER_CONTRACT_VERSION,
      ...orderData,
      channelAccountId: this.normalizeChannelAccountId(orderData.channelAccountId),
    };

    this.assertCreateOrderPayload(payload);
    const requestOptions = this.createOrderRequestOptions();

    try {
      const response = await firstValueFrom(
        this.httpService.post(this.baseUrl + '/api/orders', payload, requestOptions),
      );
      this.logger.log('Order accepted by orders-microservice: ' + response.data.data?.id, 'OrderClient');
      return response.data.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const message = status === HttpStatus.CONFLICT
        ? 'ORDER_IDEMPOTENCY_CONFLICT'
        : error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Failed to create order in orders-microservice: ' + message, stack, 'OrderClient');
      throw new HttpException('Failed to create order: ' + message, status || HttpStatus.BAD_REQUEST);
    }
  }

  async getOrderReadModel(orderId: string): Promise<CentralOrderReadModel | null> {
    const normalizedOrderId = orderId?.trim();
    if (!normalizedOrderId) return null;

    try {
      const response = await firstValueFrom(
        this.httpService.get(this.baseUrl + '/api/orders/' + encodeURIComponent(normalizedOrderId), this.createOrderRequestOptions()),
      );
      const data = response.data?.data ?? response.data;
      return this.asCentralOrderReadModel(data);
    } catch (error: any) {
      const status = error?.response?.status;
      const message = status
        ? 'HTTP_' + status
        : error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn('Central order read unavailable: ' + message, {
        context: 'OrderClient',
        orderId: normalizedOrderId,
      });
      return null;
    }
  }

  async updateOrderStatus(orderId: string, status: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.put(this.baseUrl + '/api/orders/' + orderId + '/status', { status }, this.createOrderRequestOptions()),
      );
      return response.data.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Failed to update order status: ' + errorMessage, errorStack, 'OrderClient');
      throw new HttpException('Failed to update order status: ' + errorMessage, HttpStatus.BAD_REQUEST);
    }
  }

  async findByExternalId(externalOrderId: string, channel: string, channelAccountId?: string): Promise<any | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(this.baseUrl + '/api/orders', {
          ...this.createOrderRequestOptions(),
          params: {
            channel,
            externalOrderId,
            channelAccountId: channelAccountId ? this.normalizeChannelAccountId(channelAccountId) : undefined,
          },
        }),
      );
      const orders = response.data.data || [];
      return orders.find((order: any) => order.externalOrderId === externalOrderId) || null;
    } catch (error: any) {
      // A lookup failure is not "no such order": returning null for both made an
      // auth/transport outage indistinguishable from an empty result. 404 is the
      // only status that genuinely means not-found.
      const status = error?.response?.status;
      if (status === HttpStatus.NOT_FOUND) {
        return null;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        'Order lookup failed against orders-microservice: externalOrderId=' + externalOrderId
          + ', channel=' + channel + ', httpStatus=' + (status ?? 'n/a') + ', error=' + errorMessage,
        errorStack,
        'OrderClient',
      );
      throw new HttpException('Failed to look up order: ' + errorMessage, status || HttpStatus.BAD_GATEWAY);
    }
  }

  private createOrderRequestOptions(): { headers: Record<string, string> } {
    // Preferred: per-pair RS256 principal
    // (svc-aukro-service--orders-microservice@internal.alfares.cz), verified by
    // orders through /auth/validate.
    const bearer = process.env.ORDERS_SERVICE_TOKEN?.trim();
    if (bearer) {
      return {
        headers: {
          Authorization: bearer.startsWith('Bearer ') ? bearer : `Bearer ${bearer}`,
          'x-service-name': 'aukro-service',
        },
      };
    }

    // Cutover fallback: the shared static credential, where orders derives identity
    // from x-service-name rather than from the token. Retired once this lane is
    // verified on the Bearer path; loud on every use so it cannot rot unnoticed.
    const token = process.env.AUKRO_INTERNAL_SERVICE_TOKEN?.trim();
    if (!token) {
      throw new HttpException('ORDER_SERVICE_AUTH_TOKEN_MISSING', HttpStatus.SERVICE_UNAVAILABLE);
    }

    this.logger.error(
      'ORDERS_SERVICE_TOKEN is unset; falling back to the shared static '
        + 'AUKRO_INTERNAL_SERVICE_TOKEN header for orders-microservice. This credential '
        + 'is header-authenticated and scheduled for retirement — set ORDERS_SERVICE_TOKEN.',
      undefined,
      'OrderClient',
    );

    return {
      headers: {
        'x-internal-service-token': token,
        'x-service-name': 'aukro-service',
      },
    };
  }

  private assertCreateOrderPayload(payload: CreateCentralOrderRequest): void {
    const missingWarehouseId = payload.items.some((item) => !item.warehouseId?.trim());
    if (missingWarehouseId) {
      throw new HttpException('ORDER_FORWARDING_WAREHOUSE_ID_MISSING', HttpStatus.BAD_REQUEST);
    }
  }

  private asCentralOrderReadModel(data: any): CentralOrderReadModel | null {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    return data as CentralOrderReadModel;
  }

  private normalizeChannelAccountId(channelAccountId?: string): string {
    const normalized = channelAccountId?.trim();
    return normalized || DEFAULT_CHANNEL_ACCOUNT_ID;
  }
}
