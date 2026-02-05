#!/usr/bin/env bun
/**
 * src/cli/pty-debug-cli.ts
 * Enhanced Debug CLI with PTY Support
 * - Interactive terminals
 * - Multi-skill dashboards
 * - Debug with breakpoints
 * - Collaborative sessions
 * - Recording and playback
 */

import { SkillPTYManager } from "../pty/skill-pty-manager";
import { EnhancedOutput } from "./enhanced-output";

// =============================================================================
// PTYDebugCLI Class
// =============================================================================

class PTYDebugCLI {
  private ptyManager = new SkillPTYManager();
  private activeSessions = new Map<string, any>();

  async run(): Promise<void> {
    const command = process.argv[2];
    const skillId = process.argv[3];

    if (!command) {
      this.showHelp();
      process.exit(1);
    }

    // Commands that don't require skillId
    if (command === "list") {
      await this.listTerminals();
      return;
    }

    if (command === "--help" || command === "-h") {
      this.showHelp();
      return;
    }

    if (!skillId && command !== "list") {
      EnhancedOutput.error("Skill ID is required");
      this.showHelp();
      process.exit(1);
    }

    // Check PTY support
    if (process.platform === "win32") {
      console.log(
        "Warning: PTY support is POSIX-only (Linux/macOS). Using fallback mode."
      );
      return this.runFallback(command, skillId);
    }

    try {
      switch (command) {
        case "interactive":
          await this.interactiveTerminal(skillId);
          break;
        case "dashboard":
          await this.multiSkillDashboard(skillId);
          break;
        case "debug":
          await this.debugTerminal(skillId);
          break;
        case "collab":
          await this.collaborativeTerminal(skillId);
          break;
        case "record":
          await this.recordTerminal(skillId);
          break;
        case "play":
          await this.playRecording(skillId);
          break;
        case "attach":
          await this.attachToTerminal(skillId);
          break;
        case "kill":
          await this.killTerminal(skillId);
          break;
        default:
          EnhancedOutput.error(`Unknown command: ${command}`);
          this.showHelp();
          break;
      }
    } catch (error: any) {
      EnhancedOutput.error(error.message);
      process.exit(1);
    }
  }

  private async interactiveTerminal(skillId: string): Promise<void> {
    EnhancedOutput.printHeader(`Interactive: ${skillId}`);

    const terminal = await this.ptyManager.createSkillTerminal(skillId, {
      persistHistory: true,
      env: {
        SKILL_INTERACTIVE: "true",
      },
      onData: (data) => {
        process.stdout.write(data);
      },
    });

    this.activeSessions.set(terminal.id, terminal);

    console.log(`Terminal started (ID: ${terminal.id})`);
    console.log('Type "exit" or press Ctrl+D to quit\n');

    // Set up input forwarding
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();

      process.stdin.on("data", (data) => {
        terminal.write(data);
      });
    }

    // Wait for process to exit
    await terminal.process.exited;

