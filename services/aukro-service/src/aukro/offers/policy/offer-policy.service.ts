import { Injectable } from '@nestjs/common';
import {
  HumanApprovalEvidence,
  IdempotencyEvidence,
  OfferPolicyEvaluation,
  OfferPolicyEvidence,
  OfferPolicyInput,
  OfferPolicyReason,
  PolicyEvaluationMode,
  PolicyEvidenceFlag,
  PolicyReasonCode,
  PriceEvidence,
  StockEvidence,
} from './offer-policy.types';

interface GateDefinition {
  evidenceKey: keyof OfferPolicyEvidence;
  missingCode: PolicyReasonCode;
  failedCode: PolicyReasonCode;
  staleCode: PolicyReasonCode;
  message: string;
  remediation: string;
  modes: PolicyEvaluationMode[];
  validate?: (evidence: PolicyEvidenceFlag) => boolean;
}

@Injectable()
export class OfferPolicyService {
  private readonly defaultMaxEvidenceAgeMinutes = 24 * 60;
  private readonly defaultMinMarginPercent = 0;

  private readonly gates: GateDefinition[] = [
    {
      evidenceKey: 'catalogValidated',
      missingCode: 'CATALOG_VALIDATION_MISSING',
      failedCode: 'CATALOG_VALIDATION_FAILED',
      staleCode: 'CATALOG_VALIDATION_STALE',
      message: 'Catalog validation evidence is required.',
      remediation: 'Refresh product data from catalog-microservice and confirm the product is active and sellable.',
      modes: ['draft', 'publish'],
    },
    {
      evidenceKey: 'accountReady',
      missingCode: 'ACCOUNT_READINESS_MISSING',
      failedCode: 'ACCOUNT_READINESS_FAILED',
      staleCode: 'ACCOUNT_READINESS_STALE',
      message: 'Aukro account/API readiness evidence is required.',
      remediation: 'Confirm the account is active and any API/token state is ready before publication.',
      modes: ['draft', 'publish'],
    },
    {
      evidenceKey: 'categoryMapped',
      missingCode: 'CATEGORY_MAPPING_MISSING',
      failedCode: 'CATEGORY_MAPPING_FAILED',
      staleCode: 'CATEGORY_MAPPING_STALE',
      message: 'Aukro category mapping evidence is required.',
      remediation: 'Map the catalog category to an approved Aukro category or send the offer to human review.',
      modes: ['draft', 'publish'],
    },
    {
      evidenceKey: 'requiredParametersComplete',
      missingCode: 'REQUIRED_PARAMETERS_MISSING',
      failedCode: 'REQUIRED_PARAMETERS_FAILED',
      staleCode: 'REQUIRED_PARAMETERS_STALE',
      message: 'Required Aukro parameter evidence is required.',
      remediation: 'Provide all marketplace-required parameters before readiness can pass.',
      modes: ['draft', 'publish'],
    },
    {
      evidenceKey: 'mediaReady',
      missingCode: 'MEDIA_READINESS_MISSING',
      failedCode: 'MEDIA_READINESS_FAILED',
      staleCode: 'MEDIA_READINESS_STALE',
      message: 'Media readiness evidence is required.',
      remediation: 'Attach at least one approved product image or media variant.',
      modes: ['draft', 'publish'],
    },
    {
      evidenceKey: 'stockAvailable',
      missingCode: 'STOCK_AVAILABILITY_MISSING',
      failedCode: 'STOCK_AVAILABILITY_FAILED',
      staleCode: 'STOCK_AVAILABILITY_STALE',
      message: 'Warehouse stock availability evidence is required.',
      remediation: 'Refresh warehouse availability and ensure sellable quantity is greater than zero.',
      modes: ['draft', 'publish'],
      validate: (evidence) => (evidence as StockEvidence).quantity === undefined || Number((evidence as StockEvidence).quantity) > 0,
    },
    {
      evidenceKey: 'priceValid',
      missingCode: 'PRICE_POLICY_MISSING',
      failedCode: 'PRICE_POLICY_FAILED',
      staleCode: 'PRICE_POLICY_STALE',
      message: 'Price and margin policy evidence is required.',
      remediation: 'Refresh catalog pricing and confirm the price and margin floor are valid.',
      modes: ['draft', 'publish'],
      validate: (evidence) => this.isPriceEvidenceValid(evidence as PriceEvidence),
    },
    {
      evidenceKey: 'duplicateChecked',
      missingCode: 'DUPLICATE_RISK_MISSING',
      failedCode: 'DUPLICATE_RISK_FAILED',
      staleCode: 'DUPLICATE_RISK_STALE',
      message: 'Duplicate listing risk evidence is required.',
      remediation: 'Check existing local Aukro offers for the same account and catalog product.',
      modes: ['draft', 'publish'],
    },
    {
      evidenceKey: 'aiRiskCleared',
      missingCode: 'AI_RISK_MISSING',
      failedCode: 'AI_RISK_FAILED',
      staleCode: 'AI_RISK_STALE',
      message: 'AI/policy risk evidence is required.',
      remediation: 'Provide advisory AI or rules-engine risk evidence; AI output alone cannot override other gates.',
      modes: ['draft', 'publish'],
    },
    {
      evidenceKey: 'humanApproved',
      missingCode: 'HUMAN_APPROVAL_MISSING',
      failedCode: 'HUMAN_APPROVAL_FAILED',
      staleCode: 'HUMAN_APPROVAL_STALE',
      message: 'Human approval evidence is required for publish readiness.',
      remediation: 'Record explicit approval from an authenticated operator before enqueueing publication.',
      modes: ['publish'],
      validate: (evidence) => Boolean((evidence as HumanApprovalEvidence).actorId),
    },
    {
      evidenceKey: 'rateLimitReady',
      missingCode: 'RATE_LIMIT_READINESS_MISSING',
      failedCode: 'RATE_LIMIT_READINESS_FAILED',
      staleCode: 'RATE_LIMIT_READINESS_STALE',
      message: 'Rate-limit readiness evidence is required for publish readiness.',
      remediation: 'Confirm account/API rate-limit budget before any live Aukro mutation.',
      modes: ['publish'],
    },
    {
      evidenceKey: 'idempotencyReady',
      missingCode: 'IDEMPOTENCY_MISSING',
      failedCode: 'IDEMPOTENCY_FAILED',
      staleCode: 'IDEMPOTENCY_STALE',
      message: 'Idempotency evidence is required for publish readiness.',
      remediation: 'Provide a stable idempotency key for the future publish attempt.',
      modes: ['publish'],
      validate: (evidence) => Boolean((evidence as IdempotencyEvidence).idempotencyKey),
    },
  ];

