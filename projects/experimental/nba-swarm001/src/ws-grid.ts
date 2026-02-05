/**
 * Rotation Grid WebSocket Server
 *
 * Streams delta updates for rotation heatmap grid
 */

import { serve } from "bun";
import { rotationCache } from "./utils/rotation-cache.js";
import {
  generateHeatmap,
  generateSemanticTheme,
  hslString,
  generateFingerprint,
} from "./utils/heatmap.js";
import { getLogger } from "./utils/logger.js";
import { handleError, createErrorContext } from "./utils/error-handler.js";

const logger = getLogger();

/**
 * Grid delta entry
 */
interface GridDelta {
  rot: string; // Rotation ID (game ID)
  heat: string; // Heatmap Unicode string
  fp: string; // Fingerprint
  hsl: string; // HSL color string
}

const clients = new Set<WebSocket>();

/**
 * Generate grid delta from cached games
 */
function generateGridDelta(maxGames: number = 1000): GridDelta[] {
  const sorted = rotationCache.getAllSorted();
  const delta: GridDelta[] = [];

  for (let i = 0; i < Math.min(sorted.length, maxGames); i++) {
    const { game, rotationNumber } = sorted[i];
    const vector = game.vector;

    const heat = generateHeatmap(vector);
    const theme = generateSemanticTheme(rotationNumber);
    const hsl = hslString(theme.base.h, theme.base.s, theme.base.l);
    const fp = generateFingerprint(vector);

    delta.push({
      rot: game.id,
      heat,
      fp,
      hsl,
    });
  }

  return delta;
}

/**
 * Broadcast grid delta to all connected clients
 */
function broadcastDelta(): void {
  if (clients.size === 0) return;

  const context = createErrorContext("broadcastDelta", {
    clientCount: clients.size,
    cachedGames: rotationCache.size,
  });

  try {
    const delta = generateGridDelta(1000);
    const payload = JSON.stringify(delta);

    // Send to all clients
    let successCount = 0;
    let failureCount = 0;

    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(payload);
          successCount++;
        } catch (error) {
          failureCount++;
          // Client disconnected, remove from set
          clients.delete(ws);
          logger.debug("Client disconnected during broadcast", {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      } else {
        // Remove closed connections
        clients.delete(ws);
      }
    }

    if (successCount > 0) {
      logger.debug("Grid delta broadcasted", {
        successCount,
        failureCount,
        payloadSize: payload.length,
      });
    }
  } catch (error) {
    handleError(error, context, {
      logLevel: "error",
      throw: false, // Don't crash the broadcast loop
      recover: () => {
        logger.debug("Continuing broadcast loop after error");
      },
    });
  }
}

/**
 * Start WebSocket server for rotation grid
 */
export function startRotationGridServer(port: number = 3003): void {
  serve({
    port,
    fetch(req, server) {
      const url = new URL(req.url);

      // WebSocket upgrade
      if (url.pathname === "/ws/rotation-grid") {
        if (server.upgrade(req)) {
          return;
        }
        return new Response("WebSocket upgrade failed", { status: 500 });
      }

      // Health check
      if (url.pathname === "/api/grid/health") {
        return new Response(
          JSON.stringify({
            clients: clients.size,
            cachedGames: rotationCache.size,
            status: "healthy",
          }),
          {
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      return new Response("Not Found", { status: 404 });
    },
    websocket: {
      open(ws) {
        clients.add(ws);
        // Send initial delta immediately
        const delta = generateGridDelta(1000);
        ws.send(JSON.stringify(delta));
      },
      close(ws) {
        clients.delete(ws);
      },
      message() {
        // Client can send ping/pong, but we don't need to handle it
      },
      perMessageDeflate: true, // Enable compression
    },
  });

  // Broadcast delta every 500ms
  setInterval(broadcastDelta, 500);

  console.log(`🚀 Rotation Grid WebSocket server running on port ${port}`);
}

// If run directly, start the server
if (import.meta.main) {
  const port = parseInt(process.env.PORT || "3003", 10);
  startRotationGridServer(port);
}
