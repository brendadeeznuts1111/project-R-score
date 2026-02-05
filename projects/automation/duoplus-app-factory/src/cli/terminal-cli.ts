#!/usr/bin/env bun

import { ptyService } from "../services/ptyService.js";
import { logger } from "../nebula/logger.js";
import { Command } from "commander";

interface TerminalOptions {
  shell?: string;
  cols?: number;
  rows?: number;
  cwd?: string;
  command?: string;
  interactive?: boolean;
}

class TerminalCLI {
  private program: Command;

  constructor() {
    this.program = new Command();
    this.setupCommands();
  }

  private setupCommands() {
    this.program
      .name("terminal-cli")
      .description("Interactive terminal management for Nebula-Flow™")
      .version("1.0.0");

    this.program
      .command("create")
      .description("Create a new terminal session")
      .option("-s, --shell <shell>", "Shell to use (default: /bin/bash)")
      .option("-c, --cols <cols>", "Terminal columns", "80")
      .option("-r, --rows <rows>", "Terminal rows", "24")
      .option("-d, --cwd <dir>", "Working directory")
      .option("-cmd, --command <cmd>", "Initial command to run")
      .action(async (options: TerminalOptions) => {
        await this.createSession(options);
      });

    this.program
      .command("list")
      .description("List active terminal sessions")
      .action(() => {
        this.listSessions();
      });

    this.program
      .command("attach <sessionId>")
      .description("Attach to an existing terminal session")
      .action(async (sessionId: string) => {
        await this.attachSession(sessionId);
      });

    this.program
      .command("close <sessionId>")
      .description("Close a terminal session")
      .action(async (sessionId: string) => {
        await this.closeSession(sessionId);
      });

    this.program
      .command("stats")
      .description("Show terminal service statistics")
      .action(() => {
        this.showStats();
      });

    this.program
      .command("shell")
      .description("Start interactive shell")
      .option("-s, --shell <shell>", "Shell to use")
      .action(async (options: { shell?: string }) => {
        await this.startInteractiveShell(options);
      });
  }

  private async createSession(options: TerminalOptions) {
    try {
      const session = await ptyService.createSession({
        shell: options.shell,
        cols: parseInt(options.cols || "80"),
        rows: parseInt(options.rows || "24"),
        cwd: options.cwd,
        onData: (data) => process.stdout.write(data),
        onExit: (code) => {
          console.log(`\nSession exited with code ${code}`);
        },
      });

      console.log(`Created terminal session: ${session.id}`);

      if (options.command) {
        ptyService.writeToSession(session.id, options.command + "\n");
      }

      if (options.interactive !== false) {
        await this.attachSession(session.id);
      }
    } catch (error) {
      console.error(`Failed to create session: ${error.message}`);
      process.exit(1);
    }
  }

  private listSessions() {
    const sessions = ptyService.listSessions();
    if (sessions.length === 0) {
      console.log("No active terminal sessions.");
      return;
    }

    console.log("Active terminal sessions:");
    console.log("ID\t\tShell\t\tStarted\t\t\tActive");
    console.log("-".repeat(80));
    
    sessions.forEach(session => {
      const startTime = session.startTime.toLocaleTimeString();
      const shell = session.process.spawnargs[0] || "unknown";
      console.log(`${session.id}\t${shell}\t${startTime}\t${session.isActive}`);
    });
  }

  private async attachSession(sessionId: string) {
    const session = ptyService.getSession(sessionId);
    if (!session) {
      console.error(`Session ${sessionId} not found`);
      process.exit(1);
    }

    console.log(`Attaching to session ${sessionId}...`);
    console.log("Press Ctrl+D to detach\n");

    // Set up input forwarding
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    const onData = (chunk: Buffer) => {
      ptyService.writeToSession(sessionId, chunk.toString());
    };

    const onResize = () => {
      ptyService.resizeSession(sessionId, process.stdout.columns, process.stdout.rows);
    };

    process.stdin.on("data", onData);
    process.stdout.on("resize", onResize);

    // Handle terminal resize
    ptyService.resizeSession(sessionId, process.stdout.columns, process.stdout.rows);

    // Wait for session to end or user to detach
    await session.process.exited;

    // Cleanup
    process.stdin.setRawMode(false);
    process.stdin.pause();
    process.stdin.removeListener("data", onData);
    process.stdout.removeListener("resize", onResize);

    console.log("\nSession ended.");
  }

  private async closeSession(sessionId: string) {
    const success = ptyService.closeSession(sessionId);
    if (success) {
      console.log(`Closed session ${sessionId}`);
    } else {
      console.error(`Failed to close session ${sessionId}`);
      process.exit(1);
    }
  }

  private showStats() {
    const stats = ptyService.getStats();
    console.log("Terminal Service Statistics:");
    console.log(`Total sessions: ${stats.totalSessions}`);
    console.log(`Active sessions: ${stats.activeSessions}`);
    console.log(`Max sessions: ${stats.maxSessions}`);
    console.log(`Uptime: ${Math.floor(stats.uptime / 1000)}s`);
  }

  private async startInteractiveShell(options: { shell?: string }) {
    const session = await ptyService.createSession({
      shell: options.shell,
      cols: process.stdout.columns,
      rows: process.stdout.rows,
      onData: (data) => process.stdout.write(data),
      onExit: (code) => {
        console.log(`\nShell exited with code ${code}`);
      },
    });

    await this.attachSession(session.id);
  }

  async run() {
    try {
      await this.program.parseAsync();
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  }
}

// CLI entry point
if (import.meta.main) {
  const cli = new TerminalCLI();
  await cli.run();
}

export { TerminalCLI };