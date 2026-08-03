/**
 * Concept relationship graph — typed seeAlso layers, surface, group, domain hubs.
 *
 * @see scripts/concept-graph.ts
 * @see lib/portal/concept-domains.ts
 * @see lib/portal/concept-usage.ts
 */
import { DOMAIN_METADATA, type ConceptDomain } from './concept-domains.ts';
import { countPortalConceptUsagesDetailed, type ConceptUsageBreakdown } from './concept-usage.ts';
import {
  ACCOUNT_DOSSIER_SURFACE_CONCEPTS,
  HEALTH_FIELD_CONCEPTS,
  LIMIT_FIELD_CONCEPTS,
  LIMIT_SURFACE_CONCEPTS,
  PARTNER_HISTORY_SURFACE_CONCEPTS,
  PARTNERS_SURFACE_CONCEPTS,
  PORTAL_SEMANTIC_CONCEPTS,
  type PortalSemanticConcept,
  type PortalSemanticNamespace,
} from './semantic-vocabulary.ts';

export type ConceptGraphEdgeKind = 'seeAlso' | 'surface' | 'group' | 'domainHub';

export type ConceptGraphNodeKind = 'concept' | 'domainHub';

/** Derived seeAlso relationship layer (no vocab schema change). */
export const SEE_ALSO_LAYERS = ['sameGroup', 'crossGroup', 'crossDomain', 'pageBridge'] as const;

export type SeeAlsoLayer = (typeof SEE_ALSO_LAYERS)[number];

export const SEE_ALSO_LAYER_WEIGHTS: Record<SeeAlsoLayer, number> = {
  sameGroup: 3,
  crossGroup: 2,
  crossDomain: 1.5,
  pageBridge: 1,
};

export type ConceptGraphNode = {
  id: string; // brand-ok — portal concept key or hub:domain:*
  label: string;
  nodeKind: ConceptGraphNodeKind;
  domain: ConceptDomain | 'hub';
  domainLabel: string;
  namespace: PortalSemanticNamespace | 'hub';
  group: string;
  provenance: string; // brand-ok — correlationId or empty
  usage: number;
  usageUi: number;
  usageSurface: number;
  boards: string[];
  kind: 'used' | 'unused' | 'surface-only' | 'hub';
  degree: number;
  seeAlsoCount: number;
};

export type ConceptGraphEdge = {
  source: string; // brand-ok — concept/hub id
  target: string; // brand-ok — concept/hub id
  kind: ConceptGraphEdgeKind;
  weight: number;
  /** Present when kind === 'seeAlso'. */
  layer?: SeeAlsoLayer;
};

export type SeeAlsoByLayer = Record<SeeAlsoLayer, number>;

export type ConceptGraph = {
  kind: 'concept-graph';
  schemaVersion: 3;
  generatedAt: string;
  focus?: string;
  depth?: number;
  summary: {
    nodes: number;
    edges: number;
    seeAlsoEdges: number;
    seeAlsoByLayer: SeeAlsoByLayer;
    surfaceEdges: number;
    groupEdges: number;
    domainHubEdges: number;
    domains: number;
    namespaces: number;
    used: number;
    unused: number;
    surfaceOnly: number;
    totalUsage: number;
  };
  domainSummary: Array<{
    domain: string;
    nodes: number;
    edges: number;
    usage: number;
  }>;
  boardSummary: Array<{
    board: string;
    concepts: number;
  }>;
  nodes: ConceptGraphNode[];
  edges: ConceptGraphEdge[];
};

export type EgoEdgeFilter = {
  kinds?: readonly ConceptGraphEdgeKind[];
  layers?: readonly SeeAlsoLayer[];
};

export type ConceptGraphBuildOptions = {
  domains?: readonly string[];
  namespaces?: readonly string[];
  /** Include domain hub nodes + spokes. Default true for deep graph. */
  domainHubs?: boolean;
  /** Pairwise edges for concepts sharing a surface map. Default true. */
  surfaceEdges?: boolean;
  /** Soft edges within the same two-segment group. Default false (noisy). */
  groupEdges?: boolean;
  /** Drop concept nodes with degree < N after edge build (hubs exempt). */
  minDegree?: number;
  /** Ego-network center concept id. */
  focus?: string;
  /** Hop depth from focus (default 2 when focus set). */
  depth?: number;
  concepts?: readonly PortalSemanticConcept[];
  usages?: Map<string, ConceptUsageBreakdown>;
  /** Precomputed board → concept ids. */
  boardMembership?: Map<string, Set<string>>;
};

