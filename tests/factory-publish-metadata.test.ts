import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  isReadmeBasename,
  readPublishPackageJson,
  readPublishReadme,
  readPublishReadmeFromTarballBytes,
} from '../lib/factory/publish-metadata';

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

  test('returns null when a tgz cannot be extracted', async () => {
    const root = await makeTempRoot();
    const invalidTarball = join(root, 'invalid.tgz');
    await writeFile(invalidTarball, 'not a tarball');

    expect(await readPublishPackageJson(invalidTarball)).toBeNull();
  });
});

describe('readPublishReadme (BM-5)', () => {
  test('isReadmeBasename accepts bun-publish shapes', () => {
    expect(isReadmeBasename('README.md')).toBe(true);
    expect(isReadmeBasename('readme')).toBe(true);
    expect(isReadmeBasename('ReadMe.TXT')).toBe(true);
    expect(isReadmeBasename('CHANGELOG.md')).toBe(false);
  });

  test('reads README.md from a package directory', async () => {
    const root = await makeTempRoot();
    await writeFile(join(root, 'README.md'), '# Package README\n\nschemaVersion: 2\n');
    expect(await readPublishReadme(root)).toContain('schemaVersion: 2');
  });

  test('prefers package/README.md inside an npm-style tarball', async () => {
    const root = await makeTempRoot();
    const packageDir = join(root, 'package');
    const tarballPath = join(root, 'factorywager-bookmakers-0.4.1.tgz');
    await mkdir(packageDir);
    await writeFile(
      join(packageDir, 'package.json'),
      JSON.stringify({ name: '@factorywager/bookmakers', version: '0.4.1' })
    );
    await writeFile(
      join(packageDir, 'README.md'),
      '# @factorywager/bookmakers\n\n## v0.4 public catalog\n\nPUBLIC_BOOKMAKERS · schemaVersion: 2\n'
    );

    const tar = Bun.spawnSync(['tar', '-czf', tarballPath, '-C', root, 'package'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    expect(tar.success, tar.stderr.toString()).toBe(true);

    const fromPath = await readPublishReadme(tarballPath);
    expect(fromPath).toContain('PUBLIC_BOOKMAKERS');
    expect(fromPath).toContain('schemaVersion: 2');

    const bytes = new Uint8Array(await Bun.file(tarballPath).arrayBuffer());
    const fromBytes = await readPublishReadmeFromTarballBytes(bytes);
    expect(fromBytes).toBe(fromPath);
  });

  test('returns undefined when tarball has no README', async () => {
    const root = await makeTempRoot();
    const packageDir = join(root, 'package');
    const tarballPath = join(root, 'no-readme.tgz');
    await mkdir(packageDir);
    await writeFile(
      join(packageDir, 'package.json'),
      JSON.stringify({ name: '@factorywager/empty', version: '1.0.0' })
    );
    const tar = Bun.spawnSync(['tar', '-czf', tarballPath, '-C', root, 'package'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    expect(tar.success, tar.stderr.toString()).toBe(true);
    expect(await readPublishReadme(tarballPath)).toBeUndefined();
  });
});
