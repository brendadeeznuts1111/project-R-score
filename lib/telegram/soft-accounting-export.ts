// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * Soft → Factory read-only accounting export wire (v1).
 *
 * Soft Balance / MessageLog mutations stay in toc-ops-repo `ct`.
 * This module only describes (and optionally projects) a versioned slice
 * Factory may consume for ops.view per_play / per_week / per_book_type builders.
 *
 * @see docs/design/soft-handshake.md
 * @see lib/telegram/ops-accounting-view.ts
 * @see lib/toc-ops/types.ts
 */
import type { TocOpsSnapshot, TocPlay, TocPlayResult } from '../toc-ops/types.ts';
import {
  type OpsAccountingViewSummary,
  type OpsPerAccountAccountingView,
  validateOpsAccountingViewShape,
} from './ops-accounting-view.ts';
import { parseBookType } from './partner-ops-registry.ts';

export const SOFT_ACCOUNTING_EXPORT_SCHEMA = 'factorywager.soft-accounting-export.v1' as const;
export const SOFT_ACCOUNTING_EXPORT_REL = 'public/registry/soft-accounting-export.json';
export const SOFT_ACCOUNTING_EXPORT_PATH = '/registry/soft-accounting-export.json' as const;

export type SoftAccountingExportSource = 'unavailable' | 'toc-ops-fixture' | 'soft-ct';

export type SoftAccountingPlayRow = {
  playId: string; // brand-ok — Soft play token (no PlayId brand yet)
  partnerCode: string; // brand-ok — partner CODE
  stake: number;
  odds: number;
  result: TocPlayResult;
  pnl: number | null;
  placedAt: string;
  settledAt?: string;
  /** Optional Kalshi `book.type.*` when Soft tags the venue class. */
  bookType?: string; // brand-ok — glossary concept key
  market?: string;
};

export type SoftAccountingWeekRow = {
  weekStart: string;
  partnerCode: string; // brand-ok — partner CODE
  deposits: number;
  withdrawals: number;
  settlements: number;
  fees: number;
  net: number;
};

export type SoftAccountingBookTypeRow = {
  bookType: string; // brand-ok — book.type.*
  partnerCode: string; // brand-ok — partner CODE
  deposits: number;
  settlements: number;
  fees: number;
  net: number;
};

export type SoftAccountingExport = {
  schema: typeof SOFT_ACCOUNTING_EXPORT_SCHEMA;
  version: '1';
  generatedAt: string;
  source: SoftAccountingExportSource;
  available: boolean;
  path: typeof SOFT_ACCOUNTING_EXPORT_PATH;
  plays: readonly SoftAccountingPlayRow[];
  weeks: readonly SoftAccountingWeekRow[];
  byBookType: readonly SoftAccountingBookTypeRow[];
};

export type SoftPerPlayAccountingView = {
  type: 'per_play';
  playId: string; // brand-ok — Soft play token
  partnerCode: string; // brand-ok — partner CODE
  summary: OpsAccountingViewSummary;
  conceptIds: {
    dimension: 'ops.view.per_play';
  };
  play: SoftAccountingPlayRow;
};

export type SoftPerWeekAccountingView = {
  type: 'per_week';
  weekStart: string;
  partnerCode: string; // brand-ok — partner CODE
  summary: OpsAccountingViewSummary;
  conceptIds: {
    dimension: 'ops.view.per_week';
  };
  week: SoftAccountingWeekRow;
};

export type SoftPerBookTypeAccountingView = {
  type: 'per_book_type';
  bookType: string; // brand-ok — book.type.*
  partnerCode: string; // brand-ok — partner CODE
  summary: OpsAccountingViewSummary;
  conceptIds: {
    dimension: 'ops.view.per_book_type';
  };
  book: SoftAccountingBookTypeRow;
};

