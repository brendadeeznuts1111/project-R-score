// packages/odds-core/src/types/analytics.ts - Phase 2.11 Analytics Types

import { RealtimeMetadata, QualityMetrics } from './realtime';
import { MarketTopic } from './topics';

/**
 * Quality forecast prediction
 */
export interface QualityForecast {
  predictedQuality: number;
  timeHorizon: number; // minutes
  confidence: number;
  factors: QualityFactor[];
  trend: 'improving' | 'stable' | 'declining';
  accuracy: number;
}

/**
 * Quality influencing factors
 */
export interface QualityFactor {
  name: string;
  impact: number;
  weight: number;
  currentValue: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

/**
 * Trend prediction for data metrics
 */
export interface TrendPrediction {
  metric: string;
  currentValue: number;
  predictedValue: number;
  timeHorizon: number;
  confidence: number;
  pattern: TrendPattern;
  seasonality: SeasonalityPattern;
}

/**
 * Trend patterns
 */
export interface TrendPattern {
  type: 'linear' | 'exponential' | 'logarithmic' | 'seasonal' | 'volatile';
  slope: number;
  correlation: number;
  volatility: number;
}

/**
 * Seasonality patterns
 */
export interface SeasonalityPattern {
  detected: boolean;
  period: number; // minutes/hours
  amplitude: number;
  phase: number;
  confidence: number;
}

/**
 * Data insight from analytics
 */
export interface DataInsight {
  id: string;
  type: 'quality' | 'performance' | 'anomaly' | 'opportunity';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  timestamp: number;
  metadata: Partial<RealtimeMetadata>;
  recommendations: string[];
}

/**
 * Performance optimization suggestion
 */
export interface Optimization {
  id: string;
  category: 'processing' | 'memory' | 'network' | 'caching';
  title: string;
  description: string;
  expectedImprovement: number;
  implementation: ImplementationStep[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedEffort: number; // hours
}

/**
 * Implementation steps for optimization
 */
export interface ImplementationStep {
  step: number;
  action: string;
  description: string;
  estimatedTime: number; // minutes
  dependencies: string[];
}

/**
 * Smart alert with context
 */
export interface SmartAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  type: 'quality' | 'performance' | 'anomaly' | 'system';
  title: string;
  message: string;
  context: AlertContext;
  actions: AlertAction[];
  timestamp: number;
  resolved: boolean;
  resolutionTime?: number;
}

/**
 * Alert context information
 */
export interface AlertContext {
  affectedSymbols: string[];
  qualityImpact: number;
  performanceImpact: number;
  relatedEvents: string[];
  historicalData: {
    similarAlerts: number;
    averageResolutionTime: number;
    successRate: number;
  };
}

/**
 * Actions available for alerts
 */
export interface AlertAction {
  type: 'investigate' | 'optimize' | 'ignore' | 'escalate';
  label: string;
  description: string;
  automated: boolean;
  impact: string;
}

/**
 * Recommendation from analytics
 */
export interface Recommendation {
  id: string;
  category: 'quality' | 'performance' | 'architecture' | 'monitoring';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  expectedBenefit: string;
  implementation: RecommendationImplementation;
  confidence: number;
  validUntil: number;
}

/**
 * Recommendation implementation details
 */
export interface RecommendationImplementation {
  steps: string[];
  estimatedTime: number; // hours
  requiredResources: string[];
  riskLevel: 'low' | 'medium' | 'high';
  rollbackPlan: string;
}

/**
 * Adaptive processing strategy
 */
export interface ProcessingStrategy {
  name: string;
  description: string;
  parameters: StrategyParameters;
  performance: StrategyPerformance;
  adaptationRules: AdaptationRule[];
  active: boolean;
}

/**
 * Strategy parameters
 */
export interface StrategyParameters {
  batchSize: number;
  processingInterval: number;
  memoryLimit: number;
  cpuThreshold: number;
  qualityThreshold: number;
}

/**
 * Strategy performance metrics
 */
export interface StrategyPerformance {
  averageLatency: number;
  throughput: number;
  errorRate: number;
  resourceEfficiency: number;
  qualityScore: number;
  adaptationCount: number;
}

/**
 * Rules for strategy adaptation
 */
export interface AdaptationRule {
  condition: string;
  action: string;
  threshold: number;
  cooldown: number; // minutes
  lastTriggered?: number;
}

/**
 * Resource allocation configuration
 */
export interface ResourceAllocation {
  cpu: ResourceAllocationItem;
  memory: ResourceAllocationItem;
  network: ResourceAllocationItem;
  storage: ResourceAllocationItem;
  optimized: boolean;
  lastOptimized: number;
}

/**
 * Individual resource allocation item
 */
export interface ResourceAllocationItem {
  allocated: number;
  utilized: number;
  efficiency: number;
  target: number;
  scalingEnabled: boolean;
}

/**
 * Performance targets
 */
export interface PerformanceTarget {
  metric: string;
  target: number;
  current: number;
  tolerance: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  achieved: boolean;
  trend: 'improving' | 'stable' | 'declining';
}

/**
 * Optimization history
 */
export interface OptimizationHistory {
  timestamp: number;
  type: 'automatic' | 'manual';
  category: string;
  description: string;
  beforeMetrics: Record<string, number>;
  afterMetrics: Record<string, number>;
  improvement: number;
  success: boolean;
}

/**
 * Analytics configuration
 */
export interface AnalyticsConfig {
  predictionHorizon: number; // minutes
  anomalySensitivity: number; // 0-1
  alertThresholds: AlertThresholds;
  optimizationEnabled: boolean;
  adaptationEnabled: boolean;
  learningRate: number;
}

/**
 * Alert thresholds configuration
 */
export interface AlertThresholds {
  quality: number;
  latency: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
  anomalyScore: number;
}

/**
 * Analytics metrics snapshot
 */
export interface AnalyticsMetrics {
  predictions: {
    total: number;
    accurate: number;
    accuracy: number;
  };
  anomalies: {
    detected: number;
    confirmed: number;
    falsePositives: number;
  };
  optimizations: {
    applied: number;
    successful: number;
    improvement: number;
  };
  alerts: {
    generated: number;
    resolved: number;
    averageResolutionTime: number;
  };
}
