/**
 * PTYManager.ts - Core PTY Terminal Management
 * Handles Bun.Terminal instances with reusable terminal support
 *
 * Platform: POSIX only (Linux, macOS)
 * Terminal Methods: write(), resize(), setRawMode(), ref()/unref(), close()
 */

export interface TerminalDimensions {
  cols: number;
  rows: number;
}

export interface TerminalOptions {
  cols?: number;
  rows?: number;
  command?: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  onData?: (data: string) => void;
  onResize?: (cols: number, rows: number) => void;
  onExit?: (exitCode: number) => void;
}

// Bun.Terminal type definition
interface BunTerminal {
  write(data: string | Uint8Array): void;
  resize(cols: number, rows: number): void;
  setRawMode(enabled: boolean): void;
  ref(): void;
  unref(): void;
  close(): void;
  [Symbol.asyncDispose](): Promise<void>;
}

export interface ManagedTerminal {
  id: string;
  terminal: BunTerminal;
  process: ReturnType<typeof Bun.spawn>;
  dimensions: TerminalDimensions;
  createdAt: number;
  write: (data: string) => void;
  resize: (cols: number, rows: number) => void;
  close: () => Promise<void>;
}

export interface TerminalEvent {
  type: 'data' | 'resize' | 'exit' | 'error';
  terminalId: string;
  data?: string;
  cols?: number;
  rows?: number;
  exitCode?: number;
  error?: Error;
  timestamp: number;
}

type EventCallback = (event: TerminalEvent) => void;

export class PTYManager {
  private terminals: Map<string, ManagedTerminal> = new Map();
  private pidToTerminalId: Map<number, string> = new Map();
  private eventListeners: Map<string, Set<EventCallback>> = new Map();
  private terminalOutputBuffers: Map<string, string[]> = new Map();

  constructor() {
    this.initializeEventTypes();
  }

  private initializeEventTypes(): void {
    ['data', 'resize', 'exit', 'error'].forEach(type => {
      this.eventListeners.set(type, new Set());
    });
  }

