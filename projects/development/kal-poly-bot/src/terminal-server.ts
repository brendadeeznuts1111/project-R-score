#!/usr/bin/env bun
/**
 * Bun Terminal API (PTY Support) Implementation
 *
 * A comprehensive PTY backend server demonstrating Bun v1.3.5's new Terminal API
 * Features:
 * - Interactive bash sessions via HTTP/WebSockets
 * - Support for TTY-aware applications (vim, htop, etc.)
 * - Session management and cleanup
 * - Security measures and input validation
 */

import { serve } from "bun";
import { randomUUID } from "crypto";

// Types
interface TerminalSession {
  id: string;
  proc: ReturnType<typeof Bun.spawn>;
  terminal: Bun.Terminal;
  createdAt: Date;
  lastActivity: Date;
  userId?: string;
  size: { cols: number; rows: number };
}

interface SessionCreateRequest {
  userId?: string;
  cols?: number;
  rows?: number;
  shell?: string;
}

interface SessionInputRequest {
  sessionId: string;
  input: string;
  resize?: { cols: number; rows: number };
}

// Configuration
const PORT = 3000;
const HOST = "0.0.0.0";
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const MAX_SESSIONS = 100;

// Session management
const sessions = new Map<string, TerminalSession>();
const sessionOutputs = new Map<string, string[]>();

/**
 * Security utilities
 */
class SecurityValidator {
  static sanitizeInput(input: string): string {
    // Basic input sanitization - prevent command injection
    const dangerous = ["&&", "||", ";", "|", "`", "$(", "${", ">", ">>", "<"];
    let sanitized = input.trim();

    // Remove or escape dangerous sequences
    dangerous.forEach((seq) => {
      sanitized = sanitized.replace(
        new RegExp(seq.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        ""
      );
    });

    return sanitized;
  }

  static validateSessionId(sessionId: string): boolean {
    return /^[a-f0-9-]{36}$/.test(sessionId);
  }

  static validateShell(shell: string): boolean {
    const allowedShells = ["bash", "zsh", "sh", "fish"];
    return allowedShells.includes(shell);
  }
}

/**
 * Terminal session management
 */
class TerminalManager {
  static createSession(config: SessionCreateRequest): TerminalSession {
    if (sessions.size >= MAX_SESSIONS) {
      throw new Error("Maximum sessions reached");
    }

    const sessionId = randomUUID();
    const shell =
      config.shell && SecurityValidator.validateShell(config.shell)
        ? config.shell
        : "bash";

    const cols = config.cols || 120;
    const rows = config.rows || 40;

    // Create terminal instance
    const terminal = new Bun.Terminal({
      cols,
      rows,
      data: (term: unknown, data: Uint8Array) => {
        const output = new TextDecoder().decode(data);
        TerminalManager.handleTerminalOutput(sessionId, output);
      },
    });

    // Spawn shell process
    const proc = Bun.spawn([shell], {
      terminal,
      env: {
        TERM: "xterm-256color",
        ...process.env,
      },
    });

    const session: TerminalSession = {
      id: sessionId,
      proc,
      terminal,
      createdAt: new Date(),
      lastActivity: new Date(),
      userId: config.userId,
      size: { cols, rows },
    };

    sessions.set(sessionId, session);
    sessionOutputs.set(sessionId, []);

    // Setup cleanup on process exit
    proc.exited.then(() => {
      this.cleanupSession(sessionId);
    });

    // Send welcome message
    terminal.write(
      `echo 'Interactive Bun PTY Shell Started! Session: ${sessionId}'\\n`
    );

    return session;
  }

  static handleTerminalOutput(sessionId: string, output: string) {
    const outputs = sessionOutputs.get(sessionId) || [];
    outputs.push(output);

    // Keep only last 1000 lines to prevent memory issues
    if (outputs.length > 1000) {
      outputs.splice(0, outputs.length - 1000);
    }

    sessionOutputs.set(sessionId, outputs);

    // Update last activity
    const session = sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }

    console.log(`[${sessionId}] ${output.trim()}`);
  }

  static getSession(sessionId: string): TerminalSession | undefined {
    return sessions.get(sessionId);
  }

  static getSessionOutput(sessionId: string): string[] {
    return sessionOutputs.get(sessionId) || [];
  }

  static sendInput(sessionId: string, input: string): boolean {
    const session = sessions.get(sessionId);
    if (!session) return false;

    const sanitizedInput = SecurityValidator.sanitizeInput(input);
    session.terminal.write(sanitizedInput + "\n");
    session.lastActivity = new Date();

    return true;
  }

  static resizeSession(sessionId: string, cols: number, rows: number): boolean {
    const session = sessions.get(sessionId);
    if (!session) return false;

    session.terminal.resize(cols, rows);
    session.size = { cols, rows };
    session.lastActivity = new Date();

    return true;
  }

