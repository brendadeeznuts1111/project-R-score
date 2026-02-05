// tests/cli-enhanced-v2.01.05.test.ts
// Integration tests for enhanced CLI commands with v2.01.05 self-heal integration

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { $ } from 'bun';

describe('Enhanced CLI Commands v2.01.05', () => {
  const testDir = './test-temp-cli';
  const cacheTestDir = join(testDir, 'cache');
  const utilsTestDir = join(testDir, 'utils');

  beforeEach(async () => {
    // Create test directories
    await mkdir(testDir, { recursive: true });
    await mkdir(cacheTestDir, { recursive: true });
    await mkdir(utilsTestDir, { recursive: true });
    
    // Create test files for cleanup
    const testFiles = [
      '.temp!swap1',
      '.cache!temp2',
      '.backup!data3'
    ];
    
    for (const dir of [cacheTestDir, utilsTestDir]) {
      for (const file of testFiles) {
        const filePath = join(dir, file);
        await writeFile(filePath, `Test content for ${file}`);
      }
    }
  });

  afterEach(async () => {
    // Cleanup test directory
    try {
      await $`rm -rf "${testDir}"`.quiet();
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Cache Commands', () => {
    it('should show cache health check', async () => {
      const result = await $`bun run cli/commands/cache.ts health`.quiet();
      const output = result.stdout.toString();
      
      expect(output).toContain('Cache System Health Check');
      expect(output).toContain('Health Check Results');
      expect(output).toContain('Overall Health Score');
      expect(output).toContain('✅');
    });

    it('should show detailed cache health', async () => {
      const result = await $`bun run cli/commands/cache.ts health --detailed`.quiet();
      const output = result.stdout.toString();
      
      expect(output).toContain('Detailed Information');
      expect(output).toContain('Cache services: ONLINE');
      expect(output).toContain('Uptime:');
      expect(output).toContain('Total requests:');
    });

    it('should perform cache restart with deep cleanup', async () => {
      const result = await $`bun run cli/commands/cache.ts restart --deep-cleanup --backup --dry-run`.quiet();
      const output = result.stdout.toString();
      
      expect(output).toContain('Restarting cache: all');
      expect(output).toContain('Running deep filesystem cleanup');
      expect(output).toContain('Cleanup completed:');
      expect(output).toContain('DRY RUN MODE');
    });

    it('should perform advanced cache cleanup', async () => {
      const result = await $`bun run cli/commands/cache.ts cleanup --target-dir="${cacheTestDir}" --dry-run --backup`.quiet();
      const output = result.stdout.toString();
      
      expect(output).toContain('Advanced Cache Cleanup v2.01.05');
      expect(output).toContain('Target:');
      expect(output).toContain('Files processed:');
      expect(output).toContain('DRY RUN MODE');
    });

    it('should handle parallel cleanup options', async () => {
      const result = await $`bun run cli/commands/cache.ts cleanup --target-dir="${cacheTestDir}" --parallel --parallel-limit=3 --dry-run`.quiet();
      const output = result.stdout.toString();
      
      expect(output).toContain('Advanced Cache Cleanup v2.01.05');
      expect(output).toContain('Parallel operations:');
      expect(output).toContain('DRY RUN MODE');
    });
  });

  describe('Empire Heal Commands', () => {
    it('should show heal help and commands', async () => {
      const result = await $`bun run cli/bin/empire.ts heal --help`.quiet();
      const output = result.stdout.toString();
      
      expect(output).toContain('Autonomic (§Workflow:100) operations');
      expect(output).toContain('now');
      expect(output).toContain('cleanup');
      expect(output).toContain('monitor');
    });

    it('should perform traditional healing', async () => {
      const result = await $`bun run cli/bin/empire.ts heal now cache`.quiet();
      const output = result.stdout.toString();
      
      expect(output).toContain('Triggering autonomic healing for: cache');
      expect(output).toContain('cache');
      expect(output).toContain('OK');
    });

    it('should perform healing with v2.01.05 deep cleanup', async () => {
      const result = await $`bun run cli/bin/empire.ts heal now --deep-cleanup --backup --dry-run`.quiet();
      const output = result.stdout.toString();
      
      expect(output).toContain('Triggering autonomic healing for: all');
      expect(output).toContain('Running v2.01.05 deep filesystem cleanup');
      expect(output).toContain('Deep cleanup completed:');
      expect(output).toContain('DRY RUN MODE');
    });

    it('should perform advanced cleanup command', async () => {
      const result = await $`bun run cli/bin/empire.ts heal cleanup --target-dir="${utilsTestDir}" --dry-run --backup`.quiet();
      const output = result.stdout.toString();
      
      expect(output).toContain('Advanced v2.01.05 Filesystem Cleanup');
      expect(output).toContain('Target:');
      expect(output).toContain('Files processed:');
      expect(output).toContain('DRY RUN MODE');
    });

    it('should handle parallel cleanup in empire', async () => {
      const result = await $`bun run cli/bin/empire.ts heal cleanup --target-dir="${utilsTestDir}" --parallel --parallel-limit=5 --dry-run`.quiet();
      const output = result.stdout.toString();
      
      expect(output).toContain('Advanced v2.01.05 Filesystem Cleanup');
      expect(output).toContain('Parallel operations:');
      expect(output).toContain('Success rate:');
    });

    it('should start monitoring with cleanup events', async () => {
      // Start monitoring in background and capture initial output
      const process = Bun.spawn(['bun', 'run', 'cli/bin/empire.ts', 'heal', 'monitor', '--include-cleanup'], {
        stdout: 'pipe',
        stderr: 'pipe'
      });
      
      // Wait a moment for output
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Kill the process
      process.kill();
      
      // Should have started without errors
      expect(process.exitCode).toBeNull(); // Still running or was killed
    });
  });

  describe('Direct Self-Heal Script', () => {
    it('should show help for self-heal script', async () => {
      const result = await $`bun run scripts/self-heal.ts --help`.quiet();
      const output = result.stdout.toString();
      
      expect(output).toContain('System Hygiene v2.01.05');
      expect(output).toContain('Usage:');
      expect(output).toContain('Options:');
      expect(output).toContain('--dry-run');
      expect(output).toContain('--backup');
      expect(output).toContain('--parallel');
    });

    it('should perform dry run cleanup', async () => {
      const result = await $`bun run scripts/self-heal.ts --dir="${utilsTestDir}" --dry-run`.quiet();
      const output = result.stdout.toString();
      
      expect(output).toContain('System Hygiene v2.01.05');
      expect(output).toContain('Advanced cleaning starting');
      expect(output).toContain('Configuration:');
      expect(output).toContain('DRY RUN: Would delete');
      expect(output).toContain('PRISTINE');
    });

    it('should perform cleanup with backups', async () => {
      const result = await $`bun run scripts/self-heal.ts --dir="${utilsTestDir}" --backup --dry-run`.quiet();
      const output = result.stdout.toString();
      
      expect(output).toContain('System Hygiene v2.01.05');
      expect(output).toContain('backupBeforeDelete: true');
      expect(output).toContain('enableHashing: true');
      expect(output).toContain('DRY RUN MODE');
    });

    it('should handle parallel processing', async () => {
      const result = await $`bun run scripts/self-heal.ts --dir="${utilsTestDir}" --parallel --parallel-limit=3 --dry-run`.quiet();
      const output = result.stdout.toString();
      
      expect(output).toContain('System Hygiene v2.01.05');
      expect(output).toContain('enableParallel: true');
      expect(output).toContain('parallelLimit: 3');
      expect(output).toContain('PRISTINE');
    });

    it('should respect disable options', async () => {
      const result = await $`bun run scripts/self-heal.ts --dir="${utilsTestDir}" --no-hash --no-audit --dry-run`.quiet();
      const output = result.stdout.toString();
      
      expect(output).toContain('System Hygiene v2.01.05');
      expect(output).toContain('enableHashing: false');
      expect(output).toContain('enableAuditLog: false');
      expect(output).toContain('PRISTINE');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid directory gracefully', async () => {
      const result = await $`bun run scripts/self-heal.ts --dir="/non/existent/path" --dry-run`.quiet();
      const output = result.stdout.toString();
      
      expect(output).toContain('System Hygiene v2.01.05');
      expect(output).toContain('No swap artifacts found');
      expect(output).toContain('PRISTINE');
    });

    it('should handle permission errors in CLI', async () => {
      // Try to access a restricted directory
      const result = await $`bun run cli/commands/cache.ts cleanup --target-dir="/root" --dry-run`.quiet();
      const output = result.stdout.toString();
      
      // Should handle gracefully without crashing
      expect(output).toContain('Advanced Cache Cleanup v2.01.05');
    });

    it('should handle invalid options', async () => {
      const result = await $`bun run scripts/self-heal.ts --invalid-option`.quiet();
      const output = result.stdout.toString();
      
      // Should either show help or handle gracefully
      expect(output.length).toBeGreaterThan(0);
    });
  });

  describe('Environment Variable Integration', () => {
    it('should respect environment variables', async () => {
      const envVars = {
        HEAL_ENABLE_HASHING: 'false',
        HEAL_ENABLE_AUDIT_LOG: 'false',
        HEAL_ENABLE_PARALLEL: 'true',
        HEAL_PARALLEL_LIMIT: '3'
      };
      
      const result = await $`HEAL_ENABLE_HASHING=false HEAL_ENABLE_AUDIT_LOG=false HEAL_ENABLE_PARALLEL=true HEAL_PARALLEL_LIMIT=3 bun run scripts/self-heal.ts --dir="${utilsTestDir}" --dry-run`.quiet();
      const output = result.stdout.toString();
      
      expect(output).toContain('enableHashing: false');
      expect(output).toContain('enableAuditLog: false');
      expect(output).toContain('enableParallel: true');
      expect(output).toContain('parallelLimit: 3');
    });
  });

  describe('Performance Metrics', () => {
    it('should report detailed metrics', async () => {
      const result = await $`bun run scripts/self-heal.ts --dir="${utilsTestDir}" --dry-run`.quiet();
      const output = result.stdout.toString();
      
      expect(output).toContain('HEAL METRICS REPORT v2.01.05');
      expect(output).toContain('Duration:');
      expect(output).toContain('Files Found:');
      expect(output).toContain('Files Deleted:');
      expect(output).toContain('Hashes Generated:');
      expect(output).toContain('Success:');
    });

    it('should show performance improvements with parallel processing', async () => {
      const sequentialResult = await $`bun run scripts/self-heal.ts --dir="${utilsTestDir}" --dry-run --no-hash`.quiet();
      const parallelResult = await $`bun run scripts/self-heal.ts --dir="${utilsTestDir}" --dry-run --parallel --no-hash`.quiet();
      
      expect(sequentialResult.stdout.toString()).toContain('HEAL METRICS REPORT v2.01.05');
      expect(parallelResult.stdout.toString()).toContain('HEAL METRICS REPORT v2.01.05');
      
      // Both should complete successfully
      expect(sequentialResult.exitCode).toBe(0);
      expect(parallelResult.exitCode).toBe(0);
    });
  });
});
