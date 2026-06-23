import { resolve } from "node:path";
import {
  captureLoopBaseline,
  diffLoopBaselines,
  loadLoopBaseline,
  writeLoopBaseline,
  type LoopBaselineDelta,
} from "./skill-loop-baseline.ts";
import { validateNetworkGroundTruth } from "./network-ground-truth-validator.ts";
import { runNetworkAuditOnce } from "./network-loop.ts";
import {
  formatSnapshotBenchStatus,
  runSnapshotBenchLoop,
  type SnapshotBenchSummary,
} from "./snapshot-bench-loop.ts";
import {
  loadSkillLoopRegistry,
  resolveBenchSnapshotPreset,
  snapshotBenchSummaryToTick,
  type BenchSnapshotPresetSpec,
} from "./skill-loop.ts";

export type CloseLoopStepId =
  | "seed"
  | "ground-truth"
  | "bench-snapshot"
  | "baseline-diff"
  | "baseline-write";

export type CloseLoopStep = {
  id: CloseLoopStepId;
  ok: boolean;
  elapsedMs: number;
  detail?: string;
};

export type CloseLoopSummary = {
  schemaVersion: 1;
  tool: "skill-loop-close-loop";
  domain: string;
  scanPath?: string;
  steps: CloseLoopStep[];
  ok: boolean;
  bench?: SnapshotBenchSummary;
  rating?: number;
  grade?: string;
  drift?: LoopBaselineDelta[];
  loopBaselinePath?: string;
};

export type CloseLoopOptions = {
  skillRoot: string;
  repo: string;
  domain?: string;
  scanPath?: string;
  skillId?: string;
  benchSnapshot?: BenchSnapshotPresetSpec;
  iterations?: number;
  seed?: boolean;
  skipGroundTruth?: boolean;
  baselineWrite?: boolean;
  failOnDrift?: boolean;
  /** Rating-only drift within tolerance does not fail baseline-diff (default 15). */
  ratingDriftTolerance?: number;
  onStep?: (step: CloseLoopStep) => void | Promise<void>;
  signal?: AbortSignal;
};

function pushStep(
  steps: CloseLoopStep[],
  step: CloseLoopStep,
  onStep?: CloseLoopOptions["onStep"],
): void {
  steps.push(step);
  void onStep?.(step);
}

export function formatCloseLoopStatus(
  summary: CloseLoopSummary,
  opts?: { verbose?: boolean },
): string {
  const stepBits = summary.steps.map((s) => `${s.id}=${s.ok ? "ok" : "fail"}`).join(" ");
  let line = `[loop] close-loop domain=${summary.domain} ok=${summary.ok} ${stepBits}`;
  if (summary.rating !== undefined) {
    line += ` rating=${summary.rating} (${summary.grade ?? "?"})`;
  }
  if (opts?.verbose && summary.bench) {
    const b = summary.bench;
    line += ` pass_rate=${Math.round(b.passRate * 100)}% p50=${b.p50Ms}ms`;
    if (b.phaseP50) {
      const p = b.phaseP50;
      line += ` phases_p50={load=${p.loadP50Ms}ms network=${p.networkP50Ms ?? 0}ms validate=${p.validateP50Ms}ms}`;
    }
  }
  if (summary.drift?.length) {
    const drifted = summary.drift.filter((d) => d.drift);
    if (drifted.length) {
      line += ` drift=${drifted.map((d) => d.skillId).join(",")}`;
    }
  }
  if (summary.loopBaselinePath) line += ` baseline=${summary.loopBaselinePath}`;
  return line;
}

