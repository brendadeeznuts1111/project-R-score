#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io — Bun.file / Bun.write
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * Bake the reader-facing branded-value glossary and project adoption map.
 *
 * Source of truth stays in BRAND_CATALOG + generated brand-manifest.json.
 * This artifact joins that contract with tracked consumer coverage so the
 * portal can explain both the vocabulary and the remaining adoption work.
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

export const BRAND_KEYMAP_PATH = 'public/registry/brand-keymap.json';
export const BRAND_KEYMAP_URL = '/registry/brand-keymap.json';

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

export type BrandKeymapPayload = ReturnType<typeof buildBrandKeymap>;

function boundedFiles(files: readonly string[]): string[] {
  return files.slice(0, 12);
}

export function buildBrandKeymap(
  manifest: BrandManifest,
  files: readonly BrandCoverageFile[],
  projectRoots: readonly string[],
  generatedAt = new Date().toISOString()
) {
  const coverage = analyzeBrandCoverage(files);
  const coverageByName = new Map(coverage.map(row => [row.name, row]));
  const projects = analyzeProjectBrandAdoption(files, projectRoots);
  const trackedProjects = projects.filter(project => project.status !== 'external-or-untracked');
  const adoptedProjects = projects.filter(project =>
    ['adopted', 'local-pattern'].includes(project.status)
  );

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
    domains: manifest.domainCatalog,
    brands: manifest.brands.map(brand => {
      const row = coverageByName.get(brand.name as (typeof coverage)[number]['name']);
      if (!row) throw new Error(`Missing coverage row for ${brand.name}`);
      return {
        ...brand,
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

async function main(): Promise<void> {
  const root = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
  const manifest = (await Bun.file(
    `${root}/lib/types/brand-manifest.json`
  ).json()) as BrandManifest;
  const [files, projectRoots] = await Promise.all([
    loadBrandConsumerFiles(root),
    loadProjectRoots(root),
  ]);
  const payload = buildBrandKeymap(manifest, files, projectRoots);
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
        `${payload.summary.trackedProjects} tracked projects)`
    );
    return;
  }

  await Bun.write(target, `${JSON.stringify(payload, null, 2)}\n`);
  console.info(
    `✅ wrote ${BRAND_KEYMAP_PATH} (${payload.summary.brands} brands · ` +
      `${payload.summary.trackedProjects} tracked projects)`
  );
}

if (import.meta.main) {
  await main();
}
