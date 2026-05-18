import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import {
  fetchJson,
  fetchText,
  fetchWithTimeout,
  fetchWithRetry,
  jsonResponse,
  errorResponse,
  textResponse,
  cachedJsonResponse,
  streamResponse,
  serve,
  fetchProxy,
  fetchUnixSocket,
  preconnect,
} from "../src/core/http.ts";

let server: ReturnType<typeof Bun.serve>;
let baseUrl: string;

describe("http", () => {
  beforeAll(() => {
    server = Bun.serve({
      port: 0,
      hostname: "127.0.0.1",
      fetch(req) {
        const url = new URL(req.url);
        if (url.pathname === "/json") return Response.json({ ok: true });
        if (url.pathname === "/text") return new Response("hello");
        if (url.pathname === "/500") return new Response("err", { status: 500 });
        if (url.pathname === "/400") return new Response("bad", { status: 400 });
        if (url.pathname === "/slow") {
          return new Promise((resolve) =>
            setTimeout(() => resolve(new Response("slow")), 3000)
          );
        }
        return new Response("not found", { status: 404 });
      },
    });
    baseUrl = `http://127.0.0.1:${server.port}`;
  });

  afterAll(() => {
    server.stop(true);
  });

  describe("BN-055: Safe Fetch Wrappers", () => {
    it("should fetch JSON", async () => {
      const data = await fetchJson<{ ok: boolean }>(`${baseUrl}/json`);
      expect(data).toEqual({ ok: true });
    });

    it("should return null for non-ok response", async () => {
      expect(await fetchJson(`${baseUrl}/404`)).toBeNull();
    });

    it("should return null for bad URL", async () => {
      expect(await fetchJson("http://127.0.0.1:1/nope")).toBeNull();
    });

    it("should fetch text", async () => {
      expect(await fetchText(`${baseUrl}/text`)).toBe("hello");
    });

    it("should return null for non-ok text response", async () => {
      expect(await fetchText(`${baseUrl}/404`)).toBeNull();
    });
  });

  describe("BN-056: Timeout Wrapper", () => {
    it("should fetch within timeout", async () => {
      const res = await fetchWithTimeout(`${baseUrl}/text`, 5000);
      expect(res).not.toBeNull();
      expect(res!.ok).toBe(true);
    });

    it("should return null on timeout", async () => {
      const res = await fetchWithTimeout(`${baseUrl}/slow`, 100);
      expect(res).toBeNull();
    });
  });

  describe("BN-057: Retry with Exponential Backoff", () => {
    it("should succeed on first try", async () => {
      const res = await fetchWithRetry(`${baseUrl}/json`, undefined, { retries: 2, delayMs: 50 });
      expect(res).not.toBeNull();
      expect(res!.ok).toBe(true);
    });

    it("should not retry 4xx errors", async () => {
      let attempts = 0;
      const res = await fetchWithRetry(`${baseUrl}/400`, undefined, {
        retries: 3,
        delayMs: 10,
        onRetry: () => { attempts++; },
      });
      expect(res).not.toBeNull();
      expect(res!.status).toBe(400);
      expect(attempts).toBe(0);
    });

    it("should call onRetry for 5xx errors", async () => {
      let attempts = 0;
      await fetchWithRetry(`${baseUrl}/500`, undefined, {
        retries: 2,
        delayMs: 10,
        onRetry: () => { attempts++; },
      });
      expect(attempts).toBe(2);
    });
  });

  describe("BN-058: Response Builders", () => {
    it("should build JSON response", async () => {
      const res = jsonResponse({ data: 1 });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: 1 });
    });

    it("should build JSON with custom status", async () => {
      const res = jsonResponse({ created: true }, 201);
      expect(res.status).toBe(201);
    });

    it("should build error response", async () => {
      const res = errorResponse("not found", 404);
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "not found" });
    });

    it("should build text response", async () => {
      const res = textResponse("ok");
      expect(res.status).toBe(200);
      expect(await res.text()).toBe("ok");
      expect(res.headers.get("content-type")).toContain("text/plain");
    });

    it("should build cached JSON response factory", async () => {
      const factory = cachedJsonResponse({ items: [1, 2] });
      expect(typeof factory).toBe("function");
      const r1 = factory();
      const r2 = factory();
      expect(r1.status).toBe(200);
      expect(await r1.json()).toEqual({ items: [1, 2] });
      expect(await r2.text()).toBe(await factory().text());
    });

    it("should build stream response", () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("data"));
          controller.close();
        },
      });
      const res = streamResponse(stream);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("application/octet-stream");
    });
  });

  describe("BN-112: Fetch Extensions", () => {
    it("should return null for unreachable proxy", async () => {
      const res = await fetchProxy(`${baseUrl}/json`, "http://127.0.0.1:1");
      expect(res).toBeNull();
    });

    it("should return null for unreachable unix socket", async () => {
      const res = await fetchUnixSocket("http://localhost/test", "/tmp/nonexistent-socket.sock");
      expect(res).toBeNull();
    });

    it("should call preconnect without throwing", () => {
      expect(() => preconnect(baseUrl)).not.toThrow();
    });
  });

  describe("BN-059: Serve Helper", () => {
    it("should start server on random port", () => {
      const s = serve({
        fetch: () => Response.json({ test: true }),
      });
      expect(s.port).toBeGreaterThan(0);
      s.stop(true);
    });

    it("should respond to requests", async () => {
      const s = serve({
        fetch: () => Response.json({ served: true }),
      });
      const res = await fetch(`http://127.0.0.1:${s.port}/`);
      expect(await res.json()).toEqual({ served: true });
      s.stop(true);
    });

    it("should accept development boolean", () => {
      const s = serve({
        fetch: () => new Response("ok"),
        development: true,
      });
      expect(s.port).toBeGreaterThan(0);
      s.stop(true);
    });

    it("should accept development object with console", () => {
      const s = serve({
        fetch: () => new Response("ok"),
        development: { console: true },
      });
      expect(s.port).toBeGreaterThan(0);
      s.stop(true);
    });
  });
});
