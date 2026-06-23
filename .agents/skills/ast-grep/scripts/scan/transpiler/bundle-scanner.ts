import { readFile, stat } from "node:fs/promises";
import { cpus } from "node:os";
import { join, resolve } from "node:path";
import { analyzeFile, loaderForFile } from "./analyzer.ts";
import { loadIntegrityManifest } from "./integrity.ts";
import type { IntegrityManifest } from "./integrity.ts";
import { filterRulesById, loadRuleSet } from "./rule-engine.ts";
import type { RuleSet } from "./types.ts";
import { buildSummary } from "./reporter.ts";
import { resolveTargetDependencies } from "./dependency-resolver.ts";
import { loadThreatFeed } from "./semver-matcher.ts";
import type { ThreatFeed } from "./semver-matcher.ts";
import { Registry } from "./registry.ts";
import { dependenciesToPackages, scanDependencyViolations } from "./dep-scan.ts";
import { buildRemediationPlan } from "./remediation-plan.ts";
import { loadBundleProfile } from "./profile-loader.ts";
import {
  PlatformMatcher,
  resolveInstallProfile,
  resolveScanPlatform,
  PLATFORM_DOCS,
  type PlatformTarget,
} from "./platform-matcher.ts";
import { NetworkMatcher, NETWORK_DOCS } from "./network-matcher.ts";
import {
  discoverOpenApi,
  loadOpenApiCatalog,
  probeHealth,
  type EndpointCatalog,
  type HealthReport,
} from "./endpoint-catalog.ts";
import type {
  BundleScanReport,
  ScanProfile,
  ScanResult,
  TargetScanResult,
} from "./types.ts";
import type { ResolvedDependency } from "./dependency-resolver.ts";

export type RepoTarget = {
  id?: string;
  path?: string;
  zone?: string;
  name?: string;
  tags?: string[];
};

const DEFAULT_SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "coverage",
  "__snapshots__",
  "vendor",
  ".bun",
]);

