#!/usr/bin/env bun

import { Database } from "bun:sqlite";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

/**
 * Initialize Surgical Precision Platform databases
 * Creates all necessary database files and tables for the platform
 */

const setupDatabases = () => {
  console.log("🗄️ Initializing Surgical Precision Platform databases...");

  // Ensure database directory exists
  const dbDir = "data/databases";
  mkdirSync(dbDir, { recursive: true });

  // Initialize main platform database
  const platformDb = new Database(join(dbDir, "platform.db"));

  // Create operations table
  platformDb.run(`
    CREATE TABLE IF NOT EXISTS operations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    )
  `);

  // Create performance metrics table
  platformDb.run(`
    CREATE TABLE IF NOT EXISTS performance_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operation_id INTEGER,
      metric_name TEXT NOT NULL,
      metric_value REAL NOT NULL,
      unit TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (operation_id) REFERENCES operations(id)
    )
  `);

  // Create team coordination table
  platformDb.run(`
    CREATE TABLE IF NOT EXISTS team_coordination (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_member TEXT NOT NULL,
      task_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    )
  `);

  // Create audit trail table
  platformDb.run(`
    CREATE TABLE IF NOT EXISTS audit_trail (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operation_id INTEGER,
      action TEXT NOT NULL,
      actor TEXT NOT NULL,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (operation_id) REFERENCES operations(id)
    )
  `);

  console.log("✅ Platform database initialized");

  // Initialize component coordination database
  const coordinationDb = new Database(join(dbDir, "component-coordination.db"));

  coordinationDb.run(`
    CREATE TABLE IF NOT EXISTS components (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'inactive',
      health_status TEXT DEFAULT 'unknown',
      last_heartbeat DATETIME,
      metadata TEXT
    )
  `);

  coordinationDb.run(`
    CREATE TABLE IF NOT EXISTS component_dependencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      component_id INTEGER,
      depends_on INTEGER,
      dependency_type TEXT NOT NULL,
      FOREIGN KEY (component_id) REFERENCES components(id),
      FOREIGN KEY (depends_on) REFERENCES components(id)
    )
  `);

  console.log("✅ Component coordination database initialized");

  // Initialize test coordination database
  const testDb = new Database(join(dbDir, "test-coordination.db"));

  testDb.run(`
    CREATE TABLE IF NOT EXISTS test_suites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    )
  `);

  testDb.run(`
    CREATE TABLE IF NOT EXISTS test_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      suite_id INTEGER,
      test_name TEXT NOT NULL,
      status TEXT NOT NULL,
      duration_ms INTEGER,
      error_message TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (suite_id) REFERENCES test_suites(id)
    )
  `);

  console.log("✅ Test coordination database initialized");

  // Create database initialization script for reference
  const initScript = `
-- Surgical Precision Platform Database Initialization
-- Generated on: ${new Date().toISOString()}

-- Main Platform Database (platform.db)
-- Tables: operations, performance_metrics, team_coordination, audit_trail

-- Component Coordination Database (component-coordination.db)
-- Tables: components, component_dependencies

-- Test Coordination Database (test-coordination.db)
-- Tables: test_suites, test_results

-- Usage Examples:
-- INSERT INTO operations (type, status, metadata) VALUES ('arbitrage', 'pending', '{"risk_level": "low"}');
-- INSERT INTO performance_metrics (operation_id, metric_name, metric_value, unit) VALUES (1, 'execution_time', 45.2, 'ms');
-- INSERT INTO team_coordination (team_member, task_type, status) VALUES ('alice', 'architecture', 'active');
`;

  writeFileSync(join(dbDir, "init.sql"), initScript);

  // Close all database connections
  platformDb.close();
  coordinationDb.close();
  testDb.close();

  console.log("🎉 All databases initialized successfully!");
  console.log(`📍 Database location: ${dbDir}/`);
  console.log("📋 Available databases:");
  console.log("   - platform.db (Main operations and metrics)");
  console.log("   - component-coordination.db (Service orchestration)");
  console.log("   - test-coordination.db (Testing framework)");
};

// Run database setup
if (import.meta.main) {
  try {
    setupDatabases();
    process.exit(0);
  } catch (error) {
    console.error("❌ Database setup failed:", error);
    process.exit(1);
  }
}

export { setupDatabases };
