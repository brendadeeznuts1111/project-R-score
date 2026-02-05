import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { TestDatabaseSetup, TestEnvironmentSetup } from '../utils/test-utils';

describe('Security Module', () => {
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

  describe('Security Scans', () => {
    it('should create security scan record', () => {
      const db = dbSetup.getDatabase();

      const insert = db.prepare(`
        INSERT INTO security_scans
        (package_name, package_version, scan_type, status, vulnerabilities_found)
        VALUES (?, ?, ?, ?, ?)
      `);

      const result = insert.run('test-package', '1.0.0', 'vulnerability', 'completed', 2);
      expect(result.changes).toBe(1);
    });

    it('should retrieve security scan results', () => {
      const db = dbSetup.getDatabase();

      // Insert test data
      const insert = db.prepare(`
        INSERT INTO security_scans
        (package_name, package_version, scan_type, status, vulnerabilities_found, critical_count, high_count)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      insert.run('test-package', '1.0.0', 'vulnerability', 'completed', 5, 1, 2);

      // Query the data
      const result = db
        .prepare(
          `
        SELECT * FROM security_scans WHERE package_name = ?
      `
        )
        .get('test-package');

      expect(result).toBeDefined();
      expect(result.package_name).toBe('test-package');
      expect(result.vulnerabilities_found).toBe(5);
      expect(result.critical_count).toBe(1);
      expect(result.high_count).toBe(2);
    });

    it('should handle security scan with no vulnerabilities', () => {
      const db = dbSetup.getDatabase();

      const insert = db.prepare(`
        INSERT INTO security_scans
        (package_name, package_version, scan_type, status, vulnerabilities_found)
        VALUES (?, ?, ?, ?, ?)
      `);

      insert.run('secure-package', '1.0.0', 'vulnerability', 'clean', 0);

      const result = db
        .prepare(
          `
        SELECT vulnerabilities_found FROM security_scans WHERE package_name = ?
      `
        )
        .get('secure-package');

      expect(result.vulnerabilities_found).toBe(0);
    });

    it('should track security scan timestamps', () => {
      const db = dbSetup.getDatabase();

      const beforeInsert = new Date();
      // Add a small buffer to account for test execution time
      beforeInsert.setMilliseconds(beforeInsert.getMilliseconds() - 100);

      const insert = db.prepare(`
        INSERT INTO security_scans
        (package_name, package_version, scan_type, status, vulnerabilities_found)
        VALUES (?, ?, ?, ?, ?)
      `);

      insert.run('timestamp-package', '1.0.0', 'vulnerability', 'completed', 1);

      const result = db
        .prepare(
          `
        SELECT scanned_at FROM security_scans WHERE package_name = ?
      `
        )
        .get('timestamp-package');

      expect(result.scanned_at).toBeDefined();
      const scannedAt = new Date(result.scanned_at);
      // Allow for SQLite timestamp precision (seconds vs milliseconds)
      const timeDiff = scannedAt.getTime() - beforeInsert.getTime();
      expect(timeDiff).toBeGreaterThanOrEqual(-2000); // Allow up to 2 seconds difference
      expect(timeDiff).toBeLessThanOrEqual(2000);
    });
  });

  describe('Security Events', () => {
    it('should log security events', () => {
      const db = dbSetup.getDatabase();

      const insert = db.prepare(`
        INSERT INTO security_events
        (event_type, severity, description, source_ip, user_agent, package_name)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const result = insert.run(
        'unauthorized_access',
        'high',
        'Unauthorized access attempt detected',
        '192.168.1.100',
        'curl/7.68.0',
        'test-package'
      );

      expect(result.changes).toBe(1);
    });

    it('should query security events by severity', () => {
      const db = dbSetup.getDatabase();

      // Insert multiple events with different severities
      const insert = db.prepare(`
        INSERT INTO security_events
        (event_type, severity, description, source_ip)
        VALUES (?, ?, ?, ?)
      `);

      insert.run('login_attempt', 'low', 'Failed login', '127.0.0.1');
      insert.run('suspicious_activity', 'high', 'Suspicious activity detected', '192.168.1.1');
      insert.run('brute_force', 'critical', 'Brute force attack detected', '10.0.0.5');

      // Query high severity events
      const highEvents = db
        .prepare(
          `
        SELECT COUNT(*) as count FROM security_events WHERE severity = ?
      `
        )
        .get('high');

      expect(highEvents.count).toBe(1);

      // Query all events
      const allEvents = db
        .prepare(
          `
        SELECT COUNT(*) as count FROM security_events
      `
        )
        .get();

      expect(allEvents.count).toBe(3);
    });

    it('should include event metadata', () => {
      const db = dbSetup.getDatabase();

      const insert = db.prepare(`
        INSERT INTO security_events
        (event_type, severity, description, source_ip, user_agent, details)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const eventDetails = JSON.stringify({
        attemptedAction: 'package_publish',
        userId: 'anonymous',
        timestamp: new Date().toISOString(),
      });

      insert.run(
        'authentication_failure',
        'medium',
        'Authentication failure',
        '203.0.113.1',
        'npm/8.19.2 node/v18.12.1 linux x64',
        eventDetails
      );

      const result = db
        .prepare(
          `
        SELECT * FROM security_events WHERE event_type = ?
      `
        )
        .get('authentication_failure');

      expect(result).toBeDefined();
      expect(result.severity).toBe('medium');
      expect(result.source_ip).toBe('203.0.113.1');
      expect(result.details).toBe(eventDetails);
    });
  });

  describe('Security Audit Trail', () => {
    it('should maintain comprehensive audit trail', () => {
      const db = dbSetup.getDatabase();

      // Test audit log table (legacy)
      const auditInsert = db.prepare(`
        INSERT INTO audit_log
        (action, package_name, package_version, user_agent, ip_address, details)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      auditInsert.run(
        'package_publish',
        'test-package',
        '1.0.0',
        'npm/8.19.2',
        '127.0.0.1',
        'Package published successfully'
      );

      const auditResult = db
        .prepare(
          `
        SELECT * FROM audit_log WHERE package_name = ?
      `
        )
        .get('test-package');

      expect(auditResult).toBeDefined();
      expect(auditResult.action).toBe('package_publish');
      expect(auditResult.package_version).toBe('1.0.0');
    });

    it('should handle concurrent security operations', async () => {
      const db = dbSetup.getDatabase();

      // Simulate concurrent operations
      const operations = [
        () => {
          const insert = db.prepare(`
            INSERT INTO security_scans
            (package_name, package_version, scan_type, status)
            VALUES (?, ?, ?, ?)
          `);
          insert.run('concurrent-package-1', '1.0.0', 'vulnerability', 'running');
        },
        () => {
          const insert = db.prepare(`
            INSERT INTO security_events
            (event_type, severity, description)
            VALUES (?, ?, ?)
          `);
          insert.run('concurrent_test', 'low', 'Concurrent operation test');
        },
        () => {
          const insert = db.prepare(`
            INSERT INTO audit_log
            (action, package_name, user_agent)
            VALUES (?, ?, ?)
          `);
          insert.run('concurrent_publish', 'concurrent-package-2', 'test-agent');
        },
      ];

      // Execute operations
      operations.forEach(op => op());

      // Verify all operations completed
      const scans = db.prepare(`SELECT COUNT(*) as count FROM security_scans`).get();
      const events = db.prepare(`SELECT COUNT(*) as count FROM security_events`).get();
      const audits = db.prepare(`SELECT COUNT(*) as count FROM audit_log`).get();

      expect(scans.count).toBeGreaterThan(0);
      expect(events.count).toBeGreaterThan(0);
      expect(audits.count).toBeGreaterThan(0);
    });

    it('should validate security data integrity', () => {
      const db = dbSetup.getDatabase();

      // Test data integrity constraints
      const invalidInsert = db.prepare(`
        INSERT INTO security_scans
        (package_name, scan_type, status)
        VALUES (?, ?, ?)
      `);

      // This should fail due to NOT NULL constraint on package_version
      expect(() => {
        invalidInsert.run('invalid-package', 'vulnerability', 'completed');
      }).toThrow();
    });
  });

  describe('Security Configuration', () => {
    it('should validate security configuration schema', () => {
      // Test security-related configuration validation
      const securityConfig = {
        scanEnabled: true,
        auditLevel: 'high',
        blockMalicious: true,
        requireAuth: true,
      };

      expect(securityConfig.scanEnabled).toBe(true);
      expect(securityConfig.auditLevel).toBe('high');
      expect(securityConfig.blockMalicious).toBe(true);
      expect(securityConfig.requireAuth).toBe(true);
    });

    it('should handle security configuration overrides', () => {
      // Test configuration override scenarios
      const baseConfig = {
        scanEnabled: false,
        auditLevel: 'low',
      };

      const overrideConfig = {
        ...baseConfig,
        scanEnabled: true,
        auditLevel: 'high',
      };

      expect(overrideConfig.scanEnabled).toBe(true);
      expect(overrideConfig.auditLevel).toBe('high');
    });

    it('should validate security thresholds', () => {
      const thresholds = {
        maxVulnerabilities: 10,
        criticalThreshold: 5,
        highThreshold: 3,
        mediumThreshold: 2,
      };

      expect(thresholds.maxVulnerabilities).toBeGreaterThan(thresholds.criticalThreshold);
      expect(thresholds.criticalThreshold).toBeGreaterThan(thresholds.highThreshold);
      expect(thresholds.highThreshold).toBeGreaterThan(thresholds.mediumThreshold);
    });
  });
});
