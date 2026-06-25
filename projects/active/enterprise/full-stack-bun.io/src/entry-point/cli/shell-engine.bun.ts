#!/usr/bin/env bun
import { spawn, which, inspect } from "bun";
import { join, dirname, basename } from "path";
import { mkdir, chmod, unlink } from "fs/promises";
import { structuredLog, SecurityAuditor, PerformanceMonitor } from "../../shared/utils";

interface ShellExecutionResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  command: string;
  timestamp: string;
  pid?: number;
}

interface ShellSecurityScan {
  safe: boolean;
  vulnerabilities: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    type: string;
    description: string;
    line?: number;
  }>;
  warnings: string[];
}

class ShellExecutionEngine {
  private securityAuditor: SecurityAuditor;
  private performanceMonitor: PerformanceMonitor;
  private tempDir: string;

  constructor() {
    this.securityAuditor = new SecurityAuditor();
    this.performanceMonitor = new PerformanceMonitor();
    this.tempDir = join(process.cwd(), '.shell-temp');
    this.ensureTempDir();
  }

  async executeScript(scriptContent: string, scriptName: string = 'script.sh', options: {
    cwd?: string;
    env?: Record<string, string>;
    timeout?: number;
  } = {}): Promise<ShellExecutionResult> {
    const startTime = performance.now();

    try {
      // Security scan
      const securityResult = await this.scanScriptSecurity(scriptContent, scriptName);
      if (!securityResult.safe) {
        throw new Error(`Security scan failed: ${inspect(securityResult.vulnerabilities, { colors: true })}`);
      }

      // Write script to temporary file
      const scriptPath = join(this.tempDir, scriptName);
      await Bun.write(scriptPath, scriptContent);
      await chmod(scriptPath, 0o755); // Make executable

      // Resolve Bun executable
      const bunPath = which('bun', {
        PATH: process.env.PATH,
        cwd: options.cwd || process.cwd()
      });

      if (!bunPath) {
        throw new Error('Bun executable not found in PATH');
      }

      // Execute using Bun Shell
      const proc = spawn({
        cmd: [bunPath, scriptPath],
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...options.env },
        stdout: 'pipe',
        stderr: 'pipe',
        stdin: 'inherit'
      });

      // Handle timeout
      let timeoutId: Timer | null = null;
      if (options.timeout) {
        timeoutId = setTimeout(() => {
          proc.kill();
        }, options.timeout);
      }

      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited
      ]);

      // Clear timeout if completed
      if (timeoutId) clearTimeout(timeoutId);

      const duration = performance.now() - startTime;

      const result: ShellExecutionResult = {
        success: exitCode === 0,
        exitCode,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        duration,
        command: `${bunPath} ${scriptPath}`,
        timestamp: new Date().toISOString(),
        pid: proc.pid
      };

      // Log performance metrics
      this.performanceMonitor.recordMetric('shell_execution_duration', duration, {
        script: scriptName,
        exitCode,
        success: result.success
      });

      // Cleanup temporary file
      await this.cleanupScript(scriptPath);

      return result;

    } catch (error) {
      const duration = performance.now() - startTime;

      return {
        success: false,
        exitCode: -1,
        stdout: '',
        stderr: error.message,
        duration,
        command: `bun ${scriptName}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  async executeCommand(command: string, args: string[] = [], options: {
    cwd?: string;
    env?: Record<string, string>;
    timeout?: number;
  } = {}): Promise<ShellExecutionResult> {
    const startTime = performance.now();

    try {
      // Security check for command
      const securityCheck = await this.securityAuditor.scanCommand(command, args);
      if (!securityCheck.safe) {
        throw new Error(`Command security check failed: ${inspect(securityCheck.issues, { colors: true })}`);
      }

      const proc = spawn({
        cmd: [command, ...args],
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...options.env },
        stdout: 'pipe',
        stderr: 'pipe',
        stdin: 'inherit'
      });

      // Handle timeout
      let timeoutId: Timer | null = null;
      if (options.timeout) {
        timeoutId = setTimeout(() => {
          proc.kill();
        }, options.timeout);
      }

      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited
      ]);

      if (timeoutId) clearTimeout(timeoutId);

      const duration = performance.now() - startTime;

      const result: ShellExecutionResult = {
        success: exitCode === 0,
        exitCode,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        duration,
        command: [command, ...args].join(' '),
        timestamp: new Date().toISOString(),
        pid: proc.pid
      };

      this.performanceMonitor.recordMetric('command_execution_duration', duration, {
        command,
        args: args.join(' '),
        exitCode,
        success: result.success
      });

      return result;

    } catch (error) {
      const duration = performance.now() - startTime;

      return {
        success: false,
        exitCode: -1,
        stdout: '',
        stderr: error.message,
        duration,
        command: [command, ...args].join(' '),
        timestamp: new Date().toISOString()
      };
    }
  }

  private async scanScriptSecurity(scriptContent: string, scriptName: string): Promise<ShellSecurityScan> {
    const vulnerabilities: ShellSecurityScan['vulnerabilities'] = [];
    const warnings: string[] = [];

    // Enhanced dangerous patterns to detect
    const dangerousPatterns = [
      { pattern: /\beval\s*\(/, type: 'eval_usage', severity: 'high', description: 'Use of eval() function' },
      { pattern: /\bexec\s*\(/, type: 'exec_usage', severity: 'high', description: 'Use of exec() function' },
      { pattern: /rm\s+-rf/, type: 'recursive_delete', severity: 'critical', description: 'Recursive delete without confirmation' },
      { pattern: /chmod\s+[0-7]{3,4}\s+\*/, type: 'permission_changes', severity: 'medium', description: 'Bulk permission changes' },
      { pattern: /curl\s+\|?\s*sh/, type: 'pipe_to_shell', severity: 'critical', description: 'Piping curl to shell' },
      { pattern: /wget\s+.*\s*\|?\s*sh/, type: 'pipe_to_shell', severity: 'critical', description: 'Piping wget to shell' },
      { pattern: /password|secret|key\s*=\s*["']?[^"'\s]+["']?/, type: 'hardcoded_credentials', severity: 'high', description: 'Potential hardcoded credentials' },
      { pattern: /sudo\s+/, type: 'sudo_usage', severity: 'medium', description: 'Sudo usage without justification' },
      { pattern: /chmod\s+777/, type: 'open_permissions', severity: 'high', description: 'Setting world-writable permissions' },
      { pattern: /curl\s+.*-s/, type: 'silent_curl', severity: 'medium', description: 'Silent curl execution' }
    ];

    const lines = scriptContent.split('\n');

    lines.forEach((line, index) => {
      for (const { pattern, type, severity, description } of dangerousPatterns) {
        if (pattern.test(line)) {
          vulnerabilities.push({
            severity: severity as 'low' | 'medium' | 'high' | 'critical',
            type,
            description: `${description} at line ${index + 1}`,
            line: index + 1
          });
        }
      }

      // Warning patterns
      if (line.includes('sudo') && !line.includes('--help')) {
        warnings.push(`sudo usage at line ${index + 1}`);
      }

      if (line.includes('> /dev/null') && line.includes('curl')) {
        warnings.push(`Silent curl execution at line ${index + 1}`);
      }
    });

    return {
      safe: vulnerabilities.length === 0,
      vulnerabilities,
      warnings
    };
  }

  private async ensureTempDir(): Promise<void> {
    try {
      await mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      structuredLog('Failed to create temp directory:', errorMessage);
    }
  }

  private async cleanupScript(scriptPath: string): Promise<void> {
    try {
      await unlink(scriptPath);
    } catch (error) {
      // Silent fail - temp file cleanup is best effort
    }
  }

  async listAvailableCommands(): Promise<string[]> {
    const commonCommands = [
      'bun', 'node', 'npm', 'git', 'curl', 'wget', 'ls', 'cat', 'echo',
      'mkdir', 'rm', 'cp', 'mv', 'chmod', 'chown', 'find', 'grep'
    ];

    const available: string[] = [];

    for (const cmd of commonCommands) {
      const path = which(cmd);
      if (path) {
        available.push(cmd);
      }
    }

    return available;
  }

  async getGlobalBinDir(): Promise<string> {
    // Read from bunfig.toml or use default
    const bunfigPath = join(process.cwd(), 'bunfig.toml');
    try {
      const bunfigContent = await Bun.file(bunfigPath).text();
      const globalBinMatch = bunfigContent.match(/globalBinDir\s*=\s*["']([^"']+)["']/);
      if (globalBinMatch) {
        return globalBinMatch[1];
      }
    } catch {
      // Fallback to default
    }

    return join(process.cwd(), 'my-portal/packages/templates/bun-transformer/dist');
  }
}

export { ShellExecutionEngine };
export type { ShellExecutionResult, ShellSecurityScan };
export default ShellExecutionEngine;
