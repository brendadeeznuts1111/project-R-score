import { describe, expect, test } from 'bun:test';
import { buildInsightsHtml } from '../public/portal/concepts/graph-board.js';

const GRAPH = {
  summary: {
    used: 77,
    unused: 36,
    surfaceOnly: 26,
    bridges: 121,
    clusters: 10,
    corridors: 6,
  },
  report: {
    clusters: [
      { id: 'cluster:ui.filter.jurisdiction', size: 34, domain: 'portal' },
      { id: 'cluster:ops.limits.sport', size: 28, domain: 'compliance' },
      { id: 'cluster:small', size: 2, domain: 'operations' },
    ],
  },
  corridors: [
    { fromDomain: 'compliance', toDomain: 'portal', edges: 33 },
    { fromDomain: 'compliance', toDomain: 'operations', edges: 17 },
  ],
  nodes: [
    { id: 'hub:domain:portal', nodeKind: 'domainHub', bridgeScore: 0 },
    { id: 'ops.limits.profile', nodeKind: 'concept', bridgeScore: 12 },
    { id: 'section.downlineContext', nodeKind: 'concept', bridgeScore: 9 },
  ],
};

describe('concepts-graph insights panel', () => {
  test('renders coverage and structure counts from summary', () => {
    const html = buildInsightsHtml(GRAPH);
    expect(html).toContain('used 77 · unused 36 · surface-only 26');
    expect(html).toContain('bridges 121 · clusters 10 · corridors 6');
  });

  test('ranks the largest clusters and strips the internal prefix', () => {
    const html = buildInsightsHtml(GRAPH);
    expect(html.indexOf('ui.filter.jurisdiction ×34')).toBeLessThan(
      html.indexOf('ops.limits.sport ×28')
    );
    expect(html).not.toContain('cluster:ui.filter');
    expect(html).not.toContain('cluster:small ×2 · operations');
  });

  test('ranks corridors by edge count', () => {
    expect(buildInsightsHtml(GRAPH)).toContain('compliance → portal ×33');
  });

  test('shows only concepts with a positive bridge score', () => {
    const html = buildInsightsHtml(GRAPH);
    expect(html).toContain('ops.limits.profile · 12');
    expect(html).not.toContain('hub:domain:portal');
  });

  test('degrades empty payloads without leaking invalid values', () => {
    const html = buildInsightsHtml({});
    expect(html).toContain('used — · unused — · surface-only —');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('undefined');
  });
});
