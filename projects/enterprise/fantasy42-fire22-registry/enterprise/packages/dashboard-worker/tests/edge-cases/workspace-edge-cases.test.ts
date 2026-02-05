#!/usr/bin/env bun

/**
 * 🛡️ Workspace Edge Cases Test Suite
 * Comprehensive testing of workspace-specific failures and edge cases
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'bun:test';
import { EdgeCaseHelpers } from '../utils/edge-case-helpers';
import WorkspaceOrchestrator from '../../scripts/workspace-orchestrator';
import { existsSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('🛡️ Workspace Edge Cases', () => {
  let tempDir: string;
  let testOrchestrator: WorkspaceOrchestrator;
  let resourceTracker: ReturnType<typeof EdgeCaseHelpers.createResourceTracker>;

  beforeAll(() => {
    tempDir = join(process.cwd(), 'test-temp-workspace');
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    testOrchestrator = new WorkspaceOrchestrator(tempDir);
    resourceTracker = EdgeCaseHelpers.createResourceTracker();
  });

  afterEach(() => {
    const remaining = resourceTracker.cleanup();
    if (remaining > 0) {
      console.warn(`⚠️ ${remaining} workspace resources not cleaned up`);
    }
  });

  describe('📦 Package Configuration Edge Cases', () => {
    it('🧪 should handle corrupted package.json files', async () => {
      const corruptedSyntax = EdgeCaseHelpers.createCorruptedPackage('syntax');
      const corruptedStructure = EdgeCaseHelpers.createCorruptedPackage('structure');
      const corruptedValues = EdgeCaseHelpers.createCorruptedPackage('values');

      // Test syntax errors
      const syntaxTestFile = join(tempDir, 'package-syntax.json');
      writeFileSync(syntaxTestFile, corruptedSyntax as string);
      resourceTracker.allocate(`file:${syntaxTestFile}`);

      let syntaxError: Error | null = null;
      try {
        const content = await Bun.file(syntaxTestFile).text();
        JSON.parse(content);
      } catch (error) {
        syntaxError = error as Error;
      }

      expect(syntaxError).not.toBeNull();
      expect(syntaxError?.message).toMatch(/JSON|parse|syntax/i);

      // Test structural errors
      const structureTestFile = join(tempDir, 'package-structure.json');
      writeFileSync(structureTestFile, JSON.stringify(corruptedStructure));
      resourceTracker.allocate(`file:${structureTestFile}`);

      const structureContent = JSON.parse(await Bun.file(structureTestFile).text());

      expect(structureContent.name).toBe(''); // Invalid empty name
      expect(typeof structureContent.dependencies).toBe('string'); // Should be object
      expect(structureContent.scripts).toBeNull(); // Should be object

      // Test value validation
      const valuesContent = corruptedValues as any;
      expect(valuesContent.dependencies['non-existent-package']).toBeDefined();
      expect(valuesContent.dependencies['']).toBeDefined(); // Empty package name
      expect(valuesContent.scripts.test).toMatch(/rm -rf/); // Dangerous script

      // Cleanup
      rmSync(syntaxTestFile, { force: true });
      rmSync(structureTestFile, { force: true });
      resourceTracker.deallocate(`file:${syntaxTestFile}`);
      resourceTracker.deallocate(`file:${structureTestFile}`);
    });

    it('🧪 should validate package configuration integrity', async () => {
      const validPackage = {
        name: '@fire22/test-package',
        version: '1.0.0',
        description: 'Test package for validation',
        main: 'index.ts',
        scripts: {
          build: 'bun run build-script',
          test: 'bun test',
        },
        dependencies: {
          '@fire22/core': '^1.0.0',
        },
      };

      const validationResults = [];

      // Test valid package
      validationResults.push({
        valid: validPackage.name.length > 0 && validPackage.name.startsWith('@fire22/'),
        issue: validPackage.name.length === 0 ? 'Empty package name' : null,
      });

      validationResults.push({
        valid: /^\d+\.\d+\.\d+/.test(validPackage.version),
        issue: !/^\d+\.\d+\.\d+/.test(validPackage.version) ? 'Invalid version format' : null,
      });

      validationResults.push({
        valid: typeof validPackage.dependencies === 'object' && validPackage.dependencies !== null,
        issue: typeof validPackage.dependencies !== 'object' ? 'Dependencies must be object' : null,
      });

      const validCount = validationResults.filter(r => r.valid).length;
      expect(validCount).toBe(validationResults.length);

      // Test validation against corrupted package
      const corrupted = EdgeCaseHelpers.createCorruptedPackage('values') as any;

      const corruptedValidation = [];
      corruptedValidation.push({
        valid: Object.keys(corrupted.dependencies).every(name => name.length > 0),
        issue: 'Empty dependency name found',
      });

      corruptedValidation.push({
        valid: !Object.values(corrupted.scripts).some(
          script => typeof script === 'string' && script.includes('rm -rf')
        ),
        issue: 'Dangerous script detected',
      });

      const corruptedValidCount = corruptedValidation.filter(r => r.valid).length;
      expect(corruptedValidCount).toBeLessThan(corruptedValidation.length);
    });

    it('🧪 should handle missing dependency resolution', async () => {
      const packageWithMissingDeps = {
        name: '@fire22/missing-deps-test',
        version: '1.0.0',
        dependencies: {
          '@fire22/non-existent': '^1.0.0',
          '@fire22/another-missing': '^2.0.0',
          '@fire22/core': '^1.0.0', // This one exists
        },
      };

      const packageFile = join(tempDir, 'missing-deps-package.json');
      writeFileSync(packageFile, JSON.stringify(packageWithMissingDeps, null, 2));
      resourceTracker.allocate(`file:${packageFile}`);

      // Simulate dependency resolution
      const availablePackages = new Set(['@fire22/core']);
      const missingDependencies = [];

      for (const [depName, version] of Object.entries(packageWithMissingDeps.dependencies)) {
        if (!availablePackages.has(depName)) {
          missingDependencies.push({ name: depName, version });
        }
      }

      expect(missingDependencies).toHaveLength(2);
      expect(missingDependencies.map(d => d.name)).toContain('@fire22/non-existent');
      expect(missingDependencies.map(d => d.name)).toContain('@fire22/another-missing');

      // Cleanup
      rmSync(packageFile, { force: true });
      resourceTracker.deallocate(`file:${packageFile}`);
    });
  });

  describe('🔗 Circular Dependency Detection', () => {
    it('🧪 should detect simple circular dependencies', () => {
      const circular = EdgeCaseHelpers.createCircularDependency();
      const cycles = circular.detectCircular();

      expect(cycles.length).toBeGreaterThan(0);
      console.log('🔍 Detected circular dependencies:', cycles);

      // Should detect the main circular dependency
      const hasMainCycle = cycles.some(
        cycle => cycle.includes('@fire22/package-a') && cycle.includes('@fire22/package-c')
      );
      expect(hasMainCycle).toBe(true);
    });

    it('🧪 should handle complex circular dependency chains', () => {
      const complexCircular = new Map([
        ['@fire22/a', { dependencies: ['@fire22/b', '@fire22/shared'] }],
        ['@fire22/b', { dependencies: ['@fire22/c', '@fire22/d'] }],
        ['@fire22/c', { dependencies: ['@fire22/a'] }], // Creates cycle: a -> b -> c -> a
        ['@fire22/d', { dependencies: ['@fire22/e'] }],
        ['@fire22/e', { dependencies: ['@fire22/b'] }], // Creates cycle: b -> d -> e -> b
        ['@fire22/shared', { dependencies: ['@fire22/f'] }],
        ['@fire22/f', { dependencies: ['@fire22/shared'] }], // Creates cycle: shared -> f -> shared
      ]);

      const detectCycles = () => {
        const visited = new Set<string>();
        const visiting = new Set<string>();
        const cycles: string[] = [];

        function visit(packageName: string, path: string[] = []): void {
          if (visiting.has(packageName)) {
            const cycleStart = path.indexOf(packageName);
            const cycle = path.slice(cycleStart).concat(packageName);
            cycles.push(cycle.join(' → '));
            return;
          }

          if (visited.has(packageName)) return;

          visiting.add(packageName);
          const pkg = complexCircular.get(packageName);

          if (pkg?.dependencies) {
            for (const dep of pkg.dependencies) {
              visit(dep, [...path, packageName]);
            }
          }

          visiting.delete(packageName);
          visited.add(packageName);
        }

        for (const packageName of complexCircular.keys()) {
          if (!visited.has(packageName)) {
            visit(packageName);
          }
        }

        return cycles;
      };

      const detectedCycles = detectCycles();
      expect(detectedCycles.length).toBeGreaterThan(0);
      console.log('🔍 Complex circular dependencies:', detectedCycles);

      // Should detect multiple cycles
      expect(detectedCycles.length).toBeGreaterThanOrEqual(2);
    });

    it('🧪 should provide cycle resolution recommendations', () => {
      const circular = EdgeCaseHelpers.createCircularDependency();
      const cycles = circular.detectCircular();

      const resolutionStrategies = cycles.map(cycle => {
        const packages = cycle.split(' → ');
        return {
          cycle,
          strategies: [
            `Extract common functionality from ${packages[0]} and ${packages[packages.length - 2]} into a shared package`,
            `Reverse the dependency direction between ${packages[1]} and ${packages[0]}`,
            `Use dependency injection to break the hard dependency`,
            `Create an interface package to decouple the circular reference`,
          ],
        };
      });

      expect(resolutionStrategies.length).toBeGreaterThan(0);

      for (const resolution of resolutionStrategies) {
        expect(resolution.strategies.length).toBe(4);
        expect(resolution.cycle).toContain('@fire22/');
      }
    });
  });

  describe('🏗️ Invalid Workspace Configurations', () => {
    it('🧪 should handle invalid workspace structures', async () => {
      const invalidWorkspaceConfigs = [
        {
          name: '', // Empty name
          domain: 'core',
          packages: [],
          description: 'Invalid workspace',
        },
        {
          name: 'invalid-workspace',
          domain: 'invalid-domain', // Invalid domain
          packages: ['@fire22/test'],
          description: 'Invalid domain workspace',
        },
        {
          // Missing required fields
          packages: ['@fire22/test'],
        },
        {
          name: 'circular-workspace',
          domain: 'core',
          packages: ['@fire22/self'], // Self-referencing
          dependencies: ['@fire22/self'], // Self-dependency
        },
      ];

      const validationResults = invalidWorkspaceConfigs.map((config, index) => {
        const errors = [];

        if (!config.name || config.name.length === 0) {
          errors.push('Workspace name is required');
        }

        if (
          !config.domain ||
          !['core', 'benchmarking', 'wager', 'worker'].includes(config.domain)
        ) {
          errors.push('Invalid or missing workspace domain');
        }

        if (!config.packages || !Array.isArray(config.packages)) {
          errors.push('Packages must be an array');
        }

        if (config.packages && config.dependencies) {
          const selfReferencing = config.packages.some(pkg => config.dependencies?.includes(pkg));
          if (selfReferencing) {
            errors.push('Workspace cannot depend on its own packages');
          }
        }

        return { index, errors, valid: errors.length === 0 };
      });

      // All configs should be invalid
      const validConfigs = validationResults.filter(r => r.valid);
      expect(validConfigs.length).toBe(0);

      // Each should have specific errors
      expect(validationResults[0].errors).toContain('Workspace name is required');
      expect(validationResults[1].errors).toContain('Invalid or missing workspace domain');
      expect(validationResults[2].errors).toContain('Invalid or missing workspace domain');
      expect(validationResults[3].errors).toContain('Workspace cannot depend on its own packages');
    });

    it('🧪 should validate workspace repository configurations', () => {
      const repositoryConfigs = [
        {
          url: 'https://github.com/fire22/valid-repo',
          directory: '../valid-workspace',
        },
        {
          url: '', // Invalid empty URL
          directory: '../empty-url-workspace',
        },
        {
          url: 'not-a-url', // Invalid URL format
          directory: '../invalid-url-workspace',
        },
        {
          url: 'https://github.com/fire22/valid-repo',
          directory: '/absolute/path', // Might be problematic
        },
        {
          url: 'https://github.com/fire22/valid-repo',
          directory: '../../../dangerous-path', // Dangerous path
        },
      ];

      const validationResults = repositoryConfigs.map(config => {
        const errors = [];

        if (!config.url || config.url.length === 0) {
          errors.push('Repository URL is required');
        } else if (!/^https?:\/\/.+/.test(config.url)) {
          errors.push('Repository URL must be a valid HTTP/HTTPS URL');
        }

        if (!config.directory || config.directory.length === 0) {
          errors.push('Repository directory is required');
        } else if (config.directory.startsWith('/')) {
          errors.push('Repository directory should be relative, not absolute');
        } else if (config.directory.includes('../../..')) {
          errors.push('Repository directory contains dangerous path traversal');
        }

        return { config, errors, valid: errors.length === 0 };
      });

      const validConfigs = validationResults.filter(r => r.valid);
      expect(validConfigs.length).toBe(1); // Only the first one should be valid

      // Check specific error cases
      expect(validationResults[1].errors).toContain('Repository URL is required');
      expect(validationResults[2].errors).toContain(
        'Repository URL must be a valid HTTP/HTTPS URL'
      );
      expect(validationResults[3].errors).toContain(
        'Repository directory should be relative, not absolute'
      );
      expect(validationResults[4].errors).toContain(
        'Repository directory contains dangerous path traversal'
      );
    });
  });

  describe('🔧 Partial Workspace Operations', () => {
    it('🧪 should handle partial workspace split failures', async () => {
      const partialFailure = EdgeCaseHelpers.simulatePartialFailure(0.3); // 30% failure rate
      const testPackages = [
        '@fire22/package-1',
        '@fire22/package-2',
        '@fire22/package-3',
        '@fire22/package-4',
        '@fire22/package-5',
      ];

      const splitResults = [];

      for (let i = 0; i < testPackages.length; i++) {
        const packageName = testPackages[i];

        try {
          // Simulate package processing with potential failure
          if (partialFailure.shouldFail(i)) {
            throw new Error(`Failed to process package ${packageName}`);
          }

          // Simulate successful processing
          await new Promise(resolve => setTimeout(resolve, 10));
          splitResults.push({
            package: packageName,
            status: 'success',
            size: Math.floor(Math.random() * 1000000), // Random size in bytes
          });
        } catch (error) {
          splitResults.push({
            package: packageName,
            status: 'failed',
            error: error.message,
          });
        }
      }

      const successful = splitResults.filter(r => r.status === 'success');
      const failed = splitResults.filter(r => r.status === 'failed');

      expect(successful.length + failed.length).toBe(testPackages.length);
      expect(failed.length).toBeGreaterThan(0); // Should have some failures
      expect(successful.length).toBeGreaterThan(0); // Should have some successes

      console.log(
        `📊 Partial split results: ${successful.length} succeeded, ${failed.length} failed`
      );
    });

    it('🧪 should handle workspace operation interruptions', async () => {
      let operationStarted = false;
      let operationCompleted = false;
      let cleanupExecuted = false;

      const interruptibleOperation = async () => {
        operationStarted = true;
        resourceTracker.allocate('interruptible-operation');

        try {
          // Simulate long-running operation
          for (let i = 0; i < 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 100));

            // Simulate interruption after 300ms
            if (i === 3) {
              throw new Error('Operation interrupted');
            }
          }

          operationCompleted = true;
          return { success: true };
        } catch (error) {
          // Cleanup on interruption
          cleanupExecuted = true;
          resourceTracker.deallocate('interruptible-operation');
          throw error;
        }
      };

      let caughtError: Error | null = null;
      try {
        await interruptibleOperation();
      } catch (error) {
        caughtError = error as Error;
      }

      expect(operationStarted).toBe(true);
      expect(operationCompleted).toBe(false); // Should not complete
      expect(cleanupExecuted).toBe(true); // Should cleanup
      expect(caughtError).not.toBeNull();
      expect(caughtError?.message).toContain('interrupted');
      expect(resourceTracker.getAllocated()).not.toContain('interruptible-operation');
    });

    it('🧪 should maintain workspace state consistency during failures', async () => {
      const workspaceState = {
        packages: new Map([
          ['@fire22/package-1', { status: 'pending', version: '1.0.0' }],
          ['@fire22/package-2', { status: 'pending', version: '1.0.0' }],
          ['@fire22/package-3', { status: 'pending', version: '1.0.0' }],
        ]),
        completedOperations: new Set<string>(),
        failedOperations: new Set<string>(),
      };

      // Simulate processing with partial failures
      for (const [packageName, packageInfo] of workspaceState.packages) {
        try {
          // 33% chance of failure
          if (Math.random() < 0.33) {
            throw new Error(`Processing failed for ${packageName}`);
          }

          // Mark as completed
          packageInfo.status = 'completed';
          workspaceState.completedOperations.add(packageName);
        } catch (error) {
          // Mark as failed but maintain state consistency
          packageInfo.status = 'failed';
          workspaceState.failedOperations.add(packageName);
        }
      }

      // Verify state consistency
      const totalPackages = workspaceState.packages.size;
      const completedCount = workspaceState.completedOperations.size;
      const failedCount = workspaceState.failedOperations.size;

      expect(completedCount + failedCount).toBe(totalPackages);

      // Verify no package is in both completed and failed
      const intersection = new Set(
        [...workspaceState.completedOperations].filter(pkg =>
          workspaceState.failedOperations.has(pkg)
        )
      );
      expect(intersection.size).toBe(0);

      // Verify all packages have consistent status
      for (const [packageName, packageInfo] of workspaceState.packages) {
        if (workspaceState.completedOperations.has(packageName)) {
          expect(packageInfo.status).toBe('completed');
        } else if (workspaceState.failedOperations.has(packageName)) {
          expect(packageInfo.status).toBe('failed');
        }
      }

      console.log(
        `📊 State consistency check: ${completedCount} completed, ${failedCount} failed, total: ${totalPackages}`
      );
    });
  });
});
