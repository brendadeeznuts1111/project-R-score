#!/usr/bin/env bun
// @see https://bun.com/docs/pm/cli/install#cpu-and-os-flags — --cpu
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/project/benchmarking#cpu-profiling — --cpu-prof
// @see https://bun.com/docs/project/benchmarking#markdown-output — --cpu-prof-md
// @see https://bun.com/docs/project/benchmarking#cpu-profiling — --cpu-prof / --cpu-prof-md
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/file-io — Bun.write
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
import { ensureDir } from './lib/fs-bun';
import { createShutdown } from './lib/graceful-shutdown';
import { jsonOut } from '../lib/console-depth';
const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('brand:bench:profile', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const joinPath = (...parts: string[]) => parts.filter(Boolean).join('/').replace(/\/+/g, '/');

function nowRunId(): string {
  return new Date().toISOString().replace(/[-:.]/g, '').replace('Z', 'Z');
}

type Options = {
  target: 'generate' | 'bench';
  seed: number;
  interval: number;
  runId: string;
  profilesDir: string;
  passthrough: string[];
};

function parseArgs(argv: string[]): Options {
  const targetRaw = argv.find(a => a.startsWith('--target='))?.split('=')[1] || 'bench';
  const target = targetRaw === 'generate' ? 'generate' : 'bench';
  const seed = Number(argv.find(a => a.startsWith('--seed='))?.split('=')[1] || '210');
  const interval = Number(
    argv.find(a => a.startsWith('--cpu-prof-interval='))?.split('=')[1] || '250'
  );
  const runId = argv.find(a => a.startsWith('--run-id='))?.split('=')[1] || nowRunId();
  const profilesDir = joinPath(
    argv.find(a => a.startsWith('--profiles-dir='))?.split('=')[1] || 'reports/brand-bench/profiles'
  );
  const passthrough = argv.filter(
    a =>
      !a.startsWith('--target=') &&
      !a.startsWith('--seed=') &&
      !a.startsWith('--cpu-prof-interval=') &&
      !a.startsWith('--run-id=') &&
      !a.startsWith('--profiles-dir=')
  );

  if (!Number.isFinite(seed)) {
    throw new Error('seed must be numeric');
  }
  if (!Number.isFinite(interval) || interval <= 0) {
    throw new Error('cpu-prof-interval must be positive');
  }

  return { target, seed, interval, runId, profilesDir, passthrough };
}

async function main(): Promise<void> {
  const options = parseArgs(Bun.argv.slice(2));
  await ensureDir(options.profilesDir);

  const profileBase =
    options.target === 'generate' ? `brand_seed_${options.seed}` : `brand_bench_${options.runId}`;
  const profileFile = joinPath(options.profilesDir, `${profileBase}.cpuprofile`);
  const profileMdFile = joinPath(options.profilesDir, `${profileBase}.md`);

  const targetScript =
    options.target === 'generate'
      ? './scripts/brand-generate.ts'
      : './scripts/brand-bench-runner.ts';

  const args = [
    'bun',
    '--cpu-prof',
    '--cpu-prof-md',
    '--cpu-prof-interval',
    String(options.interval),
    '--cpu-prof-dir',
    options.profilesDir,
    '--cpu-prof-name',
    profileBase,
    targetScript,
  ];

  if (options.target === 'generate') {
    args.push(`--seed=${options.seed}`);
  } else {
    args.push(`--run-id=${options.runId}`);
    args.push(`--profile-files=${profileFile}`);
  }
  args.push(...options.passthrough);

  const child = Bun.spawn(args, {
    cwd: process.cwd(),
    stdout: 'inherit',
    stderr: 'inherit',
  });

  const shutdown = createShutdown({ name: 'brand-cpu-profile', quiet: true });
  shutdown.onCleanup(() => {
    child.kill('SIGTERM');
  });

  const exitCode = await child.exited;
  shutdown.dispose();

  const payload = {
    ok: exitCode === 0,
    target: options.target,
    interval: options.interval,
    seed: options.seed,
    runId: options.runId,
    profileFile,
    profileMdFile,
    exitCode,
    interrupted: shutdown.requested,
  };

  jsonOut(payload);
  process.exit(exitCode ?? 1);
}

if (import.meta.main) {
  await main();
}
