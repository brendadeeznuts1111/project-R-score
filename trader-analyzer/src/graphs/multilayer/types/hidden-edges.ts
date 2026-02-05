/**
 * @fileoverview Hidden Edge Detection Types
 * @description Types for hidden edge detection results
 * @module graphs/multilayer/types/hidden-edges
 * @version 1.1.1.1.4.1.6
 */

export type GraphLayer = 1 | 2 | 3 | 4;

export type SeasonalPattern = {
  type: 'daily' | 'weekly' | 'monthly' | 'seasonal';
  strength: number;
  phase: number;
};

/**
 * Header 1.1.1.1.4.1.6: HiddenEdge Detection Result Type
 */
export interface HiddenEdgeDetectionResult {
  edgeId: string;
  sourceNode: string;
  targetNode: string;
  layer: GraphLayer;

  // Detection metrics
  detectionMetrics: {
    confidenceScore: number; // 0-1 confidence in detection
    statisticalSignificance: number; // p-value or similar
    noveltyScore: number; // How novel is this edge
    strengthEstimate: number; // Estimated correlation strength
  };

  // Temporal properties
  temporalAnalysis: {
    firstDetected: number;
    lastObserved: number;
    observationCount: number;
    seasonalPattern: SeasonalPattern | null;
  };

  // Impact assessment
  impactAssessment: {
    potentialMarketImpact: number; // 0-100 scale
    propagationRisk: number; // Risk of spreading anomalies
    surveillancePriority: number; // Priority for monitoring
  };

  // Verification status
  verification: {
    status: 'pending' | 'verified' | 'false_positive' | 'investigating';
    verifiedBy: string | null;
    verificationNotes: string;
    verificationTime: number | null;
  };
}

export interface HiddenEdgeCandidate {
  edgeId: string;
  sourceNode: string;
  targetNode: string;
  layer: GraphLayer;
  correlationStrength: number;
  firstDetected: number;
  observationCount: number;
  temporalObservations: Array<{ timestamp: number; strength: number }>;
  verification?: {
    status: 'pending' | 'verified' | 'false_positive' | 'investigating';
  };
}
