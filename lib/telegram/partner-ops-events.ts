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

export const PARTNER_OPS_EVENT_GLOSSARY: Record<PartnerOpsEventCode, string> = {
  PARTNER_REGISTERED: 'partner.phase.onboarding',
  PARTNER_PHASE_CHANGE: 'partner.phase.operator_ready',
  OUT_CREATED: 'out.status.ready',
  OUT_STATUS_CHANGE: 'out.status.deferred',
  DEPOSIT_RECEIVED: 'accounting.deposit',
  DEPOSIT_ALLOCATED: 'accounting.deposit',
  CREDIT_EXTENDED: 'accounting.credit',
  FREE_ROLL_APPLIED: 'accounting.free_roll',
  SETTLEMENT_PROCESSED: 'accounting.settlement',
  TELEGRAM_INVITE_SENT: 'telegram.wire',
  TELEGRAM_MESSAGE_PINNED: 'telegram.topic.accounting',
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
