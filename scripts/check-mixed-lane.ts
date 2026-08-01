#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * check-mixed-lane.ts — warn-only guard against mixed-lane commits.
 *
 * `public/registry/**` bakes are deploy artifacts (Pages serves them from git).
 * A commit that stages bakes together with source files hides generated churn
 * inside a semantic change and makes lane attribution impossible.
 *
 *   bun scripts/check-mixed-lane.ts           # warn (exit 0)
 *   bun scripts/check-mixed-lane.ts --strict  # fail (exit 1) — future ratchet
 *
 * Pre-commit runs the warn mode. Escape hatch for intentional bake+source
 * commits: `--no-verify`, documented in the commit message.
 */

export {};

const STRICT = Bun.argv.includes('--strict');

const REGISTRY = /^public\/registry\//;
const SOURCE = /^(?:lib|tools|scripts|tests|config)\/|^public\/portal\//;

const proc = Bun.spawn(['git', 'diff', '--cached', '--name-only', '--diff-filter=ACMRD'], {
  stdout: 'pipe',
  stderr: 'pipe',
});
const out = await new Response(proc.stdout).text();
if ((await proc.exited) !== 0) {
  console.error('check-mixed-lane: git diff --cached failed');
  process.exit(0); // warn-only: never block on probe failure
}

const staged = out.split('\n').filter(Boolean);
const registry = staged.filter(f => REGISTRY.test(f));
const source = staged.filter(f => SOURCE.test(f));

if (registry.length === 0 || source.length === 0) process.exit(0);

const preview = (files: string[]) =>
  files.length <= 5 ? files.join(', ') : `${files.slice(0, 5).join(', ')} … +${files.length - 5}`;

console.error(
  `⚠️  mixed-lane commit: ${registry.length} bake file(s) under public/registry/** staged ` +
    `with ${source.length} source file(s).\n` +
    `   bakes:  ${preview(registry)}\n` +
    `   source: ${preview(source)}\n` +
    `   Prefer: commit bakes as their own chore(bake): … commit, or git restore public/registry.`
);

process.exit(STRICT ? 1 : 0);
