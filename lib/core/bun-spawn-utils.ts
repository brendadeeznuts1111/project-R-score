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

/**
 * ANSI width result
 */
export interface AnsiWidthResult {
  /** Visual width (accounts for ANSI codes) */
  width: number;
  /** Raw string length */
  length: number;
  /** Has ANSI codes */
  hasAnsi: boolean;
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
      console.log(`✅ ${command}: ${path}`);
      return path;
    } else {
      console.log(`❌ Missing: ${command}`);
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
 *   console.log('Output:', result.stdout);
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
      recordError(
        new Error(`Spawn timeout after ${timeoutMs}ms`),
        {
          service: serviceName,
          operation: 'spawn_timeout',
          command: cmd.join(' '),
          timeoutMs,
          pid: process_.pid,
        }
      );
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
      recordError(
        new Error(`Process exited with code ${exitCode}`),
        {
          service: serviceName,
          operation: 'spawn_exit_error',
          command: cmd.join(' '),
          exitCode,
          stderr: stderr.slice(0, 1000), // Limit error context
        }
      );
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

// ============================================================================
// ANSI Width Utilities
// ============================================================================

/**
 * Calculate ANSI-aware string width
 * 
 * @example
 * ```typescript
 * const result = ansiStringWidth('\x1b[31mred\x1b[0m');
 * console.log(result.width); // 3 (not 9)
 * console.log(result.length); // 9
 * ```
 */
export function ansiStringWidth(str: string): AnsiWidthResult {
  try {
    // Use Bun's built-in stringWidth if available
    const width = (Bun as any).stringWidth?.(str) ?? str.length;
    
    // Check for ANSI codes
    const ansiPattern = /\x1b\[[0-9;]*m/g;
    const hasAnsi = ansiPattern.test(str);
    
    return {
      width,
      length: str.length,
      hasAnsi,
    };
  } catch (error) {
    recordError(error instanceof Error ? error : new Error(String(error)), {
      service: 'ansi-utils',
      operation: 'string_width',
      input: str,
    });
    
    // Fallback: strip ANSI and return length
    const stripped = str.replace(/\x1b\[[0-9;]*m/g, '');
    return {
      width: stripped.length,
      length: str.length,
      hasAnsi: str.length !== stripped.length,
    };
  }
}

/**
 * Strip ANSI codes from string
 */
export function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Truncate string to visual width (ANSI-aware)
 * 
 * @example
 * ```typescript
 * truncateAnsi('\x1b[31mhello world\x1b[0m', 5);
 * // '\x1b[31mhello\x1b[0m' (preserves color)
 * ```
 */
export function truncateAnsi(str: string, maxWidth: number): string {
  const { width } = ansiStringWidth(str);
  
  if (width <= maxWidth) {
    return str;
  }

  // Simple truncation (preserves ANSI at start)
  let result = '';
  let currentWidth = 0;
  let inAnsi = false;

  for (const char of str) {
    if (char === '\x1b') {
      inAnsi = true;
      result += char;
      continue;
    }

    if (inAnsi) {
      result += char;
      if (char === 'm') {
        inAnsi = false;
      }
      continue;
    }

    if (currentWidth >= maxWidth) {
      break;
    }

    result += char;
    currentWidth++;
  }

  // Reset ANSI if we were in a color
  if (!inAnsi && str.includes('\x1b[')) {
    result += '\x1b[0m';
  }

  return result;
}

// ============================================================================
// Convenience Exports
// ============================================================================

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
  console.log('🔧 Bun Spawn Utils Demo\n');

  // Test binary validation
  console.log('1. Binary Validation:');
  validateBinaryExists('bun');
  validateBinaryExists('nonexistent-binary-12345');

  // Test ANSI width
  console.log('\n2. ANSI Width:');
  const colored = '\x1b[31mred\x1b[0m';
  const widthResult = ansiStringWidth(colored);
  console.log(`  String: "${colored}"`);
  console.log(`  Visual width: ${widthResult.width}`);
  console.log(`  Raw length: ${widthResult.length}`);
  console.log(`  Has ANSI: ${widthResult.hasAnsi}`);

  // Test truncation
  console.log('\n3. ANSI Truncation:');
  const truncated = truncateAnsi('\x1b[31mhello world\x1b[0m', 5);
  console.log(`  Truncated: "${truncated}"`);

  // Test safe spawn
  console.log('\n4. Safe Spawn:');
  const result = await safeSpawn(['bun', '--version'], {
    timeoutMs: 5000,
    validateBinary: true,
  });
  console.log(`  Success: ${result.success}`);
  console.log(`  Exit code: ${result.exitCode}`);
  console.log(`  Duration: ${result.durationMs.toFixed(2)}ms`);
  console.log(`  Output: ${result.stdout.trim()}`);

  console.log('\n✅ Demo complete!');
}
