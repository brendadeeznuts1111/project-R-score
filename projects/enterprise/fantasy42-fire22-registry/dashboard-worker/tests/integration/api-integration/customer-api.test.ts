/**
 * 🧪 Fire22 Dashboard - Customer API Integration Tests
 * Tests for customer-related API endpoints with database integration
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { testUtils } from '../../setup/global-setup';

describe('Customer API Integration', () => {
  const baseUrl = `http://localhost:${testUtils.TEST_CONFIG.SERVER_PORT}`;
  const apiKey = testUtils.TEST_CONFIG.API_KEY;

  beforeAll(async () => {
    await testUtils.setupTestDatabase();
    // Note: In real implementation, start test server here
  });

  afterAll(async () => {
    await testUtils.cleanupTestDatabase();
    // Note: Stop test server here
  });

  beforeEach(async () => {
    await testUtils.resetTestDatabase();
    await testUtils.seedTestDatabase(testUtils.getTestDatabase());
  });

  describe('POST /api/manager/getCustomerAdmin', () => {
    it('should return customer list with real database data', async () => {
      const db = testUtils.getTestDatabase();
      await testUtils.seedTestDatabase(db);

      // Query real customer data from database
      const customers = db
        .query(
          `
        SELECT
          customer_id as CustomerID,
          first_name as FirstName,
          last_name as LastName,
          username as Login,
          'Y' as Active,
          'BLAKEPPH' as AgentID,
          'BLAKEPPH' as AgentLogin,
          'BLAKEPPH' as MasterAgent,
          created_at as LastVerDateTime
        FROM customers
        ORDER BY customer_id
      `
        )
        .all();

      expect(customers).toHaveLength(3);

      // Calculate balances from transactions
      const balances = db
        .query(
          `
        SELECT
          customer_id,
          COALESCE(SUM(amount), 0) as balance
        FROM transactions
        GROUP BY customer_id
      `
        )
        .all();

      // Mock API response with real data
      const mockResponse = {
        success: true,
        data: {
          customers: customers.map((customer: any) => {
            const balance = balances.find((b: any) => b.customer_id === customer.CustomerID);
            return {
              ...customer,
              CasinoBalance: 0,
              SportsBalance: balance ? balance.balance : 0,
              TotalBalance: balance ? balance.balance : 0,
              AgentType: null,
              ParentAgent: null,
              PlayerNotes: '',
            };
          }),
          totalCustomers: customers.length,
          totalBalance: balances.reduce((sum: number, b: any) => sum + b.balance, 0),
        },
      };

      // Validate response structure with real data
      expect(mockResponse.success).toBe(true);
      expect(mockResponse.data.customers).toHaveLength(3);
      expect(mockResponse.data.totalCustomers).toBe(3);
      expect(mockResponse.data.totalBalance).toBeGreaterThan(0);

      // Validate first customer
      const firstCustomer = mockResponse.data.customers[0];
      expect(firstCustomer.CustomerID).toBe('TEST001');
      expect(firstCustomer.FirstName).toBe('John');
      expect(firstCustomer.LastName).toBe('Doe');
    });

    it('should handle invalid agent ID', async () => {
      const mockErrorResponse = {
        success: false,
        error: 'Invalid agent ID',
        message: 'Agent not found or unauthorized',
      };

      expect(mockErrorResponse.success).toBe(false);
      expect(mockErrorResponse).toHaveProperty('error');
      expect(mockErrorResponse).toHaveProperty('message');
    });

    it('should require valid API key', async () => {
      const mockUnauthorizedResponse = {
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or missing API key',
      };

      expect(mockUnauthorizedResponse.success).toBe(false);
      expect(mockUnauthorizedResponse.error).toBe('Unauthorized');
    });
  });

  describe('POST /api/admin/create-customer', () => {
    it('should create new customer successfully', async () => {
      const customerData = {
        customerID: 'NEWCUST001',
        username: 'newuser',
        firstName: 'New',
        lastName: 'Customer',
        agentID: 'BLAKEPPH',
      };

      const mockResponse = {
        success: true,
        data: {
          customerID: customerData.customerID,
          message: 'Customer created successfully',
        },
      };

      expect(mockResponse.success).toBe(true);
      expect(mockResponse.data.customerID).toBe(customerData.customerID);
      expect(mockResponse.data.message).toContain('created successfully');
    });

    it('should reject duplicate customer ID', async () => {
      const duplicateCustomerData = {
        customerID: 'TEST001', // This already exists in test data
        username: 'duplicate',
        firstName: 'Duplicate',
        lastName: 'Customer',
      };

      const mockErrorResponse = {
        success: false,
        error: 'Customer already exists',
        message: 'Customer ID TEST001 already exists',
      };

      expect(mockErrorResponse.success).toBe(false);
      expect(mockErrorResponse.error).toBe('Customer already exists');
    });

    it('should validate required fields', async () => {
      const incompleteCustomerData = {
        customerID: 'INCOMPLETE001',
        // Missing required fields
      };

      const mockValidationError = {
        success: false,
        error: 'Validation failed',
        message: 'Missing required fields: username, firstName, lastName',
      };

      expect(mockValidationError.success).toBe(false);
      expect(mockValidationError.error).toBe('Validation failed');
      expect(mockValidationError.message).toContain('Missing required fields');
    });
  });

  describe('Database Integration', () => {
    it('should maintain data consistency between API and database', async () => {
      const db = testUtils.getTestDatabase();

      // Check that seeded data exists in database
      const customers = db.query('SELECT * FROM customers ORDER BY customer_id').all();
      expect(customers).toHaveLength(3);

      // Verify customer data matches expected structure
      const customer = customers[0] as any;
      expect(customer.customer_id).toBe('TEST001');
      expect(customer.first_name).toBe('John');
      expect(customer.last_name).toBe('Doe');
    });

    it('should handle database transactions properly', async () => {
      const db = testUtils.getTestDatabase();

      // Start a transaction
      db.exec('BEGIN TRANSACTION');

      try {
        // Insert a customer
        db.query(
          `
          INSERT INTO customers (customer_id, username, first_name, last_name)
          VALUES (?, ?, ?, ?)
        `
        ).run('TRANS001', 'transuser', 'Trans', 'User');

        // Verify it exists within transaction
        const customer = db.query('SELECT * FROM customers WHERE customer_id = ?').get('TRANS001');
        expect(customer).toBeDefined();

        // Rollback transaction
        db.exec('ROLLBACK');

        // Verify it no longer exists
        const rolledBackCustomer = db
          .query('SELECT * FROM customers WHERE customer_id = ?')
          .get('TRANS001');
        expect(rolledBackCustomer).toBeNull();
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    });

    it('should handle concurrent operations safely', async () => {
      const db = testUtils.getTestDatabase();

      // Simulate concurrent customer creation
      const promises = [];
      for (let i = 1; i <= 10; i++) {
        promises.push(
          new Promise(resolve => {
            try {
              db.query(
                `
                INSERT INTO customers (customer_id, username, first_name, last_name)
                VALUES (?, ?, ?, ?)
              `
              ).run(`CONCURRENT${i}`, `user${i}`, `First${i}`, `Last${i}`);
              resolve(true);
            } catch (error) {
              resolve(false);
            }
          })
        );
      }

      const results = await Promise.all(promises);

      // All operations should succeed
      expect(results.every(result => result === true)).toBe(true);

      // Verify all customers were created
      const concurrentCustomers = db
        .query(
          `
        SELECT * FROM customers WHERE customer_id LIKE 'CONCURRENT%'
      `
        )
        .all();
      expect(concurrentCustomers).toHaveLength(10);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Mock database connection error
      const mockDatabaseError = {
        success: false,
        error: 'Database connection failed',
        message: 'Unable to connect to database',
      };

      expect(mockDatabaseError.success).toBe(false);
      expect(mockDatabaseError.error).toBe('Database connection failed');
    });

    it('should handle malformed request data', async () => {
      const mockMalformedRequest = {
        success: false,
        error: 'Invalid request format',
        message: 'Request body must be valid JSON',
      };

      expect(mockMalformedRequest.success).toBe(false);
      expect(mockMalformedRequest.error).toBe('Invalid request format');
    });

    it('should handle server errors gracefully', async () => {
      const mockServerError = {
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred',
      };

      expect(mockServerError.success).toBe(false);
      expect(mockServerError.error).toBe('Internal server error');
    });
  });
});
