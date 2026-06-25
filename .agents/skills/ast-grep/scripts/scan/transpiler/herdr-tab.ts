import type { HealthReport } from "./endpoint-catalog.ts";
import type { NetworkBaselineDelta } from "./network-baseline.ts";
import type { NetworkLoopTick } from "./network-loop.ts";

export const NETWORK_LOOP_CHANGED_STATUS = "network.loop.changed";

export type NetworkLoopHerdrSummary = {
  ok: boolean;
  reason: string;
  network_unique?: number;
  endpoints?: number;
  health?: HealthReport["overall"];
  drift: boolean;
  delta?: NetworkBaselineDelta;
};

export function fingerprintNetworkLoopTick(tick: NetworkLoopTick, delta?: NetworkBaselineDelta): string {
  const payload: NetworkLoopHerdrSummary = {
    ok: !delta?.drift && tick.health?.overall !== "degraded" && tick.health?.overall !== "unreachable",
    reason: tick.reason,
    network_unique: tick.report?.network?.unique_total,
    endpoints: tick.report?.endpoints?.total,
    health: tick.health?.overall,
    drift: Boolean(delta?.drift),
    delta,
  };
  return JSON.stringify(payload);
}

export function formatNetworkHerdrTab(
  tick: NetworkLoopTick,
  delta?: NetworkBaselineDelta,
): string[] {
  const stamp = new Date(tick.at).toISOString();
  const lines = [`[${stamp}]`];

  if (tick.reason === "probe" && tick.health) {
    const ok = tick.health.probes.filter((p) => p.ok).length;
    lines.push(
      `network-health: ${tick.health.overall} (${ok}/${tick.health.probes.length} probes @ ${tick.health.base_url})`,
    );
    for (const p of tick.health.probes) {
      const path = p.url.replace(tick.health.base_url, "") || p.url;
      const status = p.error ? `error ${p.error}` : `HTTP ${p.status} ${p.latency_ms}ms`;
      lines.push(`  ${path}: ${status}`);
    }
    return lines;
  }

  const net = tick.report?.network;
  const ep = tick.report?.endpoints;
  if (net) {
    lines.push(
      `network-surface: ${net.unique_total} unique / ${net.total} raw`
      + (delta ? ` (${delta.network_unique_delta >= 0 ? "+" : ""}${delta.network_unique_delta} vs baseline)` : ""),
    );
  }
  if (ep) {
    lines.push(`api-catalog: ${ep.total} endpoints (${ep.health_count} health routes)`);
  }
  if (delta) {
    lines.push(
      `baseline-drift: endpoints +${delta.endpoints_added}/-${delta.endpoints_removed}`
      + ` routes +${delta.routes_added}/-${delta.routes_removed} health=${delta.health_status}`,
    );
    for (const route of delta.added_routes.slice(0, 5)) {
      lines.push(`  + ${route}`);
    }
    for (const route of delta.removed_routes.slice(0, 5)) {
      lines.push(`  - ${route}`);
    }
    if (delta.added_routes.length + delta.removed_routes.length > 10) {
      lines.push(`  … +${Math.max(0, delta.added_routes.length - 5) + Math.max(0, delta.removed_routes.length - 5)} more`);
    }
  }
  if (tick.health) {
    lines.push(`live-health: ${tick.health.overall}`);
  }
  if (tick.detail && tick.reason === "watch") {
    lines.push(`trigger: ${tick.detail}`);
  }
  return lines;
}

export function formatNetworkLoopJson(tick: NetworkLoopTick, delta?: NetworkBaselineDelta): string {
  return JSON.stringify({
    schemaVersion: 1,
    tool: "supply-chain-network",
    mode: "loop",
    at: new Date(tick.at).toISOString(),
    reason: tick.reason,
    detail: tick.detail,
    summary: {
      ok: !delta?.drift && tick.health?.overall !== "degraded" && tick.health?.overall !== "unreachable",
      network_unique: tick.report?.network?.unique_total,
      network_raw: tick.report?.network?.total,
      endpoints: tick.report?.endpoints?.total,
      health_routes: tick.report?.endpoints?.health_count,
      health: tick.health?.overall,
      drift: Boolean(delta?.drift),
    },
    delta,
    network: tick.report?.network
      ? {
          by_surface: tick.report.network.by_surface,
          hotspots: tick.report.network.hotspots?.slice(0, 10),
        }
      : undefined,
    health: tick.health,
    fingerprint: fingerprintNetworkLoopTick(tick, delta),
  });
}