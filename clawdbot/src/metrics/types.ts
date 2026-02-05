/**
 * Metrics types for skill execution tracking and performance monitoring.
 */

export type SkillExecutionRecord = {
  id: string;
  skillId: string;
  command: string;
  args: unknown[];
  timestamp: string;
  duration: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
};

export type SkillAggregateMetrics = {
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  totalDuration: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p95Duration: number;
  lastExecuted?: string;
  bundleSize?: number;
  bundleAnalysisTime?: number;
  lastAnalyzed?: string;
};

export type MetricsAggregate = {
  totalExecutions: number;
  successRate: number;
  avgDuration: number;
  startedAt: string;
  lastUpdated: string;
};

export type MetricsData = {
  version: string;
  aggregate: MetricsAggregate;
  bySkill: Record<string, SkillAggregateMetrics>;
  recentExecutions: SkillExecutionRecord[];
  performance?: PerformanceSnapshot;
};

export type PerformanceMeasurement = {
  count: number;
  avg: number;
  min: number;
  max: number;
  p95: number;
};

export type PerformanceSnapshot = {
  skillId?: string;
  searchPerformance?: number;
  serializationTime?: number;
  measurements: Record<string, PerformanceMeasurement>;
};

export type MetricsConfig = {
  collection: {
    enabled: boolean;
    maxRecentExecutions: number;
    thresholds: {
      warning: number;
      critical: number;
    };
  };
  archival: {
    enabled: boolean;
    maxAgeDays: number;
    compressLevel: number;
    storagePath: string;
  };
  terminal: {
    trackUsage: boolean;
    maxSessionTime: number;
    recordSessions: boolean;
  };
  websocket: {
    enabled: boolean;
    updateInterval: number;
    maxConnections: number;
  };
  s3?: {
    bucket: string;
    requesterPays: boolean;
  };
};

export type MetricsArchiveManifest = {
  version: string;
  archivedAt: string;
  executionCount: number;
  dateRange: {
    start: string;
    end: string;
  };
};

export type MetricsEvent =
  | { type: "update"; timestamp: number; data: MetricsData }
  | { type: "execution"; timestamp: number; record: SkillExecutionRecord }
  | { type: "archive"; timestamp: number; path: string; manifest: MetricsArchiveManifest };
