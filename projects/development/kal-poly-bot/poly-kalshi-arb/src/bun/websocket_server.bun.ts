/**
 * High-Performance WebSocket Server - Bun Implementation
 *
 * Handles market tick data with sub-5ms processing latency
 * Binary protocol optimized for maximum throughput
 */

import { serve } from "bun";
import {
  MicrostructuralTickProcessor,
  type MarketTick,
} from "./tick_processor.bun.ts";

const tickProcessor = new MicrostructuralTickProcessor();

// Performance metrics
let totalTicks = 0;
let totalLatency = 0;
let maxLatency = 0;
let slowTicks = 0;

// High-performance WebSocket server for tick data
const server = serve({
  port: 3000,
  hostname: "0.0.0.0",

  websocket: {
    async message(ws: any, message: string | ArrayBuffer) {
      const startTime = performance.now();

      try {
        // Parse tick data (expecting binary protocol for speed)
        const tick = parseBinaryTick(message as ArrayBuffer);

        // Process in <5ms target
        await tickProcessor.processTick(tick);

        const latency = performance.now() - startTime;
        updateMetrics(latency);

        // Log performance warnings
        if (latency > 10) {
          console.warn(`Slow tick processing: ${latency.toFixed(2)}ms`);
          slowTicks++;
        }

        // Send acknowledgment if needed
        if (ws.readyState === 1) {
          // WebSocket.OPEN = 1
          ws.send(
            JSON.stringify({
              status: "processed",
              latency: latency.toFixed(2),
              tickId: tick.timestamp,
            })
          );
        }
      } catch (error) {
        console.error(`WebSocket message processing error: ${error}`);
        ws.send(
          JSON.stringify({ status: "error", message: "Processing failed" })
        );
      }
    },

    open(ws: any) {
      console.log(`WebSocket client connected`);
      ws.send(
        JSON.stringify({ status: "connected", server: "Kalman Filter Suite" })
      );
    },

    close(ws: any, code: number, message: string) {
      console.log(`WebSocket client disconnected: ${code} ${message}`);
    },
  },

  fetch(req, server) {
    const url = new URL(req.url);

    // WebSocket upgrade endpoint
    if (url.pathname === "/ws") {
      if (server.upgrade(req)) {
        return; // WebSocket connection established
      }
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    // Health check endpoint
    if (url.pathname === "/health") {
      const metrics = tickProcessor.getMetrics();
      return Response.json({
        status: "healthy",
        uptime: process.uptime(),
        metrics: {
          ...metrics,
          totalTicks,
          avgLatency:
            totalTicks > 0 ? (totalLatency / totalTicks).toFixed(2) : 0,
          maxLatency: maxLatency.toFixed(2),
          slowTicks,
          slowTickRate:
            totalTicks > 0
              ? ((slowTicks / totalTicks) * 100).toFixed(2) + "%"
              : "0%",
        },
      });
    }

    // Metrics endpoint
    if (url.pathname === "/metrics") {
      return Response.json({
        timestamp: Date.now(),
        performance: {
          totalTicks,
          avgLatency:
            totalTicks > 0 ? (totalLatency / totalTicks).toFixed(2) : 0,
          maxLatency: maxLatency.toFixed(2),
          slowTicks,
          throughput: totalTicks / process.uptime(),
        },
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
        },
      });
    }

    // Static file serving for documentation
    if (url.pathname === "/" || url.pathname === "/docs") {
      return new Response(
        `
        <html>
          <head><title>Kalman Filter Suite - WebSocket API</title></head>
          <body>
            <h1>Kalman Filter Suite WebSocket API</h1>
            <h2>Endpoints</h2>
            <ul>
              <li><strong>WebSocket:</strong> ws://localhost:3000/ws</li>
              <li><strong>Health:</strong> GET /health</li>
              <li><strong>Metrics:</strong> GET /metrics</li>
            </ul>
            <h2>Binary Protocol</h2>
            <pre>
            Tick Binary Format (24 bytes):
            - Timestamp: 8 bytes (float64, little-endian)
            - Book ID: 4 bytes (ASCII)
            - Price: 4 bytes (float32, little-endian)
            - Time Remaining: 2 bytes (uint16, little-endian)
            - Size: 2 bytes (uint16, little-endian)
            - Flags: 2 bytes (bitmask)
            - Reserved: 2 bytes
            </pre>
            <h2>Performance</h2>
            <p>Target: &lt;5ms processing latency</p>
            <p>Current: <span id="metrics">Loading...</span></p>
            <script>
              fetch('/metrics').then(r => r.json()).then(data => {
                document.getElementById('metrics').textContent =
                  \`Avg: \${data.performance.avgLatency}ms, Max: \${data.performance.maxLatency}ms, Throughput: \${data.performance.throughput.toFixed(1)} ticks/sec\`;
              });
            </script>
          </body>
        </html>
      `,
        {
          headers: { "Content-Type": "text/html" },
        }
      );
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`🚀 Kalman Filter WebSocket Server started on port ${server.port}`);

/**
 * Optimized binary parser for low latency
 */
function parseBinaryTick(buffer: ArrayBuffer): MarketTick {
  const view = new DataView(buffer);

  // Validate minimum buffer size
  if (buffer.byteLength < 24) {
    throw new Error("Invalid tick buffer size");
  }

  // Parse binary format
  const timestamp = view.getFloat64(0, true); // little-endian
  const bookIdBytes = new Uint8Array(buffer, 8, 4);
  const bookId = String.fromCharCode(...bookIdBytes).replace(/\0/g, ""); // Remove null bytes
  const price = view.getFloat32(12, true);
  const timeRemaining = view.getUint16(16, true);
  const size = view.getUint16(18, true);
  const flags = view.getUint16(20, true);

  // Decode flags
  const hasHtDelta = (flags & 0x01) !== 0;
  const hasFtDelta = (flags & 0x02) !== 0;
  const isSuspending = (flags & 0x04) !== 0;
  const isSuspended = (flags & 0x08) !== 0;

  // Build tick object
  const tick: MarketTick = {
    timestamp,
    bookId,
    price,
    size,
    status: isSuspended ? "suspended" : isSuspending ? "suspending" : "active",
  };

  // Add optional timeRemaining if present
  if (timeRemaining > 0) {
    tick.timeRemaining = timeRemaining;
  }

  // Parse optional fields if present
  let offset = 24;

  if (hasHtDelta && buffer.byteLength >= offset + 4) {
    tick.ht_delta = view.getFloat32(offset, true);
    offset += 4;
  }

  if (hasFtDelta && buffer.byteLength >= offset + 4) {
    tick.ft_delta = view.getFloat32(offset, true);
    offset += 4;
  }

  return tick;
}

/**
 * Update performance metrics
 */
function updateMetrics(latency: number): void {
  totalTicks++;
  totalLatency += latency;
  maxLatency = Math.max(maxLatency, latency);

  // Log metrics every 1000 ticks
  if (totalTicks % 1000 === 0) {
    const avgLatency = totalLatency / totalTicks;
    const slowRate = (slowTicks / totalTicks) * 100;

    console.log(
      `📊 Metrics: Ticks=${totalTicks}, Avg=${avgLatency.toFixed(2)}ms, Max=${maxLatency.toFixed(2)}ms, Slow=${slowRate.toFixed(1)}%`
    );
  }
}

/**
 * Graceful shutdown handler
 */
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down WebSocket server...");

  // Log final metrics
  if (totalTicks > 0) {
    console.log(`📊 Final Metrics:`);
    console.log(`   Total ticks: ${totalTicks}`);
    console.log(
      `   Average latency: ${(totalLatency / totalTicks).toFixed(2)}ms`
    );
    console.log(`   Max latency: ${maxLatency.toFixed(2)}ms`);
    console.log(
      `   Slow ticks: ${slowTicks} (${((slowTicks / totalTicks) * 100).toFixed(2)}%)`
    );
  }

  // Cleanup tick processor
  await tickProcessor.cleanup();

  // Close server
  server.stop();
  process.exit(0);
});

export default server;
