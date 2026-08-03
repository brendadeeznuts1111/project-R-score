// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';

import {
  conceptGroupOf,
  filterConcepts,
  groupCounts,
  parseConceptInventoryOptions,
  runConceptInventory,
  type GlossaryConcept,
} from '../tools/concept-inventory.ts';

describe('concept:inventory', () => {
  test('parses group, category, provenance correlation-id, run-id, and output flags', () => {
    const opts = parseConceptInventoryOptions([
      'bun',
      'tools/concept-inventory.ts',
      '--group',
      'ops.limits',
      '--domain',
      'compliance',
      '--group-by',
      'domain',
      '--category',
      'ui',
      '--correlation-id',
      'PR#228',
      '--run-id',
      '01900000-0000-7000-8000-000000000001',
      '--output',
      'json',
    ]);
    expect(opts.group).toBe('ops.limits');
    expect(opts.domain).toBe('compliance');
    expect(opts.groupBy).toBe('domain');
    expect(opts.category).toBe('ui');
    expect(opts.correlationId).toBe('PR#228');
    expect(opts.output).toBe('json');
    expect(String(opts.runId)).toBe('01900000-0000-7000-8000-000000000001');
  });

  test('filters by dotted group prefix, category, and provenance correlationId', () => {
    const sample: GlossaryConcept[] = [
      {
        id: 'ops.limits.account',
        label: 'Limit account',
        category: 'ui',
        domain: 'compliance',
        kind: 'ui',
        correlationId: 'PR#100',
      },
      {
        id: 'ops.metric.raises',
        label: 'Raises',
        category: 'ui',
        domain: 'operations',
        kind: 'metric',
        correlationId: 'PR#228',
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
    expect(filterConcepts(sample, { domain: 'compliance' }).map(c => c.id)).toEqual([
      'ops.limits.account',
    ]);
    expect(filterConcepts(sample, { domain: 'operations' }).map(c => c.id)).toEqual([
      'ops.metric.raises',
    ]);
    expect(filterConcepts(sample, { group: 'ops' }).map(c => c.id)).toEqual([
      'ops.limits.account',
      'ops.metric.raises',
    ]);
    expect(filterConcepts(sample, { correlationId: 'PR#228' }).map(c => c.id)).toEqual([
      'ops.metric.raises',
    ]);
  });

  test('groupCounts rolls up two-segment prefixes and domains', () => {
    const counts = groupCounts([
      { id: 'ops.limits.account', label: 'a', category: 'ui', domain: 'compliance' },
      { id: 'ops.limits.node', label: 'b', category: 'ui', domain: 'compliance' },
      { id: 'mid', label: 'c', category: 'market' },
    ]);
    expect(counts[0]).toEqual({ group: 'ops.limits', count: 2 });
    expect(counts.some(r => r.group === 'mid' && r.count === 1)).toBe(true);
    expect(conceptGroupOf('ops.metric.raises')).toBe('ops.metric');
    const byDomain = groupCounts(
      [
        { id: 'ops.limits.account', label: 'a', category: 'ui', domain: 'compliance' },
        { id: 'ui.semantic.tone', label: 'b', category: 'ui', domain: 'portal' },
        { id: 'ops.metric.raises', label: 'c', category: 'ui', domain: 'operations' },
      ],
      'domain'
    );
    expect(byDomain.find(r => r.group === 'compliance')?.count).toBe(1);
    expect(byDomain.find(r => r.group === 'portal')?.count).toBe(1);
    expect(byDomain.find(r => r.group === 'operations')?.count).toBe(1);
  });

  test('runs against baked domain glossary with provenance + usage fields', async () => {
    const report = await runConceptInventory(
      parseConceptInventoryOptions([
        'bun',
        'tools/concept-inventory.ts',
        '--correlation-id',
        'PR#228',
        '--output',
        'json',
        '--run-id',
        '01900000-0000-7000-8000-000000000002',
      ]),
      undefined,
      new Map([['ops.metric.raises', 3]])
    );
    expect(String(report.runId)).toBe('01900000-0000-7000-8000-000000000002');
    expect(report.correlationIdFilter).toBe('PR#228');
    expect(report.matched).toBeGreaterThan(0);
    expect(report.concepts.every(c => c.correlationId === 'PR#228')).toBe(true);
    expect(report.concepts.some(c => c.id === 'ops.metric.raises' && c.usage === 3)).toBe(true);
  });
});
