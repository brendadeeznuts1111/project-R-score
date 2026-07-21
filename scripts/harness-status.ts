#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/test/index#run-tests — bun test
// @see https://bun.com/blog/bun-v1.3.13#bun-test-changed — --changed / --watch
// @see https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel — --isolate / --parallel
// @see https://bun.com/blog/bun-v1.3.13#bun-test-shard-m-n-for-splitting-tests-across-ci-jobs — --shard
/**
 * Tool-legibility surface for the day loop + ratchets (compact).
 *
 *   bun run harness:status
 */
import { CRITICAL_PROOF_PATHS } from '../lib/harness/proof';

const ROOT = `${import.meta.dir}/..`;
const TIMING = `${ROOT}/reports/harness-gate-timing.json`;
const CI_TIMING = `${ROOT}/reports/ci-harness-timing.json`;

type Timing = {
  generatedAt?: string;
  totalMs?: number;
  mode?: string;
  gates?: Array<{ name: string; ms: number; ok: boolean }>;
};

const ratchets: Array<{ cmd: string; purpose: string }> = [
  { cmd: 'bun run type-check', purpose: 'tsc spine (tsconfig.check.json)' },
  { cmd: 'bun run test:changed', purpose: '--changed dirty tree' },
  { cmd: 'bun run test:changed:main', purpose: '--changed=origin/main|--main-head' },
  { cmd: 'bun run test:changed:watch', purpose: '--changed --watch' },
  { cmd: 'bun run ci:harness:fast', purpose: 'local parity (quiet)' },
  { cmd: 'bun run ci:harness', purpose: 'full CI envelope (quiet)' },
  { cmd: 'bun run proof:install', purpose: 'install journey (pre-push / hygiene)' },
  { cmd: 'bun run check:path-bun', purpose: 'no path/node:path in lib/' },
  { cmd: 'bun run check:bun-env', purpose: 'no process.env in lib|scripts' },
];

console.info('FactoryWager harness · docs/harness/README.md');
console.info('');
for (const r of ratchets) {
  console.info(`  ${r.cmd.padEnd(32)}  ${r.purpose}`);
}

console.info('');
console.info(`Proof paths (${CRITICAL_PROOF_PATHS.length})`);
for (const p of CRITICAL_PROOF_PATHS) {
  console.info(`  ${p.id.padEnd(22)}  ${p.kinds.join('+')}  ${p.claim}`);
}

async function showTiming(label: string, path: string): Promise<void> {
  const file = Bun.file(path);
  if (!(await file.exists())) return;
  const t = (await file.json()) as Timing;
  console.info('');
  console.info(
    `${label}: ${t.totalMs ?? '?'}ms` +
      (t.mode ? ` (${t.mode})` : '') +
      (t.generatedAt ? ` · ${t.generatedAt}` : '')
  );
  for (const g of t.gates ?? []) {
    console.info(`  ${g.ok ? '✓' : '✗'} ${g.name} ${g.ms}ms`);
  }
}

await showTiming('Last pre-commit', TIMING);
await showTiming('Last ci:harness', CI_TIMING);
