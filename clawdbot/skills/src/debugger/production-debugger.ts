/**
 * src/debugger/production-debugger.ts
 * Production Debugger - Attach to Running Processes
 * - Attach to running skill processes
 * - Approval workflow for production debugging
 * - Time-limited sessions
 * - Read-only mode option
 */

import { PTYSessionGuard } from "../security/pty-session-guard";

// =============================================================================
// Types
// =============================================================================

export interface AttachOptions {
  allowProduction?: boolean; // Allow production debugging (default: false)
  readOnly?: boolean; // Read-only mode (default: false)
  sessionToken?: string; // Session token for validation
  timeout?: number; // Session timeout in ms (default: 30 minutes)
}

export interface AttachResult {
  terminal: any; // Bun.Terminal
  sessionId: string;
  processId: string;
  detach: () => void;
}

export interface ApprovalResult {
  granted: boolean;
  processId?: string;
  token?: string;
  expiresAt?: number;
  reason?: string;
}

export interface ProcessInfo {
  pid: number;
  skillId: string;
  startedAt: number;
  status: "running" | "stopped" | "unknown";
  memoryMB?: number;
  cpuPercent?: number;
}

// =============================================================================
// ProductionDebugger Class
// =============================================================================

export class ProductionDebugger {
  private static readonly DEFAULT_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private static activeSessions = new Map<string, AttachResult>();

  /**
   * Attach to a running skill process
   */
  static async attach(
    skillId: string,
    processId: string,
    options: AttachOptions = {}
  ): Promise<AttachResult> {
    const {
      allowProduction = false,
      readOnly = false,
      sessionToken,
      timeout = this.DEFAULT_TIMEOUT,
    } = options;

    // Security: Check production environment
    if (!allowProduction && process.env.NODE_ENV === "production") {
      throw new Error(
        "Production debugging not allowed. Set allowProduction=true to override."
      );
    }

    // Validate session token if provided
    if (sessionToken) {
      const isValid = PTYSessionGuard.validateSessionToken(
        `${skillId}:${processId}`,
        sessionToken
      );
      if (!isValid) {
        throw new Error("Invalid session token");
      }
    }

    // Find the running process
    const proc = await this.findProcess(processId, skillId);
    if (!proc) {
      throw new Error(`Process ${processId} for skill ${skillId} not found`);
    }

    if (proc.status !== "running") {
      throw new Error(`Process ${processId} is not running (status: ${proc.status})`);
    }

    // Generate session
    const sessionId = `prod-debug-${skillId}-${Date.now()}`;

    console.log(`Attaching to ${skillId} (PID: ${proc.pid})`);
    console.log("WARNING: You are debugging a running skill");

    if (readOnly) {
      console.log("Mode: READ-ONLY");
    }

    // Create terminal for debug output
    const terminal = {
      cols: process.stdout.columns || 80,
      rows: process.stdout.rows || 24,
      data(term: any, data: Uint8Array) {
        // Filter sensitive data in production
        const output = new TextDecoder().decode(data);
        const sanitized = PTYSessionGuard.sanitizeOutput(output);
        process.stdout.write(sanitized);
      },
    };

    // In a real implementation, we would use ptrace or similar
    // For now, we simulate by spawning strace/dtrace
    let debugProc: any;

    if (process.platform === "linux") {
      // Linux: Use strace
      debugProc = Bun.spawn(
        ["strace", "-p", String(proc.pid), "-f", "-e", "trace=all"],
        {
          terminal,
          stdout: "pipe",
          stderr: "pipe",
        }
      );
    } else if (process.platform === "darwin") {
      // macOS: Use dtrace (requires root)
      debugProc = Bun.spawn(
        ["sudo", "dtruss", "-p", String(proc.pid)],
        {
          terminal,
          stdout: "pipe",
          stderr: "pipe",
        }
      );
    } else {
      throw new Error(`Platform ${process.platform} not supported for production debugging`);
    }

    console.log("Commands: 'c' continue, 'q' quit");

    // Setup timeout
    const timeoutId = setTimeout(() => {
      console.log(`\nSession timeout (${timeout / 1000}s)`);
      detach();
    }, timeout);

    // Detach function
    const detach = () => {
      clearTimeout(timeoutId);

      try {
        debugProc?.kill("SIGTERM");
        (debugProc as any)?.terminal?.close?.();
      } catch {
        // Ignore cleanup errors
      }

      this.activeSessions.delete(sessionId);
      console.log("\nDetached from process");
    };

    const result: AttachResult = {
      terminal,
      sessionId,
      processId,
      detach,
    };

    this.activeSessions.set(sessionId, result);

    return result;
  }

