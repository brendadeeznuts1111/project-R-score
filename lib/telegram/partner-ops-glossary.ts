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
  | 'book.type.sweepstakes'
  | 'book.type.exchange'
  | 'telegram.topic.general'
  | 'telegram.topic.ops'
  | 'telegram.topic.alerts'
  | 'telegram.topic.liquidity'
  | 'telegram.topic.accounting'
  | 'opportunity.stage.new'
  | 'opportunity.stage.qualifying'
  | 'opportunity.stage.proposal'
  | 'opportunity.stage.contracting'
  | 'opportunity.stage.won'
  | 'opportunity.stage.lost'
  | 'event.opportunity.created'
  | 'event.opportunity.stage_changed'
  | 'event.opportunity.account_linked'
  | 'event.opportunity.agreement_created'
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
  'book.type.sweepstakes': 'Sweepstakes book',
  'book.type.exchange': 'Exchange',
  'telegram.topic.general': 'General topic',
  'telegram.topic.ops': 'Ops topic',
  'telegram.topic.alerts': 'Alerts topic',
  'telegram.topic.liquidity': 'Liquidity/Outs topic',
  'telegram.topic.accounting': 'Accounting topic',
  'opportunity.stage.new': 'New opportunity',
  'opportunity.stage.qualifying': 'Qualifying',
  'opportunity.stage.proposal': 'Proposal',
  'opportunity.stage.contracting': 'Contracting',
  'opportunity.stage.won': 'Won',
  'opportunity.stage.lost': 'Lost',
  'event.opportunity.created': 'Opportunity created',
  'event.opportunity.stage_changed': 'Opportunity stage changed',
  'event.opportunity.account_linked': 'Opportunity account linked',
  'event.opportunity.agreement_created': 'Opportunity agreement created',
};

const DESCRIPTIONS: Partial<
  Record<Exclude<PartnerOpsOverlayConceptId, 'partner.ops.event'>, string>
> = {
  'deposit.method.cashapp': 'Cash App funding rail target on the seat capital desk.',
  'out.status.blocked': 'Out blocked — cannot accept bets until cleared.',
  'out.status.partial': 'Out partially funded / limited.',
  'out.status.funded': 'Out funded and ready for desk pressure.',
  'book.type.sweepstakes':
    'Sweepstakes / social-casino sportsbook (play-through currency, not state-licensed sports wagering).',
  'book.type.exchange':
    'Peer-to-peer / exchange sportsbook (matched bets, commission on winnings).',
  'telegram.topic.liquidity': 'Package forum Liquidity/Outs topic — pinned seat capital desk home.',
  'telegram.topic.accounting': 'Package forum Accounting topic — deposit/withdraw proof thread.',
  'opportunity.stage.new': 'New partner or account opportunity awaiting qualification.',
  'opportunity.stage.qualifying': 'Opportunity under fit, account, and operating-readiness review.',
  'opportunity.stage.proposal': 'Opportunity with commercial or operating terms proposed.',
  'opportunity.stage.contracting': 'Opportunity progressing through agreement execution.',
  'opportunity.stage.won': 'Opportunity converted into active partner, account, or agreement work.',
  'opportunity.stage.lost': 'Opportunity closed without conversion.',
  'event.opportunity.created': 'Append-only creation event for an opportunity.',
  'event.opportunity.stage_changed': 'Append-only transition between opportunity stages.',
  'event.opportunity.account_linked': 'Append-only link from an opportunity to an account.',
  'event.opportunity.agreement_created':
    'Append-only link from an opportunity to signed commercial terms.',
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
    concept('book.type.sweepstakes', {
      kind: 'ui',
      synonyms: ['sweepstakes', 'sweepstakes book', 'social casino book'],
      values: ['sweepstakes'],
      seeAlso: [
        'book.type.legal',
        'book.type.crypto',
        'book.type.pph',
        'book.type.exchange',
        'book.type.offshore',
      ],
    }),
    concept('book.type.exchange', {
      kind: 'ui',
      synonyms: ['exchange', 'betting exchange', 'matched betting venue'],
      values: ['exchange'],
      seeAlso: [
        'book.type.legal',
        'book.type.crypto',
        'book.type.pph',
        'book.type.sweepstakes',
        'book.type.offshore',
      ],
    }),
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

    ...(
      [
        ['opportunity.stage.new', ['new opportunity', 'lead']],
        ['opportunity.stage.qualifying', ['qualification', 'qualified lead']],
        ['opportunity.stage.proposal', ['proposal sent', 'terms proposed']],
        ['opportunity.stage.contracting', ['contract', 'agreement pending']],
        ['opportunity.stage.won', ['closed won', 'converted']],
        ['opportunity.stage.lost', ['closed lost', 'declined']],
      ] as const
    ).map(([id, synonyms]) =>
      concept(id, {
        category: 'pipeline',
        kind: 'ui',
        semanticType: 'state',
        uiRole: 'badge',
        synonyms,
        values: [id.replace('opportunity.stage.', '')],
        seeAlso: ['partner.ops.event', 'page.partners'],
      })
    ),
    ...(
      [
        'event.opportunity.created',
        'event.opportunity.stage_changed',
        'event.opportunity.account_linked',
        'event.opportunity.agreement_created',
      ] as const
    ).map(id =>
      concept(id, {
        category: 'warehouse',
        kind: 'evidence',
        semanticType: 'resource',
        uiRole: 'code',
        synonyms: [LABELS[id].toLowerCase()],
        seeAlso: ['partner.ops.event', 'page.partners'],
      })
    ),

    {
      id: 'partner.ops.event',
      label: 'Partner-ops event code',
      description:
        'Factory mirror event codes for partner, opportunity, out, deposit, credit, free-roll, and Telegram actions. Soft ledger stays in ct. Prefer event.* glossary leaves for UI.',
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
        'event.opportunity.created',
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

/** Existing limit glossary leaves consumed by the partners account-control view. */
export const PARTNER_LIMIT_CONCEPT_IDS = [
  'ops.limits.account',
  'ops.limits.effective_limit',
  'ops.limits.monitoring_status',
  'ops.limits.evidence_trace',
] as const;

/** Factory overlay + shared cores consumed by the partner registry and board. */
export const PARTNER_OPS_GLOSSARY_CONCEPT_IDS = [
  ...KALSHI_PARTNER_OPS_CORE_CONCEPT_IDS,
  ...PARTNER_OPS_OVERLAY_CONCEPT_IDS,
  ...PARTNER_LIMIT_CONCEPT_IDS,
];
