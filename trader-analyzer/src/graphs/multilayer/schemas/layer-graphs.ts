/**
 * @fileoverview Layer Graph Type Definitions
 * @description Type definitions for each layer's graph structure
 * @module graphs/multilayer/schemas/layer-graphs
 * @version 1.1.1.1.4.1.2-5
 */

import type { GraphEdge, GraphNode } from '../interfaces';

export interface DirectCorrelationGraph {
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge[]>;
  correlations: DirectCorrelation[];
}

export interface CrossMarketGraph {
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge[]>;
  correlations: CrossMarketCorrelation[];
}

export interface CrossEventGraph {
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge[]>;
  correlations: CrossEventCorrelation[];
}

export interface CrossSportGraph {
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge[]>;
  correlations: CrossSportCorrelation[];
}

// Re-export layer schema types
export type {
    CrossEventCorrelation, CrossMarketCorrelation, CrossSportCorrelation, DirectCorrelation
} from './layer-schemas';

