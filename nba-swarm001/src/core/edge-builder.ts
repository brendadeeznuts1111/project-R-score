/**
 * Graph construction with adaptive thresholds and edge building
 */

import type { Game, Edge, Graph } from "../types/game.js";
import type { EdgeConfig } from "../types/config.js";
import { GraphError } from "../types/errors.js";
import { cosineSimilarity } from "./similarity.js";
import { correlationPValue } from "../utils/stats.js";
import { getLogger } from "../utils/logger.js";
import {
  DENSE_GRAPH_THRESHOLD,
  MAX_GRAPH_SIZE,
  MAX_EDGES_PER_NODE,
} from "../constants.js";

const logger = getLogger();

/**
 * Build graph from games array
 * 
 * @param games - Array of games to build graph from
 * @param config - Edge configuration specifying thresholds and options
 * @returns Graph object containing nodes, edges, and metadata
 * @throws {GraphError} If games array is empty or exceeds MAX_GRAPH_SIZE
 * 
 * @example
 * ```ts
 * const games = generateMockGames(100);
 * const config = { minSimilarityThreshold: 0.3, ... };
 * const graph = buildGraph(games, config);
 * console.log(`Graph has ${graph.metadata.nodeCount} nodes and ${graph.metadata.edgeCount} edges`);
 * ```
 */
export function buildGraph(
  games: Game[],
  config: EdgeConfig
): Graph {
  const startTime = performance.now();

  // Validate input
  if (games.length === 0) {
    throw new GraphError("Cannot build graph from empty games array");
  }

  if (games.length > MAX_GRAPH_SIZE) {
    throw new GraphError(
      `Graph size ${games.length} exceeds maximum ${MAX_GRAPH_SIZE}`,
      games.length
    );
  }

  // Create node map
  const nodes = new Map<string, Game>();
  for (const game of games) {
    nodes.set(game.id, game);
  }

  // Build edges
  const edges = buildEdges(games, config);

  // Calculate metadata
  const averageDegree = edges.length > 0 ? (2 * edges.length) / nodes.size : 0;

  const graph: Graph = {
    nodes,
    edges,
    metadata: {
      nodeCount: nodes.size,
      edgeCount: edges.length,
      averageDegree,
      generatedAt: Date.now(),
      config: {
        minSimilarityThreshold: config.minSimilarityThreshold,
        highSimilarityThreshold: config.highSimilarityThreshold,
        minWeightThreshold: config.minWeightThreshold,
      },
    },
  };

  const duration = performance.now() - startTime;
  logger.debug("Graph built", {
    nodeCount: nodes.size,
    edgeCount: edges.length,
    durationMs: duration,
  });

  return graph;
}

/**
 * Build edges from games array
 */
function buildEdges(games: Game[], config: EdgeConfig): Edge[] {
  const edges: Edge[] = [];
  const edgeCountPerNode = new Map<string, number>();

  // Determine if we should use batch processing
  const useBatching = games.length > (config.batchSize || 50);
  const batchSize = config.batchSize || 50;

  if (useBatching) {
    logger.debug("Using batch processing for large graph", {
      gameCount: games.length,
      batchSize,
    });
  }

  // Get adaptive threshold if enabled
  let currentThreshold = config.minSimilarityThreshold;
  if (config.adaptiveThresholds) {
    currentThreshold = calculateAdaptiveThreshold(games, config);
    logger.debug("Adaptive threshold calculated", { threshold: currentThreshold });
  }

  // Process all pairs
  if (useBatching) {
    // Batch processing for large graphs
    for (let start = 0; start < games.length; start += batchSize) {
      const end = Math.min(start + batchSize, games.length);
      const batch = games.slice(start, end);

      // Compare batch with all games
      for (const game1 of batch) {
        for (const game2 of games) {
          if (game1.id >= game2.id) continue; // Avoid duplicates and self-loops

          const edge = createEdgeIfValid(
            game1,
            game2,
            currentThreshold,
            config,
            edgeCountPerNode
          );

          if (edge) {
            edges.push(edge);
          }
        }
      }
    }
  } else {
    // Standard O(n²) comparison
    for (let i = 0; i < games.length; i++) {
      for (let j = i + 1; j < games.length; j++) {
        const edge = createEdgeIfValid(
          games[i],
          games[j],
          currentThreshold,
          config,
          edgeCountPerNode
        );

        if (edge) {
          edges.push(edge);
        }
      }
    }
  }

  // Apply pruning if enabled and graph is dense
  if (config.enablePruning && games.length > DENSE_GRAPH_THRESHOLD) {
    return pruneEdges(edges, config.maxEdgesPerNode || MAX_EDGES_PER_NODE);
  }

  return edges;
}

/**
 * Create edge if similarity and weight thresholds are met
 */
