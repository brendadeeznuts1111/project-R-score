// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
/**
 * Seat desk maxBet vs last-known sportsbook max from `partner_account_limits`.
 *
 * Dual vocabulary (do not dual-write):
 * - **maxBet** — negotiated out terms on seat intake (desk display / Fill)
 * - **partner_account_limits.max_wager** — detected book history (ops SQLite)
 *
 * Pure format helpers are safe without a DB. Lookup helpers read ops SQLite
 * when available and never write desk maxBet into limit history.
 */
import type { Database } from 'bun:sqlite';
import { AccountLimitsRepository, type LatestBookLimit } from '../account-limits-repo.ts';
import { DEFAULT_OPS_DB_PATH, openOperationsDb } from '../operations/db.ts';
import {
  formatOutId,
  normalizeSeatIntake,
  type SeatIntakeRecord,
  type SeatOut,
} from './seat-intake.ts';

/** Desk-facing compare of negotiated maxBet vs last known book max. */
export type DeskBookMaxCompare = {
  /** Matched `partner_account_limits.sportsbook` label */
  sportsbook: string;
  /** Last known max_wager for that book */
  bookMax: number;
  recordedAt: number;
  /** Prior max when latest row raised; else null */
  previousMax: number | null;
};

/**
 * Normalize a desk book label or limits sportsbook key for fuzzy match.
 * `www.DraftKings.com` → `draftkings`, `parlay21.com` → `parlay21`.
 */
export function normalizeSportsbookKey(raw: string): string {
  let s = raw.trim().toLowerCase();
  if (!s) return '';
  s = s.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  s = (s.split('/')[0] ?? s).split('?')[0] ?? s;
  if (s.includes('.')) {
    const host = s.split('.')[0] ?? s;
    s = host;
  }
  return s.replace(/[^a-z0-9]+/g, '');
}

