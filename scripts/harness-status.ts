#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/test/index#run-tests — bun test
// @see https://bun.com/blog/bun-v1.3.13 — --isolate / --parallel / --shard / --changed
/**
 * Tool-legibility surface for the day loop + ratchets.
 * Quiet success; lists discover → invoke → verify commands.
 *
 *   bun run harness:status
 */
import { CRITICAL_PROOF_PATHS } from '../lib/harness/proof';

const ROOT = `${import.meta.dir}/..`;
const TIMING = `${ROOT}/reports/harness-gate-timing.json`;

type Timing = {
  generatedAt?: string;
  totalMs?: number;
  gates?: Array<{ name: string; ms: number; ok: boolean }>;
};

const ratchets: Array<{ cmd: string; purpose: string }> = [
  { cmd: 'bun run type-check', purpose: 'Day-loop tsc (tsconfig.check.json spine)' },
  { cmd: 'bun run build:affected', purpose: 'Git-true workspace build' },
  { cmd: 'bun run test:affected', purpose: 'Git-true workspace package test scripts' },
  { cmd: 'bun run test:changed', purpose: 'Bun import-graph filter (bun test --changed)' },
  { cmd: 'bun run test:parallel', purpose: 'Full suite workers (bun test --parallel)' },
  { cmd: 'bun run proof:install', purpose: 'Journey: factory install layout healthy' },
  { cmd: 'bun run check:path-bun', purpose: 'No path/node:path under lib/' },
  { cmd: 'bun run check:bun-env', purpose: 'No process.env under lib/ + scripts/' },
  { cmd: 'bun run check:brands', purpose: 'Actionable unbranded IDs (smart)' },
  { cmd: 'bun tools/doc-map-check.ts', purpose: 'CANONICAL_* + SSOT link integrity' },
];

console.info('FactoryWager harness status');
console.info('JIT index: docs/harness/README.md');
console.info('Review: docs/harness/REVIEW.md');
console.info('');

console.info('Day loop / ratchets');
for (const r of ratchets) {
  console.info(`  ${r.cmd.padEnd(36)}  ${r.purpose}`);
}

console.info('');
console.info('Proof paths (claim → evidence)');
for (const p of CRITICAL_PROOF_PATHS) {
  console.info(`  ${p.id.padEnd(20)}  ${p.claim}`);
  console.info(`  ${''.padEnd(20)}  evidence: ${p.evidence.join(' · ')}`);
}

const timingFile = Bun.file(TIMING);
if (await timingFile.exists()) {
  const t = (await timingFile.json()) as Timing;
  console.info('');
  console.info(
    `Last pre-commit gate sum: ${t.totalMs ?? '?'}ms` + (t.generatedAt ? ` @ ${t.generatedAt}` : '')
  );
  if (t.gates?.length) {
    const top = [...t.gates].sort((a, b) => b.ms - a.ms).slice(0, 5);
    for (const g of top) {
      console.info(`  ${g.name.padEnd(22)}  ${g.ms}ms  ${g.ok ? 'ok' : 'FAIL'}`);
    }
  }
} else {
  console.info('');
  console.info('No reports/harness-gate-timing.json yet (run a harness pre-commit).');
}

console.info('');
console.info('Improve one job: .agents/skills/harness-improve/SKILL.md');
console.info('Authority / lanes: docs/harness/AUTHORITY.md');
