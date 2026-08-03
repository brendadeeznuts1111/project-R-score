#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// scripts/concept-registry-graph.ts — semantic graph for the Concept Registry.
//
//   bun run concept:registry:graph              # summary table
//   bun run concept:registry:graph -- --output json   # full { nodes, edges, summary }
//
// Nodes = every concept; edges from seeAlso / mapsTo / deprecatedBy.

import { colorize, jsonOut, logTable } from '../lib/console-depth.ts';
import { buildConceptGraph } from '../lib/concept-registry/repo.ts';
import { openConceptRegistryDb } from '../lib/concept-registry/schema.ts';

const db = openConceptRegistryDb();
const graph = buildConceptGraph(db);

if (Bun.argv.includes('--output') && Bun.argv[Bun.argv.indexOf('--output') + 1] === 'json') {
  jsonOut(graph);
} else {
  console.log(
    colorize(
      `concept:registry:graph · nodes=${graph.summary.nodes} · edges=${graph.summary.edges} · orphans=${graph.summary.orphaned} · staleTargets=${graph.summary.staleTargets}`,
      '#3fb950'
    )
  );
  if (graph.summary.central.length > 0) {
    logTable(
      graph.summary.central.map(c => ({ id: c.id, degree: c.degree })),
      ['id', 'degree']
    );
  }
}
