#!/usr/bin/env bun
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

type AdapterOptions = {
  strict: boolean;
  current?: string;
  baseline?: string;
  governance?: string;
};

function parseArgs(argv: string[]): AdapterOptions {
  return {
    strict: argv.includes('--strict'),
    current: argv.find((a) => a.startsWith('--current='))?.split('=')[1],
    baseline: argv.find((a) => a.startsWith('--baseline='))?.split('=')[1],
    governance: argv.find((a) => a.startsWith('--governance='))?.split('=')[1],
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const root = resolve(import.meta.dir, '..', '..', '..');
  const args = ['run', 'scripts/brand-bench-evaluate.ts', '--json'];

  if (options.strict) args.push('--strict');
  if (options.current) args.push(`--current=${options.current}`);
  if (options.baseline) args.push(`--baseline=${options.baseline}`);
  if (options.governance) args.push(`--governance=${options.governance}`);

  const run = spawnSync('bun', args, { cwd: root, encoding: 'utf8' });
  const output = run.stdout?.trim() || '{}';
  const parsed = JSON.parse(output);

  console.log(
    JSON.stringify(
      {
        mode: 'scratch-adapter',
        canonicalRoot: root,
        strict: Boolean(options.strict),
        status: parsed.status ?? 'unknown',
        anomalyType: parsed.anomalyType ?? 'stable',
        violations: Array.isArray(parsed.violations) ? parsed.violations.length : 0,
        gateMode: parsed.gateMode ?? 'warn',
      },
      null,
      2
    )
  );

  process.exit(run.status ?? 1);
}

if (import.meta.main) {
  await main();
}
