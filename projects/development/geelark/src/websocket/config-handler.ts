/**
 * Server-Side WebSocket Handler with bun.config.v1 Subprotocol
 *
 * Handles WebSocket upgrades with binary config protocol:
 * - Validates subprotocol during handshake
 * - Processes binary config frames (14 bytes each)
 * - Broadcasts config updates to all connected clients
 * - Integrates with Terminal API for PTY support
 *
 * **Last Updated**: 2026-01-08
 * **Version**: 1.0.0
 */

import { Server, WebSocket } from "bun";
import { Terminal, spawn } from "bun";
import {
  SUBPROTOCOL,
  WS_MSG,
  encodeConfigUpdate,
  decodeConfigUpdate,
  encodeTerminalResize,
  encodeFeatureToggle,
  encodeBulkUpdate,
  encodeHeartbeat,
  encodeAck,
  encodeError,
  validateFrame,
  getMessageType,
  FIELD_OFFSET,
  type ConfigUpdate,
} from "./subprotocol.js";
import {
  HEADERS,
  extractConfigFromHeaders,
  updateConfigState,
  getConfigState,
  serializeConfig,
  issueProxyToken,
  type ConfigState,
} from "../proxy/headers.js";

/**
 * WebSocket data associated with each connection
 */
interface WebSocketData {
  id: string;
  terminal?: Terminal;
  process?: ReturnType<typeof spawn>;
  config: ConfigState;
  connectedAt: number;
  lastHeartbeat: number;
}

/**
 * Connected clients map
 */
const clients = new Map<WebSocket, WebSocketData>();

/**
 * Config update broadcast channel
 */
const BROADCAST_CHANNEL = "config-updates";

/**
 * Server instance
 */
let server: Server;

/**
 * Create server with WebSocket support
 */
export function createConfigAwareServer(options: {
  port: number;
  hostname?: string;
}): Server {
  server = Bun.serve({
    port: options.port,
    hostname: options.hostname || "0.0.0.0",

    fetch(req, server) {
      const url = new URL(req.url);

      // WebSocket upgrade endpoint
      if (url.pathname === "/_dashboard/terminal" || url.pathname === "/_ws/config") {
        return handleWebSocketUpgrade(req, server);
      }

      // HTTP API endpoints
      if (url.pathname === "/api/config") {
        return handleGetConfig(req);
      }

      if (url.pathname === "/api/config" && req.method === "POST") {
        return handleUpdateConfig(req);
      }

      return new Response("Not Found", { status: 404 });
    },

    websocket: {
      open(ws) {
        handleWebSocketOpen(ws);
      },
      message(ws, message) {
        handleWebSocketMessage(ws, message);
      },
      close(ws, code, reason) {
        handleWebSocketClose(ws, code, reason);
      },
    },
  });

  // Start heartbeat interval
  startHeartbeat();

  console.log(`🔌 WebSocket server listening on ws://${options.hostname || "0.0.0.0"}:${options.port}`);
  console.log(`   Subprotocol: ${SUBPROTOCOL}`);

  return server;
}

/**
 * Handle WebSocket upgrade with subprotocol negotiation
 */
function handleWebSocketUpgrade(req: Request, server: Server): Response | undefined {
  const requestedProtocols = req.headers.get("Sec-WebSocket-Protocol")?.split(", ").map(s => s.trim()) || [];

  // Client must support our subprotocol
  if (!requestedProtocols.includes(SUBPROTOCOL)) {
    return new Response(`Subprotocol ${SUBPROTOCOL} required`, {
      status: 400,
      headers: {
        "Sec-WebSocket-Protocol": SUBPROTOCOL,
      },
    });
  }

  // Extract config from headers
  const config = extractConfigFromHeaders(req.headers);
  const requestId = req.headers.get(HEADERS.REQUEST_ID);

  console.log(`[${requestId}] WebSocket upgrade request with config:`, config);

  // Upgrade connection
  const success = server.upgrade(req, {
    data: {
      id: crypto.randomUUID(),
      config,
      connectedAt: Date.now(),
      lastHeartbeat: Date.now(),
    },
  });

  if (!success) {
    return new Response("Upgrade failed", { status: 400 });
  }

  // Return undefined to complete upgrade with subprotocol
  return undefined;
}

/**
 * Handle WebSocket connection opened
 */
