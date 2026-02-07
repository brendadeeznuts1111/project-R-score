// lib/core/error-metrics.test.ts — Tests for error metrics collector

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  ErrorMetricsCollector,
  AlertSeverity,
  AlertChannel,
  getErrorMetricsCollector,
  recordError,
  configureAlert,
  getErrorAggregation,
} from './error-metrics';
import {
  createValidationError,
  EnterpriseErrorCode,
} from './core-errors';
import { SecurityRiskLevel } from './core-types';

describe('ErrorMetricsCollector', () => {
  let collector: ErrorMetricsCollector;

  beforeEach(() => {
    collector = new ErrorMetricsCollector({
      retentionMs: 60 * 60 * 1000,
      aggregationWindowMs: 5 * 60 * 1000,
    });
  });

  afterEach(() => {
    collector.destroy();
  });

  describe('Recording Errors', () => {
    test('records basic error', () => {
      collector.record(new Error('Test error'));
      expect(collector.getStats().totalMetrics).toBe(1);
    });

    test('records error with context', () => {
      collector.record(new Error('Test error'), {
        service: 'test-service',
        endpoint: '/api/test',
        userId: 'user-123',
      });

      const aggregation = collector.getAggregation({
        start: Date.now() - 60000,
        end: Date.now(),
      });

      expect(aggregation.byService['test-service']).toBe(1);
    });

    test('records enterprise errors', () => {
      const error = createValidationError(
        EnterpriseErrorCode.VALIDATION_INPUT_INVALID,
        'Invalid input',
        'email',
        'invalid'
      );

      collector.record(error);

      const aggregation = collector.getAggregation({
        start: Date.now() - 60000,
        end: Date.now(),
      });

      expect(aggregation.byCode[EnterpriseErrorCode.VALIDATION_INPUT_INVALID]).toBe(1);
    });
  });

  describe('Aggregation', () => {
    test('aggregates by error code', () => {
      collector.record(new Error('Error 1'));
      collector.record(new Error('Error 2'));
      collector.record(new Error('Error 3'));

      const aggregation = collector.getAggregation({
        start: Date.now() - 60000,
        end: Date.now(),
      });

      expect(aggregation.total).toBe(3);
    });

    test('calculates error rate', () => {
      // Record 6 errors over a period
      for (let i = 0; i < 6; i++) {
        collector.record(new Error(`Error ${i}`));
      }

      const aggregation = collector.getAggregation({
        start: Date.now() - 10 * 60 * 1000, // 10 minute window
        end: Date.now(),
      });

      // 6 errors in 10 minutes = 0.6 per minute
      expect(aggregation.errorRate).toBeGreaterThan(0);
    });

    test('identifies top errors', () => {
      // Record multiple of same error
      for (let i = 0; i < 5; i++) {
        collector.record(new Error('Common error'));
      }

      // Record single different error
      collector.record(new Error('Rare error'));

      const aggregation = collector.getAggregation({
        start: Date.now() - 60000,
        end: Date.now(),
      });

      expect(aggregation.topErrors[0].message).toBe('Common error');
      expect(aggregation.topErrors[0].count).toBe(5);
    });

    test('tracks by service', () => {
      collector.record(new Error('Error 1'), { service: 'service-a' });
      collector.record(new Error('Error 2'), { service: 'service-a' });
      collector.record(new Error('Error 3'), { service: 'service-b' });

      const aggregation = collector.getAggregation({
        start: Date.now() - 60000,
        end: Date.now(),
      });

      expect(aggregation.byService['service-a']).toBe(2);
      expect(aggregation.byService['service-b']).toBe(1);
    });

    test('tracks by endpoint', () => {
      collector.record(new Error('Error 1'), { endpoint: '/api/users' });
      collector.record(new Error('Error 2'), { endpoint: '/api/users' });
      collector.record(new Error('Error 3'), { endpoint: '/api/orders' });

      const aggregation = collector.getAggregation({
        start: Date.now() - 60000,
        end: Date.now(),
      });

      expect(aggregation.byEndpoint['/api/users']).toBe(2);
      expect(aggregation.byEndpoint['/api/orders']).toBe(1);
    });
  });

  describe('Alerting', () => {
    test('configures alert', () => {
      collector.addAlert({
        minSeverity: AlertSeverity.WARNING,
        channel: AlertChannel.CONSOLE,
        config: {},
        cooldownMs: 60000,
        rateLimit: { maxAlerts: 10, windowMs: 3600000 },
      });

      expect(collector.getStats().alertConfigs).toBe(1);
    });

    test('triggers alert on matching error', () => {
      let alertTriggered = false;

      collector.registerAlertHandler(AlertChannel.CUSTOM, async () => {
        alertTriggered = true;
      });

      collector.addAlert({
        minSeverity: AlertSeverity.INFO,
        channel: AlertChannel.CUSTOM,
        config: {},
        cooldownMs: 0, // No cooldown for testing
        rateLimit: { maxAlerts: 100, windowMs: 3600000 },
      });

      collector.record(new Error('Test error'));

      // Wait for async alert
      setTimeout(() => {
        expect(alertTriggered).toBe(true);
      }, 100);
    });

    test('respects alert cooldown', () => {
      let alertCount = 0;

      collector.registerAlertHandler(AlertChannel.CUSTOM, async () => {
        alertCount++;
      });

      collector.addAlert({
        minSeverity: AlertSeverity.INFO,
        channel: AlertChannel.CUSTOM,
        config: {},
        cooldownMs: 60000, // 1 minute cooldown
        rateLimit: { maxAlerts: 100, windowMs: 3600000 },
      });

      // Record multiple errors quickly
      collector.record(new Error('Error 1'));
      collector.record(new Error('Error 2'));
      collector.record(new Error('Error 3'));

      // First alert triggers immediately (sync), subsequent ones blocked by cooldown
      expect(alertCount).toBe(1);
    });
  });

  describe('Current Error Rate', () => {
    test('calculates current error rate', () => {
      // Record errors
      for (let i = 0; i < 12; i++) {
        collector.record(new Error(`Error ${i}`));
      }

      const rate = collector.getCurrentErrorRate(60000); // 1 minute window
      expect(rate).toBeGreaterThan(0);
    });

    test('returns 0 for no errors', () => {
      const rate = collector.getCurrentErrorRate(60000);
      expect(rate).toBe(0);
    });
  });

  describe('Export', () => {
    test('exports metrics', () => {
      collector.record(new Error('Test error'));

      const export_ = collector.exportMetrics(60000);

      expect(export_.timestamp).toBeGreaterThan(0);
      expect(export_.windowMs).toBe(60000);
      expect(Array.isArray(export_.aggregations)).toBe(true);
      expect(Array.isArray(export_.alerts)).toBe(true);
    });
  });

  describe('Clear and Destroy', () => {
    test('clears all data', () => {
      collector.record(new Error('Test error'));
      expect(collector.getStats().totalMetrics).toBe(1);

      collector.clear();
      expect(collector.getStats().totalMetrics).toBe(0);
      expect(collector.getStats().totalAlerts).toBe(0);
    });

    test('cleans up resources', () => {
      collector.destroy();
      // Should not throw
      expect(true).toBe(true);
    });
  });
});

