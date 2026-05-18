-- Fantasy42-Fire22 Registry Seed Data
-- Initial data for development and testing

-- ============================================================================
-- INITIAL PACKAGES
-- ============================================================================

INSERT OR IGNORE INTO packages (name, description, author, license, repository, homepage, keywords)
VALUES
  ('@fire22-registry/core-security',
   'Enterprise-grade security package for Fantasy42 operations',
   '{"name": "Fire22 Security Team", "email": "security@fire22.com"}',
   'MIT',
   'https://github.com/brendadeeznuts1111/fantasy42-fire22-registry',
   'https://fire22.com/security',
   'security,enterprise,fantasy42'
  ),
  ('@fire22-registry/analytics-dashboard',
   'Real-time analytics dashboard for Fantasy42 operations',
   '{"name": "Fire22 Analytics Team", "email": "analytics@fire22.com"}',
   'MIT',
   'https://github.com/brendadeeznuts1111/fantasy42-fire22-registry',
   'https://fire22.com/analytics',
   'analytics,dashboard,fantasy42'
  ),
  ('@fire22-registry/compliance-core',
   'Compliance management core for Fantasy42 operations',
   '{"name": "Fire22 Compliance Team", "email": "compliance@fire22.com"}',
   'MIT',
   'https://github.com/brendadeeznuts1111/fantasy42-fire22-registry',
   'https://fire22.com/compliance',
   'compliance,gdpr,pci,fantasy42'
  ),
  ('@fire22-registry/betting-engine',
   'Advanced betting engine for Fantasy42 sports operations',
   '{"name": "Fire22 Betting Team", "email": "betting@fire22.com"}',
   'MIT',
   'https://github.com/brendadeeznuts1111/fantasy42-fire22-registry',
   'https://fire22.com/betting',
   'betting,sports,fantasy42'
  );

-- ============================================================================
-- PACKAGE VERSIONS
-- ============================================================================

-- Core Security Package Versions
INSERT OR IGNORE INTO package_versions (package_id, version, tarball_url, integrity, shasum, engines, scripts, published_at)
SELECT
  p.id,
  '3.1.0',
  'https://registry.fire22.com/@fire22-registry/core-security/-/core-security-3.1.0.tgz',
  'sha512-integrity-hash-here',
  'shasum-hash-here',
  '{"bun": ">=1.0.0", "node": ">=18.0.0"}',
  '{"build": "bun build", "test": "bun test", "security:audit": "bun run security-scan"}',
  datetime('now', '-1 day')
FROM packages p WHERE p.name = '@fire22-registry/core-security';

-- Analytics Dashboard Versions
INSERT OR IGNORE INTO package_versions (package_id, version, tarball_url, integrity, shasum, engines, scripts, published_at)
SELECT
  p.id,
  '2.7.0',
  'https://registry.fire22.com/@fire22-registry/analytics-dashboard/-/analytics-dashboard-2.7.0.tgz',
  'sha512-integrity-hash-here',
  'shasum-hash-here',
  '{"bun": ">=1.0.0", "node": ">=18.0.0"}',
  '{"build": "bun build", "test": "bun test", "dashboard:serve": "bun run serve-dashboard"}',
  datetime('now', '-2 days')
FROM packages p WHERE p.name = '@fire22-registry/analytics-dashboard';

-- Compliance Core Versions
INSERT OR IGNORE INTO package_versions (package_id, version, tarball_url, integrity, shasum, engines, scripts, published_at)
SELECT
  p.id,
  '4.3.0',
  'https://registry.fire22.com/@fire22-registry/compliance-core/-/compliance-core-4.3.0.tgz',
  'sha512-integrity-hash-here',
  'shasum-hash-here',
  '{"bun": ">=1.0.0", "node": ">=18.0.0"}',
  '{"build": "bun build", "test": "bun test", "compliance:check": "bun run compliance-scan"}',
  datetime('now', '-3 days')
FROM packages p WHERE p.name = '@fire22-registry/compliance-core';

-- ============================================================================
-- INITIAL SECURITY SCANS
-- ============================================================================

