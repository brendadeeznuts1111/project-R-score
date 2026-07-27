#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/test/index#run-tests — bun test
// @see https://bun.com/blog/bun-v1.3.13#bun-test-changed — --changed / --changed=REF / --watch
// @see https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel — --isolate / --parallel
// @see https://bun.com/docs/guides/process/argv — Bun.argv
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
/**
 * Day-loop wrapper for `bun test --changed` (+ parallel by default).
 *
 *   bun run test:changed                 # uncommitted · --parallel
 *   bun run test:changed -- HEAD~1
 *   bun run test:changed -- main
 *   bun run test:changed -- --main-head  # origin/main → main → HEAD~1
 *   bun run test:changed:main
 *   bun run test:changed:watch
 *   bun run test:changed -- --serial     # opt out of --parallel
 *   BUN_TEST_SERIAL=1 bun run test:changed
 *
 * Short-circuit: if the change set has no code-like files, exit 0 without
 * booting the Bun test import graph (~1–2s saved on docs-only diffs).
 */
import { hasCodeLikeChange, listChangedFiles, resolveMainHead } from './lib/git-changed';

const raw = Bun.argv.slice(2);
const wantMainHead = raw.includes('--main-head');
const wantSerial =
  raw.includes('--serial') || Bun.env.BUN_TEST_SERIAL === '1' || Bun.env.BUN_TEST_SERIAL === 'true';
const stripped = raw.filter(a => a !== '--main-head' && a !== '--serial');
const flags = stripped.filter(a => a.startsWith('-'));
const positionals = stripped.filter(a => !a.startsWith('-'));
const restPositionals = wantMainHead ? positionals : positionals.slice(1);
const ref = wantMainHead ? await resolveMainHead() : positionals[0];
const watch = flags.includes('--watch');

if (!watch) {
  const changed = await listChangedFiles({
    since: ref,
    dirty: true,
  });
  if (changed.length === 0 || !hasCodeLikeChange(changed)) {
    const why = changed.length === 0 ? 'empty change set' : 'no code-like files in change set';
    console.info(`✓ test:changed — skip (${why}${ref ? `; since ${ref}` : ''})`);
    process.exit(0);
  }
}

const bunArgs = ['test', '--pass-with-no-tests'];
bunArgs.push(ref ? `--changed=${ref}` : '--changed');

// Parallel implies --isolate (fresh global per file). Opt out with --serial.
const hasParallel = flags.some(f => f === '--parallel' || f.startsWith('--parallel='));
if (!wantSerial && !hasParallel) {
  bunArgs.push('--parallel');
}

bunArgs.push(...flags, ...restPositionals);

const proc = Bun.spawn(['bun', ...bunArgs], {
  stdout: 'inherit',
  stderr: 'inherit',
  stdin: 'inherit',
});
process.exit((await proc.exited) ?? 1);
