import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { LoggerService } from '../logger/logger.service';
import { EcosystemClientMethod, EcosystemClientResult } from './ecosystem-client.types';

export abstract class EcosystemClientBase {
  protected constructor(
    protected readonly httpService: HttpService,
    protected readonly logger: LoggerService,
    private readonly serviceName: string,
    private readonly baseUrl: string,
    private readonly timeoutMs: number,
  ) {}

  async checkHealth(): Promise<EcosystemClientResult> {
    return this.request('GET', '/health', 'health.v1');
  }

  protected async get<T>(path: string, contractVersion: string, params?: Record<string, any>): Promise<EcosystemClientResult<T>> {
    return this.request<T>('GET', path, contractVersion, undefined, params);
  }

  protected async post<T>(path: string, contractVersion: string, data?: Record<string, any>): Promise<EcosystemClientResult<T>> {
    return this.request<T>('POST', path, contractVersion, { contractVersion, ...(data || {}) });
  }

  protected async request<T>(
    method: EcosystemClientMethod,
    path: string,
    contractVersion: string,
    data?: Record<string, any>,
    params?: Record<string, any>,
  ): Promise<EcosystemClientResult<T>> {
    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method,
          url: this.baseUrl + path,
          data,
          params,
          timeout: this.timeoutMs,
        }),
      );

      return {
        success: true,
        service: this.serviceName,
        contractVersion,
        data: response.data?.data ?? response.data,
        status: response.status,
      };
    } catch (error: any) {
      const status = error?.response?.status;
      const errorCode = this.maskedErrorCode(error);
      this.logger.warn(`Optional ${this.serviceName} contract unavailable: ${errorCode}`, {
        service: this.serviceName,
        contractVersion,
        status,
        errorCode,
      });

      return {
        success: false,
        service: this.serviceName,
        contractVersion,
        unavailable: true,
        status,
        errorCode,
      };
    }
  }

  private maskedErrorCode(error: any): string {
    if (error?.code) {
      return String(error.code).replace(/[^A-Z0-9_:-]/gi, '_').slice(0, 80);
    }

    if (error?.response?.status) {
      return `HTTP_${error.response.status}`;
    }

    return 'SERVICE_UNAVAILABLE';
  }
}
