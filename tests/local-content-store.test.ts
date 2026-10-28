import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  ContentStoreIntegrityError,
  LocalContentStore,
} from '../lib/content-store/index.ts';

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(directories.splice(0).map(directory => rm(directory, { recursive: true })));
});

describe('LocalContentStore', () => {
  test('atomically persists exact bytes and deduplicates across instances', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'factorywager-content-store-'));
    directories.push(directory);
    const bytes = new Uint8Array([0, 1, 2, 255, 0]);
    const firstStore = new LocalContentStore(directory);
    const first = await firstStore.put(bytes);
    const second = await new LocalContentStore(directory).put(bytes);

    expect(first.created).toBeTrue();
    expect(second.created).toBeFalse();
    expect(second.digest).toBe(first.digest);
    expect(await new LocalContentStore(directory).get(first.digest)).toEqual(bytes);
    const entries = new Bun.Glob('**/*').scan({ cwd: directory, onlyFiles: true });
    expect(await Array.fromAsync(entries)).toEqual([
      `sha256/${first.digest.slice(7, 9)}/${first.digest.slice(7)}`,
    ]);
  });

  test('detects persistent corruption and never returns unverified bytes', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'factorywager-content-corrupt-'));
    directories.push(directory);
    const store = new LocalContentStore(directory);
    const stored = await store.put(new TextEncoder().encode('trusted'));
    const target = join(directory, 'sha256', stored.digest.slice(7, 9), stored.digest.slice(7));
    expect(new Uint8Array(await readFile(target))).toEqual(new TextEncoder().encode('trusted'));
    await writeFile(target, 'tampered');

    expect((await store.verify(stored.digest)).status).toBe('corrupt');
    await expect(store.get(stored.digest)).rejects.toBeInstanceOf(ContentStoreIntegrityError);
  });
});
