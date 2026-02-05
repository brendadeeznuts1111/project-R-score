/**
 * src/pty/skill-pty-manager.ts
 * Advanced PTY Manager with Skill-Specific Features
 * - Interactive PTY sessions with reusable terminals
 * - Multi-skill dashboards
 * - Debug terminals with breakpoints
 * - Collaborative terminals
 * - Session recording and playback
 *
 * Uses Bun.Terminal API (v1.3.5+) for PTY support
 * Reference: https://bun.sh/blog/bun-v1.3.5#bun-terminal-api
 */

// =============================================================================
// Types
// =============================================================================

export interface SkillTerminal {
  id: string;
  terminal: any;
  process: any;
  skillId: string;
  write: (data: string | Uint8Array) => void;
  resize: (cols: number, rows: number) => void;
  kill: (signal?: string) => void;
  getHistory: () => string[];
  clearHistory: () => void;
  [Symbol.asyncDispose]?: () => Promise<void>;
}

/**
 * Reusable terminal that can be shared across multiple processes
 * Supports `await using` for automatic cleanup
 */
export interface ReusableTerminal {
  terminal: any;
  id: string;
  cols: number;
  rows: number;
  write: (data: string | Uint8Array) => void;
  resize: (cols: number, rows: number) => void;
  close: () => void;
  spawn: (cmd: string[], options?: { cwd?: string; env?: Record<string, string> }) => any;
  [Symbol.asyncDispose]: () => Promise<void>;
}

export interface SkillDashboard {
  id: string;
  terminals: SkillTerminal[];
  layout: string;
  activeTerminal: number;
  switchTerminal: (index: number) => void;
  broadcast: (data: string) => void;
  resizeAll: (cols: number, rows: number) => void;
  closeAll: () => void;
}

export interface DebugTerminal extends SkillTerminal {
  type: "debug";
  breakpoints: string[];
  port?: number;
  watch?: boolean;
}

export interface CollaborativeTerminal extends SkillTerminal {
  type: "collaborative";
  sessionId: string;
  users: string[];
  server: any;
  webSocketUrl: string;
  addUser: (userId: string) => void;
  removeUser: (userId: string) => void;
}

export interface RecordedTerminal extends SkillTerminal {
  type: "recorded";
  frames: TerminalFrame[];
  outputFile: string;
  startTime: number;
  save: () => Promise<void>;
  play: (speed?: number) => Promise<void>;
}

export interface TerminalFrame {
  time: number;
  data: Uint8Array;
  type: "input" | "output";
}

export interface SkillTerminalOptions {
  cols?: number;
  rows?: number;
  env?: Record<string, string>;
  cwd?: string;
  command?: string;
  args?: string[];
  onData?: (data: Uint8Array) => void;
  onExit?: (code: number, signal?: string) => void;
  persistHistory?: boolean;
  colorMode?: "auto" | "always" | "never";
  shell?: string;
  /** Use an existing reusable terminal instead of creating a new one */
  reuseTerminal?: ReusableTerminal;
}

// =============================================================================
// SkillPTYManager Class
// =============================================================================

export class SkillPTYManager {
  private terminals = new Map<string, any>();
  private processes = new Map<string, any>();
  private terminalHistory = new Map<string, string[]>();
  private dashboards = new Map<string, SkillDashboard>();
  private reusableTerminals = new Map<string, ReusableTerminal>();

  /**
   * Create a reusable terminal that can be shared across multiple processes
   * Supports `await using` for automatic cleanup:
   *
   * @example
   * await using terminal = await ptyManager.createReusableTerminal();
   * await terminal.spawn(["echo", "first"]).exited;
   * await terminal.spawn(["echo", "second"]).exited;
   * // Terminal is automatically closed
   */
  async createReusableTerminal(options: {
    cols?: number;
    rows?: number;
    onData?: (data: Uint8Array) => void;
  } = {}): Promise<ReusableTerminal> {
    const terminalId = `reusable-${Date.now()}`;
    const cols = options.cols || process.stdout.columns || 80;
    const rows = options.rows || process.stdout.rows || 24;

    // Create standalone Bun.Terminal
    const terminal = new (Bun as any).Terminal({
      cols,
      rows,
      data: (term: any, data: Uint8Array) => {
        if (options.onData) {
          options.onData(data);
        } else {
          process.stdout.write(data);
        }
      },
    });

    const reusable: ReusableTerminal = {
      terminal,
      id: terminalId,
      cols,
      rows,

      write: (data: string | Uint8Array) => terminal.write(data),

      resize: (newCols: number, newRows: number) => {
        terminal.resize(newCols, newRows);
        reusable.cols = newCols;
        reusable.rows = newRows;
      },

      close: () => {
        terminal.close();
        this.reusableTerminals.delete(terminalId);
      },

      spawn: (cmd: string[], spawnOptions?: { cwd?: string; env?: Record<string, string> }) => {
        return Bun.spawn(cmd, {
          terminal,
          cwd: spawnOptions?.cwd,
          env: {
            ...process.env,
            ...spawnOptions?.env,
          },
        });
      },

      // Support for `await using` syntax
      [Symbol.asyncDispose]: async () => {
        terminal.close();
        this.reusableTerminals.delete(terminalId);
      },
    };

    this.reusableTerminals.set(terminalId, reusable);

    // Set up resize handling
    if (process.stdout.isTTY) {
      process.stdout.on("resize", () => {
        reusable.resize(process.stdout.columns, process.stdout.rows);
      });
    }

    return reusable;
  }

