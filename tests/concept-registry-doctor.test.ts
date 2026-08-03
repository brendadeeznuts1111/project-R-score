// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
import { describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';

import {
  REQUIRED_REGISTRY_TABLES,
  checkRequiredTables,
  collectConceptStats,
  ensureConceptRegistrySchema,
  formatDoctorReport,
  proposeForReview,
  runConceptRegistryDoctor,
  seedFromSemanticVocabulary,
} from '../lib/concept-registry/index.ts';

function memDb(): Database {
  const db = new Database(':memory:');
  ensureConceptRegistrySchema(db);
  return db;
}

describe('concept-registry doctor', () => {
  test('REQUIRED_REGISTRY_TABLES matches real schema names (not concept_registry)', () => {
    expect(REQUIRED_REGISTRY_TABLES).toContain('concepts');
    expect(REQUIRED_REGISTRY_TABLES).toContain('concept_proposals');
    expect(REQUIRED_REGISTRY_TABLES).toContain('concept_health');
    expect(REQUIRED_REGISTRY_TABLES).not.toContain('concept_registry');
  });

  test('checkRequiredTables passes on fresh schema', () => {
    const db = memDb();
    const r = checkRequiredTables(db);
    expect(r.ok).toBe(true);
    expect(r.missing).toEqual([]);
  });

  test('collectConceptStats groups by status and domain', () => {
    const db = memDb();
    proposeForReview(db, {
      id: 'accounting.demo',
      label: 'Demo',
      domain: 'accounting',
      asDraft: true,
    });
    proposeForReview(db, {
      id: 'ops.metric.x',
      label: 'X',
      domain: 'partners',
    });
    const stats = collectConceptStats(db);
    expect(stats.total).toBe(2);
    expect(stats.byStatus.draft).toBe(1);
    expect(stats.byStatus.proposed).toBe(1);
    expect(stats.domains.accounting).toBe(1);
    expect(stats.domains.partners).toBe(1);
  });

  test('runConceptRegistryDoctor with injected DB is ok', async () => {
    const db = memDb();
    seedFromSemanticVocabulary(db, 'test');
    const report = await runConceptRegistryDoctor({
      db,
      checkApi: false,
      ensureSchema: false,
    });
    expect(report.ok).toBe(true);
    expect(report.conceptStats.total).toBeGreaterThan(20);
    expect(report.checks.find(c => c.id === 'db-schema')?.ok).toBe(true);
    expect(report.checks.find(c => c.id === 'cli-surface')?.ok).toBe(true);
    expect(report.api.checked).toBe(false);

    const text = formatDoctorReport(report);
    expect(text).toContain('Concept Registry Health Check');
    expect(text).toContain('Core systems ready');
  });
});
