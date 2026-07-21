#!/usr/bin/env bun
// @see https://bun.com/docs/test/index#run-tests — bun test
// @see https://bun.com/blog/bun-v1.3.13#bun-test-changed — --changed / --changed=REF / --watch
// @see https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel — --isolate / --parallel
// @see https://bun.com/docs/guides/process/argv — Bun.argv
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
/**
 * Day-loop wrapper for `bun test --changed`.
 *
 *   bun run test:changed                 # uncommitted (staged + unstaged + untracked)
 *   bun run test:changed -- HEAD~1       # since commit / tag
 *   bun run test:changed -- main         # since branch
 *   bun run test:changed:watch           # --changed --watch
 *   bun run test:changed -- main --parallel
 *
 * First non-flag arg → `--changed=<ref>`. Remaining args forward to `bun test`.
 * Do not pass a bare ref after raw `bun test --changed` — Bun treats it as a path filter.
 *
 * Graph: import scan only (no node_modules, no link/emit). Empty dirty set → exit 0
 * without `--watch`; with `--watch` the process stays alive. Each watch restart
 * re-queries git (filter tracks the working tree). Any local source edit can
 * trigger a restart — even files not imported by the currently selected tests.
 */
export {};

const raw = Bun.argv.slice(2);
const flags = raw.filter(a => a.startsWith('-'));
const positionals = raw.filter(a => !a.startsWith('-'));
const ref = positionals[0];
const restPositionals = positionals.slice(1);

const bunArgs = ['test', '--pass-with-no-tests'];
bunArgs.push(ref ? `--changed=${ref}` : '--changed');
bunArgs.push(...flags, ...restPositionals);

const proc = Bun.spawn(['bun', ...bunArgs], {
  stdout: 'inherit',
  stderr: 'inherit',
  stdin: 'inherit',
});
process.exit((await proc.exited) ?? 1);
