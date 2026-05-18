/**
 * @fire22/enhanced-logging
 * Enhanced logging system with L-Key integration for Fire22 platform
 */

export { Fire22Logger } from './logger';
export { LogLevel } from './types';
export type { LogContext } from './types';
export { LKeyAuditLogger } from './l-key-audit-logger';
export { AggregatedLogger } from './aggregated-logger';
export { AdvancedAnalyticsLogger } from './advanced-analytics-logger';
export { PerformanceOptimizer } from './performance-optimizer';
export { CacheMonitor } from './cache-monitor';
export { RealTimeAlertingSystem } from './real-time-alerting';
export { CloudflareAnalyticsIntegration } from './cloudflare-analytics-integration';

export type {
  LogEntry,
  LKeyLogEntry,
  AnalyticsLogEntry,
  AuditReport,
  LoggerConfig,
  PerformanceMetrics,
  OptimizationRecommendation,
  DetailedCacheMetrics,
  CacheOptimizationSuggestion,
  RealTimeAlert,
  AlertRule,
  AnomalyDetection,
  PredictiveAlert,
} from './types';

// Enhanced types exports
export type {
  FailureAnalysis,
  CacheAnalysis,
  SortingOptions,
  FilterOptions,
} from './advanced-analytics-logger';

export type { PerformanceAlert } from './performance-optimizer';

export type { CacheType, CacheOperation, CacheMissReason, CacheAlert } from './cache-monitor';

export type { AlertSeverity, AlertCategory, AlertType } from './real-time-alerting';

// Main factory function
export function createFire22Logger(config?: Partial<LoggerConfig>) {
  return new AggregatedLogger(config);
}

// Enhanced analytics factory
export function createEnhancedAnalyticsSystem(config?: any) {
  const { AdvancedAnalyticsLogger } = require('./advanced-analytics-logger');
  const { PerformanceOptimizer } = require('./performance-optimizer');
  const { CacheMonitor } = require('./cache-monitor');
  const { RealTimeAlertingSystem } = require('./real-time-alerting');

  const analyticsLogger = new AdvancedAnalyticsLogger(config);
  const performanceOptimizer = new PerformanceOptimizer(analyticsLogger);
  const cacheMonitor = new CacheMonitor(analyticsLogger);
  const alertingSystem = new RealTimeAlertingSystem(
    analyticsLogger,
    performanceOptimizer,
    cacheMonitor
  );

  return {
    analyticsLogger,
    performanceOptimizer,
    cacheMonitor,
    alertingSystem,
  };
}

// Cloudflare analytics factory
export function createCloudflareAnalyticsSystem(cloudflareConfig: any, baseConfig?: any) {
  const { analyticsLogger, performanceOptimizer, cacheMonitor, alertingSystem } =
    createEnhancedAnalyticsSystem(baseConfig);

  const { CloudflareAnalyticsIntegration } = require('./cloudflare-analytics-integration');
  const cloudflareAnalytics = new CloudflareAnalyticsIntegration(
    cacheMonitor,
    analyticsLogger,
    cloudflareConfig
  );

  return {
    analyticsLogger,
    performanceOptimizer,
    cacheMonitor,
    alertingSystem,
    cloudflareAnalytics,
  };
}

export default {
  createFire22Logger,
  createEnhancedAnalyticsSystem,
  createCloudflareAnalyticsSystem,
  Fire22Logger: () => import('./logger').then(m => m.Fire22Logger),
  LKeyAuditLogger: () => import('./l-key-audit-logger').then(m => m.LKeyAuditLogger),
  AggregatedLogger: () => import('./aggregated-logger').then(m => m.AggregatedLogger),
  AdvancedAnalyticsLogger: () =>
    import('./advanced-analytics-logger').then(m => m.AdvancedAnalyticsLogger),
  PerformanceOptimizer: () => import('./performance-optimizer').then(m => m.PerformanceOptimizer),
  CacheMonitor: () => import('./cache-monitor').then(m => m.CacheMonitor),
  RealTimeAlertingSystem: () => import('./real-time-alerting').then(m => m.RealTimeAlertingSystem),
  CloudflareAnalyticsIntegration: () =>
    import('./cloudflare-analytics-integration').then(m => m.CloudflareAnalyticsIntegration),
};
