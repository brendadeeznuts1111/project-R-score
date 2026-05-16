/**
 * src/security/pty-session-guard.ts
 * PTY Session Security Guard
 * - Rate limiting for terminal output
 * - DLP (Data Loss Prevention) - sanitize secrets
 * - Session TTL and memory limits
 * - Audit logging
 * - Session token validation
 */

import * as crypto from "crypto";
import * as path from "path";

// =============================================================================
// Types
// =============================================================================

export interface SessionConfig {
  userId: string;
  skillId: string;
  ttl?: number; // Session TTL in ms (default: 1 hour)
  maxMemory?: number; // Max memory in MB (default: 512)
  rateLimit?: number; // Bytes per second (default: 1MB/s)
  enableDLP?: boolean; // Enable Data Loss Prevention (default: true)
  enableAudit?: boolean; // Enable audit logging (default: true)
}

export interface IsolatedSession {
  sessionId: string;
  terminal: any; // Bun.Terminal
  auditLog: (action: string, data?: any) => void;
  destroy: () => void;
  getStats: () => SessionStats;
}

export interface SessionStats {
  sessionId: string;
  userId: string;
  skillId: string;
  startTime: number;
  bytesWritten: number;
  eventsLogged: number;
  memoryUsageMB: number;
}

interface AuditEntry {
  timestamp: string;
  sessionId: string;
  userId: string;
  skillId: string;
  action: string;
  data?: any;
}

// =============================================================================
// Secret Patterns for DLP
// =============================================================================

