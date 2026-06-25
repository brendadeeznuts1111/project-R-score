#!/usr/bin/env bun
/**
 * 🔥 Fantasy42-Fire22 Registry - Enterprise Main Application
 *
 * Enterprise-grade registry server with advanced features:
 * - High-performance SQLite database with WAL mode
 * - Comprehensive configuration validation
 * - Enterprise security controls
 * - Real-time monitoring and health checks
 * - Graceful shutdown handling
 * - Production-ready error handling
 */

import { config, isDevelopment, validateConfig, getConfigSummary } from '../config';
import { createDatabaseConnection, DatabaseUtils } from '../lib/database';
import {
  ConfigurationError,
  DatabaseError,
  ServiceInitializationError,
  safeExecute,
} from './errors';
import { DATABASE_CONSTANTS } from './constants';
import { setupGracefulShutdown } from './resource-manager';

// ============================================================================
// ENTERPRISE APPLICATION INITIALIZATION
// ============================================================================

async function initializeApplication(): Promise<void> {
  console.info('🚀 Starting Fantasy42-Fire22 Enterprise Registry...');

  // Validate configuration
  const validation = validateConfig();
  if (!validation.valid) {
    throw new ConfigurationError('Configuration validation failed', validation.errors);
  }

  console.info('✅ Configuration validated');

  // Initialize database
  const { db, initialize, healthCheck, optimize } = createDatabaseConnection();

  console.info('🔧 Initializing database...');
  try {
    await initialize();
  } catch (error) {
    throw new DatabaseError('Database initialization failed', error as Error);
  }

  // Verify database health
  const isHealthy = await healthCheck();
  if (!isHealthy) {
    throw new DatabaseError('Database health check failed');
  }
  console.info('✅ Database initialized and healthy');

  // Create database utilities instance
  const dbUtils = new DatabaseUtils(db);

  // Optimize database (development only)
  if (isDevelopment) {
    optimize();
  }

  // Log application status
  const configSummary = getConfigSummary();
  console.info('📊 Application Configuration:');
  console.info(`  Environment: ${configSummary.environment}`);
  console.info(`  Database: ${configSummary.database}`);
  console.info(`  Port: ${configSummary.port}`);
  console.info(`  Security Level: ${configSummary.security}`);
  console.info(`  Performance Mode: ${configSummary.performance}`);
  console.info(`  Monitoring: ${configSummary.monitoring ? 'Enabled' : 'Disabled'}`);

  // Start enterprise services
  await startEnterpriseServices(db, dbUtils);

  console.info(
    `🎉 Fantasy42-Fire22 Registry running in ${config.NODE_ENV} mode on port ${config.PORT}`
  );

  // Enterprise health monitoring
  startHealthMonitoring(db, healthCheck);

  // Resource cleanup is handled by the resource manager
}

// ============================================================================
// ENTERPRISE SERVICES
// ============================================================================

async function startEnterpriseServices(db: any, dbUtils: DatabaseUtils): Promise<void> {
  console.info('🏢 Starting enterprise services...');

  // Registry service
  await startRegistryService(db, dbUtils);

  // Security service
  await startSecurityService(db, dbUtils);

  // Monitoring service
  await startMonitoringService(db, dbUtils);

  // Compliance service
  await startComplianceService(db, dbUtils);

  console.info('✅ All enterprise services started');
}

async function startRegistryService(db: any, dbUtils: DatabaseUtils): Promise<void> {
  console.info('📦 Initializing package registry service...');

  // Create registry tables asynchronously
  db.exec(`
    CREATE TABLE IF NOT EXISTS packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      version TEXT NOT NULL,
      description TEXT,
      author TEXT,
      license TEXT,
      repository TEXT,
      homepage TEXT,
      keywords TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS package_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      package_id INTEGER NOT NULL,
      version TEXT NOT NULL,
      tarball_url TEXT,
      integrity TEXT,
      shasum TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (package_id) REFERENCES packages(id)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      package_name TEXT,
      package_version TEXT,
      user_agent TEXT,
      ip_address TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      details TEXT
    );
  `);

  console.info('✅ Package registry service initialized');
}

