import { describe, it, beforeEach, afterEach, expect } from 'bun:test';
import { TestDatabaseSetup, TestEnvironmentSetup, TestTimer } from '../utils/test-utils';

describe('Services Performance Tests', () => {
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

  describe('Registry Service Performance', () => {
    it('should handle high-volume package registrations', async () => {
      const db = dbSetup.getDatabase();

      timer.start();

      // Simulate registering 100 packages with versions
      const registrations = [];
      for (let i = 1; i <= 100; i++) {
        // Register package
        const insertPackage = db.prepare(`
          INSERT INTO packages (name, version, description, author)
          VALUES (?, ?, ?, ?)
        `);
        insertPackage.run(
          `@registry-test/package-${i}`,
          '1.0.0',
          `Registry test package ${i}`,
          `Registry Author ${i}`
        );

        // Register package version
        const packageId = db
          .prepare('SELECT id FROM packages WHERE name = ?')
          .get(`@registry-test/package-${i}`);
        const insertVersion = db.prepare(`
          INSERT INTO package_versions (package_id, version, tarball_url, integrity, shasum)
          VALUES (?, ?, ?, ?, ?)
        `);
        insertVersion.run(
          packageId.id,
          '1.0.0',
          `https://registry.test.com/@registry-test/package-${i}/1.0.0.tgz`,
          `sha512-registry-integrity-${i}`,
          `registry-sha256-${i}`
        );

        registrations.push(`@registry-test/package-${i}`);
      }

      timer.assertLessThan(1000, '100 package registrations should complete within 1 second');

      // Verify all packages and versions were registered
      const packageCount = db
        .prepare('SELECT COUNT(*) as count FROM packages WHERE name LIKE ?')
        .get('@registry-test/package-%');
      const versionCount = db.prepare('SELECT COUNT(*) as count FROM package_versions').get();

      expect(packageCount.count).toBe(100);
      expect(versionCount.count).toBe(100);
    });

    it('should maintain fast package lookup performance', async () => {
      const db = dbSetup.getDatabase();

      // Setup test data
      const packages = [];
      for (let i = 1; i <= 500; i++) {
        packages.push({
          name: `@lookup/package-${i}`,
          version: '1.0.0',
          description: `Lookup test package ${i}`,
          author: `Lookup Author ${i}`,
        });
      }

      // Bulk insert
      const insert = db.prepare(`
        INSERT INTO packages (name, version, description, author)
        VALUES (?, ?, ?, ?)
      `);
      for (const pkg of packages) {
        insert.run(pkg.name, pkg.version, pkg.description, pkg.author);
      }

      // Create index for performance
      db.exec('CREATE INDEX IF NOT EXISTS idx_lookup_packages_name ON packages(name)');

      timer.start();

      // Perform 200 random package lookups
      for (let i = 0; i < 200; i++) {
        const packageName = `@lookup/package-${Math.floor(Math.random() * 500) + 1}`;
        const result = db.prepare('SELECT * FROM packages WHERE name = ?').get(packageName);
        expect(result).toBeDefined();
      }

      timer.assertLessThan(300, '200 package lookups should complete within 300ms');
    });
  });

  describe('Security Service Performance', () => {
    it('should handle concurrent security scans efficiently', async () => {
      const db = dbSetup.getDatabase();

      // Setup packages for scanning
      const packages = [];
      for (let i = 1; i <= 200; i++) {
        packages.push({
          name: `@security-test/package-${i}`,
          version: '1.0.0',
          description: `Security test package ${i}`,
          author: `Security Author ${i}`,
        });
      }

      const insert = db.prepare(`
        INSERT INTO packages (name, version, description, author)
        VALUES (?, ?, ?, ?)
      `);
      for (const pkg of packages) {
        insert.run(pkg.name, pkg.version, pkg.description, pkg.author);
      }

      timer.start();

      // Simulate concurrent security scans
      const scans = [];
      for (let i = 1; i <= 200; i++) {
        const insertScan = db.prepare(`
          INSERT INTO security_scans (package_name, package_version, scan_type, status, vulnerabilities_found)
          VALUES (?, ?, ?, ?, ?)
        `);
        insertScan.run(
          `@security-test/package-${i}`,
          '1.0.0',
          'vulnerability',
          'completed',
          Math.floor(Math.random() * 3) // 0-2 vulnerabilities
        );
        scans.push(`@security-test/package-${i}`);
      }

      timer.assertLessThan(800, '200 security scans should complete within 800ms');

      const scanCount = db
        .prepare('SELECT COUNT(*) as count FROM security_scans WHERE package_name LIKE ?')
        .get('@security-test/package-%');
      expect(scanCount.count).toBe(200);
    });

    it('should efficiently query security scan results', async () => {
      const db = dbSetup.getDatabase();

      // Setup security scan data
      const scans = [];
      for (let i = 1; i <= 300; i++) {
        scans.push({
          package_name: `@query-test/package-${i}`,
          package_version: '1.0.0',
          scan_type: i % 3 === 0 ? 'dependency' : i % 3 === 1 ? 'vulnerability' : 'license',
          status: 'completed',
          vulnerabilities_found: Math.floor(Math.random() * 5),
          critical_count: Math.floor(Math.random() * 2),
          high_count: Math.floor(Math.random() * 3),
          medium_count: Math.floor(Math.random() * 5),
          low_count: Math.floor(Math.random() * 10),
        });
      }

      const insert = db.prepare(`
        INSERT INTO security_scans (package_name, package_version, scan_type, status, vulnerabilities_found, critical_count, high_count, medium_count, low_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const scan of scans) {
        insert.run(
          scan.package_name,
          scan.package_version,
          scan.scan_type,
          scan.status,
          scan.vulnerabilities_found,
          scan.critical_count,
          scan.high_count,
          scan.medium_count,
          scan.low_count
        );
      }

      timer.start();

      // Query security metrics
      const totalScans = db
        .prepare('SELECT COUNT(*) as count FROM security_scans WHERE package_name LIKE ?')
        .get('@query-test/package-%');
      const vulnerablePackages = db
        .prepare(
          'SELECT COUNT(*) as count FROM security_scans WHERE vulnerabilities_found > 0 AND package_name LIKE ?'
        )
        .get('@query-test/package-%');
      const criticalIssues = db
        .prepare(
          'SELECT SUM(critical_count) as total FROM security_scans WHERE package_name LIKE ?'
        )
        .get('@query-test/package-%');

      timer.assertLessThan(100, 'Security metrics queries should complete within 100ms');

      expect(totalScans.count).toBe(300);
      expect(vulnerablePackages.count).toBeGreaterThan(0);
      expect(criticalIssues.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Monitoring Service Performance', () => {
    it('should handle high-frequency metrics collection', async () => {
      const db = dbSetup.getDatabase();

      timer.start();

      // Simulate collecting metrics every second for 60 seconds
      const metrics = [];
      const startTime = Date.now();

      for (let i = 1; i <= 60; i++) {
        metrics.push({
          metric_name: 'active_connections',
          metric_value: Math.floor(Math.random() * 100) + 50, // 50-150 connections
          unit: 'count',
          timestamp: new Date(startTime + i * 1000).toISOString(),
        });

        metrics.push({
          metric_name: 'requests_per_second',
          metric_value: Math.floor(Math.random() * 1000) + 500, // 500-1500 RPS
          unit: 'requests',
          timestamp: new Date(startTime + i * 1000).toISOString(),
        });
      }

      const insert = db.prepare(`
        INSERT INTO performance_metrics (metric_name, metric_value, unit, timestamp)
        VALUES (?, ?, ?, ?)
      `);
      for (const metric of metrics) {
        insert.run(metric.metric_name, metric.metric_value, metric.unit, metric.timestamp);
      }

      timer.assertLessThan(
        1000,
        '60 seconds of metrics collection should complete within 1 second'
      );

      const metricCount = db.prepare('SELECT COUNT(*) as count FROM performance_metrics').get();
      expect(metricCount.count).toBe(120); // 60 * 2 metrics per second
    });

    it('should efficiently aggregate monitoring data', async () => {
      const db = dbSetup.getDatabase();

      // Setup monitoring data
      const activities = [];
      for (let i = 1; i <= 1000; i++) {
        activities.push({
          user_id: `user-${Math.floor(Math.random() * 100) + 1}`,
          action: ['package_download', 'package_publish', 'security_scan'][
            Math.floor(Math.random() * 3)
          ],
          resource_type: 'package',
          resource_id: `@monitor/package-${Math.floor(Math.random() * 100) + 1}`,
          ip_address: `192.168.1.${Math.floor(Math.random() * 255)}`,
          user_agent: ['npm/8.19.2', 'yarn/1.22.0', 'pnpm/7.0.0'][Math.floor(Math.random() * 3)],
        });
      }

      const insert = db.prepare(`
        INSERT INTO user_activity (user_id, action, resource_type, resource_id, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const activity of activities) {
        insert.run(
          activity.user_id,
          activity.action,
          activity.resource_type,
          activity.resource_id,
          activity.ip_address,
          activity.user_agent
        );
      }

      timer.start();

      // Aggregate monitoring data
      const totalActivities = db.prepare('SELECT COUNT(*) as count FROM user_activity').get();
      const uniqueUsers = db
        .prepare('SELECT COUNT(DISTINCT user_id) as count FROM user_activity')
        .get();
      const downloads = db
        .prepare('SELECT COUNT(*) as count FROM user_activity WHERE action = ?')
        .get('package_download');
      const topPackage = db
        .prepare(
          `
        SELECT resource_id, COUNT(*) as count
        FROM user_activity
        WHERE resource_type = 'package'
        GROUP BY resource_id
        ORDER BY count DESC
        LIMIT 1
      `
        )
        .get();

      timer.assertLessThan(200, 'Monitoring data aggregation should complete within 200ms');

      expect(totalActivities.count).toBe(1000);
      expect(uniqueUsers.count).toBeGreaterThan(0);
      expect(downloads.count).toBeGreaterThan(0);
      expect(topPackage).toBeDefined();
    });
  });

  describe('Compliance Service Performance', () => {
    it('should handle compliance checks at scale', async () => {
      const db = dbSetup.getDatabase();

      // Setup compliance data
      const checks = [];
      for (let i = 1; i <= 50; i++) {
        checks.push({
          check_name: `compliance-check-${i}`,
          check_type: ['security', 'license', 'dependency', 'quality'][
            Math.floor(Math.random() * 4)
          ],
          status: ['passed', 'failed', 'warning'][Math.floor(Math.random() * 3)],
          compliance_level: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
          findings: `Compliance check ${i} findings`,
          recommendations: `Recommendations for check ${i}`,
        });
      }

      const insert = db.prepare(`
        INSERT INTO compliance_checks (check_name, check_type, status, compliance_level, findings, recommendations)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const check of checks) {
        insert.run(
          check.check_name,
          check.check_type,
          check.status,
          check.compliance_level,
          check.findings,
          check.recommendations
        );
      }

      timer.start();

      // Perform compliance analysis
      const totalChecks = db.prepare('SELECT COUNT(*) as count FROM compliance_checks').get();
      const passedChecks = db
        .prepare('SELECT COUNT(*) as count FROM compliance_checks WHERE status = ?')
        .get('passed');
      const failedChecks = db
        .prepare('SELECT COUNT(*) as count FROM compliance_checks WHERE status = ?')
        .get('failed');
      const criticalIssues = db
        .prepare('SELECT COUNT(*) as count FROM compliance_checks WHERE compliance_level = ?')
        .get('critical');

      timer.assertLessThan(100, 'Compliance analysis should complete within 100ms');

      expect(totalChecks.count).toBe(50);
      expect(passedChecks.count + failedChecks.count).toBeLessThanOrEqual(50);
    });

    it('should efficiently generate compliance reports', async () => {
      const db = dbSetup.getDatabase();

      // Setup regulatory report data
      const reports = [];
      for (let i = 1; i <= 12; i++) {
        // One report per month
        const month = i.toString().padStart(2, '0');
        reports.push({
          report_type: 'monthly_compliance',
          report_period: `2024-${month}`,
          compliance_status: ['compliant', 'non_compliant', 'partial'][
            Math.floor(Math.random() * 3)
          ],
          violations_count: Math.floor(Math.random() * 10),
          corrective_actions: `Corrective actions for ${month}`,
          generated_at: `2024-${month}-01T00:00:00Z`,
        });
      }

      const insert = db.prepare(`
        INSERT INTO regulatory_reports (report_type, report_period, compliance_status, violations_count, corrective_actions, generated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const report of reports) {
        insert.run(
          report.report_type,
          report.report_period,
          report.compliance_status,
          report.violations_count,
          report.corrective_actions,
          report.generated_at
        );
      }

      timer.start();

      // Generate compliance report summary
      const totalReports = db.prepare('SELECT COUNT(*) as count FROM regulatory_reports').get();
      const compliantReports = db
        .prepare('SELECT COUNT(*) as count FROM regulatory_reports WHERE compliance_status = ?')
        .get('compliant');
      const totalViolations = db
        .prepare('SELECT SUM(violations_count) as total FROM regulatory_reports')
        .get();
      const latestReport = db
        .prepare('SELECT * FROM regulatory_reports ORDER BY generated_at DESC LIMIT 1')
        .get();

      timer.assertLessThan(150, 'Compliance report generation should complete within 150ms');

      expect(totalReports.count).toBe(12);
      expect(compliantReports.count).toBeGreaterThanOrEqual(0);
      expect(totalViolations.total).toBeGreaterThanOrEqual(0);
      expect(latestReport).toBeDefined();
    });
  });

  describe('Concurrent Operations Performance', () => {
    it('should handle mixed service operations concurrently', async () => {
      const db = dbSetup.getDatabase();

      timer.start();

      const operations = [];

      // Registry operations
      for (let i = 1; i <= 20; i++) {
        operations.push(
          new Promise(resolve => {
            const insert = db.prepare(`
              INSERT INTO packages (name, version, description, author)
              VALUES (?, ?, ?, ?)
            `);
            insert.run(
              `@concurrent/package-${i}`,
              '1.0.0',
              `Concurrent package ${i}`,
              `Concurrent Author ${i}`
            );
            resolve(true);
          })
        );
      }

      // Security operations
      for (let i = 1; i <= 20; i++) {
        operations.push(
          new Promise(resolve => {
            const insert = db.prepare(`
              INSERT INTO security_scans (package_name, package_version, scan_type, status)
              VALUES (?, ?, ?, ?)
            `);
            insert.run(`@concurrent/package-${i}`, '1.0.0', 'quick', 'completed');
            resolve(true);
          })
        );
      }

      // Monitoring operations
      for (let i = 1; i <= 20; i++) {
        operations.push(
          new Promise(resolve => {
            const insert = db.prepare(`
              INSERT INTO performance_metrics (metric_name, metric_value, unit)
              VALUES (?, ?, ?)
            `);
            insert.run(`concurrent_metric_${i}`, Math.random() * 100, 'count');
            resolve(true);
          })
        );
      }

      await Promise.all(operations);

      timer.assertLessThan(1000, '60 concurrent mixed operations should complete within 1 second');

      // Verify all operations completed
      const packageCount = db
        .prepare('SELECT COUNT(*) as count FROM packages WHERE name LIKE ?')
        .get('@concurrent/package-%');
      const scanCount = db
        .prepare('SELECT COUNT(*) as count FROM security_scans WHERE package_name LIKE ?')
        .get('@concurrent/package-%');
      const metricCount = db
        .prepare('SELECT COUNT(*) as count FROM performance_metrics WHERE metric_name LIKE ?')
        .get('concurrent_metric_%');

      expect(packageCount.count).toBe(20);
      expect(scanCount.count).toBe(20);
      expect(metricCount.count).toBe(20);
    });
  });
});
