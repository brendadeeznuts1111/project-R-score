import { runBundleScan } from "./bundle-scanner.ts";
import { probeHealth, type HealthReport } from "./endpoint-catalog.ts";
import {
  auditResultFromTick,
  collectEndpointDetails,
  type NetworkAuditResult,
} from "./network-audit-result.ts";
import {
  captureBaselineFromReport,
  diffAgainstBaseline,
  type NetworkBaseline,
  type NetworkBaselineDelta,
} from "./network-baseline.ts";
import type { BundleScanReport } from "./types.ts";
import { createInflightState, runInflight, waitUntilAborted } from "./native-loop.ts";
import type { NetworkLoopReason } from "./network-types.ts";
import { runWatchLoop } from "./watch.ts";

export type { NetworkAuditResult } from "./network-audit-result.ts";
export type { NetworkLoopReason } from "./network-types.ts";

export type NetworkLoopTick = {
  reason: NetworkLoopReason;
  detail?: string;
  report?: BundleScanReport;
  health?: HealthReport;
  baseline?: NetworkBaseline;
  delta?: NetworkBaselineDelta;
  at: number;
};

export type NetworkLoopOptions = {
  skillRoot: string;
  repo: string;
  scanPath: string;
  profileName: string;
  domain?: string;
  openapiPath?: string;
  healthUrl?: string;
  watch?: boolean;
  watchIntervalMs?: number;
  probeIntervalMs?: number;
  baseline?: NetworkBaseline;
  verbose?: boolean;
  onTick: (tick: NetworkLoopTick) => void | Promise<void>;
  signal?: AbortSignal;
};

export function formatLoopStatus(tick: NetworkLoopTick): string {
  const head = tick.detail && tick.reason === "watch"
    ? `[loop] watch (${tick.detail})`
    : `[loop] ${tick.reason}`;
  const parts = [head];
  if (tick.delta) {
    parts.push(
      `Δ endpoints +${tick.delta.endpoints_added}/-${tick.delta.endpoints_removed}`
      + ` Δ routes +${tick.delta.routes_added}/-${tick.delta.routes_removed}`
      + ` health=${tick.delta.health_status}`,
    );
  }
  if (tick.report?.network) {
    parts.push(`network=${tick.report.network.unique_total}unique/${tick.report.network.total}raw`);
  }
  if (tick.report?.endpoints) {
    parts.push(`endpoints=${tick.report.endpoints.total}`);
    parts.push(`health_routes=${tick.report.endpoints.health_count}`);
  }
  if (tick.health) {
    parts.push(`health=${tick.health.overall}`);
    const ok = tick.health.probes.filter((p) => p.ok).length;
    parts.push(`probes=${ok}/${tick.health.probes.length}`);
    const latency = tick.health.probes.find((p) => p.ok)?.latency_ms;
    if (latency !== undefined) parts.push(`latency=${latency}ms`);
  }
  return parts.join(" ");
}

async function runFullAudit(opts: NetworkLoopOptions): Promise<BundleScanReport> {
  return runBundleScan({
    skillRoot: opts.skillRoot,
    repo: opts.repo,
    profileName: opts.profileName,
    scanPath: opts.scanPath,
    format: "json",
    openapiPath: opts.openapiPath,
    healthUrl: opts.healthUrl,
  });
}

function healthFromReport(report: BundleScanReport): HealthReport | undefined {
  if (!report.health?.probed) return undefined;
  return {
    probed: report.health.probed,
    base_url: report.health.base_url,
    overall: report.health.overall,
    probes: report.health.probes.map((p) => ({ ...p })),
  };
}

function buildTick(
  opts: NetworkLoopOptions,
  reason: NetworkLoopReason,
  report: BundleScanReport,
  detail?: string,
): NetworkLoopTick {
  const health = healthFromReport(report);
  const current = captureBaselineFromReport(
    report,
    opts.domain ?? opts.profileName,
    opts.scanPath,
  );
  const delta = opts.baseline
    ? diffAgainstBaseline(current, opts.baseline, health)
    : undefined;
  return {
    reason,
    detail,
    report,
    health,
    baseline: current,
    delta,
    at: Date.now(),
  };
}

/** Run a single full audit (no loop, probes, or watch). */
export async function runNetworkAuditOnce(
  opts: Omit<NetworkLoopOptions, "onTick" | "signal" | "watch" | "watchIntervalMs" | "probeIntervalMs">,
): Promise<NetworkAuditResult> {
  const report = await runFullAudit(opts as NetworkLoopOptions);
  const tick = buildTick(opts as NetworkLoopOptions, "initial", report);
  const details = opts.verbose ? await collectEndpointDetails(report) : undefined;
  return auditResultFromTick(tick, details);
}

export async function runNetworkAuditLoop(opts: NetworkLoopOptions): Promise<void> {
  const signal = opts.signal;
  const probeInterval = opts.probeIntervalMs ?? 8000;
  const watchInterval = opts.watchIntervalMs ?? 750;
  const watchEnabled = opts.watch === true;
  const healthUrl = opts.healthUrl;
  const fullSlot = createInflightState();

  let probeTimer: ReturnType<typeof setInterval> | null = null;
  let lastHealthOverall: HealthReport["overall"] | undefined;

  const cleanup = () => {
    if (probeTimer) clearInterval(probeTimer);
    probeTimer = null;
  };

  signal?.addEventListener("abort", cleanup, { once: true });

  const emitFull = async (reason: NetworkLoopReason, detail?: string) => {
    await runInflight(async () => {
      const report = await runFullAudit(opts);
      const tick = buildTick(opts, reason, report, detail);
      lastHealthOverall = tick.health?.overall;
      await opts.onTick(tick);
    }, fullSlot);
  };

  const emitProbe = async () => {
    if (!healthUrl || signal?.aborted) return;
    const health = await probeHealth(healthUrl);
    const health_status = lastHealthOverall && lastHealthOverall !== health.overall
      ? "changed" as const
      : health.overall === "healthy"
        ? "stable" as const
        : "degraded" as const;
    await opts.onTick({
      reason: "probe",
      health,
      delta: opts.baseline
        ? {
            endpoints_added: 0,
            endpoints_removed: 0,
            routes_added: 0,
            routes_removed: 0,
            network_unique_delta: 0,
            health_status,
            added_routes: [],
            removed_routes: [],
            drift: false,
          }
        : undefined,
      at: Date.now(),
    });
    lastHealthOverall = health.overall;
  };

  if (healthUrl) {
    probeTimer = setInterval(() => void emitProbe(), probeInterval);
  }

  if (watchEnabled) {
    await runWatchLoop({
      repo: opts.repo,
      watchPath: opts.scanPath,
      intervalMs: watchInterval,
      includeLockfiles: false,
      onEvent: async (detail) => {
        if (detail === "initial") {
          await emitFull("initial");
          return;
        }
        await emitFull("watch", detail);
      },
      signal,
    });
  } else {
    await emitFull("initial");
    const keepAlive = healthUrl || signal;
    if (keepAlive) {
      const waitSignal = signal ?? new AbortController().signal;
      try {
        await waitUntilAborted(waitSignal);
      } catch {
        // AbortError from Bun.sleep — expected on SIGINT
      }
    }
  }

  cleanup();
}