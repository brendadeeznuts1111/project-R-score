// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';

import {
  buildConceptGraph,
  buildConceptGraphAsync,
  classifySeeAlsoLayer,
  conceptGraphToDot,
  conceptGraphToMermaid,
  domainHubId,
  egoNeighborhood,
  egoNeighborhoodDistances,
  filterGraphBySeeAlsoLayers,
  SEE_ALSO_LAYER_WEIGHTS,
  type ConceptGraphEdge,
} from '../lib/portal/concept-graph.ts';
import { parseConceptGraphOptions } from '../scripts/concept-graph.ts';

describe('concept:graph', () => {
  test('builds schema v3 with typed seeAlso layers', async () => {
    const graph = await buildConceptGraphAsync();
    expect(graph.schemaVersion).toBe(3);
    expect(graph.summary.nodes).toBeGreaterThan(0);
    expect(graph.summary.seeAlsoEdges).toBeGreaterThan(0);
    expect(graph.summary.domainHubEdges).toBeGreaterThan(0);
    expect(graph.nodes.some(n => n.nodeKind === 'domainHub')).toBe(true);
    expect(graph.domainSummary.length).toBeGreaterThan(0);

    const seeAlso = graph.edges.filter(e => e.kind === 'seeAlso');
    expect(seeAlso.every(e => e.layer != null)).toBe(true);
    const byLayer = { sameGroup: 0, crossGroup: 0, crossDomain: 0, pageBridge: 0 };
    for (const e of seeAlso) byLayer[e.layer!] += 1;
    expect(byLayer).toEqual(graph.summary.seeAlsoByLayer);
    expect(
      byLayer.sameGroup + byLayer.crossGroup + byLayer.crossDomain + byLayer.pageBridge
    ).toBe(graph.summary.seeAlsoEdges);

    for (const e of seeAlso) {
      expect(e.weight).toBe(SEE_ALSO_LAYER_WEIGHTS[e.layer!]);
    }
  });

  test('classifySeeAlsoLayer precedence', () => {
    expect(
      classifySeeAlsoLayer('page.concepts', 'ui.semantic.surface', 'portal', 'portal')
    ).toBe('pageBridge');
    expect(
      classifySeeAlsoLayer('ops.limits.account', 'ui.semantic.status', 'compliance', 'portal')
    ).toBe('crossDomain');
    expect(
      classifySeeAlsoLayer('ops.limits.account', 'ops.limits.agent', 'compliance', 'compliance')
    ).toBe('sameGroup');
    expect(
      classifySeeAlsoLayer('ops.limits.account', 'ops.settlement.run', 'operations', 'operations')
    ).toBe('crossGroup');
    // pageBridge wins over crossDomain
    expect(
      classifySeeAlsoLayer('page.glossary', 'ops.limits.account', 'portal', 'compliance')
    ).toBe('pageBridge');
  });

  test('egoNeighborhoodDistances depth 1/2/3 on fixture', () => {
    const edges: ConceptGraphEdge[] = [
      { source: 'a', target: 'b', kind: 'seeAlso', weight: 3, layer: 'sameGroup' },
      { source: 'b', target: 'c', kind: 'seeAlso', weight: 2, layer: 'crossGroup' },
      { source: 'c', target: 'd', kind: 'seeAlso', weight: 1.5, layer: 'crossDomain' },
      { source: 'a', target: 'x', kind: 'surface', weight: 1 },
    ];
    const d1 = egoNeighborhoodDistances(edges, 'a', 1);
    expect(d1.get('a')).toBe(0);
    expect(d1.get('b')).toBe(1);
    expect(d1.get('x')).toBe(1);
    expect(d1.has('c')).toBe(false);

    const d2 = egoNeighborhoodDistances(edges, 'a', 2);
    expect(d2.get('c')).toBe(2);
    expect(d2.has('d')).toBe(false);

    const d3 = egoNeighborhoodDistances(edges, 'a', 3);
    expect(d3.get('d')).toBe(3);

    const seeAlsoOnly = egoNeighborhoodDistances(edges, 'a', 2, {
      kinds: ['seeAlso'],
    });
    expect(seeAlsoOnly.has('x')).toBe(false);
    expect(seeAlsoOnly.get('c')).toBe(2);

    const sameGroupOnly = egoNeighborhoodDistances(edges, 'a', 3, {
      kinds: ['seeAlso'],
      layers: ['sameGroup'],
    });
    expect([...sameGroupOnly.keys()].sort()).toEqual(['a', 'b']);
  });

  test('filterGraphBySeeAlsoLayers drops other layers', () => {
    const full = buildConceptGraph({ domainHubs: false, surfaceEdges: false });
    const filtered = filterGraphBySeeAlsoLayers(full, ['sameGroup']);
    expect(filtered.edges.every(e => e.kind !== 'seeAlso' || e.layer === 'sameGroup')).toBe(true);
    expect(filtered.summary.seeAlsoByLayer.sameGroup).toBe(filtered.summary.seeAlsoEdges);
    expect(filtered.summary.seeAlsoByLayer.crossGroup).toBe(0);
  });

  test('filters by business domain', () => {
    const graph = buildConceptGraph({ domains: ['compliance'], domainHubs: true });
    expect(
      graph.nodes.filter(n => n.nodeKind === 'concept').every(n => n.domain === 'compliance')
    ).toBe(true);
    expect(graph.nodes.some(n => n.id === domainHubId('compliance'))).toBe(true);
  });

  test('ego neighborhood and shortest path', () => {
    const graph = buildConceptGraph({ domainHubs: false, surfaceEdges: false });
    const seed = graph.edges.find(e => e.kind === 'seeAlso');
    expect(seed).toBeDefined();
    const keep = egoNeighborhood(graph.edges, seed!.source, 1);
    expect(keep.has(seed!.source)).toBe(true);
    expect(keep.has(seed!.target)).toBe(true);
  });

  test('focus depth trims the graph', () => {
    const full = buildConceptGraph({ domainHubs: false });
    const focus = full.nodes.find(n => n.nodeKind === 'concept' && n.degree > 0)?.id;
    expect(focus).toBeDefined();
    const ego = buildConceptGraph({ focus, depth: 1, domainHubs: false });
    expect(ego.summary.nodes).toBeLessThanOrEqual(full.summary.nodes);
    expect(ego.nodes.some(n => n.id === focus)).toBe(true);
  });

  test('mermaid and dot exporters include hubs', () => {
    const graph = buildConceptGraph({ domains: ['portal'], namespaces: ['ui'] });
    const mermaid = conceptGraphToMermaid(graph);
    const dot = conceptGraphToDot(graph);
    expect(mermaid.startsWith('flowchart LR')).toBe(true);
    expect(dot.includes('digraph concept_graph')).toBe(true);
  });

  test('portal graph board shell has layer chips and hop controls', async () => {
    const html = Bun.file('public/portal/concepts/graph/index.html');
    const js = Bun.file('public/portal/concepts/graph-board.js');
    expect(await html.exists()).toBe(true);
    expect(await js.exists()).toBe(true);
    const text = await html.text();
    expect(text.includes('graph-board.js')).toBe(true);
    expect(text.includes('data-layer="sameGroup"')).toBe(true);
    expect(text.includes('data-layer="pageBridge"')).toBe(true);
    expect(text.includes('data-hop="3"')).toBe(true);
    expect(text.includes('v3')).toBe(true);
    const board = await js.text();
    expect(board.includes('seeAlsoLayers')).toBe(true);
    expect(board.includes('neighborhoodDistances')).toBe(true);
  });

  test('parses deep CLI flags including see-also-layer', () => {
    const opts = parseConceptGraphOptions([
      'bun',
      'scripts/concept-graph.ts',
      '--format',
      'interactive',
      '--serve',
      '--BUNPORT',
      '--focus',
      'ops.limits.account',
      '--depth',
      '2',
      '--no-hubs',
      '--bake',
      '--see-also-layer',
      'sameGroup,crossDomain',
    ]);
    expect(opts.format).toBe('interactive');
    expect(opts.serve).toBe(true);
    expect(opts.bunPort).toBe(true);
    expect(opts.focus).toBe('ops.limits.account');
    expect(opts.depth).toBe(2);
    expect(opts.domainHubs).toBe(false);
    expect(opts.bake).toBe(true);
    expect(opts.seeAlsoLayers).toEqual(['sameGroup', 'crossDomain']);
  });
});
