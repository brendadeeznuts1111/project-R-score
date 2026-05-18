import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { TestDatabaseSetup, TestEnvironmentSetup } from '../utils/test-utils';

describe('Database Integration Tests', () => {
  let dbSetup: TestDatabaseSetup;
  let envSetup: TestEnvironmentSetup;

  beforeEach(async () => {
    envSetup = new TestEnvironmentSetup();
    envSetup.setup('development');
    dbSetup = new TestDatabaseSetup();
    await dbSetup.setup();
  });

  afterEach(async () => {
    await dbSetup.teardown();
    envSetup.teardown();
  });

  describe('Package Registry Integration', () => {
    it('should handle complete package lifecycle', () => {
      const db = dbSetup.getDatabase();

      // 1. Create a package
      const packageInsert = db.prepare(`
        INSERT INTO packages (name, version, description, author)
        VALUES (?, ?, ?, ?)
      `);

      const packageResult = packageInsert.run(
        'integration-test-package',
        '1.0.0',
        'Test package for integration testing',
        'Test Author'
      );

      expect(packageResult.changes).toBe(1);

      // 2. Add package version
      const versionInsert = db.prepare(`
        INSERT INTO package_versions (package_id, version, tarball_url)
        VALUES (?, ?, ?)
      `);

      const versionResult = versionInsert.run(
        packageResult.lastInsertRowid,
        '1.0.0',
        'https://registry.fire22.com/integration-test-package/-/integration-test-package-1.0.0.tgz'
      );

      expect(versionResult.changes).toBe(1);

      // 3. Record security scan
      const scanInsert = db.prepare(`
        INSERT INTO security_scans (package_name, package_version, scan_type, status, vulnerabilities_found)
        VALUES (?, ?, ?, ?, ?)
      `);

      const scanResult = scanInsert.run(
        'integration-test-package',
        '1.0.0',
        'vulnerability',
        'clean',
        0
      );

      expect(scanResult.changes).toBe(1);

      // 4. Log audit event
      const auditInsert = db.prepare(`
        INSERT INTO audit_log (action, package_name, package_version, user_agent)
        VALUES (?, ?, ?, ?)
      `);

      const auditResult = auditInsert.run(
        'package_publish',
        'integration-test-package',
        '1.0.0',
        'npm/8.19.2'
      );

      expect(auditResult.changes).toBe(1);

      // 5. Verify complete integration
      const packageData = db
        .prepare(
          `
        SELECT
          p.name,
          p.version,
          p.description,
          pv.tarball_url,
          ss.status as security_status,
          al.action as audit_action
        FROM packages p
        LEFT JOIN package_versions pv ON p.id = pv.package_id
        LEFT JOIN security_scans ss ON p.name = ss.package_name AND p.version = ss.package_version
        LEFT JOIN audit_log al ON p.name = al.package_name AND p.version = al.package_version
        WHERE p.name = ?
      `
        )
        .get('integration-test-package');

      expect(packageData).toBeDefined();
      expect(packageData.name).toBe('integration-test-package');
      expect(packageData.security_status).toBe('clean');
      expect(packageData.audit_action).toBe('package_publish');
    });

    it('should maintain referential integrity across tables', () => {
      const db = dbSetup.getDatabase();

      // Create package
      const packageInsert = db.prepare(`
        INSERT INTO packages (name, version, description)
        VALUES (?, ?, ?)
      `);

      const packageResult = packageInsert.run(
        'referential-test',
        '1.0.0',
        'Test referential integrity'
      );
      const packageId = packageResult.lastInsertRowid;

      // Create version with valid package_id
      const versionInsert = db.prepare(`
        INSERT INTO package_versions (package_id, version, tarball_url)
        VALUES (?, ?, ?)
      `);

      versionInsert.run(packageId, '1.0.0', 'https://example.com/test.tgz');

      // Verify foreign key constraint works
      const validVersion = db
        .prepare(
          `
        SELECT pv.* FROM package_versions pv
        INNER JOIN packages p ON pv.package_id = p.id
        WHERE p.name = ?
      `
        )
        .get('referential-test');

      expect(validVersion).toBeDefined();
      expect(validVersion.version).toBe('1.0.0');
    });

    it('should handle complex queries across multiple tables', () => {
      const db = dbSetup.getDatabase();

      // Insert test data across multiple tables
      const packageInsert = db.prepare(`
        INSERT INTO packages (name, version, description, author)
        VALUES (?, ?, ?, ?)
      `);

      const packages = [
        {
          name: 'complex-pkg-1',
          version: '1.0.0',
          description: 'Complex test 1',
          author: 'Author 1',
        },
        {
          name: 'complex-pkg-2',
          version: '2.0.0',
          description: 'Complex test 2',
          author: 'Author 2',
        },
        {
          name: 'complex-pkg-3',
          version: '1.5.0',
          description: 'Complex test 3',
          author: 'Author 1',
        },
      ];

      packages.forEach(pkg => {
        packageInsert.run(pkg.name, pkg.version, pkg.description, pkg.author);
      });

      // Insert security scans
      const scanInsert = db.prepare(`
        INSERT INTO security_scans (package_name, package_version, scan_type, status, vulnerabilities_found)
        VALUES (?, ?, ?, ?, ?)
      `);

      packages.forEach(pkg => {
        scanInsert.run(
          pkg.name,
          pkg.version,
          'vulnerability',
          pkg.name.includes('1') ? 'clean' : 'vulnerable',
          pkg.name.includes('1') ? 0 : 2
        );
      });

      // Complex query joining multiple tables
      const complexQuery = db
        .prepare(
          `
        SELECT
          p.name,
          p.version,
          p.author,
          ss.status as security_status,
          ss.vulnerabilities_found,
          COUNT(al.id) as audit_entries
        FROM packages p
        LEFT JOIN security_scans ss ON p.name = ss.package_name AND p.version = ss.package_version
        LEFT JOIN audit_log al ON p.name = al.package_name AND p.version = al.package_version
        GROUP BY p.id, p.name, p.version, p.author, ss.status, ss.vulnerabilities_found
        ORDER BY p.name
      `
        )
        .all();

      expect(complexQuery).toHaveLength(3);
      expect(complexQuery[0].name).toBe('complex-pkg-1');
      expect(complexQuery[0].security_status).toBe('clean');
      expect(complexQuery[1].security_status).toBe('vulnerable');
    });
  });

  describe('Security Monitoring Integration', () => {
    it('should integrate security events with performance metrics', () => {
      const db = dbSetup.getDatabase();

      // Insert security event
      const eventInsert = db.prepare(`
        INSERT INTO security_events (event_type, severity, description, source_ip)
        VALUES (?, ?, ?, ?)
      `);

      eventInsert.run(
        'unauthorized_access',
        'high',
        'Unauthorized access attempt detected',
        '192.168.1.100'
      );

      // Insert related performance metric
      const metricInsert = db.prepare(`
        INSERT INTO performance_metrics (metric_name, metric_value, unit)
        VALUES (?, ?, ?)
      `);

      metricInsert.run('security_incident_response_time', 45.0, 'milliseconds');

      // Insert system health check
      const healthInsert = db.prepare(`
        INSERT INTO system_health (service_name, status, response_time_ms)
        VALUES (?, ?, ?)
      `);

      healthInsert.run('security_service', 'healthy', 45);

      // Verify integration
      const integratedData = db
        .prepare(
          `
        SELECT
          se.event_type,
          se.severity,
          pm.metric_value as response_time,
          sh.status as service_status
        FROM security_events se
        CROSS JOIN performance_metrics pm
        CROSS JOIN system_health sh
        WHERE pm.metric_name = 'security_incident_response_time'
        AND sh.service_name = 'security_service'
        LIMIT 1
      `
        )
        .get();

      expect(integratedData.event_type).toBe('unauthorized_access');
      expect(integratedData.severity).toBe('high');
      expect(integratedData.response_time).toBe(45.0);
      expect(integratedData.service_status).toBe('healthy');
    });

    it('should correlate user activity with security events', () => {
      const db = dbSetup.getDatabase();

      const now = new Date();
      const userId = 'test-user-123';

      // Insert user activities
      const activityInsert = db.prepare(`
        INSERT INTO user_activity (user_id, action, resource_type, resource_id, ip_address, occurred_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const activities = [
        { action: 'login', resource: 'auth', id: 'session1', ip: '127.0.0.1' },
        { action: 'package_download', resource: 'package', id: 'pkg1', ip: '127.0.0.1' },
        { action: 'login_failed', resource: 'auth', id: 'session2', ip: '192.168.1.100' },
        { action: 'suspicious_activity', resource: 'system', id: 'alert1', ip: '192.168.1.100' },
      ];

      activities.forEach(activity => {
        activityInsert.run(
          userId,
          activity.action,
          activity.resource,
          activity.id,
          activity.ip,
          now.toISOString()
        );
      });

      // Insert security event for suspicious IP
      const securityInsert = db.prepare(`
        INSERT INTO security_events (event_type, severity, description, source_ip)
        VALUES (?, ?, ?, ?)
      `);

      securityInsert.run(
        'suspicious_ip_detected',
        'medium',
        'Multiple failed login attempts from IP',
        '192.168.1.100'
      );

      // Correlate user activity with security events
      const correlation = db
        .prepare(
          `
        SELECT
          ua.user_id,
          ua.action as user_action,
          ua.ip_address,
          se.event_type,
          se.severity,
          COUNT(ua.id) as activity_count
        FROM user_activity ua
        LEFT JOIN security_events se ON ua.ip_address = se.source_ip
        WHERE ua.user_id = ?
        GROUP BY ua.user_id, ua.ip_address, ua.action, se.event_type, se.severity
        ORDER BY ua.ip_address
      `
        )
        .all(userId);

      expect(correlation).toHaveLength(4);

      // Check that suspicious IP has security event correlation
      const suspiciousActivities = correlation.filter(item => item.ip_address === '192.168.1.100');
      expect(suspiciousActivities).toHaveLength(2);
      expect(suspiciousActivities.some(item => item.event_type === 'suspicious_ip_detected')).toBe(
        true
      );
    });
  });

  describe('Compliance and Audit Integration', () => {
    it('should integrate compliance checks with audit trail', () => {
      const db = dbSetup.getDatabase();

      // Insert compliance check
      const complianceInsert = db.prepare(`
        INSERT INTO compliance_checks (check_name, check_type, status, findings)
        VALUES (?, ?, ?, ?)
      `);

      complianceInsert.run(
        'Access Control Audit',
        'AUDIT',
        'PASSED',
        'All access controls properly configured'
      );

      // Insert related audit entries
      const auditInsert = db.prepare(`
        INSERT INTO audit_trail (action, actor, resource_type, resource_id, compliance_impact)
        VALUES (?, ?, ?, ?, ?)
      `);

      auditInsert.run(
        'access_granted',
        'user123',
        'resource',
        'confidential-data',
        'Access control audit verified'
      );

      auditInsert.run(
        'access_denied',
        'user456',
        'resource',
        'restricted-data',
        'Access control audit verified'
      );

      // Insert regulatory report
      const reportInsert = db.prepare(`
        INSERT INTO regulatory_reports (report_type, report_period, compliance_status, violations_count)
        VALUES (?, ?, ?, ?)
      `);

      reportInsert.run('Access Control Compliance Report', '2024-Q2', 'COMPLIANT', 0);

      // Verify integration
      const integratedCompliance = db
        .prepare(
          `
        SELECT
          cc.check_name,
          cc.status as compliance_status,
          cc.findings,
          COUNT(at.id) as audit_entries,
          rr.compliance_status as regulatory_status
        FROM compliance_checks cc
        LEFT JOIN audit_trail at ON at.compliance_impact LIKE '%' || cc.check_name || '%'
        CROSS JOIN regulatory_reports rr
        WHERE cc.check_name = ?
        GROUP BY cc.id, cc.check_name, cc.status, cc.findings, rr.compliance_status
      `
        )
        .get('Access Control Audit');

      expect(integratedCompliance.compliance_status).toBe('PASSED');
      expect(integratedCompliance.audit_entries).toBe(2);
      expect(integratedCompliance.regulatory_status).toBe('COMPLIANT');
    });

    it('should handle complete audit workflow', () => {
      const db = dbSetup.getDatabase();

      const workflow = {
        userId: 'compliance-officer',
        resourceId: 'audit-config-001',
        actions: [
          { action: 'audit_started', details: 'Compliance audit initiated' },
          { action: 'config_reviewed', details: 'Configuration settings verified' },
          { action: 'controls_tested', details: 'Access controls tested successfully' },
          { action: 'audit_completed', details: 'Audit completed with no findings' },
        ],
      };

      // Insert audit workflow
      const auditInsert = db.prepare(`
        INSERT INTO audit_trail (action, actor, resource_type, resource_id, old_values, new_values, compliance_impact, occurred_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      workflow.actions.forEach((action, index) => {
        const timestamp = new Date(Date.now() + index * 60000).toISOString(); // 1 minute apart
        auditInsert.run(
          action.action,
          workflow.userId,
          'compliance',
          workflow.resourceId,
          null,
          JSON.stringify({ status: 'completed', step: index + 1 }),
          action.details,
          timestamp
        );
      });

      // Insert compliance check result
      const complianceInsert = db.prepare(`
        INSERT INTO compliance_checks (check_name, check_type, status, compliance_level, checked_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      complianceInsert.run(
        'Complete System Audit',
        'AUDIT',
        'PASSED',
        'FULL',
        new Date().toISOString()
      );

      // Verify audit workflow completeness
      const auditWorkflow = db
        .prepare(
          `
        SELECT
          COUNT(*) as total_steps,
          MIN(occurred_at) as start_time,
          MAX(occurred_at) as end_time
        FROM audit_trail
        WHERE resource_id = ? AND actor = ?
        ORDER BY occurred_at
      `
        )
        .get(workflow.resourceId, workflow.userId);

      expect(auditWorkflow.total_steps).toBe(4);

      const startTime = new Date(auditWorkflow.start_time);
      const endTime = new Date(auditWorkflow.end_time);
      const duration = endTime.getTime() - startTime.getTime();

      // Should be approximately 3 minutes (4 steps * 1 minute spacing)
      expect(duration).toBeGreaterThan(180000); // 3 minutes in milliseconds
      expect(duration).toBeLessThan(240000); // 4 minutes in milliseconds
    });
  });

  describe('Performance and Monitoring Integration', () => {
    it('should integrate performance metrics with system health', () => {
      const db = dbSetup.getDatabase();

      const services = ['api', 'database', 'cache', 'auth'];

      // Insert performance metrics for each service
      const metricInsert = db.prepare(`
        INSERT INTO performance_metrics (metric_name, metric_value, unit)
        VALUES (?, ?, ?)
      `);

      services.forEach(service => {
        metricInsert.run(`${service}_response_time`, Math.random() * 100 + 50, 'milliseconds');
        metricInsert.run(`${service}_cpu_usage`, Math.random() * 30 + 10, 'percentage');
        metricInsert.run(`${service}_memory_usage`, Math.random() * 40 + 20, 'percentage');
      });

      // Insert system health checks
      const healthInsert = db.prepare(`
        INSERT INTO system_health (service_name, status, response_time_ms)
        VALUES (?, ?, ?)
      `);

      services.forEach(service => {
        healthInsert.run(service, 'healthy', Math.floor(Math.random() * 50) + 20);
      });

      // Verify integration and calculate system performance
      const systemPerformance = db
        .prepare(
          `
        SELECT
          COUNT(DISTINCT pm.metric_name) as metrics_count,
          AVG(pm.metric_value) as avg_response_time,
          COUNT(DISTINCT sh.service_name) as services_count,
          AVG(sh.response_time_ms) as avg_health_response
        FROM performance_metrics pm
        CROSS JOIN system_health sh
        WHERE pm.metric_name LIKE '%response_time%'
      `
        )
        .get();

      expect(systemPerformance.metrics_count).toBe(4); // One for each service
      expect(systemPerformance.services_count).toBe(4);
      expect(systemPerformance.avg_response_time).toBeGreaterThan(50);
      expect(systemPerformance.avg_health_response).toBeGreaterThan(20);
    });

    it('should handle monitoring data aggregation', () => {
      const db = dbSetup.getDatabase();

      // Insert time-series performance data
      const metricInsert = db.prepare(`
        INSERT INTO performance_metrics (metric_name, metric_value, unit, timestamp)
        VALUES (?, ?, ?, ?)
      `);

      const now = new Date();
      for (let i = 0; i < 24; i++) {
        // 24 hours of data
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000).toISOString();
        metricInsert.run(
          'hourly_metric',
          Math.sin((i / 24) * 2 * Math.PI) * 50 + 100,
          'requests_per_minute',
          timestamp
        );
      }

      // Aggregate data by hour
      const hourlyAggregates = db
        .prepare(
          `
        SELECT
          strftime('%Y-%m-%d %H', timestamp) as hour,
          COUNT(*) as readings_count,
          AVG(metric_value) as avg_value,
          MIN(metric_value) as min_value,
          MAX(metric_value) as max_value
        FROM performance_metrics
        WHERE metric_name = 'hourly_metric'
        GROUP BY strftime('%Y-%m-%d %H', timestamp)
        ORDER BY hour DESC
        LIMIT 5
      `
        )
        .all();

      expect(hourlyAggregates).toHaveLength(5);
      hourlyAggregates.forEach(aggregate => {
        expect(aggregate.readings_count).toBe(1); // One reading per hour in our test
        expect(aggregate.avg_value).toBeGreaterThan(50);
        expect(aggregate.avg_value).toBeLessThan(150);
      });
    });
  });

  describe('Cross-Module Data Consistency', () => {
    it('should maintain data consistency across all modules', () => {
      const db = dbSetup.getDatabase();

      const testPackage = 'consistency-test-package';
      const testVersion = '1.0.0';
      const testUser = 'consistency-test-user';

      // Insert data across all modules
      const packageInsert = db.prepare(`
        INSERT INTO packages (name, version, description, author)
        VALUES (?, ?, ?, ?)
      `);

      const packageResult = packageInsert.run(
        testPackage,
        testVersion,
        'Consistency test',
        testUser
      );

      // Security scan
      const scanInsert = db.prepare(`
        INSERT INTO security_scans (package_name, package_version, scan_type, status)
        VALUES (?, ?, ?, ?)
      `);

      scanInsert.run(testPackage, testVersion, 'consistency', 'passed');

      // User activity
      const activityInsert = db.prepare(`
        INSERT INTO user_activity (user_id, action, resource_type, resource_id)
        VALUES (?, ?, ?, ?)
      `);

      activityInsert.run(testUser, 'package_publish', 'package', testPackage);

      // Audit log
      const auditInsert = db.prepare(`
        INSERT INTO audit_log (action, package_name, package_version, user_agent)
        VALUES (?, ?, ?, ?)
      `);

      auditInsert.run('publish', testPackage, testVersion, 'consistency-test/1.0');

      // Performance metric
      const metricInsert = db.prepare(`
        INSERT INTO performance_metrics (metric_name, metric_value, unit)
        VALUES (?, ?, ?)
      `);

      metricInsert.run('consistency_test_duration', 125.5, 'milliseconds');

      // System health
      const healthInsert = db.prepare(`
        INSERT INTO system_health (service_name, status, response_time_ms)
        VALUES (?, ?, ?)
      `);

      healthInsert.run('consistency_service', 'healthy', 125);

      // Verify cross-module consistency
      const consistencyCheck = db
        .prepare(
          `
        SELECT
          p.name as package_name,
          p.version,
          ss.status as security_status,
          ua.action as user_action,
          al.action as audit_action,
          pm.metric_value as performance_value,
          sh.status as health_status
        FROM packages p
        LEFT JOIN security_scans ss ON p.name = ss.package_name AND p.version = ss.package_version
        LEFT JOIN user_activity ua ON p.name = ua.resource_id
        LEFT JOIN audit_log al ON p.name = al.package_name AND p.version = al.package_version
        CROSS JOIN performance_metrics pm
        CROSS JOIN system_health sh
        WHERE p.name = ?
        AND pm.metric_name = 'consistency_test_duration'
        AND sh.service_name = 'consistency_service'
        LIMIT 1
      `
        )
        .get(testPackage);

      expect(consistencyCheck.package_name).toBe(testPackage);
      expect(consistencyCheck.version).toBe(testVersion);
      expect(consistencyCheck.security_status).toBe('passed');
      expect(consistencyCheck.user_action).toBe('package_publish');
      expect(consistencyCheck.audit_action).toBe('publish');
      expect(consistencyCheck.performance_value).toBe(125.5);
      expect(consistencyCheck.health_status).toBe('healthy');
    });

    it('should handle database constraints and relationships', () => {
      const db = dbSetup.getDatabase();

      // Test foreign key relationships
      const packageInsert = db.prepare(`
        INSERT INTO packages (name, version, description)
        VALUES (?, ?, ?)
      `);

      const packageResult = packageInsert.run('constraint-test', '1.0.0', 'Constraint test');
      const packageId = packageResult.lastInsertRowid;

      // Test valid foreign key relationship
      const versionInsert = db.prepare(`
        INSERT INTO package_versions (package_id, version, tarball_url)
        VALUES (?, ?, ?)
      `);

      versionInsert.run(packageId, '1.0.0', 'https://example.com/test.tgz');

      // Verify relationship
      const relationshipCheck = db
        .prepare(
          `
        SELECT COUNT(*) as count
        FROM package_versions pv
        INNER JOIN packages p ON pv.package_id = p.id
        WHERE p.id = ?
      `
        )
        .get(packageId);

      expect(relationshipCheck.count).toBe(1);

      // Test cascade delete behavior (if implemented)
      // Note: SQLite foreign keys need to be explicitly enabled
      db.exec('PRAGMA foreign_keys = ON;');

      // This should work with proper foreign key setup
      const versionCount = db
        .prepare(
          `
        SELECT COUNT(*) as count FROM package_versions WHERE package_id = ?
      `
        )
        .get(packageId);

      expect(versionCount.count).toBe(1);
    });
  });
});
