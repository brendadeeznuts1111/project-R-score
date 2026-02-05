#!/usr/bin/env bun
/**
 * Performance Tests for Test Organizer
 *
 * Tests the performance characteristics of the test organizer.
 */

import { test, expect } from 'bun:test';
import { TestHelpers } from '../utils/test-helpers';

test('should measure test organizer startup time', async () => {
  const { tempDir, cleanup } = await TestHelpers.createTempDir('perf-test-');

  try {
    const { result, time } = await TestHelpers.measureTime(async () => {
      const result = await TestHelpers.runCommand('test-organizer --list', {
        cwd: tempDir,
        timeout: 5000
      });
      return result;
    });

    // Startup should be reasonably fast
    expect(time).toBeLessThan(3000); // 3 seconds
    expect(result.exitCode).toBe(0);
  } finally {
    await cleanup();
  }
});

test('should handle large test suites efficiently', async () => {
  const { tempDir, cleanup } = await TestHelpers.createTempDir('large-suite-');

  try {
    // Create a large number of test files
    await TestHelpers.createFixtureStructure(tempDir, {
      'src': {
        'component1': {
          'test1.test.ts': 'export const test1 = () => {};',
          'test2.test.ts': 'export const test2 = () => {};',
          'test3.test.ts': 'export const test3 = () => {};',
        },
        'component2': {
          'test1.test.ts': 'export const test1 = () => {};',
          'test2.test.ts': 'export const test2 = () => {};',
          'test3.test.ts': 'export const test3 = () => {};',
        },
        'component3': {
          'test1.test.ts': 'export const test1 = () => {};',
          'test2.test.ts': 'export const test2 = () => {};',
          'test3.test.ts': 'export const test3 = () => {};',
        }
      }
    });

    const { result, time } = await TestHelpers.measureTime(async () => {
      const result = await TestHelpers.runCommand('test-organizer --all', {
        cwd: tempDir,
        timeout: 10000
      });
      return result;
    });

    // Should handle large suites efficiently
    expect(time).toBeLessThan(5000); // 5 seconds
    expect(result.exitCode).toBe(0);
  } finally {
    await cleanup();
  }
});

test('should measure dependency resolution performance', async () => {
  const { tempDir, cleanup } = await TestHelpers.createTempDir('dep-resolve-');

  try {
    const { result, time } = await TestHelpers.measureTime(async () => {
      const result = await TestHelpers.runCommand('test-organizer --group integration', {
        cwd: tempDir,
        timeout: 5000
      });
      return result;
    });

    // Dependency resolution should be fast
    expect(time).toBeLessThan(2000); // 2 seconds
    expect(result.exitCode).toBe(0);
  } finally {
    await cleanup();
  }
});

test('should handle concurrent test execution', async () => {
  const { tempDir, cleanup } = await TestHelpers.createTempDir('concurrent-');

  try {
    // Create multiple test files that can run concurrently
    await TestHelpers.createFixtureStructure(tempDir, {
      'src': {
        'fast-test1.test.ts': `
          export const test = async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            return true;
          };
        `,
        'fast-test2.test.ts': `
          export const test = async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            return true;
          };
        `,
        'fast-test3.test.ts': `
          export const test = async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            return true;
          };
        `
      }
    });

    const { result, time } = await TestHelpers.measureTime(async () => {
      const result = await TestHelpers.runCommand('test-organizer --group unit', {
        cwd: tempDir,
        timeout: 5000
      });
      return result;
    });

    // Concurrent execution should be faster than sequential
    expect(time).toBeLessThan(500); // Should complete in less than 500ms with concurrency
    expect(result.exitCode).toBe(0);
  } finally {
    await cleanup();
  }
});

test('should measure memory usage for large configurations', async () => {
  const { tempDir, cleanup } = await TestHelpers.createTempDir('memory-test-');

  try {
    // Create a large configuration file
    const largeConfig: { groups: Record<string, any> } = {
      groups: {}
    };

    // Add many test groups
    for (let i = 0; i < 100; i++) {
      largeConfig.groups[`group-${i}`] = {
        name: `Group ${i}`,
        description: `Test group ${i}`,
        patterns: [`src/**/*.test.ts`],
        priority: 'medium',
        tags: ['performance'],
        timeout: 5000
      };
    }

    await TestHelpers.createFixtureFile(tempDir, 'test-organizer.config.json', JSON.stringify(largeConfig, null, 2));

    const { result, time } = await TestHelpers.measureTime(async () => {
      const result = await TestHelpers.runCommand('test-organizer --list', {
        cwd: tempDir,
        timeout: 5000
      });
      return result;
    });

    // Should handle large configurations efficiently
    expect(time).toBeLessThan(2000); // 2 seconds
    expect(result.exitCode).toBe(0);
  } finally {
    await cleanup();
  }
});
