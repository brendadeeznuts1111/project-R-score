#!/usr/bin/env bun
/**
 * List all packages in the monorepo with their name, version, registry, and triage status.
 *
 * Usage: bun run packages:list [--filter core|active|experimental|archive|scratch]
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const EXCLUDE = new Set([
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
    rel.startsWith('projects/active/kimiremote/')
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

async function* walkFiles(dir: string): AsyncGenerator<string> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (entry === '.git' || entry === 'node_modules') continue;
    let s;
    try {
      s = await stat(full);
    } catch {
      continue;
    }
    if (s.isDirectory()) {
      if (EXCLUDE.has(entry) || entry.startsWith('.')) continue;
      yield* walkFiles(full);
    } else if (entry === 'package.json') {
      yield full;
    }
  }
}

const rows: Array<[string, string, string, string, string]> = [];

for await (const file of walkFiles(ROOT)) {
  let content: string;
  try {
    content = await readFile(file, 'utf-8');
  } catch {
    continue;
  }
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(content);
  } catch {
    continue;
  }
  const name = data.name as string;
  if (!name) continue;
  const ver = (data.version as string) || '--';
  const priv = data.private ? '🔒' : '';
  const pub = (data.publishConfig as Record<string, unknown>) || {};
  const reg = registryLabel((pub.registry as string) || '');
  const tag = triage(path.relative(ROOT, path.dirname(file)));
  const dir = path.relative(ROOT, path.dirname(file));
  if (FILTER && tag !== FILTER) continue;
  rows.push([tag, `${name}${priv}`, ver, reg, dir]);
}

rows.sort((a, b) => `${a[0]}${a[1]}`.localeCompare(`${b[0]}${b[1]}`));

console.info('Package Registry:');
console.info('='.repeat(80));
console.info(
  `| ${'Package'.padEnd(45)} | ${'Version'.padEnd(12)} | ${'Registry'.padEnd(15)} | ${'Triage'.padEnd(12)} |`
);
console.info(`|${'-'.repeat(47)}|${'-'.repeat(14)}|${'-'.repeat(17)}|${'-'.repeat(14)}|`);
for (const [tag, name, ver, reg] of rows) {
  console.info(
    `| ${name.padEnd(45)} | ${ver.padEnd(12)} | ${reg.padEnd(15)} | ${tag.padEnd(12)} |`
  );
}
console.info(`\nTotal: ${rows.length} packages`);
