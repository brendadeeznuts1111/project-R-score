#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/api/sqlite — bun:sqlite
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io — Bun.file
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Sync the portal semantic vocabulary into the local concept registry DB.
 *
 *   bun run concept:registry:sync            # create/refresh data/concept-registry.db
 *   bun run concept:registry:sync -- --check # verify table + row count, exit 1 on drift
 *   bun run concept:registry:sync -- --json
 *
 * The DB is a gitignored runtime projection (data/), rebuilt from the
 * vocabulary SSOT — never edit it by hand.
 */
import { Database } from 'bun:sqlite';
// eslint-disable-next-line no-restricted-imports -- Bun has no mkdirSync for arbitrary paths
import { mkdirSync } from 'node:fs';
import { dirnamePath } from '../lib/path-bun.ts';
import { colorize, jsonOut, logTable } from '../lib/console-depth.ts';
import { countPortalConceptUsages } from '../lib/portal/concept-usage.ts';
import { PORTAL_SEMANTIC_CONCEPTS } from '../lib/portal/semantic-vocabulary.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('concept:registry:sync', Bun.argv.slice(2))
  : Bun.argv.slice(2);
export const REGISTRY_DB_PATH = `${import.meta.dir}/../data/concept-registry.db`;

export type ConceptRegistryRow = {
  id: string; // brand-ok — glossary concept key
  label: string;
  domain: string; // brand-ok — vocabulary domain key
  status: string;
  correlation_id: string; // brand-ok — provenance work-item ref
  added_at: string;
  usage_total: number;
  synced_at: string;
};

const DDL = `
CREATE TABLE IF NOT EXISTS concept_registry (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  domain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  correlation_id TEXT NOT NULL DEFAULT '',
  added_at TEXT NOT NULL DEFAULT '',
  usage_total INTEGER NOT NULL DEFAULT 0,
  synced_at TEXT NOT NULL
)`;

export function ensureSchema(db: Database): void {
  db.exec('PRAGMA journal_mode = WAL');
  db.exec(DDL);
}

function conceptField(concept: (typeof PORTAL_SEMANTIC_CONCEPTS)[number], key: string): string {
  return key in concept && typeof concept[key as keyof typeof concept] === 'string'
    ? String(concept[key as keyof typeof concept])
    : '';
}

/** Upsert every vocabulary concept; returns row count. */
export function syncConceptRegistry(
  db: Database,
  usageCounts: Map<string, number>,
  now = new Date().toISOString()
): number {
  ensureSchema(db);
  const upsert = db.prepare(
    `INSERT INTO concept_registry
       (id, label, domain, status, correlation_id, added_at, usage_total, synced_at)
     VALUES ($id, $label, $domain, $status, $correlation_id, $added_at, $usage_total, $synced_at)
     ON CONFLICT(id) DO UPDATE SET
       label = $label, domain = $domain, status = $status,
       correlation_id = $correlation_id, added_at = $added_at,
       usage_total = $usage_total, synced_at = $synced_at`
  );
  const run = db.transaction(() => {
    for (const concept of PORTAL_SEMANTIC_CONCEPTS) {
      upsert.run({
        $id: concept.id,
        $label: concept.label,
        $domain: conceptField(concept, 'domain') || (concept.id.split('.')[0] ?? ''),
        $status: conceptField(concept, 'status') || 'active',
        $correlation_id: conceptField(concept, 'correlationId'),
        $added_at: conceptField(concept, 'addedAt'),
        $usage_total: usageCounts.get(concept.id) ?? 0,
        $synced_at: now,
      });
    }
  });
  run();
  const row = db.query('SELECT COUNT(*) AS n FROM concept_registry').get() as { n: number };
  return row.n;
}

export function checkConceptRegistry(
  db: Database,
  expected: number
): { ok: boolean; rows: number } {
  const table = db
    .query("SELECT name FROM sqlite_master WHERE type='table' AND name='concept_registry'")
    .get();
  if (!table) return { ok: false, rows: 0 };
  const row = db.query('SELECT COUNT(*) AS n FROM concept_registry').get() as { n: number };
  return { ok: row.n === expected, rows: row.n };
}

async function main(): Promise<void> {
  const check = argv.includes('--check');
  const wantJson = argv.includes('--json');

  mkdirSync(dirnamePath(REGISTRY_DB_PATH), { recursive: true });
  const db = new Database(REGISTRY_DB_PATH);
  try {
    if (check) {
      const result = checkConceptRegistry(db, PORTAL_SEMANTIC_CONCEPTS.length);
      if (wantJson) {
        jsonOut({ ...result, expected: PORTAL_SEMANTIC_CONCEPTS.length, path: REGISTRY_DB_PATH });
      } else if (result.ok) {
        console.log(colorize(`✅ concept registry current (${result.rows} rows)`, '#3fb950'));
      } else {
        console.error(
          colorize(
            `❌ concept registry drift (${result.rows}/${PORTAL_SEMANTIC_CONCEPTS.length} rows) — run bun run concept:registry:sync`,
            '#f85149'
          )
        );
      }
      if (!result.ok) process.exit(1);
      return;
    }

    const usage = await countPortalConceptUsages();
    const rows = syncConceptRegistry(db, usage);
    if (wantJson) {
      jsonOut({ ok: true, rows, path: REGISTRY_DB_PATH });
    } else {
      logTable([{ rows, path: REGISTRY_DB_PATH }], ['rows', 'path']);
      console.log(colorize(`✅ concept registry synced (${rows} rows)`, '#3fb950'));
    }
  } finally {
    db.close();
  }
}

if (import.meta.main) {
  await main();
}
