import type { ContentDigest, ContentKey } from '../types/branded.ts';
import { contentDigestForBytes, contentKeyForDigest } from './content-contract.ts';

export type StoredContent = {
  readonly digest: ContentDigest;
  readonly key: ContentKey;
  readonly byteLength: number;
  readonly created: boolean;
};

export type ContentVerification =
  | { readonly status: 'missing'; readonly expectedDigest: ContentDigest }
  | { readonly status: 'verified'; readonly digest: ContentDigest; readonly byteLength: number }
  | {
      readonly status: 'corrupt';
      readonly expectedDigest: ContentDigest;
      readonly actualDigest: ContentDigest;
      readonly byteLength: number;
    }
  | {
      readonly status: 'oversized';
      readonly expectedDigest: ContentDigest;
      readonly byteLength: number;
      readonly maxBytes: number;
    };

export interface ContentStore {
  put(bytes: Uint8Array): Promise<StoredContent>;
  get(digest: ContentDigest): Promise<Uint8Array | undefined>;
  has(digest: ContentDigest): Promise<boolean>;
  verify(digest: ContentDigest): Promise<ContentVerification>;
}

export class ContentStoreIntegrityError extends Error {
  constructor(
    readonly verification: Exclude<ContentVerification, { status: 'verified' | 'missing' }>
  ) {
    super(`Content store ${verification.status}: ${verification.expectedDigest}`);
    this.name = 'ContentStoreIntegrityError';
  }
}

/** Bounded application CAS for tests and process-local use; unrelated to Bun's package globalStore. */
export class MemoryContentStore implements ContentStore {
  readonly maxBytes: number;
  readonly #backing: Map<ContentDigest, Uint8Array>;

  constructor(
    options: {
      readonly maxBytes?: number;
      /** Adapter injection for recovery tests; callers must not mutate it during normal operation. */
      readonly backing?: Map<ContentDigest, Uint8Array>;
    } = {}
  ) {
    const maxBytes = options.maxBytes ?? 64 * 1024 * 1024;
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
      throw new RangeError('Content store maxBytes must be a nonnegative safe integer');
    }
    this.maxBytes = maxBytes;
    this.#backing = options.backing ?? new Map();
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

    this.#backing.set(digest, bytes.slice());
    return { digest, key, byteLength: bytes.byteLength, created: true };
  }

  async get(digest: ContentDigest): Promise<Uint8Array | undefined> {
    const bytes = this.#backing.get(digest);
    if (bytes === undefined) return undefined;
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
    return bytes.slice();
  }

  async has(digest: ContentDigest): Promise<boolean> {
    return this.#backing.has(digest);
  }

  async verify(digest: ContentDigest): Promise<ContentVerification> {
    const bytes = this.#backing.get(digest);
    if (bytes === undefined) return { status: 'missing', expectedDigest: digest };
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

  private assertBounded(byteLength: number): void {
    if (byteLength > this.maxBytes) {
      throw new RangeError(`Content exceeds ${this.maxBytes} byte store limit`);
    }
  }
}
