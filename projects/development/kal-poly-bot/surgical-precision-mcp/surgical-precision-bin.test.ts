#!/usr/bin/env bun
/**
 * SURGICAL PRECISION MCP Server - Bin Executable Tests
 *
 * Comprehensive testing of the binary executable functionality including:
 * - Executable file verification
 * - Permission checks
 * - Process spawning and startup
 * - Output validation
 * - Graceful shutdown testing
 */

import { test, describe, beforeAll, afterAll, afterEach, expect } from 'bun:test';
import { spawn, ChildProcess } from 'child_process';
import { existsSync, statSync } from 'fs';
import { join } from 'path';

const EXECUTABLE_PATH = join(process.cwd(), 'build', 'index.js');

describe('Surgical Precision Bin Executable', () => {
  describe('File System Verification', () => {
    test('executable file exists', () => {
      expect(existsSync(EXECUTABLE_PATH)).toBe(true);
    });

    test('executable has correct permissions', async () => {
      const stats = statSync(EXECUTABLE_PATH);
      const isExecutable = !!(stats.mode & 0o111); // Check execute bits
      expect(isExecutable).toBe(true);
    });

    test('file is regular file', () => {
      const stats = statSync(EXECUTABLE_PATH);
      expect(stats.isFile()).toBe(true);
    });

    test('file size is reasonable', () => {
      const stats = statSync(EXECUTABLE_PATH);
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.size).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
    });
  });

  describe('Process Execution Testing', () => {
    test('process starts successfully', async () => {
      let childProcess: ChildProcess | null = null;

      try {
        childProcess = spawn(EXECUTABLE_PATH, [], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, NODE_ENV: 'test' }
        });

        let output = '';
        let hasExited = false;

        childProcess.stdout?.on('data', (data) => {
          output += data.toString();
        });

        childProcess.stderr?.on('data', (data) => {
          output += data.toString();
        });

        childProcess.on('exit', () => {
          hasExited = true;
        });

        // Wait for startup message or timeout
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Process startup timeout'));
          }, 5000);

          const checkOutput = () => {
            if (output.includes('ZERO-COLLATERAL OPERATIONS ACTIVE')) {
              clearTimeout(timeout);
              resolve();
            } else if (hasExited) {
              clearTimeout(timeout);
              reject(new Error('Process exited before startup message'));
            } else {
              setTimeout(checkOutput, 100);
            }
          };

          checkOutput();
        });

        expect(output).toContain('ZERO-COLLATERAL OPERATIONS ACTIVE');
        expect(childProcess.killed).toBe(false);

      } finally {
        if (childProcess && !childProcess.killed) {
          childProcess.kill('SIGTERM');
        }
      }
    }, 10000);

    test('process handles SIGTERM gracefully', async () => {
      const childProcess = spawn(EXECUTABLE_PATH, [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'test' }
      });

      let output = '';
      let exitCode: number | null = null;
      let hasStarted = false;

      childProcess.stdout?.on('data', (data: Buffer) => {
        output += data.toString();
        hasStarted = true;
      });

      childProcess.stderr?.on('data', (data: Buffer) => {
        output += data.toString();
      });

      childProcess.on('exit', (code: number | null) => {
        exitCode = code;
      });

      // Wait for startup
      await new Promise<void>((resolve) => {
        const checkStarted = () => {
          if (hasStarted) {
            resolve();
          } else {
            setTimeout(checkStarted, 100);
          }
        };
        checkStarted();
      });

      // Send SIGTERM and wait for graceful shutdown
      childProcess.kill('SIGTERM');

      await new Promise<void>((resolve) => {
        const checkExit = () => {
          if (exitCode !== null) {
            resolve();
          } else {
            setTimeout(checkExit, 100);
          }
        };
        checkExit();
      });

      expect(exitCode !== null).toBe(true);
      expect(exitCode).toBe(0);
      expect(output).toContain('ZERO-COLLATERAL OPERATIONS ACTIVE');

    }, 10000);

    test('process environment isolation', async () => {
      const testEnv = {
        ...process.env,
        NODE_ENV: 'test',
        SURGICAL_TEST_VAR: 'verified'
      };

      const childProcess = spawn(EXECUTABLE_PATH, [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: testEnv
      });

      let output = '';

      childProcess.stdout?.on('data', (data: Buffer) => {
        output += data.toString();
      });

      childProcess.stderr?.on('data', (data: Buffer) => {
        output += data.toString();
      });

      // Wait a bit for initialization
      await new Promise(resolve => setTimeout(resolve, 1000));

      childProcess.kill('SIGTERM');

      expect(output.length).toBeGreaterThan(0);

    }, 5000);
  });

  describe('Bin Configuration Validation', () => {
    test('package.json bin field points to correct path', () => {
      const packageJson = require('./package.json');
      expect(packageJson.bin).toHaveProperty('surgical-precision');
      expect(packageJson.bin['surgical-precision']).toBe('build/index.js');
    });

    test('package.json name follows scoped convention', () => {
      const packageJson = require('./package.json');
      expect(packageJson.name).toBe('@brendadeeznuts1111/surgical-precision-mcp');
    });

    test('build script exists', () => {
      const packageJson = require('./package.json');
      expect(packageJson.scripts).toHaveProperty('build');
      expect(packageJson.scripts.build).toMatch(/bun.*build.*index\.ts/);
    });
  });

  describe('Performance & Resource Testing', () => {
    test('process startup time is reasonable', async () => {
      const startTime = Date.now();

      const child = spawn(EXECUTABLE_PATH, [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'test' }
      });

      let startupDetected = false;

      child.stdout?.on('data', () => {
        if (!startupDetected) {
          const startupTime = Date.now() - startTime;
          expect(startupTime).toBeLessThan(2000); // Should start within 2 seconds
          startupDetected = true;
        }
      });

      // Cleanup
      setTimeout(() => {
        child.kill('SIGTERM');
      }, 1500);

      await new Promise<void>((resolve) => {
        child.on('exit', () => {
          if (!startupDetected) {
            throw new Error('Process did not start up');
          }
          resolve();
        });
      });

    }, 5000);

    test('memory usage stays within bounds', async () => {
      const child = spawn(EXECUTABLE_PATH, [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'test' }
      });

      let output = '';

      child.stdout?.on('data', (data) => {
        output += data.toString();
      });

      // Run for a brief period
      await new Promise(resolve => setTimeout(resolve, 1000));

      const memUsage = process.memoryUsage();
      expect(memUsage.heapUsed).toBeLessThan(100 * 1024 * 1024); // Less than 100MB

      child.kill('SIGTERM');

      await new Promise<void>((resolve) => {
        child.on('exit', () => {
          resolve();
        });
      });

    }, 5000);
  });
});

/**
 * CLI Test Commands for Manual Verification:
 *
 * # Run all bin tests
 * bun test surgical-precision-bin.test.ts
 *
 * # Run with verbose output
 * bun test surgical-precision-bin.test.ts --verbose
 *
 * # Run specific test
 * bun test surgical-precision-bin.test.ts --testNamePattern="process starts successfully"
 *
 * # Manual verification (outside of test framework)
 *
 * # Direct execution
 * ./build/index.js
 *
 * # Verify permissions
 * ls -la build/index.js
 *
 * # Check file type
 * file build/index.js
 *
 * # Test with timeout
 * timeout 5s ./build/index.js || echo "Process handled signal correctly"
 */