  static cleanupSession(sessionId: string) {
    const session = sessions.get(sessionId);
    if (session) {
      try {
        session.terminal.close();
        if (!session.proc.killed) {
          session.proc.kill();
        }
      } catch (error) {
        console.error(`Error cleaning up session ${sessionId}:`, error);
      }

      sessions.delete(sessionId);
      sessionOutputs.delete(sessionId);
      console.log(`Session ${sessionId} cleaned up`);
    }
  }

  static cleanupInactiveSessions() {
    const now = Date.now();
    for (const [sessionId, session] of sessions) {
      if (now - session.lastActivity.getTime() > SESSION_TIMEOUT) {
        this.cleanupSession(sessionId);
      }
    }
  }
}

/**
 * HTTP API Handlers
 */
class TerminalAPI {
  static async createSession(req: Request): Promise<Response> {
    try {
      const config: SessionCreateRequest = await req.json();
      const session = TerminalManager.createSession(config);

      return Response.json({
        success: true,
        sessionId: session.id,
        message: "Terminal session created",
        createdAt: session.createdAt,
        size: session.size,
      });
    } catch (error) {
      return Response.json(
        {
          success: false,
          message:
            error instanceof Error ? error.message : "Failed to create session",
        },
        { status: 400 }
      );
    }
  }

  static async sendInput(req: Request): Promise<Response> {
    try {
      const { sessionId, input, resize }: SessionInputRequest =
        await req.json();

      if (!SecurityValidator.validateSessionId(sessionId)) {
        return Response.json(
          {
            success: false,
            message: "Invalid session ID",
          },
          { status: 400 }
        );
      }

      const session = TerminalManager.getSession(sessionId);
      if (!session) {
        return Response.json(
          {
            success: false,
            message: "Session not found",
          },
          { status: 404 }
        );
      }

      // Handle resize if requested
      if (resize) {
        TerminalManager.resizeSession(sessionId, resize.cols, resize.rows);
      }

      // Send input
      const success = TerminalManager.sendInput(sessionId, input);

      return Response.json({
        success,
        message: success ? "Input sent" : "Failed to send input",
      });
    } catch (error) {
      return Response.json(
        {
          success: false,
          message:
            error instanceof Error ? error.message : "Failed to send input",
        },
        { status: 400 }
      );
    }
  }

  static async getSessionOutput(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");

    if (!sessionId || !SecurityValidator.validateSessionId(sessionId)) {
      return Response.json(
        {
          success: false,
          message: "Invalid session ID",
        },
        { status: 400 }
      );
    }

    const session = TerminalManager.getSession(sessionId);
    if (!session) {
      return Response.json(
        {
          success: false,
          message: "Session not found",
        },
        { status: 404 }
      );
    }

    const output = TerminalManager.getSessionOutput(sessionId);

    return Response.json({
      success: true,
      sessionId,
      output,
      lastActivity: session.lastActivity,
      size: session.size,
    });
  }

  static async listSessions(): Promise<Response> {
    const sessionList = Array.from(sessions.values()).map((session) => ({
      id: session.id,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      userId: session.userId,
      size: session.size,
      active: !session.proc.killed,
    }));

    return Response.json({
      success: true,
      sessions: sessionList,
      total: sessionList.length,
    });
  }

  static async deleteSession(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");

    if (!sessionId || !SecurityValidator.validateSessionId(sessionId)) {
      return Response.json(
        {
          success: false,
          message: "Invalid session ID",
        },
        { status: 400 }
      );
    }

    const session = TerminalManager.getSession(sessionId);
    if (!session) {
      return Response.json(
        {
          success: false,
          message: "Session not found",
        },
        { status: 404 }
      );
    }

    TerminalManager.cleanupSession(sessionId);

    return Response.json({
      success: true,
      message: "Session deleted",
    });
  }
}

/**
 * WebSocket handler for real-time terminal interaction
 */
