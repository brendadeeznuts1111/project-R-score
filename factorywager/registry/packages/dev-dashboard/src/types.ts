/**
 * Type definitions for the FactoryWager Dev Dashboard
 */

export interface BenchmarkResult {
  name: string;
  time: number;
  target: number;
  status: 'pass' | 'fail' | 'warning';
  note?: string;
  category: 'performance' | 'memory' | 'type-safety';
  isolated?: boolean;
  resourceUsage?: {
    maxRSS: number;
    cpuTime: { user: number; system: number };
    executionTime: number;
  };
}

export interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  message?: string;
  duration?: number;
  category: string;
}

export type P2PGateway = 'venmo' | 'cashapp' | 'paypal' | 'zelle' | 'wise' | 'revolut';

export type P2POperation = 'create' | 'query' | 'switch' | 'dry-run' | 'full' | 'webhook' | 'refund' | 'dispute';

export interface P2PGatewayConfig {
  gateway: P2PGateway;
  apiKeyEncrypted?: string;
  apiSecretEncrypted?: string;
  webhookUrl?: string;
  webhookSecretEncrypted?: string;
  sandboxMode: boolean;
  rateLimitPerMinute: number;
  timeoutMs: number;
  retryCount: number;
  circuitBreakerThreshold: number;
  configJson: Record<string, any>;
  enabled: boolean;
}

export interface P2PGatewayResult {
  gateway: P2PGateway;
  operation: P2POperation;
  time: number;
  target: number;
  status: 'pass' | 'fail' | 'warning';
  note?: string;
  dryRun?: boolean;
  // Extended metrics
  success?: boolean;
  errorMessage?: string;
  requestSize?: number;
  responseSize?: number;
  endpoint?: string;
  statusCode?: number;
  metadata?: Record<string, any>;
}

export interface P2PMetrics {
  gateway: P2PGateway;
  operation: P2POperation;
  totalOperations: number;
  avgDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  successfulOps: number;
  failedOps: number;
  successRate: number;
}

export interface P2PTransaction {
  id: string;
  gateway: P2PGateway;
  amount: number;
  currency: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  metadata?: Record<string, any>;
  createdAt: Date;
  completedAt?: Date;
}

export interface P2PBenchmarkOptions {
  gateways: P2PGateway[];
  operations: P2POperation[];
  iterations: number;
  includeDryRun: boolean;
  includeFull: boolean;
  transactionAmounts: number[];
  currencies: string[];
}

export type ProfileOperation = 
  | 'create' 
  | 'create_batch'
  | 'query' 
  | 'update' 
  | 'progress_save'
  | 'xgboost_train' 
  | 'xgboost_predict' 
  | 'xgboost_personalize'
  | 'redis_hll_add' 
  | 'redis_hll_count' 
  | 'redis_hll_merge'
  | 'r2_snapshot' 
  | 'r2_restore'
  | 'gnn_propagate' 
  | 'gnn_train' 
  | 'gnn_infer'
  | 'feature_extract' 
  | 'model_update' 
  | 'cache_invalidate';

export interface ProfileResult {
  operation: ProfileOperation;
  time: number;
  target: number;
  status: 'pass' | 'fail' | 'warning';
  note?: string;
  category: 'core' | 'xgboost' | 'redis_hll' | 'r2_snapshot' | 'propagation' | 'gnn' | 'features';
  metadata?: Record<string, any>;
  // Extended metrics
  cpuTimeMs?: number;
  memoryDeltaBytes?: number;
  threadCount?: number;
  peakMemoryMb?: number;
  modelAccuracy?: number;
  modelLoss?: number;
  trainingSamples?: number;
  inferenceLatencyMs?: number;
  personalizationScore?: number;
  featureCount?: number;
  embeddingDimension?: number;
  hllCardinalityEstimate?: number;
  hllMergeTimeMs?: number;
  r2ObjectSizeBytes?: number;
  r2UploadTimeMs?: number;
  r2DownloadTimeMs?: number;
  gnnNodes?: number;
  gnnEdges?: number;
  gnnPropagationTimeMs?: number;
  tags?: string[];
}

export interface ProfileMetrics {
  operation: ProfileOperation;
  totalOperations: number;
  avgDurationMs: number;
  avgPersonalizationScore?: number;
  avgModelAccuracy?: number;
  successfulOps: number;
  failedOps: number;
  successRate: number;
  avgCpuTimeMs?: number;
  avgPeakMemoryMb?: number;
}

export interface PersonalizationResult {
  userId: string;
  personalizationScore: number;
  featureVector: number[];
  modelVersion: string;
  inferenceTimeMs: number;
  confidence: number;
  recommendations: string[];
}

export interface XGBoostModel {
  version: string;
  accuracy: number;
  loss: number;
  featureImportance: Record<string, number>;
  trainedAt: Date;
  sampleCount: number;
}

export interface QuickWin {
  id: number;
  title: string;
  status: 'completed' | 'pending' | 'verified';
  impact: string;
  files: string[];
  category: string;
}

export interface AlertConfig {
  enabled: boolean;
  thresholds: {
    performanceScore: number;
    failingTests: number;
    slowBenchmarks: number;
  };
  webhookUrl?: string;
}

export interface WebSocketBenchmarkResult {
  name: string;
  time: number;
  target: number;
  status: 'pass' | 'fail' | 'warning';
  note?: string;
  category: 'websocket' | 'performance';
  metadata?: {
    connections?: number;
    messagesPerSecond?: number;
    avgLatency?: number;
    compressionRatio?: number;
    backpressureEvents?: number;
  };
}
