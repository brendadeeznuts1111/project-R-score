import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { TestDatabaseSetup, TestEnvironmentSetup } from '../utils/test-utils';

describe('Compliance Module', () => {
  let dbSetup: TestDatabaseSetup;
  let envSetup: TestEnvironmentSetup;

  beforeEach(async () => {
    envSetup = new TestEnvironmentSetup();
    envSetup.setup('enterprise');
    dbSetup = new TestDatabaseSetup();
    await dbSetup.setup();
  });

  afterEach(async () => {
    await dbSetup.teardown();
    envSetup.teardown();
  });

  describe('Compliance Checks', () => {
    it('should record compliance check results', () => {
      const db = dbSetup.getDatabase();

      const insert = db.prepare(`
        INSERT INTO compliance_checks
        (check_name, check_type, status, compliance_level, findings, recommendations)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const result = insert.run(
        'GDPR Data Protection',
        'REGULATORY',
        'PASSED',
        'FULL',
        'All data handling practices compliant',
        'Continue monitoring data processing activities'
      );

      expect(result.changes).toBe(1);
    });

    it('should track failed compliance checks', () => {
      const db = dbSetup.getDatabase();

      const insert = db.prepare(`
        INSERT INTO compliance_checks
        (check_name, check_type, status, compliance_level, findings, recommendations)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      insert.run(
        'PCI DSS Payment Security',
        'REGULATORY',
        'FAILED',
        'PARTIAL',
        'Encryption standards not fully implemented',
        'Implement end-to-end encryption for payment data'
      );

      const failedCheck = db
        .prepare(
          `
        SELECT * FROM compliance_checks WHERE status = ?
      `
        )
        .get('FAILED');

      expect(failedCheck).toBeDefined();
      expect(failedCheck.compliance_level).toBe('PARTIAL');
      expect(failedCheck.findings).toContain('Encryption standards');
    });

    it('should query compliance checks by type', () => {
      const db = dbSetup.getDatabase();

      const insert = db.prepare(`
        INSERT INTO compliance_checks
        (check_name, check_type, status, compliance_level)
        VALUES (?, ?, ?, ?)
      `);

      // Insert different types of compliance checks
      insert.run('GDPR Compliance', 'REGULATORY', 'PASSED', 'FULL');
      insert.run('Security Audit', 'AUDIT', 'PASSED', 'FULL');
      insert.run('Access Control Review', 'INTERNAL', 'PENDING', 'MINIMAL');
      insert.run('PCI DSS', 'REGULATORY', 'PASSED', 'FULL');
      insert.run('Code Quality Check', 'TECHNICAL', 'PASSED', 'FULL');

      const regulatoryChecks = db
        .prepare(
          `
        SELECT COUNT(*) as count FROM compliance_checks WHERE check_type = ?
      `
        )
        .get('REGULATORY');

      expect(regulatoryChecks.count).toBe(2);

      const auditChecks = db
        .prepare(
          `
        SELECT COUNT(*) as count FROM compliance_checks WHERE check_type = ?
      `
        )
        .get('AUDIT');

      expect(auditChecks.count).toBe(1);
    });

    it('should track compliance check schedules', () => {
      const db = dbSetup.getDatabase();

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // 30 days from now

      const insert = db.prepare(`
        INSERT INTO compliance_checks
        (check_name, check_type, status, compliance_level, checked_at, next_check_date)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      insert.run(
        'Quarterly Security Review',
        'AUDIT',
        'PASSED',
        'FULL',
        new Date().toISOString(),
        futureDate.toISOString()
      );

      const scheduledCheck = db
        .prepare(
          `
        SELECT next_check_date FROM compliance_checks WHERE check_name = ?
      `
        )
        .get('Quarterly Security Review');

      expect(scheduledCheck.next_check_date).toBeDefined();
      const nextCheck = new Date(scheduledCheck.next_check_date);
      expect(nextCheck.getTime()).toBeGreaterThan(new Date().getTime());
    });

    it('should calculate compliance percentages', () => {
      const db = dbSetup.getDatabase();

      const insert = db.prepare(`
        INSERT INTO compliance_checks
        (check_name, check_type, status, compliance_level)
        VALUES (?, ?, ?, ?)
      `);

      // Insert compliance check results
      insert.run('Check 1', 'REGULATORY', 'PASSED', 'FULL');
      insert.run('Check 2', 'REGULATORY', 'PASSED', 'FULL');
      insert.run('Check 3', 'REGULATORY', 'FAILED', 'PARTIAL');
      insert.run('Check 4', 'AUDIT', 'PASSED', 'FULL');

      const passedCount = db
        .prepare(
          `
        SELECT COUNT(*) as count FROM compliance_checks WHERE status = ?
      `
        )
        .get('PASSED');

      const totalCount = db
        .prepare(
          `
        SELECT COUNT(*) as count FROM compliance_checks
      `
        )
        .get();

      const complianceRate = (passedCount.count / totalCount.count) * 100;
      expect(complianceRate).toBe(75); // 3 out of 4 passed
    });
  });

  describe('Regulatory Reports', () => {
    it('should generate regulatory reports', () => {
      const db = dbSetup.getDatabase();

      const insert = db.prepare(`
        INSERT INTO regulatory_reports
        (report_type, report_period, compliance_status, violations_count, corrective_actions)
        VALUES (?, ?, ?, ?, ?)
      `);

      const result = insert.run(
        'GDPR Annual Report',
        '2024-Q1',
        'COMPLIANT',
        0,
        'No corrective actions required'
      );

      expect(result.changes).toBe(1);
    });

    it('should track regulatory violations', () => {
      const db = dbSetup.getDatabase();

      const insert = db.prepare(`
        INSERT INTO regulatory_reports
        (report_type, report_period, compliance_status, violations_count, corrective_actions)
        VALUES (?, ?, ?, ?, ?)
      `);

      insert.run(
        'PCI DSS Report',
        '2024-Q2',
        'NON_COMPLIANT',
        3,
        'Implement additional encryption; Update access controls; Enhance monitoring'
      );

      const report = db
        .prepare(
          `
        SELECT * FROM regulatory_reports WHERE report_type = ?
      `
        )
        .get('PCI DSS Report');

      expect(report.violations_count).toBe(3);
      expect(report.compliance_status).toBe('NON_COMPLIANT');
      expect(report.corrective_actions).toContain('encryption');
      expect(report.corrective_actions).toContain('access controls');
    });

    it('should query reports by period', () => {
      const db = dbSetup.getDatabase();

      const insert = db.prepare(`
        INSERT INTO regulatory_reports
        (report_type, report_period, compliance_status)
        VALUES (?, ?, ?)
      `);

      insert.run('GDPR', '2024-Q1', 'COMPLIANT');
      insert.run('GDPR', '2024-Q2', 'COMPLIANT');
      insert.run('PCI DSS', '2024-Q1', 'NON_COMPLIANT');
      insert.run('SOX', '2024-Q1', 'COMPLIANT');

      const q1Reports = db
        .prepare(
          `
        SELECT COUNT(*) as count FROM regulatory_reports WHERE report_period = ?
      `
        )
        .get('2024-Q1');

      expect(q1Reports.count).toBe(3);

      const gdprReports = db
        .prepare(
          `
        SELECT COUNT(*) as count FROM regulatory_reports WHERE report_type = ?
      `
        )
        .get('GDPR');

      expect(gdprReports.count).toBe(2);
    });

    it('should track report submission status', () => {
      const db = dbSetup.getDatabase();

      const insert = db.prepare(`
        INSERT INTO regulatory_reports
        (report_type, report_period, compliance_status, generated_at, submitted_at, approved_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const generatedAt = new Date().toISOString();
      const submittedAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 1 day later
      const approvedAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 2 days later

      insert.run(
        'Annual Compliance Report',
        '2024',
        'COMPLIANT',
        generatedAt,
        submittedAt,
        approvedAt
      );

      const report = db
        .prepare(
          `
        SELECT * FROM regulatory_reports WHERE report_type = ?
      `
        )
        .get('Annual Compliance Report');

      expect(report.generated_at).toBeDefined();
      expect(report.submitted_at).toBeDefined();
      expect(report.approved_at).toBeDefined();

      // Verify chronological order
      const genTime = new Date(report.generated_at).getTime();
      const subTime = new Date(report.submitted_at).getTime();
      const appTime = new Date(report.approved_at).getTime();

      expect(subTime).toBeGreaterThan(genTime);
      expect(appTime).toBeGreaterThan(subTime);
    });

    it('should handle complex corrective actions', () => {
      const db = dbSetup.getDatabase();

      const correctiveActions = JSON.stringify({
        immediate: [
          'Implement multi-factor authentication',
          'Update encryption protocols',
          'Review access permissions',
        ],
        short_term: [
          'Conduct security training',
          'Implement automated monitoring',
          'Update incident response procedures',
        ],
        long_term: [
          'Design comprehensive security architecture',
          'Implement zero-trust model',
          'Regular security assessments',
        ],
      });

      const insert = db.prepare(`
        INSERT INTO regulatory_reports
        (report_type, report_period, compliance_status, violations_count, corrective_actions)
        VALUES (?, ?, ?, ?, ?)
      `);

      insert.run(
        'Comprehensive Security Audit',
        '2024-H1',
        'PARTIAL_COMPLIANCE',
        5,
        correctiveActions
      );

      const report = db
        .prepare(
          `
        SELECT corrective_actions FROM regulatory_reports WHERE report_type = ?
      `
        )
        .get('Comprehensive Security Audit');

      const parsedActions = JSON.parse(report.corrective_actions);
      expect(parsedActions.immediate).toHaveLength(3);
      expect(parsedActions.short_term).toHaveLength(3);
      expect(parsedActions.long_term).toHaveLength(3);
      expect(parsedActions.immediate[0]).toBe('Implement multi-factor authentication');
    });
  });

  describe('Audit Trail', () => {
    it('should maintain comprehensive audit trail', () => {
      const db = dbSetup.getDatabase();

      const insert = db.prepare(`
        INSERT INTO audit_trail
        (action, actor, resource_type, resource_id, old_values, new_values, compliance_impact)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const oldValues = JSON.stringify({ status: 'draft', visibility: 'private' });
      const newValues = JSON.stringify({ status: 'published', visibility: 'public' });

      const result = insert.run(
        'package_publish',
        'user123',
        'package',
        'compliance-package',
        oldValues,
        newValues,
        'GDPR compliance review required'
      );

      expect(result.changes).toBe(1);
    });

    it('should query audit trail by actor', () => {
      const db = dbSetup.getDatabase();

      const insert = db.prepare(`
        INSERT INTO audit_trail
        (action, actor, resource_type, resource_id)
        VALUES (?, ?, ?, ?)
      `);

      // Insert audit entries for different actors
      insert.run('login', 'user1', 'auth', 'session1');
      insert.run('package_download', 'user1', 'package', 'pkg1');
      insert.run('package_publish', 'user2', 'package', 'pkg2');
      insert.run('user_create', 'admin', 'user', 'user3');
      insert.run('config_update', 'user1', 'system', 'security_settings');

      const user1Actions = db
        .prepare(
          `
        SELECT COUNT(*) as count FROM audit_trail WHERE actor = ?
      `
        )
        .get('user1');

      expect(user1Actions.count).toBe(3);

      const adminActions = db
        .prepare(
          `
        SELECT COUNT(*) as count FROM audit_trail WHERE actor = ?
      `
        )
        .get('admin');

      expect(adminActions.count).toBe(1);
    });

    it('should track audit trail with compliance impact', () => {
      const db = dbSetup.getDatabase();

      const insert = db.prepare(`
        INSERT INTO audit_trail
        (action, actor, resource_type, resource_id, compliance_impact, occurred_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const complianceImpacts = [
        'GDPR data processing change',
        'PCI DSS payment security update',
        'SOX financial reporting modification',
        null, // No compliance impact
        'Access control policy update',
      ];

      complianceImpacts.forEach((impact, index) => {
        insert.run(
          `action_${index}`,
          'system',
          'config',
          `resource_${index}`,
          impact,
          new Date().toISOString()
        );
      });

      const complianceRelated = db
        .prepare(
          `
        SELECT COUNT(*) as count FROM audit_trail WHERE compliance_impact IS NOT NULL
      `
        )
        .get();

      expect(complianceRelated.count).toBe(4);

      const gdprActions = db
        .prepare(
          `
        SELECT COUNT(*) as count FROM audit_trail WHERE compliance_impact LIKE ?
      `
        )
        .get('%GDPR%');

      expect(gdprActions.count).toBe(1);
    });

    it('should audit configuration changes', () => {
      const db = dbSetup.getDatabase();

      const insert = db.prepare(`
        INSERT INTO audit_trail
        (action, actor, resource_type, resource_id, old_values, new_values)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const oldConfig = JSON.stringify({
        security_level: 'standard',
        audit_enabled: false,
      });

      const newConfig = JSON.stringify({
        security_level: 'enterprise',
        audit_enabled: true,
      });

      insert.run('config_update', 'admin', 'system', 'security_config', oldConfig, newConfig);

      const auditEntry = db
        .prepare(
          `
        SELECT * FROM audit_trail WHERE action = ?
      `
        )
        .get('config_update');

      expect(auditEntry).toBeDefined();
      expect(auditEntry.old_values).toBe(oldConfig);
      expect(auditEntry.new_values).toBe(newConfig);

      // Verify the change was from standard to enterprise
      const oldParsed = JSON.parse(auditEntry.old_values);
      const newParsed = JSON.parse(auditEntry.new_values);

      expect(oldParsed.security_level).toBe('standard');
      expect(newParsed.security_level).toBe('enterprise');
      expect(oldParsed.audit_enabled).toBe(false);
      expect(newParsed.audit_enabled).toBe(true);
    });

    it('should handle audit data integrity', () => {
      const db = dbSetup.getDatabase();

      // Test that invalid audit data is rejected
      const invalidInsert = db.prepare(`
        INSERT INTO audit_trail
        (action, resource_type)  -- Missing required actor field
        VALUES (?, ?)
      `);

      expect(() => {
        invalidInsert.run('invalid_action', 'invalid_resource');
      }).toThrow();
    });
  });

  describe('Compliance Integration', () => {
    it('should correlate compliance checks with audit trail', () => {
      const db = dbSetup.getDatabase();

      // Insert related compliance and audit data
      const complianceInsert = db.prepare(`
        INSERT INTO compliance_checks
        (check_name, check_type, status, compliance_level, findings)
        VALUES (?, ?, ?, ?, ?)
      `);

      const auditInsert = db.prepare(`
        INSERT INTO audit_trail
        (action, actor, resource_type, resource_id, compliance_impact)
        VALUES (?, ?, ?, ?, ?)
      `);

      complianceInsert.run(
        'Security Configuration Audit',
        'AUDIT',
        'PASSED',
        'FULL',
        'All security configurations compliant'
      );

      auditInsert.run(
        'config_update',
        'compliance_system',
        'security',
        'encryption_settings',
        'Security configuration audit passed'
      );

      // Query correlated data
      const correlation = db
        .prepare(
          `
        SELECT
          cc.check_name,
          cc.status as compliance_status,
          at.action,
          at.compliance_impact
        FROM compliance_checks cc
        CROSS JOIN audit_trail at
        WHERE cc.check_type = 'AUDIT'
        AND at.resource_type = 'security'
      `
        )
        .get();

      expect(correlation.compliance_status).toBe('PASSED');
      expect(correlation.action).toBe('config_update');
      expect(correlation.compliance_impact).toContain('audit passed');
    });

    it('should generate compliance reports from audit data', () => {
      const db = dbSetup.getDatabase();

      const auditInsert = db.prepare(`
        INSERT INTO audit_trail
        (action, actor, resource_type, resource_id, occurred_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      // Insert audit data for the last 30 days
      const now = new Date();
      for (let i = 0; i < 30; i++) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        auditInsert.run('user_login', `user${i % 5}`, 'auth', `session${i}`, date.toISOString());
      }

      const monthlyActivity = db
        .prepare(
          `
        SELECT COUNT(*) as total_actions,
               COUNT(DISTINCT actor) as unique_actors
        FROM audit_trail
        WHERE occurred_at >= datetime('now', '-30 days')
      `
        )
        .get();

      expect(monthlyActivity.total_actions).toBe(30);
      expect(monthlyActivity.unique_actors).toBe(5);
    });

    it('should validate compliance data consistency', () => {
      const db = dbSetup.getDatabase();

      // Test referential integrity
      const complianceInsert = db.prepare(`
        INSERT INTO compliance_checks
        (check_name, check_type, status, compliance_level)
        VALUES (?, ?, ?, ?)
      `);

      complianceInsert.run('Test Check', 'REGULATORY', 'PASSED', 'FULL');

      // Verify the data was inserted correctly
      const check = db
        .prepare(
          `
        SELECT * FROM compliance_checks WHERE check_name = ?
      `
        )
        .get('Test Check');

      expect(check.status).toBe('PASSED');
      expect(check.check_type).toBe('REGULATORY');
      expect(check.checked_at).toBeDefined();
    });
  });

  describe('Compliance Monitoring', () => {
    it('should monitor compliance status over time', () => {
      const db = dbSetup.getDatabase();

      const insert = db.prepare(`
        INSERT INTO compliance_checks
        (check_name, check_type, status, compliance_level, checked_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      // Simulate compliance checks over time
      const now = new Date();
      const timePoints = [
        new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        now, // Today
      ];

      timePoints.forEach((time, index) => {
        insert.run(
          `Compliance Check ${index + 1}`,
          'REGULATORY',
          index === 2 ? 'PASSED' : 'FAILED', // Latest check passed
          index === 2 ? 'FULL' : 'PARTIAL',
          time.toISOString()
        );
      });

      const recentCompliance = db
        .prepare(
          `
        SELECT status FROM compliance_checks
        WHERE checked_at >= datetime('now', '-7 days')
        ORDER BY checked_at DESC LIMIT 1
      `
        )
        .get();

      expect(recentCompliance.status).toBe('PASSED');
    });

    it('should alert on compliance failures', () => {
      const db = dbSetup.getDatabase();

      const insert = db.prepare(`
        INSERT INTO compliance_checks
        (check_name, check_type, status, compliance_level, findings)
        VALUES (?, ?, ?, ?, ?)
      `);

      // Insert multiple failed checks
      const failures = [
        'Data encryption not implemented',
        'Access controls insufficient',
        'Audit logging incomplete',
        'Security policies outdated',
      ];

      failures.forEach((finding, index) => {
        insert.run(`Security Check ${index + 1}`, 'REGULATORY', 'FAILED', 'MINIMAL', finding);
      });

      const criticalFailures = db
        .prepare(
          `
        SELECT COUNT(*) as count FROM compliance_checks
        WHERE status = 'FAILED' AND check_type = 'REGULATORY'
      `
        )
        .get();

      expect(criticalFailures.count).toBe(4);

      // This would trigger compliance alerts in a real system
      expect(criticalFailures.count).toBeGreaterThan(2); // Threshold for critical alert
    });

    it('should track compliance improvement trends', () => {
      const db = dbSetup.getDatabase();

      const insert = db.prepare(`
        INSERT INTO compliance_checks
        (check_name, check_type, status, compliance_level, checked_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      // Simulate improving compliance over time
      const now = new Date();
      const checks = [
        { date: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000), status: 'FAILED' }, // 60 days ago (outside window)
        { date: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000), status: 'FAILED' }, // 35 days ago (outside window)
        { date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), status: 'PASSED' }, // 7 days ago (within window)
        { date: now, status: 'PASSED' }, // Today (within window)
      ];

      checks.forEach((check, index) => {
        const level = check.status === 'PASSED' ? 'FULL' : 'MINIMAL';
        insert.run(`Trend Check ${index + 1}`, 'AUDIT', check.status, level, check.date.toISOString());
      });

      const recentPassRate = db
        .prepare(
          `
        SELECT
          (SELECT COUNT(*) FROM compliance_checks WHERE status = 'PASSED' AND checked_at >= datetime('now', '-30 days')) * 100.0 /
          (SELECT COUNT(*) FROM compliance_checks WHERE checked_at >= datetime('now', '-30 days')) as pass_rate
      `
        )
        .get();

      expect(recentPassRate.pass_rate).toBe(100); // 100% pass rate in last 30 days
    });
  });
});
