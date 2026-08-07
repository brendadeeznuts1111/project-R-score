#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname — Bun.serve port/hostname
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// scripts/concept-registry-serve.ts — Concept Registry Service HTTP server.
//
//   bun run concept:registry:serve            # serve on CONCEPT_REGISTRY_PORT (8790)
//   bun run concept:registry:serve -- --no-scan   # migrate without the usage scan
//
// Opens data/concept-registry.db (gitignored), runs the Phase-1 migration
// (domain-glossary.json + semantic-vocabulary.ts + usage scan), then serves
// the API on 127.0.0.1.

import { PORTS } from '../config/ports.ts';
import { colorize, logTable } from '../lib/console-depth.ts';
import { conceptRegistryFetch } from '../lib/concept-registry/api.ts';
import { migrateConceptRegistry } from '../lib/concept-registry/migrate.ts';
import { openConceptRegistryDb } from '../lib/concept-registry/schema.ts';
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('concept:registry:serve', Bun.argv.slice(2))
  : Bun.argv.slice(2);

const port = PORTS.CONCEPT_REGISTRY;
const hostname = '127.0.0.1';
const dbPath = Bun.env.CONCEPT_REGISTRY_DB ?? 'data/concept-registry.db';

const db = openConceptRegistryDb(dbPath);
const scanUsage = !argv.includes('--no-scan');
const summary = await migrateConceptRegistry(db, { scanUsage });

logTable(
  [
    {
      concepts: summary.total,
      baked: summary.baked,
      inserted: summary.inserted,
      updated: summary.updated,
      usageRows: summary.usageRows,
    },
  ],
  ['concepts', 'baked', 'inserted', 'updated', 'usageRows']
);

const server = Bun.serve({
  port,
  hostname,
  fetch: conceptRegistryFetch(db),
});

console.log(
  colorize(
    `concept:registry:serve · http://${hostname}:${server.port}/api/concepts · db=${dbPath} · Ctrl-C to stop`,
    '#3fb950'
  )
);
