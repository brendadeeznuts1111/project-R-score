// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @updated bun:sqlite · fixed v0.2.0 · 2022-10-13 · https://bun.com/blog/bun-v0.2.0
// @updated bun:sqlite · fixed v0.3.0 · 2022-12-07 · https://bun.com/blog/bun-v0.3.0
// @updated bun:sqlite · fixed v0.5.6 · 2023-02-09 · https://bun.com/blog/bun-v0.5.6
// @updated bun:sqlite · changed v0.6.8 · 2023-06-09 · https://bun.com/blog/bun-v0.6.8
// @updated bun:sqlite · fixed v0.6.10 · 2023-06-26 · https://bun.com/blog/bun-v0.6.10
// @updated bun:sqlite · changed v0.7.1 · 2023-07-29 · https://bun.com/blog/bun-v0.7.1
// @updated bun:sqlite · fixed v0.7.3 · 2023-08-06 · https://bun.com/blog/bun-v0.7.3
// @updated bun:sqlite · fixed v1.0.3 · 2023-09-22 · https://bun.com/blog/bun-v1.0.3
// @updated bun:sqlite · fixed v1.0.7 · 2023-10-20 · https://bun.com/blog/bun-v1.0.7
// @updated bun:sqlite · fixed v1.0.10 · 2023-11-07 · https://bun.com/blog/bun-v1.0.10
// @updated bun:sqlite · fixed v1.0.12 · 2023-11-16 · https://bun.com/blog/bun-v1.0.12
// @updated bun:sqlite · fixed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated bun:sqlite · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated bun:sqlite · fixed v1.0.24 · 2024-01-20 · https://bun.com/blog/bun-v1.0.24
// @updated bun:sqlite · changed v1.0.26 · 2024-02-03 · https://bun.com/blog/bun-v1.0.26
// @updated bun:sqlite · fixed v1.0.27 · 2024-02-17 · https://bun.com/blog/bun-v1.0.27
// @updated bun:sqlite · fixed v1.0.28 · 2024-02-19 · https://bun.com/blog/bun-v1.0.28
// @updated bun:sqlite · fixed v1.0.29 · 2024-02-23 · https://bun.com/blog/bun-v1.0.29
// @updated bun:sqlite · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated bun:sqlite · fixed v1.1.4 · 2024-04-16 · https://bun.com/blog/bun-v1.1.4
// @updated bun:sqlite · fixed v1.1.5 · 2024-04-26 · https://bun.com/blog/bun-v1.1.5
// @updated bun:sqlite · fixed v1.1.6 · 2024-04-28 · https://bun.com/blog/bun-v1.1.6
// @updated bun:sqlite · changed v1.1.14 · 2024-06-19 · https://bun.com/blog/bun-v1.1.14
// @updated bun:sqlite · fixed v1.1.14 · 2024-06-19 · https://bun.com/blog/bun-v1.1.14
// @updated bun:sqlite · fixed v1.1.16 · 2024-06-23 · https://bun.com/blog/bun-v1.1.16
// @updated bun:sqlite · fixed v1.1.34 · 2024-11-02 · https://bun.com/blog/bun-v1.1.34
// @updated bun:sqlite · changed v1.1.38 · 2024-11-29 · https://bun.com/blog/bun-v1.1.38
// @updated bun:sqlite · changed v1.2.0 · 2025-01-22 · https://bun.com/blog/bun-v1.2
// @updated bun:sqlite · changed v1.2.6 · 2025-03-25 · https://bun.com/blog/bun-v1.2.6
// @updated bun:sqlite · changed v1.2.17 · 2025-06-21 · https://bun.com/blog/bun-v1.2.17
// @updated bun:sqlite · changed v1.2.18 · 2025-07-03 · https://bun.com/blog/bun-v1.2.18
// @updated bun:sqlite · fixed v1.2.18 · 2025-07-03 · https://bun.com/blog/bun-v1.2.18
// @updated bun:sqlite · changed v1.2.20 · 2025-08-10 · https://bun.com/blog/bun-v1.2.20
// @updated bun:sqlite · changed v1.2.21 · 2025-08-25 · https://bun.com/blog/bun-v1.2.21
// @updated bun:sqlite · fixed v1.3.2 · 2025-11-08 · https://bun.com/blog/bun-v1.3.2
// @updated bun:sqlite · changed v1.3.3 · 2025-11-21 · https://bun.com/blog/bun-v1.3.3
// @updated bun:sqlite · fixed v1.3.4 · 2025-12-06 · https://bun.com/blog/bun-v1.3.4
// @updated bun:sqlite · fixed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated bun:sqlite · changed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified bun:sqlite · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/sqlite
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @updated Bun.randomUUIDv7 · changed v1.1.34 · 2024-11-02 · https://bun.com/blog/bun-v1.1.34
// @verified Bun.randomUUIDv7 · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/utils#bun-randomuuidv7
// @see https://bun.com/docs/runtime/sqlite
/**
 * Liquidity positions — optimistic locking for concurrent play reservation.
 * Platform capacity / coverage gates live in platform-coverage.ts;
 * partner experiment floors via canOfferStakeForNode.
 */
import type { Database } from 'bun:sqlite';
import { randomUUIDv7 } from 'bun';
import { canOfferStakeForNode } from '../experiments/outcomes.ts';
import {
  canOfferOnPlatform,
  getPlatformCapacities,
  type PlatformCapacity,
} from './platform-coverage.ts';

export type { PlatformCapacity };
export { canOfferOnPlatform, getPlatformCapacities, canOfferStakeForNode };

export type ReserveResult =
  | { ok: true; positionId: string; remaining: number } // brand-ok — positions.id
  | { ok: false; reason: string };

