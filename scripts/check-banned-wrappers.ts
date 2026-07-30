#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
// @see https://bun.com/docs/runtime/utils#bun-stripansi — Bun.stripANSI
// @see https://bun.com/docs/runtime/utils#bun-wrapansi — Bun.wrapAnsi
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/toml#bun-toml-parse — Bun.TOML
// @see https://bun.com/reference/bun/TOML/parse — Bun.TOML.parse
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/docs/runtime/utils#bun-escapehtml — Bun.escapeHTML
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * Banned wrapper packages gate — package.json-level.
 *
 * Direct dependencies/devDependencies must not include packages Bun
 * supersedes natively (imports are separately banned at error tier by
 * config/eslint/harness/bun-native.ts; this gate covers the manifest so a
 * wrapper never even gets installed intentionally).
 *
 * Transitive node_modules copies (enquirer → strip-ansi, etc.) are OUT of
 * scope — unavoidable and unimported.
 *
 *   bun run check:banned-wrappers
 */
export {};

const BANNED: Record<string, string> = {
  'wrap-ansi': 'Bun.wrapAnsi',
  'string-width': 'Bun.stringWidth',
  'strip-ansi': 'Bun.stripANSI',
  chalk: 'Bun-native color (inspect/tty)',
  kleur: 'Bun-native color (inspect/tty)',
  'cli-table': 'Bun.inspect.table / lib/table-format',
  'cli-table3': 'Bun.inspect.table / lib/table-format',
  toml: 'Bun.TOML.parse / native toml import',
  '@iarna/toml': 'Bun.TOML.parse / native toml import',
  'escape-html': 'Bun.escapeHTML / lib/escape-html',
  execa: 'Bun.spawn',
  'fs-extra': 'Bun.file / Bun.write',
  axios: 'fetch',
  'better-sqlite3': 'bun:sqlite',
};

const pkg = await Bun.file(`${process.cwd()}/package.json`).json();
const depSets: Array<[string, Record<string, string> | undefined]> = [
  ['dependencies', pkg.dependencies],
  ['devDependencies', pkg.devDependencies],
  ['optionalDependencies', pkg.optionalDependencies],
  ['peerDependencies', pkg.peerDependencies],
];

const hits: string[] = [];
for (const [setName, deps] of depSets) {
  for (const name of Object.keys(deps ?? {})) {
    if (BANNED[name]) hits.push(`${setName}.${name} — use ${BANNED[name]}`);
  }
}

if (hits.length > 0) {
  console.error('❌ Banned wrapper packages in package.json:');
  for (const h of hits) console.error(`  ${h}`);
  process.exit(1);
}
console.info(
  `banned-wrappers OK: no Bun-superseded packages in package.json (${Object.keys(BANNED).length} watched)`
);
