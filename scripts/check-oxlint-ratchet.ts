#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/bundler/bytecode#with-standalone-executables — --format
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
/**
 * oxlint warnings ratchet: total warning count across lib/ + scripts/ + tools/
 * may only go DOWN vs scripts/oxlint-warnings-baseline.json.
 *
 *   bun run check:oxlint-ratchet                 # enforce (pre-commit runs this)
 *   bun scripts/check-oxlint-ratchet.ts --write-baseline   # owners: re-pin after burn-down
 *
 * Scans the git index tree (HEAD ∪ staged, via scripts/lib/index-tree.ts) —
 * NOT the worktree — so another lane's uncommitted dirty files can never
 * fail your commit. Re-pins likewise record the committed state.
 *
 * Why oxlint (not the repo's eslint pipeline): 95 rules in ~30ms with no config
 * surface — a cheap smoke layer. The eslint pipeline stays the semantic one.
 * Warnings (not errors) are invisible without a ratchet: they only ever grow.
 */
export {};

import { withIndexTree } from './lib/index-tree.ts';

const ROOT = process.cwd();
const BASELINE_PATH = `${ROOT}/scripts/oxlint-warnings-baseline.json`;
const WRITE_BASELINE = Bun.argv.includes('--write-baseline');

interface Baseline {
  total: number;
  files: Record<string, number>;
}

const out = await withIndexTree(['lib', 'scripts', 'tools'], async dir => {
  const proc = Bun.spawn(
    ['bunx', 'oxlint', '--format', 'unix', `${dir}/lib`, `${dir}/scripts`, `${dir}/tools`],
    {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    }
  );
  const text = await new Response(proc.stdout).text();
  await proc.exited;
  // oxlint prints paths as passed (abs tmp root) — strip back to repo-relative.
  return text.split(`${dir}/`).join('');
});

const files: Record<string, number> = {};
let total = 0;
for (const line of out.split('\n')) {
  const m = line.match(/^([^:]+\.ts):\d+:\d+: .+ \[Warning\//);
  if (!m || !m[1]) continue;
  files[m[1]] = (files[m[1]] ?? 0) + 1;
  total++;
}

if (WRITE_BASELINE) {
  const current: Baseline = { total, files };
  await Bun.write(BASELINE_PATH, `${JSON.stringify(current, null, 2)}\n`);
  console.info(
    `oxlint-warnings baseline written: ${total} warnings across ${Object.keys(files).length} files`
  );
  process.exit(0);
}

let baseline: Baseline = { total: 0, files: {} };
try {
  baseline = { ...baseline, ...(await Bun.file(BASELINE_PATH).json()) };
} catch {
  console.error('missing scripts/oxlint-warnings-baseline.json — run with --write-baseline');
  process.exit(1);
}

if (total > baseline.total) {
  console.error(
    `oxlint warnings ratchet: ${total} > baseline ${baseline.total} (may only go down):`
  );
  for (const [f, n] of Object.entries(files).sort((a, b) => b[1] - a[1])) {
    const was = baseline.files[f] ?? 0;
    if (n > was) console.error(`  ⚠️  ${f}: ${was} → ${n}`);
  }
  console.error(
    'Fix the new warnings, or `bun scripts/check-oxlint-ratchet.ts --write-baseline` after a burn-down.'
  );
  process.exit(1);
}
console.info(`oxlint-warnings OK: ${total}/${baseline.total} warnings (ratchet)`);
