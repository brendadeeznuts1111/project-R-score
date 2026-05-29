#!/usr/bin/env bun
// projects-table.ts — Inventory all project directories with Bun.inspect.table
// Run: bun run scripts/projects-table.ts [--root] [--sort name|files|changed]

import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import {
  countFiles,
  dirSizeBytes,
  discoverRootProjectNames,
  extractGithubUrl,
  lastModified,
} from '../lib/projects-scan.ts';

const ROOT = process.cwd();

interface ProjectRow {
  name: string;
  files: number;
  githubUrl: string;
  lastChanged: string;
  sizeKb: number;
}

const { values: flags } = parseArgs({
  args: Bun.argv,
  options: {
    sort: { type: 'string', default: 'name' },
    deep: { type: 'boolean', default: false },
    json: { type: 'boolean', default: false },
    color: { type: 'boolean', default: true },
  },
  strict: false,
  allowPositionals: true,
});

const projectDirs = discoverRootProjectNames(ROOT);
const rows: ProjectRow[] = [];

for (const dir of projectDirs) {
  const full = join(ROOT, dir);
  const files = flags.deep ? countFiles(full) : readdirSync(full).length;
  const lastMod = lastModified(full);
  const size = dirSizeBytes(full);

  rows.push({
    name: dir,
    files,
    githubUrl: extractGithubUrl(full),
    lastChanged: lastMod ? lastMod.toISOString().replace('T', ' ').slice(0, 19) : '—',
    sizeKb: Math.round(size / 1024),
  });
}

const sortKey = flags.sort as 'name' | 'files' | 'changed' | 'size';
if (sortKey === 'files') {
  rows.sort((a, b) => b.files - a.files);
} else if (sortKey === 'changed') {
  rows.sort((a, b) => (b.lastChanged > a.lastChanged ? 1 : -1));
} else if (sortKey === 'size') {
  rows.sort((a, b) => b.sizeKb - a.sizeKb);
} else {
  rows.sort((a, b) => a.name.localeCompare(b.name));
}

if (flags.json) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  console.log(
    Bun.inspect.table(
      rows.map(r => ({
        Project: r.name,
        Files: r.files.toLocaleString(),
        'Size (KB)': r.sizeKb.toLocaleString(),
        'Last Changed': r.lastChanged,
        GitHub: r.githubUrl !== '—' ? r.githubUrl : '—',
      })),
      undefined,
      { colors: flags.color as boolean }
    )
  );
}
