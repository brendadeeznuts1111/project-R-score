// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';

import type { ConceptUsageBreakdown } from '../lib/portal/concept-usage.ts';
import type { PORTAL_SEMANTIC_CONCEPTS } from '../lib/portal/semantic-vocabulary.ts';
import { createConceptRegistryHandler } from '../scripts/concept-serve.ts';

const SAMPLE_CONCEPTS = [
  {
    id: 'ops.metric.raises',
    label: 'Raises',
    description: 'Partner limit raises.',
    semanticType: 'state',
    uiRole: 'code',
    namespace: 'ops',
    domain: 'operations',
    synonyms: [],
    seeAlso: [],
    correlationId: 'PR#228',
    addedAt: '2026-08-02',
  },
  {
    id: 'ops.metric.volume',
    label: 'Volume',
    description: 'Trading volume.',
    semanticType: 'state',
    uiRole: 'code',
    namespace: 'ops',
    domain: 'operations',
    synonyms: [],
    seeAlso: [],
    correlationId: 'PR#100',
    addedAt: '2026-01-01',
  },
  {
    id: 'ui.semantic.status',
    label: 'Status',
    description: 'Observed operational outcome.',
    semanticType: 'classification',
    uiRole: 'badge',
    namespace: 'ui',
    domain: 'portal',
    synonyms: [],
    seeAlso: [],
    correlationId: 'legacy',
    addedAt: '2026-01-01',
    status: 'deprecated',
  },
] as unknown as typeof PORTAL_SEMANTIC_CONCEPTS;

function sampleUsage(): Map<string, ConceptUsageBreakdown> {
  return new Map<string, ConceptUsageBreakdown>([
    ['ops.metric.raises', { html: 2, href: 1, map: 0, surface: 1, total: 4 }],
    ['ui.semantic.status', { html: 1, href: 0, map: 0, surface: 0, total: 1 }],
  ]);
}

function makeHandler(proposalsPath = '/tmp/concept-serve-test-nonexistent.json') {
  return createConceptRegistryHandler({
    concepts: SAMPLE_CONCEPTS,
    loadUsageDetailed: async () => sampleUsage(),
    proposalsPath,
    startedAt: Date.now() - 5_000,
  });
}

const BASE = 'http://127.0.0.1:3042';

describe('concept:serve registry API', () => {
  test('GET /api/health returns the probe shape with 200', async () => {
    const res = await makeHandler()(new Request(`${BASE}/api/health`));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.service).toBe('concept-registry');
    expect(body.concepts).toBe(3);
    expect(typeof body.uptime).toBe('number');
  });

  test('GET /api/concepts lists all concepts with usage', async () => {
    const res = await makeHandler()(new Request(`${BASE}/api/concepts`));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { total: number; matched: number; concepts: Array<{ id: string; usage: number; status: string }> }; // brand-ok — wire JSON shape, glossary concept key
    expect(body.total).toBe(3);
    expect(body.matched).toBe(3);
    const raises = body.concepts.find(c => c.id === 'ops.metric.raises');
    expect(raises?.usage).toBe(4);
    const statusConcept = body.concepts.find(c => c.id === 'ui.semantic.status');
    expect(statusConcept?.status).toBe('deprecated');
  });

  test('GET /api/concepts?domain= filters by domain', async () => {
    const res = await makeHandler()(new Request(`${BASE}/api/concepts?domain=operations`));
    const body = (await res.json()) as { matched: number; concepts: Array<{ id: string; domain: string }> }; // brand-ok — wire JSON shape, glossary concept key
    expect(body.matched).toBe(2);
    expect(body.concepts.every(c => c.domain === 'operations')).toBe(true);
  });

  test('GET /api/concepts?status= filters by status', async () => {
    const res = await makeHandler()(new Request(`${BASE}/api/concepts?status=deprecated`));
    const body = (await res.json()) as { matched: number; concepts: Array<{ id: string }> }; // brand-ok — wire JSON shape, glossary concept key
    expect(body.matched).toBe(1);
    expect(body.concepts[0]?.id).toBe('ui.semantic.status');
  });

  test('GET /api/concepts?unused=1 keeps only zero-usage concepts', async () => {
    const res = await makeHandler()(new Request(`${BASE}/api/concepts?unused=1`));
    const body = (await res.json()) as { matched: number; concepts: Array<{ id: string; usage: number }> }; // brand-ok — wire JSON shape, glossary concept key
    expect(body.matched).toBe(1);
    expect(body.concepts[0]?.id).toBe('ops.metric.volume');
    expect(body.concepts[0]?.usage).toBe(0);
  });

  test('GET /api/concepts/:id returns concept + usage breakdown', async () => {
    const res = await makeHandler()(new Request(`${BASE}/api/concepts/ops.metric.raises`));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      concept: { id: string; correlationId: string; domain: string }; // brand-ok — wire JSON shape; concept key + provenance work-item ref
      usage: ConceptUsageBreakdown;
    };
    expect(body.concept.id).toBe('ops.metric.raises');
    expect(body.concept.correlationId).toBe('PR#228');
    expect(body.concept.domain).toBe('operations');
    expect(body.usage).toEqual({ html: 2, href: 1, map: 0, surface: 1, total: 4 });
  });

  test('GET /api/concepts/:id returns 404 JSON for unknown id', async () => {
    const res = await makeHandler()(new Request(`${BASE}/api/concepts/ops.metric.nope`));
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toContain('application/json');
    const body = (await res.json()) as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(body.error).toBe('not-found');
  });

  test('GET /api/domains rolls up per-domain counts', async () => {
    const res = await makeHandler()(new Request(`${BASE}/api/domains`));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      domains: Array<{ domain: string; count: number; used: number; unused: number }>;
    };
    const ops = body.domains.find(d => d.domain === 'operations');
    expect(ops).toEqual({ domain: 'operations', count: 2, used: 1, unused: 1 });
    const portal = body.domains.find(d => d.domain === 'portal');
    expect(portal).toEqual({ domain: 'portal', count: 1, used: 1, unused: 0 });
  });

  test('GET /api/proposals tolerates missing lifecycle file', async () => {
    const res = await makeHandler()(new Request(`${BASE}/api/proposals`));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { version: number; proposals: unknown[]; history: unknown[] };
    expect(body).toEqual({ version: 1, proposals: [], history: [] });
  });

  test('GET /api/proposals reads lifecycle file defensively', async () => {
    const path = `/tmp/concept-serve-test-proposals-${Date.now()}.json`;
    await Bun.write(path, JSON.stringify({ version: 2, proposals: [{ id: 'x' }], extra: true }));
    try {
      const res = await makeHandler(path)(new Request(`${BASE}/api/proposals`));
      const body = (await res.json()) as { version: number; proposals: unknown[]; history: unknown[] };
      expect(body.version).toBe(2);
      expect(body.proposals).toEqual([{ id: 'x' }]);
      expect(body.history).toEqual([]);
    } finally {
      await Bun.file(path).delete();
    }
  });

  test('unknown route returns 404 JSON', async () => {
    const res = await makeHandler()(new Request(`${BASE}/nope`));
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toContain('application/json');
    const body = (await res.json()) as { ok: boolean; error: string; path: string };
    expect(body).toEqual({ ok: false, error: 'not-found', path: '/nope' });
  });
});
