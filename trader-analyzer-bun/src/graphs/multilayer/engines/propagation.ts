/**
 * @fileoverview Propagation Prediction Engine
 * @description Engine for predicting anomaly propagation across layers
 * @module graphs/multilayer/engines/propagation
 * @version 1.1.1.1.4.1.7
 */

import type { MultiLayerGraph } from '../interfaces';

export interface MarketAnomaly {
  id: string;
  type: string;
  layer: number;
  nodeId: string;
  strength: number;
  detectedAt: number;
  metadata: Record<string, unknown>;
}

export interface PropagationConfig {
  maxSteps?: number;
  confidenceThreshold?: number;
  includeCrossLayer?: boolean;
}

/**
 * Header 1.1.1.1.4.1.7: Propagation Prediction Engine
 */
export interface PropagationPredictionEngine {
  // Core prediction methods
  predictPropagation(
    sourceAnomaly: MarketAnomaly,
    graph: MultiLayerGraph,
    config: PropagationConfig,
  ): PropagationPrediction;

  // Simulation methods
  simulatePropagation(
    initialAnomalies: MarketAnomaly[],
    steps: number,
    graph: MultiLayerGraph,
  ): PropagationSimulationResult;

  // Risk assessment
  assessPropagationRisk(
    nodeId: string,
    graph: MultiLayerGraph,
  ): PropagationRiskAssessment;

  // Learning methods
  learnFromPropagation(
    actualPropagation: ActualPropagationData,
    predictedPropagation: PropagationPrediction,
  ): void;

  // Configuration
  config: {
    propagationModel: 'SIR' | 'threshold' | 'custom';
    learningRate: number;
    memorySize: number; // How many past propagations to remember
    confidenceThreshold: number;
  };
}

// Propagation prediction result
export interface PropagationPrediction {
  predictedPath: Array<{
    step: number;
    nodeId: string;
    layer: number;
    infectionProbability: number;
    estimatedTime: number;
  }>;

  confidenceScores: {
    pathConfidence: number;
    timingConfidence: number;
    impactConfidence: number;
  };

  riskMetrics: {
    totalNodesAtRisk: number;
    maxSimultaneousAnomalies: number;
    expectedLoss: number;
    worstCaseLoss: number;
  };

  mitigationRecommendations: Array<{
    nodeId: string;
    action: 'isolate' | 'monitor' | 'hedge' | 'adjust_margin';
    priority: 'high' | 'medium' | 'low';
    expectedEffectiveness: number;
  }>;
}

export interface PropagationSimulationResult {
  steps: PropagationStep[];
  finalState: Record<string, number>;
  totalInfected: number;
  peakInfection: number;
  peakTime: number;
}

export interface PropagationStep {
  step: number;
  infectedNodes: string[];
  newInfections: string[];
  recoveredNodes: string[];
}

export interface PropagationRiskAssessment {
  nodeId: string;
  riskScore: number;
  propagationLikelihood: number;
  impactScore: number;
  mitigationOptions: string[];
}

export interface ActualPropagationData {
  sourceAnomaly: MarketAnomaly;
  actualPath: Array<{
    nodeId: string;
    infectedAt: number;
  }>;
  actualImpact: number;
}
