import { expect, test } from "bun:test";
import {
  fetchBrowserSameOrigin,
  type BrowserOutboundFetch,
} from "../../../src/http/browser-outbound.ts";

const READS = [
  "/api/alerts/active",
  "/api/alerts/all",
  "/api/alerts/stats",
  "/api/alerts/rules",
  "/api/geo/stats",
  "/api/geo/country/US",
  "/api/geo/city/Chicago",
  "/api/monitoring/summary",
  "/api/monitoring/environment/production?env=production",
  "/api/monitoring/ips/top?env=production&limit=10",
  "/api/monitoring/devices/top?env=production&limit=10",
  "/api/sockets/stats",
  "/api/sockets/dns/patterns",
  "/api/sockets/tcp/patterns",
  "/api/sockets/dns/suspicious",
  "/api/streams/stats",
  "/api/file-io/metrics",
  "/api/telemetry/alerts?env=development",
  "/api/telemetry/traces?limit=100",
  "/api/telemetry/traces?method=run&limit=100",
  "/api/telemetry/traces/stats",
  "/api/telemetry/traces/stats?method=run",
  "/api/telemetry/snapshots?limit=50",
  "/api/telemetry/config",
  "/api/upload/status/upload_1",
  "/api/flags/merged",
  "/api/build/configs",
  "/api/metrics",
  "/api/health",
  "/api/info",
  "/health",
] as const;

const WRITES = [
  "/api/alerts/resolve/1",
  "/api/auth/login",
  "/api/telemetry/alerts/resolve/1",
  "/api/telemetry/snapshots/take",
  "/api/telemetry/alerts/check",
  "/api/upload/initiate",
  "/api/upload/cancel/upload_1",
  "/api/build/trigger",
  "/api/logs",
] as const;

test("Geelark reviewed browser route catalog is executable hermetically", async () => {
  let effects = 0;
  const fetcher: BrowserOutboundFetch = async () => {
    effects++;
    return new Response("{}");
  };
  const options = { baseOrigin: "https://dashboard.example", fetcher };
  for (const route of READS) await fetchBrowserSameOrigin(route, {}, options);
  for (const route of WRITES) await fetchBrowserSameOrigin(route, { method: "POST" }, options);
  for (const route of ["/api/auth/validate", "/api/auth/logout"] as const) {
    await fetchBrowserSameOrigin(route, { method: "POST" }, { ...options, bearerToken: "token" });
  }
  await fetchBrowserSameOrigin(
    "/api/auth/audit?limit=100",
    {},
    { ...options, bearerToken: "token" },
  );
  expect(effects).toBe(READS.length + WRITES.length + 3);
});
