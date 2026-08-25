// eslint-disable-next-line no-restricted-imports -- atomic rename and temp-directory staging have no Bun.file equivalent
import { mkdir, mkdtemp, rename, rm } from 'node:fs/promises';
import {
  basenamePath as basename,
  dirnamePath as dirname,
  joinPath as join,
} from '../../lib/path-bun';
import { fail } from './errors.ts';
import { sha256 } from './inspection.ts';
import { parseManifestShape } from './manifest-validation.ts';
import { assertVendorSafeAsset } from './media-validation.ts';
import type { AssetManifest, FetchedAsset } from './types.ts';

export async function readManifest(path: string): Promise<AssetManifest> {
  try {
    // @see https://bun.com/docs/runtime/file-io — Bun.file
    const text = await Bun.file(path).text();
    return parseManifestShape(JSON.parse(text), path);
  } catch (error) {
    if (error instanceof SyntaxError) fail(`manifest ${path} is not valid JSON`);
    throw error;
  }
}

export async function atomicWriteJson<T>(path: string, value: T): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    // @see https://bun.com/docs/runtime/file-io — Bun.write
    await Bun.write(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
    await rename(temporaryPath, path);
  } finally {
    if (await Bun.file(temporaryPath).exists()) await rm(temporaryPath, { force: true });
  }
}

type FetchedFile = FetchedAsset & { bytes: Uint8Array };

function hasBytes(item: FetchedAsset): item is FetchedFile {
  return item.asset.kind !== 'embed' && item.bytes !== null;
}

export async function stageVendorAssets(fetched: FetchedAsset[], vendorDir: string): Promise<void> {
  const files = fetched.filter(hasBytes);
  for (const item of files) assertVendorSafeAsset(item.asset, 'vendor');
  const parent = dirname(vendorDir);
  await mkdir(parent, { recursive: true });
  const temporaryDir = await mkdtemp(join(parent, `.bun-1.4-assets-${process.pid}-`));
  try {
    for (const item of files) {
      await Bun.write(join(temporaryDir, basename(item.asset.path ?? item.asset.id)), item.bytes);
    }
    await mkdir(vendorDir, { recursive: true });

    // Check every destination before moving so conflicts cannot cause partial updates.
    for (const item of files) {
      const name = basename(item.asset.path ?? item.asset.id);
      const target = join(vendorDir, name);
      if (!(await Bun.file(target).exists())) continue;
      const existingHash = sha256(new Uint8Array(await Bun.file(target).arrayBuffer()));
      if (existingHash !== item.sha256) {
        fail(`vendor destination already contains different bytes: ${target}`);
      }
    }
    for (const item of files) {
      const name = basename(item.asset.path ?? item.asset.id);
      const target = join(vendorDir, name);
      if (await Bun.file(target).exists()) continue;
      await rename(join(temporaryDir, name), target);
    }
  } finally {
    await rm(temporaryDir, { recursive: true, force: true });
  }
}
