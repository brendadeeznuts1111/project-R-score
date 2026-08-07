#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// scripts/concept-registry-sync.ts — Auto-sync with code (Phase 2).
//
//   bun run concept:registry:usage-sync                       # table report
//   bun run concept:registry:usage-sync -- --fail-on-orphans  # exit 1 when code uses keys missing from the glossary
//   bun run concept:registry:usage-sync -- --output json
//   bun run concept:registry:usage-sync -- --min-unused-days 30
//
// Scans public/portal HTML for `data-glossary-concept` attributes, upserts
// concept_usage rows, and reports:
//   · orphan usage — literal keys used in code but missing from the glossary
//   · unused candidates — active/deprecated concepts with no (or stale) usage
//     (default cutoff 90 days, per the auto-sync alert spec)

import { colorize, jsonOut, logTable } from '../lib/console-depth.ts';
import { migrateConceptRegistry } from '../lib/concept-registry/migrate.ts';
import {
  findOrphanUsage,
  syncConceptUsage,
  unusedConceptCandidates,
} from '../lib/concept-registry/repo.ts';
import { openConceptRegistryDb } from '../lib/concept-registry/schema.ts';
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('concept:registry:usage-sync', Bun.argv.slice(2))
  : Bun.argv.slice(2);
function argValue(argv: readonly string[], flag: string): string | undefined {
  const eq = argv.find(a => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const i = argv.indexOf(flag);
  if (i !== -1) return argv[i + 1];
  return undefined;
}

const dbPath = Bun.env.CONCEPT_REGISTRY_DB ?? 'data/concept-registry.db';
const db = openConceptRegistryDb(dbPath);

const minUnusedDays = Number(argValue(Bun.argv, '--min-unused-days') ?? '90');
const failOnOrphans = argv.includes('--fail-on-orphans');
const outputJson = argv.includes('--output') && argValue(Bun.argv, '--output') === 'json';

await migrateConceptRegistry(db, { scanUsage: false });
const report = await syncConceptUsage(db);
const persistedOrphans = findOrphanUsage(db);
const unused = unusedConceptCandidates(db, minUnusedDays);

if (outputJson) {
  jsonOut({ ...report, persistedOrphans, unusedCandidates: unused, minUnusedDays });
} else {
  logTable(
    [
      {
        files: report.scannedFiles,
        usageRows: report.usageRows,
        orphans: report.orphanUsage.length,
        persistedOrphans: persistedOrphans.length,
        unusedCandidates: unused.length,
        minUnusedDays,
      },
    ],
    ['files', 'usageRows', 'orphans', 'persistedOrphans', 'unusedCandidates', 'minUnusedDays']
  );

  for (const orphan of report.orphanUsage.slice(0, 10)) {
    console.error(
      colorize(
        `  ✗ orphan usage · ${orphan.key} ×${orphan.totalCount} — used in code, missing from glossary`,
        '#f85149'
      )
    );
  }
  if (report.orphanUsage.length === 0) {
    console.log(
      colorize('orphan usage · 0 — every literal key resolves in the glossary', '#3fb950')
    );
  }
  if (unused.length > 0) {
    console.log(
      colorize(
        `unused candidates (${minUnusedDays}d) · ${unused.length} — ${unused
          .slice(0, 8)
          .map(c => c.id)
          .join(', ')}${unused.length > 8 ? ' …' : ''}`,
        '#8b949e'
      )
    );
  }
}

if (failOnOrphans && (report.orphanUsage.length > 0 || persistedOrphans.length > 0)) {
  console.error(
    colorize(
      `concept:registry:usage-sync · FAIL — ${report.orphanUsage.length} current + ${persistedOrphans.length} persisted orphan usage key(s)`,
      '#f85149'
    )
  );
  process.exit(1);
}
if (!outputJson) {
  console.log(colorize(`concept:registry:usage-sync · OK · db=${dbPath}`, '#3fb950'));
}
