#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// scripts/concept-registry-graph.ts — semantic graph for the Concept Registry.
//
//   bun run concept:registry:graph                     # summary table
//   bun run concept:registry:graph -- --output json    # full { nodes, edges, summary }
//   bun run concept:registry:graph -- --output mermaid # Mermaid flowchart
//   bun run concept:registry:graph -- --orphans        # orphaned node ids (no edges)
//   bun run concept:registry:graph -- --centrality     # most-connected concepts
//
// Nodes = every concept; edges from seeAlso / mapsTo / deprecatedBy.

import { colorize, jsonOut, logTable } from '../lib/console-depth.ts';
import { buildConceptGraph } from '../lib/concept-registry/repo.ts';
import { renderConceptGraphMermaid } from '../lib/concept-registry/render.ts';
import { openConceptRegistryDb } from '../lib/concept-registry/schema.ts';

const db = openConceptRegistryDb();
const graph = buildConceptGraph(db);

function outputMode(): 'table' | 'json' | 'mermaid' {
  const i = Bun.argv.indexOf('--output');
  const value = i !== -1 ? Bun.argv[i + 1] : undefined;
  if (value === 'json') return 'json';
  if (value === 'mermaid') return 'mermaid';
  return 'table';
}

const mode = outputMode();

if (mode === 'json') {
  jsonOut(graph);
} else if (mode === 'mermaid') {
  console.log(renderConceptGraphMermaid(graph));
} else {
  console.log(
    colorize(
      `concept:registry:graph · nodes=${graph.summary.nodes} · edges=${graph.summary.edges} · orphans=${graph.summary.orphaned} · staleTargets=${graph.summary.staleTargets}`,
      '#3fb950'
    )
  );
  if (Bun.argv.includes('--centrality') || graph.summary.central.length > 0) {
    logTable(
      graph.summary.central.map(c => ({ id: c.id, degree: c.degree })),
      ['id', 'degree']
    );
  }
  if (Bun.argv.includes('--orphans')) {
    const connected = new Set<string>();
    for (const e of graph.edges) {
      connected.add(e.source);
      if (e.targetExists) connected.add(e.target);
    }
    const orphanIds = graph.nodes.filter(n => !connected.has(n.id)).map(n => n.id);
    console.log(colorize(`orphaned nodes (${orphanIds.length})`, '#8b949e'));
    for (const id of orphanIds.slice(0, 20)) console.log(`  · ${id}`);
    if (orphanIds.length > 20) console.log(`  · … +${orphanIds.length - 20} more`);
  }
}
