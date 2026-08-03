// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';

import { PORTAL_SEMANTIC_CONCEPTS } from '../lib/portal/semantic-vocabulary.ts';
import {
  collectConceptWarnings,
  loadBaseline,
  planProvenancePlaceholders,
  validateConceptMetadata,
} from '../scripts/validate-concept-metadata.ts';

/** Minimal concept fixture matching the suite's existing cast style. */
function conceptFixture(overrides: Record<string, unknown>) {
  return [
    {
      id: 'ops.metric.test_fixture',
      label: 'Test fixture',
      description: 'test',
      semanticType: 'state',
      uiRole: 'code',
      namespace: 'ops',
      domain: 'operations',
      synonyms: [],
      seeAlso: [],
      correlationId: 'PR#228',
      ...overrides,
    },
  ] as unknown as typeof PORTAL_SEMANTIC_CONCEPTS;
}

describe('validate:concept-metadata', () => {
  test('every portal concept has provenance (baseline empty)', async () => {
    const baseline = await loadBaseline();
    expect(baseline.grandfatheredIds).toEqual([]);
    const issues = validateConceptMetadata(PORTAL_SEMANTIC_CONCEPTS, baseline);
    expect(issues).toEqual([]);
    expect(
      PORTAL_SEMANTIC_CONCEPTS.every(
        c => 'correlationId' in c && typeof c.correlationId === 'string' && c.correlationId.length > 0
      )
    ).toBe(true);
  });

  test('new concept without correlationId fails when not grandfathered', () => {
    const issues = validateConceptMetadata(
      [
        {
          id: 'ops.metric.brand_new_concept',
          label: 'Brand new',
          description: 'test',
          semanticType: 'state',
          uiRole: 'code',
          namespace: 'ops',
          domain: 'operations',
          synonyms: [],
          seeAlso: [],
        },
      ] as unknown as typeof PORTAL_SEMANTIC_CONCEPTS,
      { version: 1, grandfatheredIds: [] }
    );
    expect(issues).toEqual([
      { id: 'ops.metric.brand_new_concept', reason: 'missing-correlation-id' },
    ]);
  });

  test('rejects missing/invalid domain and namespace mismatches', () => {
    const issues = validateConceptMetadata(
      [
        {
          id: 'ops.metric.no_domain',
          label: 'No domain',
          description: 'test',
          semanticType: 'state',
          uiRole: 'code',
          namespace: 'ops',
          synonyms: [],
          seeAlso: [],
          correlationId: 'PR#228',
        },
        {
          id: 'ops.metric.bad_domain',
          label: 'Bad domain',
          description: 'test',
          semanticType: 'state',
          uiRole: 'code',
          namespace: 'ops',
          domain: 'market',
          synonyms: [],
          seeAlso: [],
          correlationId: 'PR#228',
        },
        {
          id: 'ops.metric.ns_mismatch',
          label: 'NS mismatch',
          description: 'test',
          semanticType: 'state',
          uiRole: 'code',
          namespace: 'ui',
          domain: 'operations',
          synonyms: [],
          seeAlso: [],
          correlationId: 'PR#228',
        },
      ] as unknown as typeof PORTAL_SEMANTIC_CONCEPTS,
      { version: 1, grandfatheredIds: [] }
    );
    expect(issues).toEqual([
      { id: 'ops.metric.no_domain', reason: 'missing-domain' },
      { id: 'ops.metric.bad_domain', reason: 'invalid-domain' },
      { id: 'ops.metric.ns_mismatch', reason: 'namespace-id-mismatch' },
    ]);
  });

  test('every portal concept has valid namespace + business domain', () => {
    for (const c of PORTAL_SEMANTIC_CONCEPTS) {
      expect(c.id.startsWith(`${c.namespace}.`)).toBe(true);
      expect(typeof c.domain).toBe('string');
      expect(c.domain.length).toBeGreaterThan(0);
    }
  });

  test('PR#228 chrome concepts carry provenance in vocabulary SSOT', () => {
    const raises = PORTAL_SEMANTIC_CONCEPTS.find(c => c.id === 'ops.metric.raises');
    expect(raises).toBeDefined();
    expect('correlationId' in raises! && raises!.correlationId).toBe('PR#228');
    expect('addedAt' in raises! && raises!.addedAt).toBe('2026-08-02');
    expect(raises!.domain).toBe('operations');
    expect(raises!.namespace).toBe('ops');
  });

  test('write-baseline refuses to grandfather ids that already have provenance', async () => {
    const { writeBaselineFromConcepts } = await import(
      '../scripts/validate-concept-metadata.ts'
    );
    await expect(
      writeBaselineFromConcepts(PORTAL_SEMANTIC_CONCEPTS, '/tmp/concept-baseline-test.json')
    ).rejects.toThrow(/No concepts lack correlationId/);
  });

  test('correlationId format accepts dominant styles and flags foreign values', () => {
    for (const ok of ['legacy', 'TODO', 'PR#228', 'pr:123', 'issue:456', 'cycle:72']) {
      expect(collectConceptWarnings(conceptFixture({ correlationId: ok }))).toEqual([]);
    }
    const warnings = collectConceptWarnings(conceptFixture({ correlationId: 'random text' }));
    expect(warnings).toEqual([
      { id: 'ops.metric.test_fixture', reason: 'invalid-correlation-id-format', detail: 'random text' },
    ]);
    // every existing vocabulary provenance value matches the accepted formats
    expect(collectConceptWarnings(PORTAL_SEMANTIC_CONCEPTS)).toEqual([]);
  });

  test('deprecated-but-used warns only when usage > 0', () => {
    const deprecated = conceptFixture({ status: 'deprecated' });
    expect(collectConceptWarnings(deprecated, new Map([['ops.metric.test_fixture', 3]]))).toEqual([
      { id: 'ops.metric.test_fixture', reason: 'deprecated-but-used', detail: 'usage=3' },
    ]);
    expect(collectConceptWarnings(deprecated, new Map([['ops.metric.test_fixture', 0]]))).toEqual(
      []
    );
    expect(collectConceptWarnings(conceptFixture({ status: 'active' }), new Map())).toEqual([]);
  });

  test('declared group must match the id prefix', () => {
    expect(collectConceptWarnings(conceptFixture({ group: 'ops.metric' }))).toEqual([]);
    expect(collectConceptWarnings(conceptFixture({ group: 'ops.wrong' }))).toEqual([
      {
        id: 'ops.metric.test_fixture',
        reason: 'group-prefix-mismatch',
        detail: 'group=ops.wrong expected=ops.metric',
      },
    ]);
  });

  test('provenance placeholders are TODO-only, idempotent, never overwrite', () => {
    const missing = conceptFixture({ correlationId: undefined });
    const baseline = {
      version: 1,
      grandfatheredIds: [],
      provenancePlaceholders: { 'ops.metric.existing': 'TODO' },
    };
    expect(planProvenancePlaceholders(missing, baseline)).toEqual({
      'ops.metric.test_fixture': 'TODO',
    });
    // second run: already placeholdered ids are skipped
    expect(
      planProvenancePlaceholders(missing, {
        ...baseline,
        provenancePlaceholders: {
          'ops.metric.existing': 'TODO',
          'ops.metric.test_fixture': 'TODO',
        },
      })
    ).toEqual({});
    // concepts with real provenance never get placeholders
    expect(planProvenancePlaceholders(conceptFixture({}), baseline)).toEqual({});
  });
});
