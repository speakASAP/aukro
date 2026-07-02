import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { LoggerService } from '../logger/logger.service';

export interface CatalogContentPreviewSource {
  canonicalDocumentVersion?: string;
  legacyDescriptionFallback?: boolean;
  sourceHash?: string;
  generatedAt?: string;
}

export interface CatalogContentPreviewContent {
  title?: string;
  plainText?: string;
  html?: string;
  blocks?: any[];
  sections?: any[];
}

export interface CatalogContentPreview {
  marketplace: string;
  label?: string;
  format?: string;
  product?: any;
  content: CatalogContentPreviewContent;
  source: CatalogContentPreviewSource;
  overridesApplied?: boolean;
  warnings?: string[];
}

export interface CatalogProductRequestOptions {
  authorization?: string | null;
  catalogScope?: string;
}

/**
 * API client for catalog-microservice
 * Fetches product data from the central catalog
 */
@Injectable()
export class CatalogClientService {
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly logger: LoggerService,
  ) {
    this.baseUrl = process.env.CATALOG_SERVICE_URL || 'http://catalog-microservice:3200';
  }

  private bearerAuthorization(value?: string | null): string | null {
    const token = (value || '').trim();
    if (!token) return null;
    return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }

  private serviceAuthorization(): string | null {
    return this.bearerAuthorization(
      process.env.CATALOG_SERVICE_TOKEN ||
      process.env.JWT_TOKEN ||
      process.env.SERVICE_TOKEN ||
      ''
    );
  }

  private requestOptions(): { headers?: { Authorization: string } } {
    const authorization = this.serviceAuthorization();

    if (!authorization) {
      return {};
    }

    return {
      headers: {
        Authorization: authorization,
      },
    };
  }

  private userRequestOptions(authorization?: string | null): { headers?: { Authorization: string } } {
    const header = this.bearerAuthorization(authorization);
    return header ? { headers: { Authorization: header } } : {};
  }

  private catalogSourcesQuery(value?: string[] | string | null): string | null {
    const rawItems = Array.isArray(value) ? value : String(value || '').split(',');
    const allowed = new Set(['own', 'alfares', 'community']);
    const sources = rawItems
      .flatMap((item) => String(item || '').split(','))
      .map((item) => item.trim().toLowerCase())
      .filter((item) => allowed.has(item));

    return Array.from(new Set(sources)).join(',') || null;
  }

  async provisionUserCatalog(authorization: string | null | undefined, sourceApplication: string): Promise<any> {
    const options = this.userRequestOptions(authorization);
    if (!options.headers?.Authorization) {
      throw new HttpException('Catalog provisioning requires user authorization', HttpStatus.UNAUTHORIZED);
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/catalog/access/provision`, { sourceApplication }, options)
      );
      return response.data?.data || response.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to provision user catalog access: ${errorMessage}`, errorStack, 'CatalogClient');
      throw new HttpException('Failed to provision user catalog access', HttpStatus.BAD_GATEWAY);
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(productId: string, options: CatalogProductRequestOptions = {}): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (options.catalogScope) params.append('catalogScope', options.catalogScope);
      const query = params.toString();
      const requestOptions = options.authorization ? this.userRequestOptions(options.authorization) : undefined;
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/api/products/${encodeURIComponent(productId)}${query ? `?${query}` : ''}`,
          requestOptions,
        )
      );
      return response.data.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to get product ${productId}: ${errorMessage}`, errorStack, 'CatalogClient');
      throw new HttpException(`Product not found: ${productId}`, HttpStatus.NOT_FOUND);
    }
  }

  /**
   * Get product by SKU
   */
  async getProductBySku(sku: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/products/sku/${sku}`)
      );
      if (!response.data.success || !response.data.data) {
        return null;
      }
      return response.data.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Product not found by SKU ${sku}: ${errorMessage}`, 'CatalogClient');
      return null;
    }
  }

  /**
   * Search products
   */
  async searchProducts(query: {
    search?: string;
    isActive?: boolean;
    categoryId?: string;
    page?: number;
    limit?: number;
    catalogScope?: string;
    catalogSources?: string[] | string;
    authorization?: string | null;
  }): Promise<{ items: any[]; total: number; page: number; limit: number }> {
    try {
      const params = new URLSearchParams();
      if (query.search) params.append('search', query.search);
      if (query.isActive !== undefined) params.append('isActive', String(query.isActive));
      if (query.categoryId) params.append('categoryId', query.categoryId);
      if (query.page) params.append('page', String(query.page));
      if (query.limit) params.append('limit', String(query.limit));
      if (query.catalogScope) params.append('catalogScope', query.catalogScope);
      const catalogSources = this.catalogSourcesQuery(query.catalogSources);
      if (catalogSources) params.append('catalogSources', catalogSources);
      const requestOptions = query.authorization ? this.userRequestOptions(query.authorization) : undefined;

      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/products?${params.toString()}`, requestOptions)
      );
      return {
        items: response.data.data || [],
        total: response.data.pagination?.total || 0,
        page: response.data.pagination?.page || 1,
        limit: response.data.pagination?.limit || 20,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to search products: ${errorMessage}`, errorStack, 'CatalogClient');
      return { items: [], total: 0, page: 1, limit: 20 };
    }
  }

  /**
   * Create product in catalog
   */
  async createProduct(productData: any): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/products`, productData)
      );
      return response.data.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to create product: ${errorMessage}`, errorStack, 'CatalogClient');
      throw new HttpException(`Failed to create product: ${errorMessage}`, HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Update product in catalog
   */
  async updateProduct(productId: string, productData: any, options: CatalogProductRequestOptions = {}): Promise<any> {
    try {
      const requestOptions = options.authorization ? this.userRequestOptions(options.authorization) : this.requestOptions();
      const response = await firstValueFrom(
        this.httpService.put(`${this.baseUrl}/api/products/${encodeURIComponent(productId)}`, productData, requestOptions)
      );
      return response.data.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      const response = (error as any)?.response;
      const status = Number(response?.status) || HttpStatus.BAD_REQUEST;
      const catalogMessage = response?.data?.error?.message || response?.data?.message || errorMessage;
      this.logger.error(`Failed to update product ${productId}: ${errorMessage}`, errorStack, 'CatalogClient');
      throw new HttpException(`Failed to update product: ${catalogMessage}`, status);
    }
  }

  /**
   * Get product pricing
   */
  async getProductPricing(productId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/pricing/product/${productId}/current`)
      );
      return response.data.data;
    } catch (error) {
      this.logger.warn(`Pricing not found for product ${productId}`, 'CatalogClient');
      return null;
    }
  }

  /**
   * Get canonical content preview for a marketplace.
   */
  async getProductContentPreview(productId: string, marketplace: string, options: CatalogProductRequestOptions = {}): Promise<CatalogContentPreview | null> {
    try {
      const params = new URLSearchParams();
      if (options.catalogScope) params.append('catalogScope', options.catalogScope);
      const query = params.toString();
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/api/products/${encodeURIComponent(productId)}/content-previews/${encodeURIComponent(marketplace)}${query ? `?${query}` : ''}`,
          options.authorization ? this.userRequestOptions(options.authorization) : this.requestOptions(),
        )
      );
      if (!response.data?.success || !response.data?.data) {
        return null;
      }
      return response.data.data as CatalogContentPreview;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Content preview not found for product ${productId} and marketplace ${marketplace}: ${errorMessage}`, 'CatalogClient');
      return null;
    }
  }

  /**
   * Get product media
   */
  async getProductMedia(productId: string): Promise<any[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/media/product/${productId}`)
      );
      return response.data.data || [];
    } catch (error) {
      this.logger.warn(`Media not found for product ${productId}`, 'CatalogClient');
      return [];
    }
  }
}

