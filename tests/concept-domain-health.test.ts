// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';

import {
  buildDomainList,
  conceptStatusOf,
  type DomainConceptInput,
} from '../scripts/concept-domain-list.ts';
import { buildDomainStats } from '../scripts/concept-domain-stats.ts';
import {
  buildHealthReport,
  EMPTY_LIFECYCLE_STORE,
  eventsWithinPeriod,
  loadLifecycleStore,
  type ConceptLifecycleStore,
} from '../scripts/concept-health.ts';

const concepts: DomainConceptInput[] = [
  {
    id: 'ui.semantic.status',
    namespace: 'ui',
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
  {
    id: 'ui.semantic.tone',
    namespace: 'ui',
    correlationId: 'PR#228',
    addedAt: '2026-07-15',
  },
  {
    id: 'ops.limits.node',
    namespace: 'ops',
    addedAt: '2026-02-01',
  },
  {
    id: 'ops.limits.legacy',
    namespace: 'ops',
    correlationId: 'legacy',
    addedAt: '2026-01-05',
    status: 'deprecated',
  },
  {
    id: 'ops.limits.dead',
    namespace: 'ops',
    correlationId: 'legacy',
    status: 'archived',
  },
  {
    id: 'page.glossary',
    namespace: 'page',
    correlationId: 'legacy',
    addedAt: '2026-01-01',
  },
];

const usageCounts = new Map<string, number>([
  ['ui.semantic.status', 3],
  ['ops.limits.node', 1],
]);

describe('concept-domain-list', () => {
  test('buildDomainList rolls up per domain', () => {
    const rows = buildDomainList(concepts, usageCounts);
    const byDomain = new Map(rows.map(r => [r.domain, r]));

    // one row per vocabulary domain
    expect(rows.map(r => r.domain)).toEqual(['api', 'ops', 'page', 'section', 'ui']);

    const ui = byDomain.get('ui')!;
    expect(ui.total).toBe(2);
    expect(ui.used).toBe(1);
    expect(ui.unused).toBe(1);
    expect(ui.inactive).toBe(0);
    expect(ui.provenancePct).toBe(100);

    const ops = byDomain.get('ops')!;
    expect(ops.total).toBe(3);
    expect(ops.used).toBe(1);
    expect(ops.unused).toBe(2);
    expect(ops.inactive).toBe(2); // deprecated + archived
    expect(ops.provenancePct).toBe(67); // 2 of 3 carry correlationId

    const api = byDomain.get('api')!;
    expect(api.total).toBe(0);
    expect(api.provenancePct).toBe(0);
  });

  test('conceptStatusOf defaults to active when status is absent', () => {
    expect(conceptStatusOf({ id: 'ui.x' })).toBe('active');
    expect(conceptStatusOf({ id: 'ui.x', status: 'deprecated' })).toBe('deprecated');
    expect(conceptStatusOf({ id: 'ui.x', status: 'archived' })).toBe('archived');
  });
});

describe('concept-domain-stats', () => {
  test('buildDomainStats computes metrics for one domain', () => {
    const [ops] = buildDomainStats(concepts, usageCounts, 'ops');
    expect(ops.total).toBe(3);
    expect(ops.active).toBe(1);
    expect(ops.deprecated).toBe(1);
    expect(ops.archived).toBe(1);
    expect(ops.usageTotal).toBe(1);
    expect(ops.usedConcepts).toBe(1);
    expect(ops.zeroUsageIds).toEqual(['ops.limits.dead', 'ops.limits.legacy']);
    expect(ops.provenance).toBe(2);
    expect(ops.provenancePct).toBe(67);
    expect(ops.groups).toEqual([{ group: 'ops.limits', count: 3 }]);
    expect(ops.oldestAddedAt).toBe('2026-01-05');
    expect(ops.newestAddedAt).toBe('2026-02-01');
  });

  test('buildDomainStats without domain covers domains that have concepts', () => {
    const stats = buildDomainStats(concepts, usageCounts);
    expect(stats.map(s => s.domain)).toEqual(['ops', 'page', 'ui']);
    const page = stats.find(s => s.domain === 'page')!;
    expect(page.zeroUsageIds).toEqual(['page.glossary']);
    expect(page.groups).toEqual([{ group: 'page.glossary', count: 1 }]);
  });

  test('buildDomainStats handles a domain with no concepts', () => {
    const [api] = buildDomainStats(concepts, usageCounts, 'api');
    expect(api.total).toBe(0);
    expect(api.oldestAddedAt).toBeNull();
    expect(api.newestAddedAt).toBeNull();
    expect(api.groups).toEqual([]);
  });
});

describe('concept-health', () => {
  const metadataOk = { ok: true, total: concepts.length, withProvenance: 4, issues: [] };

  test('ok when metadata passes and no deprecated concept has usage', () => {
    const report = buildHealthReport({
      concepts,
      usageCounts,
      metadata: metadataOk,
      lifecycle: EMPTY_LIFECYCLE_STORE,
      periodDays: 30,
      now: new Date('2026-08-03T00:00:00Z'),
    });
    expect(report.ok).toBe(true);
    expect(report.totals).toEqual({ total: 6, active: 4, deprecated: 1, archived: 1 });
    expect(report.provenance).toEqual({ withProvenance: 4, coveragePct: 67 });
    expect(report.usage.usedConcepts).toBe(2);
    // page.glossary is a catalog id → excluded from zero-usage
    expect(report.usage.zeroUsageIds).toEqual([
      'ops.limits.dead',
      'ops.limits.legacy',
      'ui.semantic.tone',
    ]);
    expect(report.deprecatedWithUsage).toEqual([]);
    expect(report.lifecycle.eventsInPeriod).toBe(0);
    expect(report.lifecycle.pendingProposals).toBe(0);
  });

  test('deprecated concept with usage > 0 fails the verdict', () => {
    const report = buildHealthReport({
      concepts,
      usageCounts: new Map([...usageCounts, ['ops.limits.legacy', 5]]),
      metadata: metadataOk,
      periodDays: 30,
      now: new Date('2026-08-03T00:00:00Z'),
    });
    expect(report.ok).toBe(false);
    expect(report.deprecatedWithUsage).toEqual(['ops.limits.legacy']);
  });

  test('failing metadata validation fails the verdict', () => {
    const report = buildHealthReport({
      concepts,
      usageCounts,
      metadata: { ok: false, total: 6, withProvenance: 4, issues: [{ id: 'x' }] },
      periodDays: 30,
      now: new Date('2026-08-03T00:00:00Z'),
    });
    expect(report.ok).toBe(false);
  });

  test('lifecycle history is filtered to the period window', () => {
    const lifecycle: ConceptLifecycleStore = {
      version: 1,
      proposals: [{ id: 'ops.limits.new' }, { id: 'ops.limits.other', status: 'pending' }, { id: 'ops.limits.old', status: 'rejected' }],
      history: [
        { at: '2026-08-01T10:00:00Z', action: 'propose', id: 'ops.limits.new', actor: 'agent', reason: null, replaceBy: null },
        { at: '2026-07-30T10:00:00Z', action: 'approve', id: 'ops.limits.node', actor: 'agent', reason: null, replaceBy: null },
        { at: '2026-07-01T10:00:00Z', action: 'deprecate', id: 'ops.limits.legacy', actor: 'agent', reason: 'superseded', replaceBy: 'ops.limits.node' },
        { at: 'not-a-date', action: 'archive', id: 'ops.limits.dead', actor: 'agent', reason: null, replaceBy: null },
      ],
    };
    const now = new Date('2026-08-03T00:00:00Z');
    const report = buildHealthReport({
      concepts,
      usageCounts,
      metadata: metadataOk,
      lifecycle,
      periodDays: 7,
      now,
    });
    // the 2026-07-01 deprecate and the unparseable archive fall outside / out
    expect(report.lifecycle.eventsInPeriod).toBe(2);
    expect(report.lifecycle.byAction).toEqual({ propose: 1, approve: 1 });
    // missing status counts as pending; rejected does not
    expect(report.lifecycle.pendingProposals).toBe(2);
    expect(report.periodDays).toBe(7);
  });

  test('eventsWithinPeriod boundary is inclusive', () => {
    const now = new Date('2026-08-03T00:00:00Z');
    const events = eventsWithinPeriod(
      [
        { at: '2026-07-27T00:00:00Z', action: 'propose', id: 'a', actor: 'x', reason: null, replaceBy: null },
        { at: '2026-07-26T23:59:59Z', action: 'propose', id: 'b', actor: 'x', reason: null, replaceBy: null },
        { at: '2026-08-04T00:00:00Z', action: 'propose', id: 'c', actor: 'x', reason: null, replaceBy: null },
      ],
      7,
      now
    );
    expect(events.map(e => e.id)).toEqual(['a']);
  });

  test('loadLifecycleStore tolerates a missing store file', async () => {
    const store = await loadLifecycleStore('/tmp/concept-lifecycle-does-not-exist.json');
    expect(store).toEqual(EMPTY_LIFECYCLE_STORE);
  });
});