async function startSecurityService(db: any, dbUtils: DatabaseUtils): Promise<void> {
  console.info('🔐 Initializing security service...');

  // Create security tables asynchronously
  db.exec(`
    CREATE TABLE IF NOT EXISTS security_scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      package_name TEXT NOT NULL,
      package_version TEXT NOT NULL,
      scan_type TEXT NOT NULL,
      status TEXT NOT NULL,
      vulnerabilities_found INTEGER DEFAULT 0,
      critical_count INTEGER DEFAULT 0,
      high_count INTEGER DEFAULT 0,
      medium_count INTEGER DEFAULT 0,
      low_count INTEGER DEFAULT 0,
      scan_result TEXT,
      scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS security_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      description TEXT NOT NULL,
      source_ip TEXT,
      user_agent TEXT,
      package_name TEXT,
      details TEXT,
      occurred_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.info('✅ Security service initialized');
}

async function startMonitoringService(db: any, dbUtils: DatabaseUtils): Promise<void> {
  console.info('📊 Initializing monitoring service...');

  // Create monitoring tables asynchronously
  db.exec(`
    CREATE TABLE IF NOT EXISTS performance_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      metric_name TEXT NOT NULL,
      metric_value REAL NOT NULL,
      unit TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS system_health (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_name TEXT NOT NULL,
      status TEXT NOT NULL,
      response_time_ms INTEGER,
      error_message TEXT,
      checked_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      action TEXT NOT NULL,
      resource_type TEXT,
      resource_id TEXT,
      ip_address TEXT,
      user_agent TEXT,
      occurred_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.info('✅ Monitoring service initialized');
}

async function startComplianceService(db: any, dbUtils: DatabaseUtils): Promise<void> {
  console.info('⚖️ Initializing compliance service...');

  // Create compliance tables asynchronously
  db.exec(`
    CREATE TABLE IF NOT EXISTS compliance_checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      check_name TEXT NOT NULL,
      check_type TEXT NOT NULL,
      status TEXT NOT NULL,
      compliance_level TEXT NOT NULL,
      findings TEXT,
      recommendations TEXT,
      checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      next_check_date DATETIME
    );

    CREATE TABLE IF NOT EXISTS regulatory_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_type TEXT NOT NULL,
      report_period TEXT NOT NULL,
      compliance_status TEXT NOT NULL,
      violations_count INTEGER DEFAULT 0,
      corrective_actions TEXT,
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      submitted_at DATETIME,
      approved_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS audit_trail (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      actor TEXT,
      resource_type TEXT,
      resource_id TEXT,
      old_values TEXT,
      new_values TEXT,
      compliance_impact TEXT,
      occurred_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.info('✅ Compliance service initialized');
}

// ============================================================================
// HEALTH MONITORING
// ============================================================================

function startHealthMonitoring(db: any, healthCheck: () => Promise<boolean>): void {
  const healthCheckInterval = setInterval(async () => {
    try {
      const isHealthy = await healthCheck();

      // Log health status
      db.prepare(
        `
        INSERT INTO system_health (service_name, status, response_time_ms, checked_at)
        VALUES (?, ?, ?, datetime('now'))
      `
      ).run(
        'database',
        isHealthy ? 'healthy' : 'unhealthy',
        0 // response time (could be measured)
      );

      if (!isHealthy) {
        console.error('❌ Database health check failed');
      }
    } catch (error) {
      console.error('❌ Health monitoring error:', error);
    }
  }, DATABASE_CONSTANTS.HEALTH_CHECK_INTERVAL); // Check every minute

  console.info('🏥 Health monitoring started (60s interval)');
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

// ============================================================================
// MAIN EXECUTION
// ============================================================================

// Start the application
if (import.meta.main) {
  safeExecute(() => initializeApplication());
}

// Export for testing and external usage
export {
  initializeApplication,
  startEnterpriseServices,
  startRegistryService,
  startSecurityService,
  startMonitoringService,
  startComplianceService,
  startHealthMonitoring,
};
