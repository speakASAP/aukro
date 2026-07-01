import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  AUKRO_WEBHOOK_READ_PATHS,
  AukroCategoryAttributesResponse,
  AukroCategoryListResponse,
  AukroImageUploadByUrlRequest,
  AukroImageUploadResponse,
  AukroOfferListQuery,
  AukroOfferListResponse,
  AukroOfferResponse,
  AukroOfferV2Request,
  AukroOfferV2UpdateRequest,
  AukroPublicApiAuthResponse,
  AukroPublicApiAuthStatus,
  AukroPublicApiConfig,
  AukroPublicApiConfigKey,
  AukroPublicApiEnvironment,
  AukroPublicApiNormalizedError,
  AukroPublicApiReadiness,
  AukroPublicApiResult,
  AukroShippingTemplatesResponse,
  AukroWebhookFailedEventCountResponse,
  AukroWebhookReadPath,
  AukroWebhookSettingsResponse,
  AukroWebhookStatusResponse,
  AukroWebhookSubscriptionsResponse,
} from './public-api.types';

type HttpMethod = 'GET' | 'POST' | 'PATCH';

const DEFAULT_PRODUCTION_BASE_URL = 'https://aukro.cz/api/v2';
const DEFAULT_LANGUAGE = 'cs-CZ';
const DEFAULT_CURRENCY = 'CZK';
const DEFAULT_TIMEOUT_MS = 10000;

