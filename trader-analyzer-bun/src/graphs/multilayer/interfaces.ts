/**
 * @fileoverview MultiLayerGraph Core Interfaces
 * @description Core structure for multi-layer correlation graph system
 * @module graphs/multilayer/interfaces
 * @version 1.1.1.1.4.1.1
 */

import type {
    CrossEventGraph,
    CrossMarketGraph,
    CrossSportGraph,
    DirectCorrelationGraph,
} from './schemas/layer-graphs';
import type { HiddenEdgeDetectionResult } from './types/hidden-edges';
import type { RiskAssessment } from './types/risk';
import type { MarketSignal, PropagationResult } from './types/signals';

/**
 * Header 1.1.1.1.4.1.1: MultiLayerGraph Interface Definition
 */
export interface MultiLayerGraph {
  // Core graph structure
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge[]>;
  layers: GraphLayers;

  // Layer-specific subgraphs
  layer1: DirectCorrelationGraph;
  layer2: CrossMarketGraph;
  layer3: CrossEventGraph;
  layer4: CrossSportGraph;

  // Graph metadata
  metadata: {
    createdAt: number;
    lastUpdated: number;
    nodeCount: number;
    edgeCount: number;
    anomalyCount: number;
    snapshotId?: string;
  };

  // Top anomalies (prioritized)
  topAnomalies?: DetectedAnomaly[];
  anomalyStats?: AnomalyStatistics;

  // Methods
  addNode(node: GraphNode): void;
  addEdge(edge: GraphEdge): void;
  removeNode(nodeId: string): void;
  removeEdge(edgeId: string): void;
  findHiddenEdges(config: HiddenEdgeConfig): HiddenEdgeDetectionResult[];
  propagateSignal(signal: MarketSignal): PropagationResult;
  calculateRiskAssessment(): RiskAssessment;
}

export interface GraphNode {
  id: string;
  type: NodeType;
  layer?: number;
  metadata: Record<string, unknown>;
  [key: string]: unknown;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  sourceLayer?: number;
  targetLayer?: number;
  weight: number;
  metadata: Record<string, unknown>;
}

export interface GraphLayers {
  layer1: DirectCorrelationGraph;
  layer2: CrossMarketGraph;
  layer3: CrossEventGraph;
  layer4: CrossSportGraph;
}

export type NodeType =
  | 'sport'
  | 'event'
  | 'market'
  | 'selection'
  | 'correlation'
  | 'anomaly';

export interface HiddenEdgeConfig {
  layer?: number;
  confidenceThreshold: number;
  minObservations: number;
  timeWindow?: number;
}

export interface DetectedAnomaly {
  id: string;
  type: string;
  layer: number;
  detectedAt: number;
  confidenceScore: number;
  severity: number;
  description: string;
  affectedSelections?: string[];
  affectedMarkets?: string[];
  affectedEvents?: string[];
  affectedSports?: string[];
  metadata: Record<string, unknown>;
  priorityScore?: number;
  queuedAt?: number;
  processingStartedAt?: number;
}

export interface AnomalyStatistics {
  totalDetected: number;
  byLayer: Record<number, number>;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  detectionRate: number;
}
