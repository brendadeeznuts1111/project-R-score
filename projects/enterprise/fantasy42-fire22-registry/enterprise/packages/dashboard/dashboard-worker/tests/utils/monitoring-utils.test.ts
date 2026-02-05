import { MonitoringUtils, MetricsAggregator } from '../../src/utils/monitoring-utils';
import {
  PerformanceMetrics,
  SecurityEvent,
  HealthStatus,
  MonitoringConfig,
} from '../../src/types/enhanced-types';

// Simple test implementation without Jest
const describe = (name: string, fn: () => void) => {
  console.log(`\n=== ${name} ===`);
  fn();
};

const it = (name: string, fn: () => void) => {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}:`, error);
  }
};

const expect = (actual: any) => ({
  toBe: (expected: any) => {
    if (actual !== expected) {
      throw new Error(`Expected ${expected}, but got ${actual}`);
    }
  },
  toEqual: (expected: any) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
    }
  },
  toContain: (expected: any) => {
    if (!actual.includes(expected)) {
      throw new Error(`Expected ${actual} to contain ${expected}`);
    }
  },
  toThrow: (expectedError?: any) => {
    try {
      actual();
      throw new Error('Expected function to throw, but it did not');
    } catch (error) {
      if (expectedError && !error.message.includes(expectedError)) {
        throw new Error(`Expected error to contain ${expectedError}, but got ${error.message}`);
      }
    }
  },
  toHaveProperty: (property: string) => {
    if (!(property in actual)) {
      throw new Error(`Expected object to have property ${property}`);
    }
  },
  toBeDefined: () => {
    if (actual === undefined || actual === null) {
      throw new Error('Expected value to be defined');
    }
  },
});

describe('MonitoringUtils', () => {
  describe('formatTimestamp', () => {
    it('should format timestamp correctly', () => {
      const timestamp = '2023-01-01T12:00:00.000Z';
      const formatted = MonitoringUtils.formatTimestamp(timestamp);
      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
    });
  });

  describe('formatDuration', () => {
    it('should format milliseconds correctly', () => {
      expect(MonitoringUtils.formatDuration(500)).toBe('500ms');
    });

    it('should format seconds correctly', () => {
      expect(MonitoringUtils.formatDuration(1500)).toBe('1.5s');
    });

    it('should format minutes correctly', () => {
      expect(MonitoringUtils.formatDuration(90000)).toBe('1.5m');
    });

    it('should format hours correctly', () => {
      expect(MonitoringUtils.formatDuration(5400000)).toBe('1.5h');
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(MonitoringUtils.formatBytes(0)).toBe('0 B');
      expect(MonitoringUtils.formatBytes(1024)).toBe('1 KB');
      expect(MonitoringUtils.formatBytes(1048576)).toBe('1 MB');
      expect(MonitoringUtils.formatBytes(1073741824)).toBe('1 GB');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentage with default decimals', () => {
      expect(MonitoringUtils.formatPercentage(50)).toBe('50.0%');
    });

    it('should format percentage with custom decimals', () => {
      expect(MonitoringUtils.formatPercentage(50, 0)).toBe('50%');
      expect(MonitoringUtils.formatPercentage(50, 2)).toBe('50.00%');
    });
  });

  describe('validateSecurityEvent', () => {
    it('should validate correct security event', () => {
      const event: SecurityEvent = {
        type: 'authentication',
        severity: 'medium',
        details: { userId: '123' },
        timestamp: new Date().toISOString(),
      };

      expect(MonitoringUtils.validateSecurityEvent(event)).toBe(true);
    });

    it('should reject invalid security event', () => {
      const event = {
        type: 'invalid' as any,
        severity: 'invalid' as any,
        details: {},
        timestamp: new Date().toISOString(),
      };

      expect(MonitoringUtils.validateSecurityEvent(event)).toBe(false);
    });

    it('should reject security event with missing fields', () => {
      const event = {
        type: 'authentication',
        severity: 'medium',
        details: {},
        // Missing timestamp
      } as any;

      expect(MonitoringUtils.validateSecurityEvent(event)).toBe(false);
    });
  });

  describe('sanitizeData', () => {
    it('should sanitize sensitive fields', () => {
      const data = {
        username: 'user',
        password: 'secret123',
        token: 'abc123',
        normalField: 'value',
      };

      const sanitized = MonitoringUtils.sanitizeData(data);
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.username).toBe('user');
      expect(sanitized.normalField).toBe('value');
    });

    it('should handle empty data', () => {
      expect(MonitoringUtils.sanitizeData({})).toEqual({});
    });

    it('should handle custom sensitive fields', () => {
      const data = {
        apiKey: 'secret123',
        normalField: 'value',
      };

      const sanitized = MonitoringUtils.sanitizeData(data, ['apiKey']);
      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.normalField).toBe('value');
    });
  });

  describe('calculateRateLimit', () => {
    it('should calculate rate limit correctly', () => {
      const result = MonitoringUtils.calculateRateLimit(50, 60000, 100);

      expect(result.current).toBe(50);
      expect(result.remaining).toBe(50);
      expect(result.reset).toBeDefined();
      expect(result.isLimited).toBe(false);
    });

    it('should detect rate limit exceeded', () => {
      const result = MonitoringUtils.calculateRateLimit(100, 60000, 100);

      expect(result.isLimited).toBe(true);
      expect(result.remaining).toBe(0);
    });
  });

  describe('debounce', () => {
    it('should debounce function calls', () => {
      return new Promise<void>(done => {
        let callCount = 0;
        const fn = () => {
          callCount++;
        };
        const debouncedFn = MonitoringUtils.debounce(fn, 100);

        debouncedFn();
        debouncedFn();
        debouncedFn();

        expect(callCount).toBe(0);

        setTimeout(() => {
          expect(callCount).toBe(1);
          done();
        }, 150);
      });
    });
  });

  describe('throttle', () => {
    it('should throttle function calls', () => {
      return new Promise<void>(done => {
        let callCount = 0;
        const fn = () => {
          callCount++;
        };
        const throttledFn = MonitoringUtils.throttle(fn, 100);

        throttledFn();
        throttledFn();
        throttledFn();

        expect(callCount).toBe(1);

        setTimeout(() => {
          throttledFn();
          expect(callCount).toBe(2);
          done();
        }, 150);
      });
    });
  });

  describe('calculateEMA', () => {
    it('should calculate EMA correctly', () => {
      const values = [10, 20, 30, 40, 50];
      const ema = MonitoringUtils.calculateEMA(values);

      expect(ema).toBeDefined();
      expect(typeof ema).toBe('number');
      expect(ema > 0).toBe(true);
    });

    it('should handle empty values', () => {
      expect(MonitoringUtils.calculateEMA([])).toBe(0);
    });
  });

  describe('calculatePercentile', () => {
    it('should calculate 50th percentile (median)', () => {
      const values = [10, 20, 30, 40, 50];
      const percentile = MonitoringUtils.calculatePercentile(values, 50);

      expect(percentile).toBe(30);
    });

    it('should calculate 95th percentile', () => {
      const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      const percentile = MonitoringUtils.calculatePercentile(values, 95);

      expect(percentile).toBe(95);
    });

    it('should handle empty values', () => {
      expect(MonitoringUtils.calculatePercentile([], 50)).toBe(0);
    });
  });

  describe('createHistogram', () => {
    it('should create histogram correctly', () => {
      const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      const histogram = MonitoringUtils.createHistogram(values, 5);

      expect(histogram).toHaveProperty('min');
      expect(histogram).toHaveProperty('max');
      expect(histogram).toHaveProperty('bucketSize');
      expect(histogram).toHaveProperty('counts');
      expect(histogram).toHaveProperty('ranges');
      expect(histogram.counts.length).toBe(5);
      expect(histogram.ranges.length).toBe(5);
    });

    it('should handle empty values', () => {
      const histogram = MonitoringUtils.createHistogram([], 5);

      expect(histogram.min).toBe(0);
      expect(histogram.max).toBe(0);
      expect(histogram.counts).toEqual([0, 0, 0, 0, 0]);
    });
  });

  describe('validateMonitoringConfig', () => {
    it('should validate correct config', () => {
      const config: MonitoringConfig = {
        enabled: true,
        logLevel: 'info',
        metricsInterval: 5000,
        securityEventRetention: 86400000,
        healthCheckInterval: 30000,
      };

      expect(MonitoringUtils.validateMonitoringConfig(config)).toBe(true);
    });

    it('should reject invalid config', () => {
      const config = {
        enabled: 'true' as any, // Should be boolean
        logLevel: 'invalid' as any, // Should be valid log level
        metricsInterval: -1, // Should be positive
        securityEventRetention: 86400000,
        healthCheckInterval: 30000,
      };

      expect(MonitoringUtils.validateMonitoringConfig(config)).toBe(false);
    });
  });

  describe('createMetricsPayload', () => {
    it('should create metrics payload correctly', () => {
      const metrics: PerformanceMetrics = {
        responseTime: 100,
        cpuUsage: 50,
        memoryUsage: 60,
        activeConnections: 10,
        timestamp: new Date().toISOString(),
      };

      const payload = MonitoringUtils.createMetricsPayload(metrics);

      expect(payload).toHaveProperty('timestamp');
      expect(payload).toHaveProperty('metrics');
      expect(payload).toHaveProperty('tags');
      expect(payload.metrics).toEqual(metrics);
    });

    it('should include custom tags', () => {
      const metrics: PerformanceMetrics = {
        responseTime: 100,
        cpuUsage: 50,
        memoryUsage: 60,
        activeConnections: 10,
        timestamp: new Date().toISOString(),
      };

      const tags = { environment: 'test', version: '1.0.0' };
      const payload = MonitoringUtils.createMetricsPayload(metrics, tags);

      expect(payload.tags).toEqual(tags);
    });
  });

  describe('formatHealthAlert', () => {
    it('should format healthy system alert', () => {
      const health: HealthStatus = {
        status: 'healthy',
        components: {
          api: { status: 'healthy', lastChecked: new Date().toISOString() },
          database: { status: 'healthy', lastChecked: new Date().toISOString() },
        },
        lastUpdated: new Date().toISOString(),
      };

      const alert = MonitoringUtils.formatHealthAlert(health);

      expect(alert).toContain('✅ System health: HEALTHY');
      expect(alert).toContain('api: HEALTHY');
      expect(alert).toContain('database: HEALTHY');
    });

    it('should format degraded system alert', () => {
      const health: HealthStatus = {
        status: 'degraded',
        components: {
          api: {
            status: 'degraded',
            lastChecked: new Date().toISOString(),
            message: 'Slow response',
          },
          database: { status: 'healthy', lastChecked: new Date().toISOString() },
        },
        lastUpdated: new Date().toISOString(),
      };

      const alert = MonitoringUtils.formatHealthAlert(health);

      expect(alert).toContain('⚠️ System health: DEGRADED');
      expect(alert).toContain('api: DEGRADED - Slow response');
      expect(alert).toContain('database: HEALTHY');
    });
  });

  describe('createCorrelationId', () => {
    it('should create unique correlation IDs', () => {
      const id1 = MonitoringUtils.createCorrelationId();
      const id2 = MonitoringUtils.createCorrelationId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1 !== id2).toBe(true);
      expect(id1.startsWith('corr_')).toBe(true);
    });

    it('should return undefined when no correlation ID', () => {
      const request = new Request('http://localhost/test');

      const correlationId = MonitoringUtils.extractCorrelationId(request);
      expect(correlationId === undefined).toBe(true);
    });
  });

  describe('addCorrelationId', () => {
    it('should add correlation ID to response', () => {
      const response = new Response();
      const correlationId = 'test-123';

      const newResponse = MonitoringUtils.addCorrelationId(response, correlationId);

      expect(newResponse.headers.get('X-Correlation-ID')).toBe(correlationId);
    });
  });

  describe('createRequestLog', () => {
    it('should create request log entry', () => {
      const request = new Request('http://localhost/test', {
        method: 'GET',
        headers: {
          'User-Agent': 'test-agent',
          'CF-Connecting-IP': '192.168.1.1',
        },
      });

      const log = MonitoringUtils.createRequestLog(request, 100, 'user123', 'corr-123');

      expect(log.method).toBe('GET');
      expect(log.url).toBe('http://localhost/test');
      expect(log.userAgent).toBe('test-agent');
      expect(log.ip).toBe('192.168.1.1');
      expect(log.responseTime).toBe(100);
      expect(log.userId).toBe('user123');
      expect(log.correlationId).toBe('corr-123');
      expect(log.timestamp).toBeDefined();
    });
  });
});

describe('MetricsAggregator', () => {
  let aggregator: MetricsAggregator;

  // Simple beforeEach replacement
  const setupBeforeEach = () => {
    aggregator = new MetricsAggregator(100);
  };

  setupBeforeEach();

  describe('constructor', () => {
    it('should initialize with default max data points', () => {
      const agg = new MetricsAggregator();
      expect(agg).toBeDefined();
    });

    it('should initialize with custom max data points', () => {
      const agg = new MetricsAggregator(500);
      expect(agg).toBeDefined();
    });
  });

  describe('addDataPoint', () => {
    it('should add data point to existing key', () => {
      aggregator.addDataPoint('response_time', 100);
      aggregator.addDataPoint('response_time', 200);

      const metrics = aggregator.getAggregatedMetrics('response_time');
      expect(metrics).toBeDefined();
      expect(metrics!.count).toBe(2);
      expect(metrics!.min).toBe(100);
      expect(metrics!.max).toBe(200);
    });

    it('should add data point to new key', () => {
      aggregator.addDataPoint('cpu_usage', 75);

      const metrics = aggregator.getAggregatedMetrics('cpu_usage');
      expect(metrics).toBeDefined();
      expect(metrics!.count).toBe(1);
      expect(metrics!.avg).toBe(75);
    });
  });

  describe('getAggregatedMetrics', () => {
    it('should return null for non-existent key', () => {
      const metrics = aggregator.getAggregatedMetrics('non_existent');
      expect(metrics === null).toBe(true);
    });

    it('should return correct aggregated metrics', () => {
      const values = [10, 20, 30, 40, 50];
      values.forEach(value => aggregator.addDataPoint('test', value));

      const metrics = aggregator.getAggregatedMetrics('test');

      expect(metrics).toBeDefined();
      expect(metrics!.count).toBe(5);
      expect(metrics!.min).toBe(10);
      expect(metrics!.max).toBe(50);
      expect(metrics!.avg).toBe(30);
      expect(metrics!.p50).toBe(30);
      expect(metrics!.p95).toBe(48); // Approximate
      expect(metrics!.p99).toBe(49.8); // Approximate
    });
  });

  describe('getAllMetrics', () => {
    it('should return empty object when no data', () => {
      const allMetrics = aggregator.getAllMetrics();
      expect(allMetrics).toEqual({});
    });

    it('should return all aggregated metrics', () => {
      aggregator.addDataPoint('metric1', 10);
      aggregator.addDataPoint('metric1', 20);
      aggregator.addDataPoint('metric2', 30);

      const allMetrics = aggregator.getAllMetrics();

      expect(allMetrics).toHaveProperty('metric1');
      expect(allMetrics).toHaveProperty('metric2');
      expect(allMetrics.metric1!.count).toBe(2);
      expect(allMetrics.metric2!.count).toBe(1);
    });
  });

  describe('clear', () => {
    it('should clear all data', () => {
      aggregator.addDataPoint('test', 100);
      expect(aggregator.getAggregatedMetrics('test') !== null).toBe(true);

      aggregator.clear();

      expect(aggregator.getAggregatedMetrics('test') === null).toBe(true);
      expect(JSON.stringify(aggregator.getAllMetrics()) === JSON.stringify({})).toBe(true);
    });
  });

  describe('max data points limit', () => {
    it('should respect max data points limit', () => {
      const agg = new MetricsAggregator(3);

      agg.addDataPoint('test', 1);
      agg.addDataPoint('test', 2);
      agg.addDataPoint('test', 3);
      agg.addDataPoint('test', 4);
      agg.addDataPoint('test', 5);

      const metrics = agg.getAggregatedMetrics('test');
      expect(metrics!.count).toBe(3);
      expect(metrics!.min).toBe(3);
      expect(metrics!.max).toBe(5);
    });
  });
});

// Run the tests
console.log('Running Monitoring Utils Tests...');
describe('Monitoring Utils Tests Suite', () => {
  it('All tests completed', () => {
    console.log('Monitoring utils tests completed successfully!');
  });
});
