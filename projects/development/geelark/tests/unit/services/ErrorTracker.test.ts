/**
 * ErrorTracker Unit Tests
 * 
 * Comprehensive test suite covering:
 * - Error creation and tracking
 * - Error reporting and statistics
 * - Error severity mapping
 * - Retry logic
 * - User-friendly messages
 * - Error history management
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { ErrorTracker, CustomApplicationError, type ApplicationError } from '../../../src/services/ErrorTracker';
import { MetricsCollector } from '../../../src/services/MetricsCollector';

describe('ErrorTracker', () => {
  let errorTracker: ErrorTracker;
  let metricsCollector: MetricsCollector;

  beforeEach(() => {
    MetricsCollector.reset();
    ErrorTracker.reset();
    metricsCollector = MetricsCollector.getInstance();
    errorTracker = ErrorTracker.getInstance(metricsCollector);
  });

  afterEach(() => {
    MetricsCollector.reset();
    ErrorTracker.reset();
  });

  // =========================================================================
  // Singleton Pattern Tests
  // =========================================================================

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = ErrorTracker.getInstance(metricsCollector);
      const instance2 = ErrorTracker.getInstance(metricsCollector);
      
      expect(instance1).toBe(instance2);
    });

    it('should reset singleton', () => {
      ErrorTracker.getInstance(metricsCollector);
      ErrorTracker.reset();
      
      const newInstance = ErrorTracker.getInstance(metricsCollector);
      expect(newInstance).toBeDefined();
    });
  });

  // =========================================================================
  // CustomApplicationError Tests
  // =========================================================================

  describe('CustomApplicationError', () => {
    it('should create error with all properties', () => {
      const error = new CustomApplicationError(
        'Test error',
        'ERR_001',
        400,
        'error',
        { userId: '123' }
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('ERR_001');
      expect(error.statusCode).toBe(400);
      expect(error.severity).toBe('error');
      expect(error.context).toEqual({ userId: '123' });
      expect(error.timestamp).toBeDefined();
      expect(error.name).toBe('ApplicationError');
    });

    it('should extend Error class', () => {
      const error = new CustomApplicationError('Test', 'ERR_001', 400, 'error');
      expect(error instanceof Error).toBe(true);
      expect(error.stack).toBeDefined();
    });

    it('should capture stack trace', () => {
      const error = new CustomApplicationError('Test', 'ERR_001', 400, 'error');
      expect(error.stack).toContain('CustomApplicationError');
    });
  });

  // =========================================================================
  // Error Tracking Tests
  // =========================================================================

  describe('Error Tracking', () => {
    it('should track error successfully', () => {
      const error = errorTracker.trackError('SYS_001');
      
      expect(error).toBeDefined();
      expect(error.code).toBe('SYS_001');
      expect(error.statusCode).toBe(500);
      expect(error.severity).toBe('error');
    });

    it('should create error without tracking', () => {
      const error = errorTracker.createError('SYS_001');
      
      expect(error).toBeDefined();
      expect(error.code).toBe('SYS_001');
    });

    it('should track error with context', () => {
      const error = errorTracker.trackError('API_002', {
        endpoint: '/admin',
        userId: 'user123'
      });

      expect(error.context).toEqual({
        endpoint: '/admin',
        userId: 'user123'
      });
    });

    it('should map severity correctly', () => {
      const criticalError = errorTracker.trackError('SYS_003');
      expect(criticalError.severity).toBe('critical');
    });

    it('should handle unknown error codes gracefully', () => {
      const error = errorTracker.trackError('UNKNOWN_CODE' as any);
      expect(error).toBeDefined();
      expect(error.code).toBe('ERR_001');
    });
  });

  // =========================================================================
  // Error History & Reporting Tests
  // =========================================================================

  describe('Error History & Reporting', () => {
    it('should record error in history', () => {
      errorTracker.trackError('API_001');
      
      const reports = errorTracker.getAllErrorReports();
      expect(reports.length).toBeGreaterThan(0);
    });

    it('should get error report by code', () => {
      errorTracker.trackError('API_001');
      
      const report = errorTracker.getErrorReport('API_001');
      expect(report).toBeDefined();
      expect(report?.code).toBe('API_001');
    });

    it('should get recent errors', () => {
      errorTracker.trackError('API_001');
      errorTracker.trackError('DB_001');
      errorTracker.trackError('AUTH_001');
      
      const recent = errorTracker.getRecentErrors(2);
      expect(recent.length).toBeLessThanOrEqual(2);
    });

    it('should get error statistics', () => {
      errorTracker.trackError('API_001');
      errorTracker.trackError('API_001');
      errorTracker.trackError('DB_001');
      
      const stats = errorTracker.getErrorStats();
      expect(stats.totalErrors).toBeGreaterThanOrEqual(3);
      expect(stats.byCode['API_001']).toBeGreaterThanOrEqual(2);
    });

    it('should get errors by severity', () => {
      errorTracker.trackError('API_001'); // error severity
      errorTracker.trackError('SYS_003'); // critical severity
      
      const criticalErrors = errorTracker.getErrorsBySeverity('critical');
      expect(criticalErrors.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Error Count Management Tests
  // =========================================================================

  describe('Error Count Management', () => {
    it('should get error count', () => {
      errorTracker.trackError('API_001');
      errorTracker.trackError('API_001');
      
      const count = errorTracker.getErrorCount('API_001');
      expect(count).toBeGreaterThanOrEqual(2);
    });

    it('should reset specific error count', () => {
      errorTracker.trackError('API_001');
      errorTracker.resetErrorCount('API_001');
      
      const count = errorTracker.getErrorCount('API_001');
      expect(count).toBe(0);
    });

    it('should reset all error counts', () => {
      errorTracker.trackError('API_001');
      errorTracker.trackError('DB_001');
      
      errorTracker.resetErrorCount();
      
      expect(errorTracker.getErrorCount('API_001')).toBe(0);
      expect(errorTracker.getErrorCount('DB_001')).toBe(0);
    });

    it('should clear error history', () => {
      errorTracker.trackError('API_001');
      errorTracker.trackError('DB_001');
      
      errorTracker.clearHistory();
      
      const reports = errorTracker.getAllErrorReports();
      expect(reports.length).toBe(0);
    });
  });

  // =========================================================================
  // Error Validation Tests
  // =========================================================================

  describe('Error Validation', () => {
    it('should validate error code', () => {
      expect(errorTracker.isValidErrorCode('SYS_001')).toBe(true);
      expect(errorTracker.isValidErrorCode('SYS_002')).toBe(true);
      expect(errorTracker.isValidErrorCode('INVALID_CODE')).toBe(false);
    });

    it('should identify retryable errors', () => {
      const retryableError = new CustomApplicationError('Too many requests', 'API_004', 429, 'error');
      const nonRetryableError = new CustomApplicationError('Unauthorized', 'AUTH_001', 401, 'error');
      
      expect(errorTracker.isRetryable(retryableError)).toBe(true);
      expect(errorTracker.isRetryable(nonRetryableError)).toBe(false);
    });

    it('should identify 408 as retryable', () => {
      const error = new CustomApplicationError('Timeout', 'ERR_001', 408, 'error');
      expect(errorTracker.isRetryable(error)).toBe(true);
    });

    it('should identify 5xx errors as retryable', () => {
      const error500 = new CustomApplicationError('Server error', 'ERR_001', 500, 'error');
      const error503 = new CustomApplicationError('Service unavailable', 'ERR_001', 503, 'error');
      
      expect(errorTracker.isRetryable(error500)).toBe(true);
      expect(errorTracker.isRetryable(error503)).toBe(true);
    });
  });

  // =========================================================================
  // Retry Logic Tests
  // =========================================================================

  describe('Retry Logic', () => {
    it('should calculate exponential backoff delay', () => {
      const error = new CustomApplicationError('Test', 'ERR_001', 500, 'error');
      
      const delay1 = errorTracker.getRetryDelay(error, 1);
      const delay2 = errorTracker.getRetryDelay(error, 2);
      const delay3 = errorTracker.getRetryDelay(error, 3);
      
      expect(delay1).toBe(100);
      expect(delay2).toBe(200);
      expect(delay3).toBe(400);
    });

    it('should cap retry delay at maximum', () => {
      const error = new CustomApplicationError('Test', 'ERR_001', 500, 'error');
      
      const delayMax = errorTracker.getRetryDelay(error, 10);
      expect(delayMax).toBeLessThanOrEqual(1600);
    });

    it('should have progressive delays', () => {
      const error = new CustomApplicationError('Test', 'ERR_001', 500, 'error');
      
      const delays = [];
      for (let i = 1; i <= 5; i++) {
        delays.push(errorTracker.getRetryDelay(error, i));
      }
      
      for (let i = 1; i < delays.length - 1; i++) {
        expect(delays[i]).toBeGreaterThanOrEqual(delays[i - 1]);
      }
    });
  });

  // =========================================================================
  // User Messaging Tests
  // =========================================================================

  describe('User Messaging', () => {
    it('should get user-friendly message', () => {
      const error = new CustomApplicationError('System error', 'SYS_001', 500, 'error');
      const message = errorTracker.getUserMessage(error);
      
      expect(message).toBeDefined();
      expect(message).not.toContain('System error');
    });

    it('should return default message for unknown error', () => {
      const error = new CustomApplicationError('Unknown', 'UNKNOWN_ERROR' as any, 500, 'error');
      const message = errorTracker.getUserMessage(error);
      
      expect(message).toBe('An error occurred. Please try again.');
    });

    it('should map API errors to friendly messages', () => {
      const error = new CustomApplicationError('Invalid', 'API_001', 400, 'error');
      const message = errorTracker.getUserMessage(error);
      
      expect(message).toContain('Invalid');
    });

    it('should get recommended action', () => {
      const error = new CustomApplicationError('Timeout', 'DB_002', 500, 'error');
      const action = errorTracker.getRecommendedAction(error);
      
      expect(action).toBeDefined();
      expect(action.length).toBeGreaterThan(0);
    });

    it('should return documentation link for unknown errors', () => {
      const error = new CustomApplicationError('Unknown', 'UNKNOWN' as any, 500, 'error');
      const action = errorTracker.getRecommendedAction(error);
      
      expect(action).toContain('documentation');
    });
  });

  // =========================================================================
  // Error Trend Analysis Tests
  // =========================================================================

  describe('Error Trend Analysis', () => {
    it('should get error trend', () => {
      errorTracker.trackError('API_001');
      errorTracker.trackError('API_001');
      errorTracker.trackError('DB_001');
      
      const trend = errorTracker.getErrorTrend(3600000);
      expect(trend).toBeGreaterThan(0);
    });

    it('should check if error rate is high', () => {
      for (let i = 0; i < 5; i++) {
        metricsCollector.recordAPICall({ endpoint: '/api', method: 'GET', duration: 50, status: 500 });
      }
      
      const isHigh = errorTracker.isErrorRateHigh(0.5, 3600000);
      expect(isHigh).toBe(true);
    });

    it('should detect low error rate', () => {
      metricsCollector.recordAPICall({ endpoint: '/api', method: 'GET', duration: 50, status: 200 });
      metricsCollector.recordAPICall({ endpoint: '/api', method: 'GET', duration: 50, status: 200 });
      
      const isHigh = errorTracker.isErrorRateHigh(0.5, 3600000);
      expect(isHigh).toBe(false);
    });
  });

  // =========================================================================
  // Dashboard Summary Tests
  // =========================================================================

  describe('Dashboard Summary', () => {
    it('should get dashboard summary', () => {
      errorTracker.trackError('API_001');
      errorTracker.trackError('API_001');
      errorTracker.trackError('SYS_003');
      
      const summary = errorTracker.getDashboardSummary();
      
      expect(summary.totalErrors).toBeGreaterThan(0);
      expect(summary.criticalErrors).toBeGreaterThan(0);
      expect(summary.recentErrors).toBeDefined();
      expect(summary.topErrors).toBeDefined();
      expect(summary.errorRate).toBeDefined();
    });

    it('should identify top errors', () => {
      errorTracker.trackError('API_001');
      errorTracker.trackError('API_001');
      errorTracker.trackError('API_001');
      errorTracker.trackError('DB_001');
      errorTracker.trackError('DB_001');
      
      const summary = errorTracker.getDashboardSummary();
      
      // First entry should be the most common
      expect(summary.topErrors[0]?.code).toBe('API_001');
      expect(summary.topErrors[0]?.count).toBeGreaterThanOrEqual(3);
    });

    it('should count critical errors', () => {
      errorTracker.trackError('SYS_003'); // critical
      errorTracker.trackError('SYS_003');
      errorTracker.trackError('API_001'); // error
      
      const summary = errorTracker.getDashboardSummary();
      
      expect(summary.criticalErrors).toBeGreaterThanOrEqual(2);
    });
  });

  // =========================================================================
  // Export Tests
  // =========================================================================

  describe('Export', () => {
    it('should export as JSON', () => {
      errorTracker.trackError('API_001');
      errorTracker.trackError('DB_001');
      
      const json = errorTracker.exportAsJSON();
      
      expect(json).toBeDefined();
      expect(json).toContain('API_001');
    });

    it('should export valid JSON', () => {
      errorTracker.trackError('API_001');
      
      const json = errorTracker.exportAsJSON();
      const parsed = JSON.parse(json);
      
      expect(parsed.timestamp).toBeDefined();
      expect(parsed.stats).toBeDefined();
      expect(parsed.history).toBeDefined();
    });
  });

  // =========================================================================
  // Integration Tests with MetricsCollector
  // =========================================================================

  describe('Integration with MetricsCollector', () => {
    it('should record errors in metrics', () => {
      errorTracker.trackError('API_001');
      errorTracker.trackError('DB_001');
      
      const metrics = metricsCollector.getMetrics();
      expect(metrics.errorMetrics.totalErrors).toBeGreaterThan(0);
    });

    it('should track multiple error types', () => {
      errorTracker.trackError('API_001');
      errorTracker.trackError('DB_001');
      errorTracker.trackError('AUTH_001');
      
      const stats = errorTracker.getErrorStats();
      expect(Object.keys(stats.byCode).length).toBeGreaterThanOrEqual(3);
    });
  });

  // =========================================================================
  // Edge Cases & Boundary Tests
  // =========================================================================

  describe('Edge Cases & Boundaries', () => {
    it('should handle error code case sensitivity', () => {
      const error = errorTracker.trackError('SYS_001');
      expect(error.code).toBe('SYS_001');
    });

    it('should maintain error history with many errors', () => {
      for (let i = 0; i < 100; i++) {
        errorTracker.trackError('API_001');
      }
      
      const reports = errorTracker.getAllErrorReports();
      expect(reports.length).toBeGreaterThan(0);
      expect(reports.length).toBeLessThanOrEqual(1000); // Max history limit
    });

    it('should handle zero severity properly', () => {
      const error = errorTracker.trackError('API_001');
      expect(['error', 'critical', 'warn']).toContain(error.severity);
    });

    it('should track errors with empty context', () => {
      const error = errorTracker.trackError('API_001', {});
      expect(error.context).toBeDefined();
    });

    it('should handle rapid error tracking', () => {
      for (let i = 0; i < 50; i++) {
        errorTracker.trackError('API_001');
      }
      
      const count = errorTracker.getErrorCount('API_001');
      expect(count).toBeGreaterThan(0);
    });
  });
});
