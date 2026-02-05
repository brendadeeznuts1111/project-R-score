#!/usr/bin/env bun

import type { BunSpawnResult, BunProcessOptions } from '../schemas/types.js';
import { mcpErrorHandler, MCPErrors } from '../error/error-handler.js';
import type { MCPErrorContext } from '../error/error-handler.js';

/**
 * Simplified execution infrastructure for MCP tools
 * Provides actual execution capabilities instead of command string generation
 */
export class ToolExecutor {
  private activeProcesses = new Set<any>();

  /**
   * Execute a command using Bun.spawn with error handling
   */
  async executeCommand(
    command: string,
    args: string[] = [],
    options: BunProcessOptions = {}
  ): Promise<BunSpawnResult> {
    const startTime = performance.now();

    try {
      // Validate command
      if (!command || command.trim().length === 0) {
        throw new Error('Command cannot be empty');
      }

      // Execute with Bun.spawn
      const process = Bun.spawn({
        cmd: [command, ...args],
        cwd: options.cwd || globalThis.process.cwd(),
        env: {
          ...globalThis.process.env,
          ...options.env,
        },
        stdout: options.stdout || 'pipe',
        stderr: options.stderr || 'pipe',
      });

      this.activeProcesses.add(process);

      let stdout = '';
      let stderr = '';

      if (options.stdout === 'pipe' || !options.stdout) {
        stdout = await new Promise<string>((resolve, reject) => {
          let output = '';
          process.stdout.on('data', (chunk: Buffer) => {
            output += chunk.toString();
          });
          process.on('close', (code: number) => {
            resolve(output);
          });
          process.on('error', reject);
        });
      }

      if (options.stderr === 'pipe' || !options.stderr) {
        stderr = await new Promise<string>((resolve, reject) => {
          let error = '';
          process.stderr.on('data', (chunk: Buffer) => {
            error += chunk.toString();
          });
          process.on('close', (code: number) => {
            resolve(error);
          });
          process.on('error', reject);
        });
      }

      const exitCode = await new Promise<number>((resolve) => {
        process.on('close', (code: number) => {
          resolve(code);
        });
      });

      const duration = performance.now() - startTime;
      this.activeProcesses.delete(process);

      return {
        stdout,
        stderr,
        exitCode,
        duration,
      };
    } catch (error: any) {
      const duration = performance.now() - startTime;
      
      return {
        stdout: '',
        stderr: error.message || 'Unknown execution error',
        exitCode: 1,
        duration,
      };
    }
  }

  /**
   * Execute Bun-specific commands
   */
  async executeBunCommand(
    subcommand: string,
    args: string[] = [],
    options: BunProcessOptions = {}
  ): Promise<BunSpawnResult> {
    const env = {
      ...options.env,
      NODE_ENV: options.env?.NODE_ENV || 'development',
    };

    return this.executeCommand('bun', [subcommand, ...args], {
      ...options,
      env,
    });
  }

  /**
   * Kill all active processes
   */
  killAllProcesses(): void {
    for (const process of this.activeProcesses) {
      try {
        process.kill();
      } catch {
        // Ignore kill errors
      }
    }
    this.activeProcesses.clear();
  }

  /**
   * Get count of active processes
   */
  getActiveProcessCount(): number {
    return this.activeProcesses.size;
  }
}

/**
 * File system operations
 */
export class FileSystemExecutor {
  /**
   * Create project files
   */
  async createProjectFiles(
    files: Array<{ path: string; content: string }>,
    createPath: boolean = true
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = { success: 0, failed: 0, errors: [] as string[] };

    // Create directories first if needed
    if (createPath) {
      const uniqueDirs = [...new Set(
        files.map(file => {
          const lastSlash = file.path.lastIndexOf('/');
          return lastSlash > 0 ? file.path.substring(0, lastSlash) : '';
        })
      )].filter(dir => dir && dir !== '');

      for (const dir of uniqueDirs) {
        try {
          await this.ensureDirectory(dir);
        } catch (error: any) {
          results.errors.push(`Failed to create directory ${dir}: ${error.message}`);
        }
      }
    }

    // Write files
    for (const file of files) {
      try {
        await Bun.write(file.path, file.content);
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Failed to write ${file.path}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Ensure directory exists
   */
  async ensureDirectory(path: string): Promise<void> {
    try {
      // Use shell command for compatibility
      const toolExecutor = new ToolExecutor();
      await toolExecutor.executeCommand('mkdir', ['-p', path]);
    } catch (error: any) {
      throw await mcpErrorHandler.handleError(error, {
        timestamp: Date.now(),
        operation: 'ensure_directory',
        toolName: 'FileSystemExecutor',
      } as MCPErrorContext, MCPErrors.FILE_SYSTEM);
    }
  }

  /**
   * Read file content
   */
  async readFile(path: string): Promise<string> {
    try {
      const file = Bun.file(path);
      if (!await file.exists()) {
        throw new Error(`File not found: ${path}`);
      }
      return await file.text();
    } catch (error: any) {
      throw await mcpErrorHandler.handleError(error, {
        timestamp: Date.now(),
        operation: 'read_file',
        toolName: 'FileSystemExecutor',
      } as MCPErrorContext, MCPErrors.FILE_SYSTEM);
    }
  }
}

// Singleton instances
export const toolExecutor = new ToolExecutor();
export const fileSystemExecutor = new FileSystemExecutor();

export default {
  toolExecutor,
  fileSystemExecutor,
};