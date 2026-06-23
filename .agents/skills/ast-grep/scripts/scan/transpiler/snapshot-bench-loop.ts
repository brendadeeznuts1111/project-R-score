import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { computeBenchRating } from "./bench-loop.ts";
import { validateNetworkGroundTruth } from "./network-ground-truth-validator.ts";
import { runNetworkAuditOnce } from "./network-loop.ts";
import {
  captureNetworkSectionFromReport,
  defaultSnapshotPath,
} from "./snapshot-network.ts";
import {
  validateSnapshotFull,
  type DoctorSnapshotV2,
} from "./snapshot.ts";

export type SnapshotBenchPhaseTiming = {
  loadMs: number;
  networkMs?: number;
  validateMs: number;
  groundTruthMs?: number;
};

export type SnapshotBenchRunResult = {
  iteration: number;
  elapsedMs: number;
  ok: boolean;
  snapshotOk: boolean;
  groundTruthOk?: boolean;
  networkDrift?: boolean;
  sections: string[];
  detail?: string;
  phases?: SnapshotBenchPhaseTiming;
};

export type SnapshotBenchPhaseSummary = {
  loadP50Ms: number;
  networkP50Ms?: number;
  validateP50Ms: number;
  groundTruthP50Ms?: number;
};

export type SnapshotBenchSummary = {
  schemaVersion: number;
  tool: string;
  domain: string;
  iterations: number;
  runs: SnapshotBenchRunResult[];
  passRate: number;
  p50Ms: number;
  p95Ms: number;
  rating: number;
  grade: string;
  targetMs?: number;
  snapshotPath: string;
  liveNetwork: boolean;
  groundTruth: boolean;
  phaseP50?: SnapshotBenchPhaseSummary;
};

export type SnapshotBenchOptions = {
  skillRoot: string;
  repo: string;
  domain?: string;
  snapshotPath?: string;
  scanPath?: string;
  profileName?: string;
  iterations?: number;
  targetMs?: number;
  groundTruth?: boolean;
  failOnNetworkDrift?: boolean;
  onRun?: (result: SnapshotBenchRunResult) => void | Promise<void>;
  signal?: AbortSignal;
};

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx] ?? 0;
}

export function summarizeSnapshotBenchRuns(
  domain: string,
  runs: SnapshotBenchRunResult[],
  meta: {
    snapshotPath: string;
    liveNetwork: boolean;
    groundTruth: boolean;
    targetMs?: number;
  },
): SnapshotBenchSummary {
  const iterations = runs.length;
  const okRuns = runs.filter((r) => r.ok).length;
  const passRate = iterations ? okRuns / iterations : 0;
  const elapsed = [...runs.map((r) => r.elapsedMs)].sort((a, b) => a - b);
  const { rating, grade } = computeBenchRating(passRate, percentile(elapsed, 50), meta.targetMs);
  const phaseRuns = runs.filter((r) => r.phases);
  const phaseP50 = phaseRuns.length
    ? {
        loadP50Ms: percentile(phaseRuns.map((r) => r.phases!.loadMs).sort((a, b) => a - b), 50),
        networkP50Ms: phaseRuns.some((r) => r.phases?.networkMs !== undefined)
          ? percentile(
              phaseRuns.map((r) => r.phases!.networkMs ?? 0).sort((a, b) => a - b),
              50,
            )
          : undefined,
        validateP50Ms: percentile(phaseRuns.map((r) => r.phases!.validateMs).sort((a, b) => a - b), 50),
        groundTruthP50Ms: phaseRuns.some((r) => r.phases?.groundTruthMs !== undefined)
          ? percentile(
              phaseRuns.map((r) => r.phases!.groundTruthMs ?? 0).sort((a, b) => a - b),
              50,
            )
          : undefined,
      }
    : undefined;

  return {
    schemaVersion: 1,
    tool: "skill-loop-bench-snapshot",
    domain,
    iterations,
    runs,
    passRate,
    p50Ms: percentile(elapsed, 50),
    p95Ms: percentile(elapsed, 95),
    rating,
    grade,
    targetMs: meta.targetMs,
    snapshotPath: meta.snapshotPath,
    liveNetwork: meta.liveNetwork,
    groundTruth: meta.groundTruth,
    phaseP50,
  };
}

