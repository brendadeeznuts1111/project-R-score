#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * Fail closed: every lib/harness/*.ts module is imported somewhere outside itself.
 *
 *   bun run check:harness-orphans
 */
import { joinPath } from '../lib/path-bun';

const ROOT = joinPath(import.meta.dir, '..');
const HARNESS = joinPath(ROOT, 'lib/harness');

const SKIP = new Set(['index.ts']); // optional barrel — ok if missing importers

const modules: string[] = [];
for await (const rel of new Bun.Glob('*.ts').scan({ cwd: HARNESS, onlyFiles: true })) {
  if (rel.endsWith('.test.ts') || rel.endsWith('.d.ts')) continue;
  if (SKIP.has(rel)) continue;
  modules.push(rel.replace(/\.ts$/, ''));
}

const searchRoots = ['lib', 'spine', 'scripts', 'tests', 'tools'];
const corpus: string[] = [];
for (const root of searchRoots) {
  for await (const rel of new Bun.Glob('**/*.{ts,tsx,md}').scan({
    cwd: joinPath(ROOT, root),
    onlyFiles: true,
  })) {
    if (rel.includes('node_modules')) continue;
    const abs = joinPath(ROOT, root, rel);
    // Skip the module file itself when matching its own name later
    corpus.push(`${abs}\0${await Bun.file(abs).text()}`);
  }
}

const orphans: string[] = [];
for (const mod of modules) {
  const needleA = `lib/harness/${mod}`;
  const needleB = `../harness/${mod}`;
  const needleC = `./${mod}`;
  const selfPath = joinPath(HARNESS, `${mod}.ts`);
  let hits = 0;
  for (const entry of corpus) {
    const [path, text] = entry.split('\0') as [string, string];
    if (path === selfPath) continue;
    if (text.includes(needleA) || text.includes(needleB)) {
      hits++;
      continue;
    }
    // Same-directory relative import from another harness file
    if (path.startsWith(HARNESS) && text.includes(needleC)) {
      hits++;
    }
  }
  if (hits === 0) orphans.push(mod);
}

if (orphans.length > 0) {
  console.error('❌ orphan lib/harness modules (no importers):');
  for (const o of orphans) console.error(`  · ${o}`);
  process.exit(1);
}
console.info(`✅ harness orphans · ${modules.length} modules linked`);
process.exit(0);