@Injectable()
export class AukroPublicApiClient {
  private bearerToken?: string;
  private authenticatedAt?: string;
  private tokenExpiresAt?: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService?: ConfigService,
  ) {}

  getReadiness(config = this.resolveConfig()): AukroPublicApiReadiness {
    const missing: AukroPublicApiConfigKey[] = [];
    if (!this.present(config.baseUrl)) missing.push('baseUrl');
    if (!this.present(config.username)) missing.push('username');
    if (!this.present(config.password)) missing.push('password');
    if (!this.present(config.apiKey)) missing.push('apiKey');

    const ready = missing.length === 0;
    return {
      ready,
      status: ready ? 'ready' : 'missing_config',
      missing,
      baseUrlConfigured: this.present(config.baseUrl),
      usernameConfigured: this.present(config.username),
      passwordConfigured: this.present(config.password),
      apiKeyConfigured: this.present(config.apiKey),
      environment: config.environment || 'production',
      error: ready ? undefined : this.missingConfigError(missing),
    };
  }

  clearToken(): void {
    this.bearerToken = undefined;
    this.authenticatedAt = undefined;
    this.tokenExpiresAt = undefined;
  }

  async authenticate(): Promise<AukroPublicApiResult<AukroPublicApiAuthStatus>> {
    const config = this.resolveConfig();
    const readiness = this.getReadiness(config);
    if (!readiness.ready) {
      this.clearToken();
      return { ok: false, error: readiness.error };
    }

    try {
      const response = await firstValueFrom(
        this.httpService.request<AukroPublicApiAuthResponse>({
          method: 'POST',
          url: this.url(config, '/authenticate'),
          data: {
            username: config.username,
            password: config.password,
          },
          headers: {
            'Content-Type': 'application/json',
            'X-Aukro-Api-Key': config.apiKey,
          },
          timeout: config.timeoutMs || DEFAULT_TIMEOUT_MS,
        }),
      );

      const auth = response.data || {};
      const token = auth.bearerToken || auth.accessToken || auth.access_token || auth.token;
      if (!this.present(token)) {
        this.clearToken();
        return {
          ok: false,
          status: response.status,
          error: {
            code: 'AUKRO_AUTH_TOKEN_MISSING',
            message: 'Aukro authentication response did not contain a bearer token.',
            status: response.status,
            retryable: false,
            method: 'POST',
            endpoint: '/authenticate',
          },
        };
      }

      this.bearerToken = token;
      this.authenticatedAt = new Date().toISOString();
      this.tokenExpiresAt = this.resolveExpiry(auth, this.authenticatedAt);

      return {
        ok: true,
        status: response.status,
        data: {
          authenticated: true,
          tokenPresent: true,
          authenticatedAt: this.authenticatedAt,
          expiresAt: this.tokenExpiresAt,
        },
      };
    } catch (error: unknown) {
      this.clearToken();
      return {
        ok: false,
        error: this.normalizeError(error, config, 'POST', '/authenticate'),
      };
    }
  }

  async getCategories(): Promise<AukroPublicApiResult<AukroCategoryListResponse>> {
    return this.request('GET', '/categories');
  }

  async getCategoryAttributes(categoryId: string): Promise<AukroPublicApiResult<AukroCategoryAttributesResponse>> {
    return this.request('GET', `/categories/${encodeURIComponent(categoryId)}/attributes`);
  }

  async getShippingTemplates(): Promise<AukroPublicApiResult<AukroShippingTemplatesResponse>> {
    return this.request('GET', '/shipping-templates');
  }

  async uploadImageByUrl(input: AukroImageUploadByUrlRequest): Promise<AukroPublicApiResult<AukroImageUploadResponse[]>> {
    return this.request('POST', '/images/url', input);
  }

  async createOffer(input: AukroOfferV2Request): Promise<AukroPublicApiResult<AukroOfferResponse>> {
    return this.request('POST', '/offers-v2', input);
  }

  async updateOffer(offerId: string, input: AukroOfferV2UpdateRequest): Promise<AukroPublicApiResult<AukroOfferResponse>> {
    return this.request('PATCH', `/offers-v2/${encodeURIComponent(offerId)}`, input);
  }

  async listOffers(query?: AukroOfferListQuery): Promise<AukroPublicApiResult<AukroOfferListResponse>> {
    return this.request('GET', '/offers-v2/list', undefined, query);
  }

  async getOfferDetail(offerId: string): Promise<AukroPublicApiResult<AukroOfferResponse>> {
    return this.request('GET', `/offers/${encodeURIComponent(offerId)}`);
  }

  async getWebhookSettings(): Promise<AukroPublicApiResult<AukroWebhookSettingsResponse>> {
    return this.getWebhookRead('/webhook/settings');
  }

  async getWebhookSubscriptions(): Promise<AukroPublicApiResult<AukroWebhookSubscriptionsResponse>> {
    return this.getWebhookRead('/webhook/subscriptions');
  }

  async getWebhookFailedEventCount(): Promise<AukroPublicApiResult<AukroWebhookFailedEventCountResponse>> {
    return this.getWebhookRead('/webhook/event/failed/count');
  }

  async getWebhookStatus(): Promise<AukroPublicApiResult<AukroWebhookStatusResponse>> {
    const settings = await this.getWebhookSettings();
    if (!settings.ok) return { ok: false, error: settings.error, status: settings.status };

    const subscriptions = await this.getWebhookSubscriptions();
    if (!subscriptions.ok) return { ok: false, error: subscriptions.error, status: subscriptions.status };

    const failedEvents = await this.getWebhookFailedEventCount();
    if (!failedEvents.ok) return { ok: false, error: failedEvents.error, status: failedEvents.status };

    return {
      ok: true,
      data: {
        settings: settings.data,
        subscriptions: subscriptions.data,
        failedEvents: failedEvents.data,
      },
    };
  }

  async getWebhookRead<T = unknown>(path: AukroWebhookReadPath): Promise<AukroPublicApiResult<T>> {
    if (!AUKRO_WEBHOOK_READ_PATHS.includes(path)) {
      return {
        ok: false,
        error: {
          code: 'AUKRO_WEBHOOK_READ_PATH_NOT_ALLOWED',
          message: 'Webhook read path is not part of the reviewed TASK-014 public API client contract.',
          retryable: false,
          endpoint: path,
          method: 'GET',
        },
      };
    }
    return this.request<T>('GET', path);
  }

  private async request<T>(method: HttpMethod, path: string, data?: unknown, params?: unknown): Promise<AukroPublicApiResult<T>> {
    const config = this.resolveConfig();
    const readiness = this.getReadiness(config);
    if (!readiness.ready) {
      this.clearToken();
      return { ok: false, error: readiness.error };
    }

    const removedEndpointError = this.removedEndpointError(method, path);
    if (removedEndpointError) {
      return { ok: false, error: removedEndpointError };
    }

    const auth = await this.ensureAuthenticated();
    if (!auth.ok) {
      return { ok: false, error: auth.error, status: auth.status };
    }

    try {
      const response = await firstValueFrom(
        this.httpService.request<T>({
          method,
          url: this.url(config, path),
          data,
          params,
          headers: this.protectedHeaders(config),
          timeout: config.timeoutMs || DEFAULT_TIMEOUT_MS,
        }),
      );

      return {
        ok: true,
        status: response.status,
        data: response.data,
      };
    } catch (error: unknown) {
      return {
        ok: false,
        error: this.normalizeError(error, config, method, path),
      };
    }
  }

  private async ensureAuthenticated(): Promise<AukroPublicApiResult<AukroPublicApiAuthStatus>> {
    if (this.bearerToken) {
      return {
        ok: true,
        data: {
          authenticated: true,
          tokenPresent: true,
          authenticatedAt: this.authenticatedAt,
          expiresAt: this.tokenExpiresAt,
        },
      };
    }
    return this.authenticate();
  }

  private protectedHeaders(config: AukroPublicApiConfig): Record<string, string> {
    return {
      Authorization: `Bearer ${this.bearerToken}`,
      'Content-Type': 'application/json',
      'X-Aukro-Api-Key': config.apiKey || '',
      'X-Accept-Language': config.language || DEFAULT_LANGUAGE,
      'X-Accept-Currency': config.currency || DEFAULT_CURRENCY,
    };
  }

  private resolveConfig(): AukroPublicApiConfig {
    const baseUrl = this.config('AUKRO_PUBLIC_API_BASE_URL') || DEFAULT_PRODUCTION_BASE_URL;
    const environment = this.resolveEnvironment(baseUrl, this.config('AUKRO_PUBLIC_API_ENVIRONMENT'));
    return {
      baseUrl,
      username: this.config('AUKRO_PUBLIC_API_USERNAME'),
      password: this.config('AUKRO_PUBLIC_API_PASSWORD'),
      apiKey: this.config('AUKRO_PUBLIC_API_KEY'),
      environment,
      language: this.config('AUKRO_PUBLIC_API_LANGUAGE') || DEFAULT_LANGUAGE,
      currency: this.config('AUKRO_PUBLIC_API_CURRENCY') || DEFAULT_CURRENCY,
      timeoutMs: this.numberConfig('AUKRO_PUBLIC_API_TIMEOUT_MS') || DEFAULT_TIMEOUT_MS,
    };
  }

  private config(name: string): string | undefined {
    const fromNest = this.configService?.get<string>(name);
    const value = fromNest === undefined ? process.env[name] : fromNest;
    return this.present(value) ? String(value).trim() : undefined;
  }

  private numberConfig(name: string): number | undefined {
    const value = this.config(name);
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }

  private resolveEnvironment(baseUrl?: string, configured?: string): AukroPublicApiEnvironment {
    if (configured === 'production' || configured === 'development' || configured === 'custom') return configured;
    if (baseUrl?.includes('be.djp.aukro.cloud')) return 'development';
    if (baseUrl?.includes('aukro.cz')) return 'production';
    return 'custom';
  }

  private url(config: AukroPublicApiConfig, path: string): string {
    return `${(config.baseUrl || '').replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
  }

  private resolveExpiry(auth: AukroPublicApiAuthResponse, authenticatedAt: string): string | undefined {
    const expiresIn = auth.expiresIn || auth.expires_in;
    if (!expiresIn || !Number.isFinite(Number(expiresIn))) return undefined;
    return new Date(new Date(authenticatedAt).getTime() + Number(expiresIn) * 1000).toISOString();
  }

  private missingConfigError(missing: AukroPublicApiConfigKey[]): AukroPublicApiNormalizedError {
    return {
      code: 'AUKRO_PUBLIC_API_CONFIG_MISSING',
      message: `Aukro Public API client is not ready: missing ${missing.join(', ')}.`,
      retryable: false,
      missing,
    };
  }

  private removedEndpointError(method: HttpMethod, path: string): AukroPublicApiNormalizedError | undefined {
    const normalized = `${method} ${path}`;
    const isRemoved = normalized === 'POST /offers'
      || (method === 'PATCH' && /^\/offers\/[^/]+$/.test(path))
      || normalized === 'POST /offers-import'
      || normalized === 'POST /offers/list'
      || normalized === 'POST /offers/bulk';

    if (!isRemoved) return undefined;
    return {
      code: 'AUKRO_PUBLIC_API_REMOVED_ENDPOINT_BLOCKED',
      message: 'Blocked use of a removed Aukro offer endpoint.',
      retryable: false,
      method,
      endpoint: path,
    };
  }

  private normalizeError(error: unknown, config: AukroPublicApiConfig, method: HttpMethod, endpoint: string): AukroPublicApiNormalizedError {
    const err = error as any;
    const status = err?.response?.status;
    const code = this.safeCode(err?.code || (status ? `HTTP_${status}` : 'AUKRO_PUBLIC_API_REQUEST_FAILED'));
    const messageSource = err?.response?.data?.message || err?.message || 'Aukro Public API request failed.';
    return {
      code,
      message: this.maskSecretLikeValues(String(messageSource), config) as string,
      status,
      retryable: this.retryable(code, status),
      method,
      endpoint,
      details: this.maskSecretLikeValues(err?.response?.data, config),
    };
  }

  private safeCode(code: string): string {
    return String(code).replace(/[^A-Z0-9_:-]/gi, '_').slice(0, 100) || 'AUKRO_PUBLIC_API_REQUEST_FAILED';
  }

  private retryable(code: string, status?: number): boolean {
    return code === 'ECONNRESET'
      || code === 'ETIMEDOUT'
      || code === 'ECONNABORTED'
      || status === 408
      || status === 429
      || Boolean(status && status >= 500);
  }

  private maskSecretLikeValues(value: unknown, config: AukroPublicApiConfig): unknown {
    if (value === null || value === undefined) return value;

    if (typeof value === 'string') {
      let masked = value;
      for (const secret of [config.username, config.password, config.apiKey, this.bearerToken]) {
        if (secret && secret.length >= 3) {
          masked = masked.split(secret).join('[MASKED]');
        }
      }
      masked = masked.replace(/Bearer\s+[A-Za-z0-9._~+\-/]+=*/gi, 'Bearer [MASKED]');
      masked = masked.replace(/(api[-_ ]?key|password|token|secret)(["'\s:=]+)([^\s"',}]+)/gi, '$1$2[MASKED]');
      return masked;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.maskSecretLikeValues(item, config));
    }

    if (typeof value === 'object') {
      const output: Record<string, unknown> = {};
      for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
        if (/password|token|secret|api[-_]?key|authorization/i.test(key)) {
          output[key] = '[MASKED]';
        } else {
          output[key] = this.maskSecretLikeValues(entry, config);
        }
      }
      return output;
    }

    return value;
  }

  private present(value?: string): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }
}
