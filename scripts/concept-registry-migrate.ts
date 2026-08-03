#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// scripts/concept-registry-migrate.ts — seed/refresh the Concept Registry DB.
//
//   bun run concept:registry:migrate
//
// Idempotent: re-running merges bake/vocabulary changes and bumps version
// snapshots only when a row's fields actually changed.

import { colorize, logTable } from '../lib/console-depth.ts';
import { migrateConceptRegistry } from '../lib/concept-registry/migrate.ts';
import { openConceptRegistryDb } from '../lib/concept-registry/schema.ts';

const dbPath = Bun.env.CONCEPT_REGISTRY_DB ?? 'data/concept-registry.db';
const db = openConceptRegistryDb(dbPath);
const summary = await migrateConceptRegistry(db);

logTable(
  [
    {
      concepts: summary.total,
      inserted: summary.inserted,
      updated: summary.updated,
      usageRows: summary.usageRows,
      provenanceRows: summary.provenanceRows,
    },
  ],
  ['concepts', 'inserted', 'updated', 'usageRows', 'provenanceRows']
);

if (summary.total === 0) {
  console.error(colorize('concept:registry:migrate · FAIL — 0 concepts migrated', '#f85149'));
  process.exit(1);
}
console.log(colorize(`concept:registry:migrate · OK · db=${dbPath}`, '#3fb950'));
