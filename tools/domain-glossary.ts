#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/color#flexible-input — Bun.color
// @see https://bun.com/docs/runtime/file-io — Bun.file / Bun.write
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * Bake the portal-facing domain glossary projection.
 *
 * Domain authority remains in Kalshi-bot/src/institutions/glossary.ts. Its
 * validated glossary dump is the integration boundary. Cross-portal UI field
 * semantics come from lib/portal/semantic-vocabulary.ts; this tool combines
 * those disjoint authorities and adds summary counts plus Bun.color-normalized
 * category tokens.
 *
 *   bun run glossary:portal
 *   bun run glossary:portal:check
 */

import { joinPath } from '../lib/path-bun.ts';
import {
  PORTAL_SEMANTIC_CONCEPTS,
  type PortalSemanticConcept,
  validatePortalSemanticVocabulary,
} from '../lib/portal/semantic-vocabulary.ts';
import {
  PORTAL_GLOSSARY_SURFACES,
  validatePortalGlossarySurfaces,
} from '../lib/portal/page-glossary.ts';
import { complianceKpiGlossaryConcepts } from '../lib/operations/compliance-policy-kpis.ts';
import { regulationPolicyGlossaryConcepts } from '../lib/operations/regulation-policy-catalog.ts';
import { sportsBettingGlossaryConcepts } from '../lib/operations/sports-betting-glossary.ts';
import { sportsbookOpeningBaselineGlossaryConcepts } from '../lib/operations/sportsbook-opening-baseline.ts';
import { telegramGlossaryConcepts } from '../lib/telegram/telegram-glossary.ts';
import { partnerOpsGlossaryConcepts } from '../lib/telegram/partner-ops-glossary.ts';
import { opsViewGlossaryConcepts } from '../lib/telegram/ops-view-glossary.ts';
import {
  PARTNER_OPS_CONCEPT_COLORS,
  partnerOpsConceptColorWire,
} from '../lib/telegram/partner-ops-color-kernel.ts';
import { CATEGORY_COLOR_KEYS, PORTAL_KERNEL_PALETTE } from '../lib/portal/portal-kernel-palette.ts';

export const DOMAIN_GLOSSARY_SOURCE_PATH = 'Kalshi-bot/research/registry/glossary-dump.json';
export const DOMAIN_GLOSSARY_PATH = 'public/registry/domain-glossary.json';
export const DOMAIN_GLOSSARY_URL = '/registry/domain-glossary.json';

/** Re-export shared palette for bake consumers / align checks. */
export { CATEGORY_COLOR_KEYS, PORTAL_KERNEL_PALETTE };

type CanonicalConcept = {
  id: string; // brand-ok — glossary concept key, not an entity identity
  label: string;
  description: string;
  category: string;
  kind: string;
  mapsTo: string | null;
  synonyms: string[];
  values: string[] | null;
  valueLabels: Record<string, string> | null;
  seeAlso: string[];
  status: string;
  deprecatedBy: string | null;
  unit: string | null;
  format?: string | null;
  registryColumn: number | null;
  source: string | null;
  featurePurpose: string | null;
  semanticType?: string | null;
  uiRole?: string | null;
  /** Work-item provenance (e.g. PR#228) — optional, portal vocabulary only today. */
  correlationId?: string | null; // brand-ok — provenance work-item ref
  /** ISO date (YYYY-MM-DD) when the concept was added or last materially changed. */
  addedAt?: string | null;
  parentId?: string | null; // brand-ok — glossary concept relation
  scope?: string | null;
  countryCodes?: readonly string[] | null;
  region?: string | null;
  flagEmoji?: string | null;
  flagAriaLabel?: string | null;
};

type CanonicalGlossaryDump = {
  schemaVersion: number;
  generatedAt: string;
  integrityOk: boolean;
  integrityErrors: string[];
  concepts: CanonicalConcept[];
  api?: {
    categories?: Array<{ id: string; label: string }>; // brand-ok — glossary category key
  };
};

export type DomainGlossaryPayload = ReturnType<typeof buildDomainGlossary>;

function normalizeColor(input: string): string {
  const normalized = Bun.color(input, 'hex');
  if (typeof normalized !== 'string') {
    throw new Error(`Invalid glossary category color: ${input}`);
  }
  return normalized;
}

