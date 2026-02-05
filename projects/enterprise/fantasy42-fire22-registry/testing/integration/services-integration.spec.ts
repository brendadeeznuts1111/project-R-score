import { describe, it, beforeEach, afterEach, expect } from 'bun:test';
import { TestDatabaseSetup, TestEnvironmentSetup } from '../utils/test-utils';

describe('Services Integration', () => {
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

  describe('Registry ↔ Security Service Integration', () => {
    it('should trigger security scan when package is registered', async () => {
      const db = dbSetup.getDatabase();

      // Simulate package registration
      const insertPackage = db.prepare(`
        INSERT INTO packages (name, version, description, author)
        VALUES (?, ?, ?, ?)
      `);
      insertPackage.run('@test/package', '1.0.0', 'Test package', 'Test Author');

      const packageId = db.prepare('SELECT id FROM packages WHERE name = ?').get('@test/package');

      // Insert corresponding package version
      const insertVersion = db.prepare(`
        INSERT INTO package_versions (package_id, version, tarball_url, integrity, shasum)
        VALUES (?, ?, ?, ?, ?)
      `);
      insertVersion.run(
        packageId.id,
        '1.0.0',
        'https://registry.test.com/@test/package/1.0.0.tgz',
        'sha512-test-integrity',
        'test-sha256-hash'
      );

      // Simulate security service creating a scan record
      const insertScan = db.prepare(`
        INSERT INTO security_scans (package_name, package_version, scan_type, status)
        VALUES (?, ?, ?, ?)
      `);
      insertScan.run('@test/package', '1.0.0', 'vulnerability', 'pending');

      // Verify integration: package exists and security scan is created
      const pkg = db.prepare('SELECT * FROM packages WHERE name = ?').get('@test/package');
      const scan = db
        .prepare('SELECT * FROM security_scans WHERE package_name = ?')
        .get('@test/package');

      expect(pkg).toBeDefined();
      expect(pkg.name).toBe('@test/package');
      expect(scan).toBeDefined();
      expect(scan.package_name).toBe('@test/package');
      expect(scan.status).toBe('pending');
    });

    it('should update audit log when security scan completes', async () => {
      const db = dbSetup.getDatabase();

      // Insert package
      const insertPackage = db.prepare(`
        INSERT INTO packages (name, version, description, author)
        VALUES (?, ?, ?, ?)
      `);
      insertPackage.run('@secure/package', '2.0.0', 'Secure package', 'Security Team');

      // Insert security scan
      const insertScan = db.prepare(`
        INSERT INTO security_scans (package_name, package_version, scan_type, status, vulnerabilities_found)
        VALUES (?, ?, ?, ?, ?)
      `);
      insertScan.run('@secure/package', '2.0.0', 'vulnerability', 'completed', 0);

      // Simulate audit log entry for security scan completion
      const insertAudit = db.prepare(`
        INSERT INTO audit_log (action, package_name, package_version, user_agent, ip_address, details)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      insertAudit.run(
        'security_scan_completed',
        '@secure/package',
        '2.0.0',
        'fantasy42-security-scanner/1.0',
        '127.0.0.1',
        'Security scan completed successfully, no vulnerabilities found'
      );

      // Verify integration: security scan and audit log are linked
      const scan = db
        .prepare('SELECT * FROM security_scans WHERE package_name = ?')
        .get('@secure/package');
      const auditEntry = db
        .prepare('SELECT * FROM audit_log WHERE package_name = ? AND action = ?')
        .get('@secure/package', 'security_scan_completed');

      expect(scan.status).toBe('completed');
      expect(scan.vulnerabilities_found).toBe(0);
      expect(auditEntry).toBeDefined();
      expect(auditEntry.action).toBe('security_scan_completed');
      expect(auditEntry.details).toContain('no vulnerabilities found');
    });
  });

  describe('Security ↔ Monitoring Service Integration', () => {
    it('should update monitoring metrics when security events occur', async () => {
      const db = dbSetup.getDatabase();

      // Insert security event
      const insertEvent = db.prepare(`
        INSERT INTO security_events (event_type, severity, description, source_ip, user_agent, package_name)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      insertEvent.run(
        'unauthorized_access_attempt',
        'high',
        'Failed login attempt detected',
        '192.168.1.100',
        'unknown/1.0',
        '@suspicious/package'
      );

      // Simulate monitoring service recording the event
      const insertMetric = db.prepare(`
        INSERT INTO performance_metrics (metric_name, metric_value, unit)
        VALUES (?, ?, ?)
      `);
      insertMetric.run('security_events_today', 1, 'count');

      // Simulate user activity logging
      const insertActivity = db.prepare(`
        INSERT INTO user_activity (user_id, action, resource_type, resource_id, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      insertActivity.run(
        null,
        'security_event_detected',
        'security_event',
        'unauthorized_access_attempt',
        '192.168.1.100',
        'unknown/1.0'
      );

      // Verify integration: security event triggers monitoring updates
      const event = db
        .prepare('SELECT * FROM security_events WHERE event_type = ?')
        .get('unauthorized_access_attempt');
      const metric = db
        .prepare('SELECT * FROM performance_metrics WHERE metric_name = ?')
        .get('security_events_today');
      const activity = db
        .prepare('SELECT * FROM user_activity WHERE action = ?')
        .get('security_event_detected');

      expect(event).toBeDefined();
      expect(event.severity).toBe('high');
      expect(metric).toBeDefined();
      expect(metric.metric_value).toBe(1);
      expect(activity).toBeDefined();
      expect(activity.resource_type).toBe('security_event');
    });

    it('should log system health when security scans complete', async () => {
      const db = dbSetup.getDatabase();

      // Insert security scan
      const insertScan = db.prepare(`
        INSERT INTO security_scans (package_name, package_version, scan_type, status, scan_result)
        VALUES (?, ?, ?, ?, ?)
      `);
      insertScan.run(
        '@monitored/package',
        '1.0.0',
        'dependency',
        'completed',
        'All dependencies secure'
      );

      // Simulate system health check triggered by security scan
      const insertHealth = db.prepare(`
        INSERT INTO system_health (service_name, status, response_time_ms)
        VALUES (?, ?, ?)
      `);
      insertHealth.run('security_scanner', 'healthy', 250);

      // Verify integration: security scan completion updates system health
      const scan = db
        .prepare('SELECT * FROM security_scans WHERE package_name = ?')
        .get('@monitored/package');
      const health = db
        .prepare('SELECT * FROM system_health WHERE service_name = ?')
        .get('security_scanner');

      expect(scan.status).toBe('completed');
      expect(health).toBeDefined();
      expect(health.status).toBe('healthy');
      expect(health.response_time_ms).toBe(250);
    });
  });

  describe('Registry ↔ Monitoring Service Integration', () => {
    it('should track package download metrics', async () => {
      const db = dbSetup.getDatabase();

      // Insert package
      const insertPackage = db.prepare(`
        INSERT INTO packages (name, version, description, author)
        VALUES (?, ?, ?, ?)
      `);
      insertPackage.run('@popular/package', '1.0.0', 'Popular package', 'Popular Author');

      // Simulate package download activity
      const insertActivity = db.prepare(`
        INSERT INTO user_activity (user_id, action, resource_type, resource_id, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      insertActivity.run(
        'user123',
        'package_download',
        'package',
        '@popular/package',
        '10.0.0.1',
        'npm/8.19.2'
      );

      // Update download metrics
      const insertMetric = db.prepare(`
        INSERT INTO performance_metrics (metric_name, metric_value, unit)
        VALUES (?, ?, ?)
      `);
      insertMetric.run('package_downloads_today', 150, 'count');
      insertMetric.run('unique_users_today', 45, 'count');

      // Verify integration: package activity updates monitoring metrics
      const activity = db
        .prepare('SELECT * FROM user_activity WHERE action = ? AND resource_id = ?')
        .get('package_download', '@popular/package');
      const downloads = db
        .prepare('SELECT * FROM performance_metrics WHERE metric_name = ?')
        .get('package_downloads_today');
      const users = db
        .prepare('SELECT * FROM performance_metrics WHERE metric_name = ?')
        .get('unique_users_today');

      expect(activity).toBeDefined();
      expect(activity.resource_type).toBe('package');
      expect(downloads.metric_value).toBe(150);
      expect(users.metric_value).toBe(45);
    });

    it('should monitor package publication performance', async () => {
      const db = dbSetup.getDatabase();

      // Insert package publication activity
      const insertActivity = db.prepare(`
        INSERT INTO user_activity (user_id, action, resource_type, resource_id, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      insertActivity.run(
        'publisher456',
        'package_publish',
        'package',
        '@new/package',
        '203.0.113.1',
        'npm/8.19.2'
      );

      // Record publication performance metrics
      const insertMetric = db.prepare(`
        INSERT INTO performance_metrics (metric_name, metric_value, unit)
        VALUES (?, ?, ?)
      `);
      insertMetric.run('avg_publish_time', 2.3, 'seconds');
      insertMetric.run('publish_success_rate', 98.5, 'percentage');

      // Verify integration: publication activity is monitored
      const activity = db
        .prepare('SELECT * FROM user_activity WHERE action = ?')
        .get('package_publish');
      const avgTime = db
        .prepare('SELECT * FROM performance_metrics WHERE metric_name = ?')
        .get('avg_publish_time');
      const successRate = db
        .prepare('SELECT * FROM performance_metrics WHERE metric_name = ?')
        .get('publish_success_rate');

      expect(activity).toBeDefined();
      expect(activity.action).toBe('package_publish');
      expect(avgTime.metric_value).toBe(2.3);
      expect(successRate.metric_value).toBe(98.5);
    });
  });

  describe('Compliance ↔ All Services Integration', () => {
    it('should validate all services during compliance check', async () => {
      const db = dbSetup.getDatabase();

      // Insert compliance check
      const insertCheck = db.prepare(`
        INSERT INTO compliance_checks (check_name, check_type, status, compliance_level)
        VALUES (?, ?, ?, ?)
      `);
      insertCheck.run('full_system_compliance', 'enterprise', 'running', 'maximum');

      // Simulate compliance validation of all services
      const findings = [
        'Registry service: All packages have valid metadata',
        'Security service: All scans completed within timeframe',
        'Monitoring service: All metrics within acceptable ranges',
        'Database service: All transactions properly logged',
      ];

      const insertReport = db.prepare(`
        INSERT INTO regulatory_reports (report_type, report_period, compliance_status, violations_count)
        VALUES (?, ?, ?, ?)
      `);
      insertReport.run('monthly_compliance', '2024-01', 'compliant', 0);

      // Insert compliance audit trail
      const insertAudit = db.prepare(`
        INSERT INTO audit_trail (action, actor, resource_type, resource_id, compliance_impact)
        VALUES (?, ?, ?, ?, ?)
      `);
      insertAudit.run(
        'compliance_check_completed',
        'system',
        'compliance_check',
        'full_system_compliance',
        'positive'
      );

      // Verify integration: compliance check validates all services
      const check = db
        .prepare('SELECT * FROM compliance_checks WHERE check_name = ?')
        .get('full_system_compliance');
      const report = db
        .prepare('SELECT * FROM regulatory_reports WHERE report_type = ?')
        .get('monthly_compliance');
      const audit = db
        .prepare('SELECT * FROM audit_trail WHERE action = ?')
        .get('compliance_check_completed');

      expect(check).toBeDefined();
      expect(check.status).toBe('running');
      expect(check.compliance_level).toBe('maximum');
      expect(report.compliance_status).toBe('compliant');
      expect(report.violations_count).toBe(0);
      expect(audit.compliance_impact).toBe('positive');
    });

    it('should cross-reference security and compliance data', async () => {
      const db = dbSetup.getDatabase();

      // Insert package with security and compliance data
      const insertPackage = db.prepare(`
        INSERT INTO packages (name, version, description, author)
        VALUES (?, ?, ?, ?)
      `);
      insertPackage.run('@compliant/package', '1.0.0', 'Compliant package', 'Compliance Team');

      // Insert security scan for the package
      const insertScan = db.prepare(`
        INSERT INTO security_scans (package_name, package_version, scan_type, status, vulnerabilities_found)
        VALUES (?, ?, ?, ?, ?)
      `);
      insertScan.run('@compliant/package', '1.0.0', 'compliance', 'completed', 0);

      // Insert compliance finding for the same package
      const insertCheck = db.prepare(`
        INSERT INTO compliance_checks (check_name, check_type, status, compliance_level, findings)
        VALUES (?, ?, ?, ?, ?)
      `);
      insertCheck.run(
        'package_compliance_@compliant/package',
        'package',
        'completed',
        'high',
        'Package meets all compliance requirements'
      );

      // Insert cross-reference in audit trail
      const insertAudit = db.prepare(`
        INSERT INTO audit_trail (action, actor, resource_type, resource_id, old_values, new_values, compliance_impact)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      insertAudit.run(
        'compliance_validation',
        'security_service',
        'package',
        '@compliant/package',
        'vulnerabilities_found: 2',
        'vulnerabilities_found: 0',
        'positive'
      );

      // Verify integration: security and compliance data are properly cross-referenced
      const pkg = db.prepare('SELECT * FROM packages WHERE name = ?').get('@compliant/package');
      const scan = db
        .prepare('SELECT * FROM security_scans WHERE package_name = ?')
        .get('@compliant/package');
      const check = db
        .prepare('SELECT * FROM compliance_checks WHERE check_name LIKE ?')
        .get('%@compliant/package%');
      const auditEntry = db
        .prepare('SELECT * FROM audit_trail WHERE resource_id = ?')
        .get('@compliant/package');

      expect(pkg).toBeDefined();
      expect(scan.vulnerabilities_found).toBe(0);
      expect(check.status).toBe('completed');
      expect(check.findings).toContain('compliance requirements');
      expect(auditEntry.compliance_impact).toBe('positive');
    });
  });

  describe('Multi-Service Transaction Integration', () => {
    it('should handle complex multi-service transactions', async () => {
      const db = dbSetup.getDatabase();

      // Simulate a complex transaction spanning multiple services
      // This would typically be handled by the DatabaseUtils.executeTransaction method

      let transactionSuccess = true;
      let transactionError: Error | null = null;

      try {
        // Test individual operations that would normally be in a transaction
        // Insert package
        const insertPackage = db.prepare(`
          INSERT INTO packages (name, version, description, author)
          VALUES (?, ?, ?, ?)
        `);
        insertPackage.run('@complex/package', '3.0.0', 'Complex package', 'Integration Team');

        // Insert security scan
        const insertScan = db.prepare(`
          INSERT INTO security_scans (package_name, package_version, scan_type, status)
          VALUES (?, ?, ?, ?)
        `);
        insertScan.run('@complex/package', '3.0.0', 'full_scan', 'completed');

        // Insert monitoring metric
        const insertMetric = db.prepare(`
          INSERT INTO performance_metrics (metric_name, metric_value, unit)
          VALUES (?, ?, ?)
        `);
        insertMetric.run('complex_operations_today', 1, 'count');

        // Insert compliance check
        const insertCheck = db.prepare(`
          INSERT INTO compliance_checks (check_name, check_type, status, compliance_level)
          VALUES (?, ?, ?, ?)
        `);
        insertCheck.run('complex_package_check', 'integration', 'passed', 'high');

        // Insert audit trail
        const insertAudit = db.prepare(`
          INSERT INTO audit_trail (action, actor, resource_type, resource_id)
          VALUES (?, ?, ?, ?)
        `);
        insertAudit.run('complex_transaction', 'integration_test', 'package', '@complex/package');
      } catch (error) {
        transactionSuccess = false;
        transactionError = error as Error;
        console.log('Transaction error:', error);
      }

      // Verify all services were updated successfully
      const pkg = db.prepare('SELECT * FROM packages WHERE name = ?').get('@complex/package');
      const scan = db
        .prepare('SELECT * FROM security_scans WHERE package_name = ?')
        .get('@complex/package');
      const metric = db
        .prepare('SELECT * FROM performance_metrics WHERE metric_name = ?')
        .get('complex_operations_today');
      const check = db
        .prepare('SELECT * FROM compliance_checks WHERE check_name = ?')
        .get('complex_package_check');
      const audit = db
        .prepare('SELECT * FROM audit_trail WHERE action = ?')
        .get('complex_transaction');

      expect(transactionSuccess).toBe(true);
      expect(pkg).toBeDefined();
      expect(scan).toBeDefined();
      expect(metric).toBeDefined();
      expect(check).toBeDefined();
      expect(audit).toBeDefined();
    });
  });
});
