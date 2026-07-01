import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import {
  AukroOfferAttributeInput,
  AukroOfferImageInput,
  AukroOfferLocation,
  AukroOfferPrice,
  AukroOfferV2Request,
  AukroPublicApiClient,
  AukroPublicApiNormalizedError,
} from '../public-api';
import {
  AUKRO_EXECUTOR_VERSION,
  AukroExecutorCreateInput,
  AukroExecutorCreateResult,
  AukroExecutorExecutionRecord,
  AukroExecutorGateFailure,
  AukroExecutorImageEvidence,
  AukroExecutorOfferLikeRecord,
  AukroExecutorOfferPriceMode,
  AukroExecutorPayloadSummary,
  AukroExecutorPublicApiClient,
} from './executor.types';

const DEFAULT_LANGUAGE = 'cs-CZ';
const DEFAULT_DURATION = 30;

@Injectable()
export class AukroExecutorService {
  constructor(private readonly publicApiClient: AukroPublicApiClient) {}

  async createOffer(input: AukroExecutorCreateInput): Promise<AukroExecutorCreateResult> {
    const createdAt = this.isoNow(input.now);
    const failures = this.evaluateReadiness(input);
    const idempotencyKey = this.trim(input.evidence?.idempotencyKey);
    const actorId = this.trim(input.evidence?.actor?.actorId);

    if (failures.length > 0) {
      const record = this.baseRecord(input, createdAt, 'blocked', {
        idempotencyKey,
        actorId,
        dryRun: Boolean(input.dryRun),
        gateFailures: failures,
        finishedAt: createdAt,
      });
      return {
        ok: false,
        status: 'blocked',
        calledApi: false,
        record,
        gateFailures: failures,
      };
    }

    const payload = this.buildPayload(input.offer, input.evidence.payload);
    const payloadSummary = this.summarizePayload(payload);
    const priorSuccess = this.findPriorSuccess(idempotencyKey, input.priorExecutions);

    if (priorSuccess) {
      const record = this.baseRecord(input, createdAt, 'skipped', {
        idempotencyKey,
        actorId,
        dryRun: Boolean(input.dryRun),
        finishedAt: createdAt,
        aukroOfferId: priorSuccess.aukroOfferId,
        aukroStatus: priorSuccess.aukroStatus,
        skippedReason: 'idempotent_reuse',
        reusedFrom: priorSuccess.createdAt,
        payloadSummary,
      });
      return {
        ok: true,
        status: 'reused',
        calledApi: false,
        payload,
        record,
      };
    }

    if (input.dryRun) {
      const record = this.baseRecord(input, createdAt, 'dry_run', {
        idempotencyKey,
        actorId,
        dryRun: true,
        finishedAt: createdAt,
        payloadSummary,
      });
      return {
        ok: true,
        status: 'dry_run',
        calledApi: false,
        payload,
        record,
      };
    }

    try {
      const response = await this.publicApiClient.createOffer(payload);
      if (!response.ok) {
        const error = this.normalizeApiError(response.error || response);
        const record = this.baseRecord(input, createdAt, 'failed', {
          idempotencyKey,
          actorId,
          dryRun: false,
          finishedAt: this.isoNow(),
          apiStatus: response.status,
          apiError: error,
          payloadSummary,
        });
        return {
          ok: false,
          status: 'failed',
          calledApi: true,
          payload,
          record,
          error,
        };
      }

      const aukroOfferId = this.extractOfferId(response.data);
      if (!aukroOfferId) {
        const error: AukroPublicApiNormalizedError = {
          code: 'AUKRO_EXECUTOR_OFFER_ID_MISSING',
          message: 'Aukro create response did not include an offer id.',
          status: response.status,
          retryable: false,
          method: 'POST',
          endpoint: '/offers-v2',
        };
        const record = this.baseRecord(input, createdAt, 'failed', {
          idempotencyKey,
          actorId,
          dryRun: false,
          finishedAt: this.isoNow(),
          apiStatus: response.status,
          apiError: error,
          payloadSummary,
        });
        return {
          ok: false,
          status: 'failed',
          calledApi: true,
          payload,
          response: response.data,
          record,
          error,
        };
      }

      const record = this.baseRecord(input, createdAt, 'success', {
        idempotencyKey,
        actorId,
        dryRun: false,
        finishedAt: this.isoNow(),
        aukroOfferId,
        aukroStatus: this.stringValue(response.data?.status),
        apiStatus: response.status,
        payloadSummary,
      });
      return {
        ok: true,
        status: 'created',
        calledApi: true,
        payload,
        response: response.data,
        record,
      };
    } catch (error: unknown) {
      const normalized = this.normalizeApiError(error);
      const record = this.baseRecord(input, createdAt, 'failed', {
        idempotencyKey,
        actorId,
        dryRun: false,
        finishedAt: this.isoNow(),
        apiStatus: normalized.status,
        apiError: normalized,
        payloadSummary,
      });
      return {
        ok: false,
        status: 'failed',
        calledApi: true,
        payload,
        record,
        error: normalized,
      };
    }
  }