function countBy(
  concepts: readonly CanonicalConcept[],
  select: (concept: CanonicalConcept) => string
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const concept of concepts) {
    const key = select(concept);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function validateSource(source: CanonicalGlossaryDump): void {
  if (source.schemaVersion !== 4 && source.schemaVersion !== 5) {
    throw new Error(`Unsupported canonical glossary schema: ${source.schemaVersion}`);
  }
  if (!source.integrityOk || source.integrityErrors.length > 0) {
    throw new Error(`Canonical glossary integrity failed: ${source.integrityErrors.join('; ')}`);
  }
  if (!Array.isArray(source.concepts) || source.concepts.length === 0) {
    throw new Error('Canonical glossary has no concepts');
  }
  const ids = source.concepts.map(concept => concept.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error('Canonical glossary contains duplicate concept ids');
  }
  for (const concept of source.concepts) {
    if (!(concept.category in CATEGORY_COLOR_KEYS)) {
      throw new Error(`Unknown glossary category "${concept.category}" on ${concept.id}`);
    }
  }
}

export function buildDomainGlossary(source: CanonicalGlossaryDump) {
  validateSource(source);
  validatePortalSemanticVocabulary();
  validatePortalGlossarySurfaces(new Set(PORTAL_SEMANTIC_CONCEPTS.map(concept => concept.id)));

  // Portal vocabulary is closed under validatePortalSemanticVocabulary; append
  // governed discovery edges here after the portal-only check (dossier keeps
  // #section:accounting → section.partnersAccounting while field chrome uses
  // ops.view.per_account).
  const CROSS_PLANE_SEE_ALSO: Readonly<Record<string, readonly string[]>> = {
    'section.partnersAccounting': ['ops.view.per_account'],
    // Structural #section:onboard ↔ phase vocabulary (partner-ops authority).
    'section.partnersOnboard': ['partner.phase.onboarding'],
  };

  const portalConcepts: CanonicalConcept[] = PORTAL_SEMANTIC_CONCEPTS.map(
    (concept: PortalSemanticConcept) => {
      const crossPlane = CROSS_PLANE_SEE_ALSO[concept.id] ?? [];
      const seeAlso = [...(concept.seeAlso ?? [])];
      for (const relatedId of crossPlane) {
        if (!seeAlso.includes(relatedId)) seeAlso.push(relatedId);
      }
      return {
        id: concept.id,
        label: concept.label,
        description: concept.description,
        category: 'ui' as const,
        kind: 'ui' as const,
        mapsTo: null,
        synonyms: [...(concept.synonyms ?? [])],
        values: concept.values ? [...concept.values] : null,
        valueLabels: null,
        seeAlso,
        status: 'active' as const,
        deprecatedBy: null,
        unit: concept.unit ?? null,
        format: concept.format ?? null,
        registryColumn: null,
        source: 'lib/portal/semantic-vocabulary.ts',
        featurePurpose: 'Cross-portal semantic field contract.',
        semanticType: concept.semanticType,
        uiRole: concept.uiRole,
        correlationId: 'correlationId' in concept ? (concept.correlationId ?? null) : null,
        addedAt: 'addedAt' in concept ? (concept.addedAt ?? null) : null,
      };
    }
  );
  const governedConcepts: CanonicalConcept[] = [
    ...regulationPolicyGlossaryConcepts(),
    ...complianceKpiGlossaryConcepts(),
    ...sportsBettingGlossaryConcepts(),
    ...sportsbookOpeningBaselineGlossaryConcepts(),
    ...telegramGlossaryConcepts(),
    ...partnerOpsGlossaryConcepts(),
    ...opsViewGlossaryConcepts(),
  ].map(concept => ({
    id: concept.id,
    label: concept.label,
    description: concept.description,
    category: concept.category,
    kind: concept.kind,
    mapsTo: null,
    synonyms: [...concept.synonyms],
    values: concept.values ? [...concept.values] : null,
    valueLabels: null,
    seeAlso: [...concept.seeAlso],
    status: concept.status,
    deprecatedBy: null,
    unit: 'unit' in concept ? (concept.unit ?? null) : null,
    format: 'format' in concept ? (concept.format ?? null) : null,
    registryColumn: null,
    source: concept.source,
    featurePurpose:
      concept.source === 'lib/operations/sports-betting-glossary.ts'
        ? 'Governed sports betting hierarchy, market, and data-product concept.'
        : concept.source === 'lib/operations/scrapers/scrape-wire-taxonomy.ts'
          ? 'Tier 4 scrape wire taxonomy — unified state/sport/market normalization.'
          : concept.source === 'lib/operations/sports-competition-catalog.ts'
            ? 'Governed sport, league, competition-tier, and event-host geography concept.'
            : concept.source === 'lib/operations/sportsbook-opening-baseline.ts' ||
                concept.source === 'lib/operations/baseline-source-tiers.ts'
              ? 'Governed sportsbook opening-limit baseline concept.'
              : concept.source === 'lib/telegram/telegram-glossary.ts'
                ? 'Governed Telegram package-group, forum topic, seat desk, and handshake concept.'
                : concept.source === 'lib/telegram/partner-ops-glossary.ts'
                  ? 'Governed partner-ops phase, book type, funding rail, out status, and accounting concept.'
                  : concept.source === 'lib/telegram/ops-view-glossary.ts'
                    ? 'Governed ops reporting-view chrome (per-account / per-play / per-week / per-book-type).'
                    : 'Governed compliance policy and KPI concept.',
    semanticType: concept.semanticType,
    uiRole: concept.uiRole,
    parentId: 'parentId' in concept ? (concept.parentId ?? null) : null,
    scope: 'scope' in concept ? (concept.scope ?? null) : null,
    countryCodes: 'countryCodes' in concept ? (concept.countryCodes ?? null) : null,
    region: 'region' in concept ? (concept.region ?? null) : null,
    flagEmoji: 'flagEmoji' in concept ? (concept.flagEmoji ?? null) : null,
    flagAriaLabel: 'flagAriaLabel' in concept ? (concept.flagAriaLabel ?? null) : null,
  }));
  const combinedConcepts = [...source.concepts, ...portalConcepts, ...governedConcepts];
  const combinedIds = combinedConcepts.map(concept => concept.id);
  if (new Set(combinedIds).size !== combinedIds.length) {
    const dupes = combinedIds.filter((id, i) => combinedIds.indexOf(id) !== i);
    throw new Error(
      `Domain and portal semantic authorities contain duplicate concept ids: ${[...new Set(dupes)].join(', ')}`
    );
  }

  const conceptIds = new Set(combinedIds);
  const danglingRelations = combinedConcepts.flatMap(concept =>
    concept.seeAlso
      .filter(relatedId => !conceptIds.has(relatedId))
      .map(relatedId => `${concept.id} -> ${relatedId}`)
  );
  if (danglingRelations.length > 0) {
    throw new Error(
      `Domain glossary contains unresolved seeAlso relations: ${danglingRelations.join(', ')}`
    );
  }

  const categories = (
    source.api?.categories ??
    Object.keys(CATEGORY_COLOR_KEYS).map(id => ({
      id,
      label: id,
    }))
  ).map(category => {
    const colorKey = CATEGORY_COLOR_KEYS[category.id as keyof typeof CATEGORY_COLOR_KEYS];
    if (!colorKey) throw new Error(`Missing color token for glossary category "${category.id}"`);
    const paletteHex = PORTAL_KERNEL_PALETTE[colorKey];
    if (!paletteHex) throw new Error(`Missing portal kernel hex for colorKey "${colorKey}"`);
    return {
      ...category,
      colorKey,
      color: normalizeColor(paletteHex),
    };
  });
  const colorByCategory = new Map(categories.map(category => [category.id, category.color]));
  const concepts = combinedConcepts.map(concept => {
    // Partner-ops closed palette wins over category defaults so chips match the
    // Telegram partner-ops kernel (tennis/kalshi/…), not generic category hues.
    const partnerHex =
      concept.id in PARTNER_OPS_CONCEPT_COLORS ? partnerOpsConceptColorWire(concept.id).hex : null;
    return {
      ...concept,
      color: partnerHex
        ? normalizeColor(partnerHex)
        : (colorByCategory.get(concept.category) ?? null),
    };
  });

  return {
    // v3: surfaces[].sections is PortalGlossarySection[] ({ hash, domId, conceptId, title }).
    schemaVersion: 3,
    sourceSchemaVersion: source.schemaVersion,
    kind: 'domain-glossary',
    path: DOMAIN_GLOSSARY_URL,
    generatedAt: source.generatedAt,
    integrityOk: true,
    sources: {
      semanticAuthority: 'Kalshi-bot/src/institutions/glossary.ts',
      portalSemanticAuthority: 'lib/portal/semantic-vocabulary.ts',
      pageGlossaryAuthority: 'lib/portal/page-glossary.ts',
      regulationPolicyAuthority: 'lib/operations/regulation-policy-catalog.ts',
      complianceKpiAuthority: 'lib/operations/compliance-policy-kpis.ts',
      sportsBettingAuthority: 'lib/operations/sports-betting-glossary.ts',
      sportsTaxonomyAuthority: 'lib/operations/sports-competition-catalog.ts',
      scrapeWireAuthority: 'lib/operations/scrapers/scrape-wire-taxonomy.ts',
      sportsbookOpeningBaselineAuthority: 'lib/operations/sportsbook-opening-baseline.ts',
      telegramAuthority: 'lib/telegram/telegram-glossary.ts',
      telegramColorKernel: 'lib/telegram/telegram-color-kernel.ts',
      partnerOpsAuthority: 'lib/telegram/partner-ops-glossary.ts',
      partnerOpsColorKernel: 'lib/telegram/partner-ops-color-kernel.ts',
      opsViewAuthority: 'lib/telegram/ops-view-glossary.ts',
      canonicalDump: DOMAIN_GLOSSARY_SOURCE_PATH,
      portalProjection: 'tools/domain-glossary.ts',
      colorKernel: 'public/portal/theme.jsonc',
    },
    surfaces: PORTAL_GLOSSARY_SURFACES,
    summary: {
      concepts: concepts.length,
      active: concepts.filter(concept => concept.status === 'active').length,
      deprecated: concepts.filter(concept => concept.status === 'deprecated').length,
      draft: concepts.filter(concept => concept.status === 'draft').length,
      mapped: concepts.filter(concept => concept.mapsTo !== null).length,
      registryColumns: concepts.filter(concept => concept.registryColumn !== null).length,
      portalSemantics: concepts.filter(concept => concept.semanticType != null).length,
      categories: countBy(combinedConcepts, concept => concept.category),
      kinds: countBy(combinedConcepts, concept => concept.kind),
      semanticTypes: countBy(
        combinedConcepts.filter(concept => concept.semanticType != null),
        concept => concept.semanticType ?? 'untyped'
      ),
      uiRoles: countBy(
        combinedConcepts.filter(concept => concept.uiRole != null),
        concept => concept.uiRole ?? 'untyped'
      ),
    },
    categories,
    concepts,
  } as const;
}

async function main(): Promise<void> {
  const root = joinPath(import.meta.dir, '..');
  const source = (await Bun.file(
    joinPath(root, DOMAIN_GLOSSARY_SOURCE_PATH)
  ).json()) as CanonicalGlossaryDump;
  const payload = buildDomainGlossary(source);
  const target = joinPath(root, DOMAIN_GLOSSARY_PATH);
  const serialized = `${JSON.stringify(payload, null, 2)}\n`;

  if (Bun.argv.includes('--check')) {
    if (!(await Bun.file(target).exists())) {
      console.error(`❌ missing ${DOMAIN_GLOSSARY_PATH}; run bun run glossary:portal`);
      process.exit(1);
    }
    const current = await Bun.file(target).text();
    if (current !== serialized) {
      console.error(`❌ ${DOMAIN_GLOSSARY_PATH} is stale; run bun run glossary:portal`);
      process.exit(1);
    }
    console.info(
      `✅ domain glossary current (${payload.summary.concepts} concepts · ` +
        `${payload.categories.length} categories)`
    );
    return;
  }

  await Bun.write(target, serialized);
  console.info(
    `✅ wrote ${DOMAIN_GLOSSARY_PATH} (${payload.summary.concepts} concepts · ` +
      `${payload.categories.length} categories)`
  );
}

if (import.meta.main) {
  await main();
}
