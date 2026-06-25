import { assembleTestCommand, loadTestProfiles } from "./test-runner.ts";

export type BenchRunResult = {
  iteration: number;
  exitCode: number;
  elapsedMs: number;
  pass: number;
  fail: number;
  skipped: number;
  ok: boolean;
};

export type BenchLoopSummary = {
  profile: string;
  iterations: number;
  runs: BenchRunResult[];
  passRate: number;
  p50Ms: number;
  p95Ms: number;
  rating: number;
  grade: string;
  targetMs?: number;
};

export type BenchLoopOptions = {
  skillRoot: string;
  repoRoot: string;
  profile: string;
  iterations?: number;
  targetMs?: number;
  skipPreflight?: boolean;
  onRun?: (result: BenchRunResult) => void | Promise<void>;
  signal?: AbortSignal;
};

const BUN_TEST_SUMMARY_RE =
  /(\d+)\s+pass(?:\s+\|\s+(\d+)\s+fail)?(?:\s+\|\s+(\d+)\s+skip)?|(\d+)\s+pass\s*\n\s*(\d+)\s+fail/s;

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx] ?? 0;
}

export function parseBunTestSummary(output: string): { pass: number; fail: number; skipped: number } {
  const passMatch = output.match(/(\d+)\s+pass/);
  const failMatch = output.match(/(\d+)\s+fail/);
  const skipMatch = output.match(/(\d+)\s+skip/);
  if (passMatch || failMatch) {
    return {
      pass: passMatch ? Number(passMatch[1]) : 0,
      fail: failMatch ? Number(failMatch[1]) : 0,
      skipped: skipMatch ? Number(skipMatch[1]) : 0,
    };
  }
  const legacy = BUN_TEST_SUMMARY_RE.exec(output);
  if (legacy) {
    return {
      pass: Number(legacy[1] ?? legacy[4] ?? 0),
      fail: Number(legacy[2] ?? legacy[5] ?? 0),
      skipped: Number(legacy[3] ?? 0),
    };
  }
  return { pass: 0, fail: 0, skipped: 0 };
}

export function computeBenchRating(
  passRate: number,
  p50Ms: number,
  targetMs?: number,
): { rating: number; grade: string } {
  let rating = Math.round(passRate * 100);
  if (targetMs && p50Ms > 0 && p50Ms <= targetMs) {
    const speedBonus = Math.round(((targetMs - p50Ms) / targetMs) * 10);
    rating = Math.min(100, rating + speedBonus);
  } else if (targetMs && p50Ms > targetMs) {
    const penalty = Math.min(20, Math.round(((p50Ms - targetMs) / targetMs) * 15));
    rating = Math.max(0, rating - penalty);
  }
  const grade =
    rating >= 95 ? "A" :
    rating >= 85 ? "B" :
    rating >= 70 ? "C" :
    rating >= 50 ? "D" : "F";
  return { rating, grade };
}

export function summarizeBenchRuns(
  profile: string,
  runs: BenchRunResult[],
  targetMs?: number,
): BenchLoopSummary {
  const iterations = runs.length;
  const okRuns = runs.filter((r) => r.ok).length;
  const passRate = iterations ? okRuns / iterations : 0;
  const elapsed = [...runs.map((r) => r.elapsedMs)].sort((a, b) => a - b);
  const { rating, grade } = computeBenchRating(passRate, percentile(elapsed, 50), targetMs);
  return {
    profile,
    iterations,
    runs,
    passRate,
    p50Ms: percentile(elapsed, 50),
    p95Ms: percentile(elapsed, 95),
    rating,
    grade,
    targetMs,
  };
}

async function runSingleBench(
  opts: BenchLoopOptions,
  iteration: number,
): Promise<BenchRunResult> {
  const { profiles } = await loadTestProfiles(opts.skillRoot);
  const assembled = assembleTestCommand(profiles, {
    skillRoot: opts.skillRoot,
    repoRoot: opts.repoRoot,
    profile: opts.profile,
  });

  if (assembled.preflight && !opts.skipPreflight) {
    const pf = Bun.spawn(assembled.preflight.command, {
      cwd: assembled.preflight.cwd,
      stdout: "pipe",
      stderr: "pipe",
      env: assembled.env ? { ...process.env, ...assembled.env } : process.env,
    });
    const pfCode = await pf.exited;
    if (pfCode !== 0) {
      return {
        iteration,
        exitCode: pfCode,
        elapsedMs: 0,
        pass: 0,
        fail: 1,
        skipped: 0,
        ok: false,
      };
    }
  }

  const started = performance.now();
  const proc = Bun.spawn(assembled.command, {
    cwd: assembled.cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: assembled.env ? { ...process.env, ...assembled.env } : process.env,
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  const elapsedMs = Math.round(performance.now() - started);
  const combined = `${stdout}\n${stderr}`;
  const { pass, fail, skipped } = parseBunTestSummary(combined);
  const ok = exitCode === 0 && fail === 0;
  return { iteration, exitCode, elapsedMs, pass, fail, skipped, ok };
}

export async function runBenchLoop(opts: BenchLoopOptions): Promise<BenchLoopSummary> {
  const iterations = opts.iterations ?? 3;
  const runs: BenchRunResult[] = [];
  for (let i = 1; i <= iterations; i++) {
    if (opts.signal?.aborted) break;
    const result = await runSingleBench(opts, i);
    runs.push(result);
    await opts.onRun?.(result);
  }
  return summarizeBenchRuns(opts.profile, runs, opts.targetMs);
}

export function formatBenchStatus(summary: BenchLoopSummary, reason = "bench"): string {
  const pct = Math.round(summary.passRate * 100);
  return `[loop] ${reason} profile=${summary.profile} `
    + `iter=${summary.iterations} pass_rate=${pct}% `
    + `p50=${summary.p50Ms}ms p95=${summary.p95Ms}ms `
    + `rating=${summary.rating} (${summary.grade})`;
}