  /**
   * Run multiple commands sequentially in a reusable terminal
   * Terminal is automatically cleaned up after all commands complete
   *
   * @example
   * await ptyManager.runSequential("weather", [
   *   ["bun", "run", "src/index.ts", "--help"],
   *   ["bun", "run", "src/index.ts", "current", "Tokyo"],
   * ]);
   */
  async runSequential(
    skillId: string,
    commands: string[][],
    options: {
      onData?: (data: Uint8Array) => void;
      onCommandComplete?: (index: number, exitCode: number) => void;
    } = {}
  ): Promise<number[]> {
    const skillDir = `./skills/${skillId}`;
    const exitCodes: number[] = [];

    await using terminal = await this.createReusableTerminal({
      onData: options.onData,
    });

    for (let i = 0; i < commands.length; i++) {
      const proc = terminal.spawn(commands[i], { cwd: skillDir });
      const exitCode = await proc.exited;
      exitCodes.push(exitCode);

      if (options.onCommandComplete) {
        options.onCommandComplete(i, exitCode);
      }
    }

    return exitCodes;
  }

  /**
   * Create an interactive session with input forwarding
   * Returns when the user exits (Ctrl+D or process ends)
   *
   * @example
   * await ptyManager.runInteractive("weather", ["bash"]);
   */
  async runInteractive(
    skillId: string,
    command: string[],
    options: {
      env?: Record<string, string>;
    } = {}
  ): Promise<number> {
    const skillDir = `./skills/${skillId}`;

    await using terminal = await this.createReusableTerminal({
      onData: (data) => process.stdout.write(data),
    });

    const proc = terminal.spawn(command, {
      cwd: skillDir,
      env: options.env,
    });

    // Forward input from stdin
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();

      const inputHandler = (chunk: Buffer) => {
        terminal.write(chunk);
      };
      process.stdin.on("data", inputHandler);

      const exitCode = await proc.exited;

      process.stdin.off("data", inputHandler);
      process.stdin.setRawMode(false);
      process.stdin.pause();

      return exitCode;
    }

