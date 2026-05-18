import { logger } from "../nebula/logger.js";

export interface PTYOptions {
  cols?: number;
  rows?: number;
  shell?: string;
  cwd?: string;
  env?: Record<string, string>;
  onData?: (data: string) => void;
  onExit?: (code: number) => void;
  onResize?: (cols: number, rows: number) => void;
}

export interface PTYSession {
  terminal: Bun.Terminal;
  process: Bun.Subprocess;
  id: string;
  startTime: Date;
  lastActivity: Date;
  isActive: boolean;
}

export class PTYService {
  private static instance: PTYService;
  private sessions: Map<string, PTYSession> = new Map();
  private readonly maxSessions = 10;
  private readonly sessionTimeout = 30 * 60 * 1000; // 30 minutes

  private constructor() {
    this.startCleanupTimer();
  }

  static getInstance(): PTYService {
    if (!PTYService.instance) {
      PTYService.instance = new PTYService();
    }
    return PTYService.instance;
  }

  /**
   * Create a new PTY session
   */
  async createSession(options: PTYOptions = {}): Promise<PTYSession> {
    const sessionId = this.generateSessionId();
    const cols = options.cols || process.stdout.columns || 80;
    const rows = options.rows || process.stdout.rows || 24;
    const shell = options.shell || "/bin/bash";

    if (this.sessions.size >= this.maxSessions) {
      throw new Error(`Maximum PTY sessions (${this.maxSessions}) reached`);
    }

    try {
      const terminal = new Bun.Terminal({
        cols,
        rows,
        data: (terminal, data) => {
          options.onData?.(data.toString());
          this.updateSessionActivity(sessionId);
        },
      });

      const process = Bun.spawn([shell], {
        terminal,
        cwd: options.cwd || process.cwd(),
        env: {
          ...process.env,
          ...options.env,
          TERM: "xterm-256color",
          COLORTERM: "truecolor",
        },
      });

      const session: PTYSession = {
        terminal,
        process,
        id: sessionId,
        startTime: new Date(),
        lastActivity: new Date(),
        isActive: true,
      };

      this.sessions.set(sessionId, session);

      // Handle process exit
      process.exited.then((code) => {
        logger.info(`PTY session ${sessionId} exited with code ${code}`, {
          component: "PTY-Service",
          sessionId,
          exitCode: code,
        });
        options.onExit?.(code);
        this.closeSession(sessionId);
      });

      logger.info(`Created PTY session ${sessionId}`, {
        component: "PTY-Service",
        sessionId,
        shell,
        cols,
        rows,
      });

      return session;
    } catch (error) {
      logger.error(`Failed to create PTY session: ${error.message}`, {
        component: "PTY-Service",
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): PTYSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * List all active sessions
   */
  listSessions(): PTYSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Write data to a session
   */
  writeToSession(sessionId: string, data: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      return false;
    }

    try {
      session.terminal.write(data);
      this.updateSessionActivity(sessionId);
      return true;
    } catch (error) {
      logger.error(`Failed to write to session ${sessionId}: ${error.message}`, {
        component: "PTY-Service",
        sessionId,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Resize terminal
   */
  resizeSession(sessionId: string, cols: number, rows: number): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      return false;
    }

    try {
      session.terminal.resize(cols, rows);
      logger.info(`Resized session ${sessionId} to ${cols}x${rows}`, {
        component: "PTY-Service",
        sessionId,
        cols,
        rows,
      });
      return true;
    } catch (error) {
      logger.error(`Failed to resize session ${sessionId}: ${error.message}`, {
        component: "PTY-Service",
        sessionId,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Close a session
   */
  closeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    try {
      session.isActive = false;
      session.terminal.close();
      
      // Kill process if still running
      if (!session.process.killed) {
        session.process.kill();
      }

      this.sessions.delete(sessionId);

      logger.info(`Closed PTY session ${sessionId}`, {
        component: "PTY-Service",
        sessionId,
      });

      return true;
    } catch (error) {
      logger.error(`Failed to close session ${sessionId}: ${error.message}`, {
        component: "PTY-Service",
        sessionId,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Close all sessions
   */
  closeAllSessions(): void {
    const sessionIds = Array.from(this.sessions.keys());
    sessionIds.forEach(id => this.closeSession(id));
  }

  /**
   * Get session statistics
   */
  getStats(): {
    totalSessions: number;
    activeSessions: number;
    maxSessions: number;
    uptime: number;
  } {
    return {
      totalSessions: this.sessions.size,
      activeSessions: Array.from(this.sessions.values()).filter(s => s.isActive).length,
      maxSessions: this.maxSessions,
      uptime: Date.now() - (this.sessions.size > 0 ? 
        Math.min(...Array.from(this.sessions.values()).map(s => s.startTime.getTime())) : 
        Date.now()),
    };
  }

  private generateSessionId(): string {
    return `pty-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateSessionActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }
  }

  private startCleanupTimer(): void {
    setInterval(() => {
      const now = new Date();
      const expiredSessions: string[] = [];

      for (const [sessionId, session] of this.sessions) {
        if (now.getTime() - session.lastActivity.getTime() > this.sessionTimeout) {
          expiredSessions.push(sessionId);
        }
      }

      expiredSessions.forEach(sessionId => {
        logger.info(`Cleaning up expired PTY session ${sessionId}`, {
          component: "PTY-Service",
          sessionId,
        });
        this.closeSession(sessionId);
      });
    }, 60000); // Check every minute
  }
}

// Export singleton instance
export const ptyService = PTYService.getInstance();