/**
 * Pure per-account accounting view over partners-ops partner rows.
 * Does not write registry bakes — Soft Balance remains in toc-ops-repo `ct`.
 *
 * @see lib/telegram/ops-view-glossary.ts
 * @see lib/telegram/partner-ops-registry.ts
 */
import type { PartnerOpsEvent, PartnerOpsEventCode } from './partner-ops-events.ts';
import { PARTNER_OPS_EVENT_GLOSSARY, isPartnerOpsEventCode } from './partner-ops-events.ts';

export type OpsAccountingViewType = 'per_account' | 'per_play' | 'per_week' | 'per_book_type';

export type OpsAccountingViewSummary = {
  deposits: number;
  withdrawals: number;
  settlements: number;
  fees: number;
  credits: number;
  freeRollApplied: number;
  net: number;
};

export type OpsPerAccountAccountingView = {
  type: 'per_account';
  partnerCode: string; // brand-ok — partner CODE
  events: readonly PartnerOpsEvent[];
  summary: OpsAccountingViewSummary;
  conceptIds: {
    dimension: 'ops.view.per_account';
    summary: 'ops.view.account_summary';
    deposits: 'ops.view.account_deposits';
    settlements: 'ops.view.account_settlements';
    credit: 'ops.view.account_credit';
    freeplay: 'ops.view.account_freeplay';
    net: 'ops.view.account_net';
  };
};

/** Minimal partners-ops partner slice needed for the view. */
export type OpsAccountingPartnerSlice = {
  code?: string | null;
  accounting?: {
    fundStatus?: string | null;
    incompleteOuts?: number | null;
    deposits?: readonly { amount?: number; date?: string; rail?: string }[] | null;
    credits?: readonly { amount?: number; date?: string }[] | null;
    freeRoll?: { total?: number; used?: number } | null;
    ledger?: readonly PartnerOpsEvent[] | null;
  } | null;
  tracking?: {
    accounting?: {
      depositVolume?: number;
      creditVolume?: number;
      ledgerEvents?: number;
      freeRollPercent?: number;
      freeRollApplied?: number;
    } | null;
  } | null;
};

const DEPOSIT_CODES = new Set<PartnerOpsEventCode>(['DEPOSIT_RECEIVED', 'DEPOSIT_ALLOCATED']);
const SETTLEMENT_CODES = new Set<PartnerOpsEventCode>(['SETTLEMENT_PROCESSED']);
const CREDIT_CODES = new Set<PartnerOpsEventCode>(['CREDIT_EXTENDED']);
const FREEPLAY_CODES = new Set<PartnerOpsEventCode>(['FREE_ROLL_APPLIED']);

function sumAmounts(
  events: readonly PartnerOpsEvent[],
  codes: ReadonlySet<PartnerOpsEventCode>
): number {
  let total = 0;
  for (const event of events) {
    if (!codes.has(event.code)) continue;
    if (typeof event.amount === 'number' && Number.isFinite(event.amount)) total += event.amount;
  }
  return total;
}

function depositRowsTotal(deposits: readonly { amount?: number }[] | null | undefined): number {
  if (!Array.isArray(deposits)) return 0;
  let total = 0;
  for (const row of deposits) {
    if (typeof row?.amount === 'number' && Number.isFinite(row.amount)) total += row.amount;
  }
  return total;
}

function creditRowsTotal(credits: readonly { amount?: number }[] | null | undefined): number {
  if (!Array.isArray(credits)) return 0;
  let total = 0;
  for (const row of credits) {
    if (typeof row?.amount === 'number' && Number.isFinite(row.amount)) total += row.amount;
  }
  return total;
}

/**
 * Build a per-account accounting view from a partners-ops partner row.
 * Returns null when partner CODE is missing.
 */
export function buildPerAccountAccountingView(
  partnerRow: OpsAccountingPartnerSlice | null | undefined
): OpsPerAccountAccountingView | null {
  const partnerCode = String(partnerRow?.code || '')
    .trim()
    .toUpperCase();
  if (!partnerCode) return null;

  const ledger = Array.isArray(partnerRow?.accounting?.ledger)
    ? partnerRow.accounting.ledger.filter((row): row is PartnerOpsEvent =>
        Boolean(row && typeof row === 'object' && isPartnerOpsEventCode(String(row.code || '')))
      )
    : [];

  const tracking = partnerRow?.tracking?.accounting;
  const depositsFromLedger = sumAmounts(ledger, DEPOSIT_CODES);
  const depositsFromRows = depositRowsTotal(partnerRow?.accounting?.deposits);
  const deposits =
    depositsFromLedger > 0
      ? depositsFromLedger
      : depositsFromRows > 0
        ? depositsFromRows
        : Number(tracking?.depositVolume ?? 0) || 0;

  const creditsFromLedger = sumAmounts(ledger, CREDIT_CODES);
  const creditsFromRows = creditRowsTotal(partnerRow?.accounting?.credits);
  const credits =
    creditsFromLedger > 0
      ? creditsFromLedger
      : creditsFromRows > 0
        ? creditsFromRows
        : Number(tracking?.creditVolume ?? 0) || 0;

  const settlements = sumAmounts(ledger, SETTLEMENT_CODES);
  const freeRollApplied =
    sumAmounts(ledger, FREEPLAY_CODES) ||
    Number(partnerRow?.accounting?.freeRoll?.used ?? tracking?.freeRollApplied ?? 0) ||
    0;
  const withdrawals = 0;
  const fees = 0;
  const net = deposits + credits + settlements - withdrawals - fees;

  return {
    type: 'per_account',
    partnerCode,
    events: ledger,
    summary: {
      deposits,
      withdrawals,
      settlements,
      fees,
      credits,
      freeRollApplied,
      net,
    },
    conceptIds: {
      dimension: 'ops.view.per_account',
      summary: 'ops.view.account_summary',
      deposits: 'ops.view.account_deposits',
      settlements: 'ops.view.account_settlements',
      credit: 'ops.view.account_credit',
      freeplay: 'ops.view.account_freeplay',
      net: 'ops.view.account_net',
    },
  };
}

/** Map a partners-ops event code onto its Kalshi event.* glossary leaf when known. */
export function conceptIdForPartnerOpsEvent(code: string): string {
  if (isPartnerOpsEventCode(code)) return PARTNER_OPS_EVENT_GLOSSARY[code];
  return 'partner.ops.event';
}
