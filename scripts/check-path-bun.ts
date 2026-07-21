#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
/**
 * Ratchet: TypeScript under lib/ and tools/ must not import node:path or path.
 * Use lib/path-bun (joinPath / resolvePath) instead.
 *
 *   bun run check:path-bun
 */
export {};

const ROOT = process.cwd();
const bad: string[] = [];
const importRe = /^\s*import\s+.+from\s+['"](?:node:)?path['"]/;
const globs = ['lib/**/*.ts', 'tools/**/*.ts'] as const;

for (const pattern of globs) {
  for (const rel of new Bun.Glob(pattern).scanSync({ cwd: ROOT, onlyFiles: true })) {
    if (rel.includes('node_modules')) continue;
    const text = await Bun.file(`${ROOT}/${rel}`).text();
    for (const line of text.split('\n')) {
      if (importRe.test(line)) {
        bad.push(rel);
        break;
      }
    }
  }
}

if (bad.length) {
  console.error('path/node:path imports in lib/|tools/ (use lib/path-bun):');
  for (const f of bad) console.error(' ', f);
  process.exit(1);
}
console.info('lib/ + tools/ have no path/node:path imports (path-bun ratchet)');
