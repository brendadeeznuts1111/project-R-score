#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/color#flexible-input — Bun.color
// @see https://bun.com/docs/runtime/file-io — Bun.file / Bun.write
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * Bake the portal-facing domain glossary projection.
 *
 * Semantic authority remains in Kalshi-bot/src/institutions/glossary.ts. Its
 * validated glossary dump is the integration boundary; this tool adds only
 * portal summary counts and Bun.color-normalized category tokens.
 *
 *   bun run glossary:portal
 *   bun run glossary:portal:check
 */

import { joinPath } from '../lib/path-bun.ts';
import { FW_COLORS, type FactoryWagerColor } from '../lib/theme/colors.ts';

export const DOMAIN_GLOSSARY_SOURCE_PATH = 'Kalshi-bot/research/registry/glossary-dump.json';
export const DOMAIN_GLOSSARY_PATH = 'public/registry/domain-glossary.json';
export const DOMAIN_GLOSSARY_URL = '/registry/domain-glossary.json';

const CATEGORY_COLOR_KEYS = {
  market: 'primary',
  model: 'secondary',
  tournament: 'success',
  warehouse: 'accent',
  trading: 'warning',
  ui: 'info',
  pipeline: 'error',
  other: 'muted',
} as const satisfies Record<string, FactoryWagerColor>;

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
  registryColumn: number | null;
  source: string | null;
  featurePurpose: string | null;
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
  if (source.schemaVersion !== 4) {
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

  const categories = (
    source.api?.categories ??
    Object.keys(CATEGORY_COLOR_KEYS).map(id => ({
      id,
      label: id,
    }))
  ).map(category => {
    const colorKey = CATEGORY_COLOR_KEYS[category.id as keyof typeof CATEGORY_COLOR_KEYS];
    if (!colorKey) throw new Error(`Missing color token for glossary category "${category.id}"`);
    return {
      ...category,
      colorKey,
      color: normalizeColor(FW_COLORS[colorKey]),
    };
  });
  const colorByCategory = new Map(categories.map(category => [category.id, category.color]));
  const concepts = source.concepts.map(concept => ({
    ...concept,
    color: colorByCategory.get(concept.category),
  }));

  return {
    schemaVersion: 1,
    kind: 'domain-glossary',
    path: DOMAIN_GLOSSARY_URL,
    generatedAt: source.generatedAt,
    integrityOk: true,
    sources: {
      semanticAuthority: 'Kalshi-bot/src/institutions/glossary.ts',
      canonicalDump: DOMAIN_GLOSSARY_SOURCE_PATH,
      portalProjection: 'tools/domain-glossary.ts',
      colorKernel: 'lib/theme/colors.ts',
    },
    summary: {
      concepts: concepts.length,
      active: concepts.filter(concept => concept.status === 'active').length,
      deprecated: concepts.filter(concept => concept.status === 'deprecated').length,
      draft: concepts.filter(concept => concept.status === 'draft').length,
      mapped: concepts.filter(concept => concept.mapsTo !== null).length,
      registryColumns: concepts.filter(concept => concept.registryColumn !== null).length,
      categories: countBy(source.concepts, concept => concept.category),
      kinds: countBy(source.concepts, concept => concept.kind),
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
