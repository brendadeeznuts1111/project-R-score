/**
 * Partners-ops ledger code → Kalshi `event.*` leaf (static portal SSOT).
 * Keep in sync with `PARTNER_OPS_EVENT_GLOSSARY` in lib/telegram/partner-ops-events.ts
 * (static boards cannot import TS).
 *
 * @see lib/telegram/partner-ops-events.ts
 * @see public/portal/account/glossary-map.js
 */

export const PARTNER_OPS_EVENT_CODE_CONCEPTS = Object.freeze({
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
});

/** Map a partners-ops event code onto its Kalshi event.* leaf when known. */
export function conceptIdForPartnerOpsEventCode(code) {
  const key = String(code || '').trim();
  return PARTNER_OPS_EVENT_CODE_CONCEPTS[key] || 'partner.ops.event';
}