export function emptySeeAlsoByLayer(): SeeAlsoByLayer {
  return { sameGroup: 0, crossGroup: 0, crossDomain: 0, pageBridge: 0 };
}

export function isSeeAlsoLayer(value: string): value is SeeAlsoLayer {
  return (SEE_ALSO_LAYERS as readonly string[]).includes(value);
}

/**
 * Classify an authored seeAlso link.
 * Precedence: pageBridge → crossDomain → sameGroup → crossGroup.
 */
export function classifySeeAlsoLayer(
  sourceId: string, // brand-ok — opaque glossary concept key
  targetId: string, // brand-ok — opaque glossary concept key
  sourceDomain: string,
  targetDomain: string
): SeeAlsoLayer {
  // brand-ok — glossary concept keys
  if (sourceId.startsWith('page.') || targetId.startsWith('page.')) return 'pageBridge';
  if (sourceDomain !== targetDomain) return 'crossDomain';
  if (conceptGroupOf(sourceId) === conceptGroupOf(targetId)) return 'sameGroup';
  return 'crossGroup';
}

const SURFACE_BOARD_MAPS: Array<{ board: string; map: Record<string, string> }> = [
  { board: 'partner-history', map: PARTNER_HISTORY_SURFACE_CONCEPTS as Record<string, string> },
  { board: 'partners', map: PARTNERS_SURFACE_CONCEPTS as Record<string, string> },
  { board: 'limits', map: LIMIT_SURFACE_CONCEPTS as Record<string, string> },
  { board: 'account', map: ACCOUNT_DOSSIER_SURFACE_CONCEPTS as Record<string, string> },
  { board: 'limits-fields', map: LIMIT_FIELD_CONCEPTS as Record<string, string> },
  { board: 'health-fields', map: HEALTH_FIELD_CONCEPTS as Record<string, string> },
];

export function conceptGroupOf(id: string): string {
  // brand-ok — glossary concept key prefixing
  const parts = id.split('.');
  return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : (parts[0] ?? 'other');
}

function conceptProvenance(concept: PortalSemanticConcept): string {
  return 'correlationId' in concept && typeof concept.correlationId === 'string'
    ? concept.correlationId.trim()
    : '';
}

export function domainHubId(domain: ConceptDomain): string {
  return `hub:domain:${domain}`;
}

export function isDomainHubId(id: string): boolean {
  // brand-ok — opaque glossary concept key
  return id.startsWith('hub:domain:');
}

function defaultBoardMembership(): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const { board, map } of SURFACE_BOARD_MAPS) {
    const set = out.get(board) ?? new Set<string>();
    for (const id of Object.values(map)) {
      if (typeof id === 'string' && id.length > 0) set.add(id);
    }
    out.set(board, set);
  }
  return out;
}

function boardsForConcept(id: string, membership: Map<string, Set<string>>): string[] {
  // brand-ok — opaque glossary concept key
  const boards: string[] = [];
  for (const [board, set] of membership) {
    if (set.has(id)) boards.push(board);
  }
  return boards.sort();
}

function uiHits(row: ConceptUsageBreakdown | undefined): number {
  if (!row) return 0;
  return row.html + row.href + row.map;
}

function nodeUsageKind(ui: number, surface: number): 'used' | 'unused' | 'surface-only' {
  if (ui > 0) return 'used';
  if (surface > 0) return 'surface-only';
  return 'unused';
}

function edgePassesFilter(e: ConceptGraphEdge, filter?: EgoEdgeFilter): boolean {
  if (!filter) return true;
  if (filter.kinds && filter.kinds.length > 0 && !filter.kinds.includes(e.kind)) return false;
  if (e.kind === 'seeAlso' && filter.layers && filter.layers.length > 0) {
    if (!e.layer || !filter.layers.includes(e.layer)) return false;
  }
  return true;
}

