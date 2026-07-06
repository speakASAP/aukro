export type AukroBusinessHealthStatus = 'pass' | 'warn' | 'blocked';

export interface AukroBusinessHealthSourceRef {
  path: string;
  reason: string;
}

export interface AukroBusinessHealthRuntimeBoundary {
  runtimeDataQueried: false;
  productionDbQueried: false;
  liveSyntheticMutationAuthorized: false;
  externalMarketplaceReadQueried: false;
  externalMarketplaceMutationAuthorized: false;
  localOfferMutationAuthorized: false;
  warehouseQueried: false;
  catalogQueried: false;
  ordersQueried: false;
}

export interface AukroChannelReadbackBusinessHealthEnvelope {
  service: 'aukro';
  contractId: 'aukro.channel_readback_business_health.v1';
  businessHealthContract: 'stock-order-marketplace-business-health.v1';
  endpoint: '/aukro/business-health/channel-readback';
  status: AukroBusinessHealthStatus;
  generatedAt: string;
  summary: string;
  channel: 'aukro';
  evidenceMode: 'source-only';
  invariant: {
    listingQuantityMustNotExceedWarehouseAvailability: true;
    listingMustNotRemainSellableWhenCatalogUnavailable: true;
    externalReadbackRequiredBeforeRuntimePass: true;
    humanOrProviderPolicyRequiredForExternalMutation: true;
  };
  runtimeBoundary: AukroBusinessHealthRuntimeBoundary;
  mutationFlags: {
    mutatesAukro: false;
    mutatesMarketplaceOffer: false;
    mutatesLocalOffer: false;
    mutatesWarehouse: false;
    mutatesCatalog: false;
    mutatesOrders: false;
    mutatesPayments: false;
    changesSecretsOrEnv: false;
  };
  sourceRefs: AukroBusinessHealthSourceRef[];
  checkedSourceContracts: string[];
  blockers: string[];
  intentChain: {
    vision: string;
    goalImpact: string;
    system: string;
    feature: string;
    task: string;
    executionPlan: string;
    codingPrompt: string;
    code: string[];
    validation: string[];
  };
}
