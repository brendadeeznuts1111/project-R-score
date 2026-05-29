// lib/projects-scan.ts — Shared filesystem scan helpers for project inventory tools

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export type GitStatus = 'none' | 'clean' | 'dirty';

export interface WalkStats {
  fileCount: number;
  sizeKb: number;
  lastChanged: string;
}

const SKIP_DIR_NAMES = new Set(['node_modules', 'dist', 'build']);

export function shouldSkipEntry(name: string): boolean {
  return name.startsWith('.') || SKIP_DIR_NAMES.has(name);
}

export const ROOT_PROJECT_SKIPS = new Set([
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

export function countFiles(dir: string): number {
  let count = 0;
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (shouldSkipEntry(entry.name)) continue;
      const full = join(dir, entry.name);
      try {
        if (entry.isDirectory()) count += countFiles(full);
        else if (entry.isFile()) count++;
      } catch {
        /* permission */
      }
    }
  } catch {
    /* unreadable */
  }
  return count;
}

export function dirSizeBytes(dir: string): number {
  let total = 0;
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (shouldSkipEntry(entry.name)) continue;
      const full = join(dir, entry.name);
      try {
        const s = statSync(full);
        if (entry.isFile()) total += s.size;
        else if (entry.isDirectory()) total += dirSizeBytes(full);
      } catch {
        /* permission */
      }
    }
  } catch {
    /* unreadable */
  }
  return total;
}

export function lastModified(dir: string): Date | null {
  let latest: Date | null = null;
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (shouldSkipEntry(entry.name)) continue;
      const full = join(dir, entry.name);
      try {
        const s = statSync(full);
        if (!latest || s.mtime > latest) latest = s.mtime;
        if (entry.isDirectory()) {
          const child = lastModified(full);
          if (child && (!latest || child > latest)) latest = child;
        }
      } catch {
        /* permission */
      }
    }
  } catch {
    /* unreadable */
  }
  return latest;
}

export function walkStats(dir: string): WalkStats {
  let fileCount = 0;
  let totalSize = 0;
  let latestMtime = 0;

  const walk = (d: string) => {
    try {
      for (const entry of readdirSync(d, { withFileTypes: true })) {
        if (shouldSkipEntry(entry.name)) continue;
        const fp = join(d, entry.name);
        if (entry.isDirectory()) {
          walk(fp);
        } else {
          fileCount++;
          try {
            const s = statSync(fp);
            totalSize += s.size;
            if (s.mtimeMs > latestMtime) latestMtime = s.mtimeMs;
          } catch {
            /* permission */
          }
        }
      }
    } catch {
      /* unreadable */
    }
  };

  walk(dir);
  return {
    fileCount,
    sizeKb: Math.round(totalSize / 1024),
    lastChanged: latestMtime > 0 ? new Date(latestMtime).toISOString().slice(0, 10) : '—',
  };
}

export function extractGithubUrl(dir: string): string {
  const pkgPath = join(dir, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as {
        repository?: { url?: string } | string;
        homepage?: string;
      };
      if (pkg.repository && typeof pkg.repository === 'object' && pkg.repository.url) {
        return pkg.repository.url.replace(/^git\+/, '').replace(/\.git$/, '');
      }
      if (typeof pkg.repository === 'string') {
        return pkg.repository.replace(/^git\+/, '').replace(/\.git$/, '');
      }
      if (pkg.homepage) return pkg.homepage;
    } catch {
      /* invalid package.json */
    }
  }

  const gitConfig = join(dir, '.git', 'config');
  if (existsSync(gitConfig)) {
    try {
      const text = readFileSync(gitConfig, 'utf-8');
      const m = text.match(/url\s*=\s*(.+)/);
      if (m) {
        return m[1]!
          .trim()
          .replace(/^git@github\.com:/, 'https://github.com/')
          .replace(/\.git$/, '');
      }
    } catch {
      /* unreadable git config */
    }
  }

  return '—';
}

export function checkGitStatus(dir: string, git = Bun.which('git')): GitStatus {
  if (!git || !existsSync(join(dir, '.git'))) return 'none';
  try {
    const proc = Bun.spawnSync([git, '-C', dir, 'status', '--porcelain'], { timeout: 3000 });
    return proc.stdout.toString().trim() ? 'dirty' : 'clean';
  } catch {
    return 'clean';
  }
}

export function discoverRootProjectNames(root: string, skips = ROOT_PROJECT_SKIPS): string[] {
  const dirs: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.') && skips.has(entry.name)) continue;
    if (skips.has(entry.name)) continue;
    dirs.push(entry.name);
  }
  return dirs;
}
