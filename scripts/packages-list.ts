#!/usr/bin/env bun

import { readJson, resolvePath, scanFilesSync } from './lib/fs-bun';
/**
 * List packages in the monorepo with name, version, registry, and triage status.
 *
 * Usage:
 *   bun run packages:list
 *   bun run packages:list --filter=core|active|experimental|archive|scratch
 *   bun run packages:list --include-scaffolds   # show {{name}} / template noise
 *   bun run packages:list --paths               # add directory column
 *
 * @see https://bun.com/docs/runtime/glob — Bun.Glob
 * @see https://bun.com/docs/runtime/file-io — Bun.file
 */

const ROOT = resolvePath();
const SKIP_SEGMENTS = new Set([
  'node_modules',
  '.npm-cache',
  '.git',
  '.cache',
  'dist',
  'build',
  'coverage',
  '.wrangler',
]);
const FILTER = process.argv.find(a => a.startsWith('--filter='))?.split('=')[1] || '';
const INCLUDE_SCAFFOLDS = process.argv.includes('--include-scaffolds');
const SHOW_PATHS = process.argv.includes('--paths');

function shouldSkipRel(rel: string): boolean {
  return rel.split('/').some(seg => seg.startsWith('.') || SKIP_SEGMENTS.has(seg));
}

function dirOfPackageJson(rel: string): string {
  const i = rel.lastIndexOf('/');
  return i === -1 ? '.' : rel.slice(0, i);
}

function triage(rel: string): string {
  if (rel.startsWith('archive') || rel.includes('/archive/')) return 'archive';
  if (rel.includes('/experimental/')) return 'experimental';
  if (rel.includes('/scratch/')) return 'scratch';
  if (
    rel === '.' ||
    rel.startsWith('packages/') ||
    rel.startsWith('lib/') ||
    rel.startsWith('tools/') ||
    rel.startsWith('server/') ||
    rel.startsWith('config/')
  )
    return 'core';
  if (
    rel.startsWith('projects/active/factorywager/') ||
    rel.startsWith('projects/active/kimiremote/') ||
    rel.startsWith('projects/active/sports-terminal-os')
  )
    return 'core';
  return 'active';
}

function registryLabel(reg: string): string {
  if (!reg) return 'npm';
  if (reg.includes('registry.factory-wager.com')) return 'factory-wager';
  if (reg.includes('npm.factory-wager.com')) return 'npm.factory-wager';
  if (reg.includes('registry.duoplus.com')) return 'duoplus';
  if (reg.includes('npm.pkg.github.com')) return 'github';
  if (reg.includes('internal.yourcompany.com')) return 'internal';
  if (reg.includes('fire22')) return 'fire22';
  if (reg.includes('registry.devhq.com')) return 'devhq';
  if (reg.includes('registry.npmjs.org')) return 'npmjs';
  return reg;
}

/** Scaffold / demo package.json noise — hide by default. */
function isScaffoldNoise(name: string, dir: string): boolean {
  if (name.includes('{{') || name.includes('}}')) return true;
  if (name === '__test__' || name === 'test' || name === 'name') return true;
  const norm = dir.replace(/\\/g, '/');
  if (
    /\/templates?\//.test(`/${norm}/`) ||
    /(^|\/)templates?(\/|$)/.test(norm) ||
    /(^|\/)__test__(\/|$)/.test(norm) ||
    /(^|\/)fixtures?(\/|$)/.test(norm) ||
    /(^|\/)scaffold(\/|$)/.test(norm)
  )
    return true;
  if (norm.includes('/create/template') || norm.includes('/@systems-dashboard/template'))
    return true;
  return false;
}

const rows: Array<[string, string, string, string, string]> = [];
let skippedScaffolds = 0;

for (const rel of scanFilesSync('**/package.json', { cwd: ROOT })) {
  if (shouldSkipRel(rel)) continue;
  const full = resolvePath(ROOT, rel);
  let data: Record<string, unknown>;
  try {
    data = await readJson<Record<string, unknown>>(full);
  } catch {
    continue;
  }
  const name = data.name as string;
  if (!name) continue;
  const dir = dirOfPackageJson(rel);
  if (!INCLUDE_SCAFFOLDS && isScaffoldNoise(name, dir)) {
    skippedScaffolds++;
    continue;
  }
  const ver = (data.version as string) || '--';
  const priv = data.private ? '🔒' : '';
  const pub = (data.publishConfig as Record<string, unknown>) || {};
  const reg = registryLabel((pub.registry as string) || '');
  const tag = triage(dir);
  if (FILTER && tag !== FILTER) continue;
  rows.push([tag, `${name}${priv}`, ver, reg, dir]);
}

rows.sort((a, b) => `${a[0]}${a[1]}`.localeCompare(`${b[0]}${b[1]}`));

console.info('Package Registry:');
console.info('='.repeat(80));
if (SHOW_PATHS) {
  console.info(
    `| ${'Package'.padEnd(40)} | ${'Version'.padEnd(10)} | ${'Registry'.padEnd(12)} | ${'Triage'.padEnd(10)} | Directory`
  );
  console.info(
    `|${'-'.repeat(42)}|${'-'.repeat(12)}|${'-'.repeat(14)}|${'-'.repeat(12)}|${'-'.repeat(20)}`
  );
  for (const [tag, name, ver, reg, dir] of rows) {
    console.info(
      `| ${name.padEnd(40)} | ${ver.padEnd(10)} | ${reg.padEnd(12)} | ${tag.padEnd(10)} | ${dir}`
    );
  }
} else {
  console.info(
    `| ${'Package'.padEnd(45)} | ${'Version'.padEnd(12)} | ${'Registry'.padEnd(15)} | ${'Triage'.padEnd(12)} |`
  );
  console.info(`|${'-'.repeat(47)}|${'-'.repeat(14)}|${'-'.repeat(17)}|${'-'.repeat(14)}|`);
  for (const [tag, name, ver, reg] of rows) {
    console.info(
      `| ${name.padEnd(45)} | ${ver.padEnd(12)} | ${reg.padEnd(15)} | ${tag.padEnd(12)} |`
    );
  }
}
console.info(`\nTotal: ${rows.length} packages`);
if (skippedScaffolds > 0) {
  console.info(`Skipped scaffolds: ${skippedScaffolds} (pass --include-scaffolds to show)`);
}
