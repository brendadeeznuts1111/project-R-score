/**
 * User Behavior Prediction Types and Interfaces
 * Advanced ML models for predicting user behavior patterns, preferences, and potential actions
 */

export interface UserBehaviorPrediction {
  userId: string;
  sessionId: string;
  predictions: BehaviorPrediction[];
  confidence: number;
  timestamp: number;
  modelVersion: string;
}

export interface BehaviorPrediction {
  type: 'action' | 'preference' | 'risk' | 'engagement';
  predictedAction: string;
  probability: number;
  timeHorizon: number; // minutes until predicted action
  confidence: number;
  features: Record<string, any>;
}

export interface BehavioralPattern {
  patternId: string;
  patternType: 'sequential' | 'temporal' | 'associational';
  actions: string[];
  frequency: number;
  confidence: number;
  lastObserved: number;
}

export interface PredictionModel {
  id: string;
  name: string;
  type: 'classification' | 'regression' | 'clustering';
  features: string[];
  accuracy: number;
  lastTrained: number;
  version: string;
}

export interface UserBehaviorInsights {
  currentBehavior: {
    engagement: 'high' | 'medium' | 'low';
    riskLevel: 'low' | 'medium' | 'high';
    predictedActions: BehaviorPrediction[];
  };
  patterns: BehavioralPattern[];
  recommendations: PersonalizedRecommendation[];
  trends: BehaviorTrend[];
}

export interface PersonalizedRecommendation {
  id: string;
  type: 'engagement' | 'security' | 'personalization';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
}

export interface BehaviorTrend {
  trendId: string;
  metric: string;
  direction: 'increasing' | 'decreasing' | 'stable';
  changePercent: number;
  timeFrame: string;
  significance: number;
}

export interface UserAction {
  actionId: string;
  userId: string;
  sessionId: string;
  actionType: string;
  timestamp: number;
  metadata: Record<string, any>;
  context: {
    page: string;
    device: string;
    location?: string;
    referrer?: string;
  };
}

export interface BehaviorTrackingConfig {
  enabled: boolean;
  sampleRate: number;
  retentionDays: number;
  privacyMode: boolean;
  realTimeProcessing: boolean;
}

export interface PredictionContext {
  userId: string;
  sessionId: string;
  currentPage: string;
  timeOfDay: number;
  dayOfWeek: number;
  recentActions: UserAction[];
  userProfile: {
    riskScore: number;
    engagementScore: number;
    preferences: Record<string, any>;
  };
}