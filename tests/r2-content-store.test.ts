import { describe, expect, test } from 'bun:test';

import {
  ContentStoreIntegrityError,
  R2ContentStore,
  contentDigestForBytes,
  contentKeyForDigest,
  type R2Conditional,
  type R2ContentBucket,
  type R2ObjectBody,
  type R2ObjectMetadata,
} from '../lib/content-store/index.ts';

type FakeObject = {
  bytes: Uint8Array;
  etag: string;
  customMetadata: Readonly<Record<string, string>>;
};

class FakeR2Bucket implements R2ContentBucket {
  readonly objects = new Map<string, FakeObject>();
  beforeConditionalWrite?: () => void;
  putCalls: Array<{
    key: string;
    onlyIf: R2Conditional;
    sha256: string;
    customMetadata: Readonly<Record<string, string>>;
  }> = [];
  #revision = 0;

  async get(key: string): Promise<R2ObjectBody | null> {
    const object = this.objects.get(key);
    if (!object) return null;
    const bytes = object.bytes.slice();
    return {
      key,
      size: bytes.byteLength,
      etag: object.etag,
      customMetadata: object.customMetadata,
      arrayBuffer: async () =>
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
    };
  }

  async put(
    key: string,
    value: ArrayBuffer,
    options: {
      readonly onlyIf: R2Conditional;
      readonly sha256: string;
      readonly customMetadata: Readonly<Record<string, string>>;
    }
  ): Promise<R2ObjectMetadata | null> {
    this.putCalls.push({ key, ...options });
    this.beforeConditionalWrite?.();
    this.beforeConditionalWrite = undefined;
    const current = this.objects.get(key);
    if (options.onlyIf.etagDoesNotMatch === '*' && current) return null;
    if (options.onlyIf.etagMatches !== undefined && current?.etag !== options.onlyIf.etagMatches) {
      return null;
    }
    const bytes = new Uint8Array(value).slice();
    if (contentDigestForBytes(bytes).slice('sha256:'.length) !== options.sha256) {
      throw new Error('fake R2 checksum rejection');
    }
    const stored = {
      bytes,
      etag: `etag-${++this.#revision}`,
      customMetadata: options.customMetadata,
    };
    this.objects.set(key, stored);
    return this.metadata(key, stored);
  }

  metadata(key: string, object: FakeObject): R2ObjectMetadata {
    return {
      key,
      size: object.bytes.byteLength,
      etag: object.etag,
      customMetadata: object.customMetadata,
    };
  }
}

describe('R2ContentStore', () => {
  test('reports a missing digest without manufacturing locator or object identity', async () => {
    const store = new R2ContentStore(new FakeR2Bucket());
    const digest = contentDigestForBytes(new TextEncoder().encode('absent'));
    expect(await store.get(digest)).toBeUndefined();
    expect(await store.verify(digest)).toEqual({ status: 'missing', expectedDigest: digest });
  });

  test('writes exact bounded bytes under a digest-only key with checksum and create CAS', async () => {
    const bucket = new FakeR2Bucket();
    const store = new R2ContentStore(bucket);
    const input = new Uint8Array([0, 255, 1, 2, 0]);

    const stored = await store.put(input);
    input[0] = 99;

    expect(stored.created).toBeTrue();
    expect(bucket.putCalls).toEqual([
      {
        key: contentKeyForDigest(stored.digest),
        onlyIf: { etagDoesNotMatch: '*' },
        sha256: stored.digest.slice('sha256:'.length),
        customMetadata: {
          schema: 'factorywager.content.v1',
          digest: stored.digest,
          byteLength: '5',
        },
      },
    ]);
    expect(await store.get(stored.digest)).toEqual(new Uint8Array([0, 255, 1, 2, 0]));
  });

  test('deduplicates a create race only after independently verifying the winner', async () => {
    const bucket = new FakeR2Bucket();
    const store = new R2ContentStore(bucket);
    const bytes = new TextEncoder().encode('same immutable bytes');
    const first = await store.put(bytes);
    const second = await store.put(bytes);

    expect(first.created).toBeTrue();
    expect(second).toEqual({ ...first, created: false });
    expect(bucket.putCalls).toHaveLength(2);
  });

  test('fails closed when a create race winner is corrupt', async () => {
    const bucket = new FakeR2Bucket();
    const store = new R2ContentStore(bucket);
    const bytes = new TextEncoder().encode('expected');
    const digest = contentDigestForBytes(bytes);
    const key = contentKeyForDigest(digest);
    bucket.beforeConditionalWrite = () => {
      bucket.objects.set(key, {
        bytes: new TextEncoder().encode('tampered'),
        etag: 'racer',
        customMetadata: {
          schema: 'factorywager.content.v1',
          digest,
          byteLength: String(new TextEncoder().encode('tampered').byteLength),
        },
      });
    };

    await expect(store.put(bytes)).rejects.toBeInstanceOf(ContentStoreIntegrityError);
  });

  test('rejects oversized objects before body materialization and mismatched metadata', async () => {
    const bucket = new FakeR2Bucket();
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const digest = contentDigestForBytes(bytes);
    const key = contentKeyForDigest(digest);
    bucket.objects.set(key, {
      bytes,
      etag: 'oversized',
      customMetadata: {
        schema: 'factorywager.content.v1',
        digest,
        byteLength: '4',
      },
    });
    const bounded = new R2ContentStore(bucket, { maxBytes: 3 });
    expect(await bounded.verify(digest)).toEqual({
      status: 'oversized',
      expectedDigest: digest,
      byteLength: 4,
      maxBytes: 3,
    });
    await expect(bounded.get(digest)).rejects.toThrow('exceeds 3 byte');

    bucket.objects.get(key)!.customMetadata = { schema: 'factorywager.content.v1' };
    await expect(new R2ContentStore(bucket).get(digest)).rejects.toThrow(
      'metadata is missing or mismatched'
    );
    expect((await new R2ContentStore(bucket).verify(digest)).status).toBe('corrupt');
  });

  test('rehashes every read and rejects a body that differs from its digest metadata', async () => {
    const bucket = new FakeR2Bucket();
    const trusted = new TextEncoder().encode('trusted');
    const digest = contentDigestForBytes(trusted);
    const key = contentKeyForDigest(digest);
    const corrupt = new TextEncoder().encode('corrupt');
    bucket.objects.set(key, {
      bytes: corrupt,
      etag: 'bad',
      customMetadata: {
        schema: 'factorywager.content.v1',
        digest,
        byteLength: String(corrupt.byteLength),
      },
    });

    const store = new R2ContentStore(bucket);
    await expect(store.get(digest)).rejects.toBeInstanceOf(ContentStoreIntegrityError);
    const verification = await store.verify(digest);
    expect(verification.status).toBe('corrupt');
    if (verification.status === 'corrupt') {
      expect(verification.actualDigest).toBe(contentDigestForBytes(corrupt));
    }
  });
});