/** Portal/dossier chrome over Soft export plays for one partner CODE. */
export type SoftPartnerPlayChrome = {
  partnerCode: string; // brand-ok — partner CODE
  available: boolean;
  source: SoftAccountingExportSource;
  path: typeof SOFT_ACCOUNTING_EXPORT_PATH;
  playCount: number;
  conceptId: 'ops.view.per_play';
  weekConceptId: 'ops.view.per_week';
  bookConceptId: 'ops.view.per_book_type';
  /** Newest-first, capped for board render. */
  plays: readonly SoftAccountingPlayRow[];
  /** Per-play AccountingViews (same order as `plays`). */
  views: readonly SoftPerPlayAccountingView[];
  /** Week rollups (export weeks when present, else derived from plays). */
  weeks: readonly SoftAccountingWeekRow[];
  weekViews: readonly SoftPerWeekAccountingView[];
  /** Book-type rollups (export byBookType when present, else derived from tagged plays). */
  byBookType: readonly SoftAccountingBookTypeRow[];
  bookViews: readonly SoftPerBookTypeAccountingView[];
};

function emptySummary(): OpsAccountingViewSummary {
  return {
    deposits: 0,
    withdrawals: 0,
    settlements: 0,
    fees: 0,
    credits: 0,
    freeRollApplied: 0,
    net: 0,
  };
}

export function normalizeSoftPartnerCode(code: string | null | undefined): string {
  return String(code || '')
    .trim()
    .toUpperCase();
}

/**
 * Normalize Soft/partners-ops book class onto `book.type.*` glossary ids.
 * Accepts `legal`, `legal-us`, `book.type.legal`, etc.
 */
export function softBookTypeConceptId(
  raw: string | null | undefined
): `book.type.${string}` | undefined {
  const s = String(raw || '').trim();
  if (!s) return undefined;
  const token = s.startsWith('book.type.') ? s.slice('book.type.'.length) : s;
  const parsed = parseBookType(token);
  return parsed ? (`book.type.${parsed}` as const) : undefined;
}