  buildPayload(offer: AukroExecutorOfferLikeRecord, evidence: AukroExecutorCreateInput['evidence']['payload']): AukroOfferV2Request {
    const price = this.normalizePrice(evidence.price.amount, evidence.price.currency);
    const priceMode = evidence.price.mode || 'buy_now';
    const payload: AukroOfferV2Request = {
      name: this.requiredString(offer.name || offer.title),
      language: this.trim(evidence.language || offer.language) || DEFAULT_LANGUAGE,
      description: this.description(offer),
      quantity: this.positiveInteger(evidence.stockQuantity),
      categoryId: this.positiveInteger(evidence.categoryId),
      shippingTemplateId: this.positiveInteger(evidence.shippingTemplateId),
      duration: this.positiveInteger(evidence.duration || offer.duration || DEFAULT_DURATION),
      location: this.location(evidence.location),
      attributes: this.attributes(evidence.attributes || offer.attributes || []),
      images: this.images(evidence.images),
    };

    if (priceMode === 'auction') {
      payload.auctionPrice = price;
    } else {
      payload.buyNowPrice = price;
    }

    return payload;
  }

  evaluateReadiness(input: AukroExecutorCreateInput): AukroExecutorGateFailure[] {
    const failures: AukroExecutorGateFailure[] = [];
    const evidence = input.evidence;
    const payload = evidence?.payload;

    this.require(this.trim(evidence?.actor?.actorId), failures, 'ACTOR_MISSING', 'Executor actor evidence is required.');
    this.require(this.trim(evidence?.idempotencyKey), failures, 'IDEMPOTENCY_KEY_MISSING', 'Idempotency key evidence is required.');
    this.require(Boolean(evidence?.policy?.allowed), failures, 'POLICY_NOT_ALLOWED', 'Policy evidence must be allowed.');
    this.require((evidence?.policy?.blockers || []).length === 0, failures, 'POLICY_BLOCKERS_PRESENT', 'Policy evidence must not contain blockers.');
    this.require(Boolean(evidence?.humanApproval?.approved), failures, 'HUMAN_APPROVAL_MISSING', 'Human approval evidence is required.');
    this.require(this.trim(evidence?.humanApproval?.actorId), failures, 'HUMAN_APPROVAL_ACTOR_MISSING', 'Human approval actor is required.');
    this.require(this.rateLimitReady(evidence), failures, 'RATE_LIMIT_READINESS_MISSING', 'Rate-limit readiness or approved local budget is required.');
    this.require(Boolean(evidence?.account?.ready), failures, 'ACCOUNT_READINESS_MISSING', 'Account readiness evidence is required.');
    this.require(this.isPositiveInteger(payload?.categoryId), failures, 'CATEGORY_ID_MISSING', 'Aukro category id evidence is required.');
    this.require(this.isPositiveInteger(payload?.shippingTemplateId), failures, 'SHIPPING_TEMPLATE_ID_MISSING', 'Shipping template id evidence is required.');
    this.require(this.locationReady(payload?.location), failures, 'LOCATION_MISSING', 'Offer location evidence is required.');
    this.require(this.isPositiveInteger(payload?.stockQuantity), failures, 'STOCK_QUANTITY_MISSING', 'Stock quantity evidence must be at least 1.');
    this.require(this.priceReady(payload?.price), failures, 'PRICE_MISSING', 'Price amount and currency evidence are required.');
    this.require(this.images(payload?.images).length > 0, failures, 'IMAGE_MISSING', 'At least one valid image id or URL is required.');
    this.require(Boolean(this.trim(input.offer?.name || input.offer?.title)), failures, 'OFFER_NAME_MISSING', 'Offer name/title is required for Aukro payload mapping.');
    this.require(Boolean(this.description(input.offer)), failures, 'OFFER_DESCRIPTION_MISSING', 'Offer description is required for Aukro payload mapping.');

    return failures;
  }

