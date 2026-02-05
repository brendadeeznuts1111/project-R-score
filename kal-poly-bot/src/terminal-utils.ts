#!/usr/bin/env bun
/**
 * Bun Terminal API (PTY) Utility Functions
 *
 * Reusable utilities for PTY operations including:
 * - Terminal session management
 * - Command execution helpers
 * - Output processing utilities
 * - Security and validation functions
 */

import { spawn } from "bun";
import { randomUUID } from "crypto";
import type {
  SpawnProcessWithTerminal,
  TerminalInstance,
  TerminalSpawnOptions,
} from "./types/bun-terminal";

// Extend Bun types temporarily
declare global {
  function spawn(
    args: string[],
    options: TerminalSpawnOptions
  ): SpawnProcessWithTerminal;
}

// Types
export interface TerminalConfig {
  cols?: number;
  rows?: number;
  shell?: string;
  env?: Record<string, string>;
  timeout?: number;
}

export interface CommandResult {
  success: boolean;
  output: string;
  exitCode: number;
  duration: number;
}

export interface TerminalSession {
  id: string;
  proc: SpawnProcessWithTerminal;
  terminal: TerminalInstance;
  startTime: Date;
  config: TerminalConfig;
}

/**
 * Security utilities
 */
export class TerminalSecurity {
  private static readonly ALLOWED_SHELLS = [
    "bash",
    "zsh",
    "sh",
    "fish",
    "dash",
  ];
  private static readonly DANGEROUS_PATTERNS = [
    /&&/g,
    /\|\|/g,
    /;/g,
    /\|/g,
    /`/g,
    /\$\(/g,
    /\$\{/g,
    />/g,
    />>/g,
    /</g,
    /&>/g,
    /2>/g,

    /1>/g,
  ];

  static sanitizeInput(input: string): string {
    let sanitized = input.trim();

    // Remove dangerous patterns
    this.DANGEROUS_PATTERNS.forEach((pattern) => {
      sanitized = sanitized.replace(pattern, "");
    });

    // Remove potential command injection attempts
    // eslint-disable-next-line no-control-regex
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, "");

    return sanitized;
  }

  static validateShell(shell: string): boolean {
    return this.ALLOWED_SHELLS.includes(shell);
  }

  static validateCommand(command: string): boolean {
    const dangerous = [
      "rm -rf",
      "sudo rm",
      "mkfs",
      "dd if=",
      "format",
      "fdisk",
    ];
    const lowerCmd = command.toLowerCase();

    return !dangerous.some((danger) => lowerCmd.includes(danger));
  }

  static generateSessionId(): string {
    return randomUUID();
  }

  static validateSessionId(sessionId: string): boolean {
    return /^[a-f0-9-]{36}$/.test(sessionId);
  }
}

/**
 * Terminal session manager
 */
export class TerminalManager {
  private static sessions = new Map<string, TerminalSession>();

  static createSession(config: TerminalConfig = {}): TerminalSession {
    const sessionId = TerminalSecurity.generateSessionId();
    const shell =
      config.shell && TerminalSecurity.validateShell(config.shell)
        ? config.shell
        : "bash";

    const terminal = new Bun.Terminal({
      cols: config.cols || 80,
      rows: config.rows || 24,
      data(_term: TerminalInstance, _data: Uint8Array) {
        // Data handling will be set by the caller
      },
    });

    const proc = spawn([shell], {
      terminal,
      env: {
        TERM: "xterm-256color",
        ...process.env,
        ...config.env,
      },
    });

    const session: TerminalSession = {
      id: sessionId,
      proc,
      terminal,
      startTime: new Date(),
      config,
    };

    this.sessions.set(sessionId, session);

    // Auto-cleanup on process exit
    proc.exited.then(() => {
      this.destroySession(sessionId);
    });

    return session;
  }

  static getSession(sessionId: string): TerminalSession | undefined {
    return this.sessions.get(sessionId);
  }

  static destroySession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    try {
      session.terminal.close();
      if (!session.proc.killed) {
        session.proc.kill();
      }
    } catch (error) {
      console.error(`Error destroying session ${sessionId}:`, error);
    }

    this.sessions.delete(sessionId);
    return true;
  }

  static listSessions(): TerminalSession[] {
    return Array.from(this.sessions.values());
  }

  static cleanupInactiveSessions(maxAge: number = 30 * 60 * 1000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions) {
      if (now - session.startTime.getTime() > maxAge) {
        this.destroySession(sessionId);
        cleaned++;
      }
    }

    return cleaned;
  }
}

/**
 * Command execution utilities
 */
export class CommandExecutor {
  static async executeCommand(
    command: string,
    config: TerminalConfig = {}
  ): Promise<CommandResult> {
    const startTime = Date.now();

    if (!TerminalSecurity.validateCommand(command)) {
      return {
        success: false,
        output: "Command rejected for security reasons",
        exitCode: -1,
        duration: Date.now() - startTime,
      };
    }

    const sanitizedCommand = TerminalSecurity.sanitizeInput(command);
    const output: string[] = [];

    const proc = spawn(["bash", "-c", sanitizedCommand], {
      terminal: {
        cols: config.cols || 80,
        rows: config.rows || 24,
        data(_term: TerminalInstance, data: Uint8Array) {
          output.push(new TextDecoder().decode(data));
        },
      },
    });

    const exitCode = await proc.exited;
    proc.terminal?.close();

    return {
      success: exitCode === 0,
      output: output.join(""),
      exitCode,
      duration: Date.now() - startTime,
    };
  }

  static async executeInteractive(
    commands: string[],
    config: TerminalConfig = {},
    onOutput?: (output: string) => void
  ): Promise<CommandResult> {
    const startTime = Date.now();
    const output: string[] = [];
    const sanitizedCommands = commands.map((cmd) =>
      TerminalSecurity.sanitizeInput(cmd)
    );

    const proc = spawn(["bash"], {
      terminal: {
        cols: config.cols || 80,
        rows: config.rows || 24,
        data(term: TerminalInstance, data: Uint8Array) {
          const outputChunk = new TextDecoder().decode(data);
          output.push(outputChunk);
          onOutput?.(outputChunk);

          // Send next command when prompt is detected
          if (outputChunk.includes("$ ") || outputChunk.includes("# ")) {
            const cmd = sanitizedCommands.shift();
            if (cmd) {
              term.write(cmd + "\n");
            } else {
              term.write("exit\n");
            }
          }
        },
      },
    });

    const exitCode = await proc.exited;
    proc.terminal?.close();

    return {
      success: exitCode === 0,
      output: output.join(""),
      exitCode,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Output processing utilities
 */
export class OutputProcessor {
  static stripAnsiCodes(text: string): string {
    // eslint-disable-next-line no-control-regex
    return text.replace(/[\x1b\x00-\x1F][[0-9;]*[mGKHJABCDsuPL]/g, "");
  }

  static extractPrompt(text: string): string | null {
    const promptRegex = /(.+?)(?:\$|#|>)\s*$/;
    const match = text.match(promptRegex);
    return match ? match[1] : null;
  }

  static parseCommandOutput(
    text: string
  ): { command: string; output: string }[] {
    const lines = text.split("\n");
    const results: { command: string; output: string }[] = [];
    let currentCommand = "";
    let currentOutput: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.includes("$ ") || trimmed.includes("# ")) {
        if (currentCommand) {
          results.push({
            command: currentCommand,
            output: currentOutput.join("\n"),
          });
        }
        currentCommand = trimmed;
        currentOutput = [];
      } else {
        currentOutput.push(line);
      }
    }

    if (currentCommand) {
      results.push({
        command: currentCommand,
        output: currentOutput.join("\n"),
      });
    }

    return results;
  }

  static formatOutputForDisplay(text: string, maxWidth: number = 80): string[] {
    const lines = text.split("\n");
    const formatted: string[] = [];

    for (const line of lines) {
      if (line.length <= maxWidth) {
        formatted.push(line);
      } else {
        // Word wrap long lines
        const words = line.split(" ");
        let currentLine = "";

        for (const word of words) {
          if ((currentLine + " " + word).length <= maxWidth) {
            currentLine += (currentLine ? " " : "") + word;
          } else {
            if (currentLine) formatted.push(currentLine);
            currentLine = word;
          }
        }

        if (currentLine) formatted.push(currentLine);
      }
    }

    return formatted;
  }
}

/**
 * Terminal resize utilities
 */
export class TerminalResizer {
  static async resizeSession(
    session: TerminalSession,
    cols: number,
    rows: number
  ): Promise<boolean> {
    try {
      session.terminal.resize(cols, rows);
      session.config.cols = cols;
      session.config.rows = rows;
      return true;
    } catch (error) {
      console.error("Failed to resize terminal:", error);
      return false;
    }
  }

  static getOptimalSize(): { cols: number; rows: number } {
    return {
      cols: process.stdout.columns || 80,
      rows: process.stdout.rows || 24,
    };
  }

  static async fitContent(
    session: TerminalSession,
    content: string
  ): Promise<{ cols: number; rows: number }> {
    const lines = content.split("\n");
    const maxLineLength = Math.max(...lines.map((line) => line.length));

    const cols = Math.min(Math.max(maxLineLength + 2, 40), 200);
    const rows = Math.min(Math.max(lines.length + 2, 10), 100);

    await this.resizeSession(session, cols, rows);
    return { cols, rows };
  }
}

/**
 * File operations with PTY
 */
export class FileTerminalOps {
  static async editFile(
    filePath: string,
    editor: string = "nano",
    config: TerminalConfig = {}
  ): Promise<CommandResult> {
    const commands = [`${editor} ${filePath}`, 'echo "File editing completed"'];

    return CommandExecutor.executeInteractive(commands, config);
  }

  static async viewFile(
    filePath: string,
    pager: string = "less",
    config: TerminalConfig = {}
  ): Promise<CommandResult> {
    const commands = [
      `${pager} ${filePath}`,
      "q", // Quit pager
    ];

    return CommandExecutor.executeInteractive(commands, config);
  }

  static async createFileWithContent(
    filePath: string,
    content: string,
    config: TerminalConfig = {}
  ): Promise<CommandResult> {
    const escapedContent = content.replace(/'/g, "'\"'\"'");
    const command = `echo '${escapedContent}' > ${filePath}`;

    return CommandExecutor.executeCommand(command, config);
  }
}

/**
 * Process monitoring utilities
 */
export class ProcessMonitor {
  static async getSystemInfo(
    config: TerminalConfig = {}
  ): Promise<CommandResult> {
    const commands = [
      'echo "=== System Information ==="',
      "uname -a",
      'echo "=== Memory Usage ==="',
      "free -h",
      'echo "=== Disk Usage ==="',
      "df -h",
      'echo "=== CPU Info ==="',
      "lscpu | head -10",
      'echo "=== Process Count ==="',
      "ps aux | wc -l",
    ];

    return CommandExecutor.executeInteractive(commands, config);
  }

  static async monitorProcess(
    pid: string,
    duration: number = 5000,
    config: TerminalConfig = {}
  ): Promise<CommandResult> {
    const commands = [
      `echo "Monitoring process ${pid}..."`,
      `top -p ${pid} -d 1 -n ${Math.floor(duration / 1000)}`,
      'echo "Monitoring completed"',
    ];

    return CommandExecutor.executeInteractive(commands, config);
  }

  static async killProcess(
    pid: string,
    signal: string = "TERM"
  ): Promise<CommandResult> {
    const command = `kill -${signal} ${pid}`;
    return CommandExecutor.executeCommand(command);
  }
}

/**
 * Utility functions for common PTY operations
 */
export const TerminalUtils = {
  // Quick command execution
  async run(command: string): Promise<string> {
    const result = await CommandExecutor.executeCommand(command);
    return result.output;
  },

  // Create temporary terminal for quick operations
  async createTempTerminal(
    config: TerminalConfig = {}
  ): Promise<TerminalSession> {
    const session = TerminalManager.createSession({
      ...config,
      timeout: 60000, // 1 minute default timeout
    });

    // Auto-cleanup after timeout
    setTimeout(() => {
      TerminalManager.destroySession(session.id);
    }, config.timeout || 60000);

    return session;
  },

  // Check if PTY is supported
  isPTYSupported(): boolean {
    return typeof Bun !== "undefined" && typeof Bun.Terminal === "function";
  },

  // Get terminal capabilities
  getCapabilities(): Record<string, boolean> {
    return {
      pty: this.isPTYSupported(),
      resize: true,
      colors: true,
      interactive: true,
      websocket: true,
    };
  },
};

export default TerminalUtils;
