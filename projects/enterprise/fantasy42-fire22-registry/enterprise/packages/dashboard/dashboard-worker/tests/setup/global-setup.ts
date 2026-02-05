/**
 * 🧪 Fire22 Dashboard - Global Test Setup
 * Configures the testing environment for all test suites
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { existsSync, unlinkSync } from 'fs';
import CONSTANTS from '../../src/config/constants.js';

// Test configuration
export const TEST_CONFIG = {
  DATABASE_PATH: './test-dashboard.db',
  SERVER_PORT: 4001,
  API_KEY: 'test_key_123',
  TIMEOUT: 30000,
  DEBUG: process.env.TEST_DEBUG === 'true',
};

// Global test database instance
let testDb: Database | null = null;

/**
 * Setup test database with schema
 */
export async function setupTestDatabase(): Promise<Database> {
  // Remove existing test database
  if (existsSync(TEST_CONFIG.DATABASE_PATH)) {
    unlinkSync(TEST_CONFIG.DATABASE_PATH);
  }

  // Create new test database
  testDb = new Database(TEST_CONFIG.DATABASE_PATH);

  // Create tables
  testDb.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY,
      customer_id TEXT UNIQUE NOT NULL,
      username TEXT,
      first_name TEXT,
      last_name TEXT,
      login TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY,
      customer_id TEXT,
      amount REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      agent_id TEXT DEFAULT 'BLAKEPPH',
      tran_code TEXT,
      tran_type TEXT,
      document_number TEXT,
      entered_by TEXT,
      freeplay_balance REAL DEFAULT 0,
      freeplay_pending_balance REAL DEFAULT 0,
      freeplay_pending_count INTEGER DEFAULT 0,
      grade_num INTEGER,
      login TEXT,
      short_desc TEXT,
      tran_datetime TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bets (
      id INTEGER PRIMARY KEY,
      customer_id INTEGER REFERENCES customers(id),
      amount REAL,
      odds REAL,
      type TEXT,
      status TEXT DEFAULT 'pending',
      outcome TEXT,
      teams TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_customers_customer_id ON customers(customer_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
    CREATE INDEX IF NOT EXISTS idx_bets_customer_id ON bets(customer_id);
    CREATE INDEX IF NOT EXISTS idx_bets_status ON bets(status);
  `);

  if (TEST_CONFIG.DEBUG) {
    console.log('🗄️ Test database created:', TEST_CONFIG.DATABASE_PATH);
  }

  return testDb;
}

/**
 * Seed test database with sample data
 */
export async function seedTestDatabase(db: Database): Promise<void> {
  // Insert test customers
  const customers = [
    { customer_id: 'TEST001', username: 'testuser1', first_name: 'John', last_name: 'Doe' },
    { customer_id: 'TEST002', username: 'testuser2', first_name: 'Jane', last_name: 'Smith' },
    { customer_id: 'TEST003', username: 'testuser3', first_name: 'Bob', last_name: 'Johnson' },
  ];

  for (const customer of customers) {
    db.query(
      `
      INSERT OR IGNORE INTO customers (customer_id, username, first_name, last_name, login)
      VALUES (?, ?, ?, ?, ?)
    `
    ).run(
      customer.customer_id,
      customer.username,
      customer.first_name,
      customer.last_name,
      customer.customer_id
    );
  }

  // Insert test transactions
  const transactions = [
    { customer_id: 'TEST001', amount: 1000, tran_type: 'deposit', short_desc: 'Test deposit 1' },
    { customer_id: 'TEST002', amount: 500, tran_type: 'deposit', short_desc: 'Test deposit 2' },
    { customer_id: 'TEST003', amount: 750, tran_type: 'deposit', short_desc: 'Test deposit 3' },
  ];

  for (const transaction of transactions) {
    db.query(
      `
      INSERT OR IGNORE INTO transactions (customer_id, amount, tran_type, short_desc)
      VALUES (?, ?, ?, ?)
    `
    ).run(
      transaction.customer_id,
      transaction.amount,
      transaction.tran_type,
      transaction.short_desc
    );
  }

  // Insert test bets
  const bets = [
    {
      customer_id: 1,
      amount: 50,
      odds: 1.85,
      type: 'moneyline',
      status: 'pending',
      teams: 'Lakers vs Warriors',
    },
    {
      customer_id: 2,
      amount: 100,
      odds: 2.1,
      type: 'spread',
      status: 'won',
      teams: 'Cowboys vs Giants',
    },
    {
      customer_id: 3,
      amount: 25,
      odds: 1.95,
      type: 'total',
      status: 'pending',
      teams: 'Heat vs Celtics',
    },
  ];

  for (const bet of bets) {
    db.query(
      `
      INSERT OR IGNORE INTO bets (customer_id, amount, odds, type, status, teams)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    ).run(bet.customer_id, bet.amount, bet.odds, bet.type, bet.status, bet.teams);
  }

  if (TEST_CONFIG.DEBUG) {
    console.log('🌱 Test database seeded with sample data');
  }
}

/**
 * Clean up test database
 */
export async function cleanupTestDatabase(): Promise<void> {
  if (testDb) {
    testDb.close();
    testDb = null;
  }

  if (existsSync(TEST_CONFIG.DATABASE_PATH)) {
    unlinkSync(TEST_CONFIG.DATABASE_PATH);
  }

  if (TEST_CONFIG.DEBUG) {
    console.log('🧹 Test database cleaned up');
  }
}

/**
 * Get test database instance
 */
export function getTestDatabase(): Database {
  if (!testDb) {
    throw new Error('Test database not initialized. Call setupTestDatabase() first.');
  }
  return testDb;
}

/**
 * Reset test database (clear all data but keep schema)
 */
export async function resetTestDatabase(): Promise<void> {
  if (!testDb) {
    throw new Error('Test database not initialized');
  }

  // Clear all tables
  testDb.exec(`
    DELETE FROM bets;
    DELETE FROM transactions;
    DELETE FROM customers;
  `);

  // Reset auto-increment counters if sqlite_sequence exists
  try {
    testDb.exec(`DELETE FROM sqlite_sequence WHERE name IN ('customers', 'transactions', 'bets');`);
  } catch (error) {
    // sqlite_sequence table doesn't exist yet, which is fine
  }

  if (TEST_CONFIG.DEBUG) {
    console.log('🔄 Test database reset');
  }
}

/**
 * Global test setup - runs once before all tests
 */
export async function globalSetup(): Promise<void> {
  if (TEST_CONFIG.DEBUG) {
    console.log('🚀 Starting global test setup...');
  }

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = `file:${TEST_CONFIG.DATABASE_PATH}`;
  process.env.PORT = TEST_CONFIG.SERVER_PORT.toString();
  process.env.API_KEYS = TEST_CONFIG.API_KEY;

  if (TEST_CONFIG.DEBUG) {
    console.log('✅ Global test setup complete');
  }
}

/**
 * Global test teardown - runs once after all tests
 */
export async function globalTeardown(): Promise<void> {
  if (TEST_CONFIG.DEBUG) {
    console.log('🧹 Starting global test teardown...');
  }

  await cleanupTestDatabase();

  if (TEST_CONFIG.DEBUG) {
    console.log('✅ Global test teardown complete');
  }
}

// Export test utilities
export const testUtils = {
  setupTestDatabase,
  seedTestDatabase,
  cleanupTestDatabase,
  resetTestDatabase,
  getTestDatabase,
  TEST_CONFIG,
};

export default {
  globalSetup,
  globalTeardown,
  testUtils,
};
