#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * check-package-scripts — block silent package.json script removals.
 *
 * Motivation: PR #149 deleted ~70 operational scripts (proton:*, bake:*,
 * portal:probe:*) inside an unrelated feature diff and nothing flagged it.
 * Script keys are operational surface (AGENTS.md commands, deploy flows) —
 * removing one must be a deliberate, visible act.
 *
 * Modes:
 *   (default)        staged gate — compares index (:package.json) vs HEAD
 *   --against <ref>  compare worktree package.json vs <ref>:package.json
 *
 * Escape: SKIP_SCRIPTS_GUARD=1 — write the reason + evidence in the commit
 * message (same protocol as SKIP_TEST_CHANGED).
 */

export function diffRemovedScripts(
  before: Record<string, string>,
  after: Record<string, string>
): string[] {
  return Object.keys(before)
    .filter(k => !(k in after))
    .sort();
}

async function readScripts(rev: 'staged' | 'worktree' | string): Promise<Record<string, string>> {
  if (rev === 'worktree') {
    const pkg = await Bun.file('package.json').json();
    return pkg.scripts ?? {};
  }
  const spec = rev === 'staged' ? ':package.json' : `${rev}:package.json`;
  const proc = Bun.spawn(['git', 'show', spec], { stdout: 'pipe', stderr: 'pipe' });
  const out = await new Response(proc.stdout).text();
  if ((await proc.exited) !== 0) {
    throw new Error(`git show ${spec} failed: ${await new Response(proc.stderr).text()}`);
  }
  return JSON.parse(out).scripts ?? {};
}

async function main() {
  const argv = applyUnknownLongOptionGuardFor('check:package-scripts', Bun.argv.slice(2));
  const againstIdx = argv.indexOf('--against');
  const worktreeMode = againstIdx !== -1;

  if (!worktreeMode) {
    // Staged gate: nothing to do unless package.json is staged.
    const staged = Bun.spawn(['git', 'diff', '--cached', '--name-only'], { stdout: 'pipe' });
    const names = await new Response(staged.stdout).text();
    await staged.exited;
    if (!names.split('\n').includes('package.json')) {
      console.log('⏭️  package.json not staged — scripts guard skips');
      return;
    }
  }

  const before = await readScripts(worktreeMode ? argv[againstIdx + 1] : 'HEAD');
  const after = await readScripts(worktreeMode ? 'worktree' : 'staged');
  const removed = diffRemovedScripts(before, after);

  if (removed.length === 0) {
    console.log('✅ package-scripts: no script removals');
    return;
  }

  console.error(`❌ package-scripts: ${removed.length} script(s) removed:`);
  for (const key of removed) console.error(`   - ${key}`);
  console.error('');
  console.error('Script keys are operational surface. If every removal is intentional,');
  console.error('re-run with SKIP_SCRIPTS_GUARD=1 and record the reason in the commit message.');

  if (Bun.env.SKIP_SCRIPTS_GUARD === '1') {
    console.error('⏭️  SKIP_SCRIPTS_GUARD=1 — passing with removals acknowledged');
    return;
  }
  process.exit(1);
}

if (import.meta.main) {
  await main();
}