/** True when desk out book and limits sportsbook refer to the same book. */
export function sportsbookKeysMatch(deskBook: string, limitsSportsbook: string): boolean {
  const a = normalizeSportsbookKey(deskBook);
  const b = normalizeSportsbookKey(limitsSportsbook);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

/**
 * Parse desk maxBet display text into a USD number.
 * `$500` / `1,500` / `1k` → number; unit sizes (`2.5u`) and empty → null.
 */
export function parseDeskMaxBetAmount(raw: string | undefined | null): number | null {
  if (raw == null) return null;
  let t = raw.trim().toLowerCase().replace(/,/g, '');
  if (!t) return null;
  t = t.replace(/^\$/, '').trim();
  if (!t) return null;
  // Units (e.g. 2.5u) are not USD — skip delta math
  if (/\d\s*u\b/.test(t) || t.endsWith('u')) return null;
  const k = t.match(/^(\d+(?:\.\d+)?)\s*k$/i);
  if (k) {
    const n = Number(k[1]) * 1000;
    return Number.isFinite(n) ? n : null;
  }
  const m = t.match(/^(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

export function formatUsdAmount(n: number): string {
  return `$${Number(n).toLocaleString('en-US')}`;
}

/**
 * One-line compare for desk / toast.
 *
 * Examples:
 * - `Book max (last known): $1,500 · desk maxBet: $500 · Δ −$1,000`
 * - `Book max (last known): no book history`
 */
export function formatBookMaxDeltaLine(opts: {
  bookMax: number | null | undefined;
  deskMaxBet: string | null | undefined;
  /** When set and book history exists, prefix is unchanged (sportsbook is not required). */
  sportsbook?: string;
}): string {
  const deskLabel = opts.deskMaxBet?.trim() || '—';
  if (opts.bookMax == null || !Number.isFinite(opts.bookMax)) {
    return 'Book max (last known): no book history';
  }
  const bookStr = formatUsdAmount(opts.bookMax);
  const deskAmt = parseDeskMaxBetAmount(opts.deskMaxBet);
  let delta = '';
  if (deskAmt != null) {
    const d = deskAmt - opts.bookMax;
    if (d === 0) {
      delta = ' · Δ $0';
    } else {
      const sign = d > 0 ? '+' : '−';
      delta = ` · Δ ${sign}${formatUsdAmount(Math.abs(d))}`;
    }
  }
  return `Book max (last known): ${bookStr} · desk maxBet: ${deskLabel}${delta}`;
}

/** Confirm toast after operator sets maxBet. */
export function formatMaxBetSetConfirm(opts: {
  outId: string; // brand-ok — seat out token
  deskMaxBet: string;
  bookMax: number | null | undefined;
}): string {
  const base = `${opts.outId} max bet set.`;
  const line = formatBookMaxDeltaLine({
    bookMax: opts.bookMax,
    deskMaxBet: opts.deskMaxBet,
  });
  return `${base} ${line}`;
}

/**
 * Format last-known book max as desk maxBet display text (USD).
 * Desk storage only — never writes into partner_account_limits.
 */
export function formatBookMaxAsDeskMaxBet(bookMax: number): string {
  return formatUsdAmount(bookMax);
}

/**
 * True when desk maxBet is missing, unparseable as USD, or ≠ book max.
 * Units (`2.5u`) count as differing (cannot compare) so adopt is offered.
 */
export function deskMaxBetDiffersFromBookMax(
  deskMaxBet: string | null | undefined,
  bookMax: number
): boolean {
  if (!Number.isFinite(bookMax)) return false;
  const desk = parseDeskMaxBetAmount(deskMaxBet);
  if (desk == null) return true;
  return desk !== bookMax;
}

/**
 * Offer Fill-path "Use book max" when book history exists and desk maxBet differs.
 * Pure — caller supplies last-known book max (no dual-write).
 */
export function shouldOfferAdoptBookMax(opts: {
  bookMax: number | null | undefined;
  deskMaxBet: string | null | undefined;
}): boolean {
  if (opts.bookMax == null || !Number.isFinite(opts.bookMax) || opts.bookMax < 0) {
    return false;
  }
  return deskMaxBetDiffersFromBookMax(opts.deskMaxBet, opts.bookMax);
}

/** Button label for adopt-from-book action (shows amount = one confirm). */
export function formatAdoptBookMaxButtonLabel(bookMax: number): string {
  return `Use book ${formatUsdAmount(bookMax)}`;
}

/** Confirm-keyboard label before applying book max → desk maxBet. */
export function formatAdoptBookMaxConfirmLabel(bookMax: number): string {
  return `✓ Set maxBet ${formatUsdAmount(bookMax)}`;
}

/**
 * Toast after adopting book max onto desk maxBet.
 * Distinct from free-text set so operators see the source.
 */
export function formatAdoptBookMaxConfirm(opts: {
  outId: string; // brand-ok — seat out token
  deskMaxBet: string;
  bookMax: number;
}): string {
  return `${opts.outId} max bet adopted from book max ${formatUsdAmount(opts.bookMax)}. ${formatBookMaxDeltaLine(
    {
      bookMax: opts.bookMax,
      deskMaxBet: opts.deskMaxBet,
    }
  )}`;
}

/** Prefer last raise `new_limit` when present and higher; else latest max_wager. */
export function bookMaxFromLatestLimit(limit: LatestBookLimit): number {
  return limit.max_wager;
}

export function deskBookMaxCompareFromLimit(limit: LatestBookLimit): DeskBookMaxCompare {
  return {
    sportsbook: limit.sportsbook,
    bookMax: bookMaxFromLatestLimit(limit),
    recordedAt: limit.recorded_at,
    previousMax:
      limit.previous_max != null && limit.max_wager > limit.previous_max
        ? limit.previous_max
        : limit.previous_max,
  };
}

/**
 * Match a desk out book label against latest limits for a node.
 * Exact sportsbook key first, then fuzzy host/brand match.
 */
export function matchDeskBookToLatestLimit(
  deskBook: string,
  limits: readonly LatestBookLimit[]
): LatestBookLimit | null {
  const raw = deskBook.trim();
  if (!raw || limits.length === 0) return null;
  const key = normalizeSportsbookKey(raw);
  const exact = limits.find(l => l.sportsbook.trim().toLowerCase() === raw.toLowerCase());
  if (exact) return exact;
  const keyExact = limits.find(l => normalizeSportsbookKey(l.sportsbook) === key);
  if (keyExact) return keyExact;
  return limits.find(l => sportsbookKeysMatch(raw, l.sportsbook)) ?? null;
}

/**
 * Resolve tree_nodes.id by call_sign (active seats). Best-effort — null when
 * schema missing or no row (in-memory limits-only tests still work with explicit nodeId).
 */
export function resolveNodeIdByCallSign(
  db: Database,
  callSign: string // brand-ok — seat call-sign wire
): string | null {
  // brand-ok — TreeNodeId wire when present
  const cs = callSign.trim();
  if (!cs) return null;
  try {
    const row = db
      .query(
        `SELECT id FROM tree_nodes WHERE call_sign = $cs AND (active = 1 OR active IS NULL) LIMIT 1`
      )
      .get({ $cs: cs }) as { id: string } | null; // brand-ok — TreeNodeId wire
    return row?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolve all tree node ids that may own sportsbook limits for a seat desk record:
 * exact call_sign, partner CODE root, and CODE-% seats (TOC identity bridge).
 */
export function resolveNodeIdsForSeatDesk(
  db: Database,
  record: SeatIntakeRecord,
  opts?: { nodeId?: string /* brand-ok — TreeNodeId wire */ }
): string[] {
  // brand-ok — TreeNodeId wires
  const ids = new Set<string>();
  if (opts?.nodeId?.trim()) ids.add(opts.nodeId.trim());
  const byCs = resolveNodeIdByCallSign(db, record.callSign);
  if (byCs) ids.add(byCs);
  const code = (record.partnerCode ?? record.callSign.split('-')[0] ?? '').trim().toUpperCase();
  if (code.length >= 2) {
    try {
      const rows = db
        .query(
          `SELECT id FROM tree_nodes
           WHERE (active = 1 OR active IS NULL)
             AND (
               call_sign = $code
               OR call_sign LIKE $prefix
               OR id = $code
             )`
        )
        .all({ $code: code, $prefix: `${code}-%` }) as Array<{ id: string }>; // brand-ok — TreeNodeId wire
      for (const r of rows) {
        if (r.id?.trim()) ids.add(r.id.trim());
      }
    } catch {
      /* tree_nodes optional */
    }
  }
  return [...ids];
}

/** Merge latest-per-sportsbook rows from multiple nodes (newest recorded_at wins per book). */
export function mergeLatestLimitsBySportsbook(
  batches: readonly LatestBookLimit[][]
): LatestBookLimit[] {
  const best = new Map<string, LatestBookLimit>();
  for (const batch of batches) {
    for (const row of batch) {
      const key = normalizeSportsbookKey(row.sportsbook) || row.sportsbook.toLowerCase();
      const prev = best.get(key);
      if (!prev || row.recorded_at > prev.recorded_at) best.set(key, row);
    }
  }
  return [...best.values()];
}

function outBookLabel(out: SeatOut): string {
  return (out.book ?? out.url ?? '').trim();
}

function outIdOf(record: SeatIntakeRecord, out: SeatOut, index: number): string {
  // brand-ok — seat out token
  return (out.outId ?? formatOutId(record.partnerCode, index)).toUpperCase();
}

/**
 * Pure: given pre-fetched latest limits, map each out → compare (or null = no history).
 * Does not open a DB.
 */
export function mapOutsToBookMaxCompares(
  record: SeatIntakeRecord,
  limits: readonly LatestBookLimit[]
): Map<string, DeskBookMaxCompare | null> {
  // brand-ok — seat out token keys
  const hydrated = normalizeSeatIntake(record);
  const map = new Map<string, DeskBookMaxCompare | null>();
  hydrated.outs.forEach((out, i) => {
    const id = outIdOf(hydrated, out, i);
    const matched = matchDeskBookToLatestLimit(outBookLabel(out), limits);
    map.set(id, matched ? deskBookMaxCompareFromLimit(matched) : null);
  });
  return map;
}

/**
 * Lookup latest book max per out for a seat intake record.
 * Pass `nodeId` when known (tests / ops); else resolve via `tree_nodes.call_sign`.
 */
export function loadBookMaxComparesForSeatDesk(
  db: Database,
  record: SeatIntakeRecord,
  opts?: { nodeId?: string /* brand-ok — TreeNodeId wire */ }
): Map<string, DeskBookMaxCompare | null> | null {
  const nodeIds = resolveNodeIdsForSeatDesk(db, record, opts);
  if (nodeIds.length === 0) {
    // Still return empty map so callers can show "no book history" lines
    return mapOutsToBookMaxCompares(record, []);
  }
  const repo = new AccountLimitsRepository(db);
  const batches = nodeIds.map(id => repo.latestLimitsPerSportsbook(id));
  const limits = mergeLatestLimitsBySportsbook(batches);
  return mapOutsToBookMaxCompares(record, limits);
}

/**
 * Best-effort open of ops DB + book-max map for a desk record.
 * Returns null when DB/node unavailable (desk still renders without compare lines).
 */
export function tryLoadBookMaxComparesForSeatDesk(
  record: SeatIntakeRecord,
  opts?: {
    db?: Database;
    nodeId?: string; // brand-ok — TreeNodeId wire
    dbPath?: string;
  }
): Map<string, DeskBookMaxCompare | null> | null {
  if (opts?.db) {
    try {
      return loadBookMaxComparesForSeatDesk(opts.db, record, { nodeId: opts.nodeId });
    } catch {
      return null;
    }
  }
  let db: Database | null = null;
  try {
    db = openOperationsDb({
      path: opts?.dbPath?.trim() || Bun.env.OPS_DB_PATH?.trim() || DEFAULT_OPS_DB_PATH,
    });
    return loadBookMaxComparesForSeatDesk(db, record, { nodeId: opts?.nodeId });
  } catch {
    return null;
  } finally {
    try {
      db?.close();
    } catch {
      /* ignore */
    }
  }
}

/** Single-out lookup for maxBet prompt / confirm (null when no history). */
export function lookupBookMaxForOut(
  db: Database,
  record: SeatIntakeRecord,
  outId: string, // brand-ok — seat out token
  opts?: { nodeId?: string /* brand-ok — TreeNodeId wire */ }
): DeskBookMaxCompare | null {
  const map = loadBookMaxComparesForSeatDesk(db, record, opts);
  if (!map) return null;
  return map.get(outId.toUpperCase().trim()) ?? null;
}

export function tryLookupBookMaxForOut(
  record: SeatIntakeRecord,
  outId: string, // brand-ok — seat out token
  opts?: { db?: Database; nodeId?: string; dbPath?: string } // brand-ok — TreeNodeId wire
): DeskBookMaxCompare | null {
  const map = tryLoadBookMaxComparesForSeatDesk(record, opts);
  if (!map) return null;
  return map.get(outId.toUpperCase().trim()) ?? null;
}

/** Format lines for rich desk body (one per out when compares map is present). */
export function formatOutBookMaxLines(
  record: SeatIntakeRecord,
  compares: ReadonlyMap<string, DeskBookMaxCompare | null>
): Array<{ outId: string; outNum: string; book: string; line: string }> {
  // brand-ok — seat out token
  const hydrated = normalizeSeatIntake(record);
  return hydrated.outs.map((out, i) => {
    const outId = outIdOf(hydrated, out, i);
    const compare = compares.get(outId) ?? null;
    const deskMax = out.maxBet?.trim();
    return {
      outId,
      outNum: String(i + 1),
      book: outBookLabel(out) || '—',
      line: formatBookMaxDeltaLine({
        bookMax: compare?.bookMax ?? null,
        deskMaxBet: deskMax,
        sportsbook: compare?.sportsbook,
      }),
    };
  });
}