export function filterTargets(targets: RepoTarget[], only: string, zone: string): RepoTarget[] {
  let rows = targets;
  if (zone) {
    const z = zone.toLowerCase();
    rows = rows.filter((t) => (t.zone ?? "").toLowerCase() === z);
  }
  if (only) {
    const q = only.toLowerCase();
    rows = rows.filter((t) => {
      const id = (t.id ?? "").toLowerCase();
      const name = (t.name ?? "").toLowerCase();
      const path = (t.path ?? "").toLowerCase();
      const zoneId = (t.zone ?? "").toLowerCase();
      const tags = (t.tags ?? []).join(" ").toLowerCase();
      return q === id || q === zoneId || id.includes(q) || name.includes(q)
        || path.includes(q) || tags.includes(q);
    });
  }
  return rows;
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

export async function collectScanFiles(
  repo: string,
  rel: string,
  profile: ScanProfile,
): Promise<string[]> {
  const base = resolve(repo, rel);
  if (!(await pathExists(base))) return [];

  const info = await stat(base);
  const skipDirs = new Set(DEFAULT_SKIP_DIRS);
  if (profile.include_node_modules) skipDirs.delete("node_modules");
  else skipDirs.add("node_modules");
  skipDirs.add("dist");
  skipDirs.add("build");
  if (!profile.include_node_modules) skipDirs.add(".next");

  if (!info.isDirectory()) {
    return loaderForFile(base) ? [base] : [];
  }

  const files: string[] = [];
  const glob = new Bun.Glob("**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}");
  for await (const relPath of glob.scan({ cwd: base, onlyFiles: true })) {
    const parts = relPath.split("/");
    if (parts.some((p) => skipDirs.has(p))) continue;
    if (relPath.endsWith(".min.js") || relPath.endsWith(".min.mjs")) continue;
    const full = join(base, relPath);
    if (loaderForFile(full)) files.push(full);
  }
  return files;
}

type ScanContext = {
  threatFeed: ThreatFeed | null;
  resolvedDeps: ResolvedDependency[];
};

async function scanFilesSequential(
  repo: string,
  paths: string[],
  rules: RuleSet,
  profile: ScanProfile,
  manifest: IntegrityManifest | null,
  ctx: ScanContext,
): Promise<{ files: TargetScanResult["files"]; findings: ScanResult[]; files_scanned: number }> {
  const files: TargetScanResult["files"] = [];
  const findings: ScanResult[] = [];
  for (const fp of paths) {
    const r = await analyzeFile({
      fullPath: fp,
      repo,
      rules,
      profile,
      manifest,
      threatFeed: ctx.threatFeed,
      resolvedDeps: ctx.resolvedDeps,
    });
    files.push(r);
    if (!r.skipped) findings.push(...r.findings);
  }
  return { files, findings, files_scanned: files.filter((f) => !f.skipped).length };
}

async function scanFilesParallel(
  repo: string,
  paths: string[],
  rules: RuleSet,
  profile: ScanProfile,
  manifest: IntegrityManifest | null,
  workers: number,
  ctx: ScanContext,
): Promise<{ files: TargetScanResult["files"]; findings: ScanResult[]; files_scanned: number }> {
  if (paths.length === 0) {
    return { files: [], findings: [], files_scanned: 0 };
  }

  const workerUrl = new URL("../../workers/transpiler-file.worker.ts", import.meta.url);
  const size = Math.max(1, Math.min(workers, paths.length));
  const results: TargetScanResult["files"] = new Array(paths.length);
  let cursor = 0;

  const jobPayload = {
    repo,
    profile,
    rules,
    manifest,
    threatFeed: ctx.threatFeed,
    resolvedDeps: ctx.resolvedDeps,
  };

  async function workerLoop(): Promise<void> {
    const worker = new Worker(workerUrl);
    try {
      while (true) {
        const index = cursor++;
        if (index >= paths.length) break;
        const result = await new Promise<TargetScanResult["files"][number]>((resolve, reject) => {
          const onMsg = (ev: MessageEvent) => {
            worker.removeEventListener("message", onMsg);
            worker.removeEventListener("error", onErr);
            resolve(ev.data);
          };
          const onErr = (ev: ErrorEvent) => {
            worker.removeEventListener("message", onMsg);
            worker.removeEventListener("error", onErr);
            reject(ev.error ?? new Error(String(ev.message)));
          };
          worker.addEventListener("message", onMsg);
          worker.addEventListener("error", onErr);
          worker.postMessage({ ...jobPayload, fullPath: paths[index] });
        });
        results[index] = result;
      }
    } finally {
      worker.terminate();
    }
  }

  await Promise.all(Array.from({ length: size }, () => workerLoop()));
  const findings = results.flatMap((r) => r?.findings ?? []);
  return {
    files: results,
    findings,
    files_scanned: results.filter((f) => f && !f.skipped).length,
  };
}

export async function scanTarget(options: {
  repo: string;
  target: RepoTarget;
  rules: RuleSet;
  profile: ScanProfile;
  manifest: IntegrityManifest | null;
  workers: number;
  parallel: boolean;
  threatFeed: ThreatFeed | null;
  skillRoot: string;
}): Promise<TargetScanResult> {
  const { repo, target, rules, profile, manifest, workers, parallel, threatFeed, skillRoot } = options;
  const rel = target.path ?? ".";
  const id = target.id ?? rel;
  const started = performance.now();
  const full = resolve(repo, rel);

  if (!(await pathExists(full))) {
    return {
      id,
      path: rel,
      skipped: true,
      files_scanned: 0,
      findings: [],
      files: [],
      scan_ms: 0,
    };
  }

  const resolved = await resolveTargetDependencies({
    repo,
    targetPath: rel,
    includeDev: profile.include_dev_dependencies,
  });
  const resolvedDeps = resolved.dependencies;

  const ctx: ScanContext = { threatFeed, resolvedDeps };
  const paths = await collectScanFiles(repo, rel, profile);
  const scanned = parallel && workers > 1
    ? await scanFilesParallel(repo, paths, rules, profile, manifest, workers, ctx)
    : await scanFilesSequential(repo, paths, rules, profile, manifest, ctx);

  const findings = [...scanned.findings];
  if (resolvedDeps.length) {
    const registry = new Registry(skillRoot);
    const { packages, sourceByPackage } = dependenciesToPackages(resolvedDeps);
    findings.push(
      ...(await scanDependencyViolations({
        repo,
        registry,
        packages,
        sourceByPackage,
        threatFeed: Boolean(threatFeed),
        minSeverity: profile.min_severity,
      })),
    );
  }

  return {
    id,
    path: rel,
    skipped: false,
    files_scanned: scanned.files_scanned,
    findings,
    files: scanned.files,
    scan_ms: Math.round(performance.now() - started),
  };
}

export type ScanOptions = {
  skillRoot: string;
  repo: string;
  profileName: string;
  zone?: string;
  only?: string;
  scanPath?: string;
  format?: "json" | "html" | "markdown" | "ansi" | "plaintext";
  parallel?: boolean;
  workers?: number;
  integrityManifest?: string;
  ruleIds?: string[];
  dryRun?: boolean;
  threatFeed?: boolean;
  platformTarget?: PlatformTarget;
  openapiPath?: string;
  healthUrl?: string;
};

export async function runBundleScan(opts: ScanOptions): Promise<BundleScanReport> {
  const mapPath = join(opts.skillRoot, "repo-map.json");
  const profile = await loadBundleProfile(opts.skillRoot, opts.profileName);

  let rules = await loadRuleSet(opts.skillRoot);
  if (opts.ruleIds?.length) rules = filterRulesById(rules, opts.ruleIds);

  const manifest = opts.integrityManifest
    ? await loadIntegrityManifest(resolve(opts.repo, opts.integrityManifest))
    : null;

  let targets: RepoTarget[] = [];
  if (opts.scanPath) {
    targets = [{ id: "path-scan", path: opts.scanPath }];
  } else {
    const map = JSON.parse(await readFile(mapPath, "utf8")) as { targets: RepoTarget[] };
    targets = filterTargets(map.targets ?? [], opts.only ?? "", opts.zone ?? "");
  }

  const workers = opts.workers ?? cpus().length ?? 4;
  const format = opts.format ?? "json";
  const threatFeedEnabled = opts.threatFeed ?? profile.threat_feed ?? false;
  let threatFeed: ThreatFeed | null = null;
  if (threatFeedEnabled) {
    threatFeed = await loadThreatFeed(opts.skillRoot);
  }

  if (opts.dryRun) {
    return {
      repo: opts.repo,
      profile: opts.profileName,
      layer: "4.5",
      description: profile.description,
      min_severity: profile.min_severity,
      format,
      elapsed_ms: 0,
      workers,
      integrity_enabled: Boolean(manifest),
      threat_feed_enabled: threatFeedEnabled,
      advisories_matched: 0,
      targets: targets.map((t) => ({
        id: t.id ?? t.path ?? "?",
        path: t.path ?? ".",
        skipped: false,
        files_scanned: 0,
        findings: [],
        files: [],
        scan_ms: 0,
      })),
      summary: { files: 0, findings: 0, by_severity: {} },
    };
  }

  const started = performance.now();
  const results: TargetScanResult[] = [];
  for (const target of targets) {
    results.push(
      await scanTarget({
        repo: opts.repo,
        target,
        rules,
        profile,
        manifest,
        workers,
        parallel: Boolean(opts.parallel),
        threatFeed,
        skillRoot: opts.skillRoot,
      }),
    );
  }

  const advisoriesMatched = results.reduce(
    (n, t) => n + t.findings.filter((f) => f.layer === "deps").length,
    0,
  );

  let allFindings = results.flatMap((t) => t.findings);

  const installSpec = profile.install_profile
    ? await resolveInstallProfile(opts.skillRoot, profile.install_profile)
    : null;
  const profileTarget = profile.platform_target
    ? {
        cpu: PlatformMatcher.normalizeCpu(profile.platform_target.cpu) ?? "x64",
        os: PlatformMatcher.normalizeOs(profile.platform_target.os) ?? "linux",
      }
    : undefined;
  const platformCtx = resolveScanPlatform({
    profileTarget: profileTarget as PlatformTarget | undefined,
    installProfile: installSpec,
    envTarget: PlatformMatcher.fromEnv(),
    cliTarget: opts.platformTarget ?? null,
  });

  const networkEnabled = profile.network_audit === true;
  if (networkEnabled) {
    allFindings = allFindings.map((f) => NetworkMatcher.tagFinding(f));
    for (const t of results) {
      t.findings = t.findings.map((f) => NetworkMatcher.tagFinding(f));
    }
  }
  const networkSummary = NetworkMatcher.summarize(allFindings, networkEnabled);

  let endpointCatalog: EndpointCatalog | undefined;
  let healthReport: HealthReport | undefined;
  const endpointMeta = profile.endpoint_meta === true || networkEnabled;
  if (endpointMeta) {
    const openapiPath = opts.openapiPath
      ?? (opts.scanPath ? await discoverOpenApi(opts.scanPath, opts.repo) : null);
    if (openapiPath) {
      try {
        endpointCatalog = await loadOpenApiCatalog(openapiPath);
      } catch {
        endpointCatalog = undefined;
      }
    }
    if (opts.healthUrl) {
      try {
        healthReport = await probeHealth(opts.healthUrl);
      } catch {
        healthReport = {
          probed: true,
          base_url: opts.healthUrl,
          overall: "unreachable",
          probes: [],
        };
      }
    }
  }

  const planEnabled = profile.remediation_plan !== false;
  const plan = planEnabled
    ? await buildRemediationPlan({ repo: opts.repo, findings: allFindings })
    : { actionable: 0, upgrades: 0, removals: 0, commands: [], items: [], totalFindings: allFindings.length };

  const partial: Omit<BundleScanReport, "summary"> = {
    repo: opts.repo,
    profile: opts.profileName,
    layer: "4.5",
    description: profile.description,
    min_severity: profile.min_severity,
    format,
    elapsed_ms: Math.round(performance.now() - started),
    workers: opts.parallel ? workers : 1,
    integrity_enabled: Boolean(manifest),
    threat_feed_enabled: threatFeedEnabled,
    advisories_matched: advisoriesMatched,
    targets: results,
    remediation: plan.actionable
      ? {
          actionable: plan.actionable,
          upgrades: plan.upgrades,
          removals: plan.removals,
          commands: plan.commands,
        }
      : undefined,
    platform: {
      host: {
        cpu: platformCtx.host.cpu,
        os: platformCtx.host.os,
        rawArch: platformCtx.host.rawArch,
        bunVersion: platformCtx.host.bunVersion,
      },
      target: platformCtx.target,
      crossTarget: platformCtx.crossTarget,
      installProfile: platformCtx.installProfile ?? profile.install_profile,
      installArgs: platformCtx.installArgs,
      docs: PLATFORM_DOCS,
    },
    network: {
      enabled: networkEnabled,
      total: networkSummary.total,
      unique_total: networkSummary.unique_total,
      by_surface: networkSummary.by_surface as Record<string, number>,
      by_rule: networkSummary.by_rule,
      by_file: networkSummary.by_file.map((r) => ({
        ...r,
        surfaces: r.surfaces as Record<string, number>,
      })),
      hotspots: networkSummary.hotspots.map((r) => ({
        ...r,
        surfaces: r.surfaces as Record<string, number>,
      })),
      docs: NETWORK_DOCS,
    },
    endpoints: endpointCatalog
      ? {
          source: endpointCatalog.source,
          title: endpointCatalog.title,
          version: endpointCatalog.version,
          total: endpointCatalog.total,
          health_count: endpointCatalog.health_count,
          by_tag: endpointCatalog.by_tag,
          by_kind: endpointCatalog.by_kind,
          health_routes: endpointCatalog.health_routes.map((r) => ({
            path: r.path,
            method: r.method,
            summary: r.summary,
          })),
          route_fingerprints: endpointCatalog.entries.map(
            (r) => `${r.method} ${r.path}`,
          ),
        }
      : undefined,
    health: healthReport
      ? {
          probed: healthReport.probed,
          base_url: healthReport.base_url,
          overall: healthReport.overall,
          probes: healthReport.probes.map((p) => ({
            url: p.url,
            ok: p.ok,
            status: p.status,
            latency_ms: p.latency_ms,
            error: p.error,
          })),
        }
      : undefined,
  };

  return { ...partial, summary: buildSummary(partial) };
}