// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @updated Bun.CryptoHasher · changed v0.5.0 · 2023-01-18 · https://bun.com/blog/bun-v0.5.0
// @updated Bun.CryptoHasher · fixed v1.0.19 · 2023-12-22 · https://bun.com/blog/bun-v1.0.19
// @updated Bun.CryptoHasher · changed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.CryptoHasher · fixed v1.1.11 · 2024-06-01 · https://bun.com/blog/bun-v1.1.11
// @updated Bun.CryptoHasher · fixed v1.1.32 · 2024-10-21 · https://bun.com/blog/bun-v1.1.32
// @updated Bun.CryptoHasher · fixed v1.1.35 · 2024-11-19 · https://bun.com/blog/bun-v1.1.35
// @verified Bun.CryptoHasher · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/hashing#bun-cryptohasher
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * Repository adapter for deterministic Bun official-source snapshots.
 *
 * Paths belong to the docs artifact contract. Source authority and validation
 * belong to bun-official-sources.ts; this adapter only materializes bytes.
 */
import { DOCS_FEEDS_ABS, DOCS_INDEX_ABS } from './docs-artifact-paths.ts';
import {
  parseOfficialBunDocumentationIndexes,
  type BunOfficialSourceSnapshots,
  type OfficialBunDocumentationIndexes,
} from './bun-official-sources.ts';

export type BunSourceSnapshotLocations = {
  docsIndex: string;
  docsFeeds: string;
};

export const REPOSITORY_BUN_SOURCE_SNAPSHOTS: BunSourceSnapshotLocations = {
  docsIndex: DOCS_INDEX_ABS,
  docsFeeds: DOCS_FEEDS_ABS,
};

export async function readBunOfficialSourceSnapshots(
  locations: BunSourceSnapshotLocations = REPOSITORY_BUN_SOURCE_SNAPSHOTS
): Promise<BunOfficialSourceSnapshots> {
  const [docsText, feedsText] = await Promise.all([
    Bun.file(locations.docsIndex).text(),
    Bun.file(locations.docsFeeds).text(),
  ]);
  const digest = (contents: string): string => {
    const hasher = new Bun.CryptoHasher('sha256');
    hasher.update(contents);
    return hasher.digest('hex');
  };
  return {
    docs: JSON.parse(docsText) as unknown,
    feeds: JSON.parse(feedsText) as unknown,
    docsSha256: digest(docsText),
    feedsSha256: digest(feedsText),
  };
}

export async function loadOfficialBunDocumentationIndexes(
  locations?: BunSourceSnapshotLocations
): Promise<OfficialBunDocumentationIndexes> {
  return parseOfficialBunDocumentationIndexes(await readBunOfficialSourceSnapshots(locations));
}
