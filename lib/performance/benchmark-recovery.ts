// lib/performance/benchmark-recovery.ts — Run benchmarks with timeout, stuck detection, and auto-recovery
// Usage: bun lib/performance/benchmark-recovery.ts run lib/ai/ai.bench.ts
//        bun lib/performance/benchmark-recovery.ts detect ai.bench
//        bun lib/performance/benchmark-recovery.ts tail 50 lib/ai/ai.bench.ts
//        bun lib/performance/benchmark-recovery.ts recover lib/ai/ai.bench.ts

import { heapStats } from 'bun:jsc';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RunResult {
  file: string;
  exitCode: number;
  killed: boolean;
  signal: string | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  heapBefore: { heapKiB: number; objects: number };
  heapAfter: { heapKiB: number; objects: number };
  outputHash: string;
}

export interface DetectResult {
  pattern: string;
  found: number;
  pids: number[];
  killed: number;
}

export interface TailResult {
  file: string;
  lines: string[];
  totalLines: number;
  exitCode: number;
  killed: boolean;
  durationMs: number;
}

export interface RecoveryResult {
  file: string;
  attempts: RunResult[];
  finalStatus: 'ok' | 'stuck' | 'crashed';
  totalDurationMs: number;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class BenchmarkRecoveryEngine {
  static DEFAULT_TIMEOUT = 30_000;
  static MAX_STDOUT = 8192;

  /**
   * Run a benchmark file with timeout. Auto-kills if it exceeds the deadline.
   *
   *   const r = await BenchmarkRecoveryEngine.run('lib/ai/ai.bench.ts');
   *   console.log(r.killed ? 'stuck!' : `done in ${r.durationMs}ms`);
   */
  static async run(
    file: string,
    opts: { timeout?: number; cwd?: string } = {},
  ): Promise<RunResult> {
    const timeout = opts.timeout ?? this.DEFAULT_TIMEOUT;
    const cwd = opts.cwd ?? process.cwd();

    const heapBefore = snapHeap();
    const t0 = Bun.nanoseconds();

    const proc = Bun.spawn(['bun', 'run', file], {
      cwd,
      stdout: 'pipe',
      stderr: 'pipe',
    });

    let killed = false;
    const timer = setTimeout(() => {
      killed = true;
      proc.kill(); // SIGTERM first
    }, timeout);

    const exitCode = await proc.exited;
    clearTimeout(timer);

    const durationMs = (Bun.nanoseconds() - t0) / 1e6;
    const stdout = (await new Response(proc.stdout).text()).slice(0, this.MAX_STDOUT);
    const stderr = (await new Response(proc.stderr).text()).slice(0, this.MAX_STDOUT);
    const heapAfter = snapHeap();

    return {
      file,
      exitCode,
      killed,
      signal: killed ? 'SIGTERM' : null,
      stdout,
      stderr,
      durationMs,
      heapBefore,
      heapAfter,
      outputHash: Bun.hash.crc32(stdout).toString(16),
    };
  }

  /**
   * Find stuck Bun processes matching `pattern`, kill them, return PIDs.
   *
   *   const d = await BenchmarkRecoveryEngine.detectStuckProcess('ai.bench');
   *   // d.found === 2, d.killed === 2
   */
  static async detectStuckProcess(pattern: string): Promise<DetectResult> {
    const safePattern = pattern.replace(/[^a-zA-Z0-9._-]/g, '');

    const pgrepProc = Bun.spawn(['pgrep', '-f', safePattern], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    await pgrepProc.exited;
    const pgrepOut = await new Response(pgrepProc.stdout).text();

    const pids = pgrepOut
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(Number)
      .filter((pid) => pid !== process.pid); // never kill self

    let killedCount = 0;
    for (const pid of pids) {
      try {
        process.kill(pid, 'SIGKILL');
        killedCount++;
      } catch {
        // already exited
      }
    }

    return { pattern: safePattern, found: pids.length, pids, killed: killedCount };
  }

  /**
   * Hard-kill (SIGKILL) all Bun processes matching `pattern`.
   * Returns true if at least one process was killed.
   */
  static async hardKill(pattern: string): Promise<boolean> {
    const result = await this.detectStuckProcess(pattern);
    return result.killed > 0;
  }

  /**
   * Run a benchmark and return only the last N lines of stdout.
   *
   *   const t = await BenchmarkRecoveryEngine.tailCapture('lib/ai/ai.bench.ts', 50);
   *   t.lines.forEach(l => console.log(l));
   */
  static async tailCapture(
    file: string,
    lineCount = 50,
    opts: { timeout?: number; cwd?: string } = {},
  ): Promise<TailResult> {
    const result = await this.run(file, opts);
    const allLines = result.stdout.split('\n');

    return {
      file,
      lines: allLines.slice(-lineCount),
      totalLines: allLines.length,
      exitCode: result.exitCode,
      killed: result.killed,
      durationMs: result.durationMs,
    };
  }

  /**
   * Full recovery loop: run benchmark, if stuck → kill → retry up to N times.
   *
   *   const r = await BenchmarkRecoveryEngine.fullRecovery('lib/ai/ai.bench.ts');
   *   console.log(r.finalStatus); // 'ok' | 'stuck' | 'crashed'
   */
  static async fullRecovery(
    file: string,
    opts: { timeout?: number; retries?: number; cwd?: string } = {},
  ): Promise<RecoveryResult> {
    const maxAttempts = (opts.retries ?? 1) + 1;
    const attempts: RunResult[] = [];
    const t0 = Bun.nanoseconds();

    for (let i = 0; i < maxAttempts; i++) {
      // Clean up any leftover stuck processes from previous attempts
      if (i > 0) {
        const basename = file.split('/').pop() ?? file;
        await this.detectStuckProcess(basename);
        // Brief pause to let OS reclaim resources
        await Bun.sleep(200);
      }

      const result = await this.run(file, opts);
      attempts.push(result);

      if (!result.killed && result.exitCode === 0) {
        return {
          file,
          attempts,
          finalStatus: 'ok',
          totalDurationMs: (Bun.nanoseconds() - t0) / 1e6,
        };
      }
    }

    const last = attempts[attempts.length - 1];
    return {
      file,
      attempts,
      finalStatus: last.killed ? 'stuck' : 'crashed',
      totalDurationMs: (Bun.nanoseconds() - t0) / 1e6,
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function snapHeap(): { heapKiB: number; objects: number } {
  const h = heapStats();
  return { heapKiB: +(h.heapSize / 1024).toFixed(0), objects: h.objectCount };
}

// ---------------------------------------------------------------------------
// Progressive disclosure
// ---------------------------------------------------------------------------

/**
 * Progressive output: run once, then auto-escalate inspect depth.
 *
 * Phases (re-inspect the same result, not re-run):
 *   1. Surface scan    (depth 1) — if no truncation, stop
 *   2. Standard debug  (depth 3) — if no truncation, stop
 *   3. Deep analysis   (depth 6) — if no truncation, stop
 *   4. Full inspection (depth 8) — always stop
 *
 * On error/stuck, extra context is printed before the phases.
 */
export interface PhaseConfig {
  depth: number;
  name: string;
  maxSafeMB: number;
  circular: 'root-only' | 'partial' | 'full' | 'full-with-cost';
  devtools: 'limited' | 'partial' | 'good' | 'excellent' | 'full' | 'overkill';
}

export class ProgressiveDisclosureCLI {
  static readonly PHASES: readonly PhaseConfig[] = [
    { depth: 1, name: 'Surface scan',   maxSafeMB: 100, circular: 'root-only',       devtools: 'limited'   },
    { depth: 3, name: 'Standard debug', maxSafeMB: 50,  circular: 'partial',         devtools: 'good'      },
    { depth: 6, name: 'Deep analysis',  maxSafeMB: 10,  circular: 'full',            devtools: 'excellent' },
    { depth: 8, name: 'Full inspection', maxSafeMB: 5,  circular: 'full-with-cost',  devtools: 'full'      },
  ] as const;

  static async runWithProgressiveDisclosure(
    file: string,
    opts: { timeout?: number; cwd?: string } = {},
  ): Promise<RunResult> {
    const result = await BenchmarkRecoveryEngine.run(file, opts);

    // Print context header based on outcome
    if (result.killed) {
      const heapDelta = result.heapAfter.heapKiB - result.heapBefore.heapKiB;
      const objDelta = result.heapAfter.objects - result.heapBefore.objects;
      console.log(`STUCK  ${file}  killed after ${result.durationMs.toFixed(0)}ms  signal=${result.signal}`);
      console.log(`heap: ${result.heapBefore.heapKiB}→${result.heapAfter.heapKiB} KiB (+${heapDelta})  objects: ${result.heapBefore.objects}→${result.heapAfter.objects} (+${objDelta})`);
      if (result.stderr) { console.log('\n--- stderr ---'); console.log(result.stderr); }
      console.log('\n--- stdout (captured before kill) ---');
      console.log(result.stdout);
    } else if (result.exitCode !== 0) {
      console.log(`ERR  ${file}  exit=${result.exitCode}  ${result.durationMs.toFixed(0)}ms`);
      if (result.stderr) { console.log('\n--- stderr ---'); console.log(result.stderr); }
      const lines = result.stdout.split('\n');
      if (lines.length > 1) {
        console.log('\n--- stdout (last 10 lines) ---');
        lines.slice(-10).forEach((l) => console.log(l));
      }
    } else {
      console.log(`ok  ${file}  ${result.durationMs.toFixed(0)}ms  hash=${result.outputHash}`);
    }

    // Progressive phases: re-inspect at increasing depth until no truncation
    for (const phase of this.PHASES) {
      const inspected = Bun.inspect(result, { depth: phase.depth });
      const truncated = this.hasTruncation(inspected);

      console.log(`\n--- ${phase.name} (depth=${phase.depth}, safe<${phase.maxSafeMB}MB, circular=${phase.circular}, devtools=${phase.devtools}) ---`);
      console.log(inspected);

      if (!truncated) break;
      if (phase.depth >= 8) break;
      console.log(`  [truncated objects detected, escalating...]`);
    }

    return result;
  }

  /**
   * Run an arbitrary command with escalating BUN_CONSOLE_DEPTH until it succeeds.
   *
   *   await ProgressiveDisclosureCLI.runWithProgressiveDisclosure('bun', ['run', benchmarkFile]);
   */
  static async runWithProgressiveDisclosure(
    cmd: string,
    args: string[],
    opts: { cwd?: string } = {},
  ): Promise<{ exitCode: number; phase: string }> {
    for (const phase of this.PHASES) {
      console.log(`\n--- ${phase.name} (depth=${phase.depth}, safe<${phase.maxSafeMB}MB, circular=${phase.circular}, devtools=${phase.devtools}) ---`);
      const proc = Bun.spawn([cmd, ...args], {
        cwd: opts.cwd ?? process.cwd(),
        env: { ...process.env, BUN_CONSOLE_DEPTH: phase.depth.toString() },
        stdout: 'inherit',
        stderr: 'inherit',
      });
      const exitCode = await proc.exited;
      if (exitCode === 0) return { exitCode, phase: phase.name };
    }
    const last = this.PHASES[this.PHASES.length - 1];
    return { exitCode: 1, phase: last.name };
  }

  private static hasTruncation(output: string): boolean {
    // [Circular] is NOT truncation — increasing depth won't resolve it.
    // Only [Object ...] and [Array] indicate depth-limited content.
    return /\[Object \.\.\.\]|\[Array\]/.test(output);
  }
}

// ---------------------------------------------------------------------------
// Environment-aware depth defaults
// ---------------------------------------------------------------------------

const ENV_DEPTH: Record<string, { default: number; onError: number; onStuck: number }> = {
  development: { default: 5, onError: 7, onStuck: 8 },
  test:        { default: 3, onError: 5, onStuck: 6 },
  staging:     { default: 2, onError: 4, onStuck: 6 },
  production:  { default: 1, onError: 3, onStuck: 4 },
  profiling:   { default: 3, onError: 4, onStuck: 5 },
};

function envDepths() {
  const env = process.env.BUN_ENV ?? process.env.NODE_ENV ?? 'development';
  return ENV_DEPTH[env] ?? ENV_DEPTH.development;
}

function depthForEnv(): number { return envDepths().default; }

function resultDepth(base: number, result: { killed: boolean; exitCode: number }): number {
  const e = envDepths();
  if (result.killed) return Math.max(base, e.onStuck);
  if (result.exitCode !== 0) return Math.max(base, e.onError);
  return base;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

if (import.meta.main) {
  const [cmd, ...rest] = process.argv.slice(2);

  const usage = `benchmark-recovery — Run benchmarks with stuck detection & auto-recovery

Usage:
  bun lib/performance/benchmark-recovery.ts run <file> [--timeout <ms>] [--depth <n>] [--progressive]
  bun lib/performance/benchmark-recovery.ts detect <pattern> [--depth <n>]
  bun lib/performance/benchmark-recovery.ts kill <pattern>
  bun lib/performance/benchmark-recovery.ts tail <lines> <file> [--timeout <ms>] [--depth <n>]
  bun lib/performance/benchmark-recovery.ts recover <file> [--timeout <ms>] [--retries <n>] [--depth <n>]

Options:
  --depth <n>    Deep-inspect result objects. Default: auto from BUN_ENV/NODE_ENV
                 Env       default  onError  onStuck
                 dev       5        7        8
                 test      3        5        6
                 staging   2        4        6
                 prod      1        3        4
                 profiling 3        4        5
  --progressive  Auto-escalate output detail: one-line on success, full dump on stuck`;

  function parseFlag(args: string[], flag: string, fallback: number): number {
    const idx = args.indexOf(flag);
    if (idx === -1 || idx + 1 >= args.length) return fallback;
    return parseInt(args[idx + 1], 10);
  }

  const depth = parseFlag(rest, '--depth', depthForEnv());

  switch (cmd) {
    case 'run': {
      const file = rest[0];
      if (!file) { console.error('Missing file argument.\n' + usage); process.exit(1); }
      const timeout = parseFlag(rest, '--timeout', BenchmarkRecoveryEngine.DEFAULT_TIMEOUT);

      if (rest.includes('--progressive')) {
        const result = await ProgressiveDisclosureCLI.runWithProgressiveDisclosure(file, { timeout });
        process.exit(result.exitCode);
      }

      const result = await BenchmarkRecoveryEngine.run(file, { timeout });
      console.log(result.stdout);
      if (result.stderr) console.error(result.stderr);
      console.log(`\n--- recovery engine ---`);
      console.log(Bun.inspect(result, { depth: resultDepth(depth, result) }));
      process.exit(result.exitCode);
      break;
    }

    case 'detect': {
      const pattern = rest[0];
      if (!pattern) { console.error('Missing pattern argument.\n' + usage); process.exit(1); }
      const d = await BenchmarkRecoveryEngine.detectStuckProcess(pattern);
      console.log(Bun.inspect(d, { depth }));
      process.exit(d.found > 0 ? 0 : 1);
      break;
    }

    case 'kill': {
      const pattern = rest[0];
      if (!pattern) { console.error('Missing pattern argument.\n' + usage); process.exit(1); }
      const killed = await BenchmarkRecoveryEngine.hardKill(pattern);
      console.log(killed ? 'Killed.' : 'No matching processes.');
      process.exit(killed ? 0 : 1);
      break;
    }

    case 'tail': {
      const lines = parseInt(rest[0], 10) || 50;
      const file = rest[1];
      if (!file) { console.error('Missing file argument.\n' + usage); process.exit(1); }
      const timeout = parseFlag(rest, '--timeout', BenchmarkRecoveryEngine.DEFAULT_TIMEOUT);
      const t = await BenchmarkRecoveryEngine.tailCapture(file, lines, { timeout });
      t.lines.forEach((l) => console.log(l));
      console.log(`\n--- tail result ---`);
      console.log(Bun.inspect(t, { depth }));
      process.exit(t.exitCode);
      break;
    }

    case 'recover': {
      const file = rest[0];
      if (!file) { console.error('Missing file argument.\n' + usage); process.exit(1); }
      const timeout = parseFlag(rest, '--timeout', BenchmarkRecoveryEngine.DEFAULT_TIMEOUT);
      const retries = parseFlag(rest, '--retries', 1);
      const r = await BenchmarkRecoveryEngine.fullRecovery(file, { timeout, retries });
      for (const [i, a] of r.attempts.entries()) {
        const attemptDepth = resultDepth(depth, a);
        console.log(`\n=== Attempt ${i + 1} ===`);
        console.log(a.stdout);
        if (a.stderr) console.error(a.stderr);
        console.log(Bun.inspect(a, { depth: attemptDepth }));
      }
      console.log(`\n--- recovery result ---`);
      const finalDepth = r.finalStatus === 'stuck' ? Math.max(depth, envDepths().onStuck)
        : r.finalStatus === 'crashed' ? Math.max(depth, envDepths().onError)
        : depth;
      console.log(Bun.inspect(r, { depth: finalDepth }));
      process.exit(r.finalStatus === 'ok' ? 0 : 1);
      break;
    }

    default:
      console.log(usage);
      process.exit(cmd ? 1 : 0);
  }
}
