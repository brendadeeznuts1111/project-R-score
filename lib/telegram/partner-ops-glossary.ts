/**
 * Partner-ops domain glossary — phases, book types, funding rails, out status,
 * accounting events, Telegram topic leaves. Collision-free namespaces.
 *
 * Merged into portal domain-glossary bake via tools/domain-glossary.ts.
 *
 * @see lib/telegram/partner-ops-color-kernel.ts
 * @see lib/telegram/telegram-glossary.ts
 * @see docs/harness/tenants/seat-capital-desk.md
 */

import { PARTNER_OPS_CONCEPT_COLORS } from './partner-ops-color-kernel.ts';
import { PARTNER_OPS_EVENT_CODES } from './partner-ops-events.ts';

const SOURCE = 'lib/telegram/partner-ops-glossary.ts';

export type PartnerOpsGlossaryConcept = {
  id: string; // brand-ok — glossary concept key
  label: string;
  description: string;
  category: 'pipeline' | 'trading' | 'warehouse' | 'ui';
  kind: 'evidence' | 'registry' | 'composite' | 'ui';
  synonyms: readonly string[];
  values: readonly string[] | null;
  seeAlso: readonly string[];
  status: 'active';
  source: typeof SOURCE;
  semanticType: 'classification' | 'resource' | 'state';
  uiRole: 'badge' | 'chip' | 'code' | 'heading' | 'link' | 'token';
};

const LABELS: Record<keyof typeof PARTNER_OPS_CONCEPT_COLORS, string> = {
  'partner.phase.operator_ready': 'Operator ready',
  'partner.phase.onboarding': 'Onboarding',
  'partner.phase.incomplete': 'Incomplete',
  'partner.phase.paused': 'Paused',
  'book.type.legal': 'Legal book',
  'book.type.offshore': 'Offshore book',
  'book.type.pph': 'PPH desk',
  'book.type.crypto': 'Crypto book',
  'deposit.method.venmo': 'Venmo',
  'deposit.method.crypto': 'Crypto',
  'deposit.method.wire': 'Wire transfer',
  'deposit.method.credit': 'Credit line',
  'deposit.method.cashapp': 'Cash App',
  'deposit.method.paypal': 'PayPal',
  'deposit.method.zelle': 'Zelle',
  'deposit.method.apple_pay': 'Apple Pay',
  'deposit.method.unknown': 'Unknown rail',
  'out.status.ready': 'Ready',
  'out.status.deferred': 'Deferred',
  'out.status.paused': 'Paused',
  'out.status.blocked': 'Blocked',
  'out.status.partial': 'Partial',
  'out.status.funded': 'Funded',
  'accounting.deposit': 'Deposit received',
  'accounting.withdrawal': 'Withdrawal processed',
  'accounting.credit': 'Credit extended',
  'accounting.free_roll': 'Free-roll applied',
  'accounting.settlement': 'Settlement confirmed',
  'telegram.topic.general': 'General topic',
  'telegram.topic.ops': 'Ops topic',
  'telegram.topic.alerts': 'Alerts topic',
  'telegram.topic.liquidity': 'Liquidity/Outs topic',
  'telegram.topic.accounting': 'Accounting topic',
};

