/**
 * Floating-point drift validation
 */

import { cosineSimilarity } from "../src/core/similarity.js";
import { cosineSimilarityWithDriftCheck } from "../src/core/similarity.js";
import { loadConfig } from "../src/types/config.js";
import { buildGraph } from "../src/core/edge-builder.js";
import { generateMockGames } from "../packages/data/mock-generator.js";
import { DRIFT_TOLERANCE } from "../src/constants.js";
import { getLogger } from "../src/utils/logger.js";

const logger = getLogger();

/**
 * Validate edges for floating-point drift
 */
export function validateEdgeDrift(graph: ReturnType<typeof buildGraph>) {
  const errors: string[] = [];
  const driftedEdges: Array<{ edge: any; driftAmount: number }> = [];

  for (const edge of graph.edges) {
    const game1 = graph.nodes.get(edge.from);
    const game2 = graph.nodes.get(edge.to);

    if (!game1 || !game2) {
      errors.push(`❌ Edge references missing nodes: ${edge.from} -> ${edge.to}`);
      continue;
    }

    // Recalculate similarity
    const result = cosineSimilarityWithDriftCheck(
      game1.vector,
      game2.vector,
      edge.similarity
    );

    if (result.drifted) {
      driftedEdges.push({
        edge,
        driftAmount: result.driftAmount,
      });
      errors.push(
        `❌ Edge drift detected: ${edge.from} -> ${edge.to}, drift: ${result.driftAmount.toExponential(2)}`
      );
    }
  }

  return {
    errors,
    driftedEdges,
    totalEdges: graph.edges.length,
    driftedCount: driftedEdges.length,
  };
}

/**
 * Run validation on test data
 */
function runValidation() {
  console.log("=".repeat(50));
  console.log("Floating-Point Drift Validation");
  console.log("=".repeat(50));
  console.log();

  const config = loadConfig().edge;
  const games = generateMockGames(50);
  
  console.log(`Building graph with ${games.length} games...`);
  const graph = buildGraph(games, config);
  console.log(`Built graph with ${graph.edges.length} edges`);
  console.log();

  console.log("Validating edges for drift...");
  const validation = validateEdgeDrift(graph);

  console.log(`Total edges: ${validation.totalEdges}`);
  console.log(`Drifted edges: ${validation.driftedCount}`);
  console.log(`Drift tolerance: ${DRIFT_TOLERANCE}`);
  console.log();

  if (validation.errors.length === 0) {
    console.log("✅ No drift detected - all edges are consistent");
  } else {
    console.log(`❌ Found ${validation.errors.length} drift issues:`);
    validation.errors.slice(0, 10).forEach((error) => {
      console.log(`  ${error}`);
    });
    if (validation.errors.length > 10) {
      console.log(`  ... and ${validation.errors.length - 10} more`);
    }
  }

  console.log();
  console.log("=".repeat(50));

  return validation.errors.length === 0 ? 0 : 1;
}

// Run validation if executed directly
if (import.meta.main) {
  const exitCode = runValidation();
  process.exit(exitCode);
}

export { validateEdgeDrift };

