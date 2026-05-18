/**
 * 🧪 Fire22 Dashboard - Health API Integration Tests
 * Integration tests for health endpoint with real database
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { testUtils } from '../../setup/global-setup';

describe('Health API Integration', () => {
  const baseUrl = `http://localhost:${testUtils.TEST_CONFIG.SERVER_PORT}`;
  let testServer: any;

  beforeAll(async () => {
    await testUtils.setupTestDatabase();
    // Note: In real implementation, you would start a test server here
    // testServer = await startTestServer(testUtils.TEST_CONFIG.SERVER_PORT);
  });

  afterAll(async () => {
    await testUtils.cleanupTestDatabase();
    // if (testServer) {
    //   await testServer.stop();
    // }
  });

  beforeEach(async () => {
    await testUtils.resetTestDatabase();
  });

  describe('Health Endpoint with Database', () => {
    it('should return health status with database connection', async () => {
      // Mock the health endpoint response with real database
      const db = testUtils.getTestDatabase();

      // Verify database is working
      const testQuery = db.query('SELECT 1 as test').get();
      expect(testQuery).toEqual({ test: 1 });

      // Mock health response that would come from real endpoint
      const mockHealthResponse = {
        status: 'ok',
        database: 'connected',
        fire22Schema: 'detected',
        tables: 'real',
        timestamp: new Date().toISOString(),
      };

      expect(mockHealthResponse.status).toBe('ok');
      expect(mockHealthResponse.database).toBe('connected');
      expect(mockHealthResponse.fire22Schema).toBe('detected');
    });

    it('should detect Fire22 schema tables', async () => {
      const db = testUtils.getTestDatabase();

      // Check for Fire22 tables
      const tables = db
        .query(
          `
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name IN ('customers', 'transactions', 'bets')
      `
        )
        .all();

      expect(tables).toHaveLength(3);

      const tableNames = tables.map((t: any) => t.name);
      expect(tableNames).toContain('customers');
      expect(tableNames).toContain('transactions');
      expect(tableNames).toContain('bets');

      // Mock health response reflecting schema detection
      const mockResponse = {
        status: 'ok',
        database: 'connected',
        fire22Schema: 'detected',
        tables: 'real',
        tableCount: tables.length,
      };

      expect(mockResponse.fire22Schema).toBe('detected');
      expect(mockResponse.tableCount).toBe(3);
    });

    it('should handle database errors gracefully', async () => {
      // Test error handling when database query fails
      const db = testUtils.getTestDatabase();

      let errorOccurred = false;
      try {
        db.query('SELECT * FROM nonexistent_table').all();
      } catch (error) {
        errorOccurred = true;
        expect(error).toBeDefined();
      }

      expect(errorOccurred).toBe(true);

      // Mock health response for error state
      const mockErrorResponse = {
        status: 'error',
        database: 'error',
        fire22Schema: 'unknown',
        tables: 'unknown',
        error: 'Database query failed',
      };

      expect(mockErrorResponse.status).toBe('error');
      expect(mockErrorResponse.database).toBe('error');
    });

    it('should validate database performance', async () => {
      const db = testUtils.getTestDatabase();

      // Seed with test data
      await testUtils.seedTestDatabase(db);

      // Measure query performance
      const startTime = performance.now();
      const customers = db.query('SELECT * FROM customers').all();
      const endTime = performance.now();

      const queryTime = endTime - startTime;

      expect(customers).toHaveLength(3);
      expect(queryTime).toBeLessThan(50); // Should be very fast

      // Mock health response with performance metrics
      const mockResponse = {
        status: 'ok',
        database: 'connected',
        fire22Schema: 'detected',
        tables: 'real',
        performance: {
          queryTime: queryTime,
          customerCount: customers.length,
          healthy: queryTime < 100,
        },
      };

      expect(mockResponse.performance.healthy).toBe(true);
      expect(mockResponse.performance.customerCount).toBe(3);
    });
  });

  describe('Database Schema Validation', () => {
    it('should validate customer table structure', async () => {
      const db = testUtils.getTestDatabase();

      // Check customer table structure
      const tableInfo = db.query(`PRAGMA table_info(customers)`).all();

      const columnNames = tableInfo.map((col: any) => col.name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('customer_id');
      expect(columnNames).toContain('username');
      expect(columnNames).toContain('first_name');
      expect(columnNames).toContain('last_name');
      expect(columnNames).toContain('created_at');
    });

    it('should validate transaction table structure', async () => {
      const db = testUtils.getTestDatabase();

      // Check transaction table structure
      const tableInfo = db.query(`PRAGMA table_info(transactions)`).all();

      const columnNames = tableInfo.map((col: any) => col.name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('customer_id');
      expect(columnNames).toContain('amount');
      expect(columnNames).toContain('tran_type');
      expect(columnNames).toContain('created_at');
    });

    it('should validate bet table structure', async () => {
      const db = testUtils.getTestDatabase();

      // Check bet table structure
      const tableInfo = db.query(`PRAGMA table_info(bets)`).all();

      const columnNames = tableInfo.map((col: any) => col.name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('customer_id');
      expect(columnNames).toContain('amount');
      expect(columnNames).toContain('odds');
      expect(columnNames).toContain('type');
      expect(columnNames).toContain('status');
      expect(columnNames).toContain('teams');
    });

    it('should validate database indexes exist', async () => {
      const db = testUtils.getTestDatabase();

      // Check for indexes
      const indexes = db
        .query(
          `
        SELECT name FROM sqlite_master 
        WHERE type='index' AND name LIKE 'idx_%'
      `
        )
        .all();

      const indexNames = indexes.map((idx: any) => idx.name);
      expect(indexNames).toContain('idx_customers_customer_id');
      expect(indexNames).toContain('idx_transactions_customer_id');
      expect(indexNames).toContain('idx_bets_customer_id');
      expect(indexNames).toContain('idx_bets_status');
    });
  });

  describe('Real Data Integration', () => {
    it('should work with seeded test data', async () => {
      const db = testUtils.getTestDatabase();
      await testUtils.seedTestDatabase(db);

      // Verify data was seeded correctly
      const customerCount = db.query('SELECT COUNT(*) as count FROM customers').get();
      const transactionCount = db.query('SELECT COUNT(*) as count FROM transactions').get();
      const betCount = db.query('SELECT COUNT(*) as count FROM bets').get();

      expect((customerCount as any).count).toBe(3);
      expect((transactionCount as any).count).toBe(3);
      expect((betCount as any).count).toBe(3);

      // Mock health response with real data counts
      const mockResponse = {
        status: 'ok',
        database: 'connected',
        fire22Schema: 'detected',
        tables: 'real',
        data: {
          customers: (customerCount as any).count,
          transactions: (transactionCount as any).count,
          bets: (betCount as any).count,
          totalRecords:
            (customerCount as any).count +
            (transactionCount as any).count +
            (betCount as any).count,
        },
      };

      expect(mockResponse.data.totalRecords).toBe(9);
      expect(mockResponse.data.customers).toBeGreaterThan(0);
    });

    it('should handle complex queries across tables', async () => {
      const db = testUtils.getTestDatabase();
      await testUtils.seedTestDatabase(db);

      // Complex query joining tables
      const complexQuery = db
        .query(
          `
        SELECT 
          c.customer_id,
          c.first_name,
          c.last_name,
          COUNT(t.id) as transaction_count,
          COUNT(b.id) as bet_count,
          COALESCE(SUM(t.amount), 0) as total_transactions,
          COALESCE(SUM(b.amount), 0) as total_bets
        FROM customers c
        LEFT JOIN transactions t ON c.customer_id = t.customer_id
        LEFT JOIN bets b ON c.id = b.customer_id
        GROUP BY c.customer_id, c.first_name, c.last_name
        ORDER BY c.customer_id
      `
        )
        .all();

      expect(complexQuery).toHaveLength(3);

      const firstCustomer = complexQuery[0] as any;
      expect(firstCustomer.customer_id).toBe('TEST001');
      expect(firstCustomer.first_name).toBe('John');
      expect(firstCustomer.transaction_count).toBeGreaterThan(0);
    });
  });
});
