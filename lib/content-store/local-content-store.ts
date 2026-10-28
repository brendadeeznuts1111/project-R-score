// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @updated Bun.randomUUIDv7 · changed v1.1.34 · 2024-11-02 · https://bun.com/blog/bun-v1.1.34
// @verified Bun.randomUUIDv7 · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/utils#bun-randomuuidv7
// eslint-disable-next-line no-restricted-imports -- Bun 1.4 has no atomic rename or fsync API.
import { mkdir, open, readFile, rename, unlink } from 'node:fs/promises';

import { dirnamePath, joinPath } from '../path-bun.ts';
import type { ContentDigest } from '../types/branded.ts';
import { contentDigestForBytes, contentKeyForDigest } from './content-contract.ts';
import {
  ContentStoreIntegrityError,
  type ContentStore,
  type ContentVerification,
  type StoredContent,
} from './memory-content-store.ts';

export type LocalContentStoreOptions = {
  readonly maxBytes?: number;
};

/** Atomic filesystem-backed CAS. Paths are derived only from validated content digests. */
export class LocalContentStore implements ContentStore {
  readonly maxBytes: number;

  constructor(
    readonly rootDirectory: string,
    options: LocalContentStoreOptions = {}
  ) {
    if (!rootDirectory || rootDirectory.includes('\0')) {
      throw new TypeError('Content store rootDirectory must be nonblank');
    }
    const maxBytes = options.maxBytes ?? 64 * 1024 * 1024;
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
      throw new RangeError('Content store maxBytes must be a nonnegative safe integer');
    }
    this.maxBytes = maxBytes;
  }

  async put(bytes: Uint8Array): Promise<StoredContent> {
    this.assertBounded(bytes.byteLength);
    const digest = contentDigestForBytes(bytes);
    const key = contentKeyForDigest(digest);
    const existing = await this.verify(digest);
    if (existing.status === 'verified') {
      return { digest, key, byteLength: existing.byteLength, created: false };
    }
    if (existing.status !== 'missing') throw new ContentStoreIntegrityError(existing);

    const targetFile = this.fileFor(digest);
    await mkdir(dirnamePath(targetFile), { recursive: true, mode: 0o700 });
    const temporaryFile = joinPath(
      dirnamePath(targetFile),
      `.${digest.slice('sha256:'.length)}.${Bun.randomUUIDv7()}.tmp`
    );
    try {
      const handle = await open(temporaryFile, 'wx', 0o600);
      try {
        await handle.writeFile(bytes);
        await handle.sync();
      } finally {
        await handle.close();
      }
      await rename(temporaryFile, targetFile);
    } catch (error) {
      await unlink(temporaryFile).catch(() => undefined);
      const raced = await this.verify(digest);
      if (raced.status === 'verified') {
        return { digest, key, byteLength: raced.byteLength, created: false };
      }
      throw error;
    }
    const directoryHandle = await open(dirnamePath(targetFile), 'r');
    try {
      await directoryHandle.sync();
    } finally {
      await directoryHandle.close();
    }
    return { digest, key, byteLength: bytes.byteLength, created: true };
  }

  async get(digest: ContentDigest): Promise<Uint8Array | undefined> {
    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(await readFile(this.fileFor(digest)));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw error;
    }
    this.assertBounded(bytes.byteLength);
    const actualDigest = contentDigestForBytes(bytes);
    if (actualDigest !== digest) {
      throw new ContentStoreIntegrityError({
        status: 'corrupt',
        expectedDigest: digest,
        actualDigest,
        byteLength: bytes.byteLength,
      });
    }
    return bytes;
  }

  async has(digest: ContentDigest): Promise<boolean> {
    return (await this.verify(digest)).status !== 'missing';
  }

  async verify(digest: ContentDigest): Promise<ContentVerification> {
    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(await readFile(this.fileFor(digest)));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { status: 'missing', expectedDigest: digest };
      }
      throw error;
    }
    if (bytes.byteLength > this.maxBytes) {
      return {
        status: 'oversized',
        expectedDigest: digest,
        byteLength: bytes.byteLength,
        maxBytes: this.maxBytes,
      };
    }
    const actualDigest = contentDigestForBytes(bytes);
    if (actualDigest !== digest) {
      return {
        status: 'corrupt',
        expectedDigest: digest,
        actualDigest,
        byteLength: bytes.byteLength,
      };
    }
    return { status: 'verified', digest, byteLength: bytes.byteLength };
  }

  private fileFor(digest: ContentDigest): string {
    const hex = digest.slice('sha256:'.length);
    return joinPath(this.rootDirectory, 'sha256', hex.slice(0, 2), hex);
  }

  private assertBounded(byteLength: number): void {
    if (byteLength > this.maxBytes) {
      throw new RangeError(`Content exceeds ${this.maxBytes} byte store limit`);
    }
  }
}
