/**
 * Partner domain table column schemas (Partners / Outs / Accounting Ledger).
 *
 * Reconciliation with the portal framework:
 * - Column glossary ids are the SHIPPED Kalshi cores + Factory overlay ids.
 *   The doc's invented ids (partner.code, partner.call_sign, partner.ready_outs,
 *   out.id, out.balance, accounting.date, …) are REGISTRY FIELDS, not glossary
 *   concepts — the `key` field carries the registry/stable key, `glossaryId`
 *   carries a concept id only where one exists.
 * - The doc's renames (accounting.deposit_received, …) are NOT used — shipped
 *   ids stand (accounting.deposit, accounting.withdrawal, …).
 * - Colors resolve through lib/telegram/partner-ops-color-kernel.ts:
 *   invented keys translate — tennisGreen→tennis, tradingRed→trading,
 *   neutralGray→env, middlewareYellow→middleware, warningOrange→research,
 *   poly→polymarket.
 * - Columns referencing not-yet-shipped concepts carry `proposed: true`
 *   (🟠) and fall back to the kernel `unknown` key. The integration validator
 *   skips proposed ids but still requires a glossaryId-shaped value.
 */

import type { PartnerOpsColorKey } from '../telegram/partner-ops-color-kernel.ts';

export type PartnerColumnKind =
  | 'string'
  | 'enum'
  | 'composite'
  | 'count'
  | 'timestamp'
  | 'boolean'
  | 'ratio';

export type PartnerColumnFilter = 'exact' | 'prefix' | 'fuzzy' | 'range' | 'date' | 'none';

export type PartnerTableColumn = {
  /** Stable key — registry field or column identity. */
  key: string;
  label: string;
  kind: PartnerColumnKind;
  /** Glossary concept id (shipped) — enum/composite columns only. */
  glossaryId?: string; // brand-ok — glossary concept key (not a domain entity id)
  unit?: string;
  filter: PartnerColumnFilter;
  /** Static kernel color key (boolean/derived columns). */
  colorKey?: PartnerOpsColorKey;
  /** Derived color rule — returns a kernel key or undefined. */
  colorRule?: (value: number | undefined) => PartnerOpsColorKey | undefined;
  /** 🟠 references a not-yet-shipped concept; validator skips resolution. */
  proposed?: boolean;
};

/** Partners table (partners-table). */
export const PARTNERS_TABLE_COLUMNS: readonly PartnerTableColumn[] = [
  { key: 'code', label: 'Code', kind: 'string', filter: 'exact' },
  { key: 'call_sign', label: 'Call sign', kind: 'string', filter: 'prefix' },
  {
    key: 'phase',
    label: 'Phase',
    kind: 'enum',
    glossaryId: 'partner.phase.operator_ready',
    filter: 'exact',
  },
  {
    key: 'ready_outs',
    label: 'Ready outs',
    kind: 'count',
    filter: 'range',
    colorRule: v => (typeof v === 'number' && v > 0 ? 'tennis' : undefined),
  },
  { key: 'total_balance', label: 'Total balance', kind: 'composite', unit: 'usd', filter: 'range' },
  {
    key: 'credit_used',
    label: 'Credit used',
    kind: 'composite',
    unit: 'usd',
    filter: 'range',
    colorRule: v => (typeof v === 'number' && v > 0 ? 'trading' : undefined), // over-limit flag signalled by value
  },
  { key: 'telegram', label: 'Telegram', kind: 'boolean', filter: 'exact', colorKey: 'middleware' },
  { key: 'last_activity', label: 'Last activity', kind: 'timestamp', unit: 'ms', filter: 'date' },
];

/** Outs table (out-table). */
export const OUTS_TABLE_COLUMNS: readonly PartnerTableColumn[] = [
  { key: 'id', label: 'Out ID', kind: 'string', filter: 'exact' },
  { key: 'partner_code', label: 'Partner', kind: 'string', filter: 'exact' },
  { key: 'book_type', label: 'Book', kind: 'enum', glossaryId: 'book.type.legal', filter: 'exact' },
  { key: 'book_name', label: 'Book name', kind: 'string', filter: 'fuzzy' },
  {
    key: 'location',
    label: 'Location',
    kind: 'enum',
    glossaryId: 'location.state', // 🟠 proposed-new concept
    filter: 'exact',
    colorKey: 'unknown',
    proposed: true,
  },
  { key: 'status', label: 'Status', kind: 'enum', glossaryId: 'out.status.ready', filter: 'exact' },
  {
    key: 'balance',
    label: 'Balance',
    kind: 'composite',
    unit: 'usd',
    filter: 'range',
    colorRule: v => (typeof v === 'number' && v === 0 ? 'research' : undefined), // warningOrange → research
  },
  { key: 'credit_limit', label: 'Credit line', kind: 'composite', unit: 'usd', filter: 'range' },
  { key: 'free_roll_pct', label: 'Free roll %', kind: 'ratio', unit: 'pp', filter: 'range' },
  {
    key: 'funding_method',
    label: 'Funding method',
    kind: 'enum',
    glossaryId: 'deposit.method.venmo',
    filter: 'exact',
  },
  { key: 'max_bet', label: 'Max bet', kind: 'composite', unit: 'usd cents', filter: 'range' },
];

/** Accounting ledger (accounting-ledger). */
export const ACCOUNTING_LEDGER_COLUMNS: readonly PartnerTableColumn[] = [
  { key: 'date', label: 'Date', kind: 'timestamp', unit: 'ms', filter: 'date' },
  { key: 'partner_code', label: 'Partner', kind: 'string', filter: 'exact' },
  { key: 'event', label: 'Event', kind: 'enum', glossaryId: 'accounting.deposit', filter: 'exact' },
  {
    key: 'amount',
    label: 'Amount',
    kind: 'composite',
    unit: 'usd',
    filter: 'range',
    colorRule: v => (typeof v === 'number' ? (v >= 0 ? 'tennis' : 'trading') : undefined),
  },
  { key: 'rail', label: 'Rail', kind: 'enum', glossaryId: 'deposit.method.venmo', filter: 'exact' },
  { key: 'fee', label: 'Fee', kind: 'composite', unit: 'usd', filter: 'range', colorKey: 'env' },
  {
    key: 'running_balance',
    label: 'Running balance',
    kind: 'composite',
    unit: 'usd',
    filter: 'range',
  },
];

export const PARTNER_TABLE_SCHEMAS = {
  partners: PARTNERS_TABLE_COLUMNS,
  outs: OUTS_TABLE_COLUMNS,
  accounting: ACCOUNTING_LEDGER_COLUMNS,
} as const;

export type PartnerTableSchemaKey = keyof typeof PARTNER_TABLE_SCHEMAS;

/** Resolve a column's kernel color key (static key wins; rule applies to value). */
export function partnerColumnColorKey(
  column: PartnerTableColumn,
  value?: number
): PartnerOpsColorKey | undefined {
  if (column.colorRule !== undefined && value !== undefined) {
    return column.colorRule(value);
  }
  return column.colorKey;
}

/** All glossary ids referenced by table columns (for the integration validator). */
export function partnerTableGlossaryIds(): string[] {
  const ids: string[] = [];
  for (const schema of Object.values(PARTNER_TABLE_SCHEMAS)) {
    for (const column of schema) {
      if (column.glossaryId) ids.push(column.glossaryId);
    }
  }
  return ids;
}