  /**
   * Generate unique terminal ID
   */
  private generateTerminalId(): string {
    return `term_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a new PTY terminal instance
   */
  async createTerminal(options: TerminalOptions = {}): Promise<ManagedTerminal> {
    const {
      cols = 80,
      rows = 24,
      command = 'bash',
      args = ['-i'],
      cwd = process.cwd(),
      env = { ...process.env, TERM: 'xterm-256color' },
      onData,
      onResize,
      onExit
    } = options;

    const terminalId = this.generateTerminalId();
    this.terminalOutputBuffers.set(terminalId, []);

    // Create reusable Bun.Terminal instance
    const terminal = new Bun.Terminal({
      cols,
      rows,
      data: (term: BunTerminal, data: Buffer) => {
        const output = data.toString();

        // Buffer output
        const buffer = this.terminalOutputBuffers.get(terminalId);
        if (buffer) {
          buffer.push(output);
          // Keep last 1000 lines
          if (buffer.length > 1000) buffer.shift();
        }

        // Emit event
        this.emit('data', {
          type: 'data',
          terminalId,
          data: output,
          timestamp: Date.now()
        });

        // Call user callback
        onData?.(output);
      }
    }) as BunTerminal;

    // Spawn process with PTY terminal
    // Note: stdin/stdout/stderr are mutually exclusive with terminal option
    const proc = Bun.spawn([command, ...args], {
      terminal,
      cwd,
      env: env as Record<string, string>,
      onExit: (proc, exitCode, signalCode, error) => {
        this.emit('exit', {
          type: 'exit',
          terminalId,
          exitCode: exitCode ?? 0,
          error,
          timestamp: Date.now()
        });

        onExit?.(exitCode ?? 0);
      }
    });

    // Create managed terminal object
    const managedTerminal: ManagedTerminal = {
      id: terminalId,
      terminal,
      process: proc,
      dimensions: { cols, rows },
      createdAt: Date.now(),
      write: (data: string) => terminal.write(data),
      resize: (c: number, r: number) => {
        terminal.resize(c, r);
        managedTerminal.dimensions = { cols: c, rows: r };
      },
      close: async () => {
        proc.kill();
        await proc.exited;
        terminal.close();
        this.terminals.delete(terminalId);
        this.pidToTerminalId.delete(proc.pid);
        this.terminalOutputBuffers.delete(terminalId);
      }
    };

    // Store references
    this.terminals.set(terminalId, managedTerminal);
    this.pidToTerminalId.set(proc.pid, terminalId);

    return managedTerminal;
  }

  /**
   * Create a reusable terminal that can run multiple processes
   */
  async createReusableTerminal(options: Omit<TerminalOptions, 'command' | 'args'> = {}): Promise<{
    id: string;
    terminal: any;
    dimensions: TerminalDimensions;
    run: (command: string, args?: string[]) => Promise<{ exitCode: number }>;
    write: (data: string) => void;
    resize: (cols: number, rows: number) => void;
    close: () => void;
  }> {
    const {
      cols = 80,
      rows = 24,
      cwd = process.cwd(),
      env = { ...process.env, TERM: 'xterm-256color' },
      onData,
      onResize
    } = options;

    const terminalId = this.generateTerminalId();

    // Create reusable terminal (can run multiple processes sequentially)
    const terminal = new Bun.Terminal({
      cols,
      rows,
      data: (term: BunTerminal, data: Buffer) => {
        const output = data.toString();
        this.emit('data', {
          type: 'data',
          terminalId,
          data: output,
          timestamp: Date.now()
        });
        onData?.(output);
      }
    }) as BunTerminal;

    const dimensions = { cols, rows };

    return {
      id: terminalId,
      terminal,
      dimensions,
      run: async (command: string, args: string[] = []) => {
        const proc = Bun.spawn([command, ...args], {
          terminal,
          cwd,
          env: env as Record<string, string>
        });
        await proc.exited;
        return { exitCode: proc.exitCode ?? 0 };
      },
      write: (data: string) => terminal.write(data),
      resize: (c: number, r: number) => {
        terminal.resize(c, r);
        dimensions.cols = c;
        dimensions.rows = r;
      },
      close: () => terminal.close()
    };
  }

  /**
   * Get terminal by ID
   */
  getTerminal(terminalId: string): ManagedTerminal | undefined {
    return this.terminals.get(terminalId);
  }

  /**
   * Get terminal by process PID
   */
  getTerminalByPid(pid: number): ManagedTerminal | undefined {
    const terminalId = this.pidToTerminalId.get(pid);
    return terminalId ? this.terminals.get(terminalId) : undefined;
  }

  /**
   * Get all active terminals
   */
  getAllTerminals(): ManagedTerminal[] {
    return Array.from(this.terminals.values());
  }

  /**
   * Get terminal output buffer
   */
  getOutputBuffer(terminalId: string): string[] {
    return this.terminalOutputBuffers.get(terminalId) || [];
  }

  /**
   * Close all terminals
   */
  async closeAll(): Promise<void> {
    const closePromises = Array.from(this.terminals.values()).map(t => t.close());
    await Promise.all(closePromises);
  }

  /**
   * Event emitter methods
   */
  on(event: string, callback: EventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.add(callback);
    }
  }

  off(event: string, callback: EventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private emit(event: string, data: TerminalEvent): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (err) {
          console.error(`Error in terminal event listener:`, err);
        }
      });
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    activeTerminals: number;
    totalEvents: number;
    oldestTerminal: number | null;
  } {
    const terminals = Array.from(this.terminals.values());
    return {
      activeTerminals: terminals.length,
      totalEvents: Array.from(this.eventListeners.values())
        .reduce((sum, set) => sum + set.size, 0),
      oldestTerminal: terminals.length > 0
        ? Math.min(...terminals.map(t => t.createdAt))
        : null
    };
  }

  /**
   * Create inline terminal with process (terminal config passed directly to spawn)
   * The terminal is accessed via proc.terminal after spawning
   */
  async createInlineTerminal(options: TerminalOptions = {}): Promise<{
    id: string;
    process: ReturnType<typeof Bun.spawn> & { terminal: BunTerminal };
    write: (data: string) => void;
    resize: (cols: number, rows: number) => void;
    close: () => Promise<void>;
  }> {
    const {
      cols = 80,
      rows = 24,
      command = 'bash',
      args = [],
      cwd = process.cwd(),
      env = { ...process.env, TERM: 'xterm-256color' },
      onData,
      onExit
    } = options;

    const terminalId = this.generateTerminalId();
    this.terminalOutputBuffers.set(terminalId, []);

    // Spawn with inline terminal config
    const proc = Bun.spawn([command, ...args], {
      cwd,
      env: env as Record<string, string>,
      terminal: {
        cols,
        rows,
        data: (terminal: BunTerminal, data: Buffer) => {
          const output = data.toString();

          const buffer = this.terminalOutputBuffers.get(terminalId);
          if (buffer) {
            buffer.push(output);
            if (buffer.length > 1000) buffer.shift();
          }

          this.emit('data', {
            type: 'data',
            terminalId,
            data: output,
            timestamp: Date.now()
          });

          onData?.(output);
        }
      },
      onExit: (proc, exitCode, signalCode, error) => {
        this.emit('exit', {
          type: 'exit',
          terminalId,
          exitCode: exitCode ?? 0,
          error,
          timestamp: Date.now()
        });
        onExit?.(exitCode ?? 0);
      }
    }) as ReturnType<typeof Bun.spawn> & { terminal: BunTerminal };

    return {
      id: terminalId,
      process: proc,
      write: (data: string) => proc.terminal.write(data),
      resize: (c: number, r: number) => proc.terminal.resize(c, r),
      close: async () => {
        proc.kill();
        await proc.exited;
        proc.terminal.close();
        this.terminalOutputBuffers.delete(terminalId);
      }
    };
  }

  /**
   * Run a command with automatic terminal cleanup using Symbol.asyncDispose
   * Usage: await using result = await ptyManager.runWithAutoCleanup('ls', ['-la']);
   */
  async runWithAutoCleanup(
    command: string,
    args: string[] = [],
    options: Omit<TerminalOptions, 'command' | 'args'> = {}
  ): Promise<{
    exitCode: number;
    output: string[];
    [Symbol.asyncDispose]: () => Promise<void>;
  }> {
    const {
      cols = 80,
      rows = 24,
      cwd = process.cwd(),
      env = { ...process.env, TERM: 'xterm-256color' },
      onData
    } = options;

    const output: string[] = [];

    // Create terminal with async dispose support
    const terminal = new Bun.Terminal({
      cols,
      rows,
      data: (term: BunTerminal, data: Buffer) => {
        const text = data.toString();
        output.push(text);
        onData?.(text);
      }
    }) as BunTerminal;

    const proc = Bun.spawn([command, ...args], {
      terminal,
      cwd,
      env: env as Record<string, string>
    });

    await proc.exited;
    const exitCode = proc.exitCode ?? 0;

    return {
      exitCode,
      output,
      [Symbol.asyncDispose]: async () => {
        terminal.close();
      }
    };
  }
}

// Singleton instance
export const ptyManager = new PTYManager();

export default PTYManager;
