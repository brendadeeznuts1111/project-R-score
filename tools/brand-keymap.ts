#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io — Bun.file / Bun.write
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/color#flexible-input — Bun.color
/**
 * Bake the reader-facing branded-value glossary and project adoption map.
 *
 * Source of truth stays in BRAND_CATALOG + generated brand-manifest.json.
 * This artifact joins that contract with tracked consumer coverage so the
 * portal can explain both the vocabulary and the remaining adoption work.
 * Glossary concept ids are joined from domain-glossary synonyms so brands
 * stay aligned with the portal vocabulary board.
 *
 *   bun tools/brand-keymap.ts
 *   bun tools/brand-keymap.ts --check
 */

import {
  analyzeBrandCoverage,
  analyzeProjectBrandAdoption,
  loadBrandConsumerFiles,
  loadProjectRoots,
  type BrandCoverageFile,
} from './brand-coverage.ts';
import { portalTheme } from '../lib/portal/theme.ts';

export const BRAND_KEYMAP_PATH = 'public/registry/brand-keymap.json';
export const BRAND_KEYMAP_URL = '/registry/brand-keymap.json';
export const DOMAIN_GLOSSARY_PATH = 'public/registry/domain-glossary.json';

type BrandManifest = {
  version: number;
  source: string;
  brandCount: number;
  domainCount: number;
  domains: string[];
  kinds: Record<string, number>;
  domainCatalog: Array<{ name: string; module: string; brandCount: number }>;
  brands: Array<{
    name: string;
    domain: string;
    kind: string;
    module: string;
    description: string;
    mint: string[];
    constructors: { as: string; try: string; parse: string };
    validation: {
      shape: string;
      pattern?: string;
      flags?: string;
      ingressNormalization: string;
    };
    guard: string;
  }>;
};

type GlossaryConceptLite = {
  id: string; // brand-ok — glossary concept key, not an entity identity
  synonyms?: string[] | null;
};

/**
 * Brand domain → portal design-kernel color (dark palette).
 * Matches theme.jsonc tones used by `/portal` chips and partner-ops kernels.
 */
const BRAND_DOMAIN_COLORS = {
  session: { colorKey: 'accent', hex: portalTheme.dark.accent, tone: 'info' },
  identity: { colorKey: 'purple', hex: '#a371f7', tone: 'info' },
  documents: { colorKey: 'green', hex: portalTheme.dark.green, tone: 'ok' },
  security: { colorKey: 'red', hex: portalTheme.dark.red, tone: 'bad' },
  deployment: { colorKey: 'yellow', hex: portalTheme.dark.yellow, tone: 'warn' },
  audit: { colorKey: 'orange', hex: '#f0883e', tone: 'warn' },
  operations: { colorKey: 'accent', hex: portalTheme.dark.accent, tone: 'info' },
  portal: { colorKey: 'green', hex: portalTheme.dark.green, tone: 'ok' },
  surfaces: { colorKey: 'purple', hex: '#a371f7', tone: 'info' },
} as const;

export type BrandKeymapPayload = ReturnType<typeof buildBrandKeymap>;

function boundedFiles(files: readonly string[]): string[] {
  return files.slice(0, 12);
}

function normalizeHex(input: string): string {
  const hex = Bun.color(input, 'hex');
  if (typeof hex !== 'string') {
    throw new Error(`Invalid brand domain color: ${input}`);
  }
  return hex;
}

/** Map brand name → glossary concept ids via synonym / exact id match. */
export function glossaryConceptsForBrands(
  brandNames: readonly string[],
  concepts: readonly GlossaryConceptLite[]
): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const name of brandNames) out.set(name, []);
  const nameSet = new Set(brandNames);
  for (const concept of concepts) {
    const hits = new Set<string>();
    if (nameSet.has(concept.id)) hits.add(concept.id);
    for (const synonym of concept.synonyms ?? []) {
      if (nameSet.has(synonym)) hits.add(synonym);
    }
    for (const brand of hits) {
      const list = out.get(brand) ?? [];
      if (!list.includes(concept.id)) list.push(concept.id);
      out.set(brand, list);
    }
  }
  for (const [name, list] of out) {
    list.sort((a, b) => a.localeCompare(b));
    out.set(name, list);
  }
  return out;
}