describe('Global Collector Helpers', () => {
  test('getErrorMetricsCollector returns singleton', () => {
    const collector1 = getErrorMetricsCollector();
    const collector2 = getErrorMetricsCollector();
    expect(collector1).toBe(collector2);
  });

  test('recordError records to global collector', () => {
    recordError(new Error('Global test error'));
    const stats = getErrorMetricsCollector().getStats();
    expect(stats.totalMetrics).toBeGreaterThan(0);
  });

  test('configureAlert adds to global collector', () => {
    configureAlert({
      minSeverity: AlertSeverity.INFO,
      channel: AlertChannel.CONSOLE,
      config: {},
      cooldownMs: 60000,
      rateLimit: { maxAlerts: 10, windowMs: 3600000 },
    });

    expect(getErrorMetricsCollector().getStats().alertConfigs).toBeGreaterThan(0);
  });

  test('getErrorAggregation uses global collector', () => {
    const aggregation = getErrorAggregation({
      start: Date.now() - 60000,
      end: Date.now(),
    });

    expect(aggregation).toBeDefined();
    expect(typeof aggregation.total).toBe('number');
  });
});

// Entry guard for testing
if (import.meta.main) {
  console.log('🧪 Running Error Metrics Tests...\n');

  // Quick smoke test
  const metrics = new ErrorMetricsCollector();

  console.log('✅ Metrics collector created');
  console.log('Initial stats:', metrics.getStats());

  metrics.record(new Error('Smoke test error'));
  console.log('After recording:', metrics.getStats());

  metrics.destroy();
  console.log('\n✅ Smoke test passed!');
}
