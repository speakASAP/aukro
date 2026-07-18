const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const requiredFiles = [
  'services/aukro-service/src/business-health/business-health.controller.ts',
  'services/aukro-service/src/business-health/business-health.module.ts',
  'services/aukro-service/src/business-health/business-health.service.ts',
  'services/aukro-service/src/business-health/business-health.types.ts',
  'services/aukro-service/src/app.module.ts',
  'docs/orchestrator/2026-07-06-aukro-business-health-handoff.md',
];

const requiredSnippets = {
  'services/aukro-service/src/business-health/business-health.controller.ts': [
    "@Controller('business-health')",
    "@Get('channel-readback')",
    'getChannelReadback',
  ],
  'services/aukro-service/src/business-health/business-health.service.ts': [
    "const CONTRACT_ID = 'aukro.channel_readback_business_health.v1' as const;",
    "const BUSINESS_HEALTH_CONTRACT = 'stock-order-marketplace-business-health.v1' as const;",
    "const ENDPOINT = '/aukro/business-health/channel-readback' as const;",
    "status: 'warn'",
    "evidenceMode: 'source-only'",
    'listingQuantityMustNotExceedWarehouseAvailability: true',
    'listingMustNotRemainSellableWhenCatalogUnavailable: true',
    'externalReadbackRequiredBeforeRuntimePass: true',
    'runtimeDataQueried: false',
    'productionDbQueried: false',
    'liveSyntheticMutationAuthorized: false',
    'externalMarketplaceReadQueried: false',
    'externalMarketplaceMutationAuthorized: false',
    'localOfferMutationAuthorized: false',
    'warehouseQueried: false',
    'catalogQueried: false',
    'ordersQueried: false',
    'mutatesAukro: false',
    'mutatesMarketplaceOffer: false',
    'mutatesLocalOffer: false',
    'mutatesWarehouse: false',
    'mutatesCatalog: false',
    'mutatesOrders: false',
    'mutatesPayments: false',
    'changesSecretsOrEnv: false',
    '[MISSING: approved live Aukro readback packet]',
    '[MISSING: target product/listing/account for Aukro channel readback proof]',
    '[MISSING: external Aukro provider policy for live readback cadence, rate limits, and account scope]',
    'services/aukro-service/src/aukro/offers/offer-availability-reconciliation.service.ts',
    'services/aukro-service/src/aukro/offers/offers.service.ts',
    'services/aukro-service/src/aukro/executor/executor.service.ts',
    'services/aukro-service/src/aukro/public-api/public-api.client.ts',
    'docs/16_operations/AUKRO_PLATFORM_RULES.md',
    'docs/16_operations/INTEGRATIONS.md',
    'docs/10_features/FEAT-008-observability-reconciliation.md',
  ],
  'services/aukro-service/src/business-health/business-health.types.ts': [
    'AukroChannelReadbackBusinessHealthEnvelope',
    "contractId: 'aukro.channel_readback_business_health.v1'",
    "businessHealthContract: 'stock-order-marketplace-business-health.v1'",
    "endpoint: '/aukro/business-health/channel-readback'",
    'runtimeDataQueried: false',
    'productionDbQueried: false',
    'liveSyntheticMutationAuthorized: false',
  ],
  'services/aukro-service/src/app.module.ts': [
    "import { BusinessHealthModule } from './business-health/business-health.module';",
    'BusinessHealthModule',
  ],
  'docs/orchestrator/2026-07-06-aukro-business-health-handoff.md': [
    'Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation',
    'GET /aukro/business-health/channel-readback',
    'aukro.channel_readback_business_health.v1',
    '[MISSING: approved live Aukro readback packet]',
    'No live Aukro/provider calls',
  ],
};

const forbiddenSnippets = [
  'createOffer(',
  'updateOffer(',
  'listOffers(',
  'getOfferDetail(',
  'prisma.',
  'warehouseClient.',
  'catalogClient.',
  'ordersClient.',
  'process.env.AUKRO_USERNAME',
  'process.env.AUKRO_PASSWORD',
  'process.env.AUKRO_API_KEY',
];

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

for (const file of requiredFiles) {
  read(file);
}

for (const [file, snippets] of Object.entries(requiredSnippets)) {
  const content = read(file);
  for (const snippet of snippets) {
    if (!content.includes(snippet)) {
      throw new Error(`Missing snippet in ${file}: ${snippet}`);
    }
  }
}

const serviceContent = read('services/aukro-service/src/business-health/business-health.service.ts');
for (const snippet of forbiddenSnippets) {
  if (serviceContent.includes(snippet)) {
    throw new Error(`Forbidden live/runtime pattern in business health service: ${snippet}`);
  }
}

console.log(JSON.stringify({
  status: 'pass',
  contractId: 'aukro.channel_readback_business_health.v1',
  endpoint: '/aukro/business-health/channel-readback',
  checkedFiles: requiredFiles.length,
  checkedSourceRefs: 7,
  forbiddenPatternsChecked: forbiddenSnippets.length,
}, null, 2));