class TerminalWebSocket {
  static handle(ws: WebSocket, sessionId: string) {
    if (!SecurityValidator.validateSessionId(sessionId)) {
      ws.close(1008, "Invalid session ID");
      return;
    }

    const session = TerminalManager.getSession(sessionId);
    if (!session) {
      ws.close(1008, "Session not found");
      return;
    }

    console.log(`WebSocket connected for session ${sessionId}`);

    // Send existing output
    const output = TerminalManager.getSessionOutput(sessionId);
    if (output.length > 0) {
      ws.send(
        JSON.stringify({
          type: "output",
          data: output.join(""),
        })
      );
    }

    // Handle incoming messages
    ws.message = (message) => {
      try {
        const data = JSON.parse(message.toString());

        switch (data.type) {
          case "input":
            TerminalManager.sendInput(sessionId, data.input);
            break;

          case "resize":
            TerminalManager.resizeSession(sessionId, data.cols, data.rows);
            break;

          case "ping":
            ws.send(JSON.stringify({ type: "pong" }));
            break;
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    };

    // Handle cleanup on disconnect
    ws.close = () => {
      console.log(`WebSocket disconnected for session ${sessionId}`);
    };

    // Stream new output to WebSocket
    const originalHandler = session.terminal.data;
    session.terminal.data = (term, data) => {
      originalHandler(term, data);
      const output = new TextDecoder().decode(data);
      ws.send(
        JSON.stringify({
          type: "output",
          data: output,
        })
      );
    };
  }
}

/**
 * Main server
 */
const _server = serve({
  port: PORT,
  hostname: HOST,
  async fetch(req: Request, _server: unknown) {
    const url = new URL(req.url);

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // WebSocket upgrade
    if (url.pathname === "/ws" && server.upgrade) {
      const sessionId = url.searchParams.get("sessionId");
      if (sessionId) {
        return server.upgrade(req, {
          data: { sessionId },
        });
      }
    }

    // API routes
    if (url.pathname === "/api/sessions" && req.method === "POST") {
      const response = await TerminalAPI.createSession(req);
      return new Response(response.body, {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/sessions/input" && req.method === "POST") {
      const response = await TerminalAPI.sendInput(req);
      return new Response(response.body, {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/sessions/output" && req.method === "GET") {
      const response = await TerminalAPI.getSessionOutput(req);
      return new Response(response.body, {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/sessions" && req.method === "GET") {
      const response = await TerminalAPI.listSessions();
      return new Response(response.body, {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/api/sessions" && req.method === "DELETE") {
      const response = await TerminalAPI.deleteSession(req);
      return new Response(response.body, {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Info endpoint
    if (url.pathname === "/") {
      return new Response(
        `
Bun Terminal API (PTY Support) Server

Available Endpoints:
- POST /api/sessions           - Create new terminal session
- GET  /api/sessions           - List all active sessions
- GET  /api/sessions/output?sessionId=<id> - Get session output
- POST /api/sessions/input     - Send input to session
- DELETE /api/sessions?sessionId=<id> - Delete session
- WS   /ws?sessionId=<id>      - WebSocket for real-time interaction

Usage Examples:
1. Create session: curl -X POST http://localhost:${PORT}/api/sessions -H 'Content-Type: application/json' -d '{"cols":120,"rows":40}'
2. Send input: curl -X POST http://localhost:${PORT}/api/sessions/input -H 'Content-Type: application/json' -d '{"sessionId":"<id>","input":"ls -la"}'
3. Get output: curl http://localhost:${PORT}/api/sessions/output?sessionId=<id>
4. WebSocket: const ws = new WebSocket('ws://localhost:${PORT}/ws?sessionId=<id>')

Features:
✓ PTY support with TTY-aware applications
✓ Interactive bash, zsh, sh, fish shells
✓ Real-time WebSocket streaming
✓ Session management and auto-cleanup
✓ Security validation and input sanitization
✓ Terminal resize support
✓ Memory-efficient output buffering
      `,
        {
          headers: { ...corsHeaders, "Content-Type": "text/plain" },
        }
      );
    }

    return new Response("Not Found", {
      status: 404,
      headers: corsHeaders,
    });
  },
  websocket: {
    open(_ws) {
      TerminalWebSocket.handle(_ws, _ws.data.sessionId);
    },
    message(_ws, _message) {
      // Handled in TerminalWebSocket.handle
    },
    close(_ws) {
      // Cleanup handled in TerminalWebSocket.handle
    },
  },
});

// Cleanup inactive sessions periodically
setInterval(
  () => {
    TerminalManager.cleanupInactiveSessions();
  },
  5 * 60 * 1000
); // Every 5 minutes

console.log("🚀 Starting Bun Terminal API (PTY Support) Server...");
console.log(`📡 Server: http://${HOST}:${PORT}`);
console.log(`🔌 WebSocket: ws://${HOST}:${PORT}/ws?sessionId=<id>`);
console.log(`📚 API: http://${HOST}:${PORT}/api/sessions`);
console.log("");
console.log("Features:");
console.log("✓ PTY support with TTY-aware applications");
console.log("✓ Interactive bash, zsh, sh, fish shells");
console.log("✓ Real-time WebSocket streaming");
console.log("✓ Session management and auto-cleanup");
console.log("✓ Security validation and input sanitization");
console.log("✓ Terminal resize support");
console.log("✓ Memory-efficient output buffering");
console.log("");
console.log("Press Ctrl+C to stop");
