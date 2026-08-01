#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/pm/filter#package-name-filter-pattern — --filter
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/guides/process/argv — Bun.argv
/**
 * Git-true affected workspaces → bun --filter <name> <script>.
 *
 * Replaces the day-loop fiction `bun run --filter '...'` (dependents filter,
 * not changed packages).
 *
 * Usage:
 *   bun scripts/affected-workspaces.ts build
 *   bun scripts/affected-workspaces.ts test
 *   bun scripts/affected-workspaces.ts list
 */
import { bunSpawnArgs } from '../lib/bun-executable.ts';
import { positionalArgs } from './lib/cli-args';
import { readJsonSync } from './lib/fs-bun';

const ROOT = process.cwd();

type PkgJson = {
  name?: string;
  workspaces?: string[] | { packages?: string[] };
  scripts?: Record<string, string>;
};

function workspaceGlobs(rootPkg: PkgJson): string[] {
  const w = rootPkg.workspaces;
  if (Array.isArray(w)) return w;
  if (w && Array.isArray(w.packages)) return w.packages;
  return [];
}

/** Expand simple workspace globs (packages/*, lib/*, fixed paths). */
function packageDirs(globs: string[]): string[] {
  const dirs: string[] = [];
  for (const g of globs) {
    if (g.endsWith('/*')) {
      const parent = g.slice(0, -2);
      try {
        for (const name of new Bun.Glob('*').scanSync({
          cwd: `${ROOT}/${parent}`,
          onlyFiles: false,
        })) {
          const pkgPath = `${parent}/${name}/package.json`;
          if (Bun.file(pkgPath).size > 0) dirs.push(`${parent}/${name}`);
        }
      } catch {
        /* missing parent */
      }
    } else {
      if (Bun.file(`${g}/package.json`).size > 0) dirs.push(g);
    }
  }
  return dirs;
}

function loadPackages(): Array<{ dir: string; name: string; hasScript: (s: string) => boolean }> {
  const rootPkg = readJsonSync<PkgJson>(`${ROOT}/package.json`);
  const dirs = packageDirs(workspaceGlobs(rootPkg));
  const out: Array<{ dir: string; name: string; hasScript: (s: string) => boolean }> = [];
  for (const dir of dirs) {
    try {
      const pkg = readJsonSync<PkgJson>(`${ROOT}/${dir}/package.json`);
      const name = pkg.name?.trim();
      if (!name) continue;
      out.push({
        dir,
        name,
        hasScript: (s: string) => Boolean(pkg.scripts?.[s]),
      });
    } catch {
      /* skip */
    }
  }
  return out;
}

async function changedFiles(): Promise<string[]> {
  const cmds = [
    ['git', 'diff', '--name-only', 'HEAD'],
    ['git', 'diff', '--name-only', '--cached'],
    ['git', 'ls-files', '--others', '--exclude-standard'],
  ];
  const set = new Set<string>();
  for (const cmd of cmds) {
    const proc = Bun.spawn(cmd, { cwd: ROOT, stdout: 'pipe', stderr: 'pipe' });
    const text = await new Response(proc.stdout).text();
    await proc.exited;
    for (const line of text.split('\n')) {
      const f = line.trim();
      if (f) set.add(f);
    }
  }
  return [...set];
}

function packagesForFiles(
  files: string[],
  packages: ReturnType<typeof loadPackages>
): typeof packages {
  const hit = new Set<string>();
  for (const file of files) {
    for (const pkg of packages) {
      if (file === pkg.dir || file.startsWith(`${pkg.dir}/`)) hit.add(pkg.name);
    }
  }
  return packages.filter(p => hit.has(p.name));
}

async function main(): Promise<number> {
  const args = positionalArgs();
  const script = args[0] || 'list';
  const packages = loadPackages();
  const files = await changedFiles();
  const affected = packagesForFiles(files, packages);

  if (script === 'list' || script === '--list') {
    if (affected.length === 0) {
      console.info('No changed workspace packages (relative to HEAD + untracked).');
      return 0;
    }
    for (const p of affected) console.info(`${p.name}\t${p.dir}`);
    return 0;
  }

  const runnable = affected.filter(p => p.hasScript(script));
  if (runnable.length === 0) {
    console.info(
      `No changed workspaces with script "${script}" (${affected.length} path-matched, ${files.length} changed files).`
    );
    return 0;
  }

  const filters = runnable.flatMap(p => ['--filter', p.name]);
  console.info(`affected: ${runnable.map(p => p.name).join(', ')} → ${script}`);
  const proc = Bun.spawn(bunSpawnArgs(['run', ...filters, script]), {
    cwd: ROOT,
    stdout: 'inherit',
    stderr: 'inherit',
    env: { ...Bun.env },
  });
  return proc.exited;
}

if (import.meta.main) {
  process.exit(await main());
}
