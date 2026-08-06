// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
/**
 * Event snapshot hot store (local JSON + SQLite index) with optional R2 archive.
 *
 * @see scripts/lib/r2-bridge.ts
 * @see lib/research/canonicalizer.ts
 */

// eslint-disable-next-line no-restricted-imports -- ensure parent dirs before sqlite/file write
import { mkdirSync } from 'node:fs';
import { joinPath } from '../path-bun.ts';
import type { Database } from 'bun:sqlite';
import { ROOT } from '../operator-research/paths.ts';
import { openOddsDb } from '../operator-research/odds/odds-store.ts';
import { ensureCanonicalSchema } from './canonicalizer.ts';
import type { EventMarket, EventSnapshot, PartnerEvent } from './types/event.ts';

const SNAPSHOT_ROOT = joinPath(ROOT, 'data/research/snapshots');

/** Price-only hash — limit changes must not look like price moves. */
export function oddsHash(markets: EventMarket[]): string {
  const payload = JSON.stringify(
    markets.map(m => ({
      type: m.type,
      selections: m.selections.map(s => ({
        label: s.label,
        price: s.price,
      })),
    }))
  );
  return new Bun.CryptoHasher('sha256').update(payload).digest('hex').slice(0, 24);
}

/** Stake/limit fingerprint separate from prices. */
export function limitsHash(markets: EventMarket[], maxStakeUsd?: number): string {
  const payload = JSON.stringify({
    maxStakeUsd: maxStakeUsd ?? null,
    selections: markets.flatMap(m =>
      m.selections.map(s => ({ label: s.label, maxStake: s.maxStake }))
    ),
  });
  return new Bun.CryptoHasher('sha256').update(payload).digest('hex').slice(0, 24);
}

export function createSnapshot(
  event: PartnerEvent, // brand-ok — opaque research/wire id
  canonicalId: string, // brand-ok — opaque research/wire id
  timestamp = new Date().toISOString()
): EventSnapshot {
  return {
    eventId: event.id,
    partnerId: event.partnerId,
    canonicalId,
    timestamp,
    markets: event.markets,
    oddsHash: oddsHash(event.markets),
    session: event.session,
    maxStakeUsd: event.maxStakeUsd,
  };
}
// brand-ok — opaque research/wire id
function snapshotDir(canonicalId: string, partnerId: string): string {
  // brand-ok — opaque research/wire id
  return joinPath(SNAPSHOT_ROOT, canonicalId, partnerId);
}

async function maybeArchiveR2(key: string, snapshot: EventSnapshot): Promise<boolean> {
  try {
    const { resolveR2BridgeConfig, uploadJsonToR2 } = await import(
      '../../scripts/lib/r2-bridge.ts'
    );
    const r2 = resolveR2BridgeConfig();
    await uploadJsonToR2(r2, key, snapshot);
    return true;
  } catch {
    return false;
  }
}

export type StoreSnapshotResult = {
  snapshot: EventSnapshot;
  path: string;
  archived: boolean;
  isNew: boolean;
  priceChanged: boolean;
  limitChanged: boolean;
  changePercent: number | null;
  previous: EventSnapshot | null;
};

function maxStakeOf(snap: EventSnapshot): number {
  if (typeof snap.maxStakeUsd === 'number') return snap.maxStakeUsd;
  let max = 0;
  for (const m of snap.markets) {
    for (const s of m.selections) {
      if (s.maxStake > max) max = s.maxStake;
    }
  }
  return max;
}

function priceChangePercent(prev: EventSnapshot, next: EventSnapshot): number | null {
  const prevPrices = prev.markets.flatMap(m => m.selections.map(s => s.price)).filter(p => p > 0);
  const nextPrices = next.markets.flatMap(m => m.selections.map(s => s.price)).filter(p => p > 0);
  if (!prevPrices.length || !nextPrices.length) return null;
  const a = prevPrices.reduce((x, y) => x + y, 0) / prevPrices.length;
  const b = nextPrices.reduce((x, y) => x + y, 0) / nextPrices.length;
  if (a === 0) return null;
  return ((b - a) / a) * 100;
}

