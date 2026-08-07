#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/bundler/executables#code-signing-on-macos — --verify
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Full Pages publish loop: ops snapshot → registry git gate → optional commit/push → deploy + taxonomy verify.
 *
 *   bun run cloudflare:publish
 *   bun run cloudflare:publish -- --no-routing
 *   bun run cloudflare:publish -- --commit --push
 *
 * Pages builds from GitHub — uncommitted registry drift fails unless --allow-dirty (taxonomy edge will likely fail).
 *
 * @see docs/harness/tenants/cloudflare-pages.md
 */
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import { resolvePath } from '../lib/path-bun.ts';
import { PROOF_TAXONOMY_CONTRACT_COUNT } from '../lib/verification/proof-taxonomy.ts';

const ROOT = resolvePath(import.meta.dir, '..');
const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('cloudflare:publish', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const commit = argv.includes('--commit');
const push = argv.includes('--push');
const allowDirty = argv.includes('--allow-dirty');
const noRouting = argv.includes('--no-routing');

async function run(cmd: string[], opts?: { cwd?: string }) {
  const proc = Bun.spawn(cmd, {
    cwd: opts?.cwd ?? ROOT,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const code = await proc.exited;
  if (code !== 0) process.exit(code ?? 1);
}

async function registryDiff(): Promise<string[]> {
  const proc = Bun.spawn(
    ['git', 'diff', '--name-only', 'public/registry/', 'public/.well-known/'],
    { cwd: ROOT, stdout: 'pipe', stderr: 'pipe' }
  );
  const text = await new Response(proc.stdout).text();
  await proc.exited;
  return text
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
}

async function main() {
  console.log(`Cloudflare Pages publish (${PROOF_TAXONOMY_CONTRACT_COUNT} taxonomy contracts)\n`);

  const snapArgs = ['bun', 'tools/ops-snapshot.ts'];
  if (noRouting) snapArgs.push('--no-routing');
  await run(snapArgs);

  const dirty = await registryDiff();
  if (dirty.length) {
    console.log(`\nRegistry drift (${dirty.length} file(s)):`);
    for (const f of dirty) console.log(`  ${f}`);
    if (commit) {
      await run(['git', 'add', 'public/registry/', 'public/.well-known/']);
      await run([
        'git',
        'commit',
        '-m',
        'chore(proof): refresh registry artifacts for Pages publish',
      ]);
      console.log('✓ committed registry drift');
    } else if (!allowDirty) {
      console.error('\n❌ Uncommitted registry drift — Pages builds from GitHub, not local files.');
      console.error('   bun run cloudflare:publish -- --commit --push');
      console.error('   or commit manually, then re-run');
      process.exit(1);
    } else {
      console.warn('\n⚠ --allow-dirty: deploying without commit (live taxonomy may fail)');
    }
  } else {
    console.log('\n✓ registry artifacts match git (no drift)');
  }

  if (push) {
    await run(['git', 'push', 'origin', 'HEAD']);
  }

  await run(['bun', 'tools/cloudflare-pages-deploy.ts', '--wait', '--verify', '--taxonomy']);
}

if (isModuleEntrypoint(import.meta)) {
  main().catch(e => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
