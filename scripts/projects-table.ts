#!/usr/bin/env bun
// projects-table.ts — Inventory all project directories with Bun.inspect.table
// Run: bun run scripts/projects-table.ts [--root] [--sort name|files|changed]

import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const ROOT = process.cwd();

interface ProjectRow {
  name: string;
  files: number;
  githubUrl: string;
  lastChanged: string; // ISO date
  sizeKb: number;
}

// ── CLI args ──────────────────────────────────────────────────
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

// ── Recursive file counter ────────────────────────────────────
function countFiles(dir: string): number {
  let count = 0;
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const full = join(dir, entry.name);
      try {
        if (entry.isDirectory()) {
          count += countFiles(full);
        } else if (entry.isFile()) {
          count++;
        }
      } catch {
        /* skip permission errors */
      }
    }
  } catch {
    /* skip unreadable dirs */
  }
  return count;
}

// ── Most recent mtime in a tree ───────────────────────────────
function lastModified(dir: string): Date | null {
  let latest: Date | null = null;
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const full = join(dir, entry.name);
      try {
        const s = statSync(full);
        const mtime = s.mtime;
        if (!latest || mtime > latest) latest = mtime;
        if (entry.isDirectory()) {
          const child = lastModified(full);
          if (child && (!latest || child > latest)) latest = child;
        }
      } catch {
        /* skip */
      }
    }
  } catch {
    /* skip */
  }
  return latest;
}

// ── Total size (KB) ───────────────────────────────────────────
function dirSize(dir: string): number {
  let total = 0;
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const full = join(dir, entry.name);
      try {
        const s = statSync(full);
        if (entry.isFile()) total += s.size;
        else if (entry.isDirectory()) total += dirSize(full);
      } catch {
        /* skip */
      }
    }
  } catch {
    /* skip */
  }
  return total;
}

// ── Extract GitHub URL from a project ─────────────────────────
function extractGithubUrl(dir: string): string {
  // Try package.json → repository.url
  const pkgPath = join(dir, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      if (pkg.repository?.url) {
        let url = pkg.repository.url;
        url = url.replace(/^git\+/, '').replace(/\.git$/, '');
        return url;
      }
      if (pkg.homepage) return pkg.homepage;
    } catch {
      /* skip */
    }
  }
  // Try .git/config for remote origin
  const gitConfig = join(dir, '.git', 'config');
  if (existsSync(gitConfig)) {
    try {
      const text = readFileSync(gitConfig, 'utf-8');
      const m = text.match(/url\s*=\s*(.+)/);
      if (m) {
        let url = m[1]!.trim();
        url = url.replace(/^git@github\.com:/, 'https://github.com/').replace(/\.git$/, '');
        return url;
      }
    } catch {
      /* skip */
    }
  }
  return '—';
}

// ── Discover project directories ──────────────────────────────
function discoverProjects(): string[] {
  const skips = new Set([
    'node_modules',
    '.git',
    '.cache',
    '.artifacts',
    'dist',
    'build',
    '.vscode',
    '.cursor',
    '.claude',
    '.codex',
    '.windsurf',
    '.agents',
    '.reasonix',
    '.husky',
    '.github',
    '.audit',
    '.search',
    'logs',
    'tmp',
    'temp',
    'cache',
    'assets',
    'public',
  ]);

  const dirs: string[] = [];
  for (const entry of readdirSync(ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.') && skips.has(entry.name)) continue;
    if (skips.has(entry.name)) continue;
    dirs.push(entry.name);
  }
  return dirs;
}

// ── Main ──────────────────────────────────────────────────────
const projectDirs = discoverProjects();
const rows: ProjectRow[] = [];

for (const dir of projectDirs) {
  const full = join(ROOT, dir);
  const files = flags.deep ? countFiles(full) : readdirSync(full).length;
  const lastMod = lastModified(full);
  const size = dirSize(full);

  rows.push({
    name: dir,
    files,
    githubUrl: extractGithubUrl(full),
    lastChanged: lastMod ? lastMod.toISOString().replace('T', ' ').slice(0, 19) : '—',
    sizeKb: Math.round(size / 1024),
  });
}

// ── Sort ──────────────────────────────────────────────────────
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

// ── Output ────────────────────────────────────────────────────
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
