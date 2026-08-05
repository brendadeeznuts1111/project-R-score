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
  API_INFRA_CONCEPTS,
  LIMIT_FIELD_CONCEPTS,
  LIMIT_SURFACE_CONCEPTS,
  PARTNER_HISTORY_SURFACE_CONCEPTS,
  PARTNERS_SURFACE_CONCEPTS,
  PORTAL_SEMANTIC_CONCEPTS,
  TENNIS_SURFACE_CONCEPTS,
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

export type SeeAlsoByLayer = Record<SeeAlsoLayer, number>;

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
  /** Incident seeAlso edges by derived layer. */
  seeAlsoByLayer: SeeAlsoByLayer;
  /** crossDomain + pageBridge incident seeAlso count (bridge richness). */
  bridgeScore: number;
  /** Connected-component cluster over seeAlso (excl. pageBridge). */
  clusterId: string; // brand-ok — cluster:* opaque key
  /** Incident seeAlso degree (undirected). */
  seeAlsoDegree: number;
  /** Normalized betweenness centrality on seeAlso graph (0–1). */
  betweenness: number;
};

export type ConceptGraphEdge = {
  source: string; // brand-ok — concept/hub id
  target: string; // brand-ok — concept/hub id
  kind: ConceptGraphEdgeKind;
  weight: number;
  /** Present when kind === 'seeAlso'. */
  layer?: SeeAlsoLayer;
};

export type WeightedPathResult = {
  path: string[];
  cost: number;
  /** Product of edge weights along the path (higher = stronger). */
  strength: number;
  layers: SeeAlsoLayer[];
};

export type ConceptRecommendation = {
  id: string; // brand-ok — concept id
  label: string;
  hop: number;
  score: number;
  path: string[];
  pathCost: number;
  layers: SeeAlsoLayer[];
};

export type ConceptEgoAnalysis = {
  id: string; // brand-ok — focus concept id
  depth: number;
  hopCounts: Record<string, number>;
  layerMix: SeeAlsoByLayer;
  /** seeAlso edges crossing into each hop ring from the previous ring. */
  layerMixByHop: Array<{ hop: number; layers: SeeAlsoByLayer }>;
  bridgeScore: number;
  recommendations: ConceptRecommendation[];
};

export type ConceptCluster = {
  id: string; // brand-ok — cluster:* opaque key
  size: number;
  domain: string;
  hubs: string[];
};

export type ConceptCorridor = {
  fromDomain: string;
  toDomain: string;
  edges: number;
  /** Top bridge concept ids on this corridor. */
  bridges: string[];
};

export type ConceptGraphReport = {
  clusters: ConceptCluster[];
  corridors: ConceptCorridor[];
  topBridges: Array<{
    id: string; // brand-ok — glossary concept key
    label: string;
    bridgeScore: number;
    betweenness: number;
  }>;
  topCentral: Array<{
    id: string; // brand-ok — glossary concept key
    label: string;
    betweenness: number;
    seeAlsoDegree: number;
  }>;
};

