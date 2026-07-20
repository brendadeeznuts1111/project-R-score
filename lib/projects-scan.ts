// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/glob — Bun.Glob
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @see https://bun.com/docs/runtime/utils#bun-peek — Bun.peek
// lib/projects-scan.ts — Bun-native project inventory helpers (Glob, Bun.file, Bun.spawn)

export type GitStatus = 'none' | 'clean' | 'dirty';

import { fileExists, fileExistsSync } from '../scripts/lib/fs-bun';
export { fileExists, fileExistsSync };

export interface WalkStats {
  fileCount: number;
  sizeKb: number;
  lastChanged: string;
}

const SKIP_DIR_NAMES = new Set(['node_modules', 'dist', 'build']);
const FILE_TREE_GLOB = new Bun.Glob('**/*');

export function joinPath(base: string, ...parts: string[]): string {
  return [base, ...parts].join('/').replace(/\/+/g, '/');
}

export function baseName(path: string): string {
  const parts = path.replace(/\/$/, '').split('/');
  return parts[parts.length - 1] || path;
}

export function shouldSkipEntry(name: string): boolean {
  return name.startsWith('.') || SKIP_DIR_NAMES.has(name);
}

export function shouldSkipRelPath(rel: string): boolean {
  return rel.split('/').some(seg => shouldSkipEntry(seg));
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

export function isDirectory(path: string): boolean {
  try {
    return Bun.spawnSync(['test', '-d', path]).exitCode === 0;
  } catch {
    return false;
  }
}

export function walkStats(dir: string): WalkStats {
  let fileCount = 0;
  let totalSize = 0;
  let latestMtime = 0;

  for (const rel of FILE_TREE_GLOB.scanSync({ cwd: dir, onlyFiles: true, dot: false })) {
    if (shouldSkipRelPath(rel)) continue;
    fileCount++;
    const fp = joinPath(dir, rel);
    const f = Bun.file(fp);
    totalSize += f.size;
    const lm = f.lastModified;
    if (lm > latestMtime) latestMtime = lm;
  }

  return {
    fileCount,
    sizeKb: Math.round(totalSize / 1024),
    lastChanged: latestMtime > 0 ? new Date(latestMtime).toISOString().slice(0, 10) : '—',
  };
}

export function countFiles(dir: string): number {
  return walkStats(dir).fileCount;
}

export function dirSizeBytes(dir: string): number {
  return walkStats(dir).sizeKb * 1024;
}

export function lastModified(dir: string): Date | null {
  const { lastChanged } = walkStats(dir);
  return lastChanged === '—' ? null : new Date(lastChanged);
}

export async function extractGithubUrl(dir: string): Promise<string> {
  const pkgFile = Bun.file(joinPath(dir, 'package.json'));
  if (await pkgFile.exists()) {
    try {
      const pkg = (await pkgFile.json()) as {
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

  const gitConfig = Bun.file(joinPath(dir, '.git/config'));
  if (await gitConfig.exists()) {
    try {
      const text = await gitConfig.text();
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
  if (!git || !fileExistsSync(joinPath(dir, '.git/HEAD'))) return 'none';
  try {
    const proc = Bun.spawnSync([git, '-C', dir, 'status', '--porcelain'], { timeout: 3000 });
    return proc.stdout.toString().trim() ? 'dirty' : 'clean';
  } catch {
    return 'clean';
  }
}

/** Top-level directory names under root (Bun.Glob + test -d). */
export function listChildDirectoryNames(root: string, dot = false): string[] {
  const glob = new Bun.Glob('*');
  const dirs: string[] = [];
  for (const name of glob.scanSync({ cwd: root, onlyFiles: false, dot })) {
    if (name.includes('/')) continue;
    const full = joinPath(root, name);
    if (isDirectory(full)) dirs.push(name);
  }
  return dirs;
}

export function discoverRootProjectNames(root: string, skips = ROOT_PROJECT_SKIPS): string[] {
  return listChildDirectoryNames(root, false).filter(name => {
    if (name.startsWith('.') && skips.has(name)) return false;
    if (skips.has(name)) return false;
    return true;
  });
}

export function readPackageJsonSync(dir: string): Record<string, unknown> {
  const file = Bun.file(joinPath(dir, 'package.json'));
  if (!file.size) return {};
  try {
    return Bun.peek(file.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function readPackageJson(dir: string): Promise<Record<string, unknown>> {
  const file = Bun.file(joinPath(dir, 'package.json'));
  if (!(await file.exists())) return {};
  try {
    return (await file.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function readTextFileSync(path: string): string | null {
  const file = Bun.file(path);
  if (!file.size) return null;
  try {
    return Bun.peek(file.text()) as string;
  } catch {
    return null;
  }
}

export async function readTextFile(path: string): Promise<string | null> {
  const file = Bun.file(path);
  if (!(await file.exists())) return null;
  try {
    return await file.text();
  } catch {
    return null;
  }
}

/** Minimal CLI flag parser (avoids node:util). */
export function parseScanFlags(
  argv: string[],
  spec: Record<string, { type: 'boolean' | 'string'; default: string | boolean }>
): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (const [key, cfg] of Object.entries(spec)) {
    out[key] = cfg.default;
  }
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i]!;
    if (!arg.startsWith('--')) continue;
    const eq = arg.indexOf('=');
    const name = eq === -1 ? arg.slice(2) : arg.slice(2, eq);
    const cfg = spec[name];
    if (!cfg) continue;
    if (cfg.type === 'boolean') {
      out[name] = true;
    } else {
      out[name] = eq === -1 ? (argv[++i] ?? cfg.default) : arg.slice(eq + 1);
    }
  }
  return out;
}
