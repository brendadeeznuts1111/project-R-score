// @see https://bun.com/docs/test/index#run-tests
import { afterAll, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  assertPathInRepo,
  resolveExistingRealPath,
} from '../lib/repo-containment.ts';
import { joinPath, resolvePath } from '../lib/path-bun.ts';

const REPO_ROOT = resolvePath(import.meta.dir, '..');

/** Temp dir under repo `data/` (creates parent — staged scratch may lack `data/`). */
async function mkRepoDataTemp(prefix: string): Promise<string> {
  const base = join(REPO_ROOT, 'data');
  await mkdir(base, { recursive: true });
  return mkdtemp(join(base, prefix));
}

describe('repo-containment', () => {
  const cleanups: Array<() => Promise<void>> = [];

  afterAll(async () => {
    for (const fn of cleanups.reverse()) await fn();
  });

  test('accepts a normal in-repo path', async () => {
    const inside = await assertPathInRepo('lib/repo-containment.ts', {
      label: 'path',
      repoRoot: REPO_ROOT,
    });
    expect(inside.startsWith(await resolveExistingRealPath(REPO_ROOT))).toBe(true);
  });

  test('rejects non-existent child under in-repo symlink to outside unless --force', async () => {
    const outside = await mkdtemp(join(tmpdir(), 'repo-containment-outside-'));
    cleanups.push(async () => {
      await rm(outside, { recursive: true, force: true });
    });

    const staging = await mkRepoDataTemp('repo-containment-');
    cleanups.push(async () => {
      await rm(staging, { recursive: true, force: true });
    });

    const linkPath = joinPath(staging, 'escape-link');
    await symlink(outside, linkPath);

    const viaSymlink = joinPath(linkPath, 'missing-child');

    // Lexical path looks in-repo; realpath of the symlink parent escapes.
    expect(viaSymlink.startsWith(REPO_ROOT)).toBe(true);

    await expect(
      assertPathInRepo(viaSymlink, { label: 'output path', repoRoot: REPO_ROOT })
    ).rejects.toThrow(/repository root/);

    const forced = await assertPathInRepo(viaSymlink, {
      force: true,
      label: 'output path',
      repoRoot: REPO_ROOT,
    });
    const outsideReal = await resolveExistingRealPath(outside);
    expect(forced).toBe(joinPath(outsideReal, 'missing-child'));
  });
});
