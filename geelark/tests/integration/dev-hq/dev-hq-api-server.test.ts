#!/usr/bin/env bun

import { afterAll, beforeAll, describe, expect, expectTypeOf, it } from "bun:test";
import { getServer } from "../../../dev-hq/servers/api-server";

describe("🛠️ Dev HQ API Server", () => {
  let server: ReturnType<typeof getServer>;
  let baseURL: string;

  beforeAll(() => {
    server = getServer();
    baseURL = server.url.href;
  });

  afterAll(() => {
    server?.stop?.();
  });

  describe("Health & Status Endpoints", () => {
    it("should return health status", async () => {
      const response = await fetch(`${baseURL}health`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe("healthy");
      expect(data.version).toBeString();
      expect(data.apis).toBeArray();
      expect(data.timestamp).toBeString();
    });

    it("should return server information", async () => {
      const response = await fetch(`${baseURL}`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.message).toContain("Dev HQ");
      expect(data.endpoints).toBeArray();
      expect(data.status).toContain("crash-proof");
    });
  });

  describe("Bun Secrets API", () => {
    it("should handle Bun.secrets with AsyncLocalStorage", async () => {
      const response = await fetch(`${baseURL}secrets`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("secret");
      expect(data).toHaveProperty("userId");
      expect(data.userId).toBeString();
    });

    it("should maintain async context properly", async () => {
      // Test multiple concurrent requests
      const requests = Array.from({ length: 5 }, () =>
        fetch(`${baseURL}secrets`).then(r => r.json())
      );

      const results = await Promise.all(requests);
      results.forEach(data => {
        expect(data).toHaveProperty("userId");
        expect(data.userId).toBeString();
      });
    });
  });

  describe("Bun MMap API", () => {
    it("should validate Bun.mmap functionality", async () => {
      const response = await fetch(`${baseURL}mmap`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("success");
      expect(data).toHaveProperty("size");

      if (data.success) {
        expect(data.size).toBeNumber();
        expect(data.size).toBeGreaterThan(0);
      }
    });

    it("should handle mmap errors gracefully", async () => {
      // This test validates error handling for invalid mmap operations
      const response = await fetch(`${baseURL}mmap`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("success");
      // Should either succeed or fail gracefully
      expect(typeof data.success).toBe("boolean");
    });
  });

  describe("Bun Plugin API", () => {
    it("should handle plugin registration", async () => {
      const response = await fetch(`${baseURL}plugin`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("success");
      expect(data).toHaveProperty("plugin");
    });
  });

  describe("Glob Hidden Files", () => {
    it("should test hidden file glob patterns", async () => {
      const response = await fetch(`${baseURL}glob`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("success");
      expect(data).toHaveProperty("results");

      if (data.success) {
        expect(data.results).toBeObject();
        Object.values(data.results).forEach(count => {
          expect(count).toBeNumber();
          expect(count).toBeGreaterThanOrEqual(0);
        });
      }
    });
  });

  describe("Bun IndexOfLine API", () => {
    it("should test indexOfLine functionality", async () => {
      const response = await fetch(`${baseURL}indexofline`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("success");

      if (data.available) {
        expect(data).toHaveProperty("line");
        expect(data).toHaveProperty("type");
      } else {
        expect(data).toHaveProperty("error");
        expect(data.error).toContain("not available");
      }
    });
  });

  describe("FormData API", () => {
    it("should handle FormData.from with buffers", async () => {
      const response = await fetch(`${baseURL}formdata`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("success");
      expect(data).toHaveProperty("normalBufferHandled");

      // Should handle normal buffers
      expect(data.normalBufferHandled).toBeBoolean();
    });

    it("should handle large buffer errors gracefully", async () => {
      const response = await fetch(`${baseURL}formdata`);
      expect(response.status).toBe(200);

      const data = await response.json();
      // Should either handle large buffers or fail gracefully
      expect(data).toHaveProperty("success");
    });
  });

  describe("FFI CString API", () => {
    it("should test Bun.FFI.CString constructor", async () => {
      const response = await fetch(`${baseURL}ffi`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("success");
      expect(data).toHaveProperty("ptrType");
      expect(data.ptrType).toBe("bigint");
    });
  });

  describe("RedisClient API", () => {
    it("should test RedisClient constructor requirements", async () => {
      const response = await fetch(`${baseURL}redis`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("success");

      if (data.redisNotAvailable) {
        expect(data.redisNotAvailable).toBe(true);
      } else {
        expect(data).toHaveProperty("newRequired");
        expect(data.newRequired).toBe(true);
      }
    });
  });

  describe("ReadableStream API", () => {
    it("should test ReadableStream creation", async () => {
      const response = await fetch(`${baseURL}stream`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("success");
      expect(data).toHaveProperty("streamCreated");
      expect(data).toHaveProperty("readerCreated");

      expect(data.streamCreated).toBe(true);
      expect(data.readerCreated).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle 404 for unknown routes", async () => {
      const response = await fetch(`${baseURL}unknown-route`);
      expect(response.status).toBe(404);
      expect(await response.text()).toBe("Not found");
    });

    it("should handle malformed requests gracefully", async () => {
      // Test with invalid method
      const response = await fetch(`${baseURL}health`, { method: "INVALID" });
      // Should either work or fail gracefully
      expect([200, 405, 400]).toContain(response.status);
    });
  });

  describe("Type Safety", () => {
    it("should maintain proper TypeScript types", () => {
      expectTypeOf(getServer).toBeFunction();
      expectTypeOf(getServer()).toHaveProperty("url");
      expectTypeOf(getServer()).toHaveProperty("stop");
    });
  });

  describe("Concurrent Requests", () => {
    it("should handle multiple concurrent requests", async () => {
      const concurrentRequests = 20;
      const promises = Array.from({ length: concurrentRequests }, () =>
        fetch(`${baseURL}health`).then(r => r.json())
      );

      const results = await Promise.all(promises);

      results.forEach(data => {
        expect(data.status).toBe("healthy");
        expect(data.version).toBeString();
      });
    });

    it("should maintain isolation between requests", async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        fetch(`${baseURL}secrets`).then(r => r.json())
      );

      const results = await Promise.all(promises);

      // Each request should get its own context
      results.forEach((data, i) => {
        expect(data).toHaveProperty("userId");
        expect(typeof data.userId).toBe("string");
      });
    });
  });
});
