// lib/concept-registry/render.ts — graph presentation helpers (CLI + future dashboard).
import type { ConceptGraph } from './types.ts';

/** Render the concept graph as a Mermaid `flowchart LR` diagram. */
export function renderConceptGraphMermaid(graph: ConceptGraph): string {
  const lines: string[] = ['flowchart LR'];
  const labels = new Map(graph.nodes.map(n => [n.id, (n.label ?? n.id).replace(/"/g, "'")]));
  const labelOf = (id: string) => `${id}["${labels.get(id) ?? id}"]`; // brand-ok — glossary concept key
  for (const edge of graph.edges) {
    if (!edge.targetExists) {
      lines.push(`  %% stale ${edge.type}: target "${edge.target}" not in registry`);
      lines.push(`  ${labelOf(edge.source)} -->|${edge.type}| "${edge.target}"`);
      continue;
    }
    lines.push(`  ${labelOf(edge.source)} -->|${edge.type}| ${labelOf(edge.target)}`);
  }
  return lines.join('\n');
}
