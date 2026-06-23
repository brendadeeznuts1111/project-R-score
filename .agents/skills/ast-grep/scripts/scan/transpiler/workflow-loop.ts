import { stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { formatNetworkHerdrTab } from "./herdr-tab.ts";
import {
  defaultBaselinePath,
  loadNetworkBaseline,
  writeNetworkBaseline,
  type NetworkBaseline,
  type NetworkBaselineDelta,
} from "./network-baseline.ts";
import { runNetworkAuditOnce } from "./network-loop.ts";
import { Service } from "./service.ts";
import { meetsSeverity, normalizeSeverity } from "./rule-engine.ts";
import type { ScanRemediation, ScanResult, Severity } from "./types.ts";
import {
  applyWorkflowFixes,
  findSafePackageVersion,
  formatWorkflowHerdr,
  generateWorkflowReport,
  sendWorkflowAlert,
} from "./workflow-effects/actions.ts";
import {
  legacyEffectsToConfigs,
  mergeEffectConfigs,
  defaultWorkflowReportPath,
} from "./workflow-effects/config.ts";
import type { EffectConfig } from "./workflow-effects/plugin.ts";
import { EffectRegistry } from "./workflow-effects/registry.ts";
import {
  captureBunRuntime,
  defaultWorkflowRuntimeSeedPath,
  detectBunDrift,
  loadTlsOptions,
  loadWorkflowRuntimeSeed,
  writeWorkflowRuntimeSeed,
  type BunDriftInfo,
  type BunRuntimeInfo,
  type WorkflowRuntimeSeed,
  type WorkflowTlsOptions,
  type WorkflowTlsPaths,
} from "./workflow-effects/runtime.ts";

export type WorkflowIssue = {
  severity: Severity;
  message: string;
  ruleId?: string;
  package?: string;
  remediation?: ScanRemediation;
};

export type WorkflowScannerResult = {
  scannerId: string;
  status: "ok" | "warn" | "fail";
  issues: WorkflowIssue[];
  elapsedMs: number;
};

export type WorkflowDrift = {
  network?: NetworkBaselineDelta;
  bun?: BunDriftInfo;
  hasDrift: boolean;
};

/** @deprecated Use EffectConfig map via effectsConfig */
export type WorkflowEffects = {
  log?: boolean;
  alert?: string;
  fix?: boolean;
  report?: boolean | string;
};

export type WorkflowEffectDeps = {
  fetch?: typeof globalThis.fetch;
  spawn?: typeof Bun.spawn;
  write?: (path: string, data: string) => Promise<void>;
  findSafeVersion?: (pkg: string, repo: string) => Promise<string | null>;
  tls?: WorkflowTlsOptions;
};

export type WorkflowDomain = {
  id: string;
  scanPath?: string;
};

export type WorkflowOptions = {
  skillRoot: string;
  repo: string;
  domain: WorkflowDomain;
  scanners?: string[];
  intervalMs?: number;
  watch?: boolean;
  dryRun?: boolean;
  output?: "table" | "json" | "herdr";
  failOnSeverity?: Severity;
  failOnIssue?: boolean;
  failOnDrift?: boolean;
  seedPath?: string;
  seedWritePath?: string;
  profileName?: string;
  /** Legacy effect flags (--fix, --alert-url, etc.) */
  effects?: WorkflowEffects;
  /** Plugin registry configs (--effect alert.url=...) */
  effectsConfig?: Record<string, EffectConfig>;
  /** Directory of custom *.ts effect plugins */
  effectsDir?: string;
  effectDeps?: WorkflowEffectDeps;
  effectRegistry?: EffectRegistry;
  /** TLS material for outbound webhook fetches (alert effect). */
  tls?: WorkflowTlsOptions;
  tlsPaths?: WorkflowTlsPaths;
  /** Include Bun runtime metadata in effects (default true). */
  includeBunVersion?: boolean;
  /** Path to workflow-runtime.json bun baseline seed. */
  bunSeedPath?: string;
  /** Write bun runtime seed after each cycle. */
  bunSeedWritePath?: string;
  signal?: AbortSignal;
  onCycle?: (results: WorkflowScannerResult[], drift: WorkflowDrift | null) => void | Promise<void>;
};

const SEVERITY_RANK: Record<string, number> = {
  info: 0,
  low: 1,
  warn: 2,
  medium: 3,
  error: 4,
  high: 5,
  critical: 6,
};

function findingToIssue(f: ScanResult): WorkflowIssue {
  return {
    severity: f.severity,
    message: f.message,
    ruleId: f.ruleId,
    package: f.file,
    remediation: f.remediation,
  };
}

function worstStatus(issues: WorkflowIssue[]): WorkflowScannerResult["status"] {
  if (!issues.length) return "ok";
  const worst = issues.reduce((max, i) => {
    const rank = SEVERITY_RANK[normalizeSeverity(i.severity)] ?? 0;
    return rank > max ? rank : max;
  }, 0);
  if (worst >= SEVERITY_RANK.error) return "fail";
  if (worst >= SEVERITY_RANK.warn) return "warn";
  return "ok";
}

export function computeWorkflowDrift(
  results: WorkflowScannerResult[],
  seed: NetworkBaseline | null,
  networkBaseline?: NetworkBaseline,
  networkDelta?: NetworkBaselineDelta,
  bunDrift?: BunDriftInfo | null,
): WorkflowDrift | null {
  const network = networkDelta ?? undefined;
  const bun = bunDrift ?? undefined;
  const scannerDrift = results.some((r) => r.status === "fail");
  const hasDrift = Boolean(network?.drift) || Boolean(bun?.drift) || scannerDrift;
  if (!seed && !networkDelta && !bun) return hasDrift ? { hasDrift } : null;
  return { network, bun, hasDrift };
}

export {
  sendWorkflowAlert,
  findSafePackageVersion,
  applyWorkflowFixes,
  generateWorkflowReport,
  formatWorkflowHerdr,
};

export class WorkflowLoop {
  private seedState: NetworkBaseline | null = null;
  private bunRuntimeSeed: WorkflowRuntimeSeed | null = null;
  private tlsOptions: WorkflowTlsOptions | undefined;
  private readonly bunRuntime: BunRuntimeInfo;
  private readonly scanners: string[];
  private readonly effectRegistry: EffectRegistry;
  private customEffectsLoaded = false;

  constructor(
    private readonly options: WorkflowOptions,
  ) {
    this.scanners = options.scanners ?? ["semver", "network"];
    this.bunRuntime = captureBunRuntime();
    this.effectRegistry = options.effectRegistry ?? new EffectRegistry();
    this.tlsOptions = options.tls;
    const configs = mergeEffectConfigs(
      legacyEffectsToConfigs(options.effects, options.skillRoot, options.domain.id),
      options.effectsConfig,
    );
    this.effectRegistry.configureAll(configs);
  }

  async initTls(): Promise<void> {
    if (this.tlsOptions) return;
    if (this.options.tlsPaths) {
      this.tlsOptions = await loadTlsOptions(this.options.tlsPaths);
    }
  }

  get registry(): EffectRegistry {
    return this.effectRegistry;
  }

  async loadCustomEffects(dir?: string): Promise<number> {
    const target = dir ?? this.options.effectsDir;
    if (!target || this.customEffectsLoaded) return 0;
    const candidates = [...new Set([
      resolve(target),
      resolve(this.options.repo, target),
      resolve(this.options.skillRoot, target),
    ])];
    let abs = resolve(this.options.repo, target);
    for (const c of candidates) {
      try {
        if ((await stat(c)).isDirectory()) {
          abs = c;
          break;
        }
      } catch {
        // try next candidate
      }
    }
    const loaded = await this.effectRegistry.loadFromDirectory(abs);
    this.customEffectsLoaded = true;
    return loaded;
  }

  async loadSeed(): Promise<void> {
    const seedPath = this.options.seedPath
      ?? defaultBaselinePath(this.options.skillRoot, this.options.domain.id);
    try {
      this.seedState = await loadNetworkBaseline(seedPath);
    } catch {
      this.seedState = null;
    }

    const bunSeedPath = this.options.bunSeedPath
      ?? defaultWorkflowRuntimeSeedPath(this.options.skillRoot, this.options.domain.id);
    this.bunRuntimeSeed = await loadWorkflowRuntimeSeed(bunSeedPath);
  }

  getBunDrift(): BunDriftInfo {
    return detectBunDrift(this.bunRuntime, this.bunRuntimeSeed);
  }

  async runScanners(): Promise<{
    results: WorkflowScannerResult[];
    networkBaseline?: NetworkBaseline;
    networkDelta?: NetworkBaselineDelta;
    networkHerdr?: string[];
  }> {
    const minSeverity = this.options.failOnSeverity ?? "warn";
    const results: WorkflowScannerResult[] = [];
    let networkBaseline: NetworkBaseline | undefined;
    let networkDelta: NetworkBaselineDelta | undefined;
    let networkHerdr: string[] | undefined;

    if (this.scanners.includes("semver") || this.scanners.includes("packages")) {
      const started = performance.now();
      const service = new Service({
        skillRoot: this.options.skillRoot,
        repo: this.options.repo,
        targetPath: this.options.domain.scanPath ?? ".",
        fix: false,
        threatFeed: true,
      });
      const { findings } = await service.scanPackages();
      const issues = findings
        .filter((f) => meetsSeverity(f.severity, minSeverity))
        .map(findingToIssue);
      results.push({
        scannerId: "semver",
        status: worstStatus(issues),
        issues,
        elapsedMs: Math.round(performance.now() - started),
      });
    }

    if (this.scanners.includes("network") && this.options.domain.scanPath) {
      const started = performance.now();
      const audit = await runNetworkAuditOnce({
        skillRoot: this.options.skillRoot,
        repo: this.options.repo,
        scanPath: this.options.domain.scanPath,
        profileName: this.options.profileName ?? "supply-chain-network-dist",
        domain: this.options.domain.id,
        baseline: this.seedState ?? undefined,
        verbose: false,
      });
      networkBaseline = audit.tick.baseline;
      networkDelta = audit.tick.delta;
      networkHerdr = formatNetworkHerdrTab(audit.tick, audit.tick.delta);
      const issues: WorkflowIssue[] = [];
      if (networkDelta?.drift) {
        issues.push({
          severity: "warn",
          message: `network drift: routes +${networkDelta.routes_added}/-${networkDelta.routes_removed}`,
        });
      }
      if (audit.tick.health?.overall === "degraded" || audit.tick.health?.overall === "unreachable") {
        issues.push({
          severity: "error",
          message: `health ${audit.tick.health.overall}`,
        });
      }
      results.push({
        scannerId: "network",
        status: worstStatus(issues),
        issues,
        elapsedMs: Math.round(performance.now() - started),
      });
    }

    return { results, networkBaseline, networkDelta, networkHerdr };
  }

  outputResults(
    results: WorkflowScannerResult[],
    drift: WorkflowDrift | null,
    extras?: { networkHerdr?: string[] },
  ): void {
    const output = this.options.output ?? "table";
    if (output === "json") {
      console.log(JSON.stringify({ results, drift }, null, 2));
      return;
    }
    if (output === "herdr" && extras?.networkHerdr) {
      for (const line of extras.networkHerdr) {
        process.stderr.write(`${line}\n`);
      }
      return;
    }
    for (const r of results) {
      process.stderr.write(
        `[${this.options.domain.id}] ${r.scannerId} status=${r.status}`
        + ` issues=${r.issues.length} elapsed=${r.elapsedMs}ms\n`,
      );
    }
    if (drift?.hasDrift) {
      process.stderr.write(`[${this.options.domain.id}] drift detected\n`);
    }
  }

  shouldFail(results: WorkflowScannerResult[], drift: WorkflowDrift | null): boolean {
    if (this.options.failOnDrift && drift?.hasDrift) return true;
    if (!this.options.failOnIssue) return false;
    const min = this.options.failOnSeverity ?? "error";
    return results.some((r) =>
      r.issues.some((i) => meetsSeverity(i.severity, min)),
    );
  }

  async writeSeed(baseline: NetworkBaseline): Promise<string> {
    const path = this.options.seedWritePath
      ?? defaultBaselinePath(this.options.skillRoot, this.options.domain.id);
    await writeNetworkBaseline(path, baseline);
    this.seedState = baseline;
    return path;
  }

  private async dispatchEffects(
    results: WorkflowScannerResult[],
    drift: WorkflowDrift | null,
    blocking: boolean,
  ): Promise<void> {
    await this.initTls();
    const run = this.effectRegistry.runAll({
      domain: this.options.domain.id,
      skillRoot: this.options.skillRoot,
      repo: this.options.repo,
      results,
      drift,
      seedState: this.seedState,
      dryRun: this.options.dryRun,
      failOnSeverity: this.options.failOnSeverity,
      deps: this.options.effectDeps ?? {},
      bun: this.bunRuntime,
      bunDrift: drift?.bun ?? this.getBunDrift(),
      tls: this.tlsOptions,
      includeBunVersion: this.options.includeBunVersion !== false,
    });

    if (blocking) {
      await run;
      return;
    }
    void run.catch((err) => {
      console.error(`[${this.options.domain.id}] effects failed:`, err);
    });
  }

  async runOnce(): Promise<{ results: WorkflowScannerResult[]; drift: WorkflowDrift | null; failed: boolean }> {
    const { results, networkBaseline, networkDelta, networkHerdr } = await this.runScanners();
    const bunDrift = this.getBunDrift();
    const drift = computeWorkflowDrift(results, this.seedState, networkBaseline, networkDelta, bunDrift);
    this.outputResults(results, drift, { networkHerdr });
    await this.options.onCycle?.(results, drift);

    if (this.options.seedWritePath && networkBaseline) {
      await this.writeSeed(networkBaseline);
    }
    if (this.options.bunSeedWritePath) {
      const path = await writeWorkflowRuntimeSeed(
        this.options.bunSeedWritePath,
        this.bunRuntime,
      );
      this.bunRuntimeSeed = await loadWorkflowRuntimeSeed(path);
    }

    await this.dispatchEffects(results, drift, !this.options.watch);
    return { results, drift, failed: this.shouldFail(results, drift) };
  }

  async runAll(): Promise<void> {
    await this.loadSeed();
    await this.initTls();
    await this.loadCustomEffects();

    if (!this.options.watch) {
      const { failed } = await this.runOnce();
      if (failed) process.exit(1);
      return;
    }

    const interval = this.options.intervalMs ?? 60_000;
    const ac = new AbortController();
    const signal = this.options.signal ?? ac.signal;
    process.on("SIGINT", () => ac.abort());

    process.stderr.write(
      `[${this.options.domain.id}] workflow watch interval=${interval}ms scanners=${this.scanners.join(",")}\n`,
    );

    const tick = async () => {
      if (signal.aborted) return;
      const { failed } = await this.runOnce();
      if (failed && this.options.failOnIssue) process.exitCode = 1;
    };

    await tick();
    const timer = setInterval(() => void tick(), interval);
    signal.addEventListener("abort", () => clearInterval(timer), { once: true });

    await new Promise<void>((resolvePromise) => {
      if (signal.aborted) {
        clearInterval(timer);
        resolvePromise();
        return;
      }
      signal.addEventListener("abort", () => {
        clearInterval(timer);
        resolvePromise();
      }, { once: true });
    });
  }
}

export { defaultWorkflowReportPath };