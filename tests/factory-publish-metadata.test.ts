import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readPublishPackageJson } from '../lib/factory/publish-metadata';

const tempRoots: string[] = [];

async function makeTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'factory-publish-metadata-'));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('readPublishPackageJson', () => {
  test('reads package metadata from a directory', async () => {
    const root = await makeTempRoot();
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({ name: '@factorywager/example', version: '1.2.3' })
    );

    expect(await readPublishPackageJson(root)).toEqual({
      name: '@factorywager/example',
      version: '1.2.3',
    });
  });

  test('reads package/package.json from an npm-style tarball', async () => {
    const root = await makeTempRoot();
    const packageDir = join(root, 'package');
    const tarballPath = join(root, 'factorywager-example-4.5.6.tgz');
    await mkdir(packageDir);
    await writeFile(
      join(packageDir, 'package.json'),
      JSON.stringify({ name: '@factorywager/tarball-example', version: '4.5.6' })
    );

    const tar = Bun.spawnSync(['tar', '-czf', tarballPath, '-C', root, 'package'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    expect(tar.success, tar.stderr.toString()).toBe(true);

    expect(await readPublishPackageJson(tarballPath)).toEqual({
      name: '@factorywager/tarball-example',
      version: '4.5.6',
    });
  });

  test('returns null for missing or non-object metadata', async () => {
    const root = await makeTempRoot();
    expect(await readPublishPackageJson(join(root, 'missing'))).toBeNull();

    await writeFile(join(root, 'package.json'), '[]');
    expect(await readPublishPackageJson(root)).toBeNull();
  });
});
