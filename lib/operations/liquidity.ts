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

/** Ensure a position row exists for node + book. */
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

/** Sync position.available from sb_accounts balances for an agent node. */
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
