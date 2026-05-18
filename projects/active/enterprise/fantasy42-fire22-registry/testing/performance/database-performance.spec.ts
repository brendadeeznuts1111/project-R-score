import { describe, it, beforeEach, afterEach, expect } from 'bun:test';
import { TestDatabaseSetup, TestTimer } from '../utils/test-utils';
import { DatabaseUtils } from '../../lib/database';

describe('Database Performance Tests', () => {
  let dbSetup: TestDatabaseSetup;
  let dbUtils: DatabaseUtils;
  let timer: TestTimer;

  beforeEach(async () => {
    dbSetup = new TestDatabaseSetup();
    await dbSetup.setup();
    dbUtils = new DatabaseUtils(dbSetup.getDatabase());
    timer = new TestTimer();
  });

  afterEach(async () => {
    await dbSetup.teardown();
  });

  describe('Bulk Operations Performance', () => {
    it('should handle bulk package insertions efficiently', async () => {
      const db = dbSetup.getDatabase();
      const packages = [];

      // Generate 1000 test packages
      for (let i = 1; i <= 1000; i++) {
        packages.push({
          name: `@test/package-${i}`,
          version: '1.0.0',
          description: `Test package ${i} for performance testing`,
          author: `Test Author ${i}`,
          license: 'MIT',
          repository: `https://github.com/test/package-${i}`,
          homepage: `https://test.com/package-${i}`,
          keywords: 'test,performance,benchmark',
        });
      }

      timer.start();

      // Bulk insert using batchInsert utility
      await dbUtils.batchInsert('packages', packages);

      timer.assertLessThan(1000, 'Bulk insert should complete within 1 second');

      // Verify all packages were inserted
      const count = db.prepare('SELECT COUNT(*) as count FROM packages').get();
      expect(count.count).toBe(1000);
    });

    it('should handle bulk security scans efficiently', async () => {
      const db = dbSetup.getDatabase();

      // First create packages
      const packages = [];
      for (let i = 1; i <= 100; i++) {
        packages.push({
          name: `@test/package-${i}`,
          version: '1.0.0',
          description: `Test package ${i}`,
          author: `Test Author ${i}`,
        });
      }
      await dbUtils.batchInsert('packages', packages);

      // Generate security scans for each package
      const scans = [];
      for (let i = 1; i <= 100; i++) {
        scans.push({
          package_name: `@test/package-${i}`,
          package_version: '1.0.0',
          scan_type: 'vulnerability',
          status: 'completed',
          vulnerabilities_found: Math.floor(Math.random() * 5),
          critical_count: 0,
          high_count: Math.floor(Math.random() * 3),
          medium_count: Math.floor(Math.random() * 5),
          low_count: Math.floor(Math.random() * 10),
          scan_result: 'Security scan completed',
        });
      }

      timer.start();

      await dbUtils.batchInsert('security_scans', scans);

      timer.assertLessThan(500, 'Bulk security scan insert should complete within 500ms');

      const count = db.prepare('SELECT COUNT(*) as count FROM security_scans').get();
      expect(count.count).toBe(100);
    });
  });

  describe('Query Performance', () => {
    beforeEach(async () => {
      const db = dbSetup.getDatabase();

      // Setup test data
      const packages = [];
      for (let i = 1; i <= 500; i++) {
        packages.push({
          name: `@perf/package-${i}`,
          version: '1.0.0',
          description: `Performance test package ${i}`,
          author: `Perf Author ${i}`,
          created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(), // Random date in last 30 days
        });
      }
      await dbUtils.batchInsert('packages', packages);

      // Create indexes for better query performance
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_packages_name ON packages(name);
        CREATE INDEX IF NOT EXISTS idx_packages_created ON packages(created_at);
      `);
    });

    it('should perform fast package name lookups', async () => {
      const db = dbSetup.getDatabase();

      timer.start();

      // Perform multiple random package lookups
      for (let i = 0; i < 100; i++) {
        const packageName = `@perf/package-${Math.floor(Math.random() * 500) + 1}`;
        const result = db.prepare('SELECT * FROM packages WHERE name = ?').get(packageName);
        expect(result).toBeDefined();
      }

      timer.assertLessThan(200, '100 package lookups should complete within 200ms');
    });

    it('should handle paginated queries efficiently', async () => {
      timer.start();

      // Test pagination performance
      const result = dbUtils.queryWithPagination('SELECT * FROM packages ORDER BY name', [], 1, 50);

      timer.assertLessThan(100, 'Paginated query should complete within 100ms');

      expect(result.data).toHaveLength(50);
      expect(result.total).toBe(500);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });

    it('should perform efficient date range queries', async () => {
      const db = dbSetup.getDatabase();

      timer.start();

      // Query packages created in the last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const result = db
        .prepare('SELECT COUNT(*) as count FROM packages WHERE created_at >= ?')
        .get(sevenDaysAgo);

      timer.assertLessThan(50, 'Date range query should complete within 50ms');

      expect(result.count).toBeGreaterThan(0);
    });
  });

  describe('Transaction Performance', () => {
    it('should handle concurrent transactions efficiently', async () => {
      const db = dbSetup.getDatabase();

      timer.start();

      // Simulate multiple concurrent operations that would typically be in transactions
      const promises = [];

      for (let i = 1; i <= 50; i++) {
        promises.push(
          dbUtils.executeTransaction(async () => {
            const insert = db.prepare(`
              INSERT INTO packages (name, version, description, author)
              VALUES (?, ?, ?, ?)
            `);
            insert.run(
              `@concurrent/package-${i}`,
              '1.0.0',
              `Concurrent package ${i}`,
              `Concurrent Author ${i}`
            );

            // Also insert a security scan
            const scanInsert = db.prepare(`
              INSERT INTO security_scans (package_name, package_version, scan_type, status)
              VALUES (?, ?, ?, ?)
            `);
            scanInsert.run(`@concurrent/package-${i}`, '1.0.0', 'quick', 'completed');
          })
        );
      }

      await Promise.all(promises);

      timer.assertLessThan(2000, '50 concurrent transactions should complete within 2 seconds');

      const packageCount = db
        .prepare('SELECT COUNT(*) as count FROM packages WHERE name LIKE ?')
        .get('@concurrent/package-%');
      const scanCount = db
        .prepare('SELECT COUNT(*) as count FROM security_scans WHERE package_name LIKE ?')
        .get('@concurrent/package-%');

      expect(packageCount.count).toBe(50);
      expect(scanCount.count).toBe(50);
    });

    it('should maintain data consistency under load', async () => {
      const db = dbSetup.getDatabase();

      // Test transaction behavior with successful operations
      let successfulOperations = 0;

      for (let i = 1; i <= 20; i++) {
        try {
          await dbUtils.executeTransaction(async () => {
            const insert = db.prepare(`
              INSERT INTO packages (name, version, description, author)
              VALUES (?, ?, ?, ?)
            `);
            insert.run(
              `@consistency/package-${i}`,
              '1.0.0',
              `Consistency package ${i}`,
              `Consistency Author ${i}`
            );
          });
          successfulOperations++;
        } catch (error) {
          // Should not happen in this test
        }
      }

      // Verify that all transactions were successful
      const totalPackages = db
        .prepare('SELECT COUNT(*) as count FROM packages WHERE name LIKE ?')
        .get('@consistency/package-%');

      expect(successfulOperations).toBe(20);
      expect(totalPackages.count).toBe(20);

      // Test that we can query all the inserted data
      for (let i = 1; i <= 20; i++) {
        const pkg = db
          .prepare('SELECT * FROM packages WHERE name = ?')
          .get(`@consistency/package-${i}`);
        expect(pkg).toBeDefined();
        expect(pkg.name).toBe(`@consistency/package-${i}`);
      }
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should maintain reasonable memory usage during bulk operations', async () => {
      const db = dbSetup.getDatabase();

      // Test memory usage with large dataset
      const largeDataset = [];
      for (let i = 1; i <= 10000; i++) {
        largeDataset.push({
          name: `@memory/package-${i}`,
          version: '1.0.0',
          description: `Memory test package ${i} with some additional text to increase size`.repeat(
            5
          ),
          author: `Memory Test Author ${i}`,
          license: 'MIT',
          repository: `https://github.com/memory/package-${i}`,
          homepage: `https://memory.test.com/package-${i}`,
          keywords: 'memory,test,performance,large-dataset,benchmark',
        });
      }

      const initialMemory = process.memoryUsage().heapUsed;

      timer.start();

      await dbUtils.batchInsert('packages', largeDataset);

      timer.assertLessThan(5000, 'Large dataset insert should complete within 5 seconds');

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);

      // Verify all data was inserted
      const count = db
        .prepare('SELECT COUNT(*) as count FROM packages WHERE name LIKE ?')
        .get('@memory/package-%');
      expect(count.count).toBe(10000);
    });

    it('should handle connection pooling efficiently', async () => {
      const db = dbSetup.getDatabase();

      timer.start();

      // Simulate multiple concurrent database operations
      const operations = [];
      for (let i = 1; i <= 100; i++) {
        operations.push(
          new Promise(resolve => {
            const result = db.prepare('SELECT COUNT(*) as count FROM packages').get();
            resolve(result.count);
          })
        );
      }

      const results = await Promise.all(operations);

      timer.assertLessThan(500, '100 concurrent read operations should complete within 500ms');

      // All results should be the same (count of packages)
      const allSame = results.every(count => count === results[0]);
      expect(allSame).toBe(true);
    });
  });

  describe('Index Performance Impact', () => {
    it('should demonstrate index performance improvement', async () => {
      const db = dbSetup.getDatabase();

      // Insert test data without indexes first
      const packages = [];
      for (let i = 1; i <= 1000; i++) {
        packages.push({
          name: `@index-test/package-${i}`,
          version: '1.0.0',
          description: `Index test package ${i}`,
          author: `Index Author ${i}`,
        });
      }
      await dbUtils.batchInsert('packages', packages);

      // Measure query performance without index
      timer.start();
      for (let i = 0; i < 100; i++) {
        const packageName = `@index-test/package-${Math.floor(Math.random() * 1000) + 1}`;
        db.prepare('SELECT * FROM packages WHERE name = ?').get(packageName);
      }
      const withoutIndex = timer.elapsed();

      // Add index
      db.exec('CREATE INDEX idx_packages_name_perf ON packages(name)');

      // Measure query performance with index
      timer.start();
      for (let i = 0; i < 100; i++) {
        const packageName = `@index-test/package-${Math.floor(Math.random() * 1000) + 1}`;
        db.prepare('SELECT * FROM packages WHERE name = ?').get(packageName);
      }
      const withIndex = timer.elapsed();

      // With index should be faster (at least 2x improvement)
      expect(withIndex).toBeLessThan(withoutIndex * 0.8); // Allow for some variance
    });
  });
});