const SECRET_PATTERNS = [
  // OpenAI API keys
  { pattern: /sk-[A-Za-z0-9]{20,}/g, name: "OpenAI Key" },
  // Anthropic API keys
  { pattern: /sk-ant-[A-Za-z0-9-]{20,}/g, name: "Anthropic Key" },
  // GitHub tokens
  { pattern: /ghp_[A-Za-z0-9]{36,}/g, name: "GitHub Token" },
  { pattern: /gho_[A-Za-z0-9]{36,}/g, name: "GitHub OAuth" },
  { pattern: /ghs_[A-Za-z0-9]{36,}/g, name: "GitHub Server" },
  // AWS keys
  { pattern: /AKIA[0-9A-Z]{16}/g, name: "AWS Access Key" },
  // Cloudflare
  { pattern: /[a-z0-9]{37}/g, name: "Cloudflare Key" },
  // Generic long alphanumeric (potential API keys)
  { pattern: /(?:api[_-]?key|secret|token|password)\s*[:=]\s*['"]?([A-Za-z0-9_-]{20,})['"]?/gi, name: "Generic Secret" },
  // Private keys
  { pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, name: "Private Key" },
  // JWT tokens
  { pattern: /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g, name: "JWT Token" },
];

// =============================================================================
// PTYSessionGuard Class
// =============================================================================

export class PTYSessionGuard {
  // Configurable via environment variables for production tuning
  private static readonly DEFAULT_TTL = parseInt(process.env.SESSION_TTL || "3600000", 10); // 1 hour
  private static readonly DEFAULT_MAX_MEMORY = parseInt(process.env.SESSION_MAX_MEMORY || "512", 10); // MB
  private static readonly DEFAULT_RATE_LIMIT = parseInt(process.env.SESSION_RATE_LIMIT || String(1024 * 1024), 10); // 1MB/sec
  private static readonly MAX_SESSIONS_PER_USER = parseInt(process.env.SESSION_MAX_PER_USER || "3", 10);

  private static activeSessions = new Map<string, IsolatedSession>();
  private static userSessionCounts = new Map<string, number>();

  /**
   * Create an isolated PTY session with security controls
   */
  static createIsolatedSession(
    terminal: any, // Bun.Terminal
    config: SessionConfig
  ): IsolatedSession {
    const {
      userId,
      skillId,
      ttl = this.DEFAULT_TTL,
      maxMemory = this.DEFAULT_MAX_MEMORY,
      rateLimit = this.DEFAULT_RATE_LIMIT,
      enableDLP = true,
      enableAudit = true,
    } = config;

    // Check session limit per user
    const userCount = this.userSessionCounts.get(userId) || 0;
    if (userCount >= this.MAX_SESSIONS_PER_USER) {
      throw new Error(
        `Session limit exceeded: Max ${this.MAX_SESSIONS_PER_USER} sessions per user`
      );
    }

    const sessionId = this.generateSessionId(userId, skillId);
    const sessionStart = Date.now();
    let bytesWritten = 0;
    let eventsLogged = 0;
    let isDestroyed = false;

    // Wrap terminal.write to enforce security controls
    const originalWrite = terminal.write.bind(terminal);

    terminal.write = (data: string | Uint8Array): void => {
      if (isDestroyed) {
        throw new Error("Session has been destroyed");
      }

      const size = typeof data === "string" ? data.length : data.byteLength;
      bytesWritten += size;

      // Rate limit check
      const elapsed = Math.max(1, Date.now() - sessionStart);
      const currentRate = (bytesWritten / elapsed) * 1000;

      if (currentRate > rateLimit) {
        this.logSecurityEvent("RATE_LIMIT_EXCEEDED", {
          sessionId,
          currentRate,
          limit: rateLimit,
        });
        throw new Error("Rate limit exceeded: PTY output too fast");
      }

      // DLP - sanitize secrets
      if (enableDLP && typeof data === "string") {
        const sanitized = this.sanitizeOutput(data);
        if (sanitized !== data && enableAudit) {
          this.logSecurityEvent("SECRET_REDACTED", {
            sessionId,
            userId,
            skillId,
          });
        }
        return originalWrite(sanitized);
      }

      return originalWrite(data);
    };

    // Memory monitoring interval
    const memoryMonitor = setInterval(() => {
      if (isDestroyed) {
        clearInterval(memoryMonitor);
        return;
      }

      const usage = process.memoryUsage();
      const memoryMB = usage.heapUsed / 1024 / 1024;

      if (memoryMB > maxMemory) {
        this.logSecurityEvent("MEMORY_LIMIT_EXCEEDED", {
          sessionId,
          memoryMB,
          limit: maxMemory,
        });
        destroy();
        throw new Error("Session terminated: Memory limit exceeded");
      }
    }, 5000);

    // Session TTL timeout
    const ttlTimeout = setTimeout(() => {
      if (!isDestroyed) {
        this.logSecurityEvent("SESSION_TTL_EXPIRED", { sessionId, ttl });
        destroy();
      }
    }, ttl);

    // Audit logging function
    const auditLog = (action: string, data?: any): void => {
      if (!enableAudit) return;
      eventsLogged++;
      this.logAuditTrail(sessionId, userId, skillId, action, data);
    };

    // Destroy function
    const destroy = (): void => {
      if (isDestroyed) return;
      isDestroyed = true;

      clearInterval(memoryMonitor);
      clearTimeout(ttlTimeout);

      // Decrement user session count
      const count = this.userSessionCounts.get(userId) || 1;
      if (count <= 1) {
        this.userSessionCounts.delete(userId);
      } else {
        this.userSessionCounts.set(userId, count - 1);
      }

      // Remove from active sessions
      this.activeSessions.delete(sessionId);

      auditLog("SESSION_DESTROYED", {
        duration: Date.now() - sessionStart,
        bytesWritten,
        eventsLogged,
      });

      console.log(`Session destroyed: ${sessionId}`);
    };

    // Get stats function
    const getStats = (): SessionStats => ({
      sessionId,
      userId,
      skillId,
      startTime: sessionStart,
      bytesWritten,
      eventsLogged,
      memoryUsageMB: process.memoryUsage().heapUsed / 1024 / 1024,
    });

    // Track session
    this.userSessionCounts.set(userId, userCount + 1);

    const session: IsolatedSession = {
      sessionId,
      terminal,
      auditLog,
      destroy,
      getStats,
    };

    this.activeSessions.set(sessionId, session);

    auditLog("SESSION_CREATED", { ttl, maxMemory, rateLimit, enableDLP });

    return session;
  }

  /**
   * Get session secret (required for security)
   */
  private static getSessionSecret(): string {
    const secret = process.env.SESSION_SECRET;
    if (!secret) {
      throw new Error("SESSION_SECRET environment variable is required for session security");
    }
    return secret;
  }

  /**
   * Validate session token for reconnection
   */
  static validateSessionToken(sessionId: string, token: string): boolean {
    const secret = this.getSessionSecret();
    const expectedToken = crypto
      .createHmac("sha256", secret)
      .update(sessionId)
      .digest("hex");

    try {
      return crypto.timingSafeEqual(
        Buffer.from(token),
        Buffer.from(expectedToken)
      );
    } catch {
      return false;
    }
  }

  /**
   * Generate a session token
   */
  static generateSessionToken(sessionId: string): string {
    const secret = this.getSessionSecret();
    return crypto
      .createHmac("sha256", secret)
      .update(sessionId)
      .digest("hex");
  }

  /**
   * Get active session by ID
   */
  static getSession(sessionId: string): IsolatedSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Get all active sessions for a user
   */
  static getUserSessions(userId: string): IsolatedSession[] {
    return Array.from(this.activeSessions.values()).filter(
      (s) => s.getStats().userId === userId
    );
  }

  /**
   * Destroy all sessions for a user
   */
  static destroyUserSessions(userId: string): number {
    const sessions = this.getUserSessions(userId);
    sessions.forEach((s) => s.destroy());
    return sessions.length;
  }

  /**
   * Sanitize terminal output - remove secrets
   */
  static sanitizeOutput(data: string): string {
    let sanitized = data;

    for (const { pattern, name } of SECRET_PATTERNS) {
      // Reset lastIndex for global patterns
      pattern.lastIndex = 0;

      if (pattern.test(sanitized)) {
        pattern.lastIndex = 0;
        sanitized = sanitized.replace(pattern, `[REDACTED:${name}]`);
      }
    }

    return sanitized;
  }

  /**
   * Generate unique session ID
   */
  private static generateSessionId(userId: string, skillId: string): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString("hex");
    return `${userId}:${skillId}:${timestamp}:${random}`;
  }

  /**
   * Log audit trail entry
   */
  private static async logAuditTrail(
    sessionId: string,
    userId: string,
    skillId: string,
    action: string,
    data?: any
  ): Promise<void> {
    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      sessionId,
      userId,
      skillId,
      action,
      data: data
        ? {
            ...data,
            // Never log sensitive fields
            password: undefined,
            token: undefined,
            key: undefined,
            secret: undefined,
          }
        : undefined,
    };

    const logDir = "./logs/audit";
    const logFile = `pty-${new Date().toISOString().split("T")[0]}.jsonl`;
    const logPath = path.join(logDir, logFile);

    try {
      // Ensure directory exists
      await Bun.write(
        path.join(logDir, ".keep"),
        ""
      ).catch(() => {});

      // Append to log file
      const file = Bun.file(logPath);
      const existing = await file.exists() ? await file.text() : "";
      await Bun.write(logPath, existing + JSON.stringify(entry) + "\n");
    } catch (err) {
      console.error("Failed to write audit log:", err);
    }
  }

  /**
   * Log security event (alerts)
   */
  private static logSecurityEvent(event: string, details: any): void {
    const entry = {
      timestamp: new Date().toISOString(),
      event,
      details,
      severity: this.getEventSeverity(event),
    };

    console.error(`SECURITY_ALERT [${entry.severity}]: ${event}`, details);

    // Could integrate with external alerting here
    this.logAuditTrail(
      details.sessionId || "system",
      details.userId || "system",
      details.skillId || "system",
      `SECURITY:${event}`,
      details
    );
  }

  /**
   * Get severity level for security events
   */
  private static getEventSeverity(
    event: string
  ): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
    const severityMap: Record<string, "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"> = {
      SECRET_REDACTED: "MEDIUM",
      RATE_LIMIT_EXCEEDED: "HIGH",
      MEMORY_LIMIT_EXCEEDED: "HIGH",
      SESSION_TTL_EXPIRED: "LOW",
      INVALID_TOKEN: "CRITICAL",
    };
    return severityMap[event] || "MEDIUM";
  }
}

