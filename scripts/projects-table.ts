#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect.table
// projects-table.ts — Inventory all project directories with Bun.inspect.table
// Run: bun run scripts/projects-table.ts [--sort name|files|changed] [--deep]

import {
  countFiles,
  dirSizeBytes,
  discoverRootProjectNames,
  extractGithubUrl,
  joinPath,
  lastModified,
  parseScanFlags,
} from '../lib/projects-scan.ts';

const ROOT = process.cwd();

interface ProjectRow {
  name: string;
  files: number;
  githubUrl: string;
  lastChanged: string;
  sizeKb: number;
}

function shallowEntryCount(dir: string): number {
  return [...new Bun.Glob('*').scanSync({ cwd: dir, onlyFiles: false, dot: false })].filter(
    name => !name.includes('/')
  ).length;
}

const flags = parseScanFlags(Bun.argv, {
  sort: { type: 'string', default: 'name' },
  deep: { type: 'boolean', default: false },
  json: { type: 'boolean', default: false },
  color: { type: 'boolean', default: true },
});

const rows: ProjectRow[] = [];

for (const dir of discoverRootProjectNames(ROOT)) {
  const full = joinPath(ROOT, dir);
  const lastMod = lastModified(full);
  const size = dirSizeBytes(full);

  rows.push({
    name: dir,
    files: flags.deep ? countFiles(full) : shallowEntryCount(full),
    githubUrl: await extractGithubUrl(full),
    lastChanged: lastMod ? lastMod.toISOString().replace('T', ' ').slice(0, 19) : '—',
    sizeKb: Math.round(size / 1024),
  });
}

const sortKey = flags.sort as string;
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
