/**
 * Ops reporting-view glossary — Factory overlay for per-account / per-play /
 * per-week / per-book-type chrome. Events stay Kalshi-owned (accounting.* /
 * event.*); these IDs label the reporting filters, not new ledger rows.
 *
 * Soft Balance / MessageLog stay in toc-ops-repo `ct`.
 *
 * Deferred labels collapse via OPS_VIEW_COLLAPSE_BACKLOG (do not mint).
 * Soft Balance / per-play ledgers stay in toc-ops-repo `ct`.
 *
 * @see lib/telegram/partner-ops-glossary.ts
 * @see docs/harness/tenants/telegram-factory.md
 * @see docs/harness/tenants/partner-domain-map.md
 */

const SOURCE = 'lib/telegram/ops-view-glossary.ts';

export type OpsViewGlossaryConcept = {
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

/** Shipped MVP view IDs (dimension roots + per-account chrome). */
export const OPS_VIEW_MVP_CONCEPT_IDS = [
  'ops.view.per_account',
  'ops.view.per_play',
  'ops.view.per_week',
  'ops.view.per_book_type',
  'ops.view.account_summary',
  'ops.view.account_deposits',
  'ops.view.account_settlements',
  'ops.view.account_credit',
  'ops.view.account_freeplay',
  'ops.view.account_net',
] as const;

export type OpsViewMvpConceptId = (typeof OPS_VIEW_MVP_CONCEPT_IDS)[number];

/**
 * Deferred reporting-view labels → existing concepts (collapse, don't mint).
 * Keys are speculative ids from the full reporting-view spec; values are
 * shipped glossary targets. Never add a backlog key to OPS_VIEW_MVP_CONCEPT_IDS.
 */
export const OPS_VIEW_COLLAPSE_BACKLOG = Object.freeze({
  'ops.view.account_fees': 'accounting.settlement',
  'ops.view.account_high_water': 'ops.view.account_net',
  'ops.view.play_id': 'ops.view.per_play',
  'ops.view.play_stake': 'ops.view.per_play',
  'ops.view.play_odds': 'evidence.bookmaker_odds',
  'ops.view.play_result': 'ops.view.per_play',
  'ops.view.play_gross': 'ops.view.account_net',
  'ops.view.play_juice': 'metric.overround',
  'ops.view.play_net': 'ops.view.account_net',
  'ops.view.play_settlement_time': 'accounting.settlement',
  'ops.view.week_of': 'ops.view.per_week',
  'ops.view.weekly_deposits': 'accounting.deposit',
  'ops.view.weekly_withdrawals': 'accounting.withdrawal',
  'ops.view.weekly_settlements': 'accounting.settlement',
  'ops.view.weekly_fees': 'accounting.settlement',
  'ops.view.weekly_net': 'ops.view.account_net',
  'ops.view.week_over_week': 'ops.view.per_week',
  'ops.view.rolling_7d': 'ops.view.per_week',
  'ops.view.rolling_30d': 'ops.view.per_week',
  'ops.view.legal_accounting': 'book.type.legal',
  'ops.view.crypto_accounting': 'book.type.crypto',
  'ops.view.pph_accounting': 'book.type.pph',
  'ops.view.sweepstakes_accounting': 'book.type.sweepstakes',
  'ops.view.legal_deposits': 'accounting.deposit',
  'ops.view.crypto_deposits': 'accounting.deposit',
  'ops.view.legal_settlements': 'accounting.settlement',
  'ops.view.crypto_settlements': 'accounting.settlement',
  'ops.view.legal_fees': 'book.type.legal',
  'ops.view.crypto_fees': 'book.type.crypto',
  'telegram.status.read': 'telegram.status.delivered',
} as const);

export type OpsViewCollapseBacklogId = keyof typeof OPS_VIEW_COLLAPSE_BACKLOG;

function view(
  id: OpsViewMvpConceptId,
  label: string,
  description: string,
  opts: {
    kind?: OpsViewGlossaryConcept['kind'];
    semanticType?: OpsViewGlossaryConcept['semanticType'];
    uiRole?: OpsViewGlossaryConcept['uiRole'];
    synonyms?: readonly string[];
    seeAlso?: readonly string[];
  } = {}
): OpsViewGlossaryConcept {
  return {
    id,
    label,
    description,
    category: 'ui',
    kind: opts.kind ?? 'ui',
    synonyms: opts.synonyms ?? [],
    values: null,
    seeAlso: opts.seeAlso ?? ['ops.view.per_account', 'page.accountDossier', 'page.partners'],
    status: 'active',
    source: SOURCE,
    semanticType: opts.semanticType ?? 'resource',
    uiRole: opts.uiRole ?? 'heading',
  };
}

/** Factory overlay concepts for the reporting-view MVP. */
export function opsViewGlossaryConcepts(): OpsViewGlossaryConcept[] {
  return [
    view(
      'ops.view.per_account',
      'Per account',
      'Reporting dimension: one partner CODE ledger and summary.',
      {
        synonyms: ['account view', 'single-account accounting'],
        seeAlso: [
          'ops.view.account_summary',
          'page.accountDossier',
          'section.partnersAccounting',
          'accounting.deposit',
        ],
      }
    ),
    view(
      'ops.view.per_play',
      'Per play',
      'Reporting dimension: wager-level ledger (dimension only — Soft play bake deferred).',
      {
        synonyms: ['play view', 'wager ledger'],
        seeAlso: ['ops.view.per_account', 'page.partners'],
        uiRole: 'chip',
      }
    ),
    view(
      'ops.view.per_week',
      'Per week',
      'Reporting dimension: weekly rollup window (dimension only — weekly bake deferred).',
      {
        synonyms: ['weekly view', 'week bucket'],
        seeAlso: ['ops.view.per_account', 'page.partners'],
        uiRole: 'chip',
      }
    ),
    view(
      'ops.view.per_book_type',
      'Per book type',
      'Reporting dimension: filter ledger by legal / crypto / pph / sweepstakes (dimension only — rollup bake deferred).',
      {
        synonyms: ['book-type view', 'legal vs crypto accounting'],
        seeAlso: [
          'ops.view.per_account',
          'book.type.legal',
          'book.type.crypto',
          'book.type.pph',
          'page.partners',
        ],
        uiRole: 'chip',
      }
    ),

    view(
      'ops.view.account_summary',
      'Account summary',
      'Header chrome for a single-account accounting view (fund status, phase, incomplete outs).',
      {
        synonyms: ['account header', 'partner accounting summary'],
        seeAlso: [
          'ops.view.per_account',
          'ops.view.account_net',
          'section.partnersAccounting',
          'page.accountDossier',
        ],
      }
    ),
    view(
      'ops.view.account_deposits',
      'Account deposits',
      'Per-account filter over accounting.deposit / event.deposit.received rows.',
      {
        synonyms: ['partner deposits', 'deposit list'],
        seeAlso: [
          'ops.view.per_account',
          'accounting.deposit',
          'event.deposit.received',
          'section.partnersDeposits',
        ],
        uiRole: 'chip',
      }
    ),
    view(
      'ops.view.account_settlements',
      'Account settlements',
      'Per-account filter over accounting.settlement / event.settlement.processed rows.',
      {
        synonyms: ['partner settlements'],
        seeAlso: [
          'ops.view.per_account',
          'accounting.settlement',
          'event.settlement.processed',
          'section.partnersAccounting',
        ],
        uiRole: 'chip',
      }
    ),
    view(
      'ops.view.account_credit',
      'Account credit',
      'Per-account filter over accounting.credit / event.credit.extended rows.',
      {
        synonyms: ['partner credit', 'credit extended'],
        seeAlso: [
          'ops.view.per_account',
          'accounting.credit',
          'event.credit.extended',
          'section.partnersAccounting',
        ],
        uiRole: 'chip',
      }
    ),
    view(
      'ops.view.account_freeplay',
      'Account freeplay',
      'Per-account filter over accounting.free_roll / event.free_roll.applied rows.',
      {
        synonyms: ['partner freeplay', 'free roll'],
        seeAlso: [
          'ops.view.per_account',
          'accounting.free_roll',
          'event.free_roll.applied',
          'section.partnersAccounting',
        ],
        uiRole: 'chip',
      }
    ),
    view(
      'ops.view.account_net',
      'Account net P&L',
      'Composite net for one partner CODE (deposits − withdrawals ± settlements − fees when present).',
      {
        kind: 'composite',
        synonyms: ['account net', 'partner P&L'],
        seeAlso: [
          'ops.view.per_account',
          'ops.view.account_summary',
          'accounting.settlement',
          'accounting.deposit',
          'page.accountDossier',
        ],
        uiRole: 'badge',
      }
    ),
  ];
}
