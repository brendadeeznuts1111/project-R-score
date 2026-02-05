#!/usr/bin/env bun
/**
 * Test Utilities and Helpers
 *
 * Shared utilities for all test types including setup, teardown, mocking, and common operations.
 */

import { spawn } from 'bun';
import { readFile, writeFile, mkdir, access, rm } from 'fs/promises';
import { join } from 'path';

export interface TestContext {
  tempDir: string;
  cleanup: () => Promise<void>;
  env: Record<string, string | undefined>;
}

export class TestHelpers {
  private static tempDirs: string[] = [];
  private static originalEnv: Record<string, string | undefined> = {};

  /**
   * Create a temporary test directory with cleanup
   */
  static async createTempDir(prefix: string = 'test-'): Promise<TestContext> {
    const tempDir = join('/tmp', `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

    await mkdir(tempDir, { recursive: true });
    this.tempDirs.push(tempDir);

    const cleanup = async () => {
      try {
        await rm(tempDir, { recursive: true, force: true });
      } catch (error) {
        console.warn(`Warning: Failed to cleanup temp dir ${tempDir}:`, error);
      }
    };

    return {
      tempDir,
      cleanup,
      env: { ...process.env }
    };
  }

  /**
   * Create test fixture files
   */
  static async createFixtureFile(dir: string, filename: string, content: string): Promise<string> {
    const filePath = join(dir, filename);
    await writeFile(filePath, content, 'utf-8');
    return filePath;
  }

  /**
   * Create test fixture directory structure
   */
  static async createFixtureStructure(dir: string, structure: Record<string, string | Record<string, any>>): Promise<void> {
    for (const [name, content] of Object.entries(structure)) {
      const path = join(dir, name);

      if (typeof content === 'string') {
        await writeFile(path, content, 'utf-8');
      } else {
        await mkdir(path, { recursive: true });
        await this.createFixtureStructure(path, content);
      }
    }
  }

  /**
   * Mock environment variables for testing
   */
  static mockEnvironment(overrides: Record<string, string>): () => void {
    // Store original values
    for (const [key, value] of Object.entries(overrides)) {
      this.originalEnv[key] = process.env[key];
      process.env[key] = value;
    }

    // Return cleanup function
    return () => {
      for (const key of Object.keys(overrides)) {
        if (this.originalEnv[key] !== undefined) {
          process.env[key] = this.originalEnv[key];
        } else {
          delete process.env[key];
        }
      }
    };
  }

  /**
   * Run a command and capture output
   */
  static async runCommand(command: string, options: {
    cwd?: string;
    env?: Record<string, string | undefined>;
    timeout?: number;
  } = {}): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }> {
    const { cwd = process.cwd(), env = process.env, timeout = 30000 } = options;

    const proc = spawn({
      cmd: ['bun', 'run', command],
      cwd,
      env,
      stdout: 'pipe',
      stderr: 'pipe'
    });

    let stdout = '';
    let stderr = '';

    // Read stdout
    if (proc.stdout) {
      const reader = proc.stdout.getReader();
      try {
        while (true) {
          const result = await reader.read();
          if (result.done) break;
          stdout += new TextDecoder().decode(result.value);
        }
      } finally {
        reader.releaseLock();
      }
    }

    // Read stderr
    if (proc.stderr) {
      const reader = proc.stderr.getReader();
      try {
        while (true) {
          const result = await reader.read();
          if (result.done) break;
          stderr += new TextDecoder().decode(result.value);
        }
      } finally {
        reader.releaseLock();
      }
    }

    const exitCode = await proc.exited;

    return {
      stdout,
      stderr,
      exitCode
    };
  }

  /**
   * Wait for a condition to be true
   */
  static async waitFor(condition: () => boolean | Promise<boolean>, timeout: number = 5000): Promise<void> {
    const start = Date.now();

    while (!await condition()) {
      if (Date.now() - start > timeout) {
        throw new Error(`Condition not met within ${timeout}ms`);
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Create a mock CI environment
   */
  static mockCIEnvironment(type: 'github' | 'gitlab' | 'circle' | 'jenkins' = 'github'): () => void {
    const ciEnv = this.getCIEnvironment(type);
    return this.mockEnvironment(ciEnv);
  }

  private static getCIEnvironment(type: string): Record<string, string> {
    switch (type) {
      case 'github':
        return {
          GITHUB_ACTIONS: 'true',
          GITHUB_REPOSITORY: 'test/repo',
          GITHUB_REF_NAME: 'main',
          GITHUB_SHA: 'abc123',
          CI: 'true'
        };
      case 'gitlab':
        return {
          GITLAB_CI: 'true',
          CI_PROJECT_NAME: 'test-project',
          CI_COMMIT_REF_NAME: 'main',
          CI_COMMIT_SHA: 'abc123',
          CI: 'true'
        };
      case 'circle':
        return {
          CIRCLECI: 'true',
          CIRCLE_PROJECT_REPONAME: 'test-repo',
          CIRCLE_BRANCH: 'main',
          CIRCLE_SHA1: 'abc123',
          CI: 'true'
        };
      case 'jenkins':
        return {
          JENKINS_URL: 'http://localhost:8080',
          JOB_NAME: 'test-job',
          BUILD_NUMBER: '123',
          CI: 'true'
        };
      default:
        return { CI: 'true' };
    }
  }

  /**
   * Cleanup all temporary directories
   */
  static async cleanupAll(): Promise<void> {
    for (const dir of this.tempDirs) {
      try {
        await rm(dir, { recursive: true, force: true });
      } catch (error) {
        console.warn(`Warning: Failed to cleanup temp dir ${dir}:`, error);
      }
    }
    this.tempDirs = [];
  }

  /**
   * Assert file exists
   */
  static async assertFileExists(path: string): Promise<void> {
    try {
      await access(path);
    } catch {
      throw new Error(`File does not exist: ${path}`);
    }
  }

  /**
   * Assert file content matches expected
   */
  static async assertFileContent(path: string, expected: string): Promise<void> {
    const content = await readFile(path, 'utf-8');
    if (content !== expected) {
      throw new Error(`File content mismatch for ${path}\nExpected: ${expected}\nActual: ${content}`);
    }
  }

  /**
   * Assert file contains text
   */
  static async assertFileContains(path: string, text: string): Promise<void> {
    const content = await readFile(path, 'utf-8');
    if (!content.includes(text)) {
      throw new Error(`File ${path} does not contain expected text: ${text}`);
    }
  }

  /**
   * Create a mock process for testing
   */
  static createMockProcess(): NodeJS.Process {
    const originalProcess = process;
    const mockProcess = {
      ...originalProcess,
      exit: () => {},
      argv: ['node', 'test'],
      env: { ...originalProcess.env },
      cwd: () => '/tmp/test',
      platform: 'darwin',
      arch: 'x64'
    } as any;

    return mockProcess;
  }

  /**
   * Restore original process
   */
  static restoreProcess(originalProcess: NodeJS.Process): void {
    Object.assign(process, originalProcess);
  }

  /**
   * Generate test data
   */
  static generateTestData(type: 'user' | 'project' | 'config', count: number = 1): any[] {
    const data: any[] = [];

    for (let i = 0; i < count; i++) {
      switch (type) {
        case 'user':
          data.push({
            id: i + 1,
            name: `Test User ${i + 1}`,
            email: `user${i + 1}@example.com`,
            createdAt: new Date().toISOString()
          });
          break;
        case 'project':
          data.push({
            id: i + 1,
            name: `Test Project ${i + 1}`,
            description: `Description for project ${i + 1}`,
            createdAt: new Date().toISOString()
          });
          break;
        case 'config':
          data.push({
            id: i + 1,
            name: `config-${i + 1}`,
            value: `value-${i + 1}`,
            type: 'string'
          });
          break;
      }
    }

    return data;
  }

  /**
   * Validate JSON schema
   */
  static validateJSONSchema(data: any, schema: any): boolean {
    // Simple schema validation - in a real implementation you'd use a library like ajv
    if (typeof schema !== 'object' || schema === null) {
      return true;
    }

    for (const [key, expectedType] of Object.entries(schema)) {
      if (!(key in data)) {
        return false;
      }

      const actualType = typeof data[key];
      if (actualType !== expectedType) {
        return false;
      }
    }

    return true;
  }

  /**
   * Measure execution time
   */
  static async measureTime<T>(fn: () => Promise<T> | T): Promise<{ result: T; time: number }> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();

    return {
      result,
      time: end - start
    };
  }

  /**
   * Create a test database connection (mock)
   */
  static createMockDatabase(): {
    query: Function;
    insert: Function;
    update: Function;
    delete: Function;
    cleanup: () => void;
  } {
    return {
      query: () => {},
      insert: () => {},
      update: () => {},
      delete: () => {},
      cleanup: () => {}
    };
  }

  /**
   * Create a mock HTTP server for testing
   */
  static createMockServer(port: number = 0): {
    server: any;
    url: string;
    responses: Map<string, any>;
    cleanup: () => void;
  } {
    const responses = new Map<string, any>();

    const server = Bun.serve({
      port,
      fetch(req) {
        const url = new URL(req.url);
        const response = responses.get(url.pathname);

        if (response) {
          return new Response(JSON.stringify(response), {
            headers: { 'Content-Type': 'application/json' }
          });
        }

        return new Response('Not Found', { status: 404 });
      }
    });

    return {
      server,
      url: `http://localhost:${server.port}`,
      responses,
      cleanup: () => server.stop()
    };
  }
}

// Export common test patterns
export const TEST_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  SEMVER: /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/
};

// Export common test data
export const TEST_DATA = {
  USER: {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    createdAt: '2024-01-01T00:00:00.000Z'
  },
  PROJECT: {
    id: 1,
    name: 'Test Project',
    description: 'A test project',
    createdAt: '2024-01-01T00:00:00.000Z'
  },
  CONFIG: {
    id: 1,
    name: 'test-config',
    value: 'test-value',
    type: 'string'
  }
};

// Export common assertions
export const ASSERTIONS = {
  isString: (value: any): value is string => typeof value === 'string',
  isNumber: (value: any): value is number => typeof value === 'number',
  isBoolean: (value: any): value is boolean => typeof value === 'boolean',
  isArray: (value: any): value is any[] => Array.isArray(value),
  isObject: (value: any): value is object => typeof value === 'object' && value !== null && !Array.isArray(value),
  isFunction: (value: any): value is Function => typeof value === 'function',
  isDate: (value: any): value is Date => value instanceof Date,
  isEmail: (value: string): boolean => TEST_PATTERNS.EMAIL.test(value),
  isUUID: (value: string): boolean => TEST_PATTERNS.UUID.test(value),
  isSemver: (value: string): boolean => TEST_PATTERNS.SEMVER.test(value),
  isUrl: (value: string): boolean => TEST_PATTERNS.URL.test(value)
};

export default TestHelpers;
