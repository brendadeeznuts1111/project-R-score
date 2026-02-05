/**
 * WebSocket Lifecycle Integration Tests
 * Tests WebSocket connection, messaging, and disconnection with performance timing
 *
 * Uses Performance Test Harness for SLA validation
 * APIs: Bun.serve() WebSocket, Bun.nanoseconds()
 */

import { describe, test, expect, beforeAll, afterAll } from "harness";
import {
  measureAsync,
  collectStatsAsync,
  SLA_TARGETS,
  formatTime,
  formatStats,
  createTimer,
} from "../../harness/performance";
import type { Server, ServerWebSocket } from "bun";

describe("WebSocket Lifecycle Integration", () => {
  let server: Server;
  const TEST_PORT = 13334;
  const messages: string[] = [];

  beforeAll(async () => {
    server = Bun.serve({
      port: TEST_PORT,
      fetch(req, server) {
        const url = new URL(req.url);

        if (url.pathname === "/ws") {
          const upgraded = server.upgrade(req, {
            data: { connectedAt: Date.now() },
          });
          if (upgraded) return;
          return new Response("Upgrade failed", { status: 500 });
        }

        return new Response("Not Found", { status: 404 });
      },
      websocket: {
        open(ws: ServerWebSocket<{ connectedAt: number }>) {
          ws.send(JSON.stringify({ type: "connected", timestamp: Date.now() }));
        },
        message(ws, message) {
          const data = typeof message === "string" ? message : message.toString();
          messages.push(data);

          try {
            const parsed = JSON.parse(data);

            if (parsed.type === "ping") {
              ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
            } else if (parsed.type === "echo") {
              ws.send(JSON.stringify({ type: "echo", data: parsed.data, timestamp: Date.now() }));
            } else if (parsed.type === "broadcast") {
              server.publish("broadcast", JSON.stringify({ type: "broadcast", data: parsed.data }));
            }
          } catch {
            ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
          }
        },
        close(ws, code, reason) {
          // Connection closed
        },
      },
    });
  });

  afterAll(() => {
    if (server) {
      server.stop(true);
    }
  });

  describe("Connection Lifecycle", () => {
    test("WebSocket connects within SLA", async () => {
      const result = await measureAsync(async () => {
        return new Promise<WebSocket>((resolve, reject) => {
          const ws = new WebSocket(`ws://localhost:${TEST_PORT}/ws`);
          ws.onopen = () => resolve(ws);
          ws.onerror = (e) => reject(e);
          setTimeout(() => reject(new Error("Connection timeout")), 5000);
        });
      });

      expect(result.value).toBeDefined();
      expect(result.value.readyState).toBe(WebSocket.OPEN);
      expect(result.durationMs).toBeLessThan(100); // Connection should be fast

      result.value.close();
      console.log(`WebSocket connect: ${formatTime(result.durationMs)}`);
    });

    test("receives connected message immediately", async () => {
      const result = await measureAsync(async () => {
        return new Promise<{ type: string }>((resolve, reject) => {
          const ws = new WebSocket(`ws://localhost:${TEST_PORT}/ws`);
          ws.onmessage = (e) => {
            const data = JSON.parse(e.data);
            ws.close();
            resolve(data);
          };
          ws.onerror = (e) => reject(e);
          setTimeout(() => reject(new Error("Message timeout")), 5000);
        });
      });

      expect(result.value.type).toBe("connected");
      expect(result.durationMs).toBeLessThan(100);
    });

    test("connection closes cleanly", async () => {
      const ws = new WebSocket(`ws://localhost:${TEST_PORT}/ws`);
      await new Promise<void>((resolve) => {
        ws.onopen = () => resolve();
      });

      const result = await measureAsync(async () => {
        return new Promise<number>((resolve) => {
          ws.onclose = (e) => resolve(e.code);
          ws.close(1000, "Test complete");
        });
      });

      expect(result.value).toBe(1000);
      expect(result.durationMs).toBeLessThan(100);
    });
  });

  describe("Message Performance", () => {
    test("ping-pong roundtrip meets SLA", async () => {
      const ws = new WebSocket(`ws://localhost:${TEST_PORT}/ws`);
      await new Promise<void>((resolve) => {
        ws.onopen = () => {
          // Skip the connected message
          ws.onmessage = () => resolve();
        };
      });

      const stats = await collectStatsAsync(
        async () => {
          return new Promise<number>((resolve) => {
            const start = Bun.nanoseconds();
            ws.onmessage = () => {
              const end = Bun.nanoseconds();
              resolve((end - start) / 1_000_000);
            };
            ws.send(JSON.stringify({ type: "ping" }));
          });
        },
        50,
        { warmup: 5 }
      );

      ws.close();

      expect(stats.p99).toBeLessThan(50); // Roundtrip under 50ms
      console.log(formatStats(stats, "Ping-pong roundtrip"));
    });

    test("echo messages maintain low latency", async () => {
      const ws = new WebSocket(`ws://localhost:${TEST_PORT}/ws`);
      await new Promise<void>((resolve) => {
        ws.onopen = () => {
          ws.onmessage = () => resolve();
        };
      });

      const testData = { message: "Hello, WebSocket!", count: 42 };

      const stats = await collectStatsAsync(
        async () => {
          return new Promise<void>((resolve) => {
            ws.onmessage = (e) => {
              const data = JSON.parse(e.data);
              if (data.type === "echo") resolve();
            };
            ws.send(JSON.stringify({ type: "echo", data: testData }));
          });
        },
        30,
        { warmup: 3 }
      );

      ws.close();

      expect(stats.p99).toBeLessThan(50);
      console.log(formatStats(stats, "Echo roundtrip"));
    });

    test("handles rapid message bursts", async () => {
      const ws = new WebSocket(`ws://localhost:${TEST_PORT}/ws`);
      await new Promise<void>((resolve) => {
        ws.onopen = () => {
          ws.onmessage = () => resolve();
        };
      });

      const result = await measureAsync(async () => {
        const messageCount = 100;
        let received = 0;

        return new Promise<number>((resolve) => {
          ws.onmessage = () => {
            received++;
            if (received >= messageCount) {
              resolve(received);
            }
          };

          for (let i = 0; i < messageCount; i++) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        });
      });

      ws.close();

      expect(result.value).toBe(100);
      expect(result.durationMs).toBeLessThan(500); // 100 messages in under 500ms

      console.log(`100 message burst: ${formatTime(result.durationMs)}`);
    });
  });

  describe("Data Handling", () => {
    test("handles JSON payloads correctly", async () => {
      const ws = new WebSocket(`ws://localhost:${TEST_PORT}/ws`);
      await new Promise<void>((resolve) => {
        ws.onopen = () => {
          ws.onmessage = () => resolve();
        };
      });

      const complexData = {
        string: "test",
        number: 123.456,
        boolean: true,
        array: [1, 2, 3],
        nested: { key: "value" },
      };

      const result = await measureAsync(async () => {
        return new Promise<any>((resolve) => {
          ws.onmessage = (e) => {
            const data = JSON.parse(e.data);
            if (data.type === "echo") {
              resolve(data.data);
            }
          };
          ws.send(JSON.stringify({ type: "echo", data: complexData }));
        });
      });

      ws.close();

      expect(result.value).toEqual(complexData);
    });

    test("handles large payloads", async () => {
      const ws = new WebSocket(`ws://localhost:${TEST_PORT}/ws`);
      await new Promise<void>((resolve) => {
        ws.onopen = () => {
          ws.onmessage = () => resolve();
        };
      });

      // 10KB payload
      const largeData = "x".repeat(10 * 1024);

      const result = await measureAsync(async () => {
        return new Promise<number>((resolve) => {
          ws.onmessage = (e) => {
            const data = JSON.parse(e.data);
            if (data.type === "echo") {
              resolve(data.data.length);
            }
          };
          ws.send(JSON.stringify({ type: "echo", data: largeData }));
        });
      });

      ws.close();

      expect(result.value).toBe(10 * 1024);
      expect(result.durationMs).toBeLessThan(100); // Large payload should still be fast

      console.log(`10KB payload roundtrip: ${formatTime(result.durationMs)}`);
    });

    test("invalid JSON returns error", async () => {
      const ws = new WebSocket(`ws://localhost:${TEST_PORT}/ws`);
      await new Promise<void>((resolve) => {
        ws.onopen = () => {
          ws.onmessage = () => resolve();
        };
      });

      const result = await measureAsync(async () => {
        return new Promise<string>((resolve) => {
          ws.onmessage = (e) => {
            const data = JSON.parse(e.data);
            resolve(data.type);
          };
          ws.send("not valid json {{{");
        });
      });

      ws.close();

      expect(result.value).toBe("error");
    });
  });

  describe("Concurrent Connections", () => {
    test("handles 10 concurrent connections", async () => {
      const result = await measureAsync(async () => {
        const connections = await Promise.all(
          Array.from({ length: 10 }, () =>
            new Promise<WebSocket>((resolve, reject) => {
              const ws = new WebSocket(`ws://localhost:${TEST_PORT}/ws`);
              ws.onopen = () => resolve(ws);
              ws.onerror = reject;
            })
          )
        );

        // All should be open
        const allOpen = connections.every((ws) => ws.readyState === WebSocket.OPEN);

        // Close all
        connections.forEach((ws) => ws.close());

        return { count: connections.length, allOpen };
      });

      expect(result.value.count).toBe(10);
      expect(result.value.allOpen).toBe(true);
      expect(result.durationMs).toBeLessThan(500);

      console.log(`10 concurrent connections: ${formatTime(result.durationMs)}`);
    });

    test("all connections can send messages independently", async () => {
      const connections = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          new Promise<{ ws: WebSocket; id: number }>((resolve, reject) => {
            const ws = new WebSocket(`ws://localhost:${TEST_PORT}/ws`);
            ws.onopen = () => {
              // Skip connected message
              ws.onmessage = () => resolve({ ws, id: i });
            };
            ws.onerror = reject;
          })
        )
      );

      const result = await measureAsync(async () => {
        const responses = await Promise.all(
          connections.map(({ ws, id }) =>
            new Promise<number>((resolve) => {
              ws.onmessage = (e) => {
                const data = JSON.parse(e.data);
                if (data.type === "echo") {
                  resolve(data.data);
                }
              };
              ws.send(JSON.stringify({ type: "echo", data: id }));
            })
          )
        );
        return responses;
      });

      // Close all
      connections.forEach(({ ws }) => ws.close());

      expect(result.value.sort()).toEqual([0, 1, 2, 3, 4]);
      expect(result.durationMs).toBeLessThan(200);
    });
  });

  describe("Connection Stability", () => {
    test("connection remains stable over multiple messages", async () => {
      const ws = new WebSocket(`ws://localhost:${TEST_PORT}/ws`);
      await new Promise<void>((resolve) => {
        ws.onopen = () => {
          ws.onmessage = () => resolve();
        };
      });

      let messageCount = 0;
      const timer = createTimer();
      timer.start();

      for (let i = 0; i < 100; i++) {
        await new Promise<void>((resolve) => {
          ws.onmessage = () => {
            messageCount++;
            resolve();
          };
          ws.send(JSON.stringify({ type: "ping" }));
        });
      }

      timer.stop();
      ws.close();

      expect(messageCount).toBe(100);
      // Connection should be closing or already closed
      expect([WebSocket.CLOSING, WebSocket.CLOSED]).toContain(ws.readyState);

      console.log(`100 sequential messages: ${formatTime(timer.durationMs)}`);
    });
  });
});
