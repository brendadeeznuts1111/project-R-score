#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io — Bun.file / Bun.write
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

import { BRAND_CATALOG } from '../lib/types/branded/index.ts';

const MANIFEST_PATH = new URL('../lib/types/brand-manifest.json', import.meta.url).pathname;

type Manifest = {
  version: 1;
  generatedAt: string;
  source: 'lib/types/branded/ BRAND_CATALOG';
  brandCount: number;
  domains: string[];
  brands: typeof BRAND_CATALOG;
  constructorTiers: {
    as: string;
    try: string;
    parse: string;
  };
  emptyPolicy: string;
  provenance: string;
};

function buildManifest(): Manifest {
  const domains = [...new Set(BRAND_CATALOG.map(b => b.domain))].sort();
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: 'lib/types/branded/ BRAND_CATALOG',
    brandCount: BRAND_CATALOG.length,
    domains,
    brands: BRAND_CATALOG,
    constructorTiers: {
      as: 'Hard mint from string; throws BrandValidationError if empty',
      try: 'Soft mint; blank/missing → undefined (never forge empty brand)',
      parse: 'Wire/unknown ingress; fail-closed throw',
    },
    emptyPolicy: 'Missing IDs are undefined or throw — never empty-string brands',
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

if (import.meta.main) {
  await main();
}
