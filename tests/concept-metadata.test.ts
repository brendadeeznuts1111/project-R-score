// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';

import { PORTAL_SEMANTIC_CONCEPTS } from '../lib/portal/semantic-vocabulary.ts';
import {
  loadBaseline,
  validateConceptMetadata,
} from '../scripts/validate-concept-metadata.ts';

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
});
