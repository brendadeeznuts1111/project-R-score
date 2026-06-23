import { readFile, stat } from "node:fs/promises";
import { cpus } from "node:os";
import { join, resolve } from "node:path";
import { analyzeFile, loaderForFile } from "./analyzer.ts";
import { loadIntegrityManifest } from "./integrity.ts";
import type { IntegrityManifest } from "./integrity.ts";
import { filterRulesById, loadRuleSet } from "./rule-engine.ts";
import type { RuleSet } from "./types.ts";
import { buildSummary } from "./reporter.ts";
import type {
  BundleScanReport,
  ScanProfile,
  ScanResult,
  TargetScanResult,
} from "./types.ts";

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

async function scanFilesSequential(
  repo: string,
  paths: string[],
  rules: RuleSet,
  profile: ScanProfile,
  manifest: IntegrityManifest | null,
): Promise<{ files: TargetScanResult["files"]; findings: ScanResult[]; files_scanned: number }> {
  const files: TargetScanResult["files"] = [];
  const findings: ScanResult[] = [];
  for (const fp of paths) {
    const r = await analyzeFile({ fullPath: fp, repo, rules, profile, manifest });
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
}): Promise<TargetScanResult> {
  const { repo, target, rules, profile, manifest, workers, parallel } = options;
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

  const paths = await collectScanFiles(repo, rel, profile);
  const scanned = parallel && workers > 1
    ? await scanFilesParallel(repo, paths, rules, profile, manifest, workers)
    : await scanFilesSequential(repo, paths, rules, profile, manifest);

  return {
    id,
    path: rel,
    skipped: false,
    files_scanned: scanned.files_scanned,
    findings: scanned.findings,
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
  format?: "json" | "html" | "markdown";
  parallel?: boolean;
  workers?: number;
  integrityManifest?: string;
  ruleIds?: string[];
  dryRun?: boolean;
};

export async function runBundleScan(opts: ScanOptions): Promise<BundleScanReport> {
  const profilesPath = join(opts.skillRoot, "bundle-threat-profiles.json");
  const mapPath = join(opts.skillRoot, "repo-map.json");
  const profilesDoc = JSON.parse(await readFile(profilesPath, "utf8")) as {
    profiles: Record<string, ScanProfile>;
  };
  const profile = profilesDoc.profiles[opts.profileName];
  if (!profile) throw new Error(`unknown profile '${opts.profileName}'`);

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
      }),
    );
  }

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
    targets: results,
  };

  return { ...partial, summary: buildSummary(partial) };
}