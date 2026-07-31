/**
 * Partner-ops event codes — structured factory mirror (not soft ledger).
 * Soft Balance / MessageLog mutations stay in toc-ops-repo `ct`.
 *
 * @see lib/telegram/partner-ops-glossary.ts
 * @see docs/harness/tenants/seat-capital-desk.md
 */

export const PARTNER_OPS_EVENT_CODES = [
  'PARTNER_REGISTERED',
  'PARTNER_PHASE_CHANGE',
  'OUT_CREATED',
  'OUT_STATUS_CHANGE',
  'DEPOSIT_RECEIVED',
  'DEPOSIT_ALLOCATED',
  'CREDIT_EXTENDED',
  'FREE_ROLL_APPLIED',
  'SETTLEMENT_PROCESSED',
  'TELEGRAM_INVITE_SENT',
  'TELEGRAM_MESSAGE_PINNED',
] as const;

export type PartnerOpsEventCode = (typeof PARTNER_OPS_EVENT_CODES)[number];

/** Option A — event codes map to Kalshi glossary event.* leaves (UI/Telegram). */
export const PARTNER_OPS_EVENT_GLOSSARY: Record<PartnerOpsEventCode, string> = {
  PARTNER_REGISTERED: 'event.partner.registered',
  PARTNER_PHASE_CHANGE: 'event.partner.phase_change',
  OUT_CREATED: 'event.out.created',
  OUT_STATUS_CHANGE: 'event.out.status_change',
  DEPOSIT_RECEIVED: 'event.deposit.received',
  DEPOSIT_ALLOCATED: 'event.deposit.allocated',
  CREDIT_EXTENDED: 'event.credit.extended',
  FREE_ROLL_APPLIED: 'event.free_roll.applied',
  SETTLEMENT_PROCESSED: 'event.settlement.processed',
  TELEGRAM_INVITE_SENT: 'event.telegram.invite_sent',
  TELEGRAM_MESSAGE_PINNED: 'event.telegram.message_pinned',
};

export type PartnerOpsEvent = {
  at: string;
  code: PartnerOpsEventCode;
  partnerCode?: string; // brand-ok — partner CODE wire
  callSign?: string; // brand-ok — call-sign wire
  outId?: string; // brand-ok — out token wire
  amount?: number;
  rail?: string;
  note?: string;
  conceptId: string; // brand-ok — glossary concept key
};

export function isPartnerOpsEventCode(value: string): value is PartnerOpsEventCode {
  return (PARTNER_OPS_EVENT_CODES as readonly string[]).includes(value);
}

export function buildPartnerOpsEvent(
  code: PartnerOpsEventCode,
  fields: Omit<PartnerOpsEvent, 'at' | 'code' | 'conceptId'> & { at?: string } = {}
): PartnerOpsEvent {
  const { at, ...rest } = fields;
  return {
    at: at ?? new Date().toISOString(),
    code,
    conceptId: PARTNER_OPS_EVENT_GLOSSARY[code],
    ...rest,
  };
}