  normalizeApiError(error: unknown): AukroPublicApiNormalizedError {
    const err = error as any;
    const status = err?.status || err?.response?.status;
    return {
      code: this.safeCode(err?.code || (status ? `HTTP_${status}` : 'AUKRO_EXECUTOR_API_ERROR')),
      message: this.maskSecretLikeValues(String(err?.message || err?.response?.data?.message || 'Aukro executor API call failed.')) as string,
      status,
      retryable: Boolean(err?.retryable) || status === 408 || status === 429 || Boolean(status && status >= 500),
      method: err?.method || 'POST',
      endpoint: err?.endpoint || '/offers-v2',
      details: this.maskSecretLikeValues(err?.details || err?.response?.data),
    };
  }

  private baseRecord(
    input: AukroExecutorCreateInput,
    createdAt: string,
    status: AukroExecutorExecutionRecord['status'],
    values: Partial<AukroExecutorExecutionRecord>,
  ): AukroExecutorExecutionRecord {
    return {
      executorVersion: AUKRO_EXECUTOR_VERSION,
      action: 'create_offer_v2',
      status,
      idempotencyKey: values.idempotencyKey || this.trim(input.evidence?.idempotencyKey) || '[MISSING]',
      actorId: values.actorId || this.trim(input.evidence?.actor?.actorId),
      sourceOfferId: this.sourceOfferId(input.offer),
      dryRun: Boolean(values.dryRun),
      createdAt,
      ...values,
    };
  }

  private findPriorSuccess(idempotencyKey: string, priorExecutions?: AukroExecutorExecutionRecord[]): AukroExecutorExecutionRecord | undefined {
    return (priorExecutions || []).find((record) =>
      record.idempotencyKey === idempotencyKey
      && record.status === 'success'
      && Boolean(record.aukroOfferId),
    );
  }

  private summarizePayload(payload: AukroOfferV2Request): AukroExecutorPayloadSummary {
    const priceMode: AukroExecutorOfferPriceMode = payload.auctionPrice ? 'auction' : 'buy_now';
    const price = payload.auctionPrice || payload.buyNowPrice || payload.retailPrice;
    return {
      name: payload.name,
      categoryId: payload.categoryId,
      shippingTemplateId: payload.shippingTemplateId,
      quantity: payload.quantity,
      imageCount: payload.images.length,
      priceCurrency: price?.currency || '[MISSING]',
      priceMode,
      payloadDigest: createHash('sha256').update(JSON.stringify(payload)).digest('hex'),
    };
  }

  private rateLimitReady(evidence?: AukroExecutorCreateInput['evidence']): boolean {
    if (evidence?.rateLimit?.ready) return true;
    if (!evidence?.localBudget?.approved) return false;
    return evidence.localBudget.remainingCreates === undefined || evidence.localBudget.remainingCreates >= 1;
  }

  private locationReady(location?: AukroOfferLocation): boolean {
    return Boolean(
      this.trim(location?.city)
      && this.trim(location?.postCode)
      && this.trim(location?.countryCode),
    );
  }

  private location(location: AukroOfferLocation): AukroOfferLocation {
    return {
      ...location,
      city: this.requiredString(location.city),
      postCode: this.requiredString(location.postCode),
      countryCode: this.requiredString(location.countryCode),
    };
  }

  private priceReady(price?: { amount: number | string; currency: string }): boolean {
    return this.isPositiveNumber(price?.amount) && Boolean(this.trim(price?.currency));
  }

