#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * Shared oven-sh/bun packages/bun-types tip fetch (sparse clone under .cache).
 * Used by tip-diff + changelog without import cycles.
 */
import { joinPath, resolvePath } from '../lib/path-bun.ts';

const REPO_ROOT = resolvePath(import.meta.dir, '..');
export const BUN_TYPES_TIP_CACHE = joinPath(REPO_ROOT, '.cache', 'bun-types-tip');
const UPSTREAM = 'https://github.com/oven-sh/bun.git';

async function pathExists(path: string): Promise<boolean> {
  try {
    return await Bun.file(path).exists();
  } catch {
    return false;
  }
}

async function dirHasGit(path: string): Promise<boolean> {
  try {
    const proc = Bun.spawn(['git', '-C', path, 'rev-parse', '--git-dir'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    return (await proc.exited) === 0;
  } catch {
    return false;
  }
}

async function gitText(cwd: string, args: string[]): Promise<{ ok: boolean; text: string }> {
  const proc = Bun.spawn(['git', '-C', cwd, ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const text = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  const code = await proc.exited;
  return { ok: code === 0, text: (text || err).trim() };
}

/**
 * Sparse-fetch oven-sh/bun packages/bun-types into `.cache/bun-types-tip`.
 */
export async function fetchUpstreamBunTypes(
  cacheRoot: string = BUN_TYPES_TIP_CACHE,
): Promise<{ root: string; revision: string }> {
  const typesPath = joinPath(cacheRoot, 'packages', 'bun-types');

  if (!(await dirHasGit(cacheRoot))) {
    await Bun.spawn(['mkdir', '-p', resolvePath(cacheRoot, '..')]).exited;
    await Bun.spawn(['rm', '-rf', cacheRoot]).exited;
    console.info(`tip-fetch: cloning ${UPSTREAM} (sparse packages/bun-types) → ${cacheRoot}`);
    const clone = Bun.spawn(
      ['git', 'clone', '--depth', '1', '--filter=blob:none', '--sparse', UPSTREAM, cacheRoot],
      { stdout: 'inherit', stderr: 'inherit' },
    );
    if ((await clone.exited) !== 0) {
      throw new Error('git clone oven-sh/bun failed (network or git required)');
    }
    const sparse = Bun.spawn(
      ['git', '-C', cacheRoot, 'sparse-checkout', 'set', 'packages/bun-types'],
      { stdout: 'inherit', stderr: 'inherit' },
    );
    if ((await sparse.exited) !== 0) {
      throw new Error('git sparse-checkout set packages/bun-types failed');
    }
  } else {
    console.info(`tip-fetch: updating ${cacheRoot}`);
    const fetch = Bun.spawn(
      ['git', '-C', cacheRoot, 'fetch', '--depth', '1', 'origin', 'main'],
      { stdout: 'inherit', stderr: 'inherit' },
    );
    if ((await fetch.exited) !== 0) {
      throw new Error('git fetch origin main failed');
    }
    const reset = Bun.spawn(['git', '-C', cacheRoot, 'reset', '--hard', 'origin/main'], {
      stdout: 'inherit',
      stderr: 'inherit',
    });
    if ((await reset.exited) !== 0) {
      throw new Error('git reset --hard origin/main failed');
    }
    await Bun.spawn(['git', '-C', cacheRoot, 'sparse-checkout', 'set', 'packages/bun-types'], {
      stdout: 'pipe',
      stderr: 'pipe',
    }).exited;
  }

  if (!(await pathExists(joinPath(typesPath, 'bun.d.ts')))) {
    throw new Error(`tip-fetch: missing ${typesPath}/bun.d.ts after fetch`);
  }
  const rev = await gitText(cacheRoot, ['rev-parse', '--short', 'HEAD']);
  return { root: typesPath, revision: rev.ok ? rev.text : 'unknown' };
}
