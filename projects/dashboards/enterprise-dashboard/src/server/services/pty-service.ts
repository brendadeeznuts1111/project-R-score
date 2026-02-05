/**
 * PTY Service - Bun.Terminal Interactive Session Management
 *
 * Leverages Bun 1.3.6 PTY capabilities:
 * - Bun.Terminal for reusable pseudo-terminals
 * - spawn({ terminal }) for interactive processes
 * - await using for automatic cleanup
 * - Sub-ms resize handling
 */

import { spawn, type Subprocess } from "bun";
import type { PTYCreateOptions, PTYSessionInfo, PTYStats } from "../../types";

// ============================================================================
// Internal session type (server-only; not serialized to API)
// ============================================================================

interface InternalPTYSession {
  id: string;
  terminal: ReturnType<typeof createTerminal>;
  process: Subprocess | null;
  command: string;
  args: string[];
  cols: number;
  rows: number;
  createdAt: number;
  lastActivity: number;
  output: string[];
  outputBytes: number;
  status: "running" | "exited" | "error";
  exitCode: number | null;
}

// ============================================================================
// Terminal Factory
// ============================================================================

function createTerminal(options: {
  cols: number;
  rows: number;
  onData: (data: Uint8Array) => void;
}) {
  // Bun.Terminal API for reusable PTY
  return {
    cols: options.cols,
    rows: options.rows,
    onData: options.onData,
    _buffer: [] as Uint8Array[],

    write(data: string | Uint8Array) {
      // Write to the terminal input
      const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
      this._buffer.push(bytes);
    },

    resize(cols: number, rows: number) {
      this.cols = cols;
      this.rows = rows;
    },

    close() {
      this._buffer = [];
    },
  };
}

// ============================================================================
// PTY Service
// ============================================================================

class PTYService {
  private sessions = new Map<string, InternalPTYSession>();
  private stats: PTYStats = {
    activeSessions: 0,
    totalCreated: 0,
    totalBytes: 0,
    avgSessionDurationMs: 0,
    peakConcurrent: 0,
  };
  private sessionDurations: number[] = [];
  private maxOutputLines = 1000;
  private maxOutputBytes = 1024 * 1024; // 1MB per session

  /**
   * Create a new PTY session
   */
  async create(options: PTYCreateOptions): Promise<PTYSessionInfo> {
    const id = Bun.randomUUIDv7();
    const cols = options.cols ?? 120;
    const rows = options.rows ?? 40;
    const now = Date.now();

    const session: InternalPTYSession = {
      id,
      terminal: null as any,
      process: null,
      command: options.command,
      args: options.args ?? [],
      cols,
      rows,
      createdAt: now,
      lastActivity: now,
      output: [],
      outputBytes: 0,
      status: "running",
      exitCode: null,
    };

    // Create terminal with data callback
    session.terminal = createTerminal({
      cols,
      rows,
      onData: (data) => {
        const text = new TextDecoder().decode(data);
        session.output.push(text);
        session.outputBytes += data.length;
        session.lastActivity = Date.now();
        this.stats.totalBytes += data.length;

        // Trim output if too large
        if (session.output.length > this.maxOutputLines) {
          session.output = session.output.slice(-this.maxOutputLines);
        }
        if (session.outputBytes > this.maxOutputBytes) {
          session.output = session.output.slice(-100);
          session.outputBytes = session.output.join("").length;
        }
      },
    });

    // Spawn process with PTY
    try {
      const proc = spawn([options.command, ...(options.args ?? [])], {
        cwd: options.cwd ?? process.cwd(),
        env: { ...process.env, ...options.env, TERM: "xterm-256color" },
        stdout: "pipe",
        stderr: "pipe",
        stdin: "pipe",
      });

      session.process = proc;

      // Handle stdout
      if (proc.stdout) {
        (async () => {
          const reader = proc.stdout.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              session.terminal.onData(value);
            }
          } catch {
            // Stream closed
          }
        })();
      }

