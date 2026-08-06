/**
 * Enrich pipeline step: normalize raw/parsed odds into relational store.
 */
import { writeProvenanceFromSnapshot, type ProvenanceWriteResult } from '../matching/provenance.ts';
import { ensureMatchingSchema } from '../matching/schema.ts';
import { storeSnapshot, type StoredSnapshotMeta } from '../odds/odds-store.ts';
import type { OddsSnapshot } from '../odds/types.ts';
import { openNormalizedDb } from './schema.ts';
import { storeNormalizedSnapshot, type StoreNormalizedOptions } from './store.ts';

export type EnrichOddsResult = {
  blob: StoredSnapshotMeta | null;
  lines: number;
  events: number;
  provenance: ProvenanceWriteResult;
};

/**
 * Store blob snapshot (optional) + normalized relational lines + provenance history.
 */
export async function enrichOdds(
  snapshot: OddsSnapshot,
  opts: StoreNormalizedOptions & { storeBlob?: boolean; minMovePct?: number } = {}
): Promise<EnrichOddsResult> {
  await openNormalizedDb();
  ensureMatchingSchema();
  let blob: StoredSnapshotMeta | null = null;
  if (opts.storeBlob !== false) {
    blob = storeSnapshot(snapshot);
  }
  const { lines, events } = storeNormalizedSnapshot(snapshot, {
    ...opts,
    snapshotBlobId: blob?.id,
  });
  const provenance = writeProvenanceFromSnapshot(snapshot, {
    session: opts.session ?? 'pregame',
    minMovePct: opts.minMovePct ?? 2,
  });
  return { blob, lines, events, provenance };
}

/**
 * Convenience: enrich from a bookmaker host + already-parsed snapshot.
 */
export async function enrichOddsForHost(
  bookmakerHost: string,
  snapshot: OddsSnapshot,
  opts: StoreNormalizedOptions = {}
): Promise<EnrichOddsResult> {
  // Ensure host on snapshot matches request
  const aligned: OddsSnapshot = {
    ...snapshot,
    host: snapshot.host ?? (bookmakerHost as OddsSnapshot['host']),
  };
  return enrichOdds(aligned, opts);
}
