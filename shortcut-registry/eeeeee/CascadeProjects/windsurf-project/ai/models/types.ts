#!/usr/bin/env bun

// ai/types.ts - TypeScript interfaces for Nebula-Flow™ AI System
// Type definitions for anomaly detection and training

export interface LegSignal {
  deviceId: string;
  ageDays: number;
  legAmount: number;
  legVelocity: number; // legs per hour
  ipJump: number; // /24 changes in last 24h
  walletAgeDelta: number; // days between wallet creation and leg
  ctrProximity: number; // USD distance to $10k daily
  chargebackHistory: boolean;
  sessionDuration: number; // minutes
  geoMismatch: boolean; // IP vs billing address
  deviceRiskScore: number; // 0-1 from device fingerprint
}

export interface AnomalyResult {
  score: number;
  nebulaCode: string;
  reason: string[];
  recommendation: 'ALLOW' | 'THROTTLE' | 'BLOCK';
}

export interface TrainingLeg {
  deviceId: string;
  ageDays: number;
  legAmount: number;
  legVelocity: number;
  ipJump: number;
  walletAgeDelta: number;
  ctrProximity: number;
  chargebackHistory: number;
  sessionDuration: number;
  geoMismatch: number;
  deviceRiskScore: number;
  isFraud: number; // 0 or 1
  timestamp: string;
}

export interface TrainingMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  loss: number;
  samples: number;
  version: string;
}

export interface ModelStats {
  modelInitialized: boolean;
  version: string;
  features: number;
  inferenceTime: string;
  accuracy: string;
}

export interface BatchResult {
  signal: LegSignal;
  result: AnomalyResult;
}

export interface AIDashboardStats {
  avgRiskScore: number;
  blockedToday: number;
  accuracy: number;
  totalProcessed: number;
  falsePositiveRate: number;
  modelVersion: string;
}

export interface AnomalyEvent {
  deviceId: string;
  score: number;
  nebulaCode: string;
  reasons: string[];
  amount: number;
  timestamp: string;
  recommendation: 'ALLOW' | 'THROTTLE' | 'BLOCK';
}

export interface AIConfig {
  modelPath: string;
  inferenceTimeout: number;
  batchSize: number;
  trainingSchedule: string;
  alertThreshold: number;
  fallbackEnabled: boolean;
}

export interface InferenceSession {
  inputNames: string[];
  outputNames: string[];
  run(inputs: Record<string, Tensor>): Promise<Record<string, Tensor>>;
}

export interface Tensor {
  data: Float32Array;
  size: number;
}

export interface TrainingConfig {
  epochs: number;
  batchSize: number;
  validationSplit: number;
  learningRate: number;
  regularization: number;
}

export interface ModelVersion {
  version: string;
  accuracy: number;
  precision: number;
  recall: number;
  loss: number;
  samples: number;
  sizeKb: number;
  timestamp: string;
}

export interface ExportOptions {
  startDate: string;
  endDate: string;
  includeScores: boolean;
  includeReasons: boolean;
  format: 'csv' | 'json' | 'parquet';
}

export interface AlertRule {
  name: string;
  condition: string;
  threshold: number;
  action: 'block' | 'throttle' | 'alert';
  enabled: boolean;
}

export interface PerformanceMetrics {
  inferenceTime: number;
  totalRequests: number;
  blockedRequests: number;
  throttledRequests: number;
  allowedRequests: number;
  averageScore: number;
  errorRate: number;
}

// Webhook event types
export interface WebhookEvent {
  type: 'anomaly_detected' | 'model_trained' | 'system_alert';
  timestamp: string;
  data: any;
}

// API response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface ScoreResponse extends APIResponse<AnomalyResult> {
  processingTime: number;
  modelVersion: string;
}

export interface BatchScoreResponse extends APIResponse<BatchResult[]> {
  totalProcessed: number;
  processingTime: number;
}

export interface TrainingResponse extends APIResponse<TrainingMetrics> {
  trainingTime: number;
  samplesUsed: number;
}

export interface HealthResponse {
  success: boolean;
  data: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    modelLoaded: boolean;
    uptime: number;
    memoryUsage: number;
  };
  timestamp: string;
  lastTraining?: string;
  nextTraining?: string;
}

// Database schema types
export interface LegRecord {
  id: string;
  deviceId: string;
  amount: number;
  timestamp: string;
  status: string;
  anomalyScore?: number;
  nebulaCode?: string;
  riskReasons?: string;
}

export interface DeviceRecord {
  deviceId: string;
  ageDays: number;
  ipChanges: number;
  walletAgeDays: number;
  hasChargebacks: boolean;
  deviceRiskScore: number;
  lastSeen: string;
}

// Monitoring and observability
export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  component: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface Metric {
  name: string;
  value: number;
  timestamp: string;
  tags?: Record<string, string>;
}

export interface DashboardConfig {
  refreshInterval: number;
  maxAnomalies: number;
  showRealTime: boolean;
  enableAlerts: boolean;
}
