#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/glob — Bun.Glob
/**
 * lib-domains-check.ts — enforce domain README indexes under lib/.
 *
 * Every first-level directory under lib/ must have README.md.
 * lib/README.md itself must exist (spine + domain inventory SSOT).
 *
 * Usage:
 *   bun tools/lib-domains-check.ts
 *   bun tools/lib-domains-check.ts --json
 *   bun run lib:domains:check
 */
import { joinPath, resolvePath } from '../lib/path-bun';

const REPO = resolvePath(import.meta.dir, '..');
const LIB = joinPath(REPO, 'lib');

type Issue = { kind: 'missing-readme'; path: string };

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
    if (name === 'node_modules') continue;
    const child = joinPath(abs, name);
    if (await isDir(child)) out.push(name);
  }
  return out.sort();
}

async function main(): Promise<void> {
  const asJson = Bun.argv.includes('--json');
  const issues: Issue[] = [];

  if (!(await exists(joinPath(LIB, 'README.md')))) {
    issues.push({ kind: 'missing-readme', path: 'lib/README.md' });
  }

  const domains = await listDirs(LIB);
  for (const name of domains) {
    const rel = `lib/${name}/README.md`;
    if (!(await exists(joinPath(LIB, name, 'README.md')))) {
      issues.push({ kind: 'missing-readme', path: rel });
    }
  }

  if (asJson) {
    process.stdout.write(
      `${JSON.stringify({ domains: domains.length, count: issues.length, issues }, null, 2)}\n`
    );
  } else if (issues.length === 0) {
    console.info(`✅ lib-domains-check: ${domains.length} domains, indexes OK`);
  } else {
    console.info(`\n❌ lib-domains-check: ${issues.length} issue(s) (${domains.length} domains)\n`);
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
