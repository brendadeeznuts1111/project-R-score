// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/api/sqlite — bun:sqlite
import { afterEach, describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';

import { PORTAL_SEMANTIC_CONCEPTS } from '../lib/portal/semantic-vocabulary.ts';
import {
  checkConceptRegistry,
  ensureSchema,
  syncConceptRegistry,
} from '../scripts/concept-registry-db.ts';

const dbs: Database[] = [];

function tempDb(): Database {
  const db = new Database(':memory:');
  dbs.push(db);
  return db;
}

afterEach(() => {
  while (dbs.length > 0) dbs.pop()?.close();
});

describe('concept-registry-db', () => {
  test('ensureSchema creates concept_registry table (WAL)', () => {
    const db = tempDb();
    ensureSchema(db);
    const tables = db
      .query("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as Array<{ name: string }>;
    expect(tables.some(t => t.name === 'concept_registry')).toBe(true);
  });

  test('sync upserts every vocabulary concept with usage', () => {
    const db = tempDb();
    const usage = new Map<string, number>([['ui.semantic.surface', 7]]);
    const rows = syncConceptRegistry(db, usage, '2026-08-03T00:00:00.000Z');
    expect(rows).toBe(PORTAL_SEMANTIC_CONCEPTS.length);
    const row = db
      .query('SELECT * FROM concept_registry WHERE id = $id')
      .get({ $id: 'ui.semantic.surface' }) as {
      domain: string;
      status: string;
      usage_total: number;
      synced_at: string;
    };
    const source = PORTAL_SEMANTIC_CONCEPTS.find(c => c.id === 'ui.semantic.surface');
    expect(row.domain).toBe(
      source && 'domain' in source && typeof source.domain === 'string' ? source.domain : 'ui'
    );
    expect(row.status).toBe('active');
    expect(row.usage_total).toBe(7);
    expect(row.synced_at).toBe('2026-08-03T00:00:00.000Z');
  });

  test('re-sync updates in place (idempotent row count)', () => {
    const db = tempDb();
    syncConceptRegistry(db, new Map());
    syncConceptRegistry(db, new Map([['ui.semantic.surface', 99]]));
    const row = db
      .query('SELECT usage_total FROM concept_registry WHERE id = $id')
      .get({ $id: 'ui.semantic.surface' }) as { usage_total: number };
    expect(row.usage_total).toBe(99);
    const count = db.query('SELECT COUNT(*) AS n FROM concept_registry').get() as { n: number };
    expect(count.n).toBe(PORTAL_SEMANTIC_CONCEPTS.length);
  });

  test('check fails on missing table and on drift', () => {
    const db = tempDb();
    expect(checkConceptRegistry(db, PORTAL_SEMANTIC_CONCEPTS.length)).toEqual({
      ok: false,
      rows: 0,
    });
    syncConceptRegistry(db, new Map());
    expect(checkConceptRegistry(db, PORTAL_SEMANTIC_CONCEPTS.length).ok).toBe(true);
    expect(checkConceptRegistry(db, PORTAL_SEMANTIC_CONCEPTS.length + 1).ok).toBe(false);
  });
});
