#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/reference/bun/argv — Bun.argv
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
  kind: 'id' | 'key' | 'code';
  module: string;
  constructors: {
    as: string;
    try: string;
    parse: string;
  };
  validation:
    | {
        shape: 'nonblank';
        ingressNormalization: 'trim';
      }
    | {
        shape: 'pattern';
        pattern: string;
        flags?: string;
        ingressNormalization: 'trim' | 'trim-uppercase';
      };
  guard: string;
  tiers: string[];
  mint: string[];
  description: string;
};

type Manifest = {
  version: 3;
  brandCount: number;
  domainCount: number;
  domains: string[];
  kinds: Record<'id' | 'key' | 'code', number>;
  brands: Brand[];
  constructorTiers: Record<string, string>;
  emptyPolicy: string;
  provenance: string;
};

async function load(): Promise<Manifest> {
  const manifest = JSON.parse(await Bun.file(MANIFEST).text()) as Manifest;
  if (manifest.version !== 3 || !Array.isArray(manifest.brands)) {
    throw new Error('brand-manifest.json schema is stale — run: bun tools/brand-manifest.ts');
  }
  return manifest;
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
    console.info(`    guard: ${b.guard}`);
    console.info(`    ${b.description}`);
    console.info('');
  }
  console.info(`  import: ${brands[0]!.module}`);
  console.info(`  or:     lib/types/branded.ts`);
  if (domain === 'surfaces') {
    console.info('');
    console.info('  helpers (format-aware compose/split):');
    console.info('    accessDomainFromHost(host, path?)');
    console.info('    hostIdFromAccessDomain / pathFromAccessDomain / isPathScopedAccessDomain');
    console.info(
      '    hostIdFromUrl / tryHostIdFromUrl / httpsUrlForHost / httpsUrlForAccessDomain'
    );
    console.info('  inventory: lib/surfaces/inventory.ts (loadSurfacesInventory)');
  }
  console.info('');
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
  console.info(`  kind: ${b.kind}`);
  console.info(`  tiers: ${b.constructors.as} · ${b.constructors.try} · ${b.constructors.parse}`);
  console.info(
    `  validation: ${b.validation.shape}` +
      (b.validation.shape === 'pattern' ? ` /${b.validation.pattern}/` : '') +
      ` · ingress ${b.validation.ingressNormalization}`
  );
  console.info(`  guard: ${b.guard}`);
  console.info(`  mint authority: ${b.mint.join(', ')}`);
  console.info(`  module: ${b.module}\n`);
}

function printIndex(m: Manifest, asJson: boolean): void {
  if (asJson) {
    process.stdout.write(
      `${JSON.stringify(
        {
          brandCount: m.brandCount,
          domainCount: m.domainCount,
          kinds: m.kinds,
          domains: m.domains,
          brands: m.brands.map(b => ({
            name: b.name,
            domain: b.domain,
            kind: b.kind,
            constructors: b.constructors,
            validation: b.validation,
            guard: b.guard,
          })),
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
  console.info(
    `\n🏷️  Brand catalog — ${m.brandCount} values · ${m.domainCount} domains ` +
      `(${m.kinds.id} ids · ${m.kinds.key} key · ${m.kinds.code} codes)\n`
  );
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
  const domain = m.domains.find(candidate => candidate.toLowerCase() === query.toLowerCase());
  if (domain) {
    printDomain(m, domain, asJson);
    return;
  }
  printBrand(m, query, asJson);
}

if (import.meta.main) {
  await main();
}
