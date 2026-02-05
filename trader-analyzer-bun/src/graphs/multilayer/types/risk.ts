/**
 * @fileoverview Risk Assessment Types
 * @description Types for multi-layer risk assessment
 * @module graphs/multilayer/types/risk
 * @version 1.1.1.1.4.3.7
 */

export interface RiskAssessment {
  timestamp: number;
  overallRisk: number;
  layerRisks: Record<number, LayerRiskAssessment>;
  crossLayerRisk: CrossLayerRisk;
  systemicRisk: SystemicRisk;
  riskConcentrations: RiskConcentration[];
  propagationPaths: PropagationPath[];
  mitigationRecommendations: MitigationRecommendation[];
  confidence: number;
  metadata: Record<string, unknown>;
}

export interface LayerRiskAssessment {
  layer: number;
  overallRisk: number;
  factorScores: Record<string, number>;
  weights: Record<string, number>;
  criticalNodes: string[];
  riskDrivers: string[];
  timeHorizon: number;
  confidence: number;
}

export interface CrossLayerRisk {
  overallRisk: number;
  interactionRisks: InteractionRisk[];
  amplificationRisk: number;
  cascadingPaths: CascadingPaths;
  criticalInteractions: string[];
  propagationLikelihood: number;
  containmentAssessment: ContainmentAssessment;
}

export interface SystemicRisk {
  overallRisk: number;
  systemicFactors: Record<string, number>;
  stressTests: StressTest[];
  worstCaseLosses: WorstCaseLosses;
  contagionPotential: number;
  systemResilience: number;
  recoveryTime: number;
  regulatoryImpact: RegulatoryImpact;
}

export interface RiskConcentration {
  type: 'sport' | 'market_type' | 'temporal' | 'geographic';
  identifier: string;
  riskLevel: number;
  exposure: number;
  description: string;
}

export interface PropagationPath {
  path: string[];
  riskScore: number;
  estimatedTime: number;
}

export interface MitigationRecommendation {
  nodeId: string;
  action: 'isolate' | 'monitor' | 'hedge' | 'adjust_margin';
  priority: 'high' | 'medium' | 'low';
  expectedEffectiveness: number;
  description: string;
}

export interface InteractionRisk {
  layerA: number;
  layerB: number;
  riskScore: number;
  description: string;
}

export interface CascadingPaths {
  paths: string[][];
  overallRisk: number;
}

export interface ContainmentAssessment {
  canContain: boolean;
  containmentTime: number;
  requiredActions: string[];
}

export interface StressTest {
  scenario: string;
  impact: number;
  maxLossRatio: number;
}

export interface WorstCaseLosses {
  estimated: number;
  confidence: number;
  scenario: string;
}

export interface RegulatoryImpact {
  riskLevel: string;
  requiredReporting: boolean;
  actionRequired: boolean;
}
