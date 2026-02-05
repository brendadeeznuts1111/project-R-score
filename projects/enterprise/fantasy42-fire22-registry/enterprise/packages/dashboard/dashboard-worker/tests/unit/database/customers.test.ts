/**
 * 🧪 Fire22 Dashboard - Customer Database Unit Tests
 * Tests for customer database operations
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { testUtils } from '../../setup/global-setup';
import type { Database } from 'bun:sqlite';

describe('Customer Database Operations', () => {
  let db: Database;

  beforeAll(async () => {
    db = await testUtils.setupTestDatabase();
  });

  afterAll(async () => {
    await testUtils.cleanupTestDatabase();
  });

  beforeEach(async () => {
    await testUtils.resetTestDatabase();
  });

  describe('Customer Creation', () => {
    it('should create a new customer successfully', () => {
      const customerData = {
        customer_id: 'CUST001',
        username: 'testuser',
        first_name: 'John',
        last_name: 'Doe',
        login: 'CUST001',
      };

      const result = db
        .query(
          `
        INSERT INTO customers (customer_id, username, first_name, last_name, login)
        VALUES (?, ?, ?, ?, ?)
      `
        )
        .run(
          customerData.customer_id,
          customerData.username,
          customerData.first_name,
          customerData.last_name,
          customerData.login
        );

      expect(result.changes).toBe(1);
      expect(result.lastInsertRowid).toBeGreaterThan(0);
    });

    it('should enforce unique customer_id constraint', () => {
      const customerData = {
        customer_id: 'CUST001',
        username: 'testuser1',
        first_name: 'John',
        last_name: 'Doe',
      };

      // Insert first customer
      db.query(
        `
        INSERT INTO customers (customer_id, username, first_name, last_name)
        VALUES (?, ?, ?, ?)
      `
      ).run(
        customerData.customer_id,
        customerData.username,
        customerData.first_name,
        customerData.last_name
      );

      // Try to insert duplicate customer_id
      expect(() => {
        db.query(
          `
          INSERT INTO customers (customer_id, username, first_name, last_name)
          VALUES (?, ?, ?, ?)
        `
        ).run(customerData.customer_id, 'testuser2', 'Jane', 'Smith');
      }).toThrow();
    });

    it('should auto-generate created_at timestamp', () => {
      const customerData = {
        customer_id: 'CUST001',
        username: 'testuser',
        first_name: 'John',
        last_name: 'Doe',
      };

      db.query(
        `
        INSERT INTO customers (customer_id, username, first_name, last_name)
        VALUES (?, ?, ?, ?)
      `
      ).run(
        customerData.customer_id,
        customerData.username,
        customerData.first_name,
        customerData.last_name
      );

      const customer = db
        .query(
          `
        SELECT * FROM customers WHERE customer_id = ?
      `
        )
        .get(customerData.customer_id);

      expect(customer).toBeDefined();
      expect((customer as any).created_at).toBeDefined();
      expect((customer as any).created_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });
  });

  describe('Customer Retrieval', () => {
    beforeEach(async () => {
      // Seed with test data
      await testUtils.seedTestDatabase(db);
    });

    it('should retrieve customer by customer_id', () => {
      const customer = db
        .query(
          `
        SELECT * FROM customers WHERE customer_id = ?
      `
        )
        .get('TEST001');

      expect(customer).toBeDefined();
      expect((customer as any).customer_id).toBe('TEST001');
      expect((customer as any).username).toBe('testuser1');
      expect((customer as any).first_name).toBe('John');
      expect((customer as any).last_name).toBe('Doe');
    });

    it('should retrieve all customers', () => {
      const customers = db
        .query(
          `
        SELECT * FROM customers ORDER BY customer_id
      `
        )
        .all();

      expect(customers).toHaveLength(3);
      expect((customers as any[])[0].customer_id).toBe('TEST001');
      expect((customers as any[])[1].customer_id).toBe('TEST002');
      expect((customers as any[])[2].customer_id).toBe('TEST003');
    });

    it('should return null for non-existent customer', () => {
      const customer = db
        .query(
          `
        SELECT * FROM customers WHERE customer_id = ?
      `
        )
        .get('NONEXISTENT');

      expect(customer).toBeNull();
    });

    it('should search customers by name', () => {
      const customers = db
        .query(
          `
        SELECT * FROM customers 
        WHERE first_name LIKE ? OR last_name LIKE ?
        ORDER BY customer_id
      `
        )
        .all('%John%', '%John%');

      expect(customers).toHaveLength(2); // John Doe and Bob Johnson
      expect((customers as any[])[0].first_name).toBe('John');
      expect((customers as any[])[1].last_name).toBe('Johnson');
    });
  });

  describe('Customer Updates', () => {
    beforeEach(async () => {
      await testUtils.seedTestDatabase(db);
    });

    it('should update customer information', () => {
      const updateResult = db
        .query(
          `
        UPDATE customers 
        SET first_name = ?, last_name = ?
        WHERE customer_id = ?
      `
        )
        .run('Johnny', 'Doe-Updated', 'TEST001');

      expect(updateResult.changes).toBe(1);

      const updatedCustomer = db
        .query(
          `
        SELECT * FROM customers WHERE customer_id = ?
      `
        )
        .get('TEST001');

      expect((updatedCustomer as any).first_name).toBe('Johnny');
      expect((updatedCustomer as any).last_name).toBe('Doe-Updated');
    });

    it('should not update non-existent customer', () => {
      const updateResult = db
        .query(
          `
        UPDATE customers 
        SET first_name = ?
        WHERE customer_id = ?
      `
        )
        .run('NewName', 'NONEXISTENT');

      expect(updateResult.changes).toBe(0);
    });
  });

  describe('Customer Deletion', () => {
    beforeEach(async () => {
      await testUtils.seedTestDatabase(db);
    });

    it('should delete customer by customer_id', () => {
      const deleteResult = db
        .query(
          `
        DELETE FROM customers WHERE customer_id = ?
      `
        )
        .run('TEST001');

      expect(deleteResult.changes).toBe(1);

      const deletedCustomer = db
        .query(
          `
        SELECT * FROM customers WHERE customer_id = ?
      `
        )
        .get('TEST001');

      expect(deletedCustomer).toBeNull();
    });

    it('should not delete non-existent customer', () => {
      const deleteResult = db
        .query(
          `
        DELETE FROM customers WHERE customer_id = ?
      `
        )
        .run('NONEXISTENT');

      expect(deleteResult.changes).toBe(0);
    });
  });

  describe('Customer Validation', () => {
    it('should handle empty customer_id', () => {
      expect(() => {
        db.query(
          `
          INSERT INTO customers (customer_id, username, first_name, last_name)
          VALUES (?, ?, ?, ?)
        `
        ).run('', 'testuser', 'John', 'Doe');
      }).not.toThrow(); // SQLite allows empty strings, but business logic should validate
    });

    it('should handle null values appropriately', () => {
      const result = db
        .query(
          `
        INSERT INTO customers (customer_id, username, first_name, last_name)
        VALUES (?, ?, ?, ?)
      `
        )
        .run('CUST001', null, null, null);

      expect(result.changes).toBe(1);

      const customer = db
        .query(
          `
        SELECT * FROM customers WHERE customer_id = ?
      `
        )
        .get('CUST001');

      expect((customer as any).username).toBeNull();
      expect((customer as any).first_name).toBeNull();
      expect((customer as any).last_name).toBeNull();
    });
  });

  describe('Customer Indexes', () => {
    it('should use customer_id index for fast lookups', () => {
      // Seed with many customers to test index performance
      for (let i = 1; i <= 1000; i++) {
        db.query(
          `
          INSERT INTO customers (customer_id, username, first_name, last_name)
          VALUES (?, ?, ?, ?)
        `
        ).run(`CUST${i.toString().padStart(4, '0')}`, `user${i}`, `First${i}`, `Last${i}`);
      }

      const startTime = performance.now();
      const customer = db
        .query(
          `
        SELECT * FROM customers WHERE customer_id = ?
      `
        )
        .get('CUST0500');
      const endTime = performance.now();

      expect(customer).toBeDefined();
      expect((customer as any).customer_id).toBe('CUST0500');

      // Query should be fast with index (less than 10ms)
      expect(endTime - startTime).toBeLessThan(10);
    });
  });
});
