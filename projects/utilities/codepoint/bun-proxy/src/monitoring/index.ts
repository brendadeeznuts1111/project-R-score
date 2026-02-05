// @bun/proxy/monitoring/index.ts - Enhanced with better naming
import { HealthMonitor } from './health-monitor.js';
import { Logger } from './logger.js';
import { MetricsCollector } from './metrics-collector.js';
import { StatisticsTracker } from './statistics-tracker.js';

export interface MetricsConfiguration {
  isEnabled: boolean;
  metricsEndpointPath: string;
  outputFormat: 'prometheus' | 'json' | 'influx';
  collectionIntervalMilliseconds: number;
  collectionTimeoutMilliseconds: number;
  latencyBuckets: number[];
  defaultLabels: Record<string, string>;
  metricNamePrefix: string;
  includeDefaultMetrics: boolean;
  customMetricDefinitions: any[];
  errorHandler?: (error: Error) => void;
  persistenceConfiguration?: any;
}

export interface HealthMonitorConfiguration {
  checkIntervalMilliseconds: number;
  timeoutMilliseconds: number;
  failureThreshold: number;
  successThreshold: number;
  healthEndpointPath: string;
  readinessEndpointPath: string;
  livenessEndpointPath: string;
  customChecks: any[];
  onStatusChange?: (status: any, previousStatus: any) => void;
}

export interface LoggerConfiguration {
  minimumLogLevel: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  outputFormat: 'json' | 'text' | 'pretty';
  includeTimestamps: boolean;
  enableColors: boolean;
  destination: 'console' | 'file' | 'http' | 'stream';
  filePath: string;
  rotationStrategy: 'daily' | 'hourly' | 'size' | false;
  maximumFileSize: string;
  maximumFileCount: number;
  filters: any[];
  transports: any[];
  context: Record<string, any>;
  samplingConfiguration: any;
}

export interface HealthCheckDefinition {
  name: string;
  checkFunction: () => Promise<any>;
  timeoutMilliseconds: number;
  failureThreshold: number;
  successThreshold: number;
}

export interface LogFilter {
  field: string;
  operator: 'equals' | 'contains' | 'matches' | 'greaterThan' | 'lessThan';
  value: any;
  action: 'include' | 'exclude';
}

export interface LogTransport {
  transportType: 'file' | 'http' | 'stream' | 'syslog' | 'datadog' | 'sentry';
  minimumLevel: string;
  format: string;
  options: Record<string, any>;
  isEnabled: boolean;
  isAsynchronous: boolean;
  suppressErrors: boolean;
  handleExceptions: boolean;
  handleRejections: boolean;
}

export class MonitoringFactory {
  static createMetricsCollector(
    configuration: MetricsConfiguration
  ): MetricsCollector {
    return new MetricsCollector(configuration);
  }

  static createHealthMonitor(
    configuration: HealthMonitorConfiguration
  ): HealthMonitor {
    return new HealthMonitor(configuration);
  }

  static createLogger(
    configuration: LoggerConfiguration
  ): Logger {
    return new Logger(configuration);
  }

  static createStatisticsTracker(): StatisticsTracker {
    return new StatisticsTracker();
  }

  static createDefaultMetricsCollector(): MetricsCollector {
    return new MetricsCollector({
      isEnabled: true,
      metricsEndpointPath: '/metrics',
      outputFormat: 'prometheus',
      collectionIntervalMilliseconds: 15000,
      collectionTimeoutMilliseconds: 10000,
      latencyBuckets: [0.1, 0.5, 1, 2, 5, 10],
      defaultLabels: {},
      metricNamePrefix: 'proxy_',
      includeDefaultMetrics: true,
      customMetricDefinitions: []
    });
  }
}

export {
  HealthMonitor,
  Logger, MetricsCollector,
  StatisticsTracker as StatsTracker
};

// Re-export HealthCheckConfiguration from core types
  export type { HealthCheckConfiguration } from '../core/types.js';
