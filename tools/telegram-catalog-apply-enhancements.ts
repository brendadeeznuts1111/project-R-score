#!/usr/bin/env bun
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
/**
 * Apply catalog-enhancements.json → catalog-overrides.json + regenerate handshake catalog.
 *
 *   bun run telegram:catalog:apply-enhancements
 *   bun run telegram:catalog:apply-enhancements --dry-run
 *   bun run telegram:catalog:apply-enhancements --all   # include non-safe (manual review)
 */
import { applyCatalogEnhancements } from '../lib/telegram/catalog-research/apply.ts';

const argv = Bun.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const all = argv.includes('--all');

const result = await applyCatalogEnhancements({
  safeOnly: !all,
  dryRun,
});

console.log(`${dryRun ? 'dry-run · ' : ''}applied=${result.applied} skipped=${result.skipped}`);
if (result.appliedIds.length) {
  console.log('Applied ids:');
  for (const id of result.appliedIds) console.log(`  ${id}`);
}
if (result.overridesPath) console.log(`overrides: ${result.overridesPath}`);
if (result.catalogPath) console.log(`catalog: ${result.catalogPath}`);

process.exit(result.applied > 0 || dryRun || result.skipped > 0 ? 0 : 1);
