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

/** Re-export per-account view type for handshake consumers. */
export type { OpsPerAccountAccountingView };
