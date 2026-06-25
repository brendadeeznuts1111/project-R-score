import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { createDatabaseConnection } from './database';

describe('Database Connection', () => {
  let dbConnection: any;

  beforeAll(async () => {
    // Use in-memory database for testing
    process.env.DATABASE_URL = ':memory:';
    dbConnection = createDatabaseConnection();
    await dbConnection.initialize();
  });

  afterAll(() => {
    dbConnection.close();
  });

  test('should initialize database successfully', async () => {
    const isHealthy = await dbConnection.healthCheck();
    expect(isHealthy).toBe(true);
  });

  test('should be able to execute queries', () => {
    const result = dbConnection.db.prepare('SELECT 1 as test').get();
    expect(result.test).toBe(1);
  });

  test('should have packages table', () => {
    const result = dbConnection.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='packages'")
      .get();
    expect(result).toBeDefined();
    expect(result.name).toBe('packages');
  });

  test('should have package_versions table', () => {
    const result = dbConnection.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='package_versions'")
      .get();
    expect(result).toBeDefined();
    expect(result.name).toBe('package_versions');
  });
});

describe('Configuration', () => {
  test('should load config without errors', async () => {
    // This will test that the config.ts file loads without Zod validation errors
    const { config } = await import('../config');
    expect(config).toBeDefined();
    expect(config.NODE_ENV).toBe('development');
  });
});