  evaluate(input: OfferPolicyInput = {}): OfferPolicyEvaluation {
    const mode = input.mode ?? 'draft';
    const now = input.now ? new Date(input.now) : new Date();
    const maxAge = input.maxEvidenceAgeMinutes ?? this.defaultMaxEvidenceAgeMinutes;
    const evidence = input.evidence ?? {};
    const reasons: OfferPolicyReason[] = [];

    for (const gate of this.gatesForMode(mode)) {
      const gateEvidence = evidence[gate.evidenceKey] as PolicyEvidenceFlag | undefined;
      const reason = this.evaluateGate(gate, gateEvidence, now, maxAge, input.minMarginPercent);
      if (reason) {
        reasons.push(reason);
      }
    }

    return {
      mode,
      allowed: reasons.length === 0,
      evaluatedAt: now.toISOString(),
      reasonCodes: reasons.map((reason) => reason.code),
      reasons,
    };
  }

  evaluateDraft(evidence: OfferPolicyEvidence, now?: string | Date): OfferPolicyEvaluation {
    return this.evaluate({ mode: 'draft', evidence, now });
  }

  evaluatePublish(evidence: OfferPolicyEvidence, now?: string | Date): OfferPolicyEvaluation {
    return this.evaluate({ mode: 'publish', evidence, now });
  }

  private gatesForMode(mode: PolicyEvaluationMode): GateDefinition[] {
    return this.gates.filter((gate) => gate.modes.includes(mode));
  }

  private evaluateGate(
    gate: GateDefinition,
    evidence: PolicyEvidenceFlag | undefined,
    now: Date,
    maxAgeMinutes: number,
    minMarginPercent?: number,
  ): OfferPolicyReason | null {
    if (!evidence) {
      return this.reason(gate, gate.missingCode);
    }

    if (!this.isFresh(evidence.checkedAt, now, maxAgeMinutes)) {
      return this.reason(gate, gate.staleCode);
    }

    if (evidence.passed !== true) {
      return this.reason(gate, gate.failedCode, evidence.hint);
    }

    if (gate.evidenceKey === 'priceValid' && !this.isPriceEvidenceValid(evidence as PriceEvidence, minMarginPercent)) {
      return this.reason(gate, gate.failedCode, evidence.hint);
    }

    if (gate.validate && !gate.validate(evidence)) {
      return this.reason(gate, gate.failedCode, evidence.hint);
    }

    return null;
  }

  private reason(gate: GateDefinition, code: PolicyReasonCode, hint?: string): OfferPolicyReason {
    return {
      code,
      evidenceKey: gate.evidenceKey,
      message: gate.message,
      remediation: hint || gate.remediation,
    };
  }

  private isFresh(checkedAt: string | undefined, now: Date, maxAgeMinutes: number): boolean {
    if (!checkedAt) {
      return false;
    }

    const checkedDate = new Date(checkedAt);
    if (Number.isNaN(checkedDate.getTime())) {
      return false;
    }

    const ageMs = now.getTime() - checkedDate.getTime();
    return ageMs >= 0 && ageMs <= maxAgeMinutes * 60 * 1000;
  }

  private isPriceEvidenceValid(evidence: PriceEvidence, minMarginPercent = this.defaultMinMarginPercent): boolean {
    const price = Number(evidence.price);
    if (!Number.isFinite(price) || price <= 0) {
      return false;
    }

    if (evidence.marginPercent !== undefined && evidence.marginPercent < minMarginPercent) {
      return false;
    }

    return true;
  }
}
