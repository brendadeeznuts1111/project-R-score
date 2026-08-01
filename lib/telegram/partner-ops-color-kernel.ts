/**
 * Partner-ops color kernel — phases, book types, funding rails, out status,
 * accounting events. Bun.color-validated closed palette.
 *
 * @see https://bun.com/docs/runtime/color#flexible-input
 * @see https://bun.com/docs/runtime/color#output-formats
 * @see lib/telegram/partner-ops-glossary.ts
 */

export const PARTNER_OPS_COLORS = {
  // Semantic tokens (factory palette aliases)
  tennis: '#3FB950',
  middleware: '#D29922',
  trading: '#F85149',
  env: '#8B949E',
  kalshi: '#58A6FF',
  polymarket: '#1F6FEB',
  pinnacle: '#A371F7',
  research: '#F0883E',
  unknown: '#8B949E',
} as const;

export type PartnerOpsColorKey = keyof typeof PARTNER_OPS_COLORS;

export type PartnerOpsColorWire = {
  colorKey: PartnerOpsColorKey;
  token: `--partner-ops-${PartnerOpsColorKey}`;
  hex: string;
  css: string;
};

type DeterministicFormat = 'css' | 'HEX';

for (const [key, value] of Object.entries(PARTNER_OPS_COLORS)) {
  const hex = Bun.color(value, 'HEX');
  if (typeof hex !== 'string' || !hex) {
    throw new Error(`Invalid partner-ops color for "${key}": ${value}`);
  }
}

const hexCache = {} as Record<PartnerOpsColorKey, string>;
const cssCache = {} as Record<PartnerOpsColorKey, string>;
for (const key of Object.keys(PARTNER_OPS_COLORS) as PartnerOpsColorKey[]) {
  for (const format of ['HEX', 'css'] as const satisfies readonly DeterministicFormat[]) {
    const converted = Bun.color(PARTNER_OPS_COLORS[key], format);
    if (converted == null || typeof converted !== 'string') {
      throw new Error(`Bun.color failed for partner-ops "${key}" format "${format}"`);
    }
    if (format === 'HEX') hexCache[key] = converted;
    else cssCache[key] = converted;
  }
}

/** Concept-id → palette key (collision-free namespaces). */
export const PARTNER_OPS_CONCEPT_COLORS = {
  'partner.phase.operator_ready': 'tennis',
  'partner.phase.onboarding': 'middleware',
  'partner.phase.incomplete': 'trading',
  'partner.phase.paused': 'env',

  'book.type.legal': 'kalshi',
  'book.type.offshore': 'polymarket',
  'book.type.pph': 'pinnacle',
  'book.type.crypto': 'middleware',
  'book.type.sweepstakes': 'research',
  'book.type.exchange': 'polymarket',

  'deposit.method.venmo': 'trading',
  'deposit.method.crypto': 'tennis',
  'deposit.method.wire': 'kalshi',
  'deposit.method.credit': 'research',
  'deposit.method.cashapp': 'trading',
  'deposit.method.paypal': 'kalshi',
  'deposit.method.zelle': 'polymarket',
  'deposit.method.apple_pay': 'env',
  'deposit.method.unknown': 'unknown',

  'out.status.ready': 'tennis',
  'out.status.deferred': 'middleware',
  'out.status.paused': 'env',
  'out.status.blocked': 'trading',
  'out.status.partial': 'middleware',
  'out.status.funded': 'tennis',

  'accounting.deposit': 'tennis',
  'accounting.withdrawal': 'trading',
  'accounting.credit': 'kalshi',
  'accounting.free_roll': 'research',
  'accounting.settlement': 'polymarket',

  'telegram.topic.general': 'env',
  'telegram.topic.ops': 'kalshi',
  'telegram.topic.alerts': 'trading',
  'telegram.topic.liquidity': 'polymarket',
  'telegram.topic.accounting': 'tennis',

  // Shared glossary concepts projected onto the partners control plane.
  'telegram.handshake': 'kalshi',
  'telegram.membership': 'pinnacle',
  'ops.limits.account': 'kalshi',
  'ops.limits.effective_limit': 'research',
  'ops.limits.monitoring_status': 'middleware',
  'ops.limits.evidence_trace': 'polymarket',

  // Ops reporting-view MVP (Factory overlay).
  'ops.view.per_account': 'kalshi',
  'ops.view.per_play': 'polymarket',
  'ops.view.per_week': 'middleware',
  'ops.view.per_book_type': 'pinnacle',
  'ops.view.account_summary': 'kalshi',
  'ops.view.account_deposits': 'tennis',
  'ops.view.account_settlements': 'polymarket',
  'ops.view.account_credit': 'kalshi',
  'ops.view.account_freeplay': 'research',
  'ops.view.account_net': 'trading',

  // Telegram message chrome MVP.
  'telegram.message.incoming': 'tennis',
  'telegram.message.outgoing': 'kalshi',
  'telegram.message.alert': 'trading',
  'telegram.message.command': 'middleware',
  'telegram.message.receipt': 'tennis',
  'telegram.status.delivered': 'tennis',
  'telegram.status.failed': 'trading',
  'telegram.action.reply': 'kalshi',
  'telegram.action.forward': 'polymarket',
  'telegram.action.pin': 'pinnacle',
} as const satisfies Readonly<Record<string, PartnerOpsColorKey>>;

export type PartnerOpsConceptColorId = keyof typeof PARTNER_OPS_CONCEPT_COLORS;

export function isPartnerOpsColorKey(value: string): value is PartnerOpsColorKey {
  return Object.hasOwn(PARTNER_OPS_COLORS, value);
}

export function partnerOpsHexColor(key: PartnerOpsColorKey): string {
  return hexCache[key];
}

export function partnerOpsCssColor(key: PartnerOpsColorKey): string {
  return cssCache[key];
}

export function partnerOpsColorWire(key: PartnerOpsColorKey): PartnerOpsColorWire {
  return {
    colorKey: key,
    token: `--partner-ops-${key}`,
    hex: partnerOpsHexColor(key),
    css: partnerOpsCssColor(key),
  };
}

export function partnerOpsConceptColorWire(
  conceptId: string // brand-ok — glossary concept key (not a domain entity id)
): PartnerOpsColorWire {
  const key =
    (PARTNER_OPS_CONCEPT_COLORS as Record<string, PartnerOpsColorKey>)[conceptId] ?? 'unknown';
  return partnerOpsColorWire(key);
}

export function partnerOpsColorMap(): Record<
  PartnerOpsConceptColorId,
  PartnerOpsColorWire & { conceptId: PartnerOpsConceptColorId }
> {
  const out = {} as Record<
    PartnerOpsConceptColorId,
    PartnerOpsColorWire & { conceptId: PartnerOpsConceptColorId }
  >;
  for (const id of Object.keys(PARTNER_OPS_CONCEPT_COLORS) as PartnerOpsConceptColorId[]) {
    out[id] = { conceptId: id, ...partnerOpsConceptColorWire(id) };
  }
  return out;
}
