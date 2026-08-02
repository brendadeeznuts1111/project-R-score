#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * Validate partner portal integration: routes → anchors → concepts, table
 * columns, tags, telegram topics.
 *
 *   bun run partners:integration:validate
 *
 * Seven layers:
 *   1. Every route anchor resolves to a PORTAL_SEMANTIC_CONCEPT_KEYS member,
 *      and canonical hashes roundtrip through parsePartnerHash.
 *   2. Every table column glossary id is in the shipped inventory
 *      (Kalshi cores ∪ Factory overlay). 🟠 proposed columns are skipped.
 *   3. Every tag glossary id is in the shipped inventory; 🟠 proposed tags
 *      are skipped.
 *   4. Every telegram topic id is in the shipped inventory.
 *   5. Registry data coherence (warnings only).
 *   6. Per-account AccountingView shape.
 *   7. partner-limit-history UI chrome coverage.
 *
 * Corrections vs the source proposal: colors resolve through the real
 * partner-ops color kernel, ids are the shipped forms (no accounting.*
 * renames), and proposed-new concepts are flagged, never gated.
 */
import { PARTNER_OPS_GLOSSARY_CONCEPT_IDS } from '../lib/telegram/partner-ops-glossary.ts';
import { OPS_VIEW_MVP_CONCEPT_IDS } from '../lib/telegram/ops-view-glossary.ts';
import { buildPerAccountAccountingView } from '../lib/telegram/ops-accounting-view.ts';
import { PORTAL_SEMANTIC_CONCEPT_KEYS } from '../lib/portal/semantic-vocabulary.ts';
import {
  anchorConceptId,
  parsePartnerHash,
  partnerHash,
  type PartnerRoute,
} from '../lib/portal/partner-routes.ts';
import { PARTNER_TABLE_SCHEMAS } from '../lib/portal/partner-tables.ts';
import { allPartnerTags } from '../lib/portal/partner-tags.ts';
import { isTelegramTopicSlug, partnerTelegramGlossaryIds } from '../lib/portal/partner-telegram.ts';

const SHIPPED = new Set<string>([...PARTNER_OPS_GLOSSARY_CONCEPT_IDS, ...OPS_VIEW_MVP_CONCEPT_IDS]);
const errs: string[] = [];
const warns: string[] = [];

// ── Layer 1: routes → anchors → portal semantic concepts ────────────────────
const ROUTE_SAMPLES: readonly PartnerRoute[] = [
  { type: 'partners' },
  { type: 'partner', code: 'ASH' },
  { type: 'out', code: 'ASH', outId: 'out-ASH-1' },
  { type: 'opportunities', code: 'ASH' },
  { type: 'opportunity', code: 'ASH', opportunityId: 'opp-ASH-001' },
  { type: 'accounting', code: 'ASH' },
  { type: 'telegram', code: 'ASH', topic: 'ops' },
  { type: 'book', bookId: 'book-dk-nj' },
];

const KEYS = PORTAL_SEMANTIC_CONCEPT_KEYS as readonly string[];
for (const route of ROUTE_SAMPLES) {
  const concept = anchorConceptId(route);
  if (!KEYS.includes(concept)) {
    errs.push(
      `route ${route.type}: anchor concept ${concept} missing from PORTAL_SEMANTIC_CONCEPT_KEYS`
    );
  }
  const hash = partnerHash(route);
  const parsed = parsePartnerHash(hash);
  if (!parsed || parsed.type !== route.type) {
    errs.push(
      `route ${route.type}: canonical hash ${hash} does not roundtrip (got ${parsed?.type ?? 'null'})`
    );
  }
  if (route.type === 'telegram' && !isTelegramTopicSlug(route.topic)) {
    errs.push(`route telegram: topic ${route.topic} is not a valid TelegramTopicSlug`);
  }
}

// TS ↔ board JS parse parity (same hash → same route.type)
const boardRoutes = await import('../public/portal/partners/partner-routes.js');
for (const route of ROUTE_SAMPLES) {
  const hash = partnerHash(route);
  const jsParsed = boardRoutes.parsePartnerHash(hash) as { type?: string } | null;
  if (!jsParsed || jsParsed.type !== route.type) {
    errs.push(
      `JS router parity: ${hash} → ${jsParsed?.type ?? 'null'} (expected ${route.type}; align partner-routes.js with lib/portal/partner-routes.ts)`
    );
  }
}

const portalHtml = await Bun.file('public/portal/partners/index.html').text();
for (const anchor of [
  'partner-panel',
  'accounting-ledger',
  'opportunities-board',
  'telegram-thread',
  'tag-filter-bar',
  'out-table',
  'book-registry',
  'partners-glossary-crumbs',
]) {
  if (!portalHtml.includes(`id="${anchor}"`)) {
    errs.push(`portal anchor ${anchor}: missing from public/portal/partners/index.html`);
  }
}
for (const concept of [
  'data-glossary-concept="section.partnersTags"',
  'data-glossary-concept="section.partnersOuts"',
  'data-glossary-concept="section.partnersBookDetail"',
  'data-glossary-concept="section.partnersOpportunities"',
  'data-glossary-concept="ui.route.partnerHash"',
]) {
  if (!portalHtml.includes(concept)) {
    errs.push(`portal glossary wiring ${concept}: missing from partners board`);
  }
}
for (const marker of ['partner-detail-${', 'opportunity-card-${', 'out-card-${', 'book-card-${']) {
  if (!portalHtml.includes(marker)) errs.push(`portal dynamic anchor marker ${marker}: missing`);
}