const DESCRIPTIONS: Partial<Record<keyof typeof PARTNER_OPS_CONCEPT_COLORS, string>> = {
  'partner.phase.operator_ready':
    'Handshake complete — partner forum linked, DM seat designated, operator can run desk.',
  'partner.phase.onboarding':
    'Partner CODE registered or forum wiring in progress (forum_ready / designated).',
  'partner.phase.incomplete': 'Blocked or missing gates — intake/handshake incomplete.',
  'partner.phase.paused': 'Operator paused the partner seat (no FUND pressure).',
  'book.type.legal': 'US-regulated retail sportsbook (scrape-wire book registry class).',
  'book.type.offshore': 'Offshore / non-US retail book (not in legal scrape-wire set).',
  'book.type.pph': 'Pay-per-head / agent desk book.',
  'book.type.crypto': 'Crypto-settled sportsbook.',
  'deposit.method.venmo': 'Venmo funding rail target on the seat capital desk.',
  'deposit.method.crypto': 'Crypto address funding rail.',
  'deposit.method.wire': 'Bank wire funding rail.',
  'deposit.method.credit': 'House credit line (not a cash deposit).',
  'accounting.deposit': 'Incoming deposit confirmed against a funding target.',
  'accounting.credit': 'Credit line extended — soft ledger detail stays in ct.',
  'accounting.free_roll': 'Freeplay / free-roll percent applied on a deposit or bet stake.',
  'accounting.settlement': 'Settlement confirmed — factory mirror event only.',
  'telegram.topic.liquidity': 'Package forum Liquidity/Outs topic — pinned seat capital desk home.',
  'telegram.topic.accounting': 'Package forum Accounting topic — deposit/withdraw proof thread.',
};

function concept(
  id: keyof typeof PARTNER_OPS_CONCEPT_COLORS,
  opts: {
    category?: PartnerOpsGlossaryConcept['category'];
    kind?: PartnerOpsGlossaryConcept['kind'];
    semanticType?: PartnerOpsGlossaryConcept['semanticType'];
    uiRole?: PartnerOpsGlossaryConcept['uiRole'];
    synonyms?: readonly string[];
    values?: readonly string[] | null;
    seeAlso?: readonly string[];
  } = {}
): PartnerOpsGlossaryConcept {
  return {
    id,
    label: LABELS[id],
    description: DESCRIPTIONS[id] ?? `${LABELS[id]} — partner-ops taxonomy concept.`,
    category: opts.category ?? 'trading',
    kind: opts.kind ?? 'registry',
    synonyms: opts.synonyms ?? [],
    values: opts.values ?? null,
    seeAlso: opts.seeAlso ?? ['telegram.wire', 'page.partners'],
    status: 'active',
    source: SOURCE,
    semanticType: opts.semanticType ?? 'classification',
    uiRole: opts.uiRole ?? 'chip',
  };
}

