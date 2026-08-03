// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Semantic graph over registry concepts (seeAlso, mapsTo, deprecatedBy).
 */
import type { Database } from 'bun:sqlite';
import { listConcepts } from './repository.ts';
import type {
  ConceptEdgeType,
  ConceptGraph,
  GraphEdge,
  GraphNode,
  RegistryConcept,
} from './types.ts';

function addEdge(
  edges: GraphEdge[],
  seen: Set<string>,
  source: string,
  target: string,
  type: ConceptEdgeType
): void {
  if (!target || source === target) return;
  const key = `${source}\0${target}\0${type}`;
  if (seen.has(key)) return;
  seen.add(key);
  edges.push({ source, target, type });
}

export function buildConceptGraph(
  db: Database,
  opts: { includeArchived?: boolean } = {}
): ConceptGraph {
  const statuses = opts.includeArchived
    ? undefined
    : (['proposed', 'active', 'deprecated'] as const);
  const concepts = listConcepts(db, {
    status: statuses ? [...statuses] : undefined,
    limit: 20000,
  });
  const byId = new Map(concepts.map(c => [c.id, c]));
  const edges: GraphEdge[] = [];
  const seen = new Set<string>();

  for (const c of concepts) {
    for (const rel of c.seeAlso) {
      addEdge(edges, seen, c.id, rel, 'seeAlso');
    }
    if (c.mapsTo) addEdge(edges, seen, c.id, c.mapsTo, 'mapsTo');
    if (c.deprecatedBy) addEdge(edges, seen, c.id, c.deprecatedBy, 'deprecatedBy');
  }

  // Include dangling targets as nodes (stale mapsTo / seeAlso).
  const nodeIds = new Set(concepts.map(c => c.id));
  for (const e of edges) {
    nodeIds.add(e.source);
    nodeIds.add(e.target);
  }

  const degree = new Map<string, number>();
  for (const e of edges) {
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
  }

  const nodes: GraphNode[] = [...nodeIds].sort().map(id => {
    const c: RegistryConcept | undefined = byId.get(id);
    return {
      id,
      label: c?.label ?? id,
      group: c?.groupName ?? (id.split('.').slice(0, 2).join('.') || 'other'),
      category: c?.category ?? id.split('.')[0] ?? 'other',
      status: c?.status ?? 'active',
      degree: degree.get(id) ?? 0,
    };
  });

  return {
    nodes,
    edges,
    generatedAt: new Date().toISOString(),
  };
}

export function graphOrphans(graph: ConceptGraph): GraphNode[] {
  const touched = new Set<string>();
  for (const e of graph.edges) {
    touched.add(e.source);
    touched.add(e.target);
  }
  return graph.nodes.filter(n => !touched.has(n.id));
}

export function graphCentrality(
  graph: ConceptGraph,
  topN = 20
): Array<GraphNode & { degree: number }> {
  return [...graph.nodes]
    .map(n => ({ ...n, degree: n.degree ?? 0 }))
    .sort((a, b) => b.degree - a.degree || a.id.localeCompare(b.id))
    .slice(0, topN);
}

export function graphStaleEdges(graph: ConceptGraph): GraphEdge[] {
  const statusById = new Map(graph.nodes.map(n => [n.id, n.status]));
  return graph.edges.filter(e => {
    const t = statusById.get(e.target);
    return t === 'deprecated' || t === 'archived';
  });
}

export function graphToMermaid(graph: ConceptGraph, maxNodes = 80): string {
  const top = graphCentrality(graph, maxNodes).map(n => n.id);
  const allow = new Set(top);
  // Always include neighbors of top nodes that appear in edges among allow-set.
  const lines = ['flowchart LR'];
  for (const n of graph.nodes) {
    if (!allow.has(n.id)) continue;
    const safe = n.id.replace(/[^a-zA-Z0-9_]/g, '_');
    lines.push(`  ${safe}["${n.label.replace(/"/g, '\\"')}"]`);
  }
  for (const e of graph.edges) {
    if (!allow.has(e.source) || !allow.has(e.target)) continue;
    const s = e.source.replace(/[^a-zA-Z0-9_]/g, '_');
    const t = e.target.replace(/[^a-zA-Z0-9_]/g, '_');
    lines.push(`  ${s} -->|${e.type}| ${t}`);
  }
  return lines.join('\n');
}
