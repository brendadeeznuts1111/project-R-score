/**
 * Core type definitions for NBA Swarm system
 */

/**
 * SharpVector represents a 14-dimensional vector capturing betting patterns
 * Dimensions:
 * 0: buyBackPressure - Sharp buyback activity (0-1)
 * 1: publicPct - Public betting percentage (0-1)
 * 2: moneyPct - Money percentage (0-1)
 * 3: lineMovement - Line movement strength (-1 to 1)
 * 4: volumeRatio - Volume ratio vs average (0-∞)
 * 5: sharpIndicator - Sharp betting indicator (0-1)
 * 6: publicIndicator - Public betting indicator (0-1)
 * 7: marketEfficiency - Market efficiency score (0-1)
 * 8: edgeStrength - Calculated edge strength (0-1)
 * 9: timeDecay - Time-based decay factor (0-1)
 * 10: localBetVolumePct - Local betting volume percentage (0-1)
 * 11: sharpMoveProbability - Probability of sharp move (0-1)
 * 12: publicFadeStrength - Public fade strength (0-1)
 * 13: correlationScore - Correlation with other games (0-1)
 */
export type SharpVector = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number
];

/**
 * Game represents a single NBA game with betting data
 */
export interface Game {
  /** Unique game identifier */
  id: string;
  /** Game metadata */
  homeTeam: string;
  awayTeam: string;
  /** Game timestamp */
  timestamp: number;
  /** Betting volume in USD */
  volume: number;
  /** 14-dimensional SharpVector */
  vector: SharpVector;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Edge represents a connection between two games in the graph
 */
export interface Edge {
  /** Source game ID */
  from: string;
  /** Target game ID */
  to: string;
  /** Cosine similarity score (0-1) */
  similarity: number;
  /** Volume-weighted edge weight */
  weight: number;
  /** Statistical significance (p-value) */
  pValue?: number;
  /** Timestamp when edge was created */
  timestamp: number;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Graph represents the complete graph structure
 */
export interface Graph {
  /** Map of game ID to Game */
  nodes: Map<string, Game>;
  /** Array of edges */
  edges: Edge[];
  /** Graph metadata */
  metadata: {
    /** Total number of games */
    nodeCount: number;
    /** Total number of edges */
    edgeCount: number;
    /** Average degree */
    averageDegree: number;
    /** Graph generation timestamp */
    generatedAt: number;
    /** Configuration used */
    config?: Record<string, unknown>;
  };
}

/**
 * EdgeCandidate represents a potential edge before validation
 */
export interface EdgeCandidate {
  from: string;
  to: string;
  similarity: number;
  rawWeight: number;
  volumeRatio: number;
}

