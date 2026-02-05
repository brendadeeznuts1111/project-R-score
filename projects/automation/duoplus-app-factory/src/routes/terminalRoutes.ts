import { ptyService } from "../services/ptyService.js";
import { logger } from "../nebula/logger.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

interface TerminalRequest {
  cols?: number;
  rows?: number;
  shell?: string;
  cwd?: string;
  command?: string;
}

interface TerminalResponse {
  sessionId: string;
  status: string;
  message?: string;
}

export async function handleTerminalCreate(req: Request): Promise<Response> {
  try {
    const body: TerminalRequest = await req.json();
    
    // Validate request
    if (body.cols && (body.cols < 1 || body.cols > 500)) {
      return new Response(JSON.stringify({ 
        error: "Invalid cols value. Must be between 1 and 500." 
      }), { 
        status: 400, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    if (body.rows && (body.rows < 1 || body.rows > 200)) {
      return new Response(JSON.stringify({ 
        error: "Invalid rows value. Must be between 1 and 200." 
      }), { 
        status: 400, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    const session = await ptyService.createSession({
      cols: body.cols,
      rows: body.rows,
      shell: body.shell,
      cwd: body.cwd,
    });

    logger.info(`Created terminal session via API: ${session.id}`, {
      component: "Terminal-Routes",
      sessionId: session.id,
      cols: body.cols,
      rows: body.rows,
    });

    const response: TerminalResponse = {
      sessionId: session.id,
      status: "created",
    };

    return new Response(JSON.stringify(response), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error(`Failed to create terminal session: ${error.message}`, {
      component: "Terminal-Routes",
      error: error.message,
    });

    return new Response(JSON.stringify({ 
      error: error.message 
    }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
}

export async function handleTerminalList(req: Request): Promise<Response> {
  try {
    const sessions = ptyService.listSessions();
    
    const sanitizedSessions = sessions.map(session => ({
      id: session.id,
      startTime: session.startTime.toISOString(),
      lastActivity: session.lastActivity.toISOString(),
      isActive: session.isActive,
      shell: session.process.spawnargs[0] || "unknown",
      pid: session.process.pid,
    }));

    return new Response(JSON.stringify(sanitizedSessions), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error(`Failed to list terminal sessions: ${error.message}`, {
      component: "Terminal-Routes",
      error: error.message,
    });

    return new Response(JSON.stringify({ 
      error: error.message 
    }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
}

export async function handleTerminalWrite(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");
    
    if (!sessionId) {
      return new Response(JSON.stringify({ 
        error: "Missing sessionId parameter" 
      }), { 
        status: 400, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    const body = await req.text();
    if (!body) {
      return new Response(JSON.stringify({ 
        error: "Missing data to write" 
      }), { 
        status: 400, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    const success = ptyService.writeToSession(sessionId, body);
    
    if (!success) {
      return new Response(JSON.stringify({ 
        error: "Session not found or inactive" 
      }), { 
        status: 404, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      bytesWritten: body.length 
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error(`Failed to write to terminal session: ${error.message}`, {
      component: "Terminal-Routes",
      error: error.message,
    });

    return new Response(JSON.stringify({ 
      error: error.message 
    }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
}

export async function handleTerminalResize(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");
    const cols = parseInt(url.searchParams.get("cols") || "0");
    const rows = parseInt(url.searchParams.get("rows") || "0");

    if (!sessionId || !cols || !rows) {
      return new Response(JSON.stringify({ 
        error: "Missing required parameters: sessionId, cols, rows" 
      }), { 
        status: 400, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    if (cols < 1 || cols > 500 || rows < 1 || rows > 200) {
      return new Response(JSON.stringify({ 
        error: "Invalid dimensions. Must be between 1-500 cols and 1-200 rows." 
      }), { 
        status: 400, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    const success = ptyService.resizeSession(sessionId, cols, rows);
    
    if (!success) {
      return new Response(JSON.stringify({ 
        error: "Session not found or inactive" 
      }), { 
        status: 404, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      cols, 
      rows 
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error(`Failed to resize terminal session: ${error.message}`, {
      component: "Terminal-Routes",
      error: error.message,
    });

    return new Response(JSON.stringify({ 
      error: error.message 
    }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
}

export async function handleTerminalClose(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");
    
    if (!sessionId) {
      return new Response(JSON.stringify({ 
        error: "Missing sessionId parameter" 
      }), { 
        status: 400, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    const success = ptyService.closeSession(sessionId);
    
    if (!success) {
      return new Response(JSON.stringify({ 
        error: "Session not found" 
      }), { 
        status: 404, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    logger.info(`Closed terminal session via API: ${sessionId}`, {
      component: "Terminal-Routes",
      sessionId,
    });

    return new Response(JSON.stringify({ 
      success: true, 
      sessionId 
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error(`Failed to close terminal session: ${error.message}`, {
      component: "Terminal-Routes",
      error: error.message,
    });

    return new Response(JSON.stringify({ 
      error: error.message 
    }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
}

export async function handleTerminalStats(req: Request): Promise<Response> {
  try {
    const stats = ptyService.getStats();
    
    return new Response(JSON.stringify(stats), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error(`Failed to get terminal stats: ${error.message}`, {
      component: "Terminal-Routes",
      error: error.message,
    });

    return new Response(JSON.stringify({ 
      error: error.message 
    }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
}

// WebSocket handler for real-time terminal communication
export function handleTerminalWebSocket(req: Request): Response {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");
  
  if (!sessionId) {
    return new Response("Missing sessionId parameter", { status: 400 });
  }

  const session = ptyService.getSession(sessionId);
  if (!session) {
    return new Response("Session not found", { status: 404 });
  }

  const upgradeHeader = req.headers.get("upgrade");
  if (upgradeHeader !== "websocket") {
    return new Response("Expected websocket upgrade", { status: 426 });
  }

  const { socket, response } = Bun.upgrade(req, {
    data: { sessionId },
  });

  socket.addEventListener("open", () => {
    logger.info(`WebSocket connected for terminal session ${sessionId}`, {
      component: "Terminal-Routes",
      sessionId,
    });
  });

  socket.addEventListener("message", (event) => {
    const data = event.data.toString();
    ptyService.writeToSession(sessionId, data);
  });

  socket.addEventListener("close", () => {
    logger.info(`WebSocket disconnected for terminal session ${sessionId}`, {
      component: "Terminal-Routes",
      sessionId,
    });
  });

  // Forward terminal output to WebSocket
  const originalOnData = session.process.stdout.on;
  session.process.stdout.on = (event, listener) => {
    if (event === "data") {
      session.process.stdout.on("data", (data) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(data);
        }
      });
    }
    return originalOnData.call(session.process.stdout, event, listener);
  };

  return response;
}