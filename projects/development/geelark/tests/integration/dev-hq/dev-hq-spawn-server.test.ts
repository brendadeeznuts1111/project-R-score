#!/usr/bin/env bun

import { afterAll, beforeAll, describe, expect, expectTypeOf, it } from "bun:test";
import { EnhancedDevHQServer } from "../../../dev-hq/servers/spawn-server";

describe("🌐 Dev HQ Spawn Server", () => {
  let server: EnhancedDevHQServer;
  let baseURL: string;

  beforeAll(async () => {
    const config = {
      port: 0, // Use random port
      hostname: "localhost",
      maxConnections: 10,
      timeout: 5000,
      enableAuth: true,
      enableMetrics: true,
      enableWebSocket: true
    };

    server = new EnhancedDevHQServer(config);
    server.start();

    // Wait a moment for server to start
    await new Promise(resolve => setTimeout(resolve, 100));

    // Get the server URL using the public getter
    baseURL = server.getServerURL();
  });

  afterAll(async () => {
    server.stop();
  });

  describe("Server Lifecycle", () => {
    it("should start and stop gracefully", async () => {
      expect(server).toBeDefined();
      expect(server.getServerPort()).toBeGreaterThan(0);
      expect(baseURL).toMatch(/^http:\/\/localhost:\d+$/);
    });

    it("should handle multiple start/stop cycles", async () => {
      server.stop();
      server.start();
      expect(server.getServerPort()).toBeGreaterThan(0);
    });
  });

  describe("Basic Functionality", () => {
    it("should respond to health checks", async () => {
      const response = await fetch(`${baseURL}/health`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("status");
    });

    it("should handle authentication endpoints", async () => {
      const response = await fetch(`${baseURL}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      // Should either work or require proper auth
      expect([200, 401, 400]).toContain(response.status);
    });

    it("should handle metrics endpoint", async () => {
      const response = await fetch(`${baseURL}/metrics`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toBeObject();
    });
  });

  describe("Error Handling", () => {
    it("should handle 404 for unknown routes", async () => {
      const response = await fetch(`${baseURL}/unknown-route`);
      expect(response.status).toBe(404);
    });

    it("should handle malformed requests gracefully", async () => {
      const response = await fetch(`${baseURL}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid json"
      });

      expect([400, 401]).toContain(response.status);
    });
  });

  describe("Type Safety", () => {
    it("should maintain proper TypeScript types", () => {
      expectTypeOf(EnhancedDevHQServer).toBeFunction();
      expectTypeOf(server).toBeObject();
      expectTypeOf(server.start).toBeFunction();
      expectTypeOf(server.stop).toBeFunction();
    });
  });
});
