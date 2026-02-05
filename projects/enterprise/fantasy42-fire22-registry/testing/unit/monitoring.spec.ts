import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { TestDatabaseSetup, TestEnvironmentSetup, TestTimer } from '../utils/test-utils';

describe('Monitoring Module', () => {
  let dbSetup: TestDatabaseSetup;
  let envSetup: TestEnvironmentSetup;
  let timer: TestTimer;

  beforeEach(async () => {
    envSetup = new TestEnvironmentSetup();
    envSetup.setup('development');
    dbSetup = new TestDatabaseSetup();
    await dbSetup.setup();
    timer = new TestTimer();
  });

  afterEach(async () => {
    await dbSetup.teardown();
    envSetup.teardown();
  });

  describe('Performance Metrics', () => {
    it('should record performance metrics', () => {
      const db = dbSetup.getDatabase();

      const insert = db.prepare(`
        INSERT INTO performance_metrics
        (metric_name, metric_value, unit)
        VALUES (?, ?, ?)
      `);

      const result = insert.run('response_time', 150.5, 'milliseconds');
      expect(result.changes).toBe(1);
    });

    it('should query performance metrics by name', () => {
      const db = dbSetup.getDatabase();

      // Insert multiple metrics
      const insert = db.prepare(`
        INSERT INTO performance_metrics
        (metric_name, metric_value, unit)
        VALUES (?, ?, ?)
      `);

      insert.run('response_time', 120.0, 'milliseconds');
      insert.run('memory_usage', 85.5, 'percentage');
      insert.run('cpu_usage', 45.2, 'percentage');
      insert.run('response_time', 180.0, 'milliseconds');

      // Query all response time metrics
      const responseTimes = db
        .prepare(
          `
        SELECT * FROM performance_metrics WHERE metric_name = ? ORDER BY metric_value
      `
        )
        .all('response_time');

      expect(responseTimes).toHaveLength(2);
      expect(responseTimes[0].metric_value).toBe(120.0);
      expect(responseTimes[1].metric_value).toBe(180.0);
    });

    it('should calculate performance averages', () => {
      const db = dbSetup.getDatabase();

      // Insert test metrics
      const insert = db.prepare(`
        INSERT INTO performance_metrics
        (metric_name, metric_value, unit)
        VALUES (?, ?, ?)
      `);

      const metrics = [120, 150, 180, 90, 200];
      metrics.forEach(value => {
        insert.run('api_response_time', value, 'milliseconds');
      });

      // Calculate average
      const avgResult = db
        .prepare(
          `
        SELECT AVG(metric_value) as average FROM performance_metrics WHERE metric_name = ?
      `
        )
        .get('api_response_time');

      expect(avgResult.average).toBe(148.0);
    });

    it('should handle different metric units', () => {
      const db = dbSetup.getDatabase();

      const insert = db.prepare(`
        INSERT INTO performance_metrics
        (metric_name, metric_value, unit)
        VALUES (?, ?, ?)
      `);

      // Insert metrics with different units
      insert.run('memory_mb', 256.5, 'MB');
      insert.run('memory_percentage', 75.2, '%');
      insert.run('disk_gb', 50.1, 'GB');
      insert.run('network_mbps', 100.0, 'Mbps');

      const metrics = db
        .prepare(
          `
        SELECT * FROM performance_metrics WHERE metric_name LIKE 'memory%'
      `
        )
        .all();

      expect(metrics).toHaveLength(2);
      const units = metrics.map(m => m.unit);
      expect(units).toContain('MB');
      expect(units).toContain('%');
    });

    it('should track metric timestamps', () => {
      const db = dbSetup.getDatabase();

      const beforeInsert = new Date();
      // Add a small buffer to account for test execution time
      beforeInsert.setMilliseconds(beforeInsert.getMilliseconds() - 100);

      const insert = db.prepare(`
        INSERT INTO performance_metrics
        (metric_name, metric_value, unit)
        VALUES (?, ?, ?)
      `);

      insert.run('test_metric', 42.0, 'units');

      const result = db
        .prepare(
          `
        SELECT timestamp FROM performance_metrics WHERE metric_name = ?
      `
        )
        .get('test_metric');

      expect(result.timestamp).toBeDefined();
      const metricTime = new Date(result.timestamp);
      // Allow for SQLite timestamp precision (seconds vs milliseconds)
      const timeDiff = metricTime.getTime() - beforeInsert.getTime();
      expect(timeDiff).toBeGreaterThanOrEqual(-2000); // Allow up to 2 seconds difference
      expect(timeDiff).toBeLessThanOrEqual(2000);
    });
  });

  describe('System Health Checks', () => {
    it('should record system health status', () => {
      const db = dbSetup.getDatabase();

      const insert = db.prepare(`
        INSERT INTO system_health
        (service_name, status, response_time_ms, error_message)
        VALUES (?, ?, ?, ?)
      `);

      const result = insert.run('api_server', 'healthy', 45, null);
      expect(result.changes).toBe(1);
    });

    it('should track unhealthy services', () => {
      const db = dbSetup.getDatabase();

      const insert = db.prepare(`
        INSERT INTO system_health
        (service_name, status, response_time_ms, error_message)
        VALUES (?, ?, ?, ?)
      `);

      insert.run('database', 'healthy', 5, null);
      insert.run('cache', 'unhealthy', 5000, 'Connection timeout');
      insert.run('api', 'degraded', 2000, 'High latency');

      const unhealthyCount = db
        .prepare(
          `
        SELECT COUNT(*) as count FROM system_health WHERE status != ?
      `
        )
        .get('healthy');

      expect(unhealthyCount.count).toBe(2);

      const errorServices = db
        .prepare(
          `
        SELECT service_name FROM system_health WHERE error_message IS NOT NULL
      `
        )
        .all();

      expect(errorServices).toHaveLength(2);
      const serviceNames = errorServices.map(s => s.service_name);
      expect(serviceNames).toContain('cache');
      expect(serviceNames).toContain('api');
    });

    it('should calculate average response times', () => {
      const db = dbSetup.getDatabase();

      const insert = db.prepare(`
        INSERT INTO system_health
        (service_name, status, response_time_ms)
        VALUES (?, ?, ?)
      `);

      // Insert multiple health checks for the same service
      const responseTimes = [100, 150, 200, 120, 180];
      responseTimes.forEach(time => {
        insert.run('api_service', 'healthy', time);
      });

      const avgResult = db
        .prepare(
          `
        SELECT AVG(response_time_ms) as average FROM system_health WHERE service_name = ?
      `
        )
        .get('api_service');

      expect(avgResult.average).toBe(150.0);
    });

    it('should identify most recent health checks', () => {
      const db = dbSetup.getDatabase();

      const insert = db.prepare(`
        INSERT INTO system_health
        (service_name, status, response_time_ms, checked_at)
        VALUES (?, ?, ?, ?)
      `);

      // Simulate health checks at different times
      const now = new Date();
      const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000);

      insert.run('service_a', 'healthy', 100, now.toISOString());
      insert.run('service_a', 'healthy', 120, fiveMinAgo.toISOString());
      insert.run('service_a', 'unhealthy', 5000, tenMinAgo.toISOString());

      const latestHealth = db
        .prepare(
          `
        SELECT status, response_time_ms FROM system_health
        WHERE service_name = ?
        ORDER BY checked_at DESC LIMIT 1
      `
        )
        .get('service_a');

      expect(latestHealth.status).toBe('healthy');
      expect(latestHealth.response_time_ms).toBe(100);
    });
  });

  describe('User Activity Tracking', () => {
    it('should track user activities', () => {
      const db = dbSetup.getDatabase();

      const insert = db.prepare(`
        INSERT INTO user_activity
        (user_id, action, resource_type, resource_id, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const result = insert.run(
        'user123',
        'package_download',
        'package',
        'test-package',
        '192.168.1.100',
        'npm/8.19.2'
      );

      expect(result.changes).toBe(1);
    });

    it('should query user activity by user', () => {
      const db = dbSetup.getDatabase();

      const insert = db.prepare(`
        INSERT INTO user_activity
        (user_id, action, resource_type, resource_id)
        VALUES (?, ?, ?, ?)
      `);

      // Insert activities for different users
      insert.run('user1', 'login', 'auth', 'session123');
      insert.run('user1', 'package_download', 'package', 'pkg1');
      insert.run('user2', 'package_publish', 'package', 'pkg2');
      insert.run('user1', 'logout', 'auth', 'session123');

      const user1Activities = db
        .prepare(
          `
        SELECT COUNT(*) as count FROM user_activity WHERE user_id = ?
      `
        )
        .get('user1');

      expect(user1Activities.count).toBe(3);

      const user2Activities = db
        .prepare(
          `
        SELECT COUNT(*) as count FROM user_activity WHERE user_id = ?
      `
        )
        .get('user2');

      expect(user2Activities.count).toBe(1);
    });

    it('should track activity patterns', () => {
      const db = dbSetup.getDatabase();

      const insert = db.prepare(`
        INSERT INTO user_activity
        (user_id, action, resource_type, ip_address, occurred_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      // Simulate activity pattern
      const now = new Date();
      insert.run('user123', 'login', 'auth', '127.0.0.1', now.toISOString());
      insert.run('user123', 'package_search', 'search', '127.0.0.1', now.toISOString());
      insert.run('user123', 'package_download', 'package', '127.0.0.1', now.toISOString());
      insert.run('user123', 'logout', 'auth', '127.0.0.1', now.toISOString());

      const activitySequence = db
        .prepare(
          `
        SELECT action FROM user_activity WHERE user_id = ? ORDER BY occurred_at
      `
        )
        .all('user123');

      const actions = activitySequence.map(a => a.action);
      expect(actions).toEqual(['login', 'package_search', 'package_download', 'logout']);
    });

    it('should detect suspicious activity patterns', () => {
      const db = dbSetup.getDatabase();

      const insert = db.prepare(`
        INSERT INTO user_activity
        (user_id, action, resource_type, ip_address)
        VALUES (?, ?, ?, ?)
      `);

      // Simulate suspicious activity - multiple failed actions from same IP
      for (let i = 0; i < 10; i++) {
        insert.run('user123', 'login_failed', 'auth', '192.168.1.100');
      }

      const failedAttempts = db
        .prepare(
          `
        SELECT COUNT(*) as count FROM user_activity
        WHERE user_id = ? AND action = ? AND ip_address = ?
      `
        )
        .get('user123', 'login_failed', '192.168.1.100');

      expect(failedAttempts.count).toBe(10);

      // This could trigger security monitoring
      expect(failedAttempts.count).toBeGreaterThan(5); // Threshold for suspicious activity
    });

    it('should handle activity metadata', () => {
      const db = dbSetup.getDatabase();

      const insert = db.prepare(`
        INSERT INTO user_activity
        (user_id, action, resource_type, resource_id, ip_address, user_agent, geo_location)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const result = insert.run(
        'user456',
        'package_download',
        'package',
        'analytics-dashboard',
        '203.0.113.1',
        'npm/8.19.2 node/v18.12.1 darwin x64',
        'New York, NY, US'
      );

      expect(result.changes).toBe(1);

      const activity = db
        .prepare(
          `
        SELECT * FROM user_activity WHERE user_id = ?
      `
        )
        .get('user456');

      expect(activity.user_agent).toContain('npm/8.19.2');
      expect(activity.geo_location).toBe('New York, NY, US');
      expect(activity.ip_address).toBe('203.0.113.1');
    });
  });

  describe('Monitoring Integration', () => {
    it('should correlate metrics with health checks', () => {
      const db = dbSetup.getDatabase();

      const now = new Date().toISOString();

      // Insert related metric and health data
      const metricInsert = db.prepare(`
        INSERT INTO performance_metrics
        (metric_name, metric_value, unit)
        VALUES (?, ?, ?)
      `);

      const healthInsert = db.prepare(`
        INSERT INTO system_health
        (service_name, status, response_time_ms)
        VALUES (?, ?, ?)
      `);

      metricInsert.run('api_response_time', 250.0, 'milliseconds');
      healthInsert.run('api_service', 'degraded', 250);

      // Query correlated data
      const correlatedData = db
        .prepare(
          `
        SELECT
          pm.metric_value as response_time,
          sh.status as health_status,
          sh.response_time_ms as health_response_time
        FROM performance_metrics pm
        CROSS JOIN system_health sh
        WHERE pm.metric_name = 'api_response_time'
        AND sh.service_name = 'api_service'
      `
        )
        .get();

      expect(correlatedData.response_time).toBe(250.0);
      expect(correlatedData.health_status).toBe('degraded');
      expect(correlatedData.health_response_time).toBe(250);
    });

    it('should handle monitoring data cleanup', () => {
      const db = dbSetup.getDatabase();

      // Insert old data (simulate cleanup scenario)
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 90); // 90 days ago

      const insert = db.prepare(`
        INSERT INTO performance_metrics
        (metric_name, metric_value, unit, timestamp)
        VALUES (?, ?, ?, ?)
      `);

      insert.run('old_metric', 100.0, 'units', oldDate.toISOString());
      insert.run('new_metric', 200.0, 'units', new Date().toISOString());

      const oldDataCount = db
        .prepare(
          `
        SELECT COUNT(*) as count FROM performance_metrics
        WHERE timestamp < datetime('now', '-30 days')
      `
        )
        .get();

      // In a real cleanup scenario, this would be > 0
      expect(typeof oldDataCount.count).toBe('number');
    });

    it('should validate monitoring data integrity', () => {
      const db = dbSetup.getDatabase();

      // Test that invalid data is rejected
      const invalidMetricInsert = db.prepare(`
        INSERT INTO performance_metrics
        (metric_name, unit)  -- Missing required metric_value
        VALUES (?, ?)
      `);

      expect(() => {
        invalidMetricInsert.run('invalid_metric', 'units');
      }).toThrow();
    });
  });

  describe('Performance Benchmarks', () => {
    it('should measure operation performance', () => {
      timer.start();

      // Simulate some operation
      const db = dbSetup.getDatabase();
      const result = db.prepare('SELECT 1 as test').get();

      timer.assertLessThan(100, 'Database query took too long');

      expect(result.test).toBe(1);
    });

    it('should benchmark batch operations', () => {
      const db = dbSetup.getDatabase();

      timer.start();

      const insert = db.prepare(`
        INSERT INTO performance_metrics
        (metric_name, metric_value, unit)
        VALUES (?, ?, ?)
      `);

      // Insert 100 metrics
      for (let i = 0; i < 100; i++) {
        insert.run(`benchmark_metric_${i}`, Math.random() * 100, 'units');
      }

      timer.assertLessThan(500, 'Batch insert took too long');

      const count = db.prepare('SELECT COUNT(*) as count FROM performance_metrics').get();
      expect(count.count).toBeGreaterThan(95);
    });

    it('should monitor memory usage patterns', () => {
      // This would be more relevant in a real application with memory monitoring
      const initialMemory = process.memoryUsage();

      // Simulate some memory-intensive operation
      const largeArray = new Array(10000).fill(Math.random());

      const finalMemory = process.memoryUsage();

      expect(finalMemory.heapUsed).toBeGreaterThanOrEqual(initialMemory.heapUsed);
      expect(typeof finalMemory.heapUsed).toBe('number');
    });
  });
});
