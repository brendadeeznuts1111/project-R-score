#!/usr/bin/env bun
// @see https://bun.com/docs/pm/cli/install#cpu-and-os-flags — --cpu
// @see https://bun.com/docs/bundler/executables#runtime-arguments-via-bun-options — --cpu-prof
// @see https://bun.com/docs/bundler/executables#runtime-arguments-via-bun-options — --cpu-prof-md
// @see https://bun.com/docs/project/benchmarking#cpu-profiling — --cpu-prof / --cpu-prof-md
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/reference/bun/argv — Bun.argv
import { jsonOut } from '../lib/console-depth.ts';
import { ensureDir } from './lib/fs-bun.ts';

const PROFILE_DIRECTORY = 'reports/limit-forecast-lab/profiles';

function runKey(): string {
  return new Date().toISOString().replace(/[-:.]/g, '');
}

async function main(): Promise<void> {
  const args = Bun.argv.slice(2);
  const iterations = args.find(value => value.startsWith('--bench=')) ?? '--bench=2500';
  const key = runKey();
  const profileName = `limit_forecast_${key}`;
  await ensureDir(PROFILE_DIRECTORY);

  const child = Bun.spawn(
    [
      'bun',
      '--cpu-prof',
      '--cpu-prof-md',
      '--cpu-prof-dir',
      PROFILE_DIRECTORY,
      '--cpu-prof-name',
      profileName,
      'tools/ops-limit-forecast-lab.ts',
      '--no-write',
      iterations,
    ],
    {
      cwd: process.cwd(),
      stdout: 'inherit',
      stderr: 'inherit',
    }
  );
  const exitCode = await child.exited;
  jsonOut({
    ok: exitCode === 0,
    exitCode,
    iterations: Number(iterations.slice('--bench='.length)),
    profileDirectory: PROFILE_DIRECTORY,
    profileFile: `${PROFILE_DIRECTORY}/${profileName}.cpuprofile`,
    analysisFile: `${PROFILE_DIRECTORY}/${profileName}.md`,
  });
  process.exit(exitCode);
}

if (import.meta.main) await main();