// =============================================================================
// Collaborative Debug Session
// =============================================================================

export interface Participant {
  userId: string;
  terminal: any; // Bun.Terminal
  role: "observer" | "controller";
  joinedAt: number;
}

export class CollaborativeDebugSession {
  private sessionId: string;
  private skillId: string;
  private participants = new Map<string, Participant>();
  private maxParticipants = 5;

  private sessionState = {
    currentLine: 0,
    breakpoints: new Set<number>(),
    watchExpressions: new Map<string, string>(),
    isPaused: false,
  };

  constructor(skillId: string) {
    this.skillId = skillId;
    this.sessionId = `collab-${skillId}-${Date.now()}`;
  }

  /**
   * Add participant to session
   */
  join(
    userId: string,
    terminal: any,
    role: "observer" | "controller" = "observer"
  ): void {
    if (this.participants.size >= this.maxParticipants) {
      throw new Error(`Session full: Max ${this.maxParticipants} participants`);
    }

    // Only one controller allowed
    if (role === "controller") {
      const existingController = Array.from(this.participants.values()).find(
        (p) => p.role === "controller"
      );
      if (existingController) {
        throw new Error(
          `Controller already exists: ${existingController.userId}`
        );
      }
    }

    this.participants.set(userId, {
      userId,
      terminal,
      role,
      joinedAt: Date.now(),
    });

    // Broadcast join event
    this.broadcast({
      type: "user_joined",
      userId,
      role,
      timestamp: Date.now(),
      participantCount: this.participants.size,
    });

    // Send welcome message to new participant
    terminal.write(`\nConnected to collaborative debug session\n`);
    terminal.write(`Session: ${this.sessionId}\n`);
    terminal.write(`Role: ${role}\n`);
    terminal.write(`Participants: ${this.participants.size}\n\n`);
  }

