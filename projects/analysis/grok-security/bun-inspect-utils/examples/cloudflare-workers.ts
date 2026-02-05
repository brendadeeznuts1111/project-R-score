/**
 * [EXAMPLE][CLOUDFLARE][WORKERS]{BUN-API}
 * Cloudflare Workers integration with real-time inspection streaming
 */

import { inspect, table, deepEquals, stringWidth } from "../src/index";

/**
 * Inspection Durable Object for persistent state
 * [CLOUDFLARE][DURABLE][OBJECT]{BUN-API}
 */
export class InspectionDurableObject {
  private logs: Array<{ timestamp: number; data: string }> = [];
  private maxLogs = 1000;

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/inspect-stream" && request.headers.get("upgrade") === "websocket") {
      return this.handleWebSocket(request);
    }

    if (url.pathname === "/logs") {
      return new Response(JSON.stringify(this.logs), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not Found", { status: 404 });
  }

  private handleWebSocket(request: Request): Response {
    const { 0: client, 1: server } = new WebSocketPair();

    server.accept();

    server.addEventListener("message", (event) => {
      const data = JSON.parse(event.data as string);
      const inspected = inspect(data, { depth: 5, colors: true });

      this.logs.push({
        timestamp: Date.now(),
        data: inspected,
      });

      if (this.logs.length > this.maxLogs) {
        this.logs.shift();
      }

      server.send(
        JSON.stringify({
          status: "inspected",
          result: inspected,
          timestamp: Date.now(),
        })
      );
    });

    server.addEventListener("close", () => {
      console.log("WebSocket closed");
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }
}

/**
 * Main Worker handler
 * [CLOUDFLARE][WORKER][HANDLER]{BUN-API}
 */
export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);

    // Inspect endpoint - analyze request/response
    if (url.pathname === "/api/inspect") {
      const body = await request.json();
      const inspected = inspect(body, { depth: 10, colors: true });

      return new Response(
        JSON.stringify({
          original: body,
          inspected,
          size: new TextEncoder().encode(inspected).length,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Table endpoint - format data as table
    if (url.pathname === "/api/table") {
      const { data, format = "ascii" } = await request.json();

      let result: string;
      if (format === "markdown") {
        result = table(data);
      } else {
        result = table(data);
      }

      return new Response(result, {
        headers: { "Content-Type": "text/plain" },
      });
    }

    // Compare endpoint - deep equality check
    if (url.pathname === "/api/compare") {
      const { obj1, obj2 } = await request.json();
      const equal = deepEquals(obj1, obj2);

      return new Response(
        JSON.stringify({
          equal,
          obj1Inspected: inspect(obj1),
          obj2Inspected: inspect(obj2),
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Width endpoint - calculate string width
    if (url.pathname === "/api/width") {
      const { text } = await request.json();
      const width = stringWidth(text);

      return new Response(
        JSON.stringify({
          text,
          width,
          length: text.length,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Health check
    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({
          status: "ok",
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response("Not Found", { status: 404 });
  },

  async scheduled(event: ScheduledEvent, env: any): Promise<void> {
    // Periodic cleanup of old logs
    console.log("Running scheduled cleanup...");
  },
};

