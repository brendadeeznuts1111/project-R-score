#!/usr/bin/env bun
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

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
  const interval = Number(argv.find(a => a.startsWith('--cpu-prof-interval='))?.split('=')[1] || '250');
  const runId = argv.find(a => a.startsWith('--run-id='))?.split('=')[1] || nowRunId();
  const profilesDir = resolve(argv.find(a => a.startsWith('--profiles-dir='))?.split('=')[1] || 'reports/brand-bench/profiles');
  const passthrough = argv.filter(a => !a.startsWith('--target=') && !a.startsWith('--seed=') && !a.startsWith('--cpu-prof-interval=') && !a.startsWith('--run-id=') && !a.startsWith('--profiles-dir='));

  if (!Number.isFinite(seed)) {
    throw new Error('seed must be numeric');
  }
  if (!Number.isFinite(interval) || interval <= 0) {
    throw new Error('cpu-prof-interval must be positive');
  }

  return { target, seed, interval, runId, profilesDir, passthrough };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  await mkdir(options.profilesDir, { recursive: true });

  const profileName = options.target === 'generate'
    ? `brand_seed_${options.seed}.cpuprofile`
    : `brand_bench_${options.runId}.cpuprofile`;

  const targetScript = options.target === 'generate'
    ? './scripts/brand-generate.ts'
    : './scripts/brand-bench-runner.ts';

  const args = [
    'bun',
    '--cpu-prof',
    '--cpu-prof-interval',
    String(options.interval),
    '--cpu-prof-dir',
    options.profilesDir,
    '--cpu-prof-name',
    profileName,
    targetScript,
  ];

  if (options.target === 'generate') {
    args.push(`--seed=${options.seed}`);
  } else {
    args.push(`--run-id=${options.runId}`);
    args.push(`--profile-files=${join(options.profilesDir, profileName)}`);
  }
  args.push(...options.passthrough);

  const child = Bun.spawnSync(args, {
    cwd: process.cwd(),
    stdout: 'inherit',
    stderr: 'inherit',
  });

  const payload = {
    ok: child.exitCode === 0,
    target: options.target,
    interval: options.interval,
    seed: options.seed,
    runId: options.runId,
    profileFile: join(options.profilesDir, profileName),
    exitCode: child.exitCode,
  };

  console.log(JSON.stringify(payload, null, 2));
  process.exit(child.exitCode ?? 1);
}

if (import.meta.main) {
  await main();
}