function undirectedAdj(
  edges: readonly ConceptGraphEdge[],
  filter?: EgoEdgeFilter
): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  for (const e of edges) {
    if (!edgePassesFilter(e, filter)) continue;
    const a = adj.get(e.source) ?? new Set();
    const b = adj.get(e.target) ?? new Set();
    a.add(e.target);
    b.add(e.source);
    adj.set(e.source, a);
    adj.set(e.target, b);
  }
  return adj;
}

/** BFS neighborhood of `focus` over undirected edges, including the focus node. */
export function egoNeighborhood(
  edges: readonly ConceptGraphEdge[],
  focus: string,
  depth: number,
  filter?: EgoEdgeFilter
): Set<string> {
  return new Set(egoNeighborhoodDistances(edges, focus, depth, filter).keys());
}

/**
 * BFS hop distances from `focus` (0 at focus). Optional kind/layer allowlist
 * so rings can be seeAlso-only or full-graph.
 */
export function egoNeighborhoodDistances(
  edges: readonly ConceptGraphEdge[],
  focus: string,
  depth: number,
  filter?: EgoEdgeFilter
): Map<string, number> {
  const adj = undirectedAdj(edges, filter);
  const dist = new Map<string, number>([[focus, 0]]);
  if (depth <= 0) return dist;
  let frontier = [focus];
  for (let d = 0; d < depth; d++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const n of adj.get(id) ?? []) {
        if (dist.has(n)) continue;
        dist.set(n, d + 1);
        next.push(n);
      }
    }
    frontier = next;
  }
  return dist;
}

/** Drop seeAlso edges whose layer is outside `layers`; recompute summary counts. */
export function filterGraphBySeeAlsoLayers(
  graph: ConceptGraph,
  layers: readonly SeeAlsoLayer[]
): ConceptGraph {
  if (layers.length === 0) return graph;
  const allow = new Set(layers);
  const edges = graph.edges.filter(e => e.kind !== 'seeAlso' || (e.layer && allow.has(e.layer)));
  const seeAlsoByLayer = emptySeeAlsoByLayer();
  let seeAlsoEdges = 0;
  for (const e of edges) {
    if (e.kind !== 'seeAlso' || !e.layer) continue;
    seeAlsoEdges += 1;
    seeAlsoByLayer[e.layer] += 1;
  }
  return {
    ...graph,
    edges,
    summary: {
      ...graph.summary,
      edges: edges.length,
      seeAlsoEdges,
      seeAlsoByLayer,
      surfaceEdges: edges.filter(e => e.kind === 'surface').length,
      groupEdges: edges.filter(e => e.kind === 'group').length,
      domainHubEdges: edges.filter(e => e.kind === 'domainHub').length,
    },
  };
}

/** Undirected shortest path (edge list) between two concept ids. */
export function shortestPath(
  edges: readonly ConceptGraphEdge[],
  from: string,
  to: string
): string[] | null {
  if (from === to) return [from];
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    (adj.get(e.source) ?? adj.set(e.source, []).get(e.source)!).push(e.target);
    (adj.get(e.target) ?? adj.set(e.target, []).get(e.target)!).push(e.source);
  }
  const prev = new Map<string, string | null>([[from, null]]);
  const q = [from];
  for (let i = 0; i < q.length; i++) {
    const cur = q[i]!;
    for (const n of adj.get(cur) ?? []) {
      if (prev.has(n)) continue;
      prev.set(n, cur);
      if (n === to) {
        const path = [to];
        let p: string | null | undefined = cur;
        while (p) {
          path.push(p);
          p = prev.get(p) ?? null;
        }
        return path.reverse();
      }
      q.push(n);
    }
  }
  return null;
}

