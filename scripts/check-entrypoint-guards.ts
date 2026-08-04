#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/utils#bun-main — Bun.main
// @see https://bun.com/docs/guides/util/entrypoint — import.meta.main
// @see https://bun.com/docs/guides/util/main — Bun.main
/**
 * Ratchet: tools/ CLIs should use isModuleEntrypoint(import.meta), not
 * import.meta.path === Bun.main (easy to get wrong when extracted to a helper).
 *
 *   bun scripts/check-entrypoint-guards.ts
 *   bun scripts/check-entrypoint-guards.ts --write-baseline
 */
import { joinPath } from '../lib/path-bun.ts';

const ROOT = joinPath(import.meta.dir, '..');
const BASELINE = joinPath(ROOT, 'scripts/entrypoint-guards-baseline.json');
const PATH_EQ_MAIN = /import\.meta\.path\s*===\s*Bun\.main/;

async function scan(): Promise<string[]> {
  const hits: string[] = [];
  const glob = new Bun.Glob('tools/**/*.ts');
  for await (const rel of glob.scan({ cwd: ROOT })) {
    if (rel.includes('.test.') || rel.includes('node_modules')) continue;
    const text = await Bun.file(joinPath(ROOT, rel)).text();
    if (PATH_EQ_MAIN.test(text)) hits.push(rel);
  }
  return hits.sort();
}

const write = Bun.argv.includes('--write-baseline');
const found = await scan();

if (write) {
  await Bun.write(
    BASELINE,
    `${JSON.stringify({ schemaVersion: 1, pathEqBunMain: found }, null, 2)}\n`
  );
  console.log(`wrote baseline (${found.length} path===Bun.main sites)`);
  process.exit(0);
}

const baselineFile = Bun.file(BASELINE);
if (!(await baselineFile.exists())) {
  console.error('missing baseline — run with --write-baseline');
  process.exit(1);
}
const baseline = (await baselineFile.json()) as { pathEqBunMain: string[] };
const allowed = new Set(baseline.pathEqBunMain ?? []);
const novel = found.filter(f => !allowed.has(f));
if (novel.length) {
  console.error(
    'New import.meta.path === Bun.main in tools/ (use isModuleEntrypoint(import.meta)):'
  );
  for (const f of novel) console.error(`  ${f}`);
  process.exit(1);
}
console.log(
  `entrypoint guards OK · path===Bun.main=${found.length} (baseline ${allowed.size}) · prefer isModuleEntrypoint(import.meta)`
);
