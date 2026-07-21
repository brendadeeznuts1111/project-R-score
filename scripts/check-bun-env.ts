#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/environment-variables — Bun.env
/**
 * Ratchet: TypeScript under lib/ and scripts/ must not *use* process.env.
 * Prefer Bun.env. Catalog / migrator tooling is allowlisted.
 *
 *   bun run check:bun-env
 */
export {};

const ROOT = process.cwd();

/** Files that intentionally mention process.env outside string literals (migrators, this ratchet). */
const ALLOW = new Set([
  'scripts/lib/migrate-runtime.ts',
  'scripts/check-bun-env.ts',
]);

const bad: string[] = [];
const usageRe = /\bprocess\.env\b/;

/** Drop comments + string/template literals so doc mentions do not trip the ratchet. */
function codeOnly(line: string): string {
  return line
    .replace(/\/\/.*$/, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(['"`])(?:\\.|(?!\1).)*\1/g, '""');
}

for (const dir of ['lib', 'scripts'] as const) {
  for (const rel of new Bun.Glob(`${dir}/**/*.ts`).scanSync({ cwd: ROOT, onlyFiles: true })) {
    if (rel.includes('node_modules')) continue;
    if (ALLOW.has(rel)) continue;
    const text = await Bun.file(`${ROOT}/${rel}`).text();
    for (const line of text.split('\n')) {
      if (usageRe.test(codeOnly(line))) {
        bad.push(rel);
        break;
      }
    }
  }
}

if (bad.length) {
  console.error('process.env usage in lib/|scripts/ (use Bun.env):');
  for (const f of bad) console.error(' ', f);
  process.exit(1);
}
console.info('lib/ + scripts/ have no process.env usages (Bun.env ratchet)');
