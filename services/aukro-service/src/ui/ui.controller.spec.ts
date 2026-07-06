process.env.LOGGING_SERVICE_URL = process.env.LOGGING_SERVICE_URL || 'http://logging-microservice:3209';

const { strict: assert } = require('assert');
const { UiController } = require('./ui.controller');

function createController(centralOrdersById: Record<string, any>, orders: any[] = []) {
  const authService = {};
  const catalogClient = {};
  const offersService = {};
  const orderClient = {
    getOrderReadModel: async (orderId: string) => centralOrdersById[orderId] || null,
  };
  const prisma = {
    aukroOrder: {
      findMany: async () => orders,
    },
  };
  return new UiController(authService as any, catalogClient as any, offersService as any, orderClient as any, prisma as any) as any;
}

async function run() {
  const controller = createController({
    'central-order-1': {
      id: 'central-order-1',
      status: 'paid',
      lifecycleStage: 'paid_not_delivered',
      paymentStatus: 'paid',
      fulfillmentStatus: 'reserved',
      deliveryStatus: 'not_started',
    },
  });

  const dashboardShell = controller.renderShell({ page: 'dashboard' });
  assert.equal(dashboardShell.includes('dashboardPollMs: 30000'), true);
  assert.equal(dashboardShell.includes('/profile?client_id=aukro'), true);
  assert.equal(dashboardShell.includes('/wallet?client_id=aukro'), true);
  assert.equal(dashboardShell.includes('email='), false);
  assert.equal(dashboardShell.includes('access_token='), false);
  assert.equal(dashboardShell.includes('document.hidden || !state.token'), true);
  assert.equal(dashboardShell.includes("document.addEventListener('visibilitychange'"), true);
  assert.equal(dashboardShell.includes("window.addEventListener('pagehide', stopDashboardPolling)"), true);
  assert.equal(dashboardShell.includes("refreshOrders"), true);

  const requiredLifecycleStages = [
    "ordered_unpaid",
    "payment_failed",
    "paid_not_delivered",
    "warehouse_fulfillment_requested",
    "warehouse_collecting",
    "warehouse_forming",
    "warehouse_formed",
    "handed_to_delivery",
    "in_delivery",
    "received",
    "not_received",
    "returned",
    "cancelled",
  ];
  for (const stage of requiredLifecycleStages) {
    const label = controller.orderLifecycleLabel(stage);
    assert.equal(typeof label, "string");
    assert.equal(label.length > 0, true);
    assert.notEqual(label, stage.replace(/_/g, " "));
  }


  const rawItem = {
    title: 'Sold catalog item',
    quantity: 2,
  };
  const localForwardedOrder = {
    id: 'local-order-1',
    accountId: 'account-1',
    aukroOrderId: 'aukro-order-1',
    orderId: 'central-order-1',
    status: 'pending',
    forwarded: true,
    customerEmail: 'buyer@example.test',
    total: 299,
    currency: 'CZK',
    createdAt: new Date('2026-07-02T10:00:00.000Z'),
    rawData: {
      title: 'Local Aukro title',
      items: [rawItem],
    },
  };
  const localMissingIdOrder = {
    ...localForwardedOrder,
    id: 'local-order-2',
    aukroOrderId: 'aukro-order-2',
    orderId: null,
    forwarded: false,
    status: 'created',
  };
  const localUnavailableOrder = {
    ...localForwardedOrder,
    id: 'local-order-3',
    aukroOrderId: 'aukro-order-3',
    orderId: 'central-order-404',
  };

  const hydrated = await controller.hydrateOrdersWithCentralReadModel([
    localForwardedOrder,
    localMissingIdOrder,
    localUnavailableOrder,
  ]);

  const publicForwarded = controller.publicOrder(hydrated[0]);
  assert.equal(publicForwarded.id, 'local-order-1');
  assert.equal(publicForwarded.orderId, 'central-order-1');
  assert.equal(publicForwarded.centralOrderId, 'central-order-1');
  assert.equal(publicForwarded.localStatus, 'pending');
  assert.equal(publicForwarded.status, 'paid');
  assert.equal(publicForwarded.lifecycleStage, 'paid_not_delivered');
  assert.equal(publicForwarded.lifecycleLabel, 'zaplaceno / čeká na doručení');
  assert.equal(publicForwarded.paymentStatus, 'paid');
  assert.equal(publicForwarded.fulfillmentStatus, 'reserved');
  assert.equal(publicForwarded.deliveryStatus, 'not_started');
  assert.equal(publicForwarded.ordersReadStatus, 'available');
  assert.equal(publicForwarded.stale, false);
  assert.equal(publicForwarded.items.length, 1);

  const publicMissingId = controller.publicOrder(hydrated[1]);
  assert.equal(publicMissingId.status, 'unknown');
  assert.equal(publicMissingId.lifecycleStage, 'unknown');
  assert.equal(publicMissingId.ordersReadStatus, 'missing_order_id');
  assert.equal(publicMissingId.statusMessage, 'chybí central Orders ID');
  assert.equal(publicMissingId.stale, true);
  assert.equal(publicMissingId.forwarded, false);

  const publicUnavailable = controller.publicOrder(hydrated[2]);
  assert.equal(publicUnavailable.status, 'unknown');
  assert.equal(publicUnavailable.lifecycleStage, 'unknown');
  assert.equal(publicUnavailable.ordersReadStatus, 'unavailable');
  assert.equal(publicUnavailable.statusMessage, 'Orders stav je unknown/stale');
  assert.equal(publicUnavailable.stale, true);

  const authLinks = controller.authAccountLinks();
  assert.match(authLinks.profileUrl, /\/profile\?client_id=aukro/);
  assert.match(authLinks.walletUrl, /\/wallet\?client_id=aukro/);
  assert.equal(authLinks.profileUrl.includes('email='), false);
  assert.equal(authLinks.walletUrl.includes('access_token='), false);

  const summary = controller.dashboardSummary([], hydrated);
  assert.equal(summary.ordersTotal, 3);
  assert.equal(summary.unforwardedOrders, 1);
  assert.equal(summary.ordersWithCentralStatus, 1);
  assert.equal(summary.staleOrders, 2);

  const adminController = createController({
    'central-order-1': {
      id: 'central-order-1',
      status: 'paid',
      lifecycleStage: 'paid_not_delivered',
      paymentStatus: 'paid',
      fulfillmentStatus: 'reserved',
      deliveryStatus: 'not_started',
    },
  }, [
    localForwardedOrder,
    localMissingIdOrder,
    localUnavailableOrder,
  ]);
  const publicPreview = controller.publicContentPreview({
    marketplace: 'aukro',
    content: { title: 'Manual Aukro title', plainText: 'Manual Aukro description' },
    propagation: { status: 'manual_review_required', staleManualFields: ['description'] },
    profile: { hasManualOverrides: true, manualOverrides: { description: true } },
    fields: [{ key: 'description', manualOverride: true, stale: true }],
    manualOverride: true,
    stale: true,
    requiresManualReview: true,
  });
  assert.equal(publicPreview.manualOverride, true);
  assert.equal(publicPreview.stale, true);
  assert.equal(publicPreview.requiresManualReview, true);
  assert.deepEqual(publicPreview.propagation.staleManualFields, ['description']);
  assert.equal(publicPreview.profile.hasManualOverrides, true);
  assert.equal(publicPreview.fields[0].key, 'description');

  const adminResponse = await adminController.adminServices({
    user: {
      email: 'ops@example.test',
      roles: ['aukro:admin'],
      permissions: [],
    },
  });
  assert.equal(adminResponse.orderStats.totalOrders, 3);
  assert.equal(adminResponse.orderStats.forwardedOrders, 2);
  assert.equal(adminResponse.orderStats.unforwardedOrders, 1);
  assert.equal(adminResponse.orderStats.ordersWithCentralStatus, 1);
  assert.equal(adminResponse.orderStats.staleOrders, 2);
  assert.equal(adminResponse.orderStats.byOrdersReadStatus.available, 1);
  assert.equal(adminResponse.orderStats.byOrdersReadStatus.missing_order_id, 1);
  assert.equal(adminResponse.orderStats.byOrdersReadStatus.unavailable, 1);
  assert.equal(adminResponse.orderStats.byLifecycleStage.paid_not_delivered, 1);
  assert.equal(adminResponse.orderStats.byDeliveryStatus.not_started, 1);
  assert.equal(adminResponse.orderStats.byDeliveryStatus.unknown, 2);
  assert.equal(JSON.stringify(adminResponse).includes('buyer@example.test'), false);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
