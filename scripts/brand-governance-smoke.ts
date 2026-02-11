#!/usr/bin/env bun
import { spawnSync } from 'node:child_process';
import { createShutdown } from './lib/graceful-shutdown';

type CmdResult = {
  cmd: string[];
  exitCode: number | null;
  ok: boolean;
  output: string;
  error: string;
};

function run(cmd: string[]): CmdResult {
  const run = spawnSync(cmd[0] || 'bun', cmd.slice(1), {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  return {
    cmd,
    exitCode: run.status,
    ok: (run.status ?? 1) === 0,
    output: run.stdout || '',
    error: run.stderr || '',
  };
}

async function main(): Promise<void> {
  const shutdown = createShutdown({ name: 'brand-governance-smoke' });
  const strict = process.argv.slice(2).includes('--strict');
  const steps: CmdResult[] = [];

  const cmds: string[][] = [
    ['bun', 'run', 'decision:evidence:verify'],
    ['bun', 'run', 'brand:bench:run', '--iterations=1200', '--warmup=120', '--scenario-iterations=3'],
    ['bun', 'run', 'brand:bench:evaluate'],
  ];
  if (strict) {
    cmds.push(['bun', 'run', 'scripts/brand-bench-evaluate.ts', '--json', '--strict']);
  }

  for (const cmd of cmds) {
    if (shutdown.requested) break;
    steps.push(run(cmd));
  }

  shutdown.dispose();
  const summary = {
    strict,
    interrupted: shutdown.requested,
    ok: !shutdown.requested && steps.every((step) => step.ok),
    steps: steps.map((step) => ({
      cmd: step.cmd.join(' '),
      ok: step.ok,
      exitCode: step.exitCode,
    })),
  };
  console.log(JSON.stringify(summary, null, 2));
  process.exit(summary.ok ? 0 : 1);
}

if (import.meta.main) {
  await main();
}