export async function runCloseLoop(opts: CloseLoopOptions): Promise<CloseLoopSummary> {
  const registry = await loadSkillLoopRegistry(opts.skillRoot);
  const skillId = opts.skillId ?? "ast-grep";
  const bs = resolveBenchSnapshotPreset(registry, skillId, {
    ...opts.benchSnapshot,
    domain: opts.domain ?? opts.benchSnapshot?.domain,
    scanPath: opts.scanPath ?? opts.benchSnapshot?.scanPath,
    iterations: opts.iterations ?? opts.benchSnapshot?.iterations,
    groundTruth: opts.skipGroundTruth ? false : (opts.benchSnapshot?.groundTruth ?? true),
  });
  const steps: CloseLoopStep[] = [];
  let liveAudit;

  if (opts.seed === true && bs.scanPath) {
    const started = performance.now();
    try {
      const { formatSeedStatus, seedNetworkBaseline } = await import("./network-seed.ts");
      const seed = await seedNetworkBaseline({
        skillRoot: opts.skillRoot,
        repo: opts.repo,
        scanPath: bs.scanPath,
        domain: bs.domain,
        profileName: "supply-chain-network-dist",
      });
      pushStep(steps, {
        id: "seed",
        ok: true,
        elapsedMs: Math.round(performance.now() - started),
        detail: formatSeedStatus(seed),
      }, opts.onStep);
    } catch (e) {
      pushStep(steps, {
        id: "seed",
        ok: false,
        elapsedMs: Math.round(performance.now() - started),
        detail: e instanceof Error ? e.message : String(e),
      }, opts.onStep);
    }
  }

  if (!opts.skipGroundTruth) {
    const gtStart = performance.now();
    try {
      if (bs.scanPath) {
        liveAudit = await runNetworkAuditOnce({
          skillRoot: opts.skillRoot,
          repo: opts.repo,
          scanPath: bs.scanPath,
          profileName: "supply-chain-network-dist",
          domain: bs.domain,
          verbose: false,
        });
      }
      const gt = await validateNetworkGroundTruth({
        skillRoot: opts.skillRoot,
        repo: opts.repo,
        ids: [
          "sports-terminal-snapshot",
          "security-policy-network",
          "network-dist-profile",
        ],
        liveAudit,
        liveGroundTruthId: bs.domain === "sports-terminal-os" ? "sports-terminal-snapshot" : undefined,
      });
      pushStep(steps, {
        id: "ground-truth",
        ok: gt.ok,
        elapsedMs: Math.round(performance.now() - gtStart),
        detail: gt.ok
          ? `${gt.checks.filter((c) => c.ok).length}/${gt.checks.length} checks`
          : gt.checks.filter((c) => !c.ok).map((c) => c.id).join(","),
      }, opts.onStep);
    } catch (e) {
      pushStep(steps, {
        id: "ground-truth",
        ok: false,
        elapsedMs: Math.round(performance.now() - gtStart),
        detail: e instanceof Error ? e.message : String(e),
      }, opts.onStep);
    }
  }

  const benchStart = performance.now();
  let bench: SnapshotBenchSummary | undefined;
  let benchOk = false;
  try {
    bench = await runSnapshotBenchLoop({
      skillRoot: opts.skillRoot,
      repo: opts.repo,
      domain: bs.domain,
      scanPath: bs.scanPath,
      iterations: bs.iterations,
      targetMs: bs.targetMs,
      groundTruth: bs.groundTruth,
      failOnNetworkDrift: bs.failOnNetworkDrift,
      signal: opts.signal,
    });
    benchOk = bench.passRate >= 1;
    pushStep(steps, {
      id: "bench-snapshot",
      ok: benchOk,
      elapsedMs: Math.round(performance.now() - benchStart),
      detail: formatSnapshotBenchStatus(bench),
    }, opts.onStep);
  } catch (e) {
    pushStep(steps, {
      id: "bench-snapshot",
      ok: false,
      elapsedMs: Math.round(performance.now() - benchStart),
      detail: e instanceof Error ? e.message : String(e),
    }, opts.onStep);
  }

  const tick = bench ? snapshotBenchSummaryToTick(skillId, bench) : undefined;
  const baselinePath = resolve(opts.skillRoot, "baselines/loop/skill-loop-baseline.json");
  let drift: LoopBaselineDelta[] | undefined;

  if (tick) {
    const diffStart = performance.now();
    const previous = await loadLoopBaseline(baselinePath);
    if (previous) {
      const current = captureLoopBaseline([tick]);
      const driftOpts = {
        ratingDriftTolerance: opts.ratingDriftTolerance ?? 15,
        strict: opts.failOnDrift === true,
      };
      drift = diffLoopBaselines(current, previous, driftOpts);
      const drifted = drift.filter((d) => d.drift);
      pushStep(steps, {
        id: "baseline-diff",
        ok: !opts.failOnDrift || drifted.length === 0,
        elapsedMs: Math.round(performance.now() - diffStart),
        detail: drifted.length
          ? drifted.map((d) => `${d.skillId} Δ${d.rating_delta}`).join("; ")
          : drift.some((d) => d.rating_delta !== 0)
            ? `within tolerance (±${driftOpts.ratingDriftTolerance})`
            : "no drift",
      }, opts.onStep);
    } else {
      pushStep(steps, {
        id: "baseline-diff",
        ok: true,
        elapsedMs: Math.round(performance.now() - diffStart),
        detail: "no prior baseline",
      }, opts.onStep);
    }
  }

  let loopBaselinePath: string | undefined;
  if (opts.baselineWrite === true && tick) {
    const writeStart = performance.now();
    try {
      loopBaselinePath = await writeLoopBaseline(opts.skillRoot, [tick], baselinePath);
      pushStep(steps, {
        id: "baseline-write",
        ok: true,
        elapsedMs: Math.round(performance.now() - writeStart),
        detail: loopBaselinePath,
      }, opts.onStep);
    } catch (e) {
      pushStep(steps, {
        id: "baseline-write",
        ok: false,
        elapsedMs: Math.round(performance.now() - writeStart),
        detail: e instanceof Error ? e.message : String(e),
      }, opts.onStep);
    }
  }

  const ok = steps.every((s) => s.ok);
  return {
    schemaVersion: 1,
    tool: "skill-loop-close-loop",
    domain: bs.domain,
    scanPath: bs.scanPath,
    steps,
    ok,
    bench,
    rating: bench?.rating,
    grade: bench?.grade,
    drift,
    loopBaselinePath,
  };
}