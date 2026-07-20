#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io — Bun.file
/**
 * brand-catalog.ts — just-in-time brand discovery for agents and humans.
 *
 * Reads lib/types/brand-manifest.json (no TypeScript parse required).
 *
 * Usage:
 *   bun tools/brand-catalog.ts              # list all domains + brand counts
 *   bun tools/brand-catalog.ts session      # brands in domain
 *   bun tools/brand-catalog.ts SessionId    # one brand (tiers, mint, description)
 *   bun tools/brand-catalog.ts --json
 *   bun tools/brand-catalog.ts identity --json
 */

const MANIFEST = new URL('../lib/types/brand-manifest.json', import.meta.url).pathname;

type Brand = {
  name: string;
  domain: string;
  tiers: string[];
  mint: string[];
  description: string;
};

type Manifest = {
  brandCount: number;
  domains: string[];
  brands: Brand[];
  constructorTiers: Record<string, string>;
  emptyPolicy: string;
  provenance: string;
};

async function load(): Promise<Manifest> {
  return JSON.parse(await Bun.file(MANIFEST).text()) as Manifest;
}

function printDomain(m: Manifest, domain: string, asJson: boolean): void {
  const brands = m.brands.filter(b => b.domain === domain);
  if (brands.length === 0) {
    console.error(`Unknown domain: ${domain}`);
    console.error(`Known: ${m.domains.join(', ')}`);
    process.exit(1);
  }
  if (asJson) {
    process.stdout.write(`${JSON.stringify({ domain, brands }, null, 2)}\n`);
    return;
  }
  console.info(`\n📦 domain: ${domain} (${brands.length} brands)\n`);
  for (const b of brands) {
    console.info(`  ${b.name}`);
    console.info(`    tiers: ${b.tiers.join(' · ')}`);
    console.info(`    mint:  ${b.mint.join(' · ')}`);
    console.info(`    ${b.description}`);
    console.info('');
  }
  console.info(`  import: lib/types/branded/${domain === 'documents' ? 'documents' : domain}.ts`);
  console.info(`  or:     lib/types/branded.ts\n`);
}

function printBrand(m: Manifest, name: string, asJson: boolean): void {
  const b = m.brands.find(x => x.name.toLowerCase() === name.toLowerCase());
  if (!b) {
    console.error(`Unknown brand: ${name}`);
    process.exit(1);
  }
  if (asJson) {
    process.stdout.write(`${JSON.stringify(b, null, 2)}\n`);
    return;
  }
  console.info(`\n🏷️  ${b.name}  [${b.domain}]\n`);
  console.info(`  ${b.description}`);
  console.info(
    `  tiers: as${b.name.replace(/Id$/, '')}Id · try* · parse*  (${b.tiers.join(', ')})`
  );
  console.info(`  mint authority: ${b.mint.join(', ')}`);
  console.info(`  constructors: as${b.name} / try${b.name} / parse${b.name}`);
  console.info(
    `  module: lib/types/branded/${b.domain === 'documents' ? 'documents' : b.domain}.ts\n`
  );
}

function printIndex(m: Manifest, asJson: boolean): void {
  if (asJson) {
    process.stdout.write(
      `${JSON.stringify(
        {
          brandCount: m.brandCount,
          domains: m.domains,
          brands: m.brands.map(b => ({ name: b.name, domain: b.domain })),
          constructorTiers: m.constructorTiers,
          emptyPolicy: m.emptyPolicy,
          provenance: m.provenance,
        },
        null,
        2
      )}\n`
    );
    return;
  }
  console.info(`\n🏷️  Brand catalog — ${m.brandCount} brands · ${m.domains.length} domains\n`);
  console.info(`  ${m.emptyPolicy}`);
  console.info(`  ${m.provenance}\n`);
  for (const d of m.domains) {
    const brands = m.brands.filter(b => b.domain === d);
    console.info(`  ${d.padEnd(12)} ${brands.map(b => b.name).join(' · ')}`);
  }
  console.info(`\n  detail:  bun tools/brand-catalog.ts <domain|BrandName>`);
  console.info(`  json:    bun tools/brand-catalog.ts --json`);
  console.info(`  refresh: bun tools/brand-manifest.ts\n`);
}

async function main(): Promise<void> {
  const args = Bun.argv.slice(2).filter(a => a !== '--');
  const asJson = args.includes('--json');
  const query = args.find(a => !a.startsWith('--'));
  const m = await load();

  if (!query) {
    printIndex(m, asJson);
    return;
  }
  if (m.domains.includes(query)) {
    printDomain(m, query, asJson);
    return;
  }
  printBrand(m, query, asJson);
}

if (import.meta.main) {
  await main();
}
