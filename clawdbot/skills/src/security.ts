#!/usr/bin/env bun
/**
 * src/security.ts
 * Security utilities for skill execution
 * - Null byte injection protection
 * - Command validation
 * - Safe file operations
 */

// ═══════════════════════════════════════════════════════════════════════════
// Input Validation
// ═══════════════════════════════════════════════════════════════════════════

export interface ValidationResult {
  valid: boolean;
  issues: string[];
}

export function validateInput(input: string): ValidationResult {
  const issues: string[] = [];

  // Check for null bytes (CWE-158)
  if (input.includes("\x00")) {
    issues.push("Null byte injection attempt blocked");
  }

  // Check for shell metacharacters
  const shellMeta = /[;&|`$(){}[\]<>]/;
  if (shellMeta.test(input)) {
    issues.push("Shell metacharacters detected");
  }

  // Check for path traversal
  if (input.includes("..")) {
    issues.push("Path traversal attempt detected");
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function validateCommand(command: string[]): ValidationResult {
  const issues: string[] = [];

  for (const arg of command) {
    const result = validateInput(arg);
    issues.push(...result.issues);
  }

  // Check for dangerous commands
  const dangerous = ["rm -rf", "mkfs", "dd if=", ":(){ :", "chmod 777"];
  const cmdStr = command.join(" ");
  for (const pattern of dangerous) {
    if (cmdStr.includes(pattern)) {
      issues.push(`Dangerous command pattern: ${pattern}`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Safe Command Execution
// ═══════════════════════════════════════════════════════════════════════════

export interface SafeExecResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export function safeSpawnSync(
  command: string[],
  options: { timeout?: number; cwd?: string } = {}
): SafeExecResult {
  const start = performance.now();

  // Validate command
  const validation = validateCommand(command);
  if (!validation.valid) {
    return {
      success: false,
      exitCode: 1,
      stdout: "",
      stderr: `Security: ${validation.issues.join(", ")}`,
      durationMs: performance.now() - start,
    };
  }

  try {
    const result = Bun.spawnSync(command, {
      cwd: options.cwd,
      timeout: options.timeout || 30000,
    });

    return {
      success: result.exitCode === 0,
      exitCode: result.exitCode,
      stdout: result.stdout.toString(),
      stderr: result.stderr.toString(),
      durationMs: performance.now() - start,
    };
  } catch (error) {
    return {
      success: false,
      exitCode: 1,
      stdout: "",
      stderr: error instanceof Error ? error.message : "Unknown error",
      durationMs: performance.now() - start,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Safe File Operations
// ═══════════════════════════════════════════════════════════════════════════

export async function safeWriteFile(
  path: string,
  content: string | Uint8Array,
  options: { mode?: number } = {}
): Promise<{ success: boolean; error?: string }> {
  // Validate path
  const pathValidation = validateInput(path);
  if (!pathValidation.valid) {
    return {
      success: false,
      error: `Invalid path: ${pathValidation.issues.join(", ")}`,
    };
  }

  try {
    await Bun.write(path, content, {
      mode: options.mode || 0o644,
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Write failed",
    };
  }
}

export async function safeReadFile(
  path: string
): Promise<{ success: boolean; content?: string; error?: string }> {
  const pathValidation = validateInput(path);
  if (!pathValidation.valid) {
    return {
      success: false,
      error: `Invalid path: ${pathValidation.issues.join(", ")}`,
    };
  }

  try {
    const file = Bun.file(path);
    if (!(await file.exists())) {
      return { success: false, error: "File not found" };
    }

    // Check file size (limit to 100MB for safety)
    if (file.size > 100 * 1024 * 1024) {
      return { success: false, error: "File too large (>100MB)" };
    }

    const content = await file.text();
    return { success: true, content };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Read failed",
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Skill Execution with Security
// ═══════════════════════════════════════════════════════════════════════════

export interface SkillExecOptions {
  timeout?: number;
  cwd?: string;
  env?: Record<string, string>;
  maxOutputSize?: number;
}

export function executeSkillBinary(
  binary: string,
  args: string[] = [],
  options: SkillExecOptions = {}
): SafeExecResult {
  const command = [binary, ...args];

  // Validate all inputs
  const validation = validateCommand(command);
  if (!validation.valid) {
    return {
      success: false,
      exitCode: 1,
      stdout: "",
      stderr: `Security blocked: ${validation.issues.join(", ")}`,
      durationMs: 0,
    };
  }

  const start = performance.now();

  try {
    const result = Bun.spawnSync(command, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      timeout: options.timeout || 30000,
    });

    let stdout = result.stdout.toString();
    let stderr = result.stderr.toString();

    // Truncate output if too large
    const maxSize = options.maxOutputSize || 1024 * 1024; // 1MB default
    if (stdout.length > maxSize) {
      stdout = stdout.slice(0, maxSize) + "\n... (truncated)";
    }
    if (stderr.length > maxSize) {
      stderr = stderr.slice(0, maxSize) + "\n... (truncated)";
    }

    return {
      success: result.exitCode === 0,
      exitCode: result.exitCode,
      stdout,
      stderr,
      durationMs: performance.now() - start,
    };
  } catch (error) {
    return {
      success: false,
      exitCode: 1,
      stdout: "",
      stderr: error instanceof Error ? error.message : "Execution failed",
      durationMs: performance.now() - start,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Security Report
// ═══════════════════════════════════════════════════════════════════════════

export function displaySecurityCheck() {
  console.log("\n🔒 Security Configuration");
  console.log("─".repeat(50));

  const checks = [
    {
      Check: "Bun Version",
      Status: Bun.version >= "1.3.6" ? "✅" : "⚠️",
      Value: Bun.version,
    },
    {
      Check: "TLS Validation",
      Status: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0" ? "✅" : "❌",
      Value: process.env.NODE_TLS_REJECT_UNAUTHORIZED || "enabled",
    },
    {
      Check: "Null Byte Protection",
      Status: "✅",
      Value: "enforced",
    },
    {
      Check: "Command Validation",
      Status: "✅",
      Value: "active",
    },
  ];

  console.log(Bun.inspect.table(checks, { colors: true }));
}

export default {
  validateInput,
  validateCommand,
  safeSpawnSync,
  safeWriteFile,
  safeReadFile,
  executeSkillBinary,
  displaySecurityCheck,
};