    return await proc.exited;
  }

  /**
   * Create an interactive PTY session for a skill
   */
  async createSkillTerminal(
    skillId: string,
    options: SkillTerminalOptions = {}
  ): Promise<SkillTerminal> {
    const skillDir = `./skills/${skillId}`;
    const terminalId = `${skillId}-${Date.now()}`;

    // Verify skill exists
    const skillJsonExists = await Bun.file(`${skillDir}/skill.json`).exists();
    if (!skillJsonExists) {
      throw new Error(`Skill not found: ${skillId}`);
    }

    // Prepare environment
    const env = {
      ...process.env,
      SKILL_ID: skillId,
      SKILL_TERMINAL: "true",
      COLORTERM: "truecolor",
      TERM: "xterm-256color",
      ...(options.env || {}),
    };

    // Create terminal configuration
    const terminalConfig = {
      cols: options.cols || process.stdout.columns || 80,
      rows: options.rows || process.stdout.rows || 24,
      data: (term: any, data: Uint8Array) => {
        // Store in history
        if (options.persistHistory) {
          const history = this.terminalHistory.get(terminalId) || [];
          const text = new TextDecoder().decode(data);
          history.push(text);
          if (history.length > 1000) history.shift();
          this.terminalHistory.set(terminalId, history);
        }

        // Call user handler or default
        if (options.onData) {
          options.onData(data);
        } else {
          this.writeWithPrefix(skillId, data);
        }
      },
    };

    // Determine command to run
    const command = options.command || (await this.detectSkillCommand(skillId));
    const args = options.args || [];

    // Spawn the skill process with PTY
    const proc = Bun.spawn([command, ...args], {
      terminal: terminalConfig,
      cwd: options.cwd || skillDir,
      env,
    });

    this.terminals.set(terminalId, terminalConfig);
    this.processes.set(terminalId, proc);

    // Set up resize handling
    if (process.stdout.isTTY) {
      const resizeHandler = () => {
        proc.terminal?.resize(process.stdout.columns, process.stdout.rows);
      };
      process.stdout.on("resize", resizeHandler);
    }

    // Handle process exit
    proc.exited.then((exitCode: number) => {
      if (options.onExit) {
        options.onExit(exitCode);
      }
      this.terminals.delete(terminalId);
      this.processes.delete(terminalId);
    });

    return {
      id: terminalId,
      terminal: proc.terminal,
      process: proc,
      skillId,
      write: (data: string | Uint8Array) => proc.terminal?.write(data),
      resize: (cols: number, rows: number) => proc.terminal?.resize(cols, rows),
      kill: (signal?: string) => proc.kill(signal),
      getHistory: () => this.terminalHistory.get(terminalId) || [],
      clearHistory: () => this.terminalHistory.delete(terminalId),
    };
  }

  /**
   * Create a multi-skill dashboard with multiple terminals
   */
  async createSkillDashboard(
    skillIds: string[],
    options: {
      layout?: "horizontal" | "vertical" | "grid";
      maxColumns?: number;
      title?: string;
    } = {}
  ): Promise<SkillDashboard> {
    const layout = options.layout || "grid";
    const maxColumns = options.maxColumns || 2;
    const dashboardId = `dashboard-${Date.now()}`;

    console.log(`Creating skill dashboard for: ${skillIds.join(", ")}`);

    const terminals: SkillTerminal[] = [];

    // Create terminals for each skill
    for (let i = 0; i < skillIds.length; i++) {
      const skillId = skillIds[i];

      // Calculate position based on layout
      let cols = 80,
        rows = 24;
      if (layout === "horizontal") {
        cols = Math.floor((process.stdout.columns || 80) / skillIds.length);
      } else if (layout === "vertical") {
        rows = Math.floor((process.stdout.rows || 24) / skillIds.length);
      } else if (layout === "grid") {
        const itemsPerColumn = Math.ceil(skillIds.length / maxColumns);
        cols = Math.floor(
          (process.stdout.columns || 80) /
            Math.min(skillIds.length, maxColumns)
        );
        rows = Math.floor((process.stdout.rows || 24) / itemsPerColumn);
      }

      const terminal = await this.createSkillTerminal(skillId, {
        cols,
        rows: rows - 2,
        env: {
          SKILL_DASHBOARD: "true",
          SKILL_POSITION: `${i}`,
        },
        onData: (data) => {
          this.dashboardOutput(dashboardId, skillId, i, data);
        },
        persistHistory: true,
      });

      terminals.push(terminal);
    }

    const dashboard: SkillDashboard = {
      id: dashboardId,
      terminals,
      layout,
      activeTerminal: 0,

      switchTerminal: (index: number) => {
        dashboard.activeTerminal = index;
        console.log(
          `Switched to terminal ${index}: ${terminals[index].skillId}`
        );
      },

      broadcast: (data: string) => {
        terminals.forEach((terminal) => terminal.write(data));
      },

      resizeAll: (cols: number, rows: number) => {
        terminals.forEach((terminal) => terminal.resize(cols, rows));
      },

      closeAll: () => {
        terminals.forEach((terminal) => terminal.kill());
        terminals.length = 0;
        this.dashboards.delete(dashboardId);
      },
    };

    this.dashboards.set(dashboardId, dashboard);

    // Set up global input handling for dashboard
    this.setupDashboardInput(dashboard);

    return dashboard;
  }

  /**
   * Create an interactive debug terminal with breakpoints
   */
  async createDebugTerminal(
    skillId: string,
    options: {
      breakpoints?: string[];
      inspector?: boolean;
      port?: number;
      watch?: boolean;
    } = {}
  ): Promise<DebugTerminal> {
    console.log(`Creating debug terminal for ${skillId}`);

    const debugEnv: Record<string, string> = {
      NODE_ENV: "development",
      DEBUG: "skill:*",
      SKILL_DEBUG: "true",
    };

    if (options.inspector) {
      debugEnv.NODE_OPTIONS = `--inspect=${options.port || 9229}`;
    }

    // Build debug version if needed
    if (options.watch) {
      await this.buildDebugVersion(skillId);
    }

    // Create debug terminal
    const terminal = await this.createSkillTerminal(skillId, {
      env: debugEnv,
      command: "bun",
      args: ["run", "src/index.ts", "--help"],
      onData: (data) => {
        const text = new TextDecoder().decode(data);

        // Highlight debugger output
        if (
          text.includes("Debugger attached") ||
          text.includes("chrome-devtools")
        ) {
          process.stdout.write(`\x1b[32m${text}\x1b[0m`);
        } else if (text.includes("Breakpoint") || text.includes("Paused")) {
          process.stdout.write(`\x1b[33m${text}\x1b[0m`);
        } else if (text.includes("Error") || text.includes("error")) {
          process.stdout.write(`\x1b[31m${text}\x1b[0m`);
        } else {
          process.stdout.write(text);
        }
      },
      persistHistory: true,
    });

    // Add debug info
    setTimeout(() => {
      console.log(`\n\x1b[1;35mDebugger commands:\x1b[0m`);
      console.log(`  c/continue - Continue execution`);
      console.log(`  n/next     - Step over`);
      console.log(`  s/step     - Step into`);
      console.log(`  o/out      - Step out`);
      console.log(`  b <file:line> - Set breakpoint`);
      console.log(`  .help      - Show all commands`);
      console.log(``);
    }, 500);

    return {
      ...terminal,
      type: "debug",
      breakpoints: options.breakpoints || [],
      port: options.port,
      watch: options.watch,
    };
  }

  /**
   * Create a collaborative terminal session (pair programming)
   */
  async createCollaborativeTerminal(
    skillId: string,
    options: {
      sessionId?: string;
      users?: string[];
      readOnly?: boolean;
    } = {}
  ): Promise<CollaborativeTerminal> {
    const sessionId = options.sessionId || `collab-${Date.now()}`;
    const users = options.users || [];

    console.log(`Creating collaborative session: ${sessionId}`);
    console.log(`Users: ${users.join(", ") || "(none yet)"}`);

    const terminal = await this.createSkillTerminal(skillId, {
      env: {
        COLLAB_SESSION: sessionId,
        COLLAB_USERS: users.join(","),
      },
      onData: (data) => {
        // Broadcast to all connected users
        this.broadcastToSession(sessionId, data);
        process.stdout.write(data);
      },
    });

    // WebSocket server for real-time collaboration
    const server = Bun.serve({
      port: 0, // Random port
      fetch(req, server) {
        const url = new URL(req.url);

        if (url.pathname === "/collab") {
          const success = server.upgrade(req);
          if (success) return undefined;
        }

        return new Response("Collaborative Terminal Server", { status: 200 });
      },
      websocket: {
        open(ws) {
          console.log(`New collaborator connected`);
          ws.subscribe(sessionId);
        },
        message(ws, message) {
          // Forward user input to terminal
          if (typeof message === "string") {
            terminal.write(message);
          } else if (message instanceof Uint8Array) {
            terminal.write(message);
          }
        },
        close(ws) {
          console.log(`Collaborator disconnected`);
          ws.unsubscribe(sessionId);
        },
      },
    });

    return {
      ...terminal,
      type: "collaborative",
      sessionId,
      users,
      server,
      webSocketUrl: `ws://localhost:${server.port}/collab`,
      addUser: (userId: string) => {
        users.push(userId);
        console.log(`Added user: ${userId}`);
      },
      removeUser: (userId: string) => {
        const index = users.indexOf(userId);
        if (index > -1) users.splice(index, 1);
      },
    };
  }

  /**
   * Record terminal session for playback
   */
  async createRecordedTerminal(
    skillId: string,
    options: {
      outputFile?: string;
      includeTimestamps?: boolean;
      maxDuration?: number;
    } = {}
  ): Promise<RecordedTerminal> {
    const outputFile =
      options.outputFile || `./recordings/${skillId}-${Date.now()}.cast`;
    const frames: TerminalFrame[] = [];
    let startTime = 0;

    console.log(`Recording terminal session: ${outputFile}`);

    const terminal = await this.createSkillTerminal(skillId, {
      onData: (data) => {
        const now = Date.now();
        if (!startTime) startTime = now;

        const elapsed = now - startTime;

        frames.push({
          time: elapsed,
          data: new Uint8Array(data),
          type: "output",
        });

        process.stdout.write(data);
      },
    });

    // Also record input
    const originalWrite = terminal.write;
    terminal.write = function (data: string | Uint8Array) {
      const now = Date.now();
      const elapsed = now - startTime;

      frames.push({
        time: elapsed,
        data:
          typeof data === "string" ? new TextEncoder().encode(data) : data,
        type: "input",
      });

      return originalWrite.call(this, data);
    };

    const cols = process.stdout.columns || 80;
    const rows = process.stdout.rows || 24;

    return {
      ...terminal,
      type: "recorded",
      frames,
      outputFile,
      startTime,

      save: async () => {
        // Ensure directory exists
        const dir = outputFile.substring(0, outputFile.lastIndexOf("/"));
        await Bun.spawn(["mkdir", "-p", dir]).exited;

        // Convert to asciinema format
        const asciicast = {
          version: 2,
          width: cols,
          height: rows,
          timestamp: startTime,
          title: `Skill: ${skillId}`,
          env: {
            SHELL: "/bin/bash",
            TERM: "xterm-256color",
          },
        };

        const lines = [JSON.stringify(asciicast)];

        for (const frame of frames.filter((f) => f.type === "output")) {
          lines.push(
            JSON.stringify([
              frame.time / 1000,
              "o",
              new TextDecoder().decode(frame.data),
            ])
          );
        }

        await Bun.write(outputFile, lines.join("\n"));
        console.log(`Recording saved to: ${outputFile}`);
      },

      play: async (speed = 1.0) => {
        console.log(`Playing recording at ${speed}x speed...`);

        let lastTime = 0;
        for (const frame of frames) {
          const delay = (frame.time - lastTime) / speed;
          if (delay > 0) {
            await Bun.sleep(delay);
          }
          process.stdout.write(frame.data);
          lastTime = frame.time;
        }

        console.log(`\nPlayback complete`);
      },
    };
  }

  /**
   * Set up input forwarding for interactive terminal
   */
  setupInputForwarding(terminalId: string, terminal: any): void {
    if (!process.stdin.isTTY) return;

    process.stdin.setRawMode(true);
    process.stdin.resume();

    const onStdinData = (data: Buffer) => {
      const str = data.toString();

      // Handle control sequences
      if (str === "\x03") {
        // Ctrl+C
        console.log("\nInterrupted");
        const proc = this.processes.get(terminalId);
        if (proc) {
          proc.kill("SIGINT");
        }
      } else if (str === "\x04") {
        // Ctrl+D
        console.log("\nExiting");
        const proc = this.processes.get(terminalId);
        if (proc) {
          proc.kill("SIGTERM");
        }
        process.exit(0);
      } else {
        terminal?.write(data);
      }
    };

    process.stdin.on("data", onStdinData);

    // Cleanup handler
    const cleanup = () => {
      process.stdin.off("data", onStdinData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
  }

  // Private helper methods
  private async detectSkillCommand(skillId: string): Promise<string> {
    const skillDir = `./skills/${skillId}`;

    const possibleEntries = [
      `${skillDir}/src/index.ts`,
      `${skillDir}/src/index.js`,
      `${skillDir}/index.ts`,
      `${skillDir}/index.js`,
      `${skillDir}/dist/index.js`,
    ];

    for (const entry of possibleEntries) {
      if (await Bun.file(entry).exists()) {
        return "bun";
      }
    }

    return "/bin/bash";
  }

  private writeWithPrefix(skillId: string, data: Uint8Array): void {
    const text = new TextDecoder().decode(data);
    const lines = text.split("\n");

    for (const line of lines) {
      if (line.trim()) {
        process.stdout.write(`\x1b[36m[${skillId}]\x1b[0m ${line}\n`);
      }
    }
  }

  private dashboardOutput(
    dashboardId: string,
    skillId: string,
    index: number,
    data: Uint8Array
  ): void {
    const text = new TextDecoder().decode(data);
    const lines = text.split("\n");
    const color = this.getTerminalColor(index);

    for (const line of lines) {
      if (line.trim()) {
        process.stdout.write(`\x1b[${color}m[${skillId}]\x1b[0m ${line}\n`);
      }
    }
  }

  private getTerminalColor(index: number): number {
    const colors = [31, 32, 33, 34, 35, 36, 91, 92, 93, 94, 95, 96];
    return colors[index % colors.length];
  }

  private setupDashboardInput(dashboard: SkillDashboard): void {
    if (!process.stdin.isTTY) return;

    process.stdin.setRawMode(true);
    process.stdin.resume();

    const onStdinData = (data: Buffer) => {
      const str = data.toString();

      // Dashboard control keys
      if (str === "\x02") {
        // Ctrl+B - switch terminal
        dashboard.activeTerminal =
          (dashboard.activeTerminal + 1) % dashboard.terminals.length;
        console.log(`Switched to terminal ${dashboard.activeTerminal}`);
      } else if (str === "\x0e") {
        // Ctrl+N - next terminal
        dashboard.activeTerminal = Math.min(
          dashboard.activeTerminal + 1,
          dashboard.terminals.length - 1
        );
      } else if (str === "\x10") {
        // Ctrl+P - previous terminal
        dashboard.activeTerminal = Math.max(dashboard.activeTerminal - 1, 0);
      } else if (str === "\x01") {
        // Ctrl+A - interrupt all
        dashboard.broadcast("\x03");
      } else {
        // Send to active terminal
        const activeTerminal = dashboard.terminals[dashboard.activeTerminal];
        if (activeTerminal) {
          activeTerminal.write(data);
        }
      }
    };

    process.stdin.on("data", onStdinData);

    console.log(`
Dashboard Controls:
  Ctrl+B     - Switch between terminals
  Ctrl+N     - Next terminal
  Ctrl+P     - Previous terminal
  Ctrl+A     - Interrupt all terminals
  Ctrl+C     - Interrupt active terminal
  Ctrl+D     - Exit dashboard
`);
  }

  private async buildDebugVersion(skillId: string): Promise<void> {
    console.log(`Building debug version of ${skillId}...`);

    const result = await Bun.build({
      entrypoints: [`./skills/${skillId}/src/index.ts`],
      outdir: `./skills/${skillId}/.debug`,
      target: "node",
      minify: false,
      sourcemap: "inline",
      define: {
        "process.env.NODE_ENV": '"development"',
        "process.env.DEBUG": '"true"',
      },
    });

    if (!result.success) {
      throw new Error("Build failed: " + result.logs.join("\n"));
    }

    console.log("Debug build complete");
  }

  private broadcastToSession(sessionId: string, data: Uint8Array): void {
    // Would use WebSocket server to broadcast in real implementation
    // For now handled in the collaborative terminal setup
  }

  /**
   * List all active terminals
   */
  listTerminals(): Array<{ id: string; skillId: string; pid: number }> {
    const result: Array<{ id: string; skillId: string; pid: number }> = [];

    for (const [id, proc] of this.processes) {
      const skillId = id.split("-")[0];
      result.push({
        id,
        skillId,
        pid: proc.pid,
      });
    }

    return result;
  }

  /**
   * Kill a terminal by ID
   */
  killTerminal(terminalId: string): boolean {
    const proc = this.processes.get(terminalId);
    if (proc) {
      proc.kill();
      this.processes.delete(terminalId);
      this.terminals.delete(terminalId);
      return true;
    }
    return false;
  }

  /**
   * Kill all terminals for a skill
   */
  killAllForSkill(skillId: string): number {
    let killed = 0;

    for (const [id, proc] of this.processes) {
      if (id.startsWith(skillId)) {
        proc.kill();
        this.processes.delete(id);
        this.terminals.delete(id);
        killed++;
      }
    }

    return killed;
  }

  /**
   * List all reusable terminals
   */
  listReusableTerminals(): Array<{ id: string; cols: number; rows: number }> {
    return Array.from(this.reusableTerminals.values()).map((t) => ({
      id: t.id,
      cols: t.cols,
      rows: t.rows,
    }));
  }

  /**
   * Get a reusable terminal by ID
   */
  getReusableTerminal(id: string): ReusableTerminal | undefined {
    return this.reusableTerminals.get(id);
  }

  /**
   * Close all reusable terminals
   */
  closeAllReusableTerminals(): number {
    let closed = 0;

    for (const terminal of this.reusableTerminals.values()) {
      terminal.close();
      closed++;
    }

    return closed;
  }

  /**
   * Cleanup all resources (terminals, processes, reusable terminals)
   */
  async cleanup(): Promise<void> {
    // Kill all processes
    for (const proc of this.processes.values()) {
      proc.kill();
    }
    this.processes.clear();
    this.terminals.clear();

    // Close all reusable terminals
    for (const terminal of this.reusableTerminals.values()) {
      terminal.close();
    }
    this.reusableTerminals.clear();

    // Close all dashboards
    for (const dashboard of this.dashboards.values()) {
      dashboard.closeAll();
    }
    this.dashboards.clear();

    // Clear history
    this.terminalHistory.clear();
  }
}

// =============================================================================
// Enhanced Metrics Types
// =============================================================================

export interface EnhancedSkillMetrics {
  aggregate: {
    totalExecutions: number;
    totalSuccesses: number;
    totalFailures: number;
    successRate: string;
    totalTime: string;
    averageTime: string;
  };
  bySkill: Record<
    string,
    {
      executions: number;
      successes: number;
      failures: number;
      averageDuration: number;
      lastExecuted: string;
      commands: Record<string, { count: number; avgDuration: number }>;
    }
  >;
  terminalUsage: {
    interactiveSessions: number;
    dashboardSessions: number;
    debugSessions: number;
    totalTerminalTime: string;
    activeTerminals: number;
  };
  trends: {
    lastHour: { executions: number; avgDuration: number; errorRate: string };
    last24Hours: { executions: number; avgDuration: number; errorRate: string };
  };
  recentExecutions: Array<{
    skillId: string;
    command: string;
    args: any[];
    status: "success" | "failure";
    duration: number;
    timestamp: string;
    terminalId?: string;
    error?: string;
  }>;
  system: {
    uptime: string;
    memoryUsage: string;
    cpuUsage: string;
    activeProcesses: number;
  };
}

// =============================================================================
// Metrics Collector
// =============================================================================

export class MetricsCollector {
  private metrics: EnhancedSkillMetrics;
  private metricsFile = "./.skill-metrics.json";

  constructor() {
    this.metrics = this.loadMetrics();
  }

  getMetrics(): EnhancedSkillMetrics {
    return this.metrics;
  }

  recordExecution(
    skillId: string,
    command: string,
    args: any[],
    duration: number,
    success: boolean,
    error?: string,
    terminalId?: string
  ): void {
    // Update aggregate
    this.metrics.aggregate.totalExecutions++;
    if (success) {
      this.metrics.aggregate.totalSuccesses++;
    } else {
      this.metrics.aggregate.totalFailures++;
    }

    // Update per-skill
    if (!this.metrics.bySkill[skillId]) {
      this.metrics.bySkill[skillId] = {
        executions: 0,
        successes: 0,
        failures: 0,
        averageDuration: 0,
        lastExecuted: new Date().toISOString(),
        commands: {},
      };
    }

    const skillMetrics = this.metrics.bySkill[skillId];
    skillMetrics.executions++;
    if (success) {
      skillMetrics.successes++;
    } else {
      skillMetrics.failures++;
    }
    skillMetrics.lastExecuted = new Date().toISOString();

    // Update command metrics
    if (!skillMetrics.commands[command]) {
      skillMetrics.commands[command] = { count: 0, avgDuration: 0 };
    }

    const cmdMetrics = skillMetrics.commands[command];
    const oldTotal = cmdMetrics.avgDuration * cmdMetrics.count;
    cmdMetrics.count++;
    cmdMetrics.avgDuration = (oldTotal + duration) / cmdMetrics.count;

    // Update skill average duration
    const skillOldTotal =
      skillMetrics.averageDuration * (skillMetrics.executions - 1);
    skillMetrics.averageDuration =
      (skillOldTotal + duration) / skillMetrics.executions;

    // Add to recent executions (keep last 100)
    this.metrics.recentExecutions.unshift({
      skillId,
      command,
      args,
      status: success ? "success" : "failure",
      duration,
      timestamp: new Date().toISOString(),
      terminalId,
      error,
    });

    if (this.metrics.recentExecutions.length > 100) {
      this.metrics.recentExecutions.pop();
    }

    // Update aggregate rates
    this.updateAggregateRates();
    this.saveMetrics();
  }

  recordTerminalStart(
    skillId: string,
    terminalId: string,
    type: "interactive" | "dashboard" | "debug" = "interactive"
  ): void {
    this.metrics.terminalUsage.activeTerminals++;
    switch (type) {
      case "interactive":
        this.metrics.terminalUsage.interactiveSessions++;
        break;
      case "dashboard":
        this.metrics.terminalUsage.dashboardSessions++;
        break;
      case "debug":
        this.metrics.terminalUsage.debugSessions++;
        break;
    }
    this.saveMetrics();
  }

  recordTerminalEnd(
    terminalId: string,
    duration: number,
    exitCode: number
  ): void {
    this.metrics.terminalUsage.activeTerminals = Math.max(
      0,
      this.metrics.terminalUsage.activeTerminals - 1
    );
    const currentTime = parseInt(
      this.metrics.terminalUsage.totalTerminalTime || "0"
    );
    this.metrics.terminalUsage.totalTerminalTime = (
      currentTime + duration
    ).toString();
    this.saveMetrics();
  }

  recordTerminalOutput(terminalId: string, byteCount: number): void {
    // Could track output volume per terminal if needed
  }

  private updateAggregateRates(): void {
    const total = this.metrics.aggregate.totalExecutions;
    const successes = this.metrics.aggregate.totalSuccesses;

    this.metrics.aggregate.successRate =
      total > 0 ? `${((successes / total) * 100).toFixed(1)}%` : "N/A";

    // Calculate trends from recent executions
    const now = Date.now();
    const hourAgo = now - 3600000;
    const dayAgo = now - 86400000;

    const lastHourExecs = this.metrics.recentExecutions.filter(
      (e) => new Date(e.timestamp).getTime() > hourAgo
    );
    const lastDayExecs = this.metrics.recentExecutions.filter(
      (e) => new Date(e.timestamp).getTime() > dayAgo
    );

    this.metrics.trends.lastHour = {
      executions: lastHourExecs.length,
      avgDuration:
        lastHourExecs.length > 0
          ? lastHourExecs.reduce((a, e) => a + e.duration, 0) /
            lastHourExecs.length
          : 0,
      errorRate:
        lastHourExecs.length > 0
          ? `${(
              (lastHourExecs.filter((e) => e.status === "failure").length /
                lastHourExecs.length) *
              100
            ).toFixed(1)}%`
          : "0%",
    };

    this.metrics.trends.last24Hours = {
      executions: lastDayExecs.length,
      avgDuration:
        lastDayExecs.length > 0
          ? lastDayExecs.reduce((a, e) => a + e.duration, 0) /
            lastDayExecs.length
          : 0,
      errorRate:
        lastDayExecs.length > 0
          ? `${(
              (lastDayExecs.filter((e) => e.status === "failure").length /
                lastDayExecs.length) *
              100
            ).toFixed(1)}%`
          : "0%",
    };
  }

  private loadMetrics(): EnhancedSkillMetrics {
    try {
      const file = Bun.file(this.metricsFile);
      if (file.size > 0) {
        // Use sync read for constructor
        const data = require("fs").readFileSync(this.metricsFile, "utf-8");
        return JSON.parse(data);
      }
    } catch {
      // File doesn't exist or is invalid
    }
    return this.getDefaultMetrics();
  }

  private saveMetrics(): void {
    try {
      require("fs").writeFileSync(
        this.metricsFile,
        JSON.stringify(this.metrics, null, 2)
      );
    } catch (error) {
      console.error("Failed to save metrics:", error);
    }
  }

  private getDefaultMetrics(): EnhancedSkillMetrics {
    return {
      aggregate: {
        totalExecutions: 0,
        totalSuccesses: 0,
        totalFailures: 0,
        successRate: "N/A",
        totalTime: "0ms",
        averageTime: "0ms",
      },
      bySkill: {},
      terminalUsage: {
        interactiveSessions: 0,
        dashboardSessions: 0,
        debugSessions: 0,
        totalTerminalTime: "0",
        activeTerminals: 0,
      },
      trends: {
        lastHour: { executions: 0, avgDuration: 0, errorRate: "0%" },
        last24Hours: { executions: 0, avgDuration: 0, errorRate: "0%" },
      },
      recentExecutions: [],
      system: {
        uptime: process.uptime().toString(),
        memoryUsage: `${Math.round(
          process.memoryUsage().heapUsed / 1024 / 1024
        )}MB`,
        cpuUsage: "0%",
        activeProcesses: 0,
      },
    };
  }
}

// =============================================================================
// Metrics-Enhanced PTY Manager
// =============================================================================

export class MetricsEnhancedPTYManager extends SkillPTYManager {
  private metricsCollector: MetricsCollector;

  constructor(metricsCollector?: MetricsCollector) {
    super();
    this.metricsCollector = metricsCollector || new MetricsCollector();
  }

  getMetricsCollector(): MetricsCollector {
    return this.metricsCollector;
  }

  async createSkillTerminal(
    skillId: string,
    options: {
      cols?: number;
      rows?: number;
      env?: Record<string, string>;
      cwd?: string;
      command?: string;
      args?: string[];
      onData?: (data: Uint8Array) => void;
      onExit?: (code: number, signal?: string) => void;
      persistHistory?: boolean;
      colorMode?: "auto" | "always" | "never";
      shell?: string;
    } = {}
  ): Promise<SkillTerminal> {
    const startTime = Date.now();
    const terminal = await super.createSkillTerminal(skillId, options);

    // Track terminal creation
    this.metricsCollector.recordTerminalStart(skillId, terminal.id, "interactive");

    // Wrap the original onData handler to track output
    const originalDataHandler = terminal.terminal.data;
    if (terminal.terminal && typeof terminal.terminal === "object") {
      const collector = this.metricsCollector;
      const termId = terminal.id;

      // Note: terminal.terminal.data is set during creation, we track via onData option
      if (options.onData) {
        const originalOnData = options.onData;
        // The data handler is already set up in parent, but we can track via process events
      }
    }

    // Track session end
    terminal.process.exited.then((code: number) => {
      const duration = Date.now() - startTime;
      this.metricsCollector.recordTerminalEnd(terminal.id, duration, code);
    });

    return terminal;
  }

  async createDebugTerminal(
    skillId: string,
    options: {
      breakpoints?: string[];
      inspector?: boolean;
      port?: number;
      watch?: boolean;
    } = {}
  ): Promise<DebugTerminal> {
    const startTime = Date.now();
    const terminal = await super.createDebugTerminal(skillId, options);

    // Track debug terminal
    this.metricsCollector.recordTerminalStart(skillId, terminal.id, "debug");

    terminal.process.exited.then((code: number) => {
      const duration = Date.now() - startTime;
      this.metricsCollector.recordTerminalEnd(terminal.id, duration, code);
    });

    return terminal;
  }

  async createSkillDashboard(
    skillIds: string[],
    options: {
      layout?: "horizontal" | "vertical" | "grid";
      maxColumns?: number;
      title?: string;
    } = {}
  ): Promise<SkillDashboard> {
    const dashboard = await super.createSkillDashboard(skillIds, options);

    // Track dashboard session
    this.metricsCollector.recordTerminalStart(
      skillIds.join(","),
      dashboard.id,
      "dashboard"
    );

    return dashboard;
  }

  /**
   * Record a skill execution (for API integration)
   */
  recordExecution(
    skillId: string,
    command: string,
    args: any[],
    duration: number,
    success: boolean,
    error?: string,
    terminalId?: string
  ): void {
    this.metricsCollector.recordExecution(
      skillId,
      command,
      args,
      duration,
      success,
      error,
      terminalId
    );
  }

  /**
   * Get current metrics
   */
  getMetrics(): EnhancedSkillMetrics {
    return this.metricsCollector.getMetrics();
  }
}

// =============================================================================
// Singleton instance for global metrics
// =============================================================================

let globalMetricsCollector: MetricsCollector | null = null;

export function getGlobalMetricsCollector(): MetricsCollector {
  if (!globalMetricsCollector) {
    globalMetricsCollector = new MetricsCollector();
  }
  return globalMetricsCollector;
}

export default SkillPTYManager;