export function buildBrandKeymap(
  manifest: BrandManifest,
  files: readonly BrandCoverageFile[],
  projectRoots: readonly string[],
  generatedAt = new Date().toISOString(),
  glossaryConcepts: readonly GlossaryConceptLite[] = []
) {
  const coverage = analyzeBrandCoverage(files);
  const coverageByName = new Map(coverage.map(row => [row.name, row]));
  const projects = analyzeProjectBrandAdoption(files, projectRoots);
  const trackedProjects = projects.filter(project => project.status !== 'external-or-untracked');
  const adoptedProjects = projects.filter(project =>
    ['adopted', 'local-pattern'].includes(project.status)
  );
  const brandNames = manifest.brands.map(brand => brand.name);
  const glossaryByBrand = glossaryConceptsForBrands(brandNames, glossaryConcepts);
  const domains = manifest.domainCatalog.map(domain => {
    const colors = BRAND_DOMAIN_COLORS[domain.name as keyof typeof BRAND_DOMAIN_COLORS];
    if (!colors) {
      throw new Error(`Missing portal kernel color for brand domain "${domain.name}"`);
    }
    return {
      ...domain,
      colorKey: colors.colorKey,
      color: normalizeHex(colors.hex),
      tone: colors.tone,
    };
  });
  const domainColorByName = new Map(domains.map(domain => [domain.name, domain]));

  return {
    schemaVersion: 1,
    kind: 'brand-keymap',
    path: BRAND_KEYMAP_URL,
    generatedAt,
    sources: {
      catalog: manifest.source,
      manifest: 'lib/types/brand-manifest.json',
      coverage: 'tools/brand-coverage.ts',
      stableImport: 'lib/types/branded.ts',
      domainGlossary: DOMAIN_GLOSSARY_PATH,
      colorKernel: 'public/portal/theme.jsonc',
    },
    summary: {
      brands: manifest.brandCount,
      domains: manifest.domainCount,
      ids: manifest.kinds.id ?? 0,
      keys: manifest.kinds.key ?? 0,
      codes: manifest.kinds.code ?? 0,
      covered: coverage.filter(row => row.status === 'covered').length,
      referencedUnconstructed: coverage.filter(row => row.status === 'referenced-unconstructed')
        .length,
      unused: coverage.filter(row => row.status === 'unused').length,
      cataloguedProjects: projects.length,
      trackedProjects: trackedProjects.length,
      adoptedProjects: adoptedProjects.length,
      canonicalProjects: projects.filter(project => project.status === 'adopted').length,
      localPatternProjects: projects.filter(project => project.status === 'local-pattern').length,
      glossaryLinked: brandNames.filter(name => (glossaryByBrand.get(name)?.length ?? 0) > 0)
        .length,
    },
    governance: {
      rule: 'Domain identities are branded after the wire boundary; new bare-string IDs fail the staged strict gate.',
      stagedGate: 'bun tools/branded-id-check.ts --staged --strict',
      catalog: 'bun tools/brand-catalog.ts [domain|BrandName]',
      coverage: 'bun tools/brand-coverage.ts --attention',
      constructorTiers: [
        {
          tier: 'as',
          use: 'required trusted interior value or owned mint',
        },
        {
          tier: 'try',
          use: 'optional config or soft merge; blank becomes undefined',
        },
        {
          tier: 'parse',
          use: 'wire, JSON, CLI, form, or environment ingress',
        },
        {
          tier: 'guard',
          use: 'narrow an already-canonical unknown value; does not prove provenance',
        },
      ],
    },
    domains,
    brands: manifest.brands.map(brand => {
      const row = coverageByName.get(brand.name as (typeof coverage)[number]['name']);
      if (!row) throw new Error(`Missing coverage row for ${brand.name}`);
      const domainColor = domainColorByName.get(brand.domain);
      return {
        ...brand,
        colorKey: domainColor?.colorKey ?? 'muted',
        color: domainColor?.color ?? normalizeHex(portalTheme.dark.textDim),
        tone: domainColor?.tone ?? 'skip',
        glossaryConcepts: glossaryByBrand.get(brand.name) ?? [],
        coverage: {
          status: row.status,
          references: row.references,
          constructors: {
            as: row.asCalls,
            try: row.tryCalls,
            parse: row.parseCalls,
          },
          guards: row.guardCalls,
          files: boundedFiles(row.files),
          scopes: {
            spine: {
              status: row.scopes.spine.status,
              references: row.scopes.spine.references,
              constructionCalls: row.scopes.spine.constructionCalls,
              guardCalls: row.scopes.spine.guardCalls,
              files: boundedFiles(row.scopes.spine.files),
            },
            projects: {
              status: row.scopes.projects.status,
              references: row.scopes.projects.references,
              constructionCalls: row.scopes.projects.constructionCalls,
              guardCalls: row.scopes.projects.guardCalls,
              files: boundedFiles(row.scopes.projects.files),
            },
          },
        },
      };
    }),
    projects,
  } as const;
}

function comparable(payload: BrandKeymapPayload) {
  return { ...payload, generatedAt: '' };
}

async function loadGlossaryConcepts(root: string): Promise<GlossaryConceptLite[]> {
  const path = `${root}/${DOMAIN_GLOSSARY_PATH}`;
  if (!(await Bun.file(path).exists())) return [];
  const payload = (await Bun.file(path).json()) as {
    concepts?: GlossaryConceptLite[];
  };
  return Array.isArray(payload.concepts) ? payload.concepts : [];
}

async function main(): Promise<void> {
  const root = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
  const manifest = (await Bun.file(
    `${root}/lib/types/brand-manifest.json`
  ).json()) as BrandManifest;
  const [files, projectRoots, glossaryConcepts] = await Promise.all([
    loadBrandConsumerFiles(root),
    loadProjectRoots(root),
    loadGlossaryConcepts(root),
  ]);
  const payload = buildBrandKeymap(manifest, files, projectRoots, undefined, glossaryConcepts);
  const target = `${root}/${BRAND_KEYMAP_PATH}`;

  if (Bun.argv.includes('--check')) {
    if (!(await Bun.file(target).exists())) {
      console.error(`❌ missing ${BRAND_KEYMAP_PATH}; run bun tools/brand-keymap.ts`);
      process.exit(1);
    }
    const current = (await Bun.file(target).json()) as BrandKeymapPayload;
    if (JSON.stringify(comparable(current)) !== JSON.stringify(comparable(payload))) {
      console.error(`❌ ${BRAND_KEYMAP_PATH} is stale; run bun tools/brand-keymap.ts`);
      process.exit(1);
    }
    console.info(
      `✅ brand keymap current (${payload.summary.brands} brands · ` +
        `${payload.summary.trackedProjects} tracked projects · ` +
        `${payload.summary.glossaryLinked} glossary-linked)`
    );
    return;
  }

  await Bun.write(target, `${JSON.stringify(payload, null, 2)}\n`);
  console.info(
    `✅ wrote ${BRAND_KEYMAP_PATH} (${payload.summary.brands} brands · ` +
      `${payload.summary.trackedProjects} tracked projects · ` +
      `${payload.summary.glossaryLinked} glossary-linked)`
  );
}

if (import.meta.main) {
  await main();
}
