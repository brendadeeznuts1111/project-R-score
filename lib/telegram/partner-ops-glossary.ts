/**
 * Partner-ops Factory overlay glossary — rails/statuses/topics that extend the
 * Kalshi domain authority. Shared cores live in Kalshi-bot glossary:
 *   partner.phase.* · book.type.* · deposit.method.{venmo,crypto,wire,credit}
 *   out.status.{ready,deferred,paused} · accounting.* · event.*
 *
 * Merged into portal domain-glossary bake via tools/domain-glossary.ts.
 * Must not re-declare Kalshi-owned ids (bake fails on duplicates).
 *
 * @see Kalshi-bot/src/institutions/glossary.ts
 * @see lib/telegram/partner-ops-color-kernel.ts
 * @see lib/telegram/telegram-glossary.ts
 * @see docs/harness/tenants/seat-capital-desk.md
 */

import { PARTNER_OPS_CONCEPT_COLORS } from './partner-ops-color-kernel.ts';
import { PARTNER_OPS_EVENT_CODES } from './partner-ops-events.ts';

const SOURCE = 'lib/telegram/partner-ops-glossary.ts';

/** Factory-only concept ids (Kalshi owns the shared cores). */
export type PartnerOpsOverlayConceptId =
  | 'deposit.method.cashapp'
  | 'deposit.method.paypal'
  | 'deposit.method.zelle'
  | 'deposit.method.apple_pay'
  | 'deposit.method.unknown'
  | 'out.status.blocked'
  | 'out.status.partial'
  | 'out.status.funded'
  | 'telegram.topic.general'
  | 'telegram.topic.ops'
  | 'telegram.topic.alerts'
  | 'telegram.topic.liquidity'
  | 'telegram.topic.accounting'
  | 'partner.ops.event';

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

const LABELS: Record<Exclude<PartnerOpsOverlayConceptId, 'partner.ops.event'>, string> = {
  'deposit.method.cashapp': 'Cash App',
  'deposit.method.paypal': 'PayPal',
  'deposit.method.zelle': 'Zelle',
  'deposit.method.apple_pay': 'Apple Pay',
  'deposit.method.unknown': 'Unknown rail',
  'out.status.blocked': 'Blocked',
  'out.status.partial': 'Partial',
  'out.status.funded': 'Funded',
  'telegram.topic.general': 'General topic',
  'telegram.topic.ops': 'Ops topic',
  'telegram.topic.alerts': 'Alerts topic',
  'telegram.topic.liquidity': 'Liquidity/Outs topic',
  'telegram.topic.accounting': 'Accounting topic',
};

const DESCRIPTIONS: Partial<
  Record<Exclude<PartnerOpsOverlayConceptId, 'partner.ops.event'>, string>
> = {
  'deposit.method.cashapp': 'Cash App funding rail target on the seat capital desk.',
  'out.status.blocked': 'Out blocked — cannot accept bets until cleared.',
  'out.status.partial': 'Out partially funded / limited.',
  'out.status.funded': 'Out funded and ready for desk pressure.',
  'telegram.topic.liquidity': 'Package forum Liquidity/Outs topic — pinned seat capital desk home.',
  'telegram.topic.accounting': 'Package forum Accounting topic — deposit/withdraw proof thread.',
};

function concept(
  id: Exclude<PartnerOpsOverlayConceptId, 'partner.ops.event'>,
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
  // Keep color map coverage for overlay ids (shared cores colored via Kalshi + kernel).
  if (!(id in PARTNER_OPS_CONCEPT_COLORS) && id !== ('partner.ops.event' as never)) {
    // color kernel may omit partner.ops.event — chips use topic/book colors
  }
  return {
    id,
    label: LABELS[id],
    description: DESCRIPTIONS[id] ?? `${LABELS[id]} — partner-ops Factory overlay concept.`,
    category: opts.category ?? 'trading',
    kind: opts.kind ?? 'ui',
    synonyms: opts.synonyms ?? [],
    values: opts.values ?? null,
    seeAlso: opts.seeAlso ?? ['telegram.wire', 'page.partners'],
    status: 'active',
    source: SOURCE,
    semanticType: opts.semanticType ?? 'classification',
    uiRole: opts.uiRole ?? 'chip',
  };
}

