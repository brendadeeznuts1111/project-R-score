// @see https://bun.com/docs/test — bun:test
// tests/concept-registry.test.ts — Concept Registry Service (Phase 1).
// In-memory DB per test; migration seeded from the real bake + vocabulary.

import { beforeEach, describe, expect, test } from 'bun:test';

import { conceptRegistryFetch } from '../lib/concept-registry/api.ts';
import { migrateConceptRegistry } from '../lib/concept-registry/migrate.ts';
import {
  approveConcept,
  archiveConcept,
  buildConceptGraph,
  ConceptRegistryError,
  deprecateConcept,
  getConcept,
  getConceptVersions,
  listConcepts,
  patchConcept,
  proposeConcept,
  rejectConcept,
  upsertConcept,
} from '../lib/concept-registry/repo.ts';
import { openConceptRegistryDb } from '../lib/concept-registry/schema.ts';

import type { Database } from 'bun:sqlite';

let db: Database;

beforeEach(async () => {
  db = openConceptRegistryDb(':memory:');
  await migrateConceptRegistry(db);
});

async function api(method: string, path: string, body?: unknown): Promise<Response> {
  const handler = conceptRegistryFetch(db);
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = { 'content-type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  return (await handler(new Request(`http://127.0.0.1${path}`, init))) as Response;
}

describe('concept registry migration', () => {
  test('seeds the real bake + vocabulary into the registry', () => {
    const { total } = db.query('SELECT COUNT(*) AS total FROM concepts').get() as { total: number };
    expect(total).toBeGreaterThanOrEqual(428);
    const { tables } = db
      .query(
        `SELECT COUNT(*) AS tables FROM sqlite_master
         WHERE type = 'table' AND name IN ('concepts', 'concept_versions', 'concept_usage', 'concept_provenance', 'concept_review')`
      )
      .get() as { tables: number };
    expect(tables).toBe(5);
  });

  test('usage scan records data-glossary-concept hits from public/portal', () => {
    const { usage } = db.query('SELECT COUNT(*) AS usage FROM concept_usage').get() as {
      usage: number;
    };
    expect(usage).toBeGreaterThan(0);
  });

  test('migration is idempotent — second run inserts nothing', async () => {
    const fresh = openConceptRegistryDb(':memory:');
    const first = await migrateConceptRegistry(fresh);
    expect(first.inserted).toBeGreaterThan(0);
    const versionsAfterFirst = fresh
      .query('SELECT COUNT(*) AS total FROM concept_versions')
      .get() as { total: number };
    const second = await migrateConceptRegistry(fresh);
    expect(second.inserted).toBe(0);
    expect(second.updated).toBe(0);
    const versionsAfterSecond = fresh
      .query('SELECT COUNT(*) AS total FROM concept_versions')
      .get() as { total: number };
    expect(versionsAfterSecond.total).toBe(versionsAfterFirst.total);
  });

  test('vocabulary concepts exist with kind derived from semanticType', () => {
    const concept = listConcepts(db, { limit: 100000, offset: 0 }).find(
      c => c.id === 'ui.semantic.surface'
    );
    expect(concept).toBeDefined();
    expect(concept?.kind).toBe('resource');
  });

  test('upsert detects and versions every persisted metadata change', () => {
    const fresh = openConceptRegistryDb(':memory:');
    const base = {
      id: 'ops.test.metadata',
      label: 'Metadata',
      status: 'active' as const,
      color: '#111111',
      unit: 'count',
      format: 'integer',
      synonyms: ['old'],
      values: ['one'],
      source: 'fixture-a',
    };
    expect(upsertConcept(fresh, base)).toBe(true);
    expect(upsertConcept(fresh, base)).toBe(false);

    expect(
      upsertConcept(fresh, {
        ...base,
        status: 'deprecated',
        color: '#222222',
        unit: 'usd',
        format: 'currency',
        synonyms: ['new'],
        values: ['two'],
        source: 'fixture-b',
      })
    ).toBe(true);

    expect(getConcept(fresh, base.id)).toMatchObject({
      status: 'deprecated',
      color: '#222222',
      unit: 'usd',
      format: 'currency',
      synonyms: ['new'],
      values: ['two'],
      source: 'fixture-b',
    });
    expect(getConceptVersions(fresh, base.id)).toHaveLength(2);
  });

  test('partial patches preserve omitted metadata, allow null clears, and version only diffs', () => {
    const fresh = openConceptRegistryDb(':memory:');
    upsertConcept(fresh, {
      id: 'ops.test.patch',
      label: 'Before',
      description: 'Keep me',
      kind: 'metric',
      unit: 'count',
      format: 'integer',
      deprecatedBy: 'ops.test.next',
    });

    expect(patchConcept(fresh, 'ops.test.patch', { label: 'After' })).toBe(true);
    expect(getConcept(fresh, 'ops.test.patch')).toMatchObject({
      label: 'After',
      description: 'Keep me',
      kind: 'metric',
      unit: 'count',
      format: 'integer',
      deprecatedBy: 'ops.test.next',
    });

    expect(
      patchConcept(fresh, 'ops.test.patch', { unit: null, deprecatedBy: null })
    ).toBe(true);
    expect(getConcept(fresh, 'ops.test.patch')).toMatchObject({
      unit: null,
      deprecatedBy: null,
    });
    expect(patchConcept(fresh, 'ops.test.patch', { unit: null, deprecatedBy: null })).toBe(false);
    expect(getConceptVersions(fresh, 'ops.test.patch')).toHaveLength(3);
  });
});

describe('concept registry lifecycle', () => {
  test('propose → approve → deprecate → archive with version snapshots', () => {
    const proposed = proposeConcept(db, {
      id: 'ops.test.concept',
      label: 'Test Concept',
      category: 'ops',
      groupPrefix: 'ops.test',
    });
    expect(proposed.status).toBe('proposed');
    expect(() => proposeConcept(db, { id: 'ops.test.concept', label: 'dup' })).toThrow(
      ConceptRegistryError
    );

    const approved = approveConcept(db, 'ops.test.concept', 'reviewer-a', 'looks good');
    expect(approved.status).toBe('active');

    const { reviews } = db
      .query("SELECT COUNT(*) AS reviews FROM concept_review WHERE concept_id = 'ops.test.concept'")
      .get() as { reviews: number };
    expect(reviews).toBe(1);

    const deprecated = deprecateConcept(db, 'ops.test.concept', 'ops.test.newconcept');
    expect(deprecated.status).toBe('deprecated');
    expect(deprecated.deprecatedBy).toBe('ops.test.newconcept');

    expect(() => deprecateConcept(db, 'ops.test.concept')).toThrow(ConceptRegistryError);

    const archived = archiveConcept(db, 'ops.test.concept');
    expect(archived.status).toBe('archived');

    const { versions } = db
      .query(
        "SELECT COUNT(*) AS versions FROM concept_versions WHERE concept_id = 'ops.test.concept'"
      )
      .get() as { versions: number };
    expect(versions).toBe(4); // propose + approve + deprecate + archive
  });

  test('reject records a rejected review and leaves the concept proposed', () => {
    proposeConcept(db, { id: 'ops.test.rejected', label: 'Rejected' });
    const review = rejectConcept(db, 'ops.test.rejected', 'reviewer-b', 'no');
    expect(review.status).toBe('rejected');
    const row = db.query("SELECT status FROM concepts WHERE id = 'ops.test.rejected'").get() as {
      status: string;
    };
    expect(row.status).toBe('proposed');
  });

  test('filters apply AND logic', () => {
    const deprecated = listConcepts(db, { status: 'deprecated', limit: 100, offset: 0 });
    expect(deprecated.length).toBeGreaterThanOrEqual(1);
    expect(deprecated.every(c => c.status === 'deprecated')).toBe(true);

    const ui = listConcepts(db, { category: 'ui', group: 'ui.semantic', limit: 100, offset: 0 });
    expect(ui.length).toBeGreaterThan(0);
    expect(ui.every(c => c.category === 'ui' && c.groupPrefix === 'ui.semantic')).toBe(true);
  });
});

describe('concept registry graph', () => {
  test('builds nodes + edges from seeAlso/mapsTo and reports orphans/centrality', () => {
    const graph = buildConceptGraph(db);
    expect(graph.nodes.length).toBeGreaterThanOrEqual(428);
    expect(graph.edges.length).toBeGreaterThan(0);
    expect(graph.summary.nodes).toBe(graph.nodes.length);
    expect(graph.summary.orphaned).toBeGreaterThanOrEqual(0);
    expect(graph.summary.central.length).toBeGreaterThan(0);
    expect(graph.edges.some(e => e.type === 'seeAlso')).toBe(true);
  });
});

describe('concept registry API', () => {
  test('GET /api/concepts lists with filters', async () => {
    const res = await api('GET', '/api/concepts?limit=5');
    expect(res.status).toBe(200);
    const payload = (await res.json()) as { concepts: Array<{ id: string }>; total: number }; // brand-ok — glossary concept key
    expect(payload.concepts.length).toBe(5);
    expect(payload.total).toBeGreaterThanOrEqual(428);

    const deprecated = await api('GET', '/api/concepts?status=deprecated');
    const dep = (await deprecated.json()) as { concepts: Array<{ status: string }> };
    expect(dep.concepts.length).toBeGreaterThanOrEqual(1);
    expect(dep.concepts.every(c => c.status === 'deprecated')).toBe(true);
  });

  test('GET /api/concepts/:id + versions + usage', async () => {
    const list = await api('GET', '/api/concepts?limit=1');
    const { concepts } = (await list.json()) as { concepts: Array<{ id: string }> }; // brand-ok — glossary concept key
    const id = concepts[0]!.id;

    const one = await api('GET', `/api/concepts/${id}`);
    expect(one.status).toBe(200);
    const concept = (await one.json()) as { id: string }; // brand-ok — glossary concept key
    expect(concept.id).toBe(id);

    const versions = await api('GET', `/api/concepts/${id}/versions`);
    expect(versions.status).toBe(200);
    const v = (await versions.json()) as { versions: unknown[] };
    expect(v.versions.length).toBeGreaterThanOrEqual(1);

    const usage = await api('GET', `/api/concepts/${id}/usage`);
    expect(usage.status).toBe(200);

    const missing = await api('GET', '/api/concepts/does.not.exist');
    expect(missing.status).toBe(404);
  });

  test('POST /api/concepts/propose → PATCH approve/deprecate → DELETE archive', async () => {
    const created = await api('POST', '/api/concepts/propose', {
      id: 'ops.api.concept',
      label: 'API Concept',
      category: 'ops',
    });
    expect(created.status).toBe(201);
    const row = (await created.json()) as { status: string };
    expect(row.status).toBe('proposed');

    const dup = await api('POST', '/api/concepts/propose', {
      id: 'ops.api.concept',
      label: 'dup',
    });
    expect(dup.status).toBe(409);

    const approved = await api('PATCH', '/api/concepts/ops.api.concept/approve', {
      reviewer: 'api-test',
    });
    expect(approved.status).toBe(200);
    expect(((await approved.json()) as { status: string }).status).toBe('active');

    const doubleApprove = await api('PATCH', '/api/concepts/ops.api.concept/approve', {});
    expect(doubleApprove.status).toBe(409);

    const deprecated = await api('PATCH', '/api/concepts/ops.api.concept/deprecate', {
      replaceBy: 'ops.api.next',
    });
    expect(deprecated.status).toBe(200);
    expect(((await deprecated.json()) as { status: string }).status).toBe('deprecated');

    const noForce = await api('DELETE', '/api/concepts/ops.api.concept', { force: false });
    expect(noForce.status).toBe(400);

    const archived = await api('DELETE', '/api/concepts/ops.api.concept', { force: true });
    expect(archived.status).toBe(200);
    expect(((await archived.json()) as { status: string }).status).toBe('archived');
  });

  test('validation + method errors map to 400/405', async () => {
    const badBody = await api('POST', '/api/concepts/propose', { id: 'ops.bad' }); // no label
    expect(badBody.status).toBe(400);

    const wrongMethod = await api('POST', '/api/concepts', {});
    expect(wrongMethod.status).toBe(405);

    const badQuery = await api('GET', '/api/concepts?limit=0');
    expect(badQuery.status).toBe(400);

    const unknown = await api('GET', '/api/nope');
    expect(unknown.status).toBe(404);
  });

  test('GET /api/concepts/graph', async () => {
    const res = await api('GET', '/api/concepts/graph');
    expect(res.status).toBe(200);
    const graph = (await res.json()) as { nodes: unknown[]; edges: unknown[] };
    expect(graph.nodes.length).toBeGreaterThanOrEqual(428);
    expect(graph.edges.length).toBeGreaterThan(0);
  });
});