  /**
   * Request approval for production debugging
   */
  static async requestApproval(
    skillId: string,
    userId: string,
    approvedBy?: string
  ): Promise<ApprovalResult> {
    // Check environment variable for auto-approval (dev only)
    if (process.env.ALLOW_PROD_DEBUG === "true") {
      const processes = await this.findSkillProcesses(skillId);
      if (processes.length === 0) {
        return {
          granted: false,
          reason: "No running processes found",
        };
      }

      return {
        granted: true,
        processId: String(processes[0].pid),
        token: PTYSessionGuard.generateSessionToken(
          `${skillId}:${processes[0].pid}`
        ),
        expiresAt: Date.now() + 30 * 60 * 1000,
      };
    }

    // Log approval request
    console.log(`Production debug approval requested:`);
    console.log(`  Skill: ${skillId}`);
    console.log(`  Requested by: ${userId}`);
    console.log(`  Timestamp: ${new Date().toISOString()}`);

    if (approvedBy) {
      // Pre-approved
      console.log(`  Approved by: ${approvedBy}`);

      const processes = await this.findSkillProcesses(skillId);
      if (processes.length === 0) {
        return {
          granted: false,
          reason: "No running processes found",
        };
      }

      return {
        granted: true,
        processId: String(processes[0].pid),
        token: PTYSessionGuard.generateSessionToken(
          `${skillId}:${processes[0].pid}`
        ),
        expiresAt: Date.now() + 30 * 60 * 1000,
      };
    }

    // In production, would require approval workflow
    return {
      granted: false,
      reason: "Approval required. Contact system administrator.",
    };
  }

  /**
   * Safe production debugging with full workflow
   */
  static async safeDebugSession(
    skillId: string,
    options: {
      userId: string;
      approvedBy?: string;
      timeout?: number;
      readOnly?: boolean;
    }
  ): Promise<void> {
    const timeout = options.timeout || this.DEFAULT_TIMEOUT;

    // Request approval
    const approval = await this.requestApproval(
      skillId,
      options.userId,
      options.approvedBy
    );

    if (!approval.granted) {
      throw new Error(`Approval denied: ${approval.reason}`);
    }

    console.log("\nApproval granted. Starting debug session...");
    console.log(`Session expires: ${new Date(approval.expiresAt!).toISOString()}`);

    // Attach to process
    const session = await this.attach(skillId, approval.processId!, {
      allowProduction: true,
      readOnly: options.readOnly,
      sessionToken: approval.token,
      timeout,
    });

    // Handle interrupt
    const handleInterrupt = () => {
      console.log("\nInterrupted by user");
      session.detach();
      process.exit(0);
    };

    process.on("SIGINT", handleInterrupt);
    process.on("SIGTERM", handleInterrupt);

    // Keep session alive
    await new Promise<void>((resolve) => {
      // Simple command interface
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
        process.stdin.resume();

        process.stdin.on("data", (data) => {
          const char = data.toString();

          if (char === "q" || char === "\x03") {
            // q or Ctrl+C
            session.detach();
            process.stdin.setRawMode(false);
            resolve();
          }
        });
      }

      // Session timeout will trigger detach
      setTimeout(() => {
        session.detach();
        resolve();
      }, timeout);
    });

    process.removeListener("SIGINT", handleInterrupt);
    process.removeListener("SIGTERM", handleInterrupt);
  }

  /**
   * Find a process by PID and skill ID
   */
  private static async findProcess(
    processId: string,
    skillId: string
  ): Promise<ProcessInfo | null> {
    const pid = parseInt(processId, 10);
    if (isNaN(pid)) {
      return null;
    }

    try {
      // Check if process exists
      process.kill(pid, 0);

      // Get process info (platform-specific)
      const info = await this.getProcessInfo(pid);

      return {
        pid,
        skillId,
        startedAt: Date.now() - 3600000, // Placeholder
        status: "running",
        ...info,
      };
    } catch {
      return null;
    }
  }

  /**
   * Find all processes for a skill
   */
  static async findSkillProcesses(skillId: string): Promise<ProcessInfo[]> {
    const processes: ProcessInfo[] = [];

    try {
      // Use pgrep to find processes
      const result = Bun.spawnSync(["pgrep", "-f", skillId]);
      const pids = new TextDecoder()
        .decode(result.stdout)
        .trim()
        .split("\n")
        .filter(Boolean);

      for (const pidStr of pids) {
        const pid = parseInt(pidStr, 10);
        if (!isNaN(pid)) {
          const info = await this.getProcessInfo(pid);
          processes.push({
            pid,
            skillId,
            startedAt: Date.now() - 3600000,
            status: "running",
            ...info,
          });
        }
      }
    } catch {
      // pgrep not available or no processes found
    }

    return processes;
  }

  /**
   * Get detailed process info
   */
  private static async getProcessInfo(
    pid: number
  ): Promise<{ memoryMB?: number; cpuPercent?: number }> {
    try {
      if (process.platform === "darwin" || process.platform === "linux") {
        const result = Bun.spawnSync([
          "ps",
          "-p",
          String(pid),
          "-o",
          "rss=,pcpu=",
        ]);
        const output = new TextDecoder().decode(result.stdout).trim();
        const [rss, cpu] = output.split(/\s+/);

        return {
          memoryMB: parseInt(rss, 10) / 1024,
          cpuPercent: parseFloat(cpu),
        };
      }
    } catch {
      // Ignore errors
    }

    return {};
  }

  /**
   * List active debug sessions
   */
  static getActiveSessions(): Array<{
    sessionId: string;
    processId: string;
  }> {
    return Array.from(this.activeSessions.entries()).map(([id, session]) => ({
      sessionId: id,
      processId: session.processId,
    }));
  }

  /**
   * Detach all active sessions
   */
  static detachAll(): number {
    const count = this.activeSessions.size;

    for (const session of this.activeSessions.values()) {
      session.detach();
    }

    return count;
  }
}

export default ProductionDebugger;