  private normalizePrice(amount: number | string, currency: string): AukroOfferPrice {
    return {
      amount: this.positiveNumber(amount),
      currency: this.requiredString(currency),
    };
  }

  private attributes(attributes: AukroOfferAttributeInput[]): AukroOfferAttributeInput[] {
    return (attributes || [])
      .map((attribute) => ({
        ...attribute,
        id: this.toPositiveInteger(attribute.id),
        selectedId: attribute.selectedId
          ?.map((id) => this.toPositiveInteger(id))
          .filter((id): id is number => id !== undefined),
      }))
      .filter((attribute) => attribute.id !== undefined) as AukroOfferAttributeInput[];
  }

  private images(images?: AukroExecutorImageEvidence[]): AukroOfferImageInput[] {
    return (images || [])
      .map((image) => {
        const id = this.toPositiveInteger(image.id);
        const url = this.trim(image.url);
        if (!id && !url) return undefined;
        return {
          ...(id ? { id } : {}),
          ...(url ? { url } : {}),
        };
      })
      .filter((image): image is AukroOfferImageInput => Boolean(image));
  }

  private description(offer: AukroExecutorOfferLikeRecord): string {
    const html = this.trim(offer.htmlDescription || offer.description);
    if (html) return html;
    const plain = this.trim(offer.plainDescription);
    return plain ? `<p>${this.escapeHtml(plain)}</p>` : '';
  }

  private extractOfferId(data?: { id?: string; offerId?: string }): string | undefined {
    return this.trim(data?.offerId || data?.id);
  }

  private sourceOfferId(offer?: AukroExecutorOfferLikeRecord): string | undefined {
    const id = offer?.id;
    return id === undefined || id === null ? undefined : String(id);
  }

  private positiveInteger(value: unknown): number {
    const parsed = this.toPositiveInteger(value);
    if (!parsed) throw new Error(`Expected positive integer, got ${String(value)}.`);
    return parsed;
  }

  private toPositiveInteger(value: unknown): number | undefined {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) return undefined;
    return parsed;
  }

  private isPositiveInteger(value: unknown): boolean {
    return this.toPositiveInteger(value) !== undefined;
  }

  private positiveNumber(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`Expected positive number, got ${String(value)}.`);
    return parsed;
  }

  private isPositiveNumber(value: unknown): boolean {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0;
  }

  private requiredString(value: unknown): string {
    const trimmed = this.trim(value);
    if (!trimmed) throw new Error('Expected non-empty string.');
    return trimmed;
  }

  private stringValue(value: unknown): string | undefined {
    return value === undefined || value === null ? undefined : String(value);
  }

  private trim(value: unknown): string {
    return typeof value === 'string' ? value.trim() : value === undefined || value === null ? '' : String(value).trim();
  }

  private require(condition: unknown, failures: AukroExecutorGateFailure[], code: string, message: string): void {
    if (!condition) failures.push({ code, message });
  }

  private isoNow(value?: string | Date): string {
    if (value instanceof Date) return value.toISOString();
    if (value) return new Date(value).toISOString();
    return new Date().toISOString();
  }

  private safeCode(code: string): string {
    return String(code).replace(/[^A-Z0-9_:-]/gi, '_').slice(0, 100) || 'AUKRO_EXECUTOR_API_ERROR';
  }

  private maskSecretLikeValues(value: unknown): unknown {
    if (value === null || value === undefined) return value;

    if (typeof value === 'string') {
      return value
        .replace(/Bearer\s+[A-Za-z0-9._~+\-/]+=*/gi, 'Bearer [MASKED]')
        .replace(/(api[-_ ]?key|password|token|secret)(["'\s:=]+)([^\s"',}]+)/gi, '$1$2[MASKED]');
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.maskSecretLikeValues(item));
    }

    if (typeof value === 'object') {
      const output: Record<string, unknown> = {};
      for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
        if (/password|token|secret|api[-_]?key|authorization/i.test(key)) {
          output[key] = '[MASKED]';
        } else {
          output[key] = this.maskSecretLikeValues(entry);
        }
      }
      return output;
    }

    return value;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

export type AukroExecutorServiceClient = AukroExecutorPublicApiClient;
