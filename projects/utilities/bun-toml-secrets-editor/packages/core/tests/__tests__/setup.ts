// __tests__/setup.ts
// Test setup and configuration for Bun test runner

import { Database } from "bun:sqlite";
import { afterAll, beforeAll } from "bun:test";
import { metrics } from "../utils/metrics";
import { clearTomlCache } from "../utils/toml-utils";
import { tracer } from "../utils/tracing";

// Global test database path
export const TEST_DB_PATH = ":memory:";

// Clean up before and after tests
beforeAll(() => {
	// Clear caches
	clearTomlCache();
	metrics.reset();
	tracer.clear();
});

afterAll(() => {
	// Final cleanup
	clearTomlCache();
	metrics.reset();
	tracer.clear();
});

// Helper to create a test database
export function createTestDatabase(): Database {
	const db = new Database(":memory:");

	// Initialize schema
	db.exec(`
    CREATE TABLE IF NOT EXISTS secrets (
      crc32_hash INTEGER PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      value TEXT,
      classification TEXT,
      is_dangerous INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    );
  `);

	db.exec(`
    CREATE TABLE IF NOT EXISTS patterns (
      crc32_hash INTEGER PRIMARY KEY,
      pattern TEXT UNIQUE NOT NULL,
      key_path TEXT,
      env_vars TEXT,
      is_dynamic INTEGER DEFAULT 0,
      risk_level TEXT DEFAULT 'low',
      violation_count INTEGER DEFAULT 0,
      exec_ns INTEGER DEFAULT 0,
      secrets_count INTEGER DEFAULT 0,
      file_path TEXT,
      created_at INTEGER
    );
  `);

	db.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      action TEXT NOT NULL,
      file_path TEXT,
      original_hash TEXT,
      optimized_hash TEXT,
      secrets_count INTEGER DEFAULT 0,
      risk_score INTEGER DEFAULT 0,
      changes TEXT,
      patterns_count INTEGER DEFAULT 0,
      exec_time_ns INTEGER DEFAULT 0
    );
  `);

	db.exec(`
    CREATE TABLE IF NOT EXISTS lifecycles (
      secret_name TEXT PRIMARY KEY,
      created INTEGER NOT NULL,
      last_rotated INTEGER NOT NULL,
      expires_at INTEGER,
      rotation_policy TEXT NOT NULL,
      rotation_interval_days INTEGER,
      last_used INTEGER,
      usage_count INTEGER DEFAULT 0,
      status TEXT NOT NULL,
      policy_type TEXT
    );
  `);

	return db;
}

// Helper to create test TOML content
export function createTestToml(): string {
	return `[database]
host = "\${DB_HOST:-localhost}"
password = "\${DB_PASSWORD}"

[api]
key = "\${API_KEY}"
url = "\${API_URL:-https://api.example.com}"
`;
}
