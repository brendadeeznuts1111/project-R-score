// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
import { describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';

import {
  approveConcept,
  archiveConcept,
  buildConceptGraph,
  createConceptRegistryFetch,
  deprecateConcept,
  ensureConceptRegistrySchema,
  getConcept,
  graphCentrality,
  graphOrphans,
  handleConceptRegistryRequest,
  listVersions,
  proposeConcept,
  seedFromSemanticVocabulary,
  upsertConcept,
} from '../lib/concept-registry/index.ts';

function memDb(): Database {
  const db = new Database(':memory:');
  ensureConceptRegistrySchema(db);
  return db;
}

describe('concept-registry repository', () => {
  test('propose → approve → deprecate → archive lifecycle', () => {
    const db = memDb();
    const proposed = proposeConcept(db, {
      id: 'accounting.batch_import',
      label: 'Batch Import',
      category: 'ops',
      group: 'accounting',
      summary: 'CSV/JSONL batch deposit import',
    });
    expect(proposed.status).toBe('proposed');
    expect(getConcept(db, 'accounting.batch_import')?.label).toBe('Batch Import');

    const active = approveConcept(db, 'accounting.batch_import', 'tester');
    expect(active.status).toBe('active');

    const deprecated = deprecateConcept(
      db,
      'accounting.batch_import',
      'accounting.deposit',
      'tester'
    );
    expect(deprecated.status).toBe('deprecated');
    expect(deprecated.deprecatedBy).toBe('accounting.deposit');

    const archived = archiveConcept(db, 'accounting.batch_import', 'tester', true);
    expect(archived.status).toBe('archived');

    const versions = listVersions(db, 'accounting.batch_import');
    expect(versions.length).toBeGreaterThanOrEqual(4);
  });

  test('refuse archive active without force', () => {
    const db = memDb();
    upsertConcept(db, {
      id: 'ui.semantic.demo',
      label: 'Demo',
      status: 'active',
    });
    expect(() => archiveConcept(db, 'ui.semantic.demo')).toThrow(/force/);
  });

  test('seedFromSemanticVocabulary loads portal concepts', () => {
    const db = memDb();
    const n = seedFromSemanticVocabulary(db, 'test');
    expect(n).toBeGreaterThan(20);
    expect(getConcept(db, 'ui.semantic.surface')?.status).toBe('active');
  });

  test('graph builds seeAlso edges and centrality', () => {
    const db = memDb();
    seedFromSemanticVocabulary(db, 'test');
    const graph = buildConceptGraph(db);
    expect(graph.nodes.length).toBeGreaterThan(10);
    expect(graph.edges.length).toBeGreaterThan(5);
    const top = graphCentrality(graph, 5);
    expect(top[0]!.degree).toBeGreaterThanOrEqual(top[top.length - 1]!.degree);
    const orphans = graphOrphans(graph);
    expect(Array.isArray(orphans)).toBe(true);
  });
});

describe('concept-registry API', () => {
  test('GET list + POST propose + PATCH approve', async () => {
    const db = memDb();
    seedFromSemanticVocabulary(db, 'test');

    const listRes = await handleConceptRegistryRequest(
      new Request('http://localhost/api/concepts?status=active&limit=10'),
      db
    );
    expect(listRes).not.toBeNull();
    const listBody = (await listRes!.json()) as {
      ok: boolean;
      count: number;
      concepts: unknown[];
    };
    expect(listBody.ok).toBe(true);
    expect(listBody.count).toBeGreaterThan(0);

    const proposeRes = await handleConceptRegistryRequest(
      new Request('http://localhost/api/concepts/propose', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: 'ops.metric.demo_kpi',
          label: 'Demo KPI',
          category: 'ops',
          group: 'ops.metric',
        }),
      }),
      db
    );
    expect(proposeRes!.status).toBe(201);
    const proposed = (await proposeRes!.json()) as {
      concept: { status: string };
    };
    expect(proposed.concept.status).toBe('proposed');

    const approveRes = await handleConceptRegistryRequest(
      new Request('http://localhost/api/concepts/ops.metric.demo_kpi/approve', {
        method: 'PATCH',
        body: JSON.stringify({ reviewer: 'ci' }),
      }),
      db
    );
    const approved = (await approveRes!.json()) as { concept: { status: string } };
    expect(approved.concept.status).toBe('active');

    const graphRes = await handleConceptRegistryRequest(
      new Request('http://localhost/api/concepts/graph?centrality=1'),
      db
    );
    const graphBody = (await graphRes!.json()) as {
      ok: boolean;
      graph: { nodes: unknown[] };
      centrality: unknown[];
    };
    expect(graphBody.ok).toBe(true);
    expect(graphBody.graph.nodes.length).toBeGreaterThan(0);
    expect(graphBody.centrality.length).toBeGreaterThan(0);
  });

  test('createConceptRegistryFetch health + 404', async () => {
    const db = memDb();
    const fetch = createConceptRegistryFetch(db);
    const health = await fetch(new Request('http://localhost/health'));
    expect(health.status).toBe(200);
    const missing = await fetch(new Request('http://localhost/nope'));
    expect(missing.status).toBe(404);
  });
});
