/**
 * Performance Metric Types
 * Defines types for MASTER_PERF performance tracking system
 */

export interface PerfMetric {
  id: string;
  category: string;
  type: string;
  topic: string;
  value: string;
  locations: string;
  impact: string;
  properties?: Record<string, any>;
  timestamp?: number;
}

export interface PerfMetricOptions {
  maxRows?: number;
  includeColors?: boolean;
}

export interface FormattedPerfMetricData {
  category: string;
  type: string;
  topic: string;
  id: string;
  value: string;
  locations: string;
  impact: string;
  properties: string;
}