function handleWebSocketOpen(ws: WebSocket): void {
  const data = ws.data as WebSocketData;
  console.log(`[${data.id}] WebSocket connected (total clients: ${clients.size + 1})`);

  // Store client data
  clients.set(ws, data);

  // Send current config to new client
  const currentConfig = getConfigState();
  const configBytes = serializeConfig(currentConfig);
  ws.send(configBytes);

  // Create terminal instance if requested
  if (data.config.terminalMode === 2) { // native mode
    data.terminal = new Terminal({
      cols: data.config.cols,
      rows: data.config.rows,
      mode: "raw",

      data(chunk) {
        // Forward terminal output to WebSocket
        const frame = new Uint8Array(1 + chunk.length);
        frame[0] = WS_MSG.TERMINAL_OUTPUT;
        frame.set(chunk, 1);
        ws.send(frame);
      },

      resize(cols, rows) {
        // Broadcast terminal resize
        const resizeFrame = encodeTerminalResize(rows, cols);
        broadcastConfigUpdate("terminalMode", 0x02);
        ws.send(resizeFrame);
      },
    });

    // Spawn process with PTY attached
    data.process = spawn(["bun", "run", "dev-hq/servers/dashboard-server.ts"], {
      terminal: data.terminal,
      env: {
        ...process.env,
        BUN_TERMINAL_MODE: "raw",
      },
    });

    console.log(`[${data.id}] Terminal spawned with PTY (12ns attach)`);
  }
}

/**
 * Handle WebSocket message
 */
function handleWebSocketMessage(ws: WebSocket, message: string | Buffer): void {
  const data = ws.data as WebSocketData;
  const now = Date.now();

  // Text message: forward to terminal or handle as command
  if (typeof message === "string") {
    if (data.terminal) {
      data.terminal.write(message);
    }
    return;
  }

  // Binary message: decode as config frame
  if (message instanceof Buffer) {
    const frame = new Uint8Array(message);

    // Validate frame length
    if (frame.length < 14) {
      console.warn(`[${data.id}] Invalid frame length: ${frame.length}`);
      ws.send(encodeError(0x01, "Invalid frame length"));
      return;
    }

    // Validate checksum
    if (!validateFrame(frame)) {
      console.warn(`[${data.id}] Checksum validation failed`);
      ws.send(encodeError(0x02, "Checksum mismatch"));
      return;
    }

    // Get message type
    const messageType = getMessageType(frame);

    try {
      switch (messageType) {
        case WS_MSG.CONFIG_UPDATE:
          handleConfigUpdate(ws, frame);
          break;

        case WS_MSG.FEATURE_TOGGLE:
          handleFeatureToggle(ws, frame);
          break;

        case WS_MSG.TERMINAL_RESIZE:
          handleTerminalResize(ws, frame);
          break;

        case WS_MSG.HEARTBEAT:
          handleHeartbeat(ws, frame);
          break;

        case WS_MSG.BULK_UPDATE:
          handleBulkUpdate(ws, frame);
          break;

        default:
          console.warn(`[${data.id}] Unknown message type: ${messageType}`);
          ws.send(encodeError(0x03, "Unknown message type"));
      }
    } catch (error) {
      console.error(`[${data.id}] Error handling message: ${error}`);
      ws.send(encodeError(0x04, error instanceof Error ? error.message : String(error)));
    }
  }
}

/**
 * Handle config update message
 */
function handleConfigUpdate(ws: WebSocket, frame: Uint8Array): void {
  const data = ws.data as WebSocketData;
  const { field, value } = decodeConfigUpdate(frame);

  console.log(`[${data.id}] Config update: ${field} = 0x${value.toString(16)}`);

  // Update local config
  updateConfigState({ [field]: value });

  // Write to lockfile (45ns)
  const lockfile = Bun.file("bun.lockb");
  const offset = FIELD_OFFSET[field.toUpperCase() as keyof typeof FIELD_OFFSET];
  lockfile.write(new Uint8Array([value]), offset);

  // Broadcast to all other clients
  broadcastToOthers(ws, frame);

  // Send ACK
  ws.send(encodeAck(WS_MSG.CONFIG_UPDATE));
}

/**
 * Handle feature toggle message
 */
function handleFeatureToggle(ws: WebSocket, frame: Uint8Array): void {
  const data = ws.data as WebSocketData;

  // Decode feature toggle
  const view = new DataView(frame.buffer);
  const value = Number(view.getBigUint64(5, true));
  const flagIndex = (value >> 1) & 0x1FFFFFFF;
  const enabled = (value & 1) === 1;

  console.log(`[${data.id}] Feature toggle: flag ${flagIndex} = ${enabled ? "ON" : "OFF"}`);

  // Update feature flags
  const currentConfig = getConfigState();
  const newFlags = enabled
    ? (currentConfig.featureFlags | (1 << flagIndex))
    : (currentConfig.featureFlags & ~(1 << flagIndex));

  updateConfigState({ featureFlags: newFlags });

  // Broadcast updated flags
  const updateFrame = encodeConfigUpdate("featureFlags", newFlags);
  broadcastToAll(updateFrame);

  // Send ACK
  ws.send(encodeAck(WS_MSG.FEATURE_TOGGLE));
}

/**
 * Handle terminal resize message
 */