    // Cleanup
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }

    // Save history
    const history = terminal.getHistory();
    if (history.length > 0) {
      const historyDir = "./.skill-history";
      await Bun.spawn(["mkdir", "-p", historyDir]).exited;
      const historyFile = `${historyDir}/${skillId}-${Date.now()}.txt`;
      await Bun.write(historyFile, history.join(""));
      console.log(`History saved to: ${historyFile}`);
    }

    this.activeSessions.delete(terminal.id);
    console.log("\nSession ended");
  }

  private async multiSkillDashboard(skillId: string): Promise<void> {
    // Parse additional skills from arguments
    const additionalSkills = process.argv.slice(4).filter((a) => !a.startsWith("--"));
    const allSkills = [skillId, ...additionalSkills];

    if (allSkills.length === 1) {
      console.log("Usage: pty-debug dashboard <skill-id> [additional-skills...]");
      console.log("Example: pty-debug dashboard weather scraper transformer");
      process.exit(1);
    }

    EnhancedOutput.printHeader(`Dashboard: ${allSkills.join(", ")}`);

    const layout = this.parseArgValue(process.argv, "--layout") as
      | "horizontal"
      | "vertical"
      | "grid"
      | undefined;

    const dashboard = await this.ptyManager.createSkillDashboard(allSkills, {
      layout: layout || "grid",
      maxColumns: 2,
      title: "Skill Dashboard",
    });

    this.activeSessions.set(dashboard.id, dashboard);

    // Wait for all terminals to exit
    await Promise.all(dashboard.terminals.map((t) => t.process.exited));

    console.log("\nDashboard session ended");
    this.activeSessions.delete(dashboard.id);
  }

  private async debugTerminal(skillId: string): Promise<void> {
    EnhancedOutput.printHeader(`Debug: ${skillId}`);

    const args = process.argv.slice(4);

    const options = {
      inspector: args.includes("--inspect"),
      port: parseInt(this.parseArgValue(args, "--port") || "9229", 10),
      watch: args.includes("--watch"),
      breakpoints: this.parseArgValue(args, "--breakpoints")?.split(","),
    };

    const terminal = await this.ptyManager.createDebugTerminal(skillId, options);
    this.activeSessions.set(terminal.id, terminal);

    console.log(`Debug terminal started`);

    if (options.inspector) {
      console.log(`Inspector: ws://127.0.0.1:${options.port}`);
      console.log(`Chrome DevTools: chrome://inspect`);
    }

    // Set up input forwarding
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();

      process.stdin.on("data", (data) => {
        terminal.write(data);
      });
    }

    // Wait for debug session to end
    await terminal.process.exited;

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }

    this.activeSessions.delete(terminal.id);
    console.log("\nDebug session ended");
  }

  private async collaborativeTerminal(skillId: string): Promise<void> {
    EnhancedOutput.printHeader(`Collaborative: ${skillId}`);

    const args = process.argv.slice(4);
    const sessionId =
      this.parseArgValue(args, "--session") || `collab-${Date.now()}`;
    const users = this.parseArgValue(args, "--users")?.split(",") || [];

    const terminal = await this.ptyManager.createCollaborativeTerminal(
      skillId,
      {
        sessionId,
        users,
      }
    );

    this.activeSessions.set(terminal.id, terminal);

    console.log(`Collaborative session created`);
    console.log(`WebSocket URL: ${terminal.webSocketUrl}`);
    console.log(`Session ID: ${sessionId}`);

    if (users.length > 0) {
      console.log(`Initial users: ${users.join(", ")}`);
    }

    console.log("\nShare the WebSocket URL with collaborators");
    console.log("Press Ctrl+C to end session\n");

    // Set up input forwarding
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();

      process.stdin.on("data", (data) => {
        terminal.write(data);
      });
    }

    // Handle interrupt
    process.on("SIGINT", () => {
      console.log("\nEnding collaborative session...");
      terminal.server.stop();
      terminal.kill();
      process.exit(0);
    });

    // Wait for process to exit
    await terminal.process.exited;

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }

    terminal.server.stop();
    this.activeSessions.delete(terminal.id);
  }

  private async recordTerminal(skillId: string): Promise<void> {
    EnhancedOutput.printHeader(`Recording: ${skillId}`);

    const args = process.argv.slice(4);
    const outputFile =
      this.parseArgValue(args, "--output") ||
      `./recordings/${skillId}-${Date.now()}.cast`;

    console.log(`Output: ${outputFile}`);

    const terminal = await this.ptyManager.createRecordedTerminal(skillId, {
      outputFile,
      includeTimestamps: true,
      maxDuration: 3600000, // 1 hour
    });

    this.activeSessions.set(terminal.id, terminal);

    console.log("\nRecording started. Press Ctrl+C to stop.\n");

    // Set up input forwarding
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();

      process.stdin.on("data", (data) => {
        terminal.write(data);
      });
    }

    // Handle interrupt - save on Ctrl+C
    process.on("SIGINT", async () => {
      console.log("\nStopping recording...");
      await terminal.save();
      terminal.kill();

      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }

      process.exit(0);
    });

    // Wait for process to exit
    await terminal.process.exited;

    await terminal.save();

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }

    this.activeSessions.delete(terminal.id);
  }

  private async playRecording(recordingPath: string): Promise<void> {
    EnhancedOutput.printHeader(`Playing: ${recordingPath}`);

    const args = process.argv.slice(4);
    const speed = parseFloat(this.parseArgValue(args, "--speed") || "1.0");

    // Load recording
    const filePath = recordingPath.endsWith(".cast")
      ? recordingPath
      : `./recordings/${recordingPath}.cast`;

    const exists = await Bun.file(filePath).exists();
    if (!exists) {
      throw new Error(`Recording not found: ${filePath}`);
    }

    const content = await Bun.file(filePath).text();
    const lines = content.trim().split("\n");

    // Parse header
    const header = JSON.parse(lines[0]);
    console.log(`Title: ${header.title || "Unknown"}`);
    console.log(`Size: ${header.width}x${header.height}`);
    console.log(`Speed: ${speed}x\n`);

    // Play frames
    let lastTime = 0;
    for (let i = 1; i < lines.length; i++) {
      const frame = JSON.parse(lines[i]);
      const [time, type, data] = frame;

      const delay = ((time - lastTime) * 1000) / speed;
      if (delay > 0) {
        await Bun.sleep(delay);
      }

      if (type === "o") {
        process.stdout.write(data);
      }

      lastTime = time;
    }

    console.log("\n\nPlayback complete");
  }

  private async attachToTerminal(skillId: string): Promise<void> {
    const terminalId = process.argv[4];

    if (!terminalId) {
      console.log("Usage: pty-debug attach <skill-id> <terminal-id>");
      console.log("Available terminals:");
      await this.listTerminals();
      return;
    }

    const terminal = this.activeSessions.get(terminalId);
    if (!terminal) {
      EnhancedOutput.error(`Terminal not found: ${terminalId}`);
      return;
    }

    EnhancedOutput.printHeader(`Attaching: ${terminalId}`);
    console.log(`Skill: ${terminal.skillId}`);

    // Set up input forwarding
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();

      process.stdin.on("data", (data) => {
        if (data.toString() === "\x1c") {
          // Ctrl+\
          console.log("\nDetached from terminal");
          process.stdin.setRawMode(false);
          process.exit(0);
        }
        terminal.write(data);
      });
    }

    console.log('\nPress Ctrl+\\ to detach\n');

    // Wait indefinitely
    await new Promise(() => {});
  }

  private async listTerminals(): Promise<void> {
    EnhancedOutput.printHeader("Active Terminals");

    const terminals = this.ptyManager.listTerminals();

    if (terminals.length === 0) {
      console.log("No active terminals");
      return;
    }

    console.log("ID                          Skill           PID");
    console.log("─".repeat(60));

    for (const term of terminals) {
      console.log(
        `${term.id.padEnd(28)} ${term.skillId.padEnd(16)} ${term.pid}`
      );
    }
  }

  private async killTerminal(skillId: string): Promise<void> {
    const terminalId = process.argv[4];

    if (terminalId) {
      const killed = this.ptyManager.killTerminal(terminalId);
      if (killed) {
        console.log(`Killed terminal: ${terminalId}`);
      } else {
        EnhancedOutput.error(`Terminal not found: ${terminalId}`);
      }
    } else {
      // Kill all terminals for this skill
      const killed = this.ptyManager.killAllForSkill(skillId);
      console.log(`Killed ${killed} terminals for skill: ${skillId}`);
    }
  }

  private parseArgValue(args: string[], flag: string): string | undefined {
    const index = args.indexOf(flag);
    if (index !== -1 && index + 1 < args.length) {
      return args[index + 1];
    }
    return undefined;
  }

  private async runFallback(command: string, skillId: string): Promise<void> {
    console.log(`Running ${command} in fallback mode...`);

    const proc = Bun.spawn(["bun", "run", `./skills/${skillId}/src/index.ts`], {
      stdout: "inherit",
      stderr: "inherit",
      stdin: "inherit",
    });

    await proc.exited;
  }

  private showHelp(): void {
    console.log(`
Skill PTY Debugger - Interactive Terminal Management

Usage: pty-debug <command> <skill-id> [options]

Commands:
  interactive <skill>     Interactive terminal session
  dashboard <skill...>    Multi-skill dashboard
  debug <skill>          Debug with breakpoints
  collab <skill>         Collaborative terminal
  record <skill>         Record terminal session
  play <recording>       Play recorded session
  attach <skill> <id>    Attach to existing terminal
  list                   List active terminals
  kill <skill> [id]      Kill terminal(s)

Interactive Options:
  --env KEY=VAL          Set environment variable
  --cwd <path>           Working directory

Dashboard Options:
  --layout <type>        horizontal, vertical, grid

Debug Options:
  --inspect              Enable inspector
  --port <number>        Inspector port (default: 9229)
  --watch                Watch for changes
  --breakpoints <list>   Comma-separated breakpoints

Collaborative Options:
  --session <id>         Session ID
  --users <list>         Initial users (comma-separated)

Record Options:
  --output <file>        Output file (.cast format)

Play Options:
  --speed <multiplier>   Playback speed (default: 1.0)

Examples:
  pty-debug interactive weather
  pty-debug dashboard weather scraper --layout grid
  pty-debug debug data-processor --inspect --port 9230
  pty-debug collab editor --session team-1 --users alice,bob
  pty-debug record weather --output demo.cast
  pty-debug play demo.cast --speed 2
  pty-debug list
  pty-debug kill weather

Notes:
  - PTY requires POSIX (Linux/macOS)
  - Windows uses fallback mode
  - Use Ctrl+D to exit interactive sessions
  - Recordings use asciinema format (.cast)
`);
  }
}

// =============================================================================
// Run CLI
// =============================================================================

const cli = new PTYDebugCLI();
cli.run().catch((error) => {
  console.error(`PTY Debugger error: ${error.message}`);
  process.exit(1);
});
