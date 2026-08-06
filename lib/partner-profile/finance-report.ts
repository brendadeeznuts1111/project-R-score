// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
// lib/partner-profile/finance-report.ts — partner_ledger aggregation for the
// daily finance report.
//
// Aggregates ledger rows per partner over a window: entry count, total flow,
// per-type counts, and the latest balance. No bets/P&L tables exist yet — the
// report is honest about what the ledger actually stores (deposits, credits,
// settlements, free-roll).

import type { Database } from 'bun:sqlite';

import { fromMinorUnits, partnerLedgerMoneyColumns, type PartnerLedgerType } from './ledger.ts';

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
  currency: string;
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
  const moneyColumns = partnerLedgerMoneyColumns(db);
  const usesMinorUnits = moneyColumns.amountMinor && moneyColumns.balanceAfterMinor;
  const usesLegacyMoney = moneyColumns.legacyAmount && moneyColumns.legacyBalanceAfter;
  if (!usesMinorUnits && !usesLegacyMoney) {
    throw new Error('partner_ledger has no complete money column pair');
  }
  const rows = db
    .query(
      `SELECT id, partner_code, type, currency, created_at,
              ${moneyColumns.amountMinor ? 'amount_minor' : 'NULL'} AS amount_minor,
              ${moneyColumns.legacyAmount ? 'amount' : 'NULL'} AS amount_legacy,
              ${moneyColumns.balanceAfterMinor ? 'balance_after_minor' : 'NULL'} AS balance_minor,
              ${moneyColumns.legacyBalanceAfter ? 'balance_after' : 'NULL'} AS balance_legacy
       FROM partner_ledger
       WHERE ${whereSql}
       ORDER BY partner_code, created_at, id`
    )
    .all(...params) as Array<{
    id: string; // brand-ok — opaque ledger row PK used only for deterministic ordering
    partner_code: string;
    type: PartnerLedgerType;
    currency: string;
    created_at: string;
    amount_minor: number | null;
    amount_legacy: number | null;
    balance_minor: number | null;
    balance_legacy: number | null;
  }>;

  const summaries = new Map<string, PartnerFinanceSummary>();
  for (const row of rows) {
    const currency = row.currency.toUpperCase();
    const amount =
      row.amount_minor !== null
        ? fromMinorUnits(row.amount_minor, currency)
        : (row.amount_legacy ?? 0);
    const latestBalance =
      row.balance_minor !== null ? fromMinorUnits(row.balance_minor, currency) : row.balance_legacy;
    const summary = summaries.get(row.partner_code) ?? {
      partnerCode: row.partner_code,
      entries: 0,
      netFlow: 0,
      byType: emptyTypeCounts(),
      latestBalance: null,
      currency,
      from,
      to,
    };
    if (summary.currency !== currency) {
      throw new Error(`partner ${row.partner_code} ledger contains multiple currencies`);
    }
    summary.entries++;
    summary.netFlow += amount;
    summary.byType[row.type]++;
    summary.latestBalance = latestBalance;
    summaries.set(row.partner_code, summary);
  }

  return [...summaries.values()];
}

function emptyTypeCounts(): Record<PartnerLedgerType, number> {
  return Object.fromEntries(PARTNER_LEDGER_TYPES_ALL.map(t => [t, 0])) as Record<
    PartnerLedgerType,
    number
  >;
}