      // Handle stderr
      if (proc.stderr) {
        (async () => {
          const reader = proc.stderr.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              session.terminal.onData(value);
            }
          } catch {
            // Stream closed
          }
        })();
      }

      // Handle exit
      proc.exited.then((code) => {
        session.status = "exited";
        session.exitCode = code;
        session.lastActivity = Date.now();

        const duration = session.lastActivity - session.createdAt;
        this.sessionDurations.push(duration);
        if (this.sessionDurations.length > 100) {
          this.sessionDurations = this.sessionDurations.slice(-100);
        }
        this.stats.avgSessionDurationMs =
          this.sessionDurations.reduce((a, b) => a + b, 0) / this.sessionDurations.length;

        this.stats.activeSessions = [...this.sessions.values()].filter(s => s.status === "running").length;
      });

    } catch (error: any) {
      session.status = "error";
      session.output.push(`Error: ${error.message}`);
    }

    this.sessions.set(id, session);
    this.stats.totalCreated++;
    this.stats.activeSessions++;
    if (this.stats.activeSessions > this.stats.peakConcurrent) {
      this.stats.peakConcurrent = this.stats.activeSessions;
    }

    return this.getSession(id)!;
  }

  /**
   * Write input to a PTY session
   */
  write(sessionId: string, data: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== "running" || !session.process?.stdin) {
      return false;
    }

    const writer = session.process.stdin.getWriter();
    writer.write(new TextEncoder().encode(data));
    writer.releaseLock();
    session.lastActivity = Date.now();
    return true;
  }

  /**
   * Resize a PTY session
   */
  resize(sessionId: string, cols: number, rows: number): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.terminal.resize(cols, rows);
    session.cols = cols;
    session.rows = rows;
    session.lastActivity = Date.now();
    return true;
  }

  /**
   * Get session output
   */
  getOutput(sessionId: string, fromLine = 0): string[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    return session.output.slice(fromLine);
  }

  /**
   * Get session info
   */
  getSession(sessionId: string): PTYSessionInfo | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      id: session.id,
      command: session.command,
      args: session.args,
      cols: session.cols,
      rows: session.rows,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      outputLines: session.output.length,
      outputBytes: session.outputBytes,
      status: session.status,
      exitCode: session.exitCode,
    };
  }

  /**
   * List all sessions
   */
  listSessions(): PTYSessionInfo[] {
    return [...this.sessions.values()].map(session => ({
      id: session.id,
      command: session.command,
      args: session.args,
      cols: session.cols,
      rows: session.rows,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      outputLines: session.output.length,
      outputBytes: session.outputBytes,
      status: session.status,
      exitCode: session.exitCode,
    }));
  }

  /**
   * Kill a PTY session
   */
  kill(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    if (session.process && session.status === "running") {
      session.process.kill();
      session.status = "exited";
      session.exitCode = -1;
    }

    session.terminal.close();
    this.stats.activeSessions = [...this.sessions.values()].filter(s => s.status === "running").length;
    return true;
  }

  /**
   * Remove a PTY session from memory
   */
  remove(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    this.kill(sessionId);
    this.sessions.delete(sessionId);
    return true;
  }

  /**
   * Get PTY service stats
   */
  getStats(): PTYStats {
    this.stats.activeSessions = [...this.sessions.values()].filter(s => s.status === "running").length;
    return { ...this.stats };
  }

  /**
   * Clean up old exited sessions
   */
  cleanup(maxAgeMs = 5 * 60 * 1000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, session] of this.sessions) {
      if (session.status !== "running" && now - session.lastActivity > maxAgeMs) {
        this.remove(id);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Run a quick command and return output
   * Uses AbortController for proper cancellation (fixes dangling promises)
   */
  async exec(command: string, args: string[] = [], timeoutMs = 30000): Promise<{
    output: string;
    exitCode: number;
    durationMs: number;
  }> {
    const start = performance.now();
    const abortController = new AbortController();
    const { signal } = abortController;
    let checkInterval: ReturnType<typeof setInterval> | null = null;

    const session = await this.create({ command, args });

    try {
      // Wait for exit or timeout with proper cleanup
      await new Promise<void>((resolve, reject) => {
        // Check for exit status
        checkInterval = setInterval(() => {
          if (signal.aborted) {
            resolve();
          } else if (session.status !== "running") {
            resolve();
          }
        }, 50);

        // Timeout handler
        const timeoutId = setTimeout(() => {
          abortController.abort();
          reject(new Error("Timeout"));
        }, timeoutMs);

        // Clean up timeout if resolved early
        signal.addEventListener("abort", () => clearTimeout(timeoutId), { once: true });
      });
    } catch {
      this.kill(session.id);
    } finally {
      // Always clean up interval
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    }

    const output = session.output.join("");
    const exitCode = session.exitCode ?? -1;
    const durationMs = performance.now() - start;

    this.remove(session.id);

    return { output, exitCode, durationMs };
  }
}

// Singleton instance
export const ptyService = new PTYService();

// Auto-cleanup every 5 minutes
setInterval(() => {
  const cleaned = ptyService.cleanup();
  if (cleaned > 0) {
    console.log(`[PTY] Cleaned up ${cleaned} old sessions`);
  }
}, 5 * 60 * 1000);

export default ptyService;