INSERT OR IGNORE INTO security_scans (package_name, package_version, scan_type, status, vulnerabilities_found, critical_count, high_count, medium_count, low_count, scan_result, scanned_at)
VALUES
  ('@fire22-registry/core-security', '3.1.0', 'SAST', 'PASSED', 0, 0, 0, 0, 0, '{"status": "clean", "recommendations": []}', datetime('now', '-1 day')),
  ('@fire22-registry/analytics-dashboard', '2.7.0', 'DAST', 'PASSED', 0, 0, 0, 0, 0, '{"status": "clean", "recommendations": []}', datetime('now', '-2 days')),
  ('@fire22-registry/compliance-core', '4.3.0', 'SCA', 'PASSED', 0, 0, 0, 0, 0, '{"status": "clean", "recommendations": []}', datetime('now', '-3 days'));

-- ============================================================================
-- INITIAL COMPLIANCE CHECKS
-- ============================================================================

INSERT OR IGNORE INTO compliance_checks (check_name, check_type, status, compliance_level, findings, recommendations, checked_at, next_check_date)
VALUES
  ('GDPR Data Protection', 'REGULATORY', 'PASSED', 'FULL', 'All data handling practices compliant', 'Continue monitoring data processing activities', datetime('now'), datetime('now', '+30 days')),
  ('PCI DSS Payment Security', 'REGULATORY', 'PASSED', 'FULL', 'Payment processing fully compliant', 'Maintain encryption standards', datetime('now'), datetime('now', '+30 days')),
  ('SOC 2 Controls', 'AUDIT', 'PASSED', 'FULL', 'All security controls implemented', 'Regular control testing required', datetime('now'), datetime('now', '+90 days'));

-- ============================================================================
-- INITIAL FEATURE FLAGS
-- ============================================================================

INSERT OR IGNORE INTO feature_flags (flag_name, flag_value, description, enabled_environments, created_at)
VALUES
  ('advanced-analytics', 0, 'Enable advanced analytics features', 'development,staging', datetime('now')),
  ('real-time-updates', 1, 'Enable real-time data updates', 'development,staging,enterprise', datetime('now')),
  ('experimental-ui', 0, 'Enable experimental UI features', 'development', datetime('now')),
  ('enterprise-security', 1, 'Enable enterprise security features', 'staging,enterprise,production', datetime('now')),
  ('performance-monitoring', 1, 'Enable detailed performance monitoring', 'development,staging,enterprise', datetime('now'));

-- ============================================================================
-- INITIAL CONFIGURATION SETTINGS
-- ============================================================================

INSERT OR IGNORE INTO config_settings (setting_key, setting_value, setting_type, description, updated_at)
VALUES
  ('registry.max_package_size', '100MB', 'string', 'Maximum allowed package size', datetime('now')),
  ('registry.retention_period', '365', 'number', 'Package retention period in days', datetime('now')),
  ('security.session_timeout', '28800', 'number', 'Session timeout in seconds (8 hours)', datetime('now')),
  ('monitoring.metrics_retention', '90', 'number', 'Metrics retention period in days', datetime('now')),
  ('compliance.audit_retention', '2555', 'number', 'Audit log retention period in days (7 years)', datetime('now'));

-- ============================================================================
-- INITIAL SYSTEM HEALTH RECORDS
-- ============================================================================

INSERT OR IGNORE INTO system_health (service_name, status, response_time_ms, checked_at)
VALUES
  ('database', 'healthy', 5, datetime('now')),
  ('registry-api', 'healthy', 15, datetime('now')),
  ('security-service', 'healthy', 8, datetime('now')),
  ('monitoring-service', 'healthy', 12, datetime('now'));

-- ============================================================================
-- INITIAL AUDIT LOG ENTRIES
-- ============================================================================

INSERT OR IGNORE INTO audit_log (action, entity_type, entity_id, user_agent, ip_address, timestamp)
VALUES
  ('SYSTEM_STARTUP', 'system', 'registry', 'Fantasy42-Registry/5.1.0', '127.0.0.1', datetime('now')),
  ('DATABASE_INIT', 'database', 'main', 'Fantasy42-Registry/5.1.0', '127.0.0.1', datetime('now')),
  ('SECURITY_INIT', 'security', 'core', 'Fantasy42-Registry/5.1.0', '127.0.0.1', datetime('now'));