/** UTC Monday (YYYY-MM-DD) for a placedAt ISO timestamp. */
export function weekStartIsoFromPlacedAt(placedAt: string): string | null {
  const ms = Date.parse(placedAt);
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  const day = d.getUTCDay(); // 0=Sun … 6=Sat
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + mondayOffset);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dayNum = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dayNum}`;
}

/** Plays for one partner CODE (stable order: placedAt ascending). */
export function playsForPartner(
  exported: SoftAccountingExport | null | undefined,
  partnerCode: string | null | undefined
): SoftAccountingPlayRow[] {
  const code = normalizeSoftPartnerCode(partnerCode);
  if (!code || !exported?.plays?.length) return [];
  return exported.plays
    .filter(p => normalizeSoftPartnerCode(p.partnerCode) === code)
    .slice()
    .sort((a, b) => a.placedAt.localeCompare(b.placedAt));
}

/** Index Soft plays by partner CODE. */
export function indexSoftPlaysByPartner(
  exported: SoftAccountingExport | null | undefined
): Map<string, SoftAccountingPlayRow[]> {
  const map = new Map<string, SoftAccountingPlayRow[]>();
  if (!exported?.plays?.length) return map;
  for (const play of exported.plays) {
    const code = normalizeSoftPartnerCode(play.partnerCode);
    if (!code) continue;
    const list = map.get(code);
    if (list) list.push(play);
    else map.set(code, [play]);
  }
  for (const [, list] of map) {
    list.sort((a, b) => a.placedAt.localeCompare(b.placedAt));
  }
  return map;
}

/**
 * Derive per-week Soft rows from plays when Soft weeks[] is empty.
 * deposits = sum stake · settlements = sum |pnl| (non-pending) · net = sum pnl.
 */
export function rollupWeeksFromPlays(
  plays: readonly SoftAccountingPlayRow[]
): SoftAccountingWeekRow[] {
  const byKey = new Map<string, SoftAccountingWeekRow>();
  for (const play of plays) {
    const partnerCode = normalizeSoftPartnerCode(play.partnerCode);
    const weekStart = weekStartIsoFromPlacedAt(play.placedAt);
    if (!partnerCode || !weekStart) continue;
    const key = `${partnerCode}|${weekStart}`;
    let row = byKey.get(key);
    if (!row) {
      row = {
        weekStart,
        partnerCode,
        deposits: 0,
        withdrawals: 0,
        settlements: 0,
        fees: 0,
        net: 0,
      };
      byKey.set(key, row);
    }
    const stake = typeof play.stake === 'number' && Number.isFinite(play.stake) ? play.stake : 0;
    const pnl = typeof play.pnl === 'number' && Number.isFinite(play.pnl) ? play.pnl : 0;
    row.deposits += stake;
    if (play.result !== 'pending') row.settlements += Math.abs(pnl);
    row.net += pnl;
  }
  return [...byKey.values()].sort(
    (a, b) => a.weekStart.localeCompare(b.weekStart) || a.partnerCode.localeCompare(b.partnerCode)
  );
}

/**
 * Derive per-book-type Soft rows from plays that carry `bookType`.
 * Plays without a resolvable book.type.* are skipped (no invented venues).
 */
export function rollupByBookTypeFromPlays(
  plays: readonly SoftAccountingPlayRow[]
): SoftAccountingBookTypeRow[] {
  const byKey = new Map<string, SoftAccountingBookTypeRow>();
  for (const play of plays) {
    const partnerCode = normalizeSoftPartnerCode(play.partnerCode);
    const bookType = softBookTypeConceptId(play.bookType);
    if (!partnerCode || !bookType) continue;
    const key = `${partnerCode}|${bookType}`;
    let row = byKey.get(key);
    if (!row) {
      row = {
        bookType,
        partnerCode,
        deposits: 0,
        settlements: 0,
        fees: 0,
        net: 0,
      };
      byKey.set(key, row);
    }
    const stake = typeof play.stake === 'number' && Number.isFinite(play.stake) ? play.stake : 0;
    const pnl = typeof play.pnl === 'number' && Number.isFinite(play.pnl) ? play.pnl : 0;
    row.deposits += stake;
    if (play.result !== 'pending') row.settlements += Math.abs(pnl);
    row.net += pnl;
  }
  return [...byKey.values()].sort(
    (a, b) => a.partnerCode.localeCompare(b.partnerCode) || a.bookType.localeCompare(b.bookType)
  );
}

/**
 * Demo / Soft enrichment: stamp plays missing bookType from a partner→book.type map
 * (e.g. partners-ops primary out). Never invents classes Soft did not resolve.
 */
export function enrichSoftExportWithPartnerBookTypes(
  exported: SoftAccountingExport,
  partnerBookTypeByCode: ReadonlyMap<string, string> | Record<string, string>
): SoftAccountingExport {
  const lookup =
    partnerBookTypeByCode instanceof Map
      ? partnerBookTypeByCode
      : new Map(
          Object.entries(partnerBookTypeByCode).map(([k, v]) => [normalizeSoftPartnerCode(k), v])
        );
  const plays = exported.plays.map(play => {
    const existing = softBookTypeConceptId(play.bookType);
    if (existing) return { ...play, bookType: existing };
    const fromPartner = softBookTypeConceptId(
      lookup.get(normalizeSoftPartnerCode(play.partnerCode))
    );
    return fromPartner ? { ...play, bookType: fromPartner } : play;
  });
  const byBookType =
    exported.byBookType.length > 0
      ? exported.byBookType.map(row => ({
          ...row,
          bookType: softBookTypeConceptId(row.bookType) ?? row.bookType,
          partnerCode: normalizeSoftPartnerCode(row.partnerCode),
        }))
      : rollupByBookTypeFromPlays(plays);
  return { ...exported, plays, byBookType };
}

function normalizeSoftCtPlayRow(play: SoftAccountingPlayRow): SoftAccountingPlayRow {
  const partnerCode = normalizeSoftPartnerCode(play.partnerCode);
  const bookType = softBookTypeConceptId(play.bookType);
  const odds = typeof play.odds === 'number' && Number.isFinite(play.odds) ? play.odds : 0;
  return {
    ...play,
    partnerCode,
    odds,
    ...(bookType ? { bookType } : { bookType: undefined }),
  };
}

/**
 * Finalize Soft wire for Factory boards after Soft ct / fixture projection.
 *
 * - `soft-ct`: Soft-authored odds + bookType on plays; fill empty `weeks` /
 *   `byBookType` via the same Factory rollups. Never partners-ops enrich.
 * - `toc-ops-fixture`: optional partners-ops primary-out enrich (demo only).
 */
export function finalizeSoftAccountingExport(
  exported: SoftAccountingExport,
  opts: {
    partnerBookTypeByCode?: ReadonlyMap<string, string> | Record<string, string>;
  } = {}
): SoftAccountingExport {
  if (exported.source === 'soft-ct') {
    const plays = exported.plays.map(normalizeSoftCtPlayRow);
    const weeks =
      exported.weeks.length > 0
        ? exported.weeks.map(w => ({
            ...w,
            partnerCode: normalizeSoftPartnerCode(w.partnerCode),
          }))
        : rollupWeeksFromPlays(plays);
    const byBookType =
      exported.byBookType.length > 0
        ? exported.byBookType.map(row => ({
            ...row,
            bookType: softBookTypeConceptId(row.bookType) ?? row.bookType,
            partnerCode: normalizeSoftPartnerCode(row.partnerCode),
          }))
        : rollupByBookTypeFromPlays(plays);
    return {
      ...exported,
      path: SOFT_ACCOUNTING_EXPORT_PATH,
      available: plays.length > 0,
      plays,
      weeks,
      byBookType,
    };
  }

  if (exported.source === 'toc-ops-fixture' && opts.partnerBookTypeByCode) {
    // Demo only — partners-ops primary-out stamps; weeks stay empty (board derives).
    return enrichSoftExportWithPartnerBookTypes(exported, opts.partnerBookTypeByCode);
  }

  return exported;
}

export function unavailableSoftAccountingExport(
  generatedAt = new Date().toISOString()
): SoftAccountingExport {
  return {
    schema: SOFT_ACCOUNTING_EXPORT_SCHEMA,
    version: '1',
    generatedAt,
    source: 'unavailable',
    available: false,
    path: SOFT_ACCOUNTING_EXPORT_PATH,
    plays: [],
    weeks: [],
    byBookType: [],
  };
}

/** Map a TOC fixture play onto the Soft→Factory play row (demo bridge). */
export function softPlayRowFromTocPlay(play: TocPlay): SoftAccountingPlayRow {
  return {
    playId: play.playId,
    partnerCode: play.partnerCode,
    stake: play.stake,
    odds: play.odds,
    result: play.result,
    pnl: play.pnl,
    placedAt: play.placedAt,
    settledAt: play.settledAt,
    market: play.market,
  };
}

/**
 * Project a SoftAccountingExport from the Pages toc-ops fixture.
 * Demo / stand-in only — not a Soft Balance mutation path.
 */
export function projectSoftAccountingExportFromTocOps(
  snapshot: TocOpsSnapshot,
  opts: { generatedAt?: string; source?: SoftAccountingExportSource } = {}
): SoftAccountingExport {
  const plays: SoftAccountingPlayRow[] = [];
  for (const partner of snapshot.partners ?? []) {
    for (const play of partner.recentPlays ?? []) {
      plays.push(softPlayRowFromTocPlay(play));
    }
  }
  plays.sort((a, b) => a.placedAt.localeCompare(b.placedAt));
  return {
    schema: SOFT_ACCOUNTING_EXPORT_SCHEMA,
    version: '1',
    generatedAt: opts.generatedAt ?? new Date().toISOString(),
    source: opts.source ?? 'toc-ops-fixture',
    available: plays.length > 0,
    path: SOFT_ACCOUNTING_EXPORT_PATH,
    plays,
    weeks: [],
    byBookType: [],
  };
}

/**
 * Load Soft accounting export from disk when present; otherwise unavailable.
 * Never writes Soft SQLite. Optional fixture projection via `projectFromTocOps`.
 */
export async function loadSoftAccountingExport(
  root = process.cwd(),
  opts: { projectFromTocOps?: boolean } = {}
): Promise<SoftAccountingExport> {
  const filePath = root.endsWith('/')
    ? `${root}${SOFT_ACCOUNTING_EXPORT_REL}`
    : `${root}/${SOFT_ACCOUNTING_EXPORT_REL}`;
  const file = Bun.file(filePath);
  if (await file.exists()) {
    const raw = (await file.json()) as SoftAccountingExport;
    if (raw?.schema === SOFT_ACCOUNTING_EXPORT_SCHEMA && raw.version === '1') {
      return { ...raw, path: SOFT_ACCOUNTING_EXPORT_PATH };
    }
  }
  if (opts.projectFromTocOps) {
    const tocPath = root.endsWith('/')
      ? `${root}public/registry/toc-ops.json`
      : `${root}/public/registry/toc-ops.json`;
    const tocFile = Bun.file(tocPath);
    if (await tocFile.exists()) {
      const toc = (await tocFile.json()) as TocOpsSnapshot;
      return projectSoftAccountingExportFromTocOps(toc);
    }
  }
  return unavailableSoftAccountingExport();
}

/**
 * Dimension-only per-play view from a Soft export row.
 * Field chrome stays in OPS_VIEW_COLLAPSE_BACKLOG until Soft bake is primary.
 */
export function buildPerPlayAccountingView(
  play: SoftAccountingPlayRow | null | undefined
): SoftPerPlayAccountingView | null {
  const playId = String(play?.playId || '').trim();
  const partnerCode = String(play?.partnerCode || '')
    .trim()
    .toUpperCase();
  if (!playId || !partnerCode || !play) return null;

  const stake = typeof play.stake === 'number' && Number.isFinite(play.stake) ? play.stake : 0;
  const pnl = typeof play.pnl === 'number' && Number.isFinite(play.pnl) ? play.pnl : 0;
  const summary: OpsAccountingViewSummary = {
    ...emptySummary(),
    settlements: play.result === 'pending' ? 0 : Math.abs(pnl),
    net: pnl,
    // stake is risked capital — surface via deposits slot until Soft fee model lands
    deposits: stake,
  };

  const view: SoftPerPlayAccountingView = {
    type: 'per_play',
    playId,
    partnerCode,
    summary,
    conceptIds: { dimension: 'ops.view.per_play' },
    play,
  };
  const issues = validateOpsAccountingViewShape(view);
  if (issues.length > 0) return null;
  return view;
}

/**
 * Dimension-only per-week view from a Soft week row (export or play rollup).
 * Field chrome stays in OPS_VIEW_COLLAPSE_BACKLOG (weekly_* → accounting.*).
 */
export function buildPerWeekAccountingView(
  week: SoftAccountingWeekRow | null | undefined
): SoftPerWeekAccountingView | null {
  const weekStart = String(week?.weekStart || '').trim();
  const partnerCode = normalizeSoftPartnerCode(week?.partnerCode);
  if (!weekStart || !partnerCode || !week) return null;

  const num = (v: number | undefined) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  const summary: OpsAccountingViewSummary = {
    ...emptySummary(),
    deposits: num(week.deposits),
    withdrawals: num(week.withdrawals),
    settlements: num(week.settlements),
    fees: num(week.fees),
    net: num(week.net),
  };

  const view: SoftPerWeekAccountingView = {
    type: 'per_week',
    weekStart,
    partnerCode,
    summary,
    conceptIds: { dimension: 'ops.view.per_week' },
    week,
  };
  const issues = validateOpsAccountingViewShape(view);
  if (issues.length > 0) return null;
  return view;
}

/**
 * Dimension-only per-book-type view from a Soft book-type row.
 * Field chrome collapses onto book.type.* / accounting.* via OPS_VIEW_COLLAPSE_BACKLOG.
 */
export function buildPerBookTypeAccountingView(
  book: SoftAccountingBookTypeRow | null | undefined
): SoftPerBookTypeAccountingView | null {
  const bookType = softBookTypeConceptId(book?.bookType) ?? String(book?.bookType || '').trim();
  const partnerCode = normalizeSoftPartnerCode(book?.partnerCode);
  if (!bookType || !partnerCode || !book) return null;

  const num = (v: number | undefined) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  const summary: OpsAccountingViewSummary = {
    ...emptySummary(),
    deposits: num(book.deposits),
    settlements: num(book.settlements),
    fees: num(book.fees),
    net: num(book.net),
  };

  const view: SoftPerBookTypeAccountingView = {
    type: 'per_book_type',
    bookType,
    partnerCode,
    summary,
    conceptIds: { dimension: 'ops.view.per_book_type' },
    book: { ...book, bookType, partnerCode },
  };
  const issues = validateOpsAccountingViewShape(view);
  if (issues.length > 0) return null;
  return view;
}

const DEFAULT_SOFT_PLAY_CHROME_LIMIT = 8;

/**
 * Partner-scoped Soft play chrome for dossier / partners boards.
 * Read-only over the export bake — never mutates Soft.
 */
export function buildPartnerSoftPlayChrome(
  exported: SoftAccountingExport | null | undefined,
  partnerCode: string | null | undefined,
  opts: { limit?: number } = {}
): SoftPartnerPlayChrome | null {
  const code = normalizeSoftPartnerCode(partnerCode);
  if (!code) return null;
  const limit =
    typeof opts.limit === 'number' && opts.limit > 0
      ? Math.floor(opts.limit)
      : DEFAULT_SOFT_PLAY_CHROME_LIMIT;

  const source: SoftAccountingExportSource = exported?.source ?? 'unavailable';
  const allPlays = playsForPartner(exported, code);
  const newestFirst = allPlays.slice().reverse();
  const plays = newestFirst.slice(0, limit);
  const views = plays
    .map(p => buildPerPlayAccountingView(p))
    .filter((v): v is SoftPerPlayAccountingView => v != null);

  const exportWeeks = (exported?.weeks ?? []).filter(
    w => normalizeSoftPartnerCode(w.partnerCode) === code
  );
  const weeks = exportWeeks.length > 0 ? exportWeeks.slice() : rollupWeeksFromPlays(allPlays);
  weeks.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  const weekViews = weeks
    .map(w => buildPerWeekAccountingView(w))
    .filter((v): v is SoftPerWeekAccountingView => v != null);

  const exportBooks = (exported?.byBookType ?? []).filter(
    b => normalizeSoftPartnerCode(b.partnerCode) === code
  );
  const byBookType =
    exportBooks.length > 0 ? exportBooks.slice() : rollupByBookTypeFromPlays(allPlays);
  byBookType.sort((a, b) => a.bookType.localeCompare(b.bookType));
  const bookViews = byBookType
    .map(b => buildPerBookTypeAccountingView(b))
    .filter((v): v is SoftPerBookTypeAccountingView => v != null);

  return {
    partnerCode: code,
    available: allPlays.length > 0,
    source,
    path: SOFT_ACCOUNTING_EXPORT_PATH,
    playCount: allPlays.length,
    conceptId: 'ops.view.per_play',
    weekConceptId: 'ops.view.per_week',
    bookConceptId: 'ops.view.per_book_type',
    plays,
    views,
    weeks,
    weekViews,
    byBookType,
    bookViews,
  };
}

/** Re-export per-account view type for handshake consumers. */
export type { OpsPerAccountAccountingView };
