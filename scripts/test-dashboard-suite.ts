#!/usr/bin/env bun
import {
  applyDashboardTestEnv,
  getDashboardTestConfig,
  withDashboardServer,
} from "./lib/dashboard-test-server";
import { runDashboardMiniChecks } from "./test-dashboard-mini";
import { runDashboardEndpointChecks } from "./test-dashboard-endpoints";
import { runDashboardWebsocketChecks } from "./test-dashboard-websocket";

async function run(): Promise<number> {
  const miniCode = await runDashboardMiniChecks();
  if (miniCode !== 0) return miniCode;

  const endpointCode = await runDashboardEndpointChecks();
  if (endpointCode !== 0) return endpointCode;

  const websocketCode = await runDashboardWebsocketChecks();
  if (websocketCode !== 0) return websocketCode;

  console.log("[PASS] dashboard-suite :: mini + endpoints + websocket green");
  return 0;
}

const config = getDashboardTestConfig();
applyDashboardTestEnv(config);
const code = await withDashboardServer(config.host, config.port, run);
process.exit(code);
