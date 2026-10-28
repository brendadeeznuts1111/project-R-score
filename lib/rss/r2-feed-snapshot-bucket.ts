import type { R2Conditional, R2ObjectBody, R2ObjectMetadata } from '../content-store/index.ts';

export const FEED_SNAPSHOT_ALIAS_SCHEMA = 'factorywager.feed-snapshot-alias' as const;
export const FEED_SNAPSHOT_ALIAS_VERSION = 1 as const;

/** Minimal Workers R2 alias binding surface; credentials remain outside the adapter. */
export interface R2FeedSnapshotAliasBucket {
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