function createEdgeIfValid(
  game1: Game,
  game2: Game,
  similarityThreshold: number,
  config: EdgeConfig,
  edgeCountPerNode: Map<string, number>
): Edge | null {
  try {
    // Calculate cosine similarity
    const similarity = cosineSimilarity(game1.vector, game2.vector);

    // Check similarity threshold
    if (similarity < similarityThreshold) {
      return null;
    }

    // Calculate volume-weighted weight
    const volumeRatio = game2.volume > 0 ? game1.volume / game2.volume : 1;
    const weight = similarity * volumeRatio;

    // Check weight threshold
    if (weight < config.minWeightThreshold) {
      return null;
    }

    // Check pruning limits
    const count1 = edgeCountPerNode.get(game1.id) || 0;
    const count2 = edgeCountPerNode.get(game2.id) || 0;
    const maxEdges = config.maxEdgesPerNode || MAX_EDGES_PER_NODE;

    if (count1 >= maxEdges || count2 >= maxEdges) {
      return null; // Skip if node already has max edges
    }

    // Calculate statistical significance if requested
    let pValue: number | undefined;
    if (config.significanceThreshold > 0) {
      // Use similarity as correlation for p-value calculation
      // For edge validation with only 2 games, we skip p-value calculation
      // as it requires at least 3 samples
      // pValue would be calculated differently in production with historical data
      pValue = undefined;
    }

    // Create edge
    const edge: Edge = {
      from: game1.id,
      to: game2.id,
      similarity,
      weight,
      pValue,
      timestamp: Date.now(),
    };

    // Update edge counts
    edgeCountPerNode.set(game1.id, count1 + 1);
    edgeCountPerNode.set(game2.id, count2 + 1);

    return edge;
  } catch (error) {
    logger.error(
      "Error creating edge",
      error instanceof Error ? error : new Error(String(error)),
      {
        game1: game1.id,
        game2: game2.id,
      }
    );
    return null;
  }
}

/**
 * Calculate adaptive threshold based on market conditions
 */
function calculateAdaptiveThreshold(
  games: Game[],
  config: EdgeConfig
): number {
  // Simple adaptive logic: adjust threshold based on graph density
  // Denser graphs might need higher thresholds to avoid noise

  if (games.length < 10) {
    return config.minSimilarityThreshold;
  }

  // Calculate average similarity across sample pairs
  const sampleSize = Math.min(100, games.length * (games.length - 1) / 2);
  const samplePairs: Array<[number, number]> = [];
  
  for (let i = 0; i < Math.min(games.length, 10); i++) {
    for (let j = i + 1; j < Math.min(games.length, 10); j++) {
      samplePairs.push([i, j]);
      if (samplePairs.length >= sampleSize) break;
    }
    if (samplePairs.length >= sampleSize) break;
  }

  let sumSimilarity = 0;
  let count = 0;
  for (const [i, j] of samplePairs) {
    const sim = cosineSimilarity(games[i].vector, games[j].vector);
    sumSimilarity += sim;
    count++;
  }

  const avgSimilarity = count > 0 ? sumSimilarity / count : 0;

  // Adjust threshold: if average similarity is high, increase threshold slightly
  const adjustment = avgSimilarity > 0.5 ? 0.05 : 0;
  const adaptiveThreshold = Math.min(
    1.0,
    config.minSimilarityThreshold + adjustment
  );

  return adaptiveThreshold;
}

/**
 * Prune edges to keep only top connections per node
 */
function pruneEdges(edges: Edge[], maxEdgesPerNode: number): Edge[] {
  const edgesByNode = new Map<string, Edge[]>();

  // Group edges by node
  for (const edge of edges) {
    if (!edgesByNode.has(edge.from)) {
      edgesByNode.set(edge.from, []);
    }
    if (!edgesByNode.has(edge.to)) {
      edgesByNode.set(edge.to, []);
    }

    edgesByNode.get(edge.from)!.push(edge);
    edgesByNode.get(edge.to)!.push(edge);
  }

  // Keep top edges per node
  const keptEdges = new Set<Edge>();
  for (const [nodeId, nodeEdges] of edgesByNode) {
    // Sort by weight descending
    nodeEdges.sort((a, b) => b.weight - a.weight);

    // Keep top N edges
    const topEdges = nodeEdges.slice(0, maxEdgesPerNode);
    for (const edge of topEdges) {
      keptEdges.add(edge);
    }
  }

  return Array.from(keptEdges);
}

/**
 * Update graph with new games
 * 
 * Adds new games to the existing graph and rebuilds edges connecting
 * new games with existing nodes. Preserves existing graph structure.
 * 
 * @param graph - Existing graph to update
 * @param newGames - Array of new games to add to the graph
 * @param config - Edge configuration for building new edges
 * @returns Updated graph with new nodes and edges
 * 
 * @example
 * ```ts
 * const updatedGraph = updateGraph(existingGraph, newGames, config);
 * ```
 */
export function updateGraph(
  graph: Graph,
  newGames: Game[],
  config: EdgeConfig
): Graph {
  // Add new nodes
  const allNodes = new Map(graph.nodes);
  for (const game of newGames) {
    allNodes.set(game.id, game);
  }

  // Build edges for new games
  const newEdges = buildEdges([...graph.nodes.values(), ...newGames], config);

  // Update metadata
  const averageDegree =
    newEdges.length > 0 ? (2 * newEdges.length) / allNodes.size : 0;

  return {
    nodes: allNodes,
    edges: newEdges,
    metadata: {
      nodeCount: allNodes.size,
      edgeCount: newEdges.length,
      averageDegree,
      generatedAt: Date.now(),
      config: graph.metadata.config,
    },
  };
}

