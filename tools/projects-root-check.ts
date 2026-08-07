#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/glob — Bun.Glob
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * projects-root-check.ts — enforce product-leaf root contract under projects/.
 *
 * Every product leaf and every category/tier index must have README.md;
 * every product leaf must have package.json. Nested workspace packages are ignored.
 *
 * Usage:
 *   bun tools/projects-root-check.ts
 *   bun tools/projects-root-check.ts --json
 *   bun run projects:roots:check
 */
import { joinPath, resolvePath } from '../lib/path-bun';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('projects:roots:check', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const REPO = resolvePath(import.meta.dir, '..');

const ACTIVE_SPECIALS = new Set([
  'factorywager',
  'sports-terminal-os',
  'kimiremote',
  'f402-openapi',
  'playwriter-skill',
]);

const CATEGORY_DIRS = new Set([
  'analysis',
  'automation',
  'dashboards',
  'development',
  'enterprise',
  'tools',
  'utilities',
]);

type Issue = { kind: 'missing-readme' | 'missing-package' | 'unexpected'; path: string };

async function isDir(abs: string): Promise<boolean> {
  const p = Bun.spawn(['test', '-d', abs], { stdout: 'ignore', stderr: 'ignore' });
  return (await p.exited) === 0;
}

async function exists(abs: string): Promise<boolean> {
  if (await Bun.file(abs).exists()) return true;
  return isDir(abs);
}

async function listDirs(abs: string): Promise<string[]> {
  const out: string[] = [];
  for await (const name of new Bun.Glob('*').scan({ cwd: abs, onlyFiles: false })) {
    if (name.includes('/')) continue;
    if (name.startsWith('.')) continue;
    const child = joinPath(abs, name);
    if (await isDir(child)) out.push(name);
  }
  return out.sort();
}

async function checkLeaf(rel: string, issues: Issue[]): Promise<void> {
  const abs = joinPath(REPO, rel);
  if (!(await exists(joinPath(abs, 'README.md')))) {
    issues.push({ kind: 'missing-readme', path: rel });
  }
  if (!(await exists(joinPath(abs, 'package.json')))) {
    issues.push({ kind: 'missing-package', path: rel });
  }
}

async function checkIndex(rel: string, issues: Issue[]): Promise<void> {
  if (!(await exists(joinPath(REPO, rel, 'README.md')))) {
    issues.push({ kind: 'missing-readme', path: `${rel}/README.md` });
  }
}

async function main(): Promise<void> {
  const asJson = argv.includes('--json');
  const issues: Issue[] = [];
  let leaves = 0;

  await checkIndex('projects', issues);
  await checkIndex('projects/active', issues);
  await checkIndex('projects/experimental', issues);
  await checkIndex('projects/archive', issues);

  const activeRoot = joinPath(REPO, 'projects/active');
  for (const name of await listDirs(activeRoot)) {
    if (ACTIVE_SPECIALS.has(name)) {
      leaves++;
      await checkLeaf(`projects/active/${name}`, issues);
      continue;
    }
    if (!CATEGORY_DIRS.has(name)) {
      issues.push({
        kind: 'unexpected',
        path: `projects/active/${name}`,
      });
      continue;
    }
    await checkIndex(`projects/active/${name}`, issues);
    for (const child of await listDirs(joinPath(activeRoot, name))) {
      leaves++;
      await checkLeaf(`projects/active/${name}/${child}`, issues);
    }
  }

  for (const tier of ['experimental', 'archive'] as const) {
    const tierRoot = joinPath(REPO, `projects/${tier}`);
    if (!(await isDir(tierRoot))) continue;
    for (const name of await listDirs(tierRoot)) {
      leaves++;
      await checkLeaf(`projects/${tier}/${name}`, issues);
    }
  }

  if (asJson) {
    process.stdout.write(`${JSON.stringify({ leaves, count: issues.length, issues }, null, 2)}\n`);
  } else if (issues.length === 0) {
    console.info(`✅ projects-root-check: ${leaves} product leaves, indexes OK`);
  } else {
    console.info(`\n❌ projects-root-check: ${issues.length} issue(s) (${leaves} leaves)\n`);
    for (const i of issues) {
      console.info(`  [${i.kind}] ${i.path}`);
    }
    console.info('');
  }

  if (issues.length > 0) process.exitCode = 1;
}

if (import.meta.main) {
  await main();
}