async function runSingleSnapshotBench(
  opts: SnapshotBenchOptions,
  iteration: number,
  domain: string,
  snapshotPath: string,
): Promise<SnapshotBenchRunResult> {
  const started = performance.now();
  const phases: SnapshotBenchPhaseTiming = { loadMs: 0, validateMs: 0 };
  try {
    const loadStart = performance.now();
    const raw = await readFile(snapshotPath, "utf8");
    const snapshot = JSON.parse(raw) as DoctorSnapshotV2;
    phases.loadMs = Math.round(performance.now() - loadStart);

    let currentNetwork;
    let liveAudit;
    if (opts.scanPath) {
      const netStart = performance.now();
      liveAudit = await runNetworkAuditOnce({
        skillRoot: opts.skillRoot,
        repo: opts.repo,
        scanPath: opts.scanPath,
        profileName: opts.profileName ?? "supply-chain-network-dist",
        domain,
        verbose: false,
      });
      if (liveAudit.tick.report) {
        currentNetwork = captureNetworkSectionFromReport(
          liveAudit.tick.report,
          domain,
          opts.scanPath,
        );
      }
      phases.networkMs = Math.round(performance.now() - netStart);
    }

    const validateStart = performance.now();
    const validation = await validateSnapshotFull({
      skillRoot: opts.skillRoot,
      snapshot,
      currentNetwork,
      failOnNetworkDrift: opts.failOnNetworkDrift === true,
    });
    phases.validateMs = Math.round(performance.now() - validateStart);

    let groundTruthOk: boolean | undefined;
    if (opts.groundTruth === true) {
      const gtStart = performance.now();
      const gt = await validateNetworkGroundTruth({
        skillRoot: opts.skillRoot,
        repo: opts.repo,
        ids: [
          "sports-terminal-snapshot",
          "security-policy-network",
          "network-dist-profile",
        ],
        liveAudit,
        liveGroundTruthId: domain === "sports-terminal-os" ? "sports-terminal-snapshot" : undefined,
      });
      phases.groundTruthMs = Math.round(performance.now() - gtStart);
      groundTruthOk = gt.ok;
    }

    const snapshotOk = validation.ok;
    const networkDrift = Boolean(validation.drift.network?.drift);
    const ok = snapshotOk && groundTruthOk !== false;
    const detailParts = [
      validation.sections.length ? `sections=${validation.sections.join(",")}` : null,
      networkDrift ? "network-drift" : null,
      groundTruthOk === false ? "ground-truth-fail" : null,
    ].filter(Boolean);

    return {
      iteration,
      elapsedMs: Math.round(performance.now() - started),
      ok,
      snapshotOk,
      groundTruthOk,
      networkDrift,
      sections: validation.sections,
      detail: detailParts.join(" ") || undefined,
      phases,
    };
  } catch (e) {
    return {
      iteration,
      elapsedMs: Math.round(performance.now() - started),
      ok: false,
      snapshotOk: false,
      sections: [],
      detail: e instanceof Error ? e.message : String(e),
      phases,
    };
  }
}

export async function runSnapshotBenchLoop(
  opts: SnapshotBenchOptions,
): Promise<SnapshotBenchSummary> {
  const domain = opts.domain ?? "sports-terminal-os";
  const snapshotPath = resolve(
    opts.snapshotPath ?? defaultSnapshotPath(opts.skillRoot, domain),
  );
  const iterations = opts.iterations ?? 3;
  const runs: SnapshotBenchRunResult[] = [];

  for (let i = 1; i <= iterations; i++) {
    if (opts.signal?.aborted) break;
    const result = await runSingleSnapshotBench(opts, i, domain, snapshotPath);
    runs.push(result);
    await opts.onRun?.(result);
  }

  return summarizeSnapshotBenchRuns(domain, runs, {
    snapshotPath,
    liveNetwork: Boolean(opts.scanPath),
    groundTruth: opts.groundTruth === true,
    targetMs: opts.targetMs,
  });
}

export function formatSnapshotBenchStatus(
  summary: SnapshotBenchSummary,
  opts?: { verbose?: boolean },
): string {
  const pct = Math.round(summary.passRate * 100);
  const modes = [
    summary.liveNetwork ? "live-network" : null,
    summary.groundTruth ? "ground-truth" : null,
  ].filter(Boolean).join("+") || "snapshot-only";
  let line = `[loop] bench-snapshot domain=${summary.domain} mode=${modes} `
    + `iter=${summary.iterations} pass_rate=${pct}% `
    + `p50=${summary.p50Ms}ms p95=${summary.p95Ms}ms `
    + `rating=${summary.rating} (${summary.grade}) `
    + `path=${summary.snapshotPath}`;
  if (opts?.verbose && summary.phaseP50) {
    const p = summary.phaseP50;
    const bits = [`load=${p.loadP50Ms}ms`, `validate=${p.validateP50Ms}ms`];
    if (p.networkP50Ms !== undefined) bits.push(`network=${p.networkP50Ms}ms`);
    if (p.groundTruthP50Ms !== undefined) bits.push(`ground-truth=${p.groundTruthP50Ms}ms`);
    line += ` phases_p50={${bits.join(" ")}}`;
  }
  return line;
}