  /**
   * Remove participant from session
   */
  leave(userId: string): void {
    const participant = this.participants.get(userId);
    if (!participant) return;

    this.participants.delete(userId);

    this.broadcast({
      type: "user_left",
      userId,
      timestamp: Date.now(),
      participantCount: this.participants.size,
    });
  }

  /**
   * Broadcast message to all participants
   */
  broadcast(message: any, excludeUserId?: string): void {
    const data =
      typeof message === "string" ? message : JSON.stringify(message) + "\n";

    for (const [userId, participant] of this.participants) {
      if (userId === excludeUserId) continue;

      try {
        participant.terminal.write(data);
      } catch (error) {
        console.error(`Failed to broadcast to ${userId}:`, error);
        this.participants.delete(userId);
      }
    }
  }

  /**
   * Send input from controller to shared terminal
   */
  sendInput(userId: string, input: string): boolean {
    const participant = this.participants.get(userId);
    if (!participant || participant.role !== "controller") {
      return false;
    }

    this.broadcast({
      type: "input",
      from: userId,
      data: input,
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * Get session info
   */
  getInfo(): {
    sessionId: string;
    skillId: string;
    participants: Array<{ userId: string; role: string; joinedAt: number }>;
    state: typeof this.sessionState;
  } {
    return {
      sessionId: this.sessionId,
      skillId: this.skillId,
      participants: Array.from(this.participants.values()).map((p) => ({
        userId: p.userId,
        role: p.role,
        joinedAt: p.joinedAt,
      })),
      state: { ...this.sessionState },
    };
  }

  /**
   * Destroy session and disconnect all participants
   */
  destroy(): void {
    this.broadcast({
      type: "session_ended",
      timestamp: Date.now(),
    });

    this.participants.clear();
  }
}

export default PTYSessionGuard;
