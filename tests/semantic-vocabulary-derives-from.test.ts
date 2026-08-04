// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';

import {
  validatePortalSemanticConceptRelations,
  validatePortalSemanticVocabulary,
} from '../lib/portal/semantic-vocabulary.ts';

describe('validatePortalSemanticConceptRelations (derivesFrom)', () => {
  const base = [
    { id: 'ops.limits.effective_limit', seeAlso: [] as const },
    { id: 'api.limit_cache', seeAlso: [] as const },
    {
      id: 'ops.metric.high_water',
      seeAlso: [] as const,
      derivesFrom: ['ops.limits.effective_limit', 'api.limit_cache'] as const,
    },
  ];

  test('accepts known derivesFrom targets', () => {
    expect(() => validatePortalSemanticConceptRelations(base)).not.toThrow();
  });

  test('rejects unknown derivesFrom id', () => {
    expect(() =>
      validatePortalSemanticConceptRelations([
        ...base.slice(0, 2),
        {
          id: 'ops.metric.high_water',
          seeAlso: [],
          derivesFrom: ['ops.limits.nope'],
        },
      ])
    ).toThrow(/Unknown portal semantic derivesFrom/);
  });

  test('rejects self derivesFrom', () => {
    expect(() =>
      validatePortalSemanticConceptRelations([
        {
          id: 'ops.metric.high_water',
          seeAlso: [],
          derivesFrom: ['ops.metric.high_water'],
        },
      ])
    ).toThrow(/cannot derive from itself/);
  });

  test('production vocabulary validates (empty derivesFrom schema-only)', () => {
    expect(() => validatePortalSemanticVocabulary()).not.toThrow();
  });
});