export type ConceptGraph = {
  kind: 'concept-graph';
  schemaVersion: 5;
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
    /** Concepts with bridgeScore > 0. */
    bridges: number;
    clusters: number;
    corridors: number;
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
  clusters: ConceptCluster[];
  corridors: ConceptCorridor[];
  report: ConceptGraphReport;
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
  { board: 'api-infra', map: API_INFRA_CONCEPTS as Record<string, string> },
  { board: 'health-fields', map: HEALTH_FIELD_CONCEPTS as Record<string, string> },
  { board: 'tennis', map: TENNIS_SURFACE_CONCEPTS as Record<string, string> },
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

/** Undirected shortest path (hop count) between two concept ids. */
export function shortestPath(
  edges: readonly ConceptGraphEdge[],
  from: string,
  to: string,
  filter?: EgoEdgeFilter
): string[] | null {
  if (from === to) return [from];
  const adj = undirectedAdj(edges, filter);
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

/** Edge traversal cost — lower prefers stronger seeAlso layers. */
export function edgeTraversalCost(e: ConceptGraphEdge): number {
  if (e.kind === 'seeAlso') {
    const w = e.layer ? SEE_ALSO_LAYER_WEIGHTS[e.layer] : 1;
    return 1 / Math.max(w, 0.25);
  }
  if (e.kind === 'surface') return 2;
  if (e.kind === 'group') return 2.5;
  return 3; // domainHub
}

type WeightedAdjEdge = { to: string; cost: number; weight: number; layer?: SeeAlsoLayer };

function weightedAdj(
  edges: readonly ConceptGraphEdge[],
  filter?: EgoEdgeFilter
): Map<string, WeightedAdjEdge[]> {
  const adj = new Map<string, WeightedAdjEdge[]>();
  const push = (from: string, to: string, e: ConceptGraphEdge) => {
    const list = adj.get(from) ?? [];
    list.push({
      to,
      cost: edgeTraversalCost(e),
      weight: e.weight || 1,
      layer: e.kind === 'seeAlso' ? e.layer : undefined,
    });
    adj.set(from, list);
  };
  for (const e of edges) {
    if (!edgePassesFilter(e, filter)) continue;
    push(e.source, e.target, e);
    push(e.target, e.source, e);
  }
  return adj;
}

/**
 * Dijkstra shortest path preferring stronger seeAlso layers (lower cost).
 */
export function shortestPathWeighted(
  edges: readonly ConceptGraphEdge[],
  from: string,
  to: string,
  filter?: EgoEdgeFilter
): WeightedPathResult | null {
  if (from === to) return { path: [from], cost: 0, strength: 1, layers: [] };
  const adj = weightedAdj(edges, filter);
  const dist = new Map<string, number>([[from, 0]]);
  const strength = new Map<string, number>([[from, 1]]);
  const prev = new Map<string, { id: string; layer?: SeeAlsoLayer } | null>([[from, null]]); // brand-ok — glossary concept key
  const pending = new Set<string>([from]);

  while (pending.size > 0) {
    let cur: string | null = null;
    let best = Infinity;
    for (const id of pending) {
      const d = dist.get(id) ?? Infinity;
      if (d < best) {
        best = d;
        cur = id;
      }
    }
    if (cur == null) break;
    pending.delete(cur);
    if (cur === to) break;
    for (const edge of adj.get(cur) ?? []) {
      const nextCost = best + edge.cost;
      const prevCost = dist.get(edge.to);
      if (prevCost !== undefined && nextCost >= prevCost) continue;
      dist.set(edge.to, nextCost);
      strength.set(edge.to, (strength.get(cur) ?? 1) * edge.weight);
      prev.set(edge.to, { id: cur, layer: edge.layer });
      pending.add(edge.to);
    }
  }

  if (!dist.has(to)) return null;
  const path = [to];
  const layers: SeeAlsoLayer[] = [];
  let walk: string | null = to;
  while (walk && walk !== from) {
    const step = prev.get(walk);
    if (!step) break;
    if (step.layer) layers.push(step.layer);
    path.push(step.id);
    walk = step.id;
  }
  path.reverse();
  layers.reverse();
  return {
    path,
    cost: dist.get(to) ?? Infinity,
    strength: strength.get(to) ?? 0,
    layers,
  };
}

/**
 * Ego analysis — hop rings, layer mix, and second-order recommendations.
 */
export function analyzeConceptEgo(
  graph: ConceptGraph,
  focus: string,
  depth = 2,
  filter?: EgoEdgeFilter,
  recommendLimit = 8
): ConceptEgoAnalysis | null {
  const focusNode = graph.nodes.find(n => n.id === focus);
  if (!focusNode) return null;

  const seeAlsoFilter: EgoEdgeFilter = filter ?? { kinds: ['seeAlso'] };
  const distances = egoNeighborhoodDistances(graph.edges, focus, depth, seeAlsoFilter);
  const hopCounts: Record<string, number> = {};
  for (let h = 0; h <= depth; h++) hopCounts[String(h)] = 0;
  for (const hop of distances.values()) {
    hopCounts[String(hop)] = (hopCounts[String(hop)] ?? 0) + 1;
  }

  const layerMix = emptySeeAlsoByLayer();
  for (const e of graph.edges) {
    if (e.kind !== 'seeAlso' || !e.layer) continue;
    if (!edgePassesFilter(e, seeAlsoFilter)) continue;
    if (!distances.has(e.source) || !distances.has(e.target)) continue;
    layerMix[e.layer] += 1;
  }

  const layerMixByHop: Array<{ hop: number; layers: SeeAlsoByLayer }> = [];
  for (let h = 1; h <= depth; h++) {
    const ring = emptySeeAlsoByLayer();
    for (const e of graph.edges) {
      if (e.kind !== 'seeAlso' || !e.layer) continue;
      if (!edgePassesFilter(e, seeAlsoFilter)) continue;
      const ds = distances.get(e.source);
      const dt = distances.get(e.target);
      if (ds == null || dt == null) continue;
      if ((ds === h && dt === h - 1) || (dt === h && ds === h - 1)) {
        ring[e.layer] += 1;
      }
    }
    layerMixByHop.push({ hop: h, layers: ring });
  }

  // Score hop-2 concepts along the BFS path (keeps hop length = 2; no weighted detours).
  const edgeLookup = new Map<string, ConceptGraphEdge>();
  for (const e of graph.edges) {
    if (!edgePassesFilter(e, seeAlsoFilter)) continue;
    const a = e.source < e.target ? e.source : e.target;
    const b = e.source < e.target ? e.target : e.source;
    edgeLookup.set(`${a}->${b}`, e);
  }
  const findEdge = (x: string, y: string) => {
    const a = x < y ? x : y;
    const b = x < y ? y : x;
    return edgeLookup.get(`${a}->${b}`);
  };

  const recommendations: ConceptRecommendation[] = [];
  for (const [id, hop] of distances) {
    if (hop !== 2) continue;
    const node = graph.nodes.find(n => n.id === id);
    if (!node || node.nodeKind !== 'concept') continue;
    const path = shortestPath(graph.edges, focus, id, seeAlsoFilter);
    if (!path || path.length !== 3) continue; // exactly 2 hops
    let strength = 1;
    let cost = 0;
    const layers: SeeAlsoLayer[] = [];
    for (let i = 0; i < path.length - 1; i++) {
      const e = findEdge(path[i]!, path[i + 1]!);
      if (!e) continue;
      strength *= e.weight || 1;
      cost += edgeTraversalCost(e);
      if (e.layer) layers.push(e.layer);
    }
    recommendations.push({
      id,
      label: node.label,
      hop,
      score: strength,
      path,
      pathCost: cost,
      layers,
    });
  }
  recommendations.sort(
    (a, b) => b.score - a.score || a.pathCost - b.pathCost || a.id.localeCompare(b.id)
  );

  return {
    id: focus,
    depth,
    hopCounts,
    layerMix,
    layerMixByHop,
    bridgeScore: focusNode.bridgeScore,
    recommendations: recommendations.slice(0, recommendLimit),
  };
}

/** Union-Find clusters over sameGroup+crossGroup seeAlso (tight communities). */
export function computeSeeAlsoClusters(
  conceptIds: readonly string[],
  edges: readonly ConceptGraphEdge[]
): Map<string, string> {
  const parent = new Map<string, string>();
  const rank = new Map<string, number>();
  for (const id of conceptIds) {
    parent.set(id, id);
    rank.set(id, 0);
  }
  const find = (x: string): string => {
    let cur = x;
    while (parent.get(cur) !== cur) {
      const p = parent.get(cur)!;
      parent.set(cur, parent.get(p)!);
      cur = p;
    }
    return cur;
  };
  const unite = (a: string, b: string) => {
    let ra = find(a);
    let rb = find(b);
    if (ra === rb) return;
    const raRank = rank.get(ra) ?? 0;
    const rbRank = rank.get(rb) ?? 0;
    if (raRank < rbRank) [ra, rb] = [rb, ra];
    parent.set(rb, ra);
    if (raRank === rbRank) rank.set(ra, raRank + 1);
  };

  for (const e of edges) {
    if (e.kind !== 'seeAlso') continue;
    if (e.layer !== 'sameGroup' && e.layer !== 'crossGroup') continue;
    if (!parent.has(e.source) || !parent.has(e.target)) continue;
    unite(e.source, e.target);
  }

  const out = new Map<string, string>();
  for (const id of conceptIds) {
    const root = find(id);
    out.set(id, `cluster:${root}`);
  }
  return out;
}

/**
 * Brandes betweenness on undirected seeAlso graph; values normalized to [0, 1].
 */
export function computeSeeAlsoBetweenness(
  conceptIds: readonly string[],
  edges: readonly ConceptGraphEdge[]
): Map<string, number> {
  const ids = [...conceptIds];
  const adj = new Map<string, string[]>();
  for (const id of ids) adj.set(id, []);
  for (const e of edges) {
    if (e.kind !== 'seeAlso') continue;
    if (!adj.has(e.source) || !adj.has(e.target)) continue;
    adj.get(e.source)!.push(e.target);
    adj.get(e.target)!.push(e.source);
  }

  const raw = new Map<string, number>();
  for (const id of ids) raw.set(id, 0);

  for (const s of ids) {
    const stack: string[] = [];
    const pred = new Map<string, string[]>();
    const sigma = new Map<string, number>();
    const dist = new Map<string, number>();
    for (const id of ids) {
      pred.set(id, []);
      sigma.set(id, 0);
      dist.set(id, -1);
    }
    sigma.set(s, 1);
    dist.set(s, 0);
    const queue = [s];
    for (let qi = 0; qi < queue.length; qi++) {
      const v = queue[qi]!;
      stack.push(v);
      for (const w of adj.get(v) ?? []) {
        if ((dist.get(w) ?? -1) < 0) {
          dist.set(w, (dist.get(v) ?? 0) + 1);
          queue.push(w);
        }
        if (dist.get(w) === (dist.get(v) ?? 0) + 1) {
          sigma.set(w, (sigma.get(w) ?? 0) + (sigma.get(v) ?? 0));
          pred.get(w)!.push(v);
        }
      }
    }
    const delta = new Map<string, number>();
    for (const id of ids) delta.set(id, 0);
    while (stack.length > 0) {
      const w = stack.pop()!;
      for (const v of pred.get(w) ?? []) {
        const sw = sigma.get(w) ?? 1;
        const share = ((sigma.get(v) ?? 0) / sw) * (1 + (delta.get(w) ?? 0));
        delta.set(v, (delta.get(v) ?? 0) + share);
      }
      if (w !== s) raw.set(w, (raw.get(w) ?? 0) + (delta.get(w) ?? 0));
    }
  }

  // Undirected: each pair counted twice
  for (const id of ids) raw.set(id, (raw.get(id) ?? 0) / 2);

  const n = ids.length;
  const denom = n > 2 ? (n - 1) * (n - 2) : 1;
  const out = new Map<string, number>();
  for (const id of ids) {
    out.set(id, (raw.get(id) ?? 0) / denom);
  }
  return out;
}

/** Cross-domain seeAlso corridors with top bridge concepts. */
export function computeDomainCorridors(
  nodes: readonly ConceptGraphNode[],
  edges: readonly ConceptGraphEdge[],
  limit = 12
): ConceptCorridor[] {
  const byId = new Map(nodes.filter(n => n.nodeKind === 'concept').map(n => [n.id, n]));
  type Acc = { edges: number; bridgeHits: Map<string, number> };
  const map = new Map<string, Acc>();

  for (const e of edges) {
    if (e.kind !== 'seeAlso' || e.layer !== 'crossDomain') continue;
    const a = byId.get(e.source);
    const b = byId.get(e.target);
    if (!a || !b || a.domain === b.domain) continue;
    const d1 = a.domain < b.domain ? a.domain : b.domain;
    const d2 = a.domain < b.domain ? b.domain : a.domain;
    const key = `${d1}|${d2}`;
    const acc = map.get(key) ?? { edges: 0, bridgeHits: new Map() };
    acc.edges += 1;
    acc.bridgeHits.set(a.id, (acc.bridgeHits.get(a.id) ?? 0) + 1);
    acc.bridgeHits.set(b.id, (acc.bridgeHits.get(b.id) ?? 0) + 1);
    map.set(key, acc);
  }

  const corridors: ConceptCorridor[] = [...map.entries()].map(([key, acc]) => {
    const [fromDomain, toDomain] = key.split('|') as [string, string];
    const bridges = [...acc.bridgeHits.entries()]
      .sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
      .slice(0, 5)
      .map(([id]) => id);
    return { fromDomain, toDomain, edges: acc.edges, bridges };
  });
  corridors.sort((a, b) => b.edges - a.edges || a.fromDomain.localeCompare(b.fromDomain));
  return corridors.slice(0, limit);
}

export function buildConceptGraphReport(
  nodes: readonly ConceptGraphNode[],
  clusters: readonly ConceptCluster[],
  corridors: readonly ConceptCorridor[]
): ConceptGraphReport {
  const concepts = nodes.filter(n => n.nodeKind === 'concept');
  const topBridges = [...concepts]
    .filter(n => n.bridgeScore > 0)
    .sort((a, b) => b.bridgeScore - a.bridgeScore || b.betweenness - a.betweenness)
    .slice(0, 10)
    .map(n => ({
      id: n.id,
      label: n.label,
      bridgeScore: n.bridgeScore,
      betweenness: n.betweenness,
    }));
  const topCentral = [...concepts]
    .sort((a, b) => b.betweenness - a.betweenness || b.seeAlsoDegree - a.seeAlsoDegree)
    .slice(0, 10)
    .map(n => ({
      id: n.id,
      label: n.label,
      betweenness: n.betweenness,
      seeAlsoDegree: n.seeAlsoDegree,
    }));
  return {
    clusters: [...clusters].sort((a, b) => b.size - a.size).slice(0, 16),
    corridors: [...corridors],
    topBridges,
    topCentral,
  };
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

  const nodeLayer = new Map<string, SeeAlsoByLayer>();
  const nodeBridge = new Map<string, number>();
  for (const e of edges) {
    if (e.kind !== 'seeAlso' || !e.layer) continue;
    for (const end of [e.source, e.target]) {
      const layers = nodeLayer.get(end) ?? emptySeeAlsoByLayer();
      layers[e.layer] += 1;
      nodeLayer.set(end, layers);
      if (e.layer === 'crossDomain' || e.layer === 'pageBridge') {
        nodeBridge.set(end, (nodeBridge.get(end) ?? 0) + 1);
      }
    }
  }

  let nodes: ConceptGraphNode[] = concepts.map(c => {
    const row = usages.get(c.id);
    const usageUi = uiHits(row);
    const usageSurface = row?.surface ?? 0;
    const boards = boardsForConcept(c.id, boardMembership);
    const seeAlsoByLayer = nodeLayer.get(c.id) ?? emptySeeAlsoByLayer();
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
      seeAlsoByLayer,
      bridgeScore: nodeBridge.get(c.id) ?? 0,
      clusterId: '',
      seeAlsoDegree: 0,
      betweenness: 0,
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
        seeAlsoByLayer: emptySeeAlsoByLayer(),
        bridgeScore: 0,
        clusterId: '',
        seeAlsoDegree: 0,
        betweenness: 0,
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

  // Deep analytics: clusters · betweenness · seeAlso degree
  {
    const conceptIds = nodes.filter(n => n.nodeKind === 'concept').map(n => n.id);
    const clustersMap = computeSeeAlsoClusters(conceptIds, edges);
    const betweennessMap = computeSeeAlsoBetweenness(conceptIds, edges);
    const seeAlsoDeg = new Map<string, number>();
    for (const e of edges) {
      if (e.kind !== 'seeAlso') continue;
      seeAlsoDeg.set(e.source, (seeAlsoDeg.get(e.source) ?? 0) + 1);
      seeAlsoDeg.set(e.target, (seeAlsoDeg.get(e.target) ?? 0) + 1);
    }
    for (const n of nodes) {
      if (n.nodeKind !== 'concept') continue;
      n.clusterId = clustersMap.get(n.id) ?? `cluster:${n.id}`;
      n.betweenness = betweennessMap.get(n.id) ?? 0;
      n.seeAlsoDegree = seeAlsoDeg.get(n.id) ?? 0;
    }
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

  const clusterBuckets = new Map<string, ConceptGraphNode[]>();
  for (const n of conceptNodes) {
    const list = clusterBuckets.get(n.clusterId) ?? [];
    list.push(n);
    clusterBuckets.set(n.clusterId, list);
  }
  const clusters: ConceptCluster[] = [...clusterBuckets.entries()].map(([id, members]) => {
    const domainCounts = new Map<string, number>();
    for (const m of members) {
      domainCounts.set(m.domain, (domainCounts.get(m.domain) ?? 0) + 1);
    }
    const domain =
      [...domainCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ??
      'tbd';
    const hubs = [...members]
      .sort((a, b) => b.betweenness - a.betweenness || b.seeAlsoDegree - a.seeAlsoDegree)
      .slice(0, 3)
      .map(m => m.id);
    return { id, size: members.length, domain, hubs };
  });
  clusters.sort((a, b) => b.size - a.size || a.id.localeCompare(b.id));

  const corridors = computeDomainCorridors(nodes, edges);
  const report = buildConceptGraphReport(nodes, clusters, corridors);

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
    schemaVersion: 5,
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
      bridges: conceptNodes.filter(n => n.bridgeScore > 0).length,
      clusters: clusters.filter(c => c.size > 1).length,
      corridors: corridors.length,
    },
    domainSummary: [...domainSummaryMap.entries()]
      .map(([domain, v]) => ({ domain, ...v }))
      .sort((a, b) => b.nodes - a.nodes || a.domain.localeCompare(b.domain)),
    boardSummary: [...boardSummaryMap.entries()]
      .map(([board, concepts]) => ({ board, concepts }))
      .sort((a, b) => b.concepts - a.concepts || a.board.localeCompare(b.board)),
    clusters,
    corridors,
    report,
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
