/**
 * Ingest Tier 4 JSONL observations into Limits Forecast Lab snapshots.
 *
 * Read-only: does not write partner_account_limits. Synthetic node ids
 * (`scrape-{sportsbookId}`) keep scrape series separate from partner accounts.
 *
 * @see docs/harness/tenants/limit-forecast-lab.md
 * @see docs/harness/tenants/partner-limits.md
 */

import {
  asTreeNodeId,
  parseSportsbookId,
  type SportsbookId,
  type TreeNodeId,
} from '../types/branded.ts';
import type { LimitObservation } from '../operations/scrapers/limit-observation-wire.ts';
import { listObservedScrapeBooks } from '../operations/baseline-scraped-limits.ts';
import { readLimitObservations } from '../operations/scrapers/raw-limits-store.ts';
import type { LimitSnapshotSample } from './limit-forecast-lab.ts';

/** Synthetic partner node for one sportsbook's scrape series. */
export function scrapeLabNodeId(sportsbookId: SportsbookId): TreeNodeId {
  return asTreeNodeId(`scrape-${sportsbookId}`);
}

/** Map one observation → lab snapshot (null when opening max missing / bad time). */
export function observationToLabSnapshot(obs: LimitObservation): LimitSnapshotSample | null {
  if (obs.openingMaxUsd == null || !Number.isFinite(obs.openingMaxUsd)) return null;
  const ms = Date.parse(obs.observedAt);
  if (!Number.isFinite(ms)) return null;
  const sportsbookId = parseSportsbookId(obs.sportsbook);
  return {
    nodeId: scrapeLabNodeId(sportsbookId),
    sportsbook: sportsbookId,
    sportKey: obs.sport,
    marketKey: `${obs.market}:${obs.structure}`,
    phase: obs.phase,
    maxWager: obs.openingMaxUsd,
    recordedAt: Math.floor(ms / 1000),
    inputClass: obs.mode === 'fixture' ? 'fixture-seed' : 'tier-4-observation',
    decisionEligible: false,
  };
}

/** Load full JSONL history for all books with files (not latest-only — Lab needs transitions). */
export async function loadScrapeLabSnapshots(root: string): Promise<LimitSnapshotSample[]> {
  const snapshots: LimitSnapshotSample[] = [];
  for (const bookId of await listObservedScrapeBooks(root)) {
    for (const obs of await readLimitObservations(root, bookId)) {
      const sample = observationToLabSnapshot(obs);
      if (sample) snapshots.push(sample);
    }
  }
  return snapshots.sort(
    (left, right) =>
      left.recordedAt - right.recordedAt ||
      left.sportsbook.localeCompare(right.sportsbook) ||
      left.nodeId.localeCompare(right.nodeId)
  );
}

/** Union partner DB snapshots with scrape JSONL (scrape appended). */
export function mergeLabSnapshots(
  partnerSnapshots: readonly LimitSnapshotSample[],
  scrapeSnapshots: readonly LimitSnapshotSample[]
): LimitSnapshotSample[] {
  if (scrapeSnapshots.length === 0) return [...partnerSnapshots];
  return [...partnerSnapshots, ...scrapeSnapshots].sort(
    (left, right) =>
      left.recordedAt - right.recordedAt ||
      left.sportsbook.localeCompare(right.sportsbook) ||
      left.nodeId.localeCompare(right.nodeId)
  );
}