export type ReservePlayOpts = {
  /**
   * When `book` is a platform id (not `_all`), enforce coverage + experiment
   * floor for the node before reserving stake.
   */
  checkCoverage?: boolean;
  minCoveragePct?: number;
};

export function ensurePosition(
  db: Database,
  nodeId: string, // brand-ok — TreeNodeId
  book = '_all',
  initialAvailable = 0
): string {
  const existing = db
    .query('SELECT id FROM positions WHERE node_id = $nid AND book = $book')
    .get({ $nid: nodeId, $book: book }) as { id: string } | null; // brand-ok
  if (existing) return existing.id;

  const id = randomUUIDv7();
  db.run(
    `INSERT INTO positions (id, node_id, book, deposited, available, in_play, version)
     VALUES ($id, $nid, $book, $dep, $avail, 0, 0)`,
    { $id: id, $nid: nodeId, $book: book, $dep: initialAvailable, $avail: initialAvailable }
  );
  return id;
}

export function reconcilePositionFromAccounts(
  db: Database,
  nodeId: string, // brand-ok — TreeNodeId
  book = '_all'
): number {
  const row = db
    .query(
      `SELECT COALESCE(SUM(balance), 0) as total FROM sb_accounts
       WHERE agent_id = $nid AND status = 'active'`
    )
    .get({ $nid: nodeId }) as { total: number };
  const id = ensurePosition(db, nodeId, book, row.total);
  const now = new Date().toISOString();
  db.run(
    `UPDATE positions SET deposited = $dep, available = $dep - in_play, last_reconciled = $now WHERE id = $id`,
    { $dep: row.total, $now: now, $id: id }
  );
  return row.total;
}

function runImmediate<T>(db: Database, fn: () => T): T {
  db.run('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.run('COMMIT');
    return result;
  } catch (e) {
    db.run('ROLLBACK');
    throw e;
  }
}

/**
 * Atomically reserve stake against a node position (BEGIN IMMEDIATE + version check).
 * Pass `opts.checkCoverage` with a platform `book` to honor experiment coverage floors.
 */
export function reservePlay(
  db: Database,
  nodeId: string, // brand-ok — TreeNodeId
  amount: number,
  book = '_all',
  opts?: ReservePlayOpts
): ReserveResult {
  if (amount <= 0) return { ok: false, reason: 'Amount must be positive' };

  if (opts?.checkCoverage && book !== '_all') {
    if (!canOfferStakeForNode(db, book, amount, nodeId, opts.minCoveragePct)) {
      return {
        ok: false,
        reason: `Coverage/liquidity gate failed for platform ${book}`,
      };
    }
  }

  ensurePosition(db, nodeId, book);

  try {
    return runImmediate(db, () => {
      const row = db
        .query(`SELECT id, available, version FROM positions WHERE node_id = $nid AND book = $book`)
        .get({ $nid: nodeId, $book: book }) as {
        id: string; // brand-ok
        available: number;
        version: number;
      };

      if (row.available < amount) {
        throw new Error(`Insufficient liquidity: $${row.available} < $${amount}`);
      }

      const updated = db.run(
        `UPDATE positions SET available = available - $amt, in_play = in_play + $amt,
         version = version + 1 WHERE id = $id AND version = $ver`,
        { $amt: amount, $id: row.id, $ver: row.version }
      );

      if (updated.changes !== 1) {
        throw new Error('Concurrent modification — retry');
      }

      return { ok: true as const, positionId: row.id, remaining: row.available - amount };
    });
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}

const RESERVE_RETRYABLE = /Concurrent modification/i;

/**
 * Reserve with bounded retry on optimistic-lock conflict (M4).
 */
export function reservePlayWithRetry(
  db: Database,
  nodeId: string, // brand-ok — TreeNodeId
  amount: number,
  book = '_all',
  opts?: ReservePlayOpts,
  maxAttempts = 3
): ReserveResult {
  let last: ReserveResult = { ok: false, reason: 'No attempts' };
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    last = reservePlay(db, nodeId, amount, book, opts);
    if (last.ok) return last;
    if (!RESERVE_RETRYABLE.test(last.reason)) return last;
  }
  return last;
}

/** Release reserved stake back to available (play void/push). */
export function releasePlay(
  db: Database,
  nodeId: string, // brand-ok — TreeNodeId
  amount: number,
  book = '_all'
): void {
  db.run(
    `UPDATE positions SET available = available + $amt, in_play = MAX(0, in_play - $amt),
     version = version + 1 WHERE node_id = $nid AND book = $book`,
    { $amt: amount, $nid: nodeId, $book: book }
  );
}

/** Reserve against operations pool (global liquidity). */
export function reserveOperationsLiquidity(db: Database, amount: number): ReserveResult {
  if (amount <= 0) return { ok: false, reason: 'Amount must be positive' };
  try {
    return runImmediate(db, () => {
      const row = db
        .query(`SELECT total_liquidity, total_exposure, version FROM operations WHERE id = 'main'`)
        .get() as { total_liquidity: number; total_exposure: number; version: number } | null;
      if (!row) throw new Error('operations row missing');
      const available = row.total_liquidity - row.total_exposure;
      if (available < amount) {
        throw new Error(`Insufficient ops liquidity: $${available} < $${amount}`);
      }
      const updated = db.run(
        `UPDATE operations SET total_exposure = total_exposure + $amt, version = version + 1
         WHERE id = 'main' AND version = $ver`,
        { $amt: amount, $ver: row.version }
      );
      if (updated.changes !== 1) throw new Error('Concurrent modification — retry');
      return { ok: true as const, positionId: 'main', remaining: available - amount };
    });
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}
