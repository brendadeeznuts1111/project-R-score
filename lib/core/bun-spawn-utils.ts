// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @see https://bun.com/reference/bun/sliceAnsi — Bun.sliceAnsi
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/guides/process/spawn-stdout — reading stdout
// lib/core/bun-spawn-utils.ts — Bun-specific spawn utilities with error handling

import {
  createSystemError,
  createValidationError,
  EnterpriseErrorCode,
  safeAsync,
  recordError,
} from './index';

/**
 * Spawn result with metadata
 */
export interface SpawnResult {
  success: boolean;
  pid?: number;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal?: string;
  durationMs: number;
}

/**
 * Spawn options
 */
export interface SafeSpawnOptions {
  /** Command timeout in milliseconds */
  timeoutMs?: number;
  /** Working directory */
  cwd?: string;
  /** Environment variables */
  env?: Record<string, string>;
  /** Validate binary exists before spawning */
  validateBinary?: boolean;
  /** Service name for error tracking */
  serviceName?: string;
  /** Maximum stdout size in bytes (for memory safety) */
  maxOutputSize?: number;
}

// ============================================================================
// Binary Validation
// ============================================================================

/**
 * Validate that a binary exists in PATH
 *
 * @example
 * ```typescript
 * const bunPath = validateBinaryExists('bun');
 * if (!bunPath) {
 *   console.error('Bun is not installed');
 * }
 * ```
 */
export function validateBinaryExists(command: string): string | null {
  try {
    const path = Bun.which(command);
    if (path) {
      console.info(`✅ ${command}: ${path}`);
      return path;
    } else {
      console.info(`❌ Missing: ${command}`);
      return null;
    }
  } catch (error) {
    recordError(error instanceof Error ? error : new Error(String(error)), {
      service: 'binary-validation',
      operation: 'validate_binary',
      command,
    });
    return null;
  }
}

/**
 * Validate binary or throw error
 */
export function validateBinaryOrThrow(command: string): string {
  const path = validateBinaryExists(command);
  if (!path) {
    throw createSystemError(
      EnterpriseErrorCode.SYSTEM_CONFIGURATION_INVALID,
      `Required binary not found: ${command}`,
      { command, path: Bun.which(command) }
    );
  }
  return path;
}

// ============================================================================
// Safe Spawn with Timeout and Memory Limits
// ============================================================================

/**
 * Safely spawn a process with timeout and error handling
 *
 * @example
 * ```typescript
 * const result = await safeSpawn(
 *   ['bun', 'test'],
 *   { timeoutMs: 5000, validateBinary: true }
 * );
 *
 * if (result.success) {
 *   console.info('Output:', result.stdout);
 * }
 * ```
 */
export async function safeSpawn(
  cmd: string[],
  options: SafeSpawnOptions = {}
): Promise<SpawnResult> {
  const {
    timeoutMs = 30000,
    cwd,
    env,
    validateBinary = true,
    serviceName = 'safe-spawn',
    maxOutputSize = 10 * 1024 * 1024, // 10MB default
  } = options;

  const startTime = performance.now();

  // Validate binary if requested
  if (validateBinary && cmd[0]) {
    const binaryPath = validateBinaryExists(cmd[0]);
    if (!binaryPath) {
      return {
        success: false,
        exitCode: null,
        stdout: '',
        stderr: `Binary not found: ${cmd[0]}`,
        durationMs: performance.now() - startTime,
      };
    }
  }

  try {
    const process_ = Bun.spawn(cmd, {
      stdout: 'pipe',
      stderr: 'pipe',
      cwd,
      env,
    });

    // Set up timeout
    const timeoutId = setTimeout(() => {
      process_.kill('SIGTERM');
      recordError(new Error(`Spawn timeout after ${timeoutMs}ms`), {
        service: serviceName,
        operation: 'spawn_timeout',
        command: cmd.join(' '),
        timeoutMs,
        pid: process_.pid,
      });
    }, timeoutMs);

    // Collect output with size limit
    let stdout = '';
    let stderr = '';
    let stdoutSize = 0;
    let stderrSize = 0;

    // Read stdout
    if (process_.stdout) {
      for await (const chunk of process_.stdout) {
        stdoutSize += chunk.length;
        if (stdoutSize > maxOutputSize) {
          process_.kill('SIGTERM');
          clearTimeout(timeoutId);
          throw createValidationError(
            EnterpriseErrorCode.VALIDATION_CONSTRAINT_VIOLATION,
            `Stdout exceeded maximum size of ${maxOutputSize} bytes`,
            'stdout',
            { size: stdoutSize, maxSize: maxOutputSize }
          );
        }
        stdout += new TextDecoder().decode(chunk);
      }
    }

    // Read stderr
    if (process_.stderr) {
      for await (const chunk of process_.stderr) {
        stderrSize += chunk.length;
        if (stderrSize > maxOutputSize) {
          process_.kill('SIGTERM');
          clearTimeout(timeoutId);
          throw createValidationError(
            EnterpriseErrorCode.VALIDATION_CONSTRAINT_VIOLATION,
            `Stderr exceeded maximum size of ${maxOutputSize} bytes`,
            'stderr',
            { size: stderrSize, maxSize: maxOutputSize }
          );
        }
        stderr += new TextDecoder().decode(chunk);
      }
    }

    // Wait for process to complete
    const exitCode = await process_.exited;
    clearTimeout(timeoutId);

    const durationMs = performance.now() - startTime;

    // Record error if process failed
    if (exitCode !== 0) {
      recordError(new Error(`Process exited with code ${exitCode}`), {
        service: serviceName,
        operation: 'spawn_exit_error',
        command: cmd.join(' '),
        exitCode,
        stderr: stderr.slice(0, 1000), // Limit error context
      });
    }

    return {
      success: exitCode === 0,
      pid: process_.pid,
      stdout: stdout.slice(0, maxOutputSize),
      stderr: stderr.slice(0, maxOutputSize),
      exitCode,
      durationMs,
    };
  } catch (error) {
    const durationMs = performance.now() - startTime;

    recordError(error instanceof Error ? error : new Error(String(error)), {
      service: serviceName,
      operation: 'spawn_failed',
      command: cmd.join(' '),
    });

    return {
      success: false,
      exitCode: null,
      stdout: '',
      stderr: error instanceof Error ? error.message : String(error),
      durationMs,
    };
  }
}

