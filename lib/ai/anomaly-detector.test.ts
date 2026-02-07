// lib/ai/anomaly-detector.test.ts — Tests for anomaly-detector

import { test, expect, describe, afterEach, mock, beforeEach } from 'bun:test';

// Mock dependencies
mock.module('../core/structured-logger', () => ({
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
    fatal: () => {},
  },
}));

mock.module('../security/secret-audit-logger', () => ({
  auditLogger: {
    logSecretAccessFailure: async () => {},
    logSecretAccess: async () => {},
  },
}));

import { AnomalyDetector, type MetricData, type DetectionRule } from './anomaly-detector';

describe('AnomalyDetector', () => {
  let detector: AnomalyDetector;

  beforeEach(() => {
    // Reset singleton before each test
    (AnomalyDetector as any).instance = undefined;
    detector = AnomalyDetector.getInstance();
  });

  afterEach(() => {
    // Clean up timers
    if ((detector as any).detectionTimer) {
      clearInterval((detector as any).detectionTimer);
    }
    if ((detector as any).cleanupTimer) {
      clearInterval((detector as any).cleanupTimer);
    }
    detector.removeAllListeners();
    (AnomalyDetector as any).instance = undefined;
  });

  test('getInstance returns a singleton', () => {
    const a = AnomalyDetector.getInstance();
    const b = AnomalyDetector.getInstance();
    expect(a).toBe(b);
  });

  test('submitMetrics accepts MetricData', async () => {
    const data: MetricData = {
      timestamp: Date.now(),
      source: 'test-server',
      metrics: { cpu_usage: 45, memory_usage: 60 },
    };
    await expect(detector.submitMetrics(data)).resolves.toBeUndefined();
  });

  test('submitMetrics updates baselines after enough data points', async () => {
    // Baselines require >=10 data points from the same source
    for (let i = 0; i < 15; i++) {
      await detector.submitMetrics({
        timestamp: Date.now() + i,
        source: 'baseline-test',
        metrics: { cpu: 50 + Math.random() * 10, memory: 60 + Math.random() * 5 },
      });
    }

    const baselines = detector.getBaselines();
    expect(baselines.has('baseline-test')).toBe(true);

    const baseline = baselines.get('baseline-test')!;
    expect(baseline.source).toBe('baseline-test');
    expect(baseline.metrics).toHaveProperty('cpu');
    expect(baseline.metrics.cpu.mean).toBeGreaterThan(0);
    expect(baseline.metrics.cpu.stdDev).toBeGreaterThanOrEqual(0);
    expect(baseline.sampleSize).toBeGreaterThanOrEqual(10);
  });

  test('getBaselines returns a copy', () => {
    const a = detector.getBaselines();
    const b = detector.getBaselines();
    expect(a).not.toBe(b); // different Map instances
  });

  test('addRule adds a custom detection rule', () => {
    const rule: DetectionRule = {
      id: 'custom-001',
      name: 'Test Rule',
      type: 'security',
      conditions: [{ metric: 'test_metric', operator: '>', threshold: 100 }],
      severity: 'high',
      enabled: true,
    };

    detector.addRule(rule);

    // Verify rule exists via getStatistics
    const stats = detector.getStatistics();
    expect(stats.rulesActive).toBeGreaterThan(0);
  });

  test('removeRule removes a rule and returns true', () => {
    const rule: DetectionRule = {
      id: 'to-remove',
      name: 'Removable Rule',
      type: 'performance',
      conditions: [{ metric: 'latency', operator: '>', threshold: 500 }],
      severity: 'medium',
      enabled: true,
    };

    detector.addRule(rule);
    expect(detector.removeRule('to-remove')).toBe(true);
  });

  test('removeRule returns false for non-existent rule', () => {
    expect(detector.removeRule('does-not-exist')).toBe(false);
  });

  test('runDetection detects anomalies from submitted metrics', async () => {
    // Build baseline with consistent values
    for (let i = 0; i < 20; i++) {
      await detector.submitMetrics({
        timestamp: Date.now() + i,
        source: 'detection-test',
        metrics: { response_time: 100 },
      });
    }

    // Submit an anomalous value (way outside normal range)
    await detector.submitMetrics({
      timestamp: Date.now() + 100,
      source: 'detection-test',
      metrics: { response_time: 10000 },
    });

    const anomalies = await detector.runDetection();
    // Should detect the spike
    expect(anomalies.length).toBeGreaterThan(0);
  });

  test('getAnomalies returns all anomalies without filter', async () => {
    // Submit critical metric to trigger immediate anomaly
    await detector.submitMetrics({
      timestamp: Date.now(),
      source: 'critical-test',
      metrics: { cpu_usage_percent: 99 },
    });

    const all = detector.getAnomalies();
    expect(Array.isArray(all)).toBe(true);
  });

  test('getAnomalies filters by type', async () => {
    await detector.submitMetrics({
      timestamp: Date.now(),
      source: 'type-filter',
      metrics: { cpu_usage_percent: 99 },
    });

    const operational = detector.getAnomalies({ type: 'operational' });
    for (const a of operational) {
      expect(a.type).toBe('operational');
    }
  });

  test('getAnomalies filters by severity', async () => {
    await detector.submitMetrics({
      timestamp: Date.now(),
      source: 'sev-filter',
      metrics: { cpu_usage_percent: 99 },
    });

    const critical = detector.getAnomalies({ severity: 'critical' });
    for (const a of critical) {
      expect(a.severity).toBe('critical');
    }
  });

  test('getStatistics returns aggregate counts', () => {
    const stats = detector.getStatistics();
    expect(stats).toHaveProperty('totalAnomalies');
    expect(stats).toHaveProperty('anomaliesByType');
    expect(stats).toHaveProperty('anomaliesBySeverity');
    expect(stats).toHaveProperty('baselinesActive');
    expect(stats).toHaveProperty('rulesActive');
    expect(stats).toHaveProperty('detectionAccuracy');
    expect(stats).toHaveProperty('falsePositiveRate');
    expect(typeof stats.totalAnomalies).toBe('number');
  });

  test('default rules are initialized', () => {
    const stats = detector.getStatistics();
    // The constructor adds 6 default rules
    expect(stats.rulesActive).toBeGreaterThanOrEqual(6);
  });

  test('emits anomaly-detected event', async () => {
    let emitted = false;
    detector.on('anomaly-detected', () => {
      emitted = true;
    });

    // Trigger a critical anomaly
    await detector.submitMetrics({
      timestamp: Date.now(),
      source: 'event-test',
      metrics: { cpu_usage_percent: 99 },
    });

    expect(emitted).toBe(true);
  });
});
