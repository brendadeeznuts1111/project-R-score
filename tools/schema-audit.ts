#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io — Bun.file / Bun.write
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * Schema audit — scrape-wire registries × desk column values × book vendor aliases.
 *
 * Maintained alongside glossary (`glossary:portal`) and portal semantic vocabulary
 * (limits desk column registry / `ops.limits.*`).
 *
 *   bun run schema:audit
 *   bun run schema:audit --json
 *   bun run schema:audit --write   # → public/registry/scrape-wire-schema-audit.json
 *
 * Checks:
 * - Every sport referenced by a league exists
 * - Every league used on the desk is in the league registry
 * - Desk sport / market / competition / phase ⊆ scrape-wire keys
 * - Per-sportsbook vendor alias maps cover the US top-10 fleet
 */
import { joinPath } from '../lib/path-bun.ts';
import {
  PORTAL_SEMANTIC_CONCEPTS,
  type PortalSemanticConceptKey,
} from '../lib/portal/semantic-vocabulary.ts';
import {
  auditScrapeWireSchema,
  type DeskColumnValues,
} from '../lib/operations/scrapers/scrape-wire-audit.ts';
import { cliOut } from '../lib/console/index.ts';
import {
  applyUnknownLongOptionGuardFor,
  SCHEMA_AUDIT_ALLOWED_LONG,
} from '../lib/docs/ref-id-tool-flags.ts';

export { SCHEMA_AUDIT_ALLOWED_LONG };

const root = joinPath(import.meta.dir, '..');
const outPath = joinPath(root, 'public', 'registry', 'scrape-wire-schema-audit.json');
const argv = applyUnknownLongOptionGuardFor('schema:audit', Bun.argv.slice(2));
const jsonMode = argv.includes('--json') || argv.includes('--json-only');
const write = argv.includes('--write');

function deskValues(conceptId: PortalSemanticConceptKey): readonly string[] {
  const concept = PORTAL_SEMANTIC_CONCEPTS.find(c => c.id === conceptId);
  return concept?.values ?? [];
}

const desk: DeskColumnValues = {
  sports: deskValues('ops.limits.sport'),
  leagues: deskValues('ops.limits.league'),
  competitions: deskValues('ops.limits.competition'),
  markets: deskValues('ops.limits.market_type'),
  phases: deskValues('ops.limits.market_phase'),
};

const report = auditScrapeWireSchema(desk);

if (write) {
  await Bun.write(outPath, `${JSON.stringify(report, null, 2)}\n`);
}

if (jsonMode) {
  cliOut(report, { json: true });
} else {
  const { summary, issues, bookVendorAliases } = report;
  console.info(
    `${report.ok ? '✅' : '❌'} schema:audit — ${summary.errors} errors · ${summary.warnings} warnings`
  );
  console.info(
    `   sports ${summary.sports} · leagues ${summary.leagues} · competitions ${summary.competitions} · books ${summary.books}`
  );
  console.info(
    `   desk sports ${summary.deskSports} · desk leagues ${summary.deskLeagues} · vendor alias maps ${bookVendorAliases.length}`
  );
  for (const item of issues) {
    const mark = item.severity === 'error' ? '✗' : '⚠';
    console.info(`   ${mark} [${item.code}] ${item.message}${item.path ? ` (${item.path})` : ''}`);
  }
  if (write) console.info(`   wrote ${outPath}`);
  console.info(
    '   SSOT: scrape-wire-taxonomy · domain-glossary · ops.limits.* semantic vocabulary'
  );
}

process.exit(report.ok ? 0 : 1);