/**
 * Memory-efficient spawn that streams output with timeout
 *
 * @example
 * ```typescript
 * await streamSpawn(
 *   ['bun', 'test'],
 *   (chunk) => process.stdout.write(chunk),
 *   { timeoutMs: 5000 }
 * );
 * ```
 */
export async function streamSpawn(
  cmd: string[],
  onStdout: (chunk: Uint8Array) => void,
  options: SafeSpawnOptions = {}
): Promise<Omit<SpawnResult, 'stdout'>> {
  const {
    timeoutMs = 30000,
    cwd,
    env,
    validateBinary = true,
    serviceName = 'stream-spawn',
  } = options;

  const startTime = performance.now();

  // Validate binary
  if (validateBinary && cmd[0]) {
    const binaryPath = validateBinaryExists(cmd[0]);
    if (!binaryPath) {
      return {
        success: false,
        exitCode: null,
        stderr: `Binary not found: ${cmd[0]}`,
        durationMs: performance.now() - startTime,
      };
    }
  }

  try {
    const process_ = Bun.spawn(cmd, {
      stdout: 'pipe',
      stderr: 'pipe',
      cwd,
      env,
    });

    // Set up timeout
    const timeoutId = setTimeout(() => {
      process_.kill('SIGTERM');
    }, timeoutMs);

    let stderr = '';

    // Stream stdout
    if (process_.stdout) {
      for await (const chunk of process_.stdout) {
        onStdout(chunk);
      }
    }

    // Collect stderr
    if (process_.stderr) {
      for await (const chunk of process_.stderr) {
        stderr += new TextDecoder().decode(chunk);
      }
    }

    const exitCode = await process_.exited;
    clearTimeout(timeoutId);

    const durationMs = performance.now() - startTime;

    return {
      success: exitCode === 0,
      pid: process_.pid,
      stderr: stderr.slice(0, 10000),
      exitCode,
      durationMs,
    };
  } catch (error) {
    const durationMs = performance.now() - startTime;

    recordError(error instanceof Error ? error : new Error(String(error)), {
      service: serviceName,
      operation: 'stream_spawn_failed',
      command: cmd.join(' '),
    });

    return {
      success: false,
      exitCode: null,
      stderr: error instanceof Error ? error.message : String(error),
      durationMs,
    };
  }
}

/**
 * Check if running in a TTY
 */
export function isTTY(): boolean {
  return process.stdin.isTTY === true;
}

/**
 * Get terminal size
 */
export function getTerminalSize(): { columns: number; rows: number } {
  return {
    columns: process.stdout.columns ?? 80,
    rows: process.stdout.rows ?? 24,
  };
}

// Entry guard for testing
if (import.meta.main) {
  console.info('🔧 Bun Spawn Utils Demo\n');

  // Test binary validation
  console.info('1. Binary Validation:');
  validateBinaryExists('bun');
  validateBinaryExists('nonexistent-binary-12345');

  // Test ANSI width (Bun native: stringWidth)
  console.info('\n2. ANSI Width:');
  const colored = '\x1b[31mred\x1b[0m';
  console.info(`  String: "${colored}"`);
  console.info(`  Visual width: ${Bun.stringWidth(colored)}`);
  console.info(`  Raw length: ${colored.length}`);

  // Test truncation (Bun native: sliceAnsi)
  console.info('\n3. ANSI Truncation:');
  const truncated = Bun.sliceAnsi('\x1b[31mhello world\x1b[0m', 0, 5);
  console.info(`  Truncated: "${truncated}"`);

  // Test safe spawn
  console.info('\n4. Safe Spawn:');
  const result = await safeSpawn(['bun', '--version'], {
    timeoutMs: 5000,
    validateBinary: true,
  });
  console.info(`  Success: ${result.success}`);
  console.info(`  Exit code: ${result.exitCode}`);
  console.info(`  Duration: ${result.durationMs.toFixed(2)}ms`);
  console.info(`  Output: ${result.stdout.trim()}`);

  console.info('\n✅ Demo complete!');
}
