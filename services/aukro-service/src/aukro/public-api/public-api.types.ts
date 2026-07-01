export type AukroPublicApiEnvironment = 'production' | 'development' | 'custom';

export type AukroPublicApiConfigKey = 'baseUrl' | 'username' | 'password' | 'apiKey';

export interface AukroPublicApiConfig {
  baseUrl?: string;
  username?: string;
  password?: string;
  apiKey?: string;
  environment?: AukroPublicApiEnvironment;
  language?: string;
  currency?: string;
  timeoutMs?: number;
}

export interface AukroPublicApiCredentials {
  username: string;
  password: string;
  apiKey: string;
}

export interface AukroPublicApiReadiness {
  ready: boolean;
  status: 'ready' | 'missing_config';
  missing: AukroPublicApiConfigKey[];
  baseUrlConfigured: boolean;
  usernameConfigured: boolean;
  passwordConfigured: boolean;
  apiKeyConfigured: boolean;
  environment: AukroPublicApiEnvironment;
  error?: AukroPublicApiNormalizedError;
}

export interface AukroPublicApiAuthResponse {
  token?: string;
  accessToken?: string;
  access_token?: string;
  bearerToken?: string;
  tokenType?: string;
  expiresIn?: number;
  expires_in?: number;
}

export interface AukroPublicApiAuthStatus {
  authenticated: boolean;
  tokenPresent: boolean;
  authenticatedAt?: string;
  expiresAt?: string;
}

export interface AukroPublicApiNormalizedError {
  code: string;
  message: string;
  status?: number;
  retryable: boolean;
  method?: string;
  endpoint?: string;
  details?: unknown;
  missing?: AukroPublicApiConfigKey[];
}

export interface AukroPublicApiResult<T> {
  ok: boolean;
  data?: T;
  status?: number;
  error?: AukroPublicApiNormalizedError;
}

export interface AukroCategory {
  id: string;
  name?: string;
  parentId?: string | null;
  leaf?: boolean;
  children?: AukroCategory[];
  [key: string]: unknown;
}

export interface AukroCategoryListResponse {
  categories?: AukroCategory[];
  [key: string]: unknown;
}

export interface AukroAttributeValue {
  id?: string;
  name?: string;
  value?: string | number | boolean;
  unit?: string;
  [key: string]: unknown;
}

export interface AukroCategoryAttribute {
  id: string;
  name?: string;
  type?: string;
  required?: boolean;
  unit?: string;
  values?: AukroAttributeValue[];
  [key: string]: unknown;
}

export interface AukroCategoryAttributesResponse {
  attributes?: AukroCategoryAttribute[];
  [key: string]: unknown;
}

export interface AukroShippingTemplate {
  id: string;
  name?: string;
  active?: boolean;
  [key: string]: unknown;
}

export interface AukroShippingTemplatesResponse {
  shippingTemplates?: AukroShippingTemplate[];
  templates?: AukroShippingTemplate[];
  [key: string]: unknown;
}

export interface AukroImageUploadByUrlRequest {
  imagesUrl: string[];
}

export interface AukroSingleImageUrlInput {
  url: string;
}

export interface AukroImageUploadResponse {
  id?: string;
  imageId?: string;
  url?: string;
  status?: string;
  [key: string]: unknown;
}

export interface AukroOfferPrice {
  amount: number;
  currency: string;
}

export interface AukroOfferLocation {
  city: string;
  postCode: string;
  countryCode: 'CZ' | 'SK' | 'HU' | 'HR' | 'SI' | string;
  [key: string]: unknown;
}

export interface AukroOfferAttributeInput {
  id: number;
  value?: string;
  selectedId?: number[];
  [key: string]: unknown;
}

export interface AukroOfferImageInput {
  id?: number;
  url?: string;
  [key: string]: unknown;
}

export interface AukroOfferV2Request {
  name: string;
  language: string;
  description: string;
  auctionPrice?: AukroOfferPrice;
  buyNowPrice?: AukroOfferPrice;
  retailPrice?: AukroOfferPrice;
  quantity: number;
  categoryId: number;
  shippingTemplateId: number;
  duration: 3 | 5 | 7 | 10 | 30 | number;
  location: AukroOfferLocation;
  attributes?: AukroOfferAttributeInput[];
  images: AukroOfferImageInput[];
  [key: string]: unknown;
}

export type AukroOfferV2UpdateRequest = Partial<AukroOfferV2Request>;

export interface AukroOfferResponse {
  id?: string;
  offerId?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface AukroOfferListQuery {
  page?: number;
  size?: number;
  sort?: string;
  status?: string | string[];
  [key: string]: string | string[] | number | boolean | undefined;
}

export interface AukroOfferListResponse {
  offers?: AukroOfferResponse[];
  items?: AukroOfferResponse[];
  total?: number;
  [key: string]: unknown;
}

export interface AukroWebhookSettingsResponse {
  authorizationSet?: boolean;
  callbackUrlConfigured?: boolean;
  [key: string]: unknown;
}

export interface AukroWebhookSubscription {
  id?: string;
  eventType?: string;
  active?: boolean;
  [key: string]: unknown;
}

export interface AukroWebhookSubscriptionsResponse {
  subscriptions?: AukroWebhookSubscription[];
  [key: string]: unknown;
}

export interface AukroWebhookFailedEventCountResponse {
  count?: number;
  failedEventCount?: number;
  [key: string]: unknown;
}

export interface AukroWebhookStatusResponse {
  settings?: AukroWebhookSettingsResponse;
  subscriptions?: AukroWebhookSubscriptionsResponse;
  failedEvents?: AukroWebhookFailedEventCountResponse;
}

export const AUKRO_PUBLIC_API_REMOVED_ENDPOINTS = [
  'POST /offers',
  'PATCH /offers/{id}',
  'POST /offers-import',
  'POST /offers/list',
  'POST /offers/bulk',
] as const;

export const AUKRO_WEBHOOK_READ_PATHS = [
  '/webhook/settings',
  '/webhook/subscriptions',
  '/webhook/event/failed/count',
] as const;

export type AukroWebhookReadPath = typeof AUKRO_WEBHOOK_READ_PATHS[number];
