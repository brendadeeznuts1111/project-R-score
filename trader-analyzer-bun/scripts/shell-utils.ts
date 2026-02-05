/**
 * @fileoverview Bun Shell Utilities
 * @description Utility functions using Bun Shell for common operations
 * @module scripts/shell-utils
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-SHELL-UTILS@0.1.0;instance-id=SHELL-UTILS-001;version=0.1.0}]
 * [PROPERTIES:{utils={value:"shell-utilities";@root:"ROOT-DEV";@chain:["BP-BUN-SHELL","BP-UTILITIES"];@version:"0.1.0"}}]
 * [CLASS:ShellUtils][#REF:v-0.1.0.BP.SHELL.UTILS.1.0.A.1.1.DEV.1.1]]
 */

import { $ } from "bun";

/**
 * Bun Shell utility functions
 */
export class ShellUtils {
  /**
   * Run git command and return output
   */
  static async git(command: string): Promise<string> {
    return await $`git ${command.split(" ")}`.text();
  }

  /**
   * Check if git repository is clean
   */
  static async isGitClean(): Promise<boolean> {
    const status = await $`git status --porcelain`.nothrow().text();
    return status.trim() === "";
  }

  /**
   * Get current git branch
   */
  static async getCurrentBranch(): Promise<string> {
    return (await $`git branch --show-current`.text()).trim();
  }

  /**
   * Get git commit hash
   */
  static async getCommitHash(short: boolean = false): Promise<string> {
    const flag = short ? "--short" : "";
    return (await $`git rev-parse ${flag} HEAD`.text()).trim();
  }

  /**
   * Count files matching pattern
   */
  static async countFiles(pattern: string, directory: string = "."): Promise<number> {
    const result = await $`find ${directory} -name ${pattern} | wc -l`.text();
    return parseInt(result.trim(), 10) || 0;
  }

  /**
   * Get file sizes
   */
  static async getFileSizes(pattern: string, directory: string = "."): Promise<Map<string, number>> {
    const sizes = new Map<string, number>();
    const result = await $`find ${directory} -name ${pattern} -exec ls -lh {} \\;`.nothrow().text();
    
    for (const line of result.split("\n")) {
      const match = line.match(/(\S+)\s+(\d+)/);
      if (match) {
        sizes.set(match[1], parseInt(match[2], 10));
      }
    }
    
    return sizes;
  }

  /**
   * Run command with timeout
   */
  static async runWithTimeout(
    command: string,
    timeoutMs: number = 5000,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const parts = command.split(" ");
    const proc = Bun.spawn(parts, {
      stdout: "pipe",
      stderr: "pipe",
    });

    const timeout = setTimeout(() => {
      proc.kill();
    }, timeoutMs);

    const result = await proc.exited;
    clearTimeout(timeout);

    // Bun provides native .text() method on stdout/stderr streams
    return {
      stdout: await (proc.stdout as any).text(),
      stderr: await (proc.stderr as any).text(),
      exitCode: result,
    };
  }

  /**
   * Pipe command output through filter
   */
  static async pipeThrough(
    command: string,
    filter: (line: string) => string | null,
  ): Promise<string[]> {
    const result: string[] = [];
    const parts = command.split(" ");
    const proc = Bun.spawn(parts, {
      stdout: "pipe",
    });

    for await (const line of proc.stdout) {
      const text = new TextDecoder().decode(line);
      const filtered = filter(text);
      if (filtered !== null) {
        result.push(filtered);
      }
    }

    return result;
  }

  /**
   * Execute command with environment variables
   */
  static async runWithEnv(
    command: string,
    env: Record<string, string>,
  ): Promise<string> {
    return await $`${command.split(" ")}`.env(env).text();
  }

  /**
   * Execute command in specific directory
   */
  static async runInDir(
    command: string,
    directory: string,
  ): Promise<string> {
    return await $`${command.split(" ")}`.cwd(directory).text();
  }
}
