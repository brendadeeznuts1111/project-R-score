/**
 * @fileoverview Test harness utilities for Bun integration tests
 * @module test/harness
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Get the bun executable path
 */
export function bunExe(): string {
  return process.execPath;
}

/**
 * Get sanitized environment for test processes
 */
export const bunEnv: NodeJS.ProcessEnv = {
  ...process.env,
  // Remove potentially interfering env vars
  BUN_DEBUG: undefined,
  BUN_DEBUG_QUIET_LOGS: undefined,
  NODE_ENV: 'test',
};

/**
 * Normalize output for snapshot testing
 * - Trims whitespace
 * - Normalizes line endings
 * - Optionally replaces temp dir paths
 */
export function normalizeBunSnapshot(
  output: string,
  tempDir?: TempDir | string
): string {
  let normalized = output.trim().replace(/\r\n/g, '\n');

  // Replace temp directory path with placeholder
  if (tempDir) {
    const dirPath = typeof tempDir === 'string' ? tempDir : String(tempDir);
    normalized = normalized.replaceAll(dirPath, '<TEMP_DIR>');
  }

  // Normalize timestamps (ISO format)
  normalized = normalized.replace(
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g,
    '<TIMESTAMP>'
  );

  // Normalize file paths for cross-platform
  normalized = normalized.replace(/\\/g, '/');

  return normalized;
}

/**
 * Temporary directory with auto-cleanup via Symbol.dispose
 */
export class TempDir {
  private path: string;
  private disposed = false;

  private constructor(path: string) {
    this.path = path;
  }

  /**
   * Create a temp directory with optional files
   */
  static async create(
    prefix: string,
    files?: Record<string, string>
  ): Promise<TempDir> {
    const path = await mkdtemp(join(tmpdir(), `${prefix}-`));
    const dir = new TempDir(path);

    if (files) {
      await dir.writeFiles(files);
    }

    return dir;
  }

  /**
   * Write files to the temp directory
   */
  async writeFiles(files: Record<string, string>): Promise<void> {
    for (const [name, content] of Object.entries(files)) {
      const filePath = join(this.path, name);
      await Bun.write(filePath, content);
    }
  }

  /**
   * Read a file from the temp directory
   */
  async readFile(name: string): Promise<string> {
    return Bun.file(join(this.path, name)).text();
  }

  /**
   * Check if a file exists
   */
  async exists(name: string): Promise<boolean> {
    return Bun.file(join(this.path, name)).exists();
  }

  /**
   * Get full path to a file
   */
  file(name: string): string {
    return join(this.path, name);
  }

  /**
   * Get the directory path
   */
  toString(): string {
    return this.path;
  }

  /**
   * Cleanup - Symbol.dispose for "using" keyword
   */
  async [Symbol.asyncDispose](): Promise<void> {
    if (!this.disposed) {
      this.disposed = true;
      await rm(this.path, { recursive: true, force: true });
    }
  }

  /**
   * Manual cleanup
   */
  async cleanup(): Promise<void> {
    await this[Symbol.asyncDispose]();
  }
}

/**
 * Create a temp directory (convenience function)
 */
export async function tempDir(
  prefix: string,
  files?: Record<string, string>
): Promise<TempDir> {
  return TempDir.create(prefix, files);
}

/**
 * Spawn a bun process and collect output
 */
export async function runBun(
  args: string[],
  options?: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    stdin?: string;
    timeout?: number;
  }
): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  const timeout = options?.timeout ?? 5000; // Default 5 seconds (matches Bun test default)
  const proc = Bun.spawn({
    cmd: [bunExe(), ...args],
    cwd: options?.cwd,
    env: { ...bunEnv, ...options?.env },
    stdin: options?.stdin ? 'pipe' : 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
  });

  if (options?.stdin) {
    proc.stdin.write(options.stdin);
    proc.stdin.end();
  }

  // Create timeout promise
  const timeoutPromise = new Promise<{ stdout: string; stderr: string; exitCode: number }>((_, reject) => {
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error(`Process timed out after ${timeout}ms: ${args.join(' ')}`));
    }, timeout);
    
    // Clear timeout if process exits
    proc.exited.then(() => clearTimeout(timer)).catch(() => clearTimeout(timer));
  });

  try {
    const [stdout, stderr, exitCode] = await Promise.race([
      Promise.all([
        proc.stdout.text(),
        proc.stderr.text(),
        proc.exited,
      ]),
      timeoutPromise,
    ]);

    return { stdout, stderr, exitCode };
  } catch (error) {
    // Ensure process is killed on timeout
    try {
      proc.kill();
    } catch {
      // Ignore kill errors
    }
    throw error;
  }
}

/**
 * Run a CLI command from the project
 */
export async function runCli(
  script: string,
  args: string[] = [],
  options?: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    timeout?: number;
  }
): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  return runBun(['run', script, ...args], options);
}

/**
 * Assert process succeeded
 */
export function assertSuccess(result: { exitCode: number; stderr: string }): void {
  if (result.exitCode !== 0) {
    throw new Error(`Process failed with exit code ${result.exitCode}\nstderr: ${result.stderr}`);
  }
}

/**
 * Wait for a condition with timeout
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) return;
    await Bun.sleep(interval);
  }
  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Create a mock HTTP server for testing
 */
export async function mockServer(
  handler: (req: Request) => Response | Promise<Response>,
  port = 0
): Promise<{
  url: string;
  close: () => void;
}> {
  const server = Bun.serve({
    port,
    fetch: handler,
  });

  return {
    url: `http://localhost:${server.port}`,
    close: () => server.stop(),
  };
}