export function buildConceptGraph(opts: ConceptGraphBuildOptions = {}): ConceptGraph {
  const all = opts.concepts ?? PORTAL_SEMANTIC_CONCEPTS;
  const domainFilter = new Set(opts.domains ?? []);
  const nsFilter = new Set(opts.namespaces ?? []);
  const domainHubs = opts.domainHubs ?? true;
  const surfaceEdges = opts.surfaceEdges ?? true;
  const groupEdges = opts.groupEdges ?? false;
  const minDegree = opts.minDegree ?? 0;
  const usages = opts.usages ?? new Map<string, ConceptUsageBreakdown>();
  const boardMembership = opts.boardMembership ?? defaultBoardMembership();

  let concepts = all.filter(c => {
    if (domainFilter.size > 0 && !domainFilter.has(c.domain)) return false;
    if (nsFilter.size > 0 && !nsFilter.has(c.namespace)) return false;
    return true;
  });

  const idSet = new Set(concepts.map(c => c.id));
  const degree = new Map<string, number>();
  const edges: ConceptGraphEdge[] = [];
  const edgeKey = new Set<string>();

  const byId = new Map(concepts.map(c => [c.id, c]));

  const pushEdge = (
    source: string,
    target: string,
    kind: ConceptGraphEdgeKind,
    weight = 1,
    layer?: SeeAlsoLayer
  ) => {
    if (source === target) return;
    // Allow hub endpoints even when not in concept idSet
    const sourceOk = idSet.has(source) || isDomainHubId(source);
    const targetOk = idSet.has(target) || isDomainHubId(target);
    if (!sourceOk || !targetOk) return;
    const a = source < target ? source : target;
    const b = source < target ? target : source;
    const key = `${kind}:${a}->${b}`;
    if (edgeKey.has(key)) return;
    edgeKey.add(key);
    edges.push(layer ? { source, target, kind, weight, layer } : { source, target, kind, weight });
    degree.set(source, (degree.get(source) ?? 0) + 1);
    degree.set(target, (degree.get(target) ?? 0) + 1);
  };

  for (const c of concepts) {
    for (const other of c.seeAlso ?? []) {
      if (typeof other !== 'string') continue;
      const target = byId.get(other);
      if (!target) continue;
      const layer = classifySeeAlsoLayer(c.id, other, c.domain, target.domain);
      pushEdge(c.id, other, 'seeAlso', SEE_ALSO_LAYER_WEIGHTS[layer], layer);
    }
  }

  if (surfaceEdges) {
    for (const { map } of SURFACE_BOARD_MAPS) {
      const ids = [...new Set(Object.values(map))].filter(id => idSet.has(id)).sort();
      // Star through first id to avoid O(n²) dense cliques on large maps
      if (ids.length < 2) continue;
      if (ids.length <= 8) {
        for (let i = 0; i < ids.length; i++) {
          for (let j = i + 1; j < ids.length; j++) {
            pushEdge(ids[i]!, ids[j]!, 'surface', 1);
          }
        }
      } else {
        const hub = ids[0]!;
        for (let i = 1; i < ids.length; i++) pushEdge(hub, ids[i]!, 'surface', 1);
      }
    }
  }

  if (groupEdges) {
    const byGroup = new Map<string, string[]>();
    for (const c of concepts) {
      const g = conceptGroupOf(c.id);
      const list = byGroup.get(g) ?? [];
      list.push(c.id);
      byGroup.set(g, list);
    }
    for (const ids of byGroup.values()) {
      if (ids.length < 2 || ids.length > 12) continue;
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          pushEdge(ids[i]!, ids[j]!, 'group', 0.5);
        }
      }
    }
  }

  const hubDomains = new Set<ConceptDomain>();
  if (domainHubs) {
    for (const c of concepts) hubDomains.add(c.domain);
    for (const domain of hubDomains) {
      const hub = domainHubId(domain);
      for (const c of concepts) {
        if (c.domain === domain) pushEdge(c.id, hub, 'domainHub', 0.75);
      }
    }
  }

  // Ego filter after edges so neighborhood uses full adjacency in-scope
  if (opts.focus) {
    const depth = opts.depth ?? 2;
    const keep = egoNeighborhood(edges, opts.focus, depth);
    for (const e of edges) {
      if (e.kind !== 'domainHub') continue;
      if (keep.has(e.source) || keep.has(e.target)) {
        keep.add(e.source);
        keep.add(e.target);
      }
    }
    concepts = concepts.filter(c => keep.has(c.id));
    idSet.clear();
    for (const c of concepts) idSet.add(c.id);
    hubDomains.clear();
    for (const c of concepts) hubDomains.add(c.domain);
    const edges2 = edges.filter(e => keep.has(e.source) && keep.has(e.target));
    edges.length = 0;
    edges.push(...edges2);
    degree.clear();
    for (const e of edges2) {
      degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
      degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
    }
  }

  let nodes: ConceptGraphNode[] = concepts.map(c => {
    const row = usages.get(c.id);
    const usageUi = uiHits(row);
    const usageSurface = row?.surface ?? 0;
    const boards = boardsForConcept(c.id, boardMembership);
    return {
      id: c.id,
      label: c.label,
      nodeKind: 'concept' as const,
      domain: c.domain,
      domainLabel: DOMAIN_METADATA[c.domain].label,
      namespace: c.namespace,
      group: conceptGroupOf(c.id),
      provenance: conceptProvenance(c),
      usage: usageUi + usageSurface,
      usageUi,
      usageSurface,
      boards,
      kind: nodeUsageKind(usageUi, usageSurface),
      degree: degree.get(c.id) ?? 0,
      seeAlsoCount: (c.seeAlso ?? []).length,
    };
  });

  if (domainHubs) {
    for (const domain of hubDomains) {
      const hub = domainHubId(domain);
      if ((degree.get(hub) ?? 0) === 0) continue;
      nodes.push({
        id: hub,
        label: DOMAIN_METADATA[domain].label,
        nodeKind: 'domainHub',
        domain: 'hub',
        domainLabel: DOMAIN_METADATA[domain].label,
        namespace: 'hub',
        group: `domain.${domain}`,
        provenance: '',
        usage: 0,
        usageUi: 0,
        usageSurface: 0,
        boards: [],
        kind: 'hub',
        degree: degree.get(hub) ?? 0,
        seeAlsoCount: 0,
      });
    }
  }

  if (minDegree > 0) {
    const keepIds = new Set(
      nodes.filter(n => n.nodeKind === 'domainHub' || n.degree >= minDegree).map(n => n.id)
    );
    nodes = nodes.filter(n => keepIds.has(n.id));
    const edges2 = edges.filter(e => keepIds.has(e.source) && keepIds.has(e.target));
    edges.length = 0;
    edges.push(...edges2);
    degree.clear();
    for (const e of edges2) {
      degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
      degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
    }
    for (const n of nodes) n.degree = degree.get(n.id) ?? 0;
  }

  nodes.sort((a, b) => b.degree - a.degree || b.usage - a.usage || a.id.localeCompare(b.id));
  edges.sort(
    (a, b) =>
      a.source.localeCompare(b.source) ||
      a.target.localeCompare(b.target) ||
      a.kind.localeCompare(b.kind)
  );

  const conceptNodes = nodes.filter(n => n.nodeKind === 'concept');
  const domains = new Set(conceptNodes.map(n => n.domain));
  const namespaces = new Set(conceptNodes.map(n => n.namespace));
  const seeAlsoByLayer = emptySeeAlsoByLayer();
  let seeAlsoEdges = 0;
  for (const e of edges) {
    if (e.kind !== 'seeAlso' || !e.layer) continue;
    seeAlsoEdges += 1;
    seeAlsoByLayer[e.layer] += 1;
  }
  const surfaceEdgeCount = edges.filter(e => e.kind === 'surface').length;
  const groupEdgeCount = edges.filter(e => e.kind === 'group').length;
  const domainHubEdgeCount = edges.filter(e => e.kind === 'domainHub').length;

  const domainSummaryMap = new Map<string, { nodes: number; edges: number; usage: number }>();
  for (const n of conceptNodes) {
    const cur = domainSummaryMap.get(n.domain) ?? { nodes: 0, edges: 0, usage: 0 };
    cur.nodes += 1;
    cur.usage += n.usageUi;
    domainSummaryMap.set(n.domain, cur);
  }
  for (const e of edges) {
    if (e.kind !== 'seeAlso' && e.kind !== 'surface') continue;
    const a = conceptNodes.find(n => n.id === e.source);
    const b = conceptNodes.find(n => n.id === e.target);
    if (a && b && a.domain === b.domain) {
      const cur = domainSummaryMap.get(a.domain)!;
      cur.edges += 1;
    }
  }

  const boardSummaryMap = new Map<string, number>();
  for (const n of conceptNodes) {
    for (const board of n.boards) {
      boardSummaryMap.set(board, (boardSummaryMap.get(board) ?? 0) + 1);
    }
  }

  return {
    kind: 'concept-graph',
    schemaVersion: 3,
    generatedAt: new Date().toISOString(),
    focus: opts.focus,
    depth: opts.focus ? (opts.depth ?? 2) : undefined,
    summary: {
      nodes: nodes.length,
      edges: edges.length,
      seeAlsoEdges,
      seeAlsoByLayer,
      surfaceEdges: surfaceEdgeCount,
      groupEdges: groupEdgeCount,
      domainHubEdges: domainHubEdgeCount,
      domains: domains.size,
      namespaces: namespaces.size,
      used: conceptNodes.filter(n => n.kind === 'used').length,
      unused: conceptNodes.filter(n => n.kind === 'unused').length,
      surfaceOnly: conceptNodes.filter(n => n.kind === 'surface-only').length,
      totalUsage: conceptNodes.reduce((s, n) => s + n.usageUi, 0),
    },
    domainSummary: [...domainSummaryMap.entries()]
      .map(([domain, v]) => ({ domain, ...v }))
      .sort((a, b) => b.nodes - a.nodes || a.domain.localeCompare(b.domain)),
    boardSummary: [...boardSummaryMap.entries()]
      .map(([board, concepts]) => ({ board, concepts }))
      .sort((a, b) => b.concepts - a.concepts || a.board.localeCompare(b.board)),
    nodes,
    edges,
  };
}

