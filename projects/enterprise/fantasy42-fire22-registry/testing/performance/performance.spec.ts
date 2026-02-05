import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { TestDatabaseSetup, TestEnvironmentSetup, TestTimer } from '../utils/test-utils';

describe('Performance Tests', () => {
  let dbSetup: TestDatabaseSetup;
  let envSetup: TestEnvironmentSetup;
  let timer: TestTimer;

  beforeEach(async () => {
    envSetup = new TestEnvironmentSetup();
    envSetup.setup('production'); // Use production settings for performance testing
    dbSetup = new TestDatabaseSetup();
    await dbSetup.setup();
    timer = new TestTimer();
  });

  afterEach(async () => {
    await dbSetup.teardown();
    envSetup.teardown();
  });

  describe('Database Performance', () => {
    it('should handle bulk package insertions efficiently', () => {
      const db = dbSetup.getDatabase();

      timer.start();

      const insert = db.prepare(`
        INSERT INTO packages (name, version, description, author)
        VALUES (?, ?, ?, ?)
      `);

      // Insert 1000 packages
      const batchSize = 1000;
      for (let i = 0; i < batchSize; i++) {
        insert.run(
          `perf-package-${i}`,
          `1.${i}.0`,
          `Performance test package ${i}`,
          `Author ${i % 10}`
        );
      }

      timer.assertLessThan(2000, 'Bulk package insertion took too long');

      const count = db.prepare('SELECT COUNT(*) as count FROM packages').get();
      expect(count.count).toBe(batchSize);
    });

    it('should perform fast package queries', () => {
      const db = dbSetup.getDatabase();

      // Insert test data
      const insert = db.prepare(`
        INSERT INTO packages (name, version, description, author)
        VALUES (?, ?, ?, ?)
      `);

      for (let i = 0; i < 100; i++) {
        insert.run(`query-test-${i}`, '1.0.0', `Query test ${i}`, 'Test Author');
      }

      timer.start();

      // Perform various query patterns
      const queries = [
        () => db.prepare('SELECT * FROM packages WHERE name LIKE ?').all('query-test-5%'),
        () => db.prepare('SELECT * FROM packages WHERE author = ?').all('Test Author'),
        () => db.prepare('SELECT COUNT(*) as count FROM packages').get(),
        () => db.prepare('SELECT * FROM packages ORDER BY name LIMIT 10').all(),
      ];

      queries.forEach(query => query());

      timer.assertLessThan(500, 'Query operations took too long');
    });

    it('should handle concurrent database operations', async () => {
      const db = dbSetup.getDatabase();

      timer.start();

      // Simulate concurrent operations
      const operations = [];

      for (let i = 0; i < 50; i++) {
        operations.push(
          db
            .prepare(
              `
            INSERT INTO packages (name, version, description)
            VALUES (?, ?, ?)
          `
            )
            .run(`concurrent-${i}`, '1.0.0', `Concurrent test ${i}`)
        );
      }

      // Execute all operations
      await Promise.all(operations);

      timer.assertLessThan(1000, 'Concurrent operations took too long');

      const count = db.prepare('SELECT COUNT(*) as count FROM packages').get();
      expect(count.count).toBe(50);
    });

    it('should maintain performance with indexes', () => {
      const db = dbSetup.getDatabase();

      // Create test data
      const insert = db.prepare(`
        INSERT INTO packages (name, version, description, author, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      const now = new Date();
      for (let i = 0; i < 200; i++) {
        const timestamp = new Date(
          now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000
        ).toISOString();
        insert.run(
          `indexed-package-${i}`,
          '1.0.0',
          `Indexed test ${i}`,
          `Author ${i % 5}`,
          timestamp
        );
      }

      timer.start();

      // Test indexed queries
      const indexedQueries = [
        () => db.prepare('SELECT * FROM packages WHERE author = ?').all('Author 1'),
        () =>
          db
            .prepare('SELECT * FROM packages WHERE created_at > ?')
            .all(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        () =>
          db
            .prepare('SELECT COUNT(*) as count FROM packages WHERE name LIKE ?')
            .get('indexed-package-1%'),
      ];

      indexedQueries.forEach(query => query());

      timer.assertLessThan(300, 'Indexed queries took too long');
    });
  });

  describe('Security Performance', () => {
    it('should handle security scans efficiently', () => {
      const db = dbSetup.getDatabase();

      timer.start();

      const scanInsert = db.prepare(`
        INSERT INTO security_scans
        (package_name, package_version, scan_type, status, vulnerabilities_found, critical_count, high_count, medium_count, low_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // Insert 500 security scan results
      for (let i = 0; i < 500; i++) {
        scanInsert.run(
          `security-package-${i}`,
          '1.0.0',
          'vulnerability',
          Math.random() > 0.8 ? 'vulnerable' : 'clean',
          Math.floor(Math.random() * 5),
          Math.floor(Math.random() * 2),
          Math.floor(Math.random() * 3),
          Math.floor(Math.random() * 4),
          Math.floor(Math.random() * 5)
        );
      }

      timer.assertLessThan(1500, 'Security scan insertions took too long');

      const count = db.prepare('SELECT COUNT(*) as count FROM security_scans').get();
      expect(count.count).toBe(500);
    });

    it('should perform fast security queries', () => {
      const db = dbSetup.getDatabase();

      // Insert security data
      const eventInsert = db.prepare(`
        INSERT INTO security_events (event_type, severity, description, source_ip)
        VALUES (?, ?, ?, ?)
      `);

      const severities = ['low', 'medium', 'high', 'critical'];
      for (let i = 0; i < 200; i++) {
        eventInsert.run(
          `security-event-${i % 10}`,
          severities[i % 4],
          `Security event ${i}`,
          `192.168.1.${i % 255}`
        );
      }

      timer.start();

      const securityQueries = [
        () => db.prepare('SELECT * FROM security_events WHERE severity = ?').all('high'),
        () =>
          db
            .prepare('SELECT COUNT(*) as count FROM security_events WHERE source_ip LIKE ?')
            .get('192.168.1.%'),
        () =>
          db
            .prepare(
              'SELECT * FROM security_events WHERE event_type = ? ORDER BY occurred_at DESC LIMIT 10'
            )
            .all('security-event-1'),
      ];

      securityQueries.forEach(query => query());

      timer.assertLessThan(400, 'Security queries took too long');
    });
  });

  describe('Monitoring Performance', () => {
    it('should handle high-frequency metrics collection', () => {
      const db = dbSetup.getDatabase();

      timer.start();

      const metricInsert = db.prepare(`
        INSERT INTO performance_metrics (metric_name, metric_value, unit, timestamp)
        VALUES (?, ?, ?, ?)
      `);

      // Simulate 1000 metrics over 1 hour (high frequency)
      const startTime = new Date();
      for (let i = 0; i < 1000; i++) {
        const timestamp = new Date(startTime.getTime() + i * 3600).toISOString(); // Every 3.6 seconds
        metricInsert.run(
          `high-frequency-metric`,
          Math.sin(i / 100) * 50 + 100, // Sine wave pattern
          'requests_per_second',
          timestamp
        );
      }

      timer.assertLessThan(2500, 'High-frequency metrics insertion took too long');

      const count = db
        .prepare('SELECT COUNT(*) as count FROM performance_metrics WHERE metric_name = ?')
        .get('high-frequency-metric');
      expect(count.count).toBe(1000);
    });

    it('should perform efficient time-series aggregations', () => {
      const db = dbSetup.getDatabase();

      // Insert time-series data
      const metricInsert = db.prepare(`
        INSERT INTO performance_metrics (metric_name, metric_value, unit, timestamp)
        VALUES (?, ?, ?, ?)
      `);

      const now = new Date();
      for (let i = 0; i < 100; i++) {
        const timestamp = new Date(now.getTime() - i * 60 * 1000).toISOString(); // Every minute for 100 minutes
        metricInsert.run('time-series-metric', Math.random() * 100 + 50, 'percentage', timestamp);
      }

      timer.start();

      // Perform various time-series aggregations
      const aggregations = [
        () =>
          db
            .prepare(
              `
          SELECT
            strftime('%Y-%m-%d %H:%M', timestamp) as minute,
            AVG(metric_value) as avg_value,
            MIN(metric_value) as min_value,
            MAX(metric_value) as max_value
          FROM performance_metrics
          WHERE metric_name = ?
          GROUP BY strftime('%Y-%m-%d %H:%M', timestamp)
          ORDER BY minute DESC
          LIMIT 10
        `
            )
            .all('time-series-metric'),

        () =>
          db
            .prepare(
              `
          SELECT
            strftime('%Y-%m-%d %H', timestamp) as hour,
            COUNT(*) as readings,
            AVG(metric_value) as hourly_avg
          FROM performance_metrics
          WHERE metric_name = ?
          GROUP BY strftime('%Y-%m-%d %H', timestamp)
          ORDER BY hour DESC
        `
            )
            .all('time-series-metric'),
      ];

      aggregations.forEach(agg => agg());

      timer.assertLessThan(600, 'Time-series aggregations took too long');
    });

    it('should handle user activity tracking at scale', () => {
      const db = dbSetup.getDatabase();

      timer.start();

      const activityInsert = db.prepare(`
        INSERT INTO user_activity (user_id, action, resource_type, resource_id, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      // Simulate activity from 100 users with 10 actions each
      for (let user = 0; user < 100; user++) {
        for (let action = 0; action < 10; action++) {
          activityInsert.run(
            `user-${user}`,
            `action-${action % 5}`,
            `resource-${action % 3}`,
            `resource-id-${action}`,
            `192.168.${user % 255}.1`,
            `Browser/${user % 10}.0`
          );
        }
      }

      timer.assertLessThan(3000, 'User activity bulk insertion took too long');

      const totalActivities = db.prepare('SELECT COUNT(*) as count FROM user_activity').get();
      expect(totalActivities.count).toBe(1000);
    });
  });

  describe('Compliance Performance', () => {
    it('should handle large-scale compliance checks', () => {
      const db = dbSetup.getDatabase();

      timer.start();

      const complianceInsert = db.prepare(`
        INSERT INTO compliance_checks
        (check_name, check_type, status, compliance_level, findings, recommendations)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const checkTypes = ['REGULATORY', 'AUDIT', 'TECHNICAL', 'INTERNAL'];
      const statuses = ['PASSED', 'FAILED', 'PENDING'];

      // Insert 200 compliance checks
      for (let i = 0; i < 200; i++) {
        complianceInsert.run(
          `Compliance Check ${i}`,
          checkTypes[i % 4],
          statuses[i % 3],
          i % 3 === 0 ? 'FULL' : i % 3 === 1 ? 'PARTIAL' : 'MINIMAL',
          i % 5 === 0 ? `Finding for check ${i}` : null,
          i % 7 === 0 ? `Recommendation for check ${i}` : null
        );
      }

      timer.assertLessThan(1200, 'Compliance checks bulk insertion took too long');

      const count = db.prepare('SELECT COUNT(*) as count FROM compliance_checks').get();
      expect(count.count).toBe(200);
    });

    it('should perform efficient compliance reporting', () => {
      const db = dbSetup.getDatabase();

      // Insert compliance and audit data
      const complianceInsert = db.prepare(`
        INSERT INTO compliance_checks (check_name, check_type, status, checked_at)
        VALUES (?, ?, ?, ?)
      `);

      const auditInsert = db.prepare(`
        INSERT INTO audit_trail (action, actor, resource_type, resource_id, compliance_impact)
        VALUES (?, ?, ?, ?, ?)
      `);

      // Insert compliance data
      for (let i = 0; i < 50; i++) {
        complianceInsert.run(
          `Audit Check ${i}`,
          'AUDIT',
          i % 4 === 0 ? 'FAILED' : 'PASSED',
          new Date().toISOString()
        );
      }

      // Insert related audit data
      for (let i = 0; i < 100; i++) {
        auditInsert.run(
          `audit_action_${i % 10}`,
          `auditor_${i % 5}`,
          'compliance',
          `resource_${i}`,
          i % 10 === 0 ? 'Compliance impact noted' : null
        );
      }

      timer.start();

      // Perform complex compliance reporting queries
      const complianceReports = [
        () =>
          db
            .prepare(
              `
          SELECT
            check_type,
            status,
            COUNT(*) as count,
            AVG(CASE WHEN status = 'PASSED' THEN 1 ELSE 0 END) as pass_rate
          FROM compliance_checks
          GROUP BY check_type, status
        `
            )
            .all(),

        () =>
          db
            .prepare(
              `
          SELECT
            cc.check_name,
            cc.status,
            COUNT(at.id) as audit_entries
          FROM compliance_checks cc
          LEFT JOIN audit_trail at ON at.compliance_impact IS NOT NULL
          GROUP BY cc.id, cc.check_name, cc.status
          HAVING audit_entries > 0
        `
            )
            .all(),

        () =>
          db
            .prepare(
              `
          SELECT
            strftime('%Y-%m-%d', checked_at) as date,
            COUNT(*) as checks_performed,
            SUM(CASE WHEN status = 'PASSED' THEN 1 ELSE 0 END) as passed_checks
          FROM compliance_checks
          GROUP BY strftime('%Y-%m-%d', checked_at)
        `
            )
            .all(),
      ];

      complianceReports.forEach(report => report());

      timer.assertLessThan(800, 'Compliance reporting queries took too long');
    });
  });

  describe('System Load Testing', () => {
    it('should handle high concurrency operations', async () => {
      const db = dbSetup.getDatabase();

      timer.start();

      // Simulate high concurrency - multiple operations in parallel
      const concurrentOperations = [];

      // Create multiple insert operations
      for (let i = 0; i < 20; i++) {
        concurrentOperations.push(
          // Package operations
          db
            .prepare(
              `
            INSERT INTO packages (name, version, description)
            VALUES (?, ?, ?)
          `
            )
            .run(`concurrent-pkg-${i}`, '1.0.0', `Concurrent package ${i}`),

          // Security operations
          db
            .prepare(
              `
            INSERT INTO security_scans (package_name, package_version, scan_type, status)
            VALUES (?, ?, ?, ?)
          `
            )
            .run(`concurrent-pkg-${i}`, '1.0.0', 'load_test', 'completed'),

          // Activity operations
          db
            .prepare(
              `
            INSERT INTO user_activity (user_id, action, resource_type, resource_id)
            VALUES (?, ?, ?, ?)
          `
            )
            .run(`user-${i % 5}`, 'concurrent_action', 'package', `concurrent-pkg-${i}`)
        );
      }

      // Execute all concurrent operations
      await Promise.all(concurrentOperations.flat());

      timer.assertLessThan(2000, 'High concurrency operations took too long');

      // Verify all operations completed
      const packageCount = db
        .prepare('SELECT COUNT(*) as count FROM packages WHERE name LIKE ?')
        .get('concurrent-pkg-%');
      const securityCount = db
        .prepare('SELECT COUNT(*) as count FROM security_scans WHERE scan_type = ?')
        .get('load_test');
      const activityCount = db
        .prepare('SELECT COUNT(*) as count FROM user_activity WHERE action = ?')
        .get('concurrent_action');

      expect(packageCount.count).toBe(20);
      expect(securityCount.count).toBe(20);
      expect(activityCount.count).toBe(20);
    });

    it('should maintain performance under memory pressure', () => {
      const db = dbSetup.getDatabase();

      timer.start();

      // Create memory-intensive operations
      const largeDatasets = [];

      // Generate large datasets in memory
      for (let i = 0; i < 10; i++) {
        const dataset = [];
        for (let j = 0; j < 1000; j++) {
          dataset.push({
            name: `memory-test-${i}-${j}`,
            value: Math.random().toString(36),
            timestamp: new Date().toISOString(),
          });
        }
        largeDatasets.push(dataset);
      }

      // Process datasets and insert into database
      largeDatasets.forEach((dataset, index) => {
        const insert = db.prepare(`
          INSERT INTO performance_metrics (metric_name, metric_value, unit)
          VALUES (?, ?, ?)
        `);

        dataset.forEach(item => {
          insert.run(`memory_test_${index}`, item.value.length, 'characters');
        });
      });

      timer.assertLessThan(3000, 'Memory-intensive operations took too long');

      const totalMetrics = db
        .prepare('SELECT COUNT(*) as count FROM performance_metrics WHERE metric_name LIKE ?')
        .get('memory_test_%');
      expect(totalMetrics.count).toBe(10000); // 10 datasets * 1000 metrics each
    });

    it('should handle complex multi-table transactions', () => {
      const db = dbSetup.getDatabase();

      timer.start();

      // Perform complex multi-table operations
      for (let i = 0; i < 50; i++) {
        // Insert package
        const packageResult = db
          .prepare(
            `
          INSERT INTO packages (name, version, description)
          VALUES (?, ?, ?)
        `
          )
          .run(`complex-pkg-${i}`, '1.0.0', `Complex package ${i}`);

        // Insert version
        db.prepare(
          `
          INSERT INTO package_versions (package_id, version, tarball_url)
          VALUES (?, ?, ?)
        `
        ).run(
          packageResult.lastInsertRowid,
          '1.0.0',
          `https://registry.fire22.com/complex-pkg-${i}.tgz`
        );

        // Insert security scan
        db.prepare(
          `
          INSERT INTO security_scans (package_name, package_version, scan_type, status)
          VALUES (?, ?, ?, ?)
        `
        ).run(`complex-pkg-${i}`, '1.0.0', 'complex_scan', 'passed');

        // Insert audit log
        db.prepare(
          `
          INSERT INTO audit_log (action, package_name, package_version, user_agent)
          VALUES (?, ?, ?, ?)
        `
        ).run('complex_publish', `complex-pkg-${i}`, '1.0.0', 'complex-test/1.0');

        // Insert performance metric
        db.prepare(
          `
          INSERT INTO performance_metrics (metric_name, metric_value, unit)
          VALUES (?, ?, ?)
        `
        ).run(`complex_metric_${i}`, Math.random() * 100, 'operations_per_second');
      }

      timer.assertLessThan(2500, 'Complex multi-table operations took too long');

      // Verify all data was inserted correctly
      const packageCount = db
        .prepare('SELECT COUNT(*) as count FROM packages WHERE name LIKE ?')
        .get('complex-pkg-%');
      const versionCount = db.prepare('SELECT COUNT(*) as count FROM package_versions').get();
      const scanCount = db
        .prepare('SELECT COUNT(*) as count FROM security_scans WHERE scan_type = ?')
        .get('complex_scan');
      const auditCount = db
        .prepare('SELECT COUNT(*) as count FROM audit_log WHERE action = ?')
        .get('complex_publish');
      const metricCount = db
        .prepare('SELECT COUNT(*) as count FROM performance_metrics WHERE metric_name LIKE ?')
        .get('complex_metric_%');

      expect(packageCount.count).toBe(50);
      expect(versionCount.count).toBe(50);
      expect(scanCount.count).toBe(50);
      expect(auditCount.count).toBe(50);
      expect(metricCount.count).toBe(50);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should benchmark database operations', () => {
      const db = dbSetup.getDatabase();

      const operations = {
        insert: 0,
        select: 0,
        update: 0,
        delete: 0,
      };

      // Benchmark inserts
      timer.start();
      const insertStmt = db.prepare(`
        INSERT INTO performance_metrics (metric_name, metric_value, unit)
        VALUES (?, ?, ?)
      `);

      for (let i = 0; i < 1000; i++) {
        insertStmt.run(`benchmark-insert-${i}`, Math.random() * 1000, 'benchmark_units');
      }
      operations.insert = timer.elapsed();

      // Benchmark selects
      timer.start();
      for (let i = 0; i < 100; i++) {
        db.prepare('SELECT * FROM performance_metrics WHERE metric_value > ?').get(
          Math.random() * 1000
        );
      }
      operations.select = timer.elapsed();

      // Benchmark updates
      timer.start();
      const updateStmt = db.prepare(`
        UPDATE performance_metrics SET metric_value = ? WHERE metric_name = ?
      `);

      for (let i = 0; i < 100; i++) {
        updateStmt.run(Math.random() * 1000, `benchmark-insert-${i}`);
      }
      operations.update = timer.elapsed();

      // Log performance results
      console.log('Database Performance Benchmarks:');
      console.log(`  Inserts (1000): ${operations.insert}ms`);
      console.log(`  Selects (100): ${operations.select}ms`);
      console.log(`  Updates (100): ${operations.update}ms`);

      // Assert reasonable performance
      expect(operations.insert).toBeLessThan(2000); // Less than 2 seconds for 1000 inserts
      expect(operations.select).toBeLessThan(500); // Less than 500ms for 100 selects
      expect(operations.update).toBeLessThan(1000); // Less than 1 second for 100 updates
    });

    it('should measure memory efficiency', () => {
      const db = dbSetup.getDatabase();

      const initialMemory = process.memoryUsage();

      // Perform memory-intensive database operations
      const operations = [];

      for (let i = 0; i < 100; i++) {
        // Create large result sets
        const insert = db.prepare(`
          INSERT INTO performance_metrics (metric_name, metric_value, unit)
          VALUES (?, ?, ?)
        `);

        for (let j = 0; j < 10; j++) {
          insert.run(`memory-test-${i}-${j}`, Math.random() * 1000, 'memory_units');
        }

        // Query large datasets
        operations.push(
          db
            .prepare('SELECT * FROM performance_metrics WHERE metric_name LIKE ?')
            .all(`memory-test-${i}%`)
        );
      }

      // Execute queries
      operations.forEach(op => op());

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(`Memory usage: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB increase`);

      // Assert reasonable memory usage
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase

      // Verify operations completed
      const totalRecords = db
        .prepare('SELECT COUNT(*) as count FROM performance_metrics WHERE metric_name LIKE ?')
        .get('memory-test-%');
      expect(totalRecords.count).toBe(1000);
    });
  });
});