// ── Layer 2: table column glossary ids ───────────────────────────────────────
for (const [schema, columns] of Object.entries(PARTNER_TABLE_SCHEMAS)) {
  for (const column of columns) {
    if (!column.glossaryId) continue;
    if (column.proposed) {
      if (SHIPPED.has(column.glossaryId)) {
        warns.push(
          `${schema}.${column.key}: marked proposed but ${column.glossaryId} is already shipped`
        );
      }
      continue;
    }
    if (!SHIPPED.has(column.glossaryId)) {
      errs.push(
        `${schema}.${column.key}: glossaryId ${column.glossaryId} not in shipped inventory`
      );
    }
  }
}

// ── Layer 3: tag glossary ids ────────────────────────────────────────────────
for (const tag of allPartnerTags()) {
  const ids = 'glossaryId' in tag ? [tag.glossaryId] : tag.members;
  for (const id of ids) {
    if (tag.proposed) {
      if (SHIPPED.has(id)) {
        warns.push(`tag ${tag.id}: marked proposed but ${id} is already shipped`);
      }
      continue;
    }
    if (!SHIPPED.has(id)) {
      errs.push(`tag ${tag.id}: concept ${id} not in shipped inventory`);
    }
  }
}

// ── Layer 4: telegram topic glossary ids ─────────────────────────────────────
for (const id of partnerTelegramGlossaryIds()) {
  if (!SHIPPED.has(id)) {
    errs.push(`telegram topic ${id} not in shipped inventory`);
  }
}

// ── Layer 5: registry data coherence (warnings only) ─────────────────────────
// Hard data validation is owned by `bun run partners:validate` (registry gate);
// these are the review's follow-ups (P4 ledger amounts, P5 free-roll) as soft
// warnings so they never block the integration schema gate.
const MONETARY_CODES = new Set<string>([
  'DEPOSIT_RECEIVED',
  'DEPOSIT_ALLOCATED',
  'CREDIT_EXTENDED',
  'SETTLEMENT_PROCESSED',
]);

try {
  const { buildPartnersOpsRegistry } = await import('../lib/telegram/partner-ops-registry.ts');
  const registry = await buildPartnersOpsRegistry();
  for (const partner of registry.partners) {
    for (const event of partner.accounting.ledger) {
      if (MONETARY_CODES.has(event.code) && (event.amount === undefined || event.amount === null)) {
        warns.push(
          `ledger ${partner.code} ${event.code} @${event.at}: monetary event missing amount`
        );
      }
    }
    for (const out of partner.outs) {
      if ((out.freeRollPercent ?? 0) > 0 && partner.accounting.freeRoll.total === 0) {
        warns.push(
          `partner ${partner.code} out ${out.id}: freeRollPercent > 0 but freeRoll.total is 0`
        );
      }
    }
  }
} catch (error) {
  warns.push(
    `registry data layer unavailable (data-coherence warnings skipped): ${String(error).slice(0, 120)}`
  );
}

// ── Layer 6: per-account AccountingView shape ────────────────────────────────
try {
  const { buildPartnersOpsRegistry } = await import('../lib/telegram/partner-ops-registry.ts');
  const registry = await buildPartnersOpsRegistry();
  for (const partner of registry.partners) {
    if (!partner.code) {
      errs.push('per-account view: partner missing code');
      continue;
    }
    const view = buildPerAccountAccountingView(partner);
    if (!view) {
      errs.push(`per-account view: missing for ${partner.code}`);
      continue;
    }
    if (view.type !== 'per_account' || view.partnerCode !== partner.code) {
      errs.push(`per-account view: shape mismatch for ${partner.code}`);
    }
    for (const conceptId of Object.values(view.conceptIds)) {
      if (!SHIPPED.has(conceptId)) {
        errs.push(`per-account view: ${partner.code} concept ${conceptId} not shipped`);
      }
    }
  }
} catch (error) {
  errs.push(`per-account view layer unavailable: ${String(error).slice(0, 120)}`);
}

// ── Layer 7: partner-limit-history UI chrome coverage ────────────────────────
// Every human-readable string in that UI is glossary-governed: these chrome
// ids must resolve in PORTAL_SEMANTIC_CONCEPT_KEYS. Data values ($-950,
// "3 of 13") are computed and use these labels — they are not concepts.
const PARTNER_LIMIT_UI_CHROME_CONCEPTS = [
  'ops.panel.partner_limit_history',
  'ops.panel.limit_overview',
  'ops.summary.partner_limit_trace',
  'ops.filter.account.all',
  'ops.filter.sportsbook.all',
  'ops.filter.window',
  'ops.filter.window.48h',
  'ops.filter.window.7d',
  'ops.filter.window.30d',
  'ops.metric.visible_changes',
  'ops.metric.raises',
  'ops.metric.decreases',
  'ops.metric.sportsbooks',
  'ops.metric.high_water',
  'ops.metric.deltas',
  'ops.metric.active_filters',
  'ops.metric.proof_coverage',
  'ops.table.recent_changes',
  'ops.table.per_account',
  'ops.table.limit_changes',
  'ui.action.refresh',
  'ui.action.export',
  'ui.export.csv',
  'ui.export.json',
] as const;

for (const id of PARTNER_LIMIT_UI_CHROME_CONCEPTS) {
  if (!KEYS.includes(id)) {
    errs.push(`partner-limit-history chrome ${id} missing from PORTAL_SEMANTIC_CONCEPT_KEYS`);
  }
}

const ok = errs.length === 0;
console.log(
  `Partner integration validation: ${ok ? 'PASS' : 'FAIL'} · routes ${ROUTE_SAMPLES.length} · tables ${Object.keys(PARTNER_TABLE_SCHEMAS).length} · tags ${allPartnerTags().length} · topics ${partnerTelegramGlossaryIds().length}`
);
for (const w of warns) console.warn(`  ⚠ ${w}`);
for (const e of errs) console.error(`  ✗ ${e}`);
if (!ok) process.exit(1);
