import { test, expect, beforeAll, afterAll } from 'bun:test';
import { D1Database } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import { migrate } from 'drizzle-orm/d1/migrator';
import * as schema from '../src/db/schema';
import { sql, eq } from 'drizzle-orm';
import Database from 'better-sqlite3'; // Moved to top

// Mock the D1 database for testing
class MockD1Database {
  private db: any; // Using 'any' for simplicity in mocking better-sqlite3

  constructor() {
    // Use better-sqlite3 for in-memory testing
    this.db = new Database(':memory:');
  }

  prepare(query: string) {
    return this.db.prepare(query);
  }

  dump() {
    // This is a placeholder. In a real D1, this would dump the database.
    // For better-sqlite3, you might return a serialized version or just acknowledge.
    return [];
  }

  batch(statements: any[]) {
    const results = [];
    this.db.transaction(() => {
      for (const stmt of statements) {
        results.push(this.db.prepare(stmt.sql).run(stmt.params));
      }
    })();
    return results;
  }

  exec(query: string) {
    this.db.exec(query);
  }
}

let d1: D1Database;
let db: ReturnType<typeof drizzle>;

beforeAll(async () => {
  // Initialize the mock D1 database
  d1 = new MockD1Database() as unknown as D1Database;
  db = drizzle(d1, { schema });

  // Apply migrations
  await migrate(db, { migrationsFolder: './drizzle' });
});

afterAll(() => {
  // Clean up if necessary, e.g., close the in-memory database
  // For better-sqlite3, you might call db.close() if it were a persistent file.
});

test('migrations applied successfully', async () => {
  // Verify that tables exist after migration
  const tables = await db.all(sql`SELECT name FROM sqlite_master WHERE type='table';`);
  const tableNames = tables.map((row: any) => row.name);

  expect(tableNames).toContain('transactions');
  expect(tableNames).toContain('customers');
  expect(tableNames).toContain('bets');
});

test('can insert and retrieve data', async () => {
  // Insert a customer
  await db.insert(schema.customers).values({
    customerId: 'TEST001',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    login: 'testuser',
  });

  // Retrieve the customer
  const insertedCustomer = await db
    .select()
    .from(schema.customers)
    .where(eq(schema.customers.customerId, 'TEST001'))
    .get();
  expect(insertedCustomer).toBeDefined();
  expect(insertedCustomer?.username).toBe('testuser');

  // Insert a transaction
  await db.insert(schema.transactions).values({
    customerId: 'TEST001',
    amount: 100.0,
    tranCode: 'D',
    tranType: 'Deposit',
    documentNumber: 'DOC001',
    enteredBy: 'test',
    gradeNum: 1,
    login: 'testuser',
    shortDesc: 'Test Deposit',
  });

  // Retrieve the transaction
  const insertedTransaction = await db
    .select()
    .from(schema.transactions)
    .where(eq(schema.transactions.documentNumber, 'DOC001'))
    .get();
  expect(insertedTransaction).toBeDefined();
  expect(insertedTransaction?.amount).toBe(100.0);
});
