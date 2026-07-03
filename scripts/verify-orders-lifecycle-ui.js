#!/usr/bin/env node
const fs = require("fs");

const requiredStages = [
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
const source = fs.readFileSync("services/aukro-service/src/ui/ui.controller.ts", "utf8");
const spec = fs.readFileSync("services/aukro-service/src/ui/ui.controller.spec.ts", "utf8");
const missing = requiredStages.filter((stage) => !source.includes(stage));
const hasPolling = source.includes("dashboardPollMs: 30000") && source.includes("visibilitychange");
const hasManualRefresh = source.includes("refreshOrders") && source.includes("Obnovit Orders");
const hasSpecCoverage = spec.includes("requiredLifecycleStages") && requiredStages.every((stage) => spec.includes(stage));
if (missing.length || !hasPolling || !hasManualRefresh || !hasSpecCoverage) {
  console.error(JSON.stringify({ success: false, missingLifecycleStages: missing, polling: hasPolling, manualRefresh: hasManualRefresh, specCoverage: hasSpecCoverage }));
  process.exit(1);
}
console.log(JSON.stringify({ success: true, lifecycleStagesCovered: requiredStages.length, refreshCoverage: "polling plus manual Orders refresh button", specCoverage: true }));
