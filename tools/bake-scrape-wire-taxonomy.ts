#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-deepequals — Bun.deepEquals
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Bake / check scrape-wire-taxonomy.json (state · sport · market SSOT for Tier 4).
 *
 *   bun run bake:scrape-wire-taxonomy
 *   bun run bake:scrape-wire-taxonomy:check
 */
import { joinPath } from '../lib/path-bun.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('bake:scrape-wire-taxonomy', Bun.argv.slice(2))
  : Bun.argv.slice(2);
import {
  buildScrapeWireTaxonomyArtifact,
  SCRAPE_WIRE_TAXONOMY_PATH,
} from '../lib/operations/scrapers/scrape-wire-taxonomy.ts';

const root = joinPath(import.meta.dir, '..');
const outPath = joinPath(root, 'public', 'registry', 'scrape-wire-taxonomy.json');
const check = argv.includes('--check');

const artifact = buildScrapeWireTaxonomyArtifact();

if (check) {
  const existing = await Bun.file(outPath).json();
  const { generatedAt: _a, ...stableNew } = artifact;
  const { generatedAt: _b, ...stableOld } = existing as typeof artifact;
  if (!Bun.deepEquals(stableNew, stableOld, true)) {
    console.error(
      `❌ ${SCRAPE_WIRE_TAXONOMY_PATH} is stale; run bun run bake:scrape-wire-taxonomy`
    );
    process.exit(1);
  }
  console.info(
    `✅ scrape-wire-taxonomy current (${artifact.summary.books} books · ${artifact.summary.sports} sports · ${artifact.summary.markets} markets · ${artifact.summary.phases} phases · ${artifact.summary.states} states)`
  );
  process.exit(0);
}

await Bun.write(outPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.info(
  `✅ wrote ${SCRAPE_WIRE_TAXONOMY_PATH} (${artifact.summary.books} books · ${artifact.summary.sports} sports · ${artifact.summary.markets} markets · ${artifact.summary.phases} phases · ${artifact.summary.states} states · ${artifact.summary.glossaryConcepts} glossary concepts)`
);
