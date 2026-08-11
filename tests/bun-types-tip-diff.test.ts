import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveTipSource } from '../tools/bun-types-tip-diff.ts';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('bun-types tip source selection', () => {
  test('prefer-local selects the repository cache before a stale home checkout', async () => {
    const root = await mkdtemp(join(tmpdir(), 'bun-types-tip-source-'));
    roots.push(root);
    const cacheRoot = join(root, 'cache');
    const cachedTip = join(cacheRoot, 'packages/bun-types');
    const homeTip = join(root, 'home/bun/packages/bun-types');
    await Promise.all([
      mkdir(cachedTip, { recursive: true }),
      mkdir(homeTip, { recursive: true }),
    ]);
    await Promise.all([
      writeFile(join(cachedTip, 'bun.d.ts'), 'declare namespace Bun {}\n'),
      writeFile(join(homeTip, 'bun.d.ts'), 'declare namespace Bun {}\n'),
    ]);

    const source = await resolveTipSource(
      { preferLocal: true, noFetch: false },
      { cacheRoot, home: join(root, 'home') }
    );

    expect(source).toMatchObject({ root: cachedTip, source: 'cache', fetched: false });
  });
});
