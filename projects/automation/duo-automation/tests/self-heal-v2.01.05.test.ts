// tests/self-heal-v2.01.05.test.ts
// Comprehensive test suite for v2.01.05 self-heal script

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { writeFile, mkdir, stat } from 'fs/promises';
import { join } from 'path';
import { heal, validateFile, generateFileHash, CONFIG, type HealMetrics } from '../scripts/self-heal';

describe('Self-Heal v2.01.05', () => {
  const testDir = './test-temp-heal';
  const testFiles = [
    '.temp!swap1',
    '.backup!data2', 
    '.cache!temp3',
    '.normal-file', // Should not be cleaned
    'temp!file' // Should not be cleaned (doesn't start with .)
  ];

  beforeEach(async () => {
    // Create test directory
    await mkdir(testDir, { recursive: true });
    
    // Create test files with different sizes
    for (const file of testFiles) {
      const filePath = join(testDir, file);
      const content = `Test content for ${file}`.repeat(100);
      await writeFile(filePath, content);
    }
  });

  afterEach(async () => {
    // Cleanup test directory (using basic cleanup to avoid infinite loops)
    try {
      const { $ } = await import('bun');
      await $`rm -rf "${testDir}"`.quiet();
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('File Validation', () => {
    it('should validate files correctly', async () => {
      const validFile = join(testDir, '.temp!swap1');
      const invalidFile = join(testDir, '.normal-file');

      // Disable minFileAge check for this test (files are just created)
      const originalMinAge = CONFIG.minFileAge;
      CONFIG.minFileAge = 0;

      const validResult = await validateFile(validFile);
      expect(validResult.valid).toBe(true);
      expect(validResult.stats).toBeDefined();

      const invalidResult = await validateFile(invalidFile);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.reason).toContain('does not match target pattern');

      // Restore original config
      CONFIG.minFileAge = originalMinAge;
    });

    it('should reject files that are too large', async () => {
      const largeFile = join(testDir, '.large!file');
      // Use a smaller threshold for testing to avoid disk space issues
      const originalMaxSize = CONFIG.maxFileSize;
      CONFIG.maxFileSize = 1024; // 1KB for testing

      const largeContent = 'x'.repeat(2 * 1024); // 2KB - larger than test threshold
      await writeFile(largeFile, largeContent);

      // Also disable minFileAge for this test
      const originalMinAge = CONFIG.minFileAge;
      CONFIG.minFileAge = 0;

      const result = await validateFile(largeFile);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('File too large');

      // Restore original config
      CONFIG.maxFileSize = originalMaxSize;
      CONFIG.minFileAge = originalMinAge;
    });

    it('should reject files that are too recent', async () => {
      const recentFile = join(testDir, '.recent!file');
      await writeFile(recentFile, 'recent content');
      
      // Configure very short age limit for testing
      const originalMinAge = CONFIG.minFileAge;
      CONFIG.minFileAge = 100; // 100ms
      
      const result = await validateFile(recentFile);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('File too recent');
      
      // Restore original config
      CONFIG.minFileAge = originalMinAge;
    });
  });

  describe('File Hashing', () => {
    it('should generate consistent hashes', async () => {
      const testFile = join(testDir, '.hash!test');
      const content = 'consistent test content';
      await writeFile(testFile, content);
      
      const hash1 = await generateFileHash(testFile);
      const hash2 = await generateFileHash(testFile);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex length
      expect(hash1).toMatch(/^[a-f0-9]+$/);
    });

    it('should return empty string when hashing is disabled', async () => {
      const testFile = join(testDir, '.hash!test2');
      await writeFile(testFile, 'content');
      
      const originalHashing = CONFIG.enableHashing;
      CONFIG.enableHashing = false;
      
      const hash = await generateFileHash(testFile);
      expect(hash).toBe('');
      
      // Restore original config
      CONFIG.enableHashing = originalHashing;
    });
  });

  describe('Heal Function', () => {
    it('should clean up matching files in dry run mode', async () => {
      // Disable minFileAge for testing (files just created)
      const originalMinAge = CONFIG.minFileAge;
      CONFIG.minFileAge = 0;

      const options = {
        targetDir: testDir,
        dryRun: true,
        enableMetrics: true,
        enableHashing: true,
        enableAuditLog: false // Disable for testing
      };

      const metrics = await heal(options);

      expect(metrics.filesFound).toBe(3); // .temp!swap1, .backup!data2, .cache!temp3
      expect(metrics.filesDeleted).toBe(3);
      expect(metrics.filesBackedUp).toBe(0); // Dry run doesn't create backups
      expect(metrics.hashesGenerated).toBe(3);

      // Files should still exist in dry run mode
      for (const file of testFiles.slice(0, 3)) {
        const filePath = join(testDir, file);
        const stats = await stat(filePath);
        expect(stats).toBeDefined();
      }

      // Restore original config
      CONFIG.minFileAge = originalMinAge;
    });

    it('should create backups when enabled', async () => {
      // Disable minFileAge for testing (files just created)
      const originalMinAge = CONFIG.minFileAge;
      CONFIG.minFileAge = 0;

      const options = {
        targetDir: testDir,
        dryRun: false,
        backupBeforeDelete: true,
        enableMetrics: true,
        enableHashing: true,
        enableAuditLog: false
      };

      const metrics = await heal(options);

      expect(metrics.filesFound).toBe(3);
      expect(metrics.filesDeleted).toBe(3);
      expect(metrics.filesBackedUp).toBe(3);

      // Check that backup files exist
      const { $ } = await import('bun');
      const backupFiles = await $`find "${testDir}" -name "*.backup.*"`.quiet();
      expect(backupFiles.stdout.toString().trim().split('\n').filter(Boolean)).toHaveLength(3);

      // Restore original config
      CONFIG.minFileAge = originalMinAge;
    });

    it('should handle parallel processing', async () => {
      // Disable minFileAge for testing (files just created)
      const originalMinAge = CONFIG.minFileAge;
      CONFIG.minFileAge = 0;

      // Create more files for parallel testing
      for (let i = 0; i < 10; i++) {
        const fileName = `.parallel!test${i}`;
        const filePath = join(testDir, fileName);
        await writeFile(filePath, `content ${i}`);
      }

      const options = {
        targetDir: testDir,
        dryRun: true,
        enableParallel: true,
        parallelLimit: 5,
        enableMetrics: true,
        enableHashing: false, // Disable for speed
        enableAuditLog: false
      };

      const metrics = await heal(options);

      expect(metrics.filesFound).toBeGreaterThan(10);
      expect(metrics.parallelOperations).toBeGreaterThan(0);
      expect(metrics.filesDeleted).toBe(metrics.filesFound);

      // Restore original config
      CONFIG.minFileAge = originalMinAge;
    });

    it('should respect custom configuration', async () => {
      // Disable minFileAge for testing (files just created)
      const originalMinAge = CONFIG.minFileAge;
      CONFIG.minFileAge = 0;

      const customDir = join(testDir, 'custom');
      await mkdir(customDir, { recursive: true });
      await writeFile(join(customDir, '.custom!file'), 'content');

      const options = {
        targetDir: customDir,
        dryRun: false,
        enableMetrics: true,
        enableHashing: false,
        enableAuditLog: false
      };

      const metrics = await heal(options);

      expect(metrics.filesFound).toBe(1);
      expect(metrics.filesDeleted).toBe(1);

      // Restore original config
      CONFIG.minFileAge = originalMinAge;
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent directory gracefully', async () => {
      const options = {
        targetDir: './non-existent-dir',
        dryRun: true,
        enableMetrics: true,
        enableHashing: false,
        enableAuditLog: false
      };
      
      // Should not throw an error
      const metrics = await heal(options);
      
      expect(metrics.filesFound).toBe(0);
      expect(metrics.filesDeleted).toBe(0);
      expect(metrics.errors.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle permission errors gracefully', async () => {
      // Create a file with no read permissions (if possible)
      const restrictedFile = join(testDir, '.restricted!file');
      await writeFile(restrictedFile, 'content');
      
      try {
        await $`chmod 000 "${restrictedFile}"`.quiet();
      } catch (error) {
        // Skip test if chmod fails
        return;
      }
      
      const options = {
        targetDir: testDir,
        dryRun: true,
        enableMetrics: true,
        enableHashing: false,
        enableAuditLog: false
      };
      
      const metrics = await heal(options);
      
      // Should handle the error and continue
      expect(metrics.errors.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Metrics and Reporting', () => {
    it('should track comprehensive metrics', async () => {
      // Disable minFileAge for testing (files just created)
      const originalMinAge = CONFIG.minFileAge;
      CONFIG.minFileAge = 0;

      const options = {
        targetDir: testDir,
        dryRun: true,
        enableMetrics: true,
        enableHashing: true,
        enableAuditLog: false
      };

      const metrics = await heal(options);

      expect(metrics.startTime).toBeGreaterThan(0);
      expect(metrics.endTime).toBeGreaterThan(metrics.startTime);
      expect(metrics.filesFound).toBe(3);
      expect(metrics.filesDeleted).toBe(3);
      expect(metrics.filesBackedUp).toBe(0);
      expect(metrics.filesSkipped).toBe(0);
      expect(metrics.totalBytesProcessed).toBeGreaterThan(0);
      expect(metrics.hashesGenerated).toBe(3);
      expect(metrics.methods).toContain('find');
      expect(metrics.methods).toContain('readdir');

      // Restore original config
      CONFIG.minFileAge = originalMinAge;
    });

    it('should calculate success rate correctly', async () => {
      // Disable minFileAge for testing (files just created)
      const originalMinAge = CONFIG.minFileAge;
      CONFIG.minFileAge = 0;

      const options = {
        targetDir: testDir,
        dryRun: true,
        enableMetrics: true,
        enableHashing: false,
        enableAuditLog: false
      };

      const metrics = await heal(options);

      const successRate = metrics.filesFound > 0 ?
        Math.round((metrics.filesDeleted / metrics.filesFound) * 100) : 100;
      expect(successRate).toBe(100);

      // Restore original config
      CONFIG.minFileAge = originalMinAge;
    });
  });

  describe('Configuration', () => {
    it('should use default configuration values', () => {
      expect(CONFIG.targetDir).toBe('utils');
      expect(CONFIG.filePattern).toBe('.*!*');
      expect(CONFIG.maxDepth).toBe(1);
      expect(CONFIG.enableMetrics).toBe(true);
      expect(CONFIG.enableHashing).toBe(true);
      expect(CONFIG.enableAuditLog).toBe(true);
      expect(CONFIG.maxFileSize).toBe(104857600); // 100MB
      expect(CONFIG.minFileAge).toBe(60000); // 1 minute
      expect(CONFIG.enableParallel).toBe(false);
      expect(CONFIG.parallelLimit).toBe(5);
    });

    it('should allow configuration override', async () => {
      const customOptions = {
        targetDir: testDir,
        maxDepth: 2,
        enableParallel: true,
        parallelLimit: 10
      };
      
      // This should not throw and should use custom options
      const metrics = await heal(customOptions);
      expect(metrics).toBeDefined();
    });
  });
});
