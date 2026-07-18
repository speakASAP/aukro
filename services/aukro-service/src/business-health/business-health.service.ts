import { Injectable } from '@nestjs/common';
import { AukroChannelReadbackBusinessHealthEnvelope } from './business-health.types';

const CONTRACT_ID = 'aukro.channel_readback_business_health.v1' as const;
const BUSINESS_HEALTH_CONTRACT = 'stock-order-marketplace-business-health.v1' as const;
const ENDPOINT = '/aukro/business-health/channel-readback' as const;

@Injectable()
export class BusinessHealthService {
  getChannelReadbackEnvelope(): AukroChannelReadbackBusinessHealthEnvelope {
    return {
      service: 'aukro',
      contractId: CONTRACT_ID,
      businessHealthContract: BUSINESS_HEALTH_CONTRACT,
      endpoint: ENDPOINT,
      status: 'warn',
      generatedAt: new Date().toISOString(),
      summary: 'Aukro source-owned channel readback contract exists; live external readback and provider mutation remain gated.',
      channel: 'aukro',
      evidenceMode: 'source-only',
      invariant: {
        listingQuantityMustNotExceedWarehouseAvailability: true,
        listingMustNotRemainSellableWhenCatalogUnavailable: true,
        externalReadbackRequiredBeforeRuntimePass: true,
        humanOrProviderPolicyRequiredForExternalMutation: true,
      },
      runtimeBoundary: {
        runtimeDataQueried: false,
        productionDbQueried: false,
        liveSyntheticMutationAuthorized: false,
        externalMarketplaceReadQueried: false,
        externalMarketplaceMutationAuthorized: false,
        localOfferMutationAuthorized: false,
        warehouseQueried: false,
        catalogQueried: false,
        ordersQueried: false,
      },
      mutationFlags: {
        mutatesAukro: false,
        mutatesMarketplaceOffer: false,
        mutatesLocalOffer: false,
        mutatesWarehouse: false,
        mutatesCatalog: false,
        mutatesOrders: false,
        mutatesPayments: false,
        changesSecretsOrEnv: false,
      },
      sourceRefs: [
        {
          path: 'services/aukro-service/src/aukro/offers/offer-availability-reconciliation.service.ts',
          reason: 'Local availability convergence code documents Warehouse/Catalog as availability authorities and records blocked external action instead of live de-listing.',
        },
        {
          path: 'services/aukro-service/src/aukro/offers/offers.service.ts',
          reason: 'Draft and publish-intent preparation derives stock and catalog evidence before local offer records can become publish-adjacent.',
        },
        {
          path: 'services/aukro-service/src/aukro/executor/executor.service.ts',
          reason: 'Aukro offer creation executor keeps dry-run/idempotency/readiness gates and is the bounded path for future official API mutation.',
        },
        {
          path: 'services/aukro-service/src/aukro/public-api/public-api.client.ts',
          reason: 'Official Aukro API client separates read endpoints from create/update calls and fails closed when auth/config readiness is missing.',
        },
        {
          path: 'docs/16_operations/AUKRO_PLATFORM_RULES.md',
          reason: 'Provider policy requires official Aukro integration evidence, account readiness, rate-limit evidence, and human approval for live marketplace automation.',
        },
        {
          path: 'docs/16_operations/INTEGRATIONS.md',
          reason: 'Repository integration map declares Catalog, Warehouse, Orders, and Aukro API ownership boundaries.',
        },
        {
          path: 'docs/10_features/FEAT-008-observability-reconciliation.md',
          reason: 'Feature-level intent for offer, stock, price, and order reconciliation and drift visibility.',
        },
      ],
      checkedSourceContracts: [
        'aukro.offer_availability_reconciliation.source.v1',
        'aukro.public_api_client.boundary.v1',
        'aukro.executor_create_offer.boundary.v1',
        'aukro.platform_rules.fail_closed.v1',
      ],
      blockers: [
        '[MISSING: approved live Aukro readback packet]',
        '[MISSING: target product/listing/account for Aukro channel readback proof]',
        '[MISSING: external Aukro provider policy for live readback cadence, rate limits, and account scope]',
        '[MISSING: approved reconciliation rule that maps Warehouse/Catalog availability to Aukro sellable quantity without external mutation side effects]',
      ],
      intentChain: {
        vision: 'docs/01_vision/VISION.md',
        goalImpact: 'docs/22_goal_impact/[MISSING: business-health Aukro channel readback goal impact]',
        system: 'docs/04_systems/SYS-001-aukro-service.md',
        feature: 'docs/10_features/FEAT-008-observability-reconciliation.md',
        task: 'docs/11_tasks/[MISSING: Aukro business-health channel readback task]',
        executionPlan: 'docs/orchestrator/2026-07-06-aukro-business-health-handoff.md',
        codingPrompt: 'Codex prompt 2026-07-06 Aukro service-owned business-health evidence envelope',
        code: [
          'services/aukro-service/src/business-health/business-health.controller.ts',
          'services/aukro-service/src/business-health/business-health.service.ts',
          'services/aukro-service/src/business-health/business-health.types.ts',
        ],
        validation: [
          'scripts/verify-business-health-aukro-channel-contract.js',
          'npm --prefix services/aukro-service run build',
          'git diff --check',
        ],
      },
    };
  }
}
