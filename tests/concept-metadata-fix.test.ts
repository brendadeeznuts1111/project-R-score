// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/file-io — Bun.file / Bun.write
import { describe, expect, test } from 'bun:test';

import type { PORTAL_SEMANTIC_CONCEPTS } from '../lib/portal/semantic-vocabulary.ts';
import {
  insertAddedAtDates,
  planConceptMetadataFixes,
  validateGrandfatheredAddedAt,
} from '../scripts/validate-concept-metadata.ts';

function concept(partial: Record<string, unknown>): (typeof PORTAL_SEMANTIC_CONCEPTS)[number] {
  return {
    label: 'Test',
    description: 'test',
    semanticType: 'state',
    uiRole: 'code',
    synonyms: [],
    seeAlso: [],
    ...partial,
  } as (typeof PORTAL_SEMANTIC_CONCEPTS)[number];
}

describe('validate:concept-metadata --fix planning', () => {
  test('fixable: missing/invalid/mismatched domain is planned for backfill', () => {
    const concepts = [
      concept({ id: 'ops.metric.no_domain', namespace: 'ops', correlationId: 'PR#1', addedAt: '2026-01-01' }),
      concept({ id: 'ops.metric.bad_domain', namespace: 'ops', domain: 'market', correlationId: 'PR#1', addedAt: '2026-01-01' }),
      concept({ id: 'metric.mismatch', namespace: 'ui', domain: 'portal', correlationId: 'PR#1', addedAt: '2026-01-01' }),
    ];
    const plan = planConceptMetadataFixes(concepts, { today: '2026-08-03' });
    expect(plan.domainFixes).toEqual([
      { id: 'ops.metric.no_domain', domain: 'operations' },
      { id: 'ops.metric.bad_domain', domain: 'operations' },
      { id: 'metric.mismatch', domain: 'analytics' },
    ]);
    expect(plan.unfixable).toEqual([]);
  });

  test('fixable: correlationId present but addedAt missing → stamp today', () => {
    const concepts = [
      concept({ id: 'ops.metric.stampable', namespace: 'ops', domain: 'operations', correlationId: 'PR#9' }),
    ];
    const plan = planConceptMetadataFixes(concepts, { today: '2026-08-03' });
    expect(plan.addedAtFixes).toEqual([{ id: 'ops.metric.stampable', addedAt: '2026-08-03' }]);
    expect(plan.unfixable).toEqual([]);
  });

  test('unfixable: missing/empty correlationId is never invented', () => {
    const concepts = [
      concept({ id: 'ops.metric.no_corr', namespace: 'ops', domain: 'operations' }),
      concept({ id: 'ops.metric.empty_corr', namespace: 'ops', domain: 'operations', correlationId: '  ' }),
    ];
    const plan = planConceptMetadataFixes(concepts, { today: '2026-08-03' });
    expect(plan.addedAtFixes).toEqual([]);
    expect(plan.unfixable).toEqual([
      { id: 'ops.metric.no_corr', reason: 'missing-correlation-id' },
      { id: 'ops.metric.empty_corr', reason: 'empty-correlation-id' },
    ]);
  });

  test('unfixable: uninferable (tbd) domain stays failing', () => {
    const concepts = [
      concept({ id: 'zzz.unmapped_thing', namespace: 'ops', correlationId: 'PR#1', addedAt: '2026-01-01' }),
    ];
    const plan = planConceptMetadataFixes(concepts, { today: '2026-08-03' });
    expect(plan.domainFixes).toEqual([]);
    expect(plan.unfixable).toEqual([{ id: 'zzz.unmapped_thing', reason: 'missing-domain' }]);
  });

  test('grandfathered ids without correlationId are not unfixable', () => {
    const concepts = [
      concept({ id: 'ops.metric.legacy', namespace: 'ops', domain: 'operations' }),
    ];
    const plan = planConceptMetadataFixes(concepts, {
      today: '2026-08-03',
      baseline: { version: 1, grandfatheredIds: ['ops.metric.legacy'] },
    });
    expect(plan.unfixable).toEqual([]);
  });
});

describe('validate:concept-metadata --strict (grandfathered addedAt)', () => {
  test('flags grandfathered concepts that still lack addedAt', () => {
    const concepts = [
      concept({ id: 'ops.metric.old_no_date', namespace: 'ops', domain: 'operations' }),
      concept({ id: 'ops.metric.old_dated', namespace: 'ops', domain: 'operations', addedAt: '2026-01-01' }),
      concept({ id: 'ops.metric.new_no_date', namespace: 'ops', domain: 'operations', correlationId: 'PR#2' }),
    ];
    const baseline = {
      version: 1,
      grandfatheredIds: ['ops.metric.old_no_date', 'ops.metric.old_dated'],
    };
    const issues = validateGrandfatheredAddedAt(concepts, baseline);
    expect(issues).toEqual([
      { id: 'ops.metric.old_no_date', reason: 'grandfathered-missing-added-at' },
    ]);
  });
});

describe('insertAddedAtDates (temp vocab file only)', () => {
  test('inserts addedAt after correlationId and is idempotent', async () => {
    const path = `/tmp/concept-metadata-fix-vocab-${Date.now()}.ts`;
    const src = `export const CONCEPTS = [
  {
    id: 'ops.metric.stampable',
    label: 'Stampable',
    correlationId: 'PR#9',
  },
  {
    id: 'ops.metric.dated',
    label: 'Dated',
    correlationId: 'PR#1',
    addedAt: '2026-01-01',
  },
];
`;
    await Bun.write(path, src);
    try {
      const written = await insertAddedAtDates(
        [{ id: 'ops.metric.stampable', addedAt: '2026-08-03' }],
        { vocabPath: path }
      );
      expect(written).toBe(1);
      const after = await Bun.file(path).text();
      expect(after).toContain("correlationId: 'PR#9',\n    addedAt: '2026-08-03',");
      // dated block untouched
      expect(after.match(/addedAt:/g)?.length).toBe(2);
      // second run is a no-op
      const again = await insertAddedAtDates(
        [{ id: 'ops.metric.stampable', addedAt: '2026-08-04' }],
        { vocabPath: path }
      );
      expect(again).toBe(0);
    } finally {
      await Bun.file(path).delete();
    }
  });

  test('dry-run counts but does not write', async () => {
    const path = `/tmp/concept-metadata-fix-dry-${Date.now()}.ts`;
    const src = `export const CONCEPTS = [
  {
    id: 'ops.metric.stampable',
    correlationId: 'PR#9',
  },
];
`;
    await Bun.write(path, src);
    try {
      const written = await insertAddedAtDates(
        [{ id: 'ops.metric.stampable', addedAt: '2026-08-03' }],
        { vocabPath: path, dryRun: true }
      );
      expect(written).toBe(1);
      expect(await Bun.file(path).text()).toBe(src);
    } finally {
      await Bun.file(path).delete();
    }
  });
});