/**
 * Factory overlay concepts only. Shared cores come from Kalshi glossary-dump.
 */
export function partnerOpsGlossaryConcepts(): PartnerOpsGlossaryConcept[] {
  return [
    concept('deposit.method.cashapp', {
      kind: 'ui',
      synonyms: ['Cash App', 'CashApp'],
      values: ['CashApp', 'Cash App'],
      seeAlso: ['deposit.method.venmo', 'telegram.deposit_rail'],
    }),
    concept('deposit.method.paypal', {
      kind: 'ui',
      synonyms: ['PayPal'],
      values: ['PayPal'],
      seeAlso: ['deposit.method.venmo', 'telegram.deposit_rail'],
    }),
    concept('deposit.method.zelle', {
      kind: 'ui',
      synonyms: ['Zelle'],
      values: ['Zelle'],
      seeAlso: ['deposit.method.wire', 'telegram.deposit_rail'],
    }),
    concept('deposit.method.apple_pay', {
      kind: 'ui',
      synonyms: ['Apple Pay'],
      values: ['Apple Pay'],
      seeAlso: ['deposit.method.venmo', 'telegram.deposit_rail'],
    }),
    concept('deposit.method.unknown', {
      kind: 'ui',
      synonyms: ['unknown rail', 'TBD rail'],
      seeAlso: ['telegram.deposit_rail'],
    }),

    concept('out.status.blocked', {
      category: 'pipeline',
      kind: 'ui',
      semanticType: 'state',
      uiRole: 'badge',
      synonyms: ['blocked out'],
      values: ['blocked'],
      seeAlso: ['out.status.ready', 'partner.phase.incomplete'],
    }),
    concept('out.status.partial', {
      category: 'pipeline',
      kind: 'ui',
      semanticType: 'state',
      uiRole: 'badge',
      synonyms: ['partial out'],
      values: ['partial'],
      seeAlso: ['out.status.ready', 'out.status.blocked'],
    }),
    concept('out.status.funded', {
      category: 'pipeline',
      kind: 'ui',
      semanticType: 'state',
      uiRole: 'badge',
      synonyms: ['funded out'],
      values: ['funded'],
      seeAlso: ['out.status.ready', 'accounting.deposit'],
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
        'Factory mirror event codes for partner/out/deposit/credit/free-roll/telegram actions. Soft ledger stays in ct. Prefer event.* glossary leaves for UI.',
      category: 'warehouse',
      kind: 'registry',
      synonyms: ['event code', 'PARTNER_OPS_EVENT'],
      values: [...PARTNER_OPS_EVENT_CODES],
      seeAlso: [
        'event.partner.registered',
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

/** Kalshi-owned cores — must exist in glossary-dump after Kalshi partners:validate. */
export const KALSHI_PARTNER_OPS_CORE_CONCEPT_IDS = [
  'partner.phase.operator_ready',
  'partner.phase.onboarding',
  'partner.phase.incomplete',
  'partner.phase.paused',
  'book.type.legal',
  'book.type.offshore',
  'book.type.pph',
  'book.type.crypto',
  'deposit.method.venmo',
  'deposit.method.crypto',
  'deposit.method.wire',
  'deposit.method.credit',
  'out.status.ready',
  'out.status.deferred',
  'out.status.paused',
  'accounting.deposit',
  'accounting.withdrawal',
  'accounting.credit',
  'accounting.free_roll',
  'accounting.settlement',
  'event.partner.registered',
  'event.partner.phase_change',
  'event.out.created',
  'event.out.status_change',
  'event.deposit.received',
  'event.deposit.allocated',
  'event.credit.extended',
  'event.free_roll.applied',
  'event.settlement.processed',
  'event.telegram.invite_sent',
  'event.telegram.message_pinned',
] as const;

export const PARTNER_OPS_OVERLAY_CONCEPT_IDS = partnerOpsGlossaryConcepts().map(c => c.id);

/** Overlay + Kalshi cores (for registry bake conceptIds). */
export const PARTNER_OPS_GLOSSARY_CONCEPT_IDS = [
  ...KALSHI_PARTNER_OPS_CORE_CONCEPT_IDS,
  ...PARTNER_OPS_OVERLAY_CONCEPT_IDS,
];