export async function getLatestSnapshot( // brand-ok — opaque research/wire id
  canonicalId: string, // brand-ok — opaque research/wire id
  partnerId: string // brand-ok — opaque research/wire id
): Promise<EventSnapshot | null> {
  const latestPath = joinPath(snapshotDir(canonicalId, partnerId), 'latest.json');
  const file = Bun.file(latestPath);
  if (!(await file.exists())) return null;
  try {
    return (await file.json()) as EventSnapshot;
  } catch {
    return null;
  }
}

export async function storeSnapshot(
  snapshot: EventSnapshot,
  db: Database = openOddsDb()
): Promise<StoreSnapshotResult> {
  ensureCanonicalSchema(db);
  const dir = snapshotDir(snapshot.canonicalId, snapshot.partnerId);
  mkdirSync(dir, { recursive: true });

  const previous = await getLatestSnapshot(snapshot.canonicalId, snapshot.partnerId);
  const isNew = !previous;
  const priceChanged = !!previous && previous.oddsHash !== snapshot.oddsHash;
  const prevLimit = previous ? maxStakeOf(previous) : null;
  const nextLimit = maxStakeOf(snapshot);
  const limitChanged =
    prevLimit != null && Number.isFinite(prevLimit) && Math.abs(prevLimit - nextLimit) > 0.01;
  const changePercent = previous && priceChanged ? priceChangePercent(previous, snapshot) : null;

  const safeTs = snapshot.timestamp.replace(/[:.]/g, '-');
  const path = joinPath(dir, `${safeTs}.json`);
  await Bun.write(path, JSON.stringify(snapshot, null, 2));
  await Bun.write(joinPath(dir, 'latest.json'), JSON.stringify(snapshot, null, 2));

  db.query(
    `INSERT INTO event_snapshots
       (canonical_id, partner_id, timestamp, odds_hash, session, path, max_stake_usd)
     VALUES ($cid, $pid, $ts, $hash, $session, $path, $max)
     ON CONFLICT(canonical_id, partner_id, timestamp) DO UPDATE SET
       odds_hash = excluded.odds_hash,
       path = excluded.path,
       max_stake_usd = excluded.max_stake_usd`
  ).run({
    $cid: snapshot.canonicalId,
    $pid: snapshot.partnerId,
    $ts: snapshot.timestamp,
    $hash: snapshot.oddsHash,
    $session: snapshot.session,
    $path: path,
    $max: nextLimit,
  });

  const r2Key = `events/${snapshot.canonicalId}/${snapshot.partnerId}/${safeTs}.json`;
  const archived = await maybeArchiveR2(r2Key, snapshot);

  return {
    snapshot,
    path,
    archived,
    isNew,
    priceChanged,
    limitChanged,
    changePercent,
    previous,
  };
}

export async function listSnapshots( // brand-ok — opaque research/wire id
  canonicalId: string, // brand-ok — opaque research/wire id
  opts: { partnerId?: string; limit?: number } = {}, // brand-ok — opaque research/wire id
  db: Database = openOddsDb()
): Promise<EventSnapshot[]> {
  ensureCanonicalSchema(db);
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 500);
  const rows = opts.partnerId
    ? (db
        .query(
          `SELECT path FROM event_snapshots
           WHERE canonical_id = $cid AND partner_id = $pid
           ORDER BY timestamp DESC LIMIT $limit`
        )
        .all({
          $cid: canonicalId,
          $pid: opts.partnerId,
          $limit: limit,
        }) as Array<{ path: string }>)
    : (db
        .query(
          `SELECT path FROM event_snapshots
           WHERE canonical_id = $cid
           ORDER BY timestamp DESC LIMIT $limit`
        )
        .all({ $cid: canonicalId, $limit: limit }) as Array<{ path: string }>);

  const out: EventSnapshot[] = [];
  for (const row of rows) {
    try {
      const file = Bun.file(row.path);
      if (await file.exists()) out.push((await file.json()) as EventSnapshot);
    } catch {
      /* skip */
    }
  }
  return out;
}