/** Glossary concepts for portal / domain-glossary bake. */
export function partnerOpsGlossaryConcepts(): PartnerOpsGlossaryConcept[] {
  return [
    concept('partner.phase.operator_ready', {
      category: 'pipeline',
      semanticType: 'state',
      uiRole: 'badge',
      synonyms: ['operator ready', 'phase operator_ready'],
      values: ['operator_ready'],
      seeAlso: [
        'partner.phase.onboarding',
        'partner.phase.incomplete',
        'telegram.handshake',
        'section.partnersTelegram',
        'page.partners',
      ],
    }),
    concept('partner.phase.onboarding', {
      category: 'pipeline',
      semanticType: 'state',
      uiRole: 'badge',
      synonyms: ['onboarding', 'forum_ready', 'designated'],
      values: ['onboarding', 'forum_ready', 'designated'],
      seeAlso: ['partner.phase.operator_ready', 'partner.phase.incomplete', 'telegram.handshake'],
    }),
    concept('partner.phase.incomplete', {
      category: 'pipeline',
      semanticType: 'state',
      uiRole: 'badge',
      synonyms: ['incomplete', 'blocked'],
      values: ['incomplete', 'blocked'],
      seeAlso: ['partner.phase.onboarding', 'partner.phase.operator_ready'],
    }),
    concept('partner.phase.paused', {
      category: 'pipeline',
      semanticType: 'state',
      uiRole: 'badge',
      synonyms: ['paused'],
      values: ['paused'],
      seeAlso: ['partner.phase.operator_ready', 'out.status.paused'],
    }),

    concept('book.type.legal', {
      synonyms: ['legal book', 'US book'],
      seeAlso: ['book.type.offshore', 'scrape.book', 'telegram.deposit_rail'],
    }),
    concept('book.type.offshore', {
      synonyms: ['offshore book'],
      seeAlso: ['book.type.legal', 'book.type.pph', 'scrape.book'],
    }),
    concept('book.type.pph', {
      synonyms: ['PPH', 'pay per head'],
      seeAlso: ['book.type.offshore', 'book.type.legal'],
    }),
    concept('book.type.crypto', {
      synonyms: ['crypto book'],
      seeAlso: ['book.type.offshore', 'deposit.method.crypto'],
    }),

    concept('deposit.method.venmo', {
      synonyms: ['Venmo'],
      values: ['Venmo'],
      seeAlso: ['deposit.method.cashapp', 'telegram.deposit_rail', 'accounting.deposit'],
    }),
    concept('deposit.method.crypto', {
      synonyms: ['crypto rail', 'BTC', 'USDC'],
      seeAlso: ['book.type.crypto', 'telegram.deposit_rail', 'accounting.deposit'],
    }),
    concept('deposit.method.wire', {
      synonyms: ['wire', 'bank wire'],
      seeAlso: ['deposit.method.credit', 'telegram.deposit_rail'],
    }),
    concept('deposit.method.credit', {
      synonyms: ['credit line', 'house credit'],
      seeAlso: ['accounting.credit', 'telegram.deposit_rail'],
    }),
    concept('deposit.method.cashapp', {
      synonyms: ['Cash App', 'CashApp'],
      values: ['CashApp', 'Cash App'],
      seeAlso: ['deposit.method.venmo', 'telegram.deposit_rail'],
    }),
    concept('deposit.method.paypal', {
      synonyms: ['PayPal'],
      values: ['PayPal'],
      seeAlso: ['deposit.method.venmo', 'telegram.deposit_rail'],
    }),
    concept('deposit.method.zelle', {
      synonyms: ['Zelle'],
      values: ['Zelle'],
      seeAlso: ['deposit.method.wire', 'telegram.deposit_rail'],
    }),
    concept('deposit.method.apple_pay', {
      synonyms: ['Apple Pay'],
      values: ['Apple Pay'],
      seeAlso: ['deposit.method.venmo', 'telegram.deposit_rail'],
    }),
    concept('deposit.method.unknown', {
      synonyms: ['unknown rail', 'TBD rail'],
      seeAlso: ['telegram.deposit_rail'],
    }),

    concept('out.status.ready', {
      semanticType: 'state',
      uiRole: 'badge',
      synonyms: ['out ready'],
      values: ['ready'],
      seeAlso: ['out.status.deferred', 'telegram.seat_desk', 'section.partnersDeposits'],
    }),
    concept('out.status.deferred', {
      semanticType: 'state',
      uiRole: 'badge',
      synonyms: ['deferred out', 'warming'],
      values: ['deferred'],
      seeAlso: ['out.status.ready', 'out.status.paused', 'telegram.seat_desk'],
    }),
    concept('out.status.paused', {
      semanticType: 'state',
      uiRole: 'badge',
      synonyms: ['paused out'],
      values: ['paused'],
      seeAlso: ['out.status.deferred', 'partner.phase.paused'],
    }),
    concept('out.status.blocked', {
      semanticType: 'state',
      uiRole: 'badge',
      synonyms: ['blocked out'],
      values: ['blocked'],
      seeAlso: ['out.status.ready', 'partner.phase.incomplete'],
    }),
    concept('out.status.partial', {
      semanticType: 'state',
      uiRole: 'badge',
      synonyms: ['partial out'],
      values: ['partial'],
      seeAlso: ['out.status.ready', 'out.status.blocked'],
    }),
    concept('out.status.funded', {
      semanticType: 'state',
      uiRole: 'badge',
      synonyms: ['funded out'],
      values: ['funded'],
      seeAlso: ['out.status.ready', 'accounting.deposit'],
    }),

    concept('accounting.deposit', {
      category: 'trading',
      kind: 'evidence',
      uiRole: 'badge',
      synonyms: ['deposit received', 'DEPOSIT_RECEIVED'],
      seeAlso: [
        'accounting.credit',
        'accounting.free_roll',
        'telegram.deposit_rail',
        'page.partners',
      ],
    }),
    concept('accounting.withdrawal', {
      category: 'trading',
      kind: 'evidence',
      uiRole: 'badge',
      synonyms: ['withdrawal', 'cashout'],
      seeAlso: ['accounting.deposit', 'telegram.forum.topic.accounting'],
    }),
    concept('accounting.credit', {
      category: 'trading',
      kind: 'evidence',
      uiRole: 'badge',
      synonyms: ['credit extended', 'CREDIT_EXTENDED'],
      seeAlso: ['accounting.deposit', 'deposit.method.credit'],
    }),
    concept('accounting.free_roll', {
      category: 'trading',
      kind: 'evidence',
      uiRole: 'badge',
      synonyms: ['free-roll', 'freeplay', 'FREE_ROLL_APPLIED', 'FP%'],
      seeAlso: ['accounting.deposit', 'telegram.seat_desk', 'section.partnersDeposits'],
    }),
    concept('accounting.settlement', {
      category: 'trading',
      kind: 'evidence',
      uiRole: 'badge',
      synonyms: ['settlement', 'SETTLEMENT_PROCESSED'],
      seeAlso: ['accounting.deposit', 'accounting.withdrawal'],
    }),

    concept('telegram.topic.general', {
      category: 'ui',
      kind: 'ui',
      synonyms: ['General'],
      values: ['general'],
      seeAlso: ['telegram.forum.topic', 'telegram.topic.ops', 'telegram.wire'],
    }),
    concept('telegram.topic.ops', {
      category: 'ui',
      kind: 'ui',
      synonyms: ['Ops'],
      values: ['ops'],
      seeAlso: ['telegram.forum.topic', 'telegram.topic.alerts', 'telegram.wire'],
    }),
    concept('telegram.topic.alerts', {
      category: 'ui',
      kind: 'ui',
      synonyms: ['Alerts'],
      values: ['alerts'],
      seeAlso: ['telegram.forum.topic', 'telegram.topic.ops', 'telegram.wire'],
    }),
    concept('telegram.topic.liquidity', {
      category: 'ui',
      kind: 'ui',
      synonyms: ['Liquidity/Outs', 'liquidity/outs'],
      values: ['liquidity/outs', 'liquidity'],
      seeAlso: [
        'telegram.forum.topic.liquidity_outs',
        'telegram.seat_desk',
        'telegram.topic.accounting',
      ],
    }),
    concept('telegram.topic.accounting', {
      category: 'ui',
      kind: 'ui',
      synonyms: ['Accounting'],
      values: ['accounting'],
      seeAlso: [
        'telegram.forum.topic.accounting',
        'telegram.surface.all_accounting',
        'section.partnersAccounting',
      ],
    }),

    {
      id: 'partner.ops.event',
      label: 'Partner-ops event code',
      description:
        'Factory mirror event codes for partner/out/deposit/credit/free-roll/telegram actions. Soft ledger stays in ct.',
      category: 'warehouse',
      kind: 'registry',
      synonyms: ['event code', 'PARTNER_OPS_EVENT'],
      values: [...PARTNER_OPS_EVENT_CODES],
      seeAlso: [
        'accounting.deposit',
        'accounting.credit',
        'accounting.free_roll',
        'telegram.wire',
        'page.partners',
      ],
      status: 'active',
      source: SOURCE,
      semanticType: 'classification',
      uiRole: 'code',
    },
  ];
}

export const PARTNER_OPS_GLOSSARY_CONCEPT_IDS = partnerOpsGlossaryConcepts().map(c => c.id);
