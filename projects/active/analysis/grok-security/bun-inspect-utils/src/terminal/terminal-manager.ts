// [82.0.0.0] TERMINAL MANAGER - Multi-session PTY management
// Manages multiple terminal sessions with event handling
// Platform: POSIX only (Linux, macOS)

import type {
  TerminalSession,
  TerminalManagerConfig,
  TerminalEvent,
  TerminalDimensions,
  BunTerminalInstance,
} from "./types";
import { DEFAULT_TERMINAL_CONFIG } from "./types";
import { isPtySupported, createTerminal, spawnWithReusableTerminal } from "./pty-terminal";

type EventCallback = (event: TerminalEvent) => void;

/**
 * [82.1.0.0] Terminal Manager
 * Manages multiple PTY terminal sessions with event handling
 *
 * @example
 * ```typescript
 * const manager = new TerminalManager();
 * const session = await manager.createSession();
 * session.write("echo Hello\\n");
 * await session.close();
 * ```
 */
export class TerminalManager {
  private sessions = new Map<string, TerminalSession>();
  private config: TerminalManagerConfig;
  private eventCallbacks = new Map<string, Set<EventCallback>>();
  private sessionCounter = 0;

  constructor(config: Partial<TerminalManagerConfig> = {}) {
    this.config = { ...DEFAULT_TERMINAL_CONFIG, ...config };
  }

  /**
   * [82.2.0.0] Create a new terminal session
   */
  async createSession(options: {
    command?: string;
    args?: string[];
    cwd?: string;
    env?: Record<string, string>;
    dimensions?: Partial<TerminalDimensions>;
  } = {}): Promise<TerminalSession> {
    if (!isPtySupported()) {
      throw new Error("PTY support is only available on POSIX systems");
    }

    const sessionId = `term_${Date.now()}_${++this.sessionCounter}`;
    const dims: TerminalDimensions = {
      cols: options.dimensions?.cols ?? this.config.defaultDimensions.cols,
      rows: options.dimensions?.rows ?? this.config.defaultDimensions.rows,
    };

    const terminal = createTerminal({
      ...dims,
      data: (term, data) => this.emitEvent({
        type: "data",
        sessionId,
        timestamp: Date.now(),
        data,
      }),
      resize: (term, cols, rows) => this.emitEvent({
        type: "resize",
        sessionId,
        timestamp: Date.now(),
        dimensions: { cols, rows },
      }),
    });

    const command = options.command ?? this.config.defaultShell;
    const args = options.args ?? this.config.defaultArgs;
    const env = { ...this.config.defaultEnv, ...options.env };

    const proc = spawnWithReusableTerminal(
      [command, ...args],
      terminal,
      { cwd: options.cwd, env }
    );

    // Handle process exit
    proc.exited.then((exitCode) => {
      this.emitEvent({
        type: "exit",
        sessionId,
        timestamp: Date.now(),
        exitCode,
      });
      if (this.config.autoClose) {
        this.closeSession(sessionId).catch(console.error);
      }
    });

    const session: TerminalSession = {
      id: sessionId,
      terminal,
      process: proc,
      dimensions: { ...dims },
      createdAt: Date.now(),
      write: (data) => terminal.write(data),
      resize: (cols, rows) => {
        terminal.resize(cols, rows);
        session.dimensions = { cols, rows };
      },
      close: () => this.closeSession(sessionId),
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * [82.3.0.0] Get a session by ID
   */
  getSession(sessionId: string): TerminalSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * [82.4.0.0] Get all active sessions
   */
  getAllSessions(): TerminalSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * [82.5.0.0] Close a session
   */
  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.process.kill();
    await session.process.exited;
    session.terminal.close();
    this.sessions.delete(sessionId);
  }

  /**
   * [82.6.0.0] Close all sessions
   */
  async closeAll(): Promise<void> {
    await Promise.all(
      Array.from(this.sessions.keys()).map((id) => this.closeSession(id))
    );
  }

  /**
   * [82.7.0.0] Subscribe to terminal events
   */
  on(event: "data" | "resize" | "exit" | "error", callback: EventCallback): () => void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, new Set());
    }
    this.eventCallbacks.get(event)!.add(callback);
    return () => this.eventCallbacks.get(event)?.delete(callback);
  }

  private emitEvent(event: TerminalEvent): void {
    const callbacks = this.eventCallbacks.get(event.type);
    if (callbacks) {
      for (const cb of callbacks) {
        try {
          cb(event);
        } catch (err) {
          console.error(`Terminal event handler error:`, err);
        }
      }
    }
  }
}