/** Async builder — attaches live usage counts. */
export async function buildConceptGraphAsync(
  opts: ConceptGraphBuildOptions = {}
): Promise<ConceptGraph> {
  const usages = opts.usages ?? (await countPortalConceptUsagesDetailed());
  return buildConceptGraph({ ...opts, usages });
}

export function conceptGraphToMermaid(graph: ConceptGraph): string {
  const lines = ['flowchart LR'];
  for (const n of graph.nodes) {
    if (n.nodeKind === 'domainHub') {
      lines.push(`  ${JSON.stringify(n.id)}((${n.label}))`);
      continue;
    }
    const label = `${n.label}\\n(${n.domain})`.replace(/"/g, "'");
    lines.push(`  ${JSON.stringify(n.id)}["${label}"]`);
  }
  for (const e of graph.edges) {
    const arrow = e.kind === 'seeAlso' ? '-->' : e.kind === 'domainHub' ? '-.->' : '---';
    lines.push(`  ${JSON.stringify(e.source)} ${arrow} ${JSON.stringify(e.target)}`);
  }
  return `${lines.join('\n')}\n`;
}

export function conceptGraphToDot(graph: ConceptGraph): string {
  const lines = [
    'digraph concept_graph {',
    '  rankdir=LR;',
    '  node [shape=box, style=rounded, fontname="JetBrains Mono"];',
  ];
  for (const n of graph.nodes) {
    if (n.nodeKind === 'domainHub') {
      lines.push(
        `  "${n.id}" [shape=ellipse, style=filled, fillcolor="#30363d", label="${n.label}"];`
      );
      continue;
    }
    const label = `${n.label}\\n${n.id}\\n[${n.domain}] u=${n.usageUi}`.replace(/"/g, '\\"');
    lines.push(`  "${n.id}" [label="${label}"];`);
  }
  for (const e of graph.edges) {
    const style =
      e.kind === 'seeAlso'
        ? ''
        : e.kind === 'domainHub'
          ? ' [style=dashed]'
          : e.kind === 'surface'
            ? ' [color="#8b949e"]'
            : ' [style=dotted]';
    lines.push(`  "${e.source}" -> "${e.target}"${style};`);
  }
  lines.push('}');
  return `${lines.join('\n')}\n`;
}
