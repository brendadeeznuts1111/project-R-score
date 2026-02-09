#!/usr/bin/env bun
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const outDir = resolve(process.cwd(), 'scratch/bun-v1.3.9-examples/benchmarks/reports');
await mkdir(outDir, { recursive: true });

const child = Bun.spawnSync([
  'bun',
  'run',
  'scripts/brand-bench-runner.ts',
  '--iterations=1200',
  '--warmup=120',
  `--output-dir=${outDir}`,
], {
  cwd: process.cwd(),
  stdout: 'inherit',
  stderr: 'inherit',
});

if (child.exitCode !== 0) {
  process.exit(child.exitCode ?? 1);
}

console.log(JSON.stringify({
  ok: true,
  mode: 'scratch-adapter',
  outputDir: outDir,
  note: 'Experimental scratch evaluation only; canonical artifacts are under reports/brand-bench.',
}, null, 2));
