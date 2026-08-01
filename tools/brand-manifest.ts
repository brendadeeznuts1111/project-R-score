#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io — Bun.file / Bun.write
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * brand-manifest.ts — living institutional record for branded IDs.
 *
 * Generates lib/types/brand-manifest.json from BRAND_CATALOG (TypeScript SSOT).
 *
 * Usage:
 *   bun tools/brand-manifest.ts           # write manifest
 *   bun tools/brand-manifest.ts --check   # exit 1 if stale
 *   bun tools/brand-manifest.ts --json    # print to stdout only
 */

import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import {
  BRAND_CATALOG,
  brandKindFromName,
  constructorNamesForBrand,
  validationForBrand,
  type BrandDomain,
  type BrandKind,
  type BrandSpec,
} from '../lib/types/branded/index.ts';

const MANIFEST_PATH = new URL('../lib/types/brand-manifest.json', import.meta.url).pathname;

/**
 * Derive wire/field short forms from a brand name (data-mapping aliases):
 * `shortName` camelCase for struct/field positions (SessionId → sessionId),
 * `envName` SCREAMING_SNAKE for env-var and flat-key positions
 * (SessionId → SESSION_ID, PartnerProfileKey → PARTNER_PROFILE_KEY).
 * Handles acronym runs (AccessDomainId → ACCESS_DOMAIN_ID).
 */
export function shortFormsForBrand(name: string): { shortName: string; envName: string } {
  const envName = name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toUpperCase();
  return { shortName: name.charAt(0).toLowerCase() + name.slice(1), envName };
}

type Manifest = {
  version: 3;
  generatedAt: string;
  source: 'lib/types/branded/index.ts#BRAND_CATALOG';
  brandCount: number;
  domainCount: number;
  domains: BrandDomain[];
  kinds: Record<BrandKind, number>;
  domainCatalog: Array<{
    name: BrandDomain;
    module: string;
    brandCount: number;
  }>;
  brands: Array<
    BrandSpec & {
      kind: BrandKind;
      module: string;
      constructors: ReturnType<typeof constructorNamesForBrand>;
      validation: ReturnType<typeof validationForBrand>;
      guard: string;
      shortName: string;
      envName: string;
    }
  >;
  constructorTiers: {
    as: string;
    try: string;
    parse: string;
  };
  emptyPolicy: string;
  provenance: string;
};

function buildManifest(): Manifest {
  const domains = [...new Set(BRAND_CATALOG.map(b => b.domain))].sort() as BrandDomain[];
  const brands = BRAND_CATALOG.map(spec => ({
    ...spec,
    kind: brandKindFromName(spec.name),
    module: `lib/types/branded/${spec.domain}.ts`,
    constructors: constructorNamesForBrand(spec.name),
    validation: validationForBrand(spec),
    guard: `BRAND_GUARDS.is${spec.name}`,
    ...shortFormsForBrand(spec.name),
  }));
  return {
    version: 3,
    generatedAt: new Date().toISOString(),
    source: 'lib/types/branded/index.ts#BRAND_CATALOG',
    brandCount: BRAND_CATALOG.length,
    domainCount: domains.length,
    domains,
    kinds: {
      id: brands.filter(brand => brand.kind === 'id').length,
      key: brands.filter(brand => brand.kind === 'key').length,
      code: brands.filter(brand => brand.kind === 'code').length,
    },
    domainCatalog: domains.map(name => ({
      name,
      module: `lib/types/branded/${name}.ts`,
      brandCount: brands.filter(brand => brand.domain === name).length,
    })),
    brands,
    constructorTiers: {
      as: 'Hard mint from string; throws BrandValidationError if blank or invalid',
      try: 'Soft mint; blank/missing → undefined (never forge empty brand)',
      parse: 'Wire/unknown ingress; fail-closed throw',
    },
    emptyPolicy: 'Missing branded values are undefined or throw — never empty-string brands',
    provenance: 'Set BRAND_PROVENANCE=1 to log brand.mint events at as/parse',
  };
}

function stableJson(manifest: Manifest): string {
  // Drop generatedAt for --check equality
  const { generatedAt: _g, ...rest } = manifest;
  return `${JSON.stringify({ ...rest, generatedAt: '<stable>' }, null, 2)}\n`;
}

async function main(): Promise<void> {
  const args = Bun.argv.slice(2);
  const check = args.includes('--check');
  const jsonOnly = args.includes('--json');
  const manifest = buildManifest();
  const pretty = `${JSON.stringify(manifest, null, 2)}\n`;

  if (jsonOnly) {
    process.stdout.write(pretty);
    return;
  }

  if (check) {
    const existing = await Bun.file(MANIFEST_PATH)
      .text()
      .catch(() => '');
    let existingObj: Manifest | null = null;
    try {
      existingObj = existing ? (JSON.parse(existing) as Manifest) : null;
    } catch {
      existingObj = null;
    }
    const a = stableJson(manifest);
    const b = existingObj ? stableJson(existingObj) : '';
    if (a !== b) {
      console.error('❌ brand-manifest.json is stale — run: bun tools/brand-manifest.ts');
      process.exit(1);
    }
    console.info(`✅ brand-manifest.json up to date (${manifest.brandCount} brands)`);
    return;
  }

  await Bun.write(MANIFEST_PATH, pretty);
  console.info(
    `✅ wrote lib/types/brand-manifest.json (${manifest.brandCount} brands, domains: ${manifest.domains.join(', ')})`
  );
}

if (isModuleEntrypoint(import.meta)) {
  await main();
}
