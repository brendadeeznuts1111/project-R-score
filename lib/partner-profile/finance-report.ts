// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
// lib/partner-profile/finance-report.ts — partner_ledger aggregation for the
// daily finance report.
//
// Aggregates ledger rows per partner over a window: entry count, total flow,
// per-type counts, and the latest balance. No bets/P&L tables exist yet — the
// report is honest about what the ledger actually stores (deposits, credits,
// settlements, free-roll).

import type { Database } from 'bun:sqlite';

import type { PartnerLedgerType } from './ledger.ts';

export const PARTNER_LEDGER_TYPES_ALL: readonly PartnerLedgerType[] = [
  'initial_capital',
  'deposit',
  'credit',
  'settlement',
  'free_roll',
];

export type PartnerFinanceSummary = {
  partnerCode: string; // brand-ok — partner CODE (^[A-Z]{3,6}$)
  entries: number;
  netFlow: number; // sum(amount) over the window
  byType: Record<PartnerLedgerType, number>;
  latestBalance: number | null; // balance_after of the most recent entry
  from: string;
  to: string;
};

export type FinanceAggregateOpts = {
  days?: number;
  since?: string; // ISO — wins over days
  partnerCode?: string; // brand-ok — partner CODE; omit = all partners
};

/** Aggregate partner_ledger over the window. Empty DB → empty list. */
export function aggregatePartnerFinance(
  db: Database,
  opts: FinanceAggregateOpts = {}
): PartnerFinanceSummary[] {
  const to = new Date().toISOString();
  const from = opts.since ?? new Date(Date.now() - (opts.days ?? 7) * 86_400_000).toISOString();

  const where: string[] = ['created_at >= ?'];
  const params: Array<string> = [from];
  if (opts.partnerCode) {
    where.push('partner_code = ?');
    params.push(opts.partnerCode);
  }
  const whereSql = where.join(' AND ');

  const summaries = db
    .query(
      `SELECT partner_code, COUNT(*) AS entries, COALESCE(SUM(amount), 0) AS net_flow
       FROM partner_ledger
       WHERE ${whereSql}
       GROUP BY partner_code
       ORDER BY partner_code`
    )
    .all(...params) as Array<{ partner_code: string; entries: number; net_flow: number }>;

  const byTypeRows = db
    .query(
      `SELECT partner_code, type, COUNT(*) AS n
       FROM partner_ledger
       WHERE ${whereSql}
       GROUP BY partner_code, type`
    )
    .all(...params) as Array<{ partner_code: string; type: PartnerLedgerType; n: number }>;

  const balanceRows = db
    .query(
      `SELECT pl.partner_code, pl.balance_after
       FROM partner_ledger pl
       WHERE pl.created_at = (
         SELECT MAX(created_at) FROM partner_ledger
         WHERE partner_code = pl.partner_code AND created_at >= ?
       )`
    )
    .all(from) as Array<{ partner_code: string; balance_after: number }>;

  const byType = new Map<string, Record<PartnerLedgerType, number>>();
  for (const row of byTypeRows) {
    const map = byType.get(row.partner_code) ?? emptyTypeCounts();
    map[row.type] = row.n;
    byType.set(row.partner_code, map);
  }
  const balance = new Map(balanceRows.map(r => [r.partner_code, r.balance_after]));

  return summaries.map(s => ({
    partnerCode: s.partner_code,
    entries: s.entries,
    netFlow: s.net_flow,
    byType: byType.get(s.partner_code) ?? emptyTypeCounts(),
    latestBalance: balance.get(s.partner_code) ?? null,
    from,
    to,
  }));
}

function emptyTypeCounts(): Record<PartnerLedgerType, number> {
  return Object.fromEntries(PARTNER_LEDGER_TYPES_ALL.map(t => [t, 0])) as Record<
    PartnerLedgerType,
    number
  >;
}
