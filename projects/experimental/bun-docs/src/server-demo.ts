/**
 * Bun.serve Demo Server
 *
 * Extracted from generate.ts for maintainability.
 * This module contains the entire showcase server (routes, WebSocket, SSE,
 * streaming, server.reload(), graceful shutdown, etc.).
 *
 * It is intentionally a "living museum" of Bun.serve capabilities.
 */

import { join } from "node:path";
import type { Server } from "bun";
import type { DocPage } from "../types/doc.ts";
import { BUN_WARDLEY_MAP } from "./lib/wardley-map.ts";

export interface ServerDemoOptions {
  htmlPath: string;
  registryPath: string | null;
  registryData: { meta: Record<string, any>; pages: DocPage[] };

  // Output directory to watch (for --watch mode)
  watchDir?: string; // absolute or relative path (defaults to "dist")

  // From mergedConfig
  port: number;
  hostname: string;
  idleTimeout: number;
  idleTimeoutPerRequest: number;
  unref: boolean;
  watch: boolean;
  console: boolean;
  websocket: boolean;
}

let isShuttingDown = false;

export async function startServerDemo(opts: ServerDemoOptions) {
  const {
    htmlPath,
    registryPath,
    registryData,
    port,
    hostname,
    idleTimeout,
    idleTimeoutPerRequest,
    unref: shouldUnref,
    watch: enableWatch,
    console: enableConsole,
    websocket: enableWebSocket,
  } = opts;

  console.info(`\n🚀 Starting Bun.serve using routes API (from the docs you pasted)...`);

  function logRequest(req: Request) {
    const url = new URL(req.url);
    console.info({
      type: "request",
      method: req.method,
      path: url.pathname,
      time: new Date().toISOString().slice(11, 23),
    });
  }

  const wsServerRef = { current: null as Bun.Server | null };
  let websocketHandler: Bun.WebSocketHandler | undefined = undefined;

  if (enableWebSocket) {
    websocketHandler = {
      open(ws: any) {
        const room = "demo-room";
        ws.subscribe(room);

        const count = wsServerRef.current?.subscriberCount?.(room) ?? 0;
        const info = ws.data ? ` (IP: ${ws.data.clientIP})` : "";

        const headerInfo = ws.data?.receivedUpgradeHeaders
          ? { receivedClientHeaders: ws.data.receivedUpgradeHeaders, upgradeResponseHeaders: ws.data.sentUpgradeResponseHeaders }
          : {};

        ws.send(
          JSON.stringify({
            type: "welcome",
            room,
            subscriberCount: count,
            message:
              "Connected to Bun WebSocket demo room. All messages broadcast via server.publish() + topics. This client also received a direct echo via ws.send().",
            ...headerInfo,
            headerDemoNote: "See /api/ws-status and modal for custom upgrade headers (req.headers + server.upgrade headers option + Bun client new WebSocket(url, {headers})).",
          })
        );

        console.info(`[WebSocket] Client joined${info} — room=${room} subscriberCount=${count}`);
        if (ws.data?.receivedUpgradeHeaders) {
          console.info(`[WebSocket] Upgrade headers received from client:`, ws.data.receivedUpgradeHeaders);
        }
      },
      message(ws: any, message: string | ArrayBuffer) {
        const text =
          message instanceof ArrayBuffer
            ? new TextDecoder().decode(message)
            : String(message);

        ws.send(
          JSON.stringify({
            type: "echo",
            received: text,
            timestamp: Date.now(),
          })
        );

        if (wsServerRef.current) {
          wsServerRef.current.publish(
            "demo-room",
            JSON.stringify({
              type: "broadcast",
              message: text,
              timestamp: Date.now(),
            })
          );
        }
      },
      close(ws: any, code: number, reason: string) {
        console.info(`[WebSocket] Client left (code=${code})`);
      },
    };
  }

  async function createRoutes() {
    const htmlFile = Bun.file(htmlPath);
    const regFile = registryPath ? Bun.file(registryPath) : null;

    return {
      "/": htmlFile,
      "/index.html": htmlFile,
      "/registry.json": regFile || new Response("No registry", { status: 404 }),
      "/api/registry": regFile || new Response("No registry", { status: 404 }),

      "/api/status": (req: Request, srv: Server) => {
        logRequest(req);
        const ip = srv.requestIP(req);
        return Response.json({
          status: "ok",
          url: srv.url.toString(),
          pendingRequests: srv.pendingRequests,
          pendingWebSockets: srv.pendingWebSockets,
          client: ip?.address,
        });
      },

      "/api/page/:slug": (req: any) => { // req.params comes from Bun routes typing
        logRequest(req);
        const page = registryData.pages.find((p: any) => p.url.includes(req.params.slug));
        return page ? Response.json(page) : new Response("Not found", { status: 404 });
      },

      "/api/echo": {
        POST: async (req: Request) => {
          logRequest(req);
          return Response.json({ echo: await req.json().catch(() => ({})) });
        },
        GET: (req: Request) => {
          logRequest(req);
          return Response.json({ ok: true });
        },
      },

      "/api/sse": (req: Request, server: Server) => {
        logRequest(req);

        const url = new URL(req.url);
        const timeoutSec = url.searchParams.has("timeout")
          ? parseInt(url.searchParams.get("timeout") || "0", 10)
          : idleTimeoutPerRequest;

        server.timeout(req, timeoutSec);

        console.info(`   [SSE] server.timeout(req, ${timeoutSec}) — per-request idle timeout ${timeoutSec === 0 ? "disabled" : `set to ${timeoutSec}s`}`);

        const encoder = new TextEncoder();
        let eventId = 0;
        let intervalId: ReturnType<typeof setInterval> | null = null;

        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode(`id: ${eventId++}\ndata: connected (per-request timeout=${timeoutSec}s via server.timeout)\n\n`)
            );

            intervalId = setInterval(() => {
              if (eventId > 20) {
                if (intervalId) {
                  clearInterval(intervalId);
                  intervalId = null;
                }
                try {
                  controller.enqueue(encoder.encode(`id: ${eventId++}\ndata: [demo] 20 events sent — stream closed by server (try ?timeout=300 for longer)\n\n`));
                  controller.close();
                } catch {}
                return;
              }
              try {
                controller.enqueue(
                  encoder.encode(
                    `id: ${eventId++}\ndata: ${new Date().toISOString()} — live event #${eventId} (kept alive by server.timeout(req, ${timeoutSec}))\n\n`
                  )
                );
              } catch (e) {
                if (intervalId) {
                  clearInterval(intervalId);
                  intervalId = null;
                }
              }
            }, 1000);
          },
          cancel() {
            if (intervalId) {
              clearInterval(intervalId);
              intervalId = null;
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
          },
        });
      },

      "/api/stream-demo": async (req: Request) => {
        logRequest(req);

        const encoder = new TextEncoder();
        const chunks = [
          "Chunk 1: Hello from Bun streaming demo\n",
          "Chunk 2: This response is being streamed in real time...\n",
          "Chunk 3: No buffering of the entire body in memory.\n",
          "Chunk 4: Perfect for large files, SSE, or AI token streams.\n",
          "Chunk 5: Connection will close after this final chunk.\n",
        ];

        const stream = new ReadableStream({
          async start(controller) {
            for (const chunk of chunks) {
              controller.enqueue(encoder.encode(chunk));
              await new Promise(r => setTimeout(r, 350));
            }
            controller.close();
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
          },
        });
      },

      "/api/echo-stream": async (req: Request) => {
        logRequest(req);

        if (req.method !== "POST") {
          return new Response("Method not allowed", { status: 405 });
        }

        const chunks: string[] = [];
        const decoder = new TextDecoder();

        try {
          for await (const chunk of req.body!) {
            const text = decoder.decode(chunk, { stream: true });
            chunks.push(text);
            console.info(`   [Stream Request] Received chunk: ${text.trim()}`);
          }
        } catch (err) {
          console.error("   [Stream Request] Error reading stream:", err);
        }

        const fullBody = chunks.join("");
        console.info(`   [Stream Request] Total body received: ${fullBody.length} chars`);

        return new Response(`Echo: ${fullBody}`, {
          headers: { "Content-Type": "text/plain" },
        });
      },

      // ============================================================
      // DEEP DEMO: Automatic Content-Type handling (Blob, FormData, File, etc.)
      // ============================================================
      // This is one of the most educational routes in the demo.
      // It shows exactly what Bun does with Content-Type headers.
      "/api/echo-content-type": async (req: Request) => {
        logRequest(req);

        if (req.method !== "POST") {
          return Response.json({
            error: "Use POST",
            hint: "Try sending a Blob, FormData, or plain text from the client demo buttons."
          }, { status: 405 });
        }

        const receivedContentType = req.headers.get("content-type") || "(none set by client)";
        const contentLength = req.headers.get("content-length");

        let analysis: any = {
          receivedContentType,
          contentLength,
          bunBehavior: "Bun automatically sets Content-Type when you don't provide one for Blob/FormData.",
        };

        try {
          const contentType = receivedContentType.toLowerCase();

          if (contentType.includes("multipart/form-data")) {
            const formData = await req.formData();
            const entries: Record<string, any> = {};

            for (const [key, value] of formData.entries()) {
              if (value instanceof File) {
                entries[key] = {
                  type: "File",
                  name: value.name,
                  size: value.size,
                  fileType: value.type,
                };
              } else {
                entries[key] = value;
              }
            }

            analysis.bodyType = "FormData";
            analysis.fields = entries;
            analysis.fieldCount = [...formData].length;
            analysis.explanation = "Bun automatically added the correct 'multipart/form-data; boundary=----WebKitFormBoundary...' header.";

          } else if (contentType.includes("application/x-www-form-urlencoded")) {
            const text = await req.text();
            analysis.bodyType = "URLSearchParams";
            analysis.raw = text;
            analysis.explanation = "Bun sets application/x-www-form-urlencoded for URLSearchParams.";

          } else if (contentType.includes("application/json")) {
            const json = await req.json();
            analysis.bodyType = "JSON";
            analysis.value = json;
            analysis.explanation = "You (or the client) explicitly set JSON.";

          } else {
            // Treat everything else as Blob-like
            const blob = await req.blob();
            const textPreview = await blob.text().then(t => t.slice(0, 150));

            analysis.bodyType = "Blob";
            analysis.size = blob.size;
            analysis.detectedBlobType = blob.type || "(empty — Bun fell back to default)";

            analysis.explanation = blob.type
              ? `Bun respected the type you passed to the Blob constructor: "${blob.type}"`
              : "You created a Blob without a type, so Bun used an empty Content-Type.";

            analysis.preview = textPreview + (blob.size > 150 ? "..." : "");
          }
        } catch (err: any) {
          analysis.error = err.message;
        }

        return Response.json({
          receivedContentType,
          analysis,
          bunMagic: "This behavior is a Bun extension on top of the standard fetch API.",
        });
      },

      // ============================================================
      // BUN NATIVE UTILS LAB - Live demonstrations using Wardley Map data
      // ============================================================
      "/api/bun-utils/inspect": async (req) => {
        logRequest(req);
        const { nodeId } = await req.json().catch(() => ({}));

        if (nodeId) {
          const node = BUN_WARDLEY_MAP.components.find(c => c.id === nodeId);
          if (node) {
            return new Response(Bun.inspect(node, { colors: false, depth: 3 }));
          }
        }

        // Default: inspect first 3 components
        return new Response(Bun.inspect(BUN_WARDLEY_MAP.components.slice(0, 3), { colors: false, depth: 2 }));
      },

      "/api/bun-utils/table": async (req) => {
        logRequest(req);
        const table = Bun.inspect.table(BUN_WARDLEY_MAP.components.map(c => ({
          Name: c.name,
          Evolution: (c.evolution * 100).toFixed(0) + "%",
          Visibility: (c.visibility * 100).toFixed(0) + "%",
          Category: c.category || "-"
        })));
        return new Response(table);
      },

      "/api/bun-utils/deep-equals": async (req) => {
        logRequest(req);
        const original = BUN_WARDLEY_MAP.components[0];
        const modified = { ...original, evolution: original.evolution + 0.01 };

        const areEqual = Bun.deepEquals(original, modified);
        const areEqualStrict = Bun.deepEquals(original, original);

        return Response.json({
          original,
          modified,
          deepEquals_result: areEqual,
          deepEquals_same_object: areEqualStrict,
          explanation: "Bun.deepEquals is a fast, native deep equality check (faster than JSON.stringify + compare in many cases)."
        });
      },

      "/api/bun-utils/timing": async (req) => {
        logRequest(req);

        const start = Bun.nanoseconds();

        // Simulate some work on the map data
        let sum = 0;
        for (const c of BUN_WARDLEY_MAP.components) {
          sum += c.evolution * c.visibility;
        }
        for (let i = 0; i < 50000; i++) {
          sum += Math.sin(i);
        }

        const end = Bun.nanoseconds();
        const durationNs = end - start;
        const durationMs = (durationNs / 1_000_000).toFixed(3);

        return Response.json({
          operation: "Processed Wardley map + heavy computation loop",
          duration_ns: durationNs,
          duration_ms: durationMs,
          result: sum.toFixed(2),
          note: "Bun.nanoseconds() provides high-resolution timing (nanosecond precision)."
        });
      },

      "/api/bun-utils/gzip": async (req) => {
        logRequest(req);
        const jsonData = JSON.stringify(BUN_WARDLEY_MAP, null, 2);
        const originalSize = Buffer.byteLength(jsonData);

        const compressed = Bun.gzipSync(jsonData);
        const compressedSize = compressed.length;

        const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

        return Response.json({
          original_size: originalSize,
          compressed_size: compressedSize,
          compression_ratio: `${ratio}%`,
          note: "Bun.gzipSync() is a fast native gzip implementation. Great for exporting large map states."
        });
      },

      "/api/bun-utils/uuid": async (req) => {
        logRequest(req);
        const ids = Array.from({ length: 5 }, () => Bun.randomUUIDv7());

        return Response.json({
          generated_ids: ids,
          note: "Bun.randomUUIDv7() generates time-sortable UUIDs (great for traceability in dashboards)."
        });
      },

      // --- Remaining Bun Utilities from user's table ---

      "/api/bun-utils/string-width": async (req) => {
        logRequest(req);

        // Create a terminal-aligned list of components using Bun.stringWidth
        const lines = BUN_WARDLEY_MAP.components
          .sort((a, b) => b.visibility - a.visibility)
          .slice(0, 8)
          .map(c => {
            const nameWidth = Bun.stringWidth(c.name);
            const padding = " ".repeat(Math.max(0, 28 - nameWidth));
            return `${c.name}${padding} | vis: ${(c.visibility * 100).toFixed(0)}% | evo: ${(c.evolution * 100).toFixed(0)}%`;
          });

        return new Response(lines.join("\n"));
      },

      "/api/bun-utils/sleep": async (req) => {
        logRequest(req);

        const results: string[] = [];
        const start = Date.now();

        for (let i = 0; i < 4; i++) {
          const node = BUN_WARDLEY_MAP.components[i];
          results.push(`Loading node: ${node.name}`);
          await Bun.sleep(180); // Proper non-blocking sleep
        }

        const duration = Date.now() - start;

        return Response.json({
          sequence: results,
          total_duration_ms: duration,
          note: "Used Bun.sleep() instead of setTimeout for clean, non-blocking delays between node loads."
        });
      },

      "/api/bun-utils/peek": async (req) => {
        logRequest(req);

        // Simulate lazy loading of extra metadata for a node
        const lazyMetadata = new Promise(resolve => {
          setTimeout(() => {
            resolve({
              node: "bundler",
              lastUpdated: new Date().toISOString(),
              complexity: "Medium",
              relatedDocs: 12
            });
          }, 50);
        });

        const peeked = Bun.peek(lazyMetadata);

        return Response.json({
          peeked_value: peeked,
          note: "Bun.peek() lets you inspect the current state of a promise without creating an extra microtask."
        });
      },

      "/api/bun-utils/resolve-sync": async (req) => {
        logRequest(req);

        try {
          // Resolve a hypothetical documentation path
          const resolved = Bun.resolveSync("./src/lib/wardley-map.ts", process.cwd());

          return Response.json({
            resolved_path: resolved,
            relative_to: process.cwd(),
            note: "Bun.resolveSync() performs synchronous module resolution — useful for building doc links at runtime."
          });
        } catch (err) {
          return Response.json({ error: String(err) });
        }
      },

      ...(enableWebSocket
        ? {
            "/ws": (req: Request, srv: Server) => {
              logRequest(req);

              const url = new URL(req.url);
              const receivedHeaders: Record<string, string | null> = {
                'x-client-id': req.headers.get('x-client-id') || req.headers.get('X-Client-Id') || url.searchParams.get('x-client-id') || null,
                'authorization': req.headers.get('authorization') || url.searchParams.get('authorization') || null,
                'user-agent': req.headers.get('user-agent'),
                'cookie': req.headers.get('cookie'),
              };

              const cleanReceived = Object.fromEntries(
                Object.entries(receivedHeaders).filter(([, v]) => v != null)
              );

              const responseHeaders = {
                'X-Upgrade-Demo': 'Bun custom upgrade headers',
                'X-Received-Client-Id': cleanReceived['x-client-id'] || 'none',
                'X-Upgrade-Timestamp': new Date().toISOString(),
              };

              const upgraded = srv.upgrade(req, {
                headers: responseHeaders,
                data: {
                  connectedAt: Date.now(),
                  clientIP: srv.requestIP(req)?.address ?? "unknown",
                  receivedUpgradeHeaders: cleanReceived,
                  sentUpgradeResponseHeaders: responseHeaders,
                },
              });
              if (upgraded) {
                return undefined;
              }
              return new Response("WebSocket upgrade failed", { status: 400 });
            },
            "/api/ws-status": (req: Request, srv: Server) => {
              logRequest(req);
              const room = "demo-room";
              const count = typeof srv.subscriberCount === "function" ? srv.subscriberCount(room) : 0;
              return Response.json({
                websocketEnabled: true,
                room,
                subscriberCount: count,
                note: "Connect with custom headers! Server reads req.headers (or ?x-client-id=... for browser demo). See welcome message for received/sent upgrade headers.",
                headerDemo: {
                  description: "Demonstrates reading upgrade request headers + returning custom headers via server.upgrade({ headers })",
                  clientHeaderExamples: ["X-Client-Id", "Authorization"],
                  bunClientSyntax: "new WebSocket('ws://host/ws', { headers: { 'X-Client-Id': 'demo123', 'Authorization': 'Bearer ...' } })",
                },
                demonstratedAPIs: [
                  "Bun.serve({ websocket: WebSocketHandler, routes })",
                  "server.upgrade(req, { headers, data })  ← custom upgrade response headers",
                  "req.headers.get('x-client-id') inside the upgrade route (before calling upgrade)",
                  "ws.subscribe('demo-room')",
                  "ws.send(JSON.stringify(...))",
                  "server.publish('demo-room', msg)",
                  "server.subscriberCount('demo-room')",
                  "ws.data (per-socket context + receivedUpgradeHeaders from the handshake)"
                ],
              });
            },
          }
        : {}),

      "/api/*": Response.json({ error: "Not found" }, { status: 404 }),
      "/docs": Response.redirect("/"),

      ...(enableConsole
        ? {
            "/__shutdown": {
              POST: async () => {
                console.info(`\n[Debug] Received shutdown request via /__shutdown`);
                setTimeout(() => process.exit(0), 100);
                return new Response("Shutting down...", { status: 200 });
              },
            },
          }
        : {}),
    };
  }

  const initialRoutes = await createRoutes();

  const serveOptions: Bun.ServeOptions = {
    port,
    hostname,
    idleTimeout,
    development: enableConsole ? { console: true } : undefined,
    routes: initialRoutes,
    fetch(req: Request) {
      logRequest(req);
      return new Response("Not Found", { status: 404 });
    },
  };

  if (enableWebSocket && websocketHandler) {
    serveOptions.websocket = websocketHandler;
  }

  const server = Bun.serve(serveOptions);

  if (enableWebSocket) {
    wsServerRef.current = server;
  }

  console.info(`✅ Server running: ${server.url}`);
  console.info(
    `   Useful: /api/status  | POST /api/echo-content-type | /api/bun-utils/* (10 Bun Utils Lab demos)  | GET /api/sse | GET /api/stream-demo${enableWebSocket ? "  | WS /ws" : ""}`
  );

  // Graceful Shutdown
  async function shutdown(force = false) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.info(`\n🛑 Shutting down server...`);

    try {
      await server.stop(force);
      console.info(`   ✅ Server stopped successfully ${force ? '(forced)' : '(graceful)'}`);
    } catch (err) {
      console.error(`   ❌ Error during shutdown:`, err);
    }

    setTimeout(() => {
      process.exit(0);
    }, 100);
  }

  process.on('SIGINT', () => {
    console.info('\n[Signal] Received SIGINT (Ctrl+C)');
    shutdown(false);
  });

  process.on('SIGTERM', () => {
    console.info('\n[Signal] Received SIGTERM');
    shutdown(true);
  });

  // Double Ctrl+C forces immediate shutdown
  let sigintCount = 0;
  const originalSigint = process.listeners('SIGINT');
  process.removeAllListeners('SIGINT');
  process.on('SIGINT', () => {
    sigintCount++;
    if (sigintCount >= 2) {
      console.info('\n[Signal] Second SIGINT — forcing immediate shutdown');
      shutdown(true);
    } else {
      shutdown(false);
    }
  });

  // Hot reload via server.reload()
  if (enableWatch) {
    const watchDir = opts.watchDir || "dist";
    const resolvedWatchDir = watchDir.startsWith("/") ? watchDir : join(process.cwd(), watchDir);

    console.info(`\n👀 Watch mode enabled — using server.reload() for zero-downtime updates`);
    console.info(`   Watching ${resolvedWatchDir} for changes...`);

    const { watch } = await import("node:fs");

    watch(resolvedWatchDir, { recursive: true }, async (_eventType, filename) => {
      if (!filename) return;

      if (filename.includes("bun-docs.html") || filename.includes("bun-docs-registry.json")) {
        const start = Date.now();
        console.info(`\n🔄 File changed: ${filename} → calling server.reload()`);

        try {
          const newRoutes = await createRoutes();
          server.reload({ routes: newRoutes });
          const duration = Date.now() - start;
          console.info(`   ✅ Routes reloaded successfully in ${duration}ms (no dropped connections)`);
        } catch (err) {
          console.error(`   ❌ Reload failed:`, err);
        }
      }
    });
  }

  if (shouldUnref) {
    server.unref();
    console.info(`   ⚠️  Server will not keep the process alive (--unref)`);
  } else {
    server.ref();
  }
}