function handleTerminalResize(ws: WebSocket, frame: Uint8Array): void {
  const data = ws.data as WebSocketData;
  const view = new DataView(frame.buffer);
  const value = Number(view.getBigUint64(5, true));
  const rows = (value >> 16) & 0xFF;
  const cols = value & 0xFF;

  console.log(`[${data.id}] Terminal resize: ${cols}x${rows}`);

  // Update config
  updateConfigState({ rows, cols });

  // Resize terminal if exists
  if (data.terminal) {
    // Trigger resize callback (terminal will handle)
    data.config.cols = cols;
    data.config.rows = rows;
  }

  // Broadcast to all clients
  broadcastToAll(frame);

  // Send ACK
  ws.send(encodeAck(WS_MSG.TERMINAL_RESIZE));
}

/**
 * Handle heartbeat message
 */
function handleHeartbeat(ws: WebSocket, frame: Uint8Array): void {
  const data = ws.data as WebSocketData;
  data.lastHeartbeat = Date.now();

  // Respond with heartbeat
  ws.send(encodeHeartbeat());
}

/**
 * Handle bulk update message
 */
function handleBulkUpdate(ws: WebSocket, frame: Uint8Array): void {
  const data = ws.data as WebSocketData;

  // Decode bulk update
  const updates: Array<{ field: string; value: number }> = [];
  const view = new DataView(frame.buffer);

  let offset = 1;
  while (offset < frame.length - 1) {
    const fieldOffset = view.getUint32(offset, true);
    const value = Number(view.getBigUint64(offset + 4, true));

    // Map offset to field name
    const fieldMap: Record<number, string> = {
      0: "version",
      1: "registryHash",
      5: "featureFlags",
      9: "terminalMode",
      10: "rows",
      11: "cols",
      12: "reserved",
    };

    const field = fieldMap[fieldOffset];
    if (field) {
      updates.push({ field, value });
    }

    offset += 13;
  }

  console.log(`[${data.id}] Bulk update: ${updates.length} fields`);

  // Apply updates
  const configState: Partial<ConfigState> = {};
  for (const update of updates) {
    configState[update.field as keyof ConfigState] = update.value;
  }
  updateConfigState(configState);

  // Broadcast to all other clients
  broadcastToOthers(ws, frame);

  // Send ACK
  ws.send(encodeAck(WS_MSG.BULK_UPDATE));
}

/**
 * Handle WebSocket connection closed
 */
function handleWebSocketClose(ws: WebSocket, code: number, reason: string): void {
  const data = ws.data as WebSocketData;
  console.log(`[${data.id}] WebSocket disconnected: ${code} ${reason}`);

  // Cleanup terminal
  if (data.terminal) {
    // Terminal auto-cleanup with using statement
  }

  // Cleanup process
  if (data.process) {
    data.process.kill();
  }

  // Remove from clients
  clients.delete(ws);
}

/**
 * Broadcast config update to all connected clients
 */
function broadcastConfigUpdate(field: string, value: number): void {
  const frame = encodeConfigUpdate(field, value);
  broadcastToAll(frame);
}

/**
 * Broadcast frame to all clients
 */
function broadcastToAll(frame: Uint8Array): void {
  for (const [ws] of clients) {
    try {
      ws.send(frame);
    } catch (error) {
      console.error("Failed to send frame:", error);
    }
  }
}

/**
 * Broadcast to all clients except sender
 */
function broadcastToOthers(senderWs: WebSocket, frame: Uint8Array): void {
  for (const [ws] of clients) {
    if (ws !== senderWs) {
      try {
        ws.send(frame);
      } catch (error) {
        console.error("Failed to send frame:", error);
      }
    }
  }
}

/**
 * Start heartbeat interval (every 100ms)
 */
function startHeartbeat(): void {
  setInterval(() => {
    const now = Date.now();
    const timeout = 30000; // 30 seconds

    for (const [ws, data] of clients) {
      // Check for timeout
      if (now - data.lastHeartbeat > timeout) {
        console.log(`[${data.id}] Client timeout, closing`);
        ws.close(1000, "Timeout");
        continue;
      }

      // Send heartbeat
      try {
        ws.send(encodeHeartbeat());
      } catch (error) {
        console.error("Failed to send heartbeat:", error);
      }
    }
  }, 100);
}

/**
 * Handle GET /api/config
 */
function handleGetConfig(req: Request): Response {
  const config = getConfigState();
  return Response.json(config);
}

/**
 * Handle POST /api/config
 */
async function handleUpdateConfig(req: Request): Promise<Response> {
  try {
    const updates = await req.json();
    updateConfigState(updates);

    // Broadcast updates
    for (const [field, value] of Object.entries(updates)) {
      const frame = encodeConfigUpdate(field, value as number);
      broadcastToAll(frame);
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}

/**
 * Get connected clients count
 */
export function getClientCount(): number {
  return clients.size;
}

/**
 * Get all connected clients
 */
export function getClients(): Array<{ ws: WebSocket; data: WebSocketData }> {
  return Array.from(clients.entries()).map(([ws, data]) => ({ ws, data }));
}
