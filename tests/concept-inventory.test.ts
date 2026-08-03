// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';

import {
  filterConcepts,
  groupCounts,
  parseConceptInventoryOptions,
  runConceptInventory,
} from '../tools/concept-inventory.ts';

describe('concept:inventory', () => {
  test('parses group, category, correlation-id, and output flags', () => {
    const opts = parseConceptInventoryOptions([
      'bun',
      'tools/concept-inventory.ts',
      '--group',
      'ops.limits',
      '--category',
      'ui',
      '--correlation-id',
      '01900000-0000-7000-8000-000000000001',
      '--output',
      'json',
    ]);
    expect(opts.group).toBe('ops.limits');
    expect(opts.category).toBe('ui');
    expect(opts.output).toBe('json');
    expect(String(opts.correlationId)).toBe('01900000-0000-7000-8000-000000000001');
  });

  test('filters by dotted group prefix and category', () => {
    const sample = [
      {
        id: 'ops.limits.account',
        label: 'Limit account',
        category: 'ui',
        kind: 'ui',
      },
      {
        id: 'ops.metric.raises',
        label: 'Raises',
        category: 'ui',
        kind: 'metric',
      },
      {
        id: 'mid',
        label: 'Mid',
        category: 'market',
        kind: 'ui',
      },
    ];
    expect(filterConcepts(sample, { group: 'ops.limits' }).map(c => c.id)).toEqual([
      'ops.limits.account',
    ]);
    expect(filterConcepts(sample, { category: 'market' }).map(c => c.id)).toEqual(['mid']);
    expect(filterConcepts(sample, { group: 'ops' }).map(c => c.id)).toEqual([
      'ops.limits.account',
      'ops.metric.raises',
    ]);
  });

  test('groupCounts rolls up two-segment prefixes', () => {
    const counts = groupCounts([
      { id: 'ops.limits.account', label: 'a', category: 'ui' },
      { id: 'ops.limits.node', label: 'b', category: 'ui' },
      { id: 'mid', label: 'c', category: 'market' },
    ]);
    expect(counts[0]).toEqual({ group: 'ops.limits', count: 2 });
    expect(counts.some(r => r.group === 'mid' && r.count === 1)).toBe(true);
  });

  test('runs against baked domain glossary with json shape', async () => {
    const report = await runConceptInventory(
      parseConceptInventoryOptions([
        'bun',
        'tools/concept-inventory.ts',
        '--group',
        'ops.limits',
        '--output',
        'json',
        '--correlation-id',
        '01900000-0000-7000-8000-000000000002',
      ])
    );
    expect(report.matched).toBeGreaterThan(0);
    expect(report.concepts.every(c => c.id.startsWith('ops.limits'))).toBe(true);
    expect(String(report.correlationId)).toBe('01900000-0000-7000-8000-000000000002');
  });
});
