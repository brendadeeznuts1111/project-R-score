/**
 * PTY Handler
 * 
 * Handles PTY (pseudo-terminal) session management routes.
 */

import { ptyService } from "../services/pty-service";
import type { PTYCreateOptions, PTYSessionInfo, PTYStats, ApiResponse } from "../../types";

export interface PTYHandlerContext {
  config: {
    DEVELOPMENT: boolean;
  };
  trackRequest: (start: number, path?: string) => void;
}

/**
 * List all PTY sessions
 */
export function handlePTYSessions(context: PTYHandlerContext): Response {
  const start = performance.now();
  context.trackRequest(start, "/api/pty/sessions");

  return Response.json({
    data: {
      sessions: ptyService.listSessions(),
      timestamp: new Date().toISOString(),
    }
  });
}

/**
 * Create a new PTY session
 */
export async function handlePTYCreate(
  context: PTYHandlerContext,
  body: { command: string; args?: string[]; cols?: number; rows?: number; cwd?: string; env?: Record<string, string> }
): Promise<Response> {
  const start = performance.now();
  context.trackRequest(start, "/api/pty/create");
  
  try {
    const { command, args = [], cols = 120, rows = 40, cwd, env } = body;

    if (!command) {
      return Response.json({ error: "Command is required" }, { status: 400 });
    }

    // Security: Only allow specific commands in production
    const allowedCommands = context.config.DEVELOPMENT
      ? null // Allow all in dev
      : ["bash", "sh", "zsh", "ls", "cat", "head", "tail", "grep", "find", "ps", "top", "htop", "btop"];

    if (allowedCommands && !allowedCommands.includes(command)) {
      return Response.json({ error: `Command not allowed: ${command}` }, { status: 403 });
    }

    const session = await ptyService.create({ command, args, cols, rows, cwd, env });

    return Response.json({
      data: {
        id: session.id,
        command: session.command,
        args: session.args,
        cols: session.cols,
        rows: session.rows,
        status: session.status,
        createdAt: session.createdAt,
      }
    });
  } catch (error: any) {
    return Response.json({ error: error.message || "Failed to create PTY session" }, { status: 500 });
  }
}

/**
 * Get PTY session stats
 */
export function handlePTYStats(context: PTYHandlerContext): Response {
  const start = performance.now();
  context.trackRequest(start, "/api/pty/stats");

  return Response.json({
    data: {
      ...ptyService.getStats(),
      timestamp: new Date().toISOString(),
      bunVersion: Bun.version,
    }
  });
}

/**
 * Execute a quick command via PTY
 */
export async function handlePTYExec(
  context: PTYHandlerContext,
  body: { command: string; args?: string[]; timeout?: number }
): Promise<Response> {
  const start = performance.now();
  context.trackRequest(start, "/api/pty/exec");
  
  try {
    const { command, args = [], timeout = 30000 } = body;

    if (!command) {
      return Response.json({ error: "Command is required" }, { status: 400 });
    }

    // Security: Only allow specific commands
    const allowedCommands = context.config.DEVELOPMENT
      ? null
      : ["ls", "cat", "head", "tail", "grep", "find", "ps", "df", "du", "uptime", "whoami", "pwd", "echo"];

    if (allowedCommands && !allowedCommands.includes(command)) {
      return Response.json({ error: `Command not allowed: ${command}` }, { status: 403 });
    }

    const result = await ptyService.exec(command, args, Math.min(timeout, 60000));

    return Response.json({
      data: {
        output: result.output,
        exitCode: result.exitCode,
        durationMs: result.durationMs,
      }
    });
  } catch (error: any) {
    return Response.json({ error: error.message || "Command execution failed" }, { status: 500 });
  }
}

/**
 * Get a specific PTY session
 */
export function handlePTYSession(sessionId: string): Response {
  const session = ptyService.getSession(sessionId);
  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }
  return Response.json({ data: session } satisfies ApiResponse<PTYSessionInfo>);
}

/**
 * Get session output
 */
export function handlePTYSessionOutput(
  sessionId: string,
  fromLine: number = 0
): Response {
  const output = ptyService.getOutput(sessionId, fromLine);
  return Response.json({
    data: {
      output,
      fromLine,
      lineCount: output.length,
    }
  });
}

/**
 * Write to a PTY session
 */
export async function handlePTYSessionWrite(
  sessionId: string,
  body: { data: string }
): Promise<Response> {
  try {
    const { data } = body;
    if (!data) {
      return Response.json({ error: "Data is required" }, { status: 400 });
    }
    const success = ptyService.write(sessionId, data);
    return Response.json({ data: { success, sessionId } });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Resize a PTY session
 */
export async function handlePTYSessionResize(
  sessionId: string,
  body: { cols: number; rows: number }
): Promise<Response> {
  try {
    const { cols, rows } = body;
    if (!cols || !rows) {
      return Response.json({ error: "cols and rows are required" }, { status: 400 });
    }
    const success = ptyService.resize(sessionId, cols, rows);
    return Response.json({ data: { success, sessionId, cols, rows } });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Kill a PTY session
 */
export function handlePTYSessionKill(sessionId: string): Response {
  const success = ptyService.kill(sessionId);
  return Response.json({ data: { success, sessionId, killed: success } });
}

/**
 * Remove a PTY session
 */
export function handlePTYSessionRemove(sessionId: string): Response {
  const success = ptyService.remove(sessionId);
  return Response.json({ data: { success, sessionId, removed: success } });
}
