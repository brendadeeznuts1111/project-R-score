import type { ContentDigest } from '../types/branded.ts';
import { contentDigestForBytes, contentKeyForDigest } from './content-contract.ts';
import {
  ContentStoreIntegrityError,
  type ContentStore,
  type ContentVerification,
  type StoredContent,
} from './memory-content-store.ts';

// @see https://developers.cloudflare.com/r2/api/workers/workers-api-reference/#r2putoptions
// @see https://developers.cloudflare.com/r2/reference/consistency/

export type R2Conditional = {
  readonly etagMatches?: string;
  readonly etagDoesNotMatch?: string;
};

export type R2ObjectMetadata = {
  readonly key: string;
  readonly size: number;
  readonly etag: string;
  readonly customMetadata?: Readonly<Record<string, string>>;
};

export type R2ObjectBody = R2ObjectMetadata & {
  arrayBuffer(): Promise<ArrayBuffer>;
};

/** Minimal Workers R2 binding surface. Kept structural so tests need no account or credentials. */
export interface R2ContentBucket {
  get(key: string): Promise<R2ObjectBody | null>;
  put(
    key: string,
    value: ArrayBuffer,
    options: {
      readonly onlyIf: R2Conditional;
      readonly sha256: string;
      readonly customMetadata: Readonly<Record<string, string>>;
    }
  ): Promise<R2ObjectMetadata | null>;
}

export type R2ContentStoreOptions = {
  readonly maxBytes?: number;
};

const CONTENT_SCHEMA = 'factorywager.content.v1';

/** Workers-binding R2 CAS. Object keys are derived exclusively from the requested digest. */
export class R2ContentStore implements ContentStore {
  readonly maxBytes: number;

  constructor(
    readonly bucket: R2ContentBucket,
    options: R2ContentStoreOptions = {}
  ) {
    const maxBytes = options.maxBytes ?? 64 * 1024 * 1024;
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
      throw new RangeError('Content store maxBytes must be a nonnegative safe integer');
    }
    this.maxBytes = maxBytes;
  }

  async put(bytes: Uint8Array): Promise<StoredContent> {
    this.assertBounded(bytes.byteLength);
    const exactBytes = bytes.slice();
    const digest = contentDigestForBytes(exactBytes);
    const key = contentKeyForDigest(digest);
    const hexDigest = digest.slice('sha256:'.length);
    const result = await this.bucket.put(
      key,
      exactBytes.buffer.slice(
        exactBytes.byteOffset,
        exactBytes.byteOffset + exactBytes.byteLength
      ) as ArrayBuffer,
      {
        onlyIf: { etagDoesNotMatch: '*' },
        sha256: hexDigest,
        customMetadata: {
          schema: CONTENT_SCHEMA,
          digest,
          byteLength: String(exactBytes.byteLength),
        },
      }
    );

    if (result !== null) {
      this.assertMetadata(result, digest, exactBytes.byteLength);
      const verification = await this.verify(digest);
      if (verification.status !== 'verified' || verification.byteLength !== exactBytes.byteLength) {
        if (verification.status === 'missing') {
          throw new Error(`R2 content disappeared after write: ${digest}`);
        }
        if (verification.status === 'verified') {
          throw new Error(`R2 content length changed after write: ${digest}`);
        }
        throw new ContentStoreIntegrityError(verification);
      }
      return { digest, key, byteLength: exactBytes.byteLength, created: true };
    }

    // A failed create precondition means another writer won. Trust it only after a full re-read.
    const raced = await this.verify(digest);
    if (raced.status !== 'verified' || raced.byteLength !== exactBytes.byteLength) {
      if (raced.status === 'missing')
        throw new Error(`R2 create race produced no content: ${digest}`);
      if (raced.status === 'verified') {
        throw new Error(`R2 create race produced a length mismatch: ${digest}`);
      }
      throw new ContentStoreIntegrityError(raced);
    }
    return { digest, key, byteLength: raced.byteLength, created: false };
  }

  async get(digest: ContentDigest): Promise<Uint8Array | undefined> {
    const object = await this.bucket.get(contentKeyForDigest(digest));
    if (object === null) return undefined;
    this.assertMetadata(object, digest);
    this.assertBounded(object.size);
    const bytes = new Uint8Array(await object.arrayBuffer());
    if (bytes.byteLength !== object.size) {
      throw new Error(`R2 content body length does not match metadata: ${digest}`);
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
    return (await this.verify(digest)).status === 'verified';
  }

  async verify(digest: ContentDigest): Promise<ContentVerification> {
    const object = await this.bucket.get(contentKeyForDigest(digest));
    if (object === null) return { status: 'missing', expectedDigest: digest };
    if (!Number.isSafeInteger(object.size) || object.size < 0) {
      throw new R2ContentMetadataError('R2 content object size is invalid');
    }
    if (object.size > this.maxBytes) {
      return {
        status: 'oversized',
        expectedDigest: digest,
        byteLength: object.size,
        maxBytes: this.maxBytes,
      };
    }
    const bytes = new Uint8Array(await object.arrayBuffer());
    if (bytes.byteLength > this.maxBytes) {
      return {
        status: 'oversized',
        expectedDigest: digest,
        byteLength: bytes.byteLength,
        maxBytes: this.maxBytes,
      };
    }
    const actualDigest = contentDigestForBytes(bytes);
    try {
      this.assertMetadata(object, digest);
    } catch (error) {
      if (!(error instanceof R2ContentMetadataError)) throw error;
      return {
        status: 'corrupt',
        expectedDigest: digest,
        actualDigest,
        byteLength: bytes.byteLength,
      };
    }
    if (bytes.byteLength !== object.size || actualDigest !== digest) {
      return {
        status: 'corrupt',
        expectedDigest: digest,
        actualDigest,
        byteLength: bytes.byteLength,
      };
    }
    return { status: 'verified', digest, byteLength: bytes.byteLength };
  }

  private assertMetadata(
    object: R2ObjectMetadata,
    digest: ContentDigest,
    byteLength?: number
  ): void {
    const key = contentKeyForDigest(digest);
    if (object.key !== key) throw new R2ContentMetadataError('R2 content object key mismatch');
    if (!Number.isSafeInteger(object.size) || object.size < 0) {
      throw new R2ContentMetadataError('R2 content object size is invalid');
    }
    if (
      object.customMetadata?.schema !== CONTENT_SCHEMA ||
      object.customMetadata.digest !== digest ||
      object.customMetadata.byteLength !== String(object.size)
    ) {
      throw new R2ContentMetadataError('R2 content metadata is missing or mismatched');
    }
    if (byteLength !== undefined && object.size !== byteLength) {
      throw new R2ContentMetadataError('R2 content write length mismatch');
    }
  }

  private assertBounded(byteLength: number): void {
    if (byteLength > this.maxBytes) {
      throw new RangeError(`Content exceeds ${this.maxBytes} byte store limit`);
    }
  }
}

export class R2ContentMetadataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'R2ContentMetadataError';
  }
}
