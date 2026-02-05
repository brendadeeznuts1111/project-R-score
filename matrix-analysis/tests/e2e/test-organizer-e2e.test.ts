#!/usr/bin/env bun
/**
 * End-to-End Tests for Test Organizer
 *
 * Tests complete workflows and user scenarios.
 */

import { test, expect } from 'bun:test';
import { TestHelpers } from '../utils/test-helpers';

test('should complete full test organization workflow', async () => {
  const { tempDir, cleanup } = await TestHelpers.createTempDir('e2e-workflow-');

  try {
    // Create a complete project structure
    await TestHelpers.createFixtureStructure(tempDir, {
      'src': {
        'components': {
          'Button.test.ts': `
            export const test = () => {
              console.log('Button test passed');
              return true;
            };
          `,
          'Input.test.ts': `
            export const test = () => {
              console.log('Input test passed');
              return true;
            };
          `
        },
        'utils': {
          'helpers.test.ts': `
            export const test = () => {
              console.log('Helpers test passed');
              return true;
            };
          `
        }
      },
      'tests': {
        'integration': {
          'api.test.ts': `
            export const test = async () => {
              console.log('API integration test passed');
              return true;
            };
          `
        },
        'e2e': {
          'user-flow.test.ts': `
            export const test = async () => {
              console.log('E2E user flow test passed');
              return true;
            };
          `
        }
      }
    });

    // Test complete workflow
    const result = await TestHelpers.runCommand('test-organizer --all', {
      cwd: tempDir,
      timeout: 15000
    });

    // Should complete successfully
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('passed');
  } finally {
    await cleanup();
  }
});

test('should handle configuration changes', async () => {
  const { tempDir, cleanup } = await TestHelpers.createTempDir('config-change-');

  try {
    // Create initial configuration
    const initialConfig = {
      groups: {
        'unit': {
          name: 'Unit Tests',
          patterns: ['src/**/*.test.ts'],
          priority: 'high',
          tags: ['unit']
        }
      },
      globalEnvironment: {
        'NODE_ENV': 'test'
      }
    };

    await TestHelpers.createFixtureFile(tempDir, 'test-organizer.config.json', JSON.stringify(initialConfig));

    // Run with initial config
    let result = await TestHelpers.runCommand('test-organizer --list', {
      cwd: tempDir,
      timeout: 5000
    });

    expect(result.exitCode).toBe(0);

    // Update configuration
    const updatedConfig = {
      ...initialConfig,
      groups: {
        ...initialConfig.groups,
        'integration': {
          name: 'Integration Tests',
          patterns: ['tests/**/*.test.ts'],
          priority: 'medium',
          tags: ['integration'],
          dependencies: ['unit']
        }
      }
    };

    await TestHelpers.createFixtureFile(tempDir, 'test-organizer.config.json', JSON.stringify(updatedConfig));

    // Run with updated config
    result = await TestHelpers.runCommand('test-organizer --list', {
      cwd: tempDir,
      timeout: 5000
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Integration Tests');
  } finally {
    await cleanup();
  }
});

test('should handle CI/CD pipeline scenario', async () => {
  const { tempDir, cleanup } = await TestHelpers.createTempDir('ci-cd-scenario-');
  const restoreCI = TestHelpers.mockCIEnvironment('github');

  try {
    // Create CI-specific configuration
    const ciConfig = {
      groups: {
        'smoke': {
          name: 'Smoke Tests',
          patterns: ['src/**/*.test.ts'],
          priority: 'high',
          tags: ['smoke', 'critical'],
          timeout: 3000
        },
        'unit': {
          name: 'Unit Tests',
          patterns: ['src/**/*.test.ts'],
          priority: 'high',
          tags: ['unit'],
          timeout: 5000
        },
        'integration': {
          name: 'Integration Tests',
          patterns: ['tests/**/*.test.ts'],
          priority: 'medium',
          tags: ['integration'],
          dependencies: ['unit'],
          timeout: 15000
        }
      }
    };

    await TestHelpers.createFixtureFile(tempDir, 'test-organizer.config.json', JSON.stringify(ciConfig));

    // Run CI pipeline
    const result = await TestHelpers.runCommand('test-organizer --all', {
      cwd: tempDir,
      timeout: 30000
    });

    // Should complete CI pipeline successfully
    expect(result.exitCode).toBe(0);
  } finally {
    restoreCI();
    await cleanup();
  }
});

test('should handle parallel execution', async () => {
  const { tempDir, cleanup } = await TestHelpers.createTempDir('parallel-execution-');

  try {
    // Create multiple test files for parallel execution
    await TestHelpers.createFixtureStructure(tempDir, {
      'src': {
        'test1.test.ts': `
          export const test = async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            return true;
          };
        `,
        'test2.test.ts': `
          export const test = async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            return true;
          };
        `,
        'test3.test.ts': `
          export const test = async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            return true;
          };
        `
      }
    });

    // Run with parallel execution
    const result = await TestHelpers.runCommand('test-organizer --group unit', {
      cwd: tempDir,
      timeout: 10000
    });

    // Should complete parallel execution
    expect(result.exitCode).toBe(0);
  } finally {
    await cleanup();
  }
});

test('should handle error recovery', async () => {
  const { tempDir, cleanup } = await TestHelpers.createTempDir('error-recovery-');

  try {
    // Create configuration with some failing tests
    await TestHelpers.createFixtureStructure(tempDir, {
      'src': {
        'good-test.test.ts': `
          export const test = () => {
            return true;
          };
        `,
        'bad-test.test.ts': `
          export const test = () => {
            throw new Error('Test failed');
          };
        `
      }
    });

    // Run tests with expected failures
    const result = await TestHelpers.runCommand('test-organizer --group unit', {
      cwd: tempDir,
      timeout: 5000
    });

    // Should handle errors gracefully
    expect(result.exitCode).toBe(0); // Should not crash
  } finally {
    await cleanup();
  }
});

test('should handle large project scale', async () => {
  const { tempDir, cleanup } = await TestHelpers.createTempDir('large-scale-');

  try {
    // Create a large project structure
    const projectStructure: Record<string, any> = {
      'src': {},
      'tests': {
        'unit': {},
        'integration': {},
        'e2e': {}
      }
    };

    // Add many test files
    for (let i = 0; i < 50; i++) {
      projectStructure.src[`component${i}.test.ts`] = `
        export const test = () => {
          return true;
        };
      `;

      projectStructure.tests.unit[`unit${i}.test.ts`] = `
        export const test = () => {
          return true;
        };
      `;

      projectStructure.tests.integration[`integration${i}.test.ts`] = `
        export const test = async () => {
          return true;
        };
      `;
    }

    await TestHelpers.createFixtureStructure(tempDir, projectStructure);

    // Run large scale test
    const result = await TestHelpers.runCommand('test-organizer --all', {
      cwd: tempDir,
      timeout: 60000 // 1 minute timeout for large scale
    });

    // Should handle large scale
    expect(result.exitCode).toBe(0);
  } finally {
    await cleanup();
  }
});
