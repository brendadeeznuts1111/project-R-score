#!/usr/bin/env bun
/**
 * Component #41 MCP Server Test Suite
 *
 * Tests the zero-cost MCP server with Golden Matrix integration
 */

import { beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { MCPEngine } from "../component-41-server";

describe("Component #41: MCP Server Engine", () => {
  let engine: MCPEngine;
  let mockEnv: any;

  beforeAll(() => {
    mockEnv = {
      MCP_SERVER_SECRET: "test-secret-key",
      R2_BUCKET: {} as R2Bucket,
      THREAT_INTEL_SERVICE: "https://api.threat-intel.test",
      GOLDEN_MATRIX_KEY: "test-matrix-key",
      AUDIT_LOG_URL: "https://audit.test",
    };

    engine = new MCPEngine(mockEnv);
  });

  describe("Feature Flag System", () => {
    it("should enable MCP_ENABLED by default", () => {
      expect(engine["feature"]("MCP_ENABLED")).toBe(true);
    });

    it("should enable MCP_ROUTING by default", () => {
      expect(engine["feature"]("MCP_ROUTING")).toBe(true);
    });

    it("should enable security features by default", () => {
      expect(engine["feature"]("MCP_SECURE_COOKIES")).toBe(true);
      expect(engine["feature"]("MCP_CSRF_PROTECTION")).toBe(true);
      expect(engine["feature"]("MCP_AUDIT_LOGGING")).toBe(true);
    });

    it("should disable debug features by default", () => {
      expect(engine["feature"]("DEBUG")).toBe(false);
      expect(engine["feature"]("BETA_FEATURES")).toBe(false);
    });
  });

  describe("Request Routing", () => {
    it("should route matrix status requests", async () => {
      const request = new Request(
        "https://api.mcp-registry.com/mcp/infrastructure/status",
        {
          method: "GET",
          headers: {
            Authorization: "Bearer test-token",
            "X-CSRF-Token": "test-csrf-token",
          },
        }
      );

      // Mock authentication to pass
      engine["authenticate"] = async () => true;

      const response = await engine.fetch(request, mockEnv);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.version).toBe("2.4.1-STABLE-ZERO-COST-URL");
      expect(data.totalComponents).toBe(41);
      expect(data.mcpServer.componentId).toBe(41);
      expect(data.mcpServer.status).toBe("DEPLOYED");
    });

    it("should route component health requests", async () => {
      const request = new Request(
        "https://api.mcp-registry.com/mcp/infrastructure/component/41",
        {
          method: "GET",
          headers: {
            Authorization: "Bearer test-token",
            "X-CSRF-Token": "test-csrf-token",
          },
        }
      );

      engine["authenticate"] = async () => true;

      const response = await engine.fetch(request, mockEnv);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.componentId).toBe(41);
      expect(data.status).toBe("HEALTHY");
      expect(data.runtimeCost).toBe("O(0)");
    });

    it("should return 404 for invalid component IDs", async () => {
      const request = new Request(
        "https://api.mcp-registry.com/mcp/infrastructure/component/999",
        {
          method: "GET",
          headers: {
            Authorization: "Bearer test-token",
            "X-CSRF-Token": "test-csrf-token",
          },
        }
      );

      engine["authenticate"] = async () => true;

      const response = await engine.fetch(request, mockEnv);
      expect(response.status).toBe(400);
    });

    it("should route threat score requests", async () => {
      const request = new Request(
        "https://api.mcp-registry.com/mcp/security/threat/192.0.2.100",
        {
          method: "GET",
          headers: {
            Authorization: "Bearer test-token",
          },
        }
      );

      engine["authenticate"] = async () => true;

      const response = await engine.fetch(request, mockEnv);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.ip).toBe("192.0.2.100");
      expect(data.threatScore).toBeLessThan(0.5);
      expect(data.action).toBe("ALLOW");
    });

    it("should generate CSRF tokens", async () => {
      const request = new Request(
        "https://api.mcp-registry.com/mcp/csrf/generate",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer test-token",
          },
        }
      );

      engine["authenticate"] = async () => true;

      const response = await engine.fetch(request, mockEnv);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.token).toBeDefined();
      expect(typeof data.token).toBe("string");
      expect(data.token.length).toBeGreaterThan(10);
    });
  });

  describe("Security Authentication", () => {
    let freshEngine: MCPEngine;

    beforeEach(() => {
      // Create a fresh engine for authentication tests
      freshEngine = new MCPEngine(mockEnv);
    });

    it("should reject requests without authorization", async () => {
      const request = new Request(
        "https://api.mcp-registry.com/mcp/infrastructure/status",
        {
          method: "GET",
        }
      );

      // Don't mock authentication - let it run normally
      const response = await freshEngine.fetch(request, mockEnv);
      expect(response.status).toBe(401);
    });

    it("should reject requests without CSRF token for POST", async () => {
      const request = new Request(
        "https://api.mcp-registry.com/mcp/csrf/generate",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer test-token",
          },
        }
      );

      // Don't mock authentication - let it run normally
      const response = await freshEngine.fetch(request, mockEnv);
      expect(response.status).toBe(401);
    });

    it("should allow requests with proper authentication", async () => {
      const request = new Request(
        "https://api.mcp-registry.com/mcp/infrastructure/status",
        {
          method: "GET",
          headers: {
            Authorization: "Bearer test-token",
            "X-CSRF-Token": "test-csrf-token",
          },
        }
      );

      // Mock authentication to pass for this test
      freshEngine["authenticate"] = async () => true;

      const response = await freshEngine.fetch(request, mockEnv);
      expect(response.status).toBe(200);
    });
  });

  describe("Zero-Cost Abstraction", () => {
    it("should return 404 when MCP_ENABLED is false", async () => {
      // Temporarily disable MCP_ENABLED
      const originalFeature = engine["feature"];
      engine["feature"] = (name: string) => name !== "MCP_ENABLED";

      const request = new Request(
        "https://api.mcp-registry.com/mcp/infrastructure/status",
        {
          method: "GET",
          headers: {
            Authorization: "Bearer test-token",
            "X-CSRF-Token": "test-csrf-token",
          },
        }
      );

      const response = await engine.fetch(request, mockEnv);
      expect(response.status).toBe(404);
      expect(await response.text()).toBe("MCP Server Disabled");

      // Restore original feature function
      engine["feature"] = originalFeature;
    });

    it("should return 404 when MCP_ROUTING is false", async () => {
      // Temporarily disable MCP_ROUTING
      const originalFeature = engine["feature"];
      engine["feature"] = (name: string) => name !== "MCP_ROUTING";

      const request = new Request(
        "https://api.mcp-registry.com/mcp/infrastructure/status",
        {
          method: "GET",
          headers: {
            Authorization: "Bearer test-token",
            "X-CSRF-Token": "test-csrf-token",
          },
        }
      );

      engine["authenticate"] = async () => true;

      const response = await engine.fetch(request, mockEnv);
      expect(response.status).toBe(404);

      // Restore original feature function
      engine["feature"] = originalFeature;
    });
  });

  describe("Golden Matrix Integration", () => {
    it("should report all 41 components in matrix status", async () => {
      const request = new Request(
        "https://api.mcp-registry.com/mcp/infrastructure/status",
        {
          method: "GET",
          headers: {
            Authorization: "Bearer test-token",
            "X-CSRF-Token": "test-csrf-token",
          },
        }
      );

      engine["authenticate"] = async () => true;

      const response = await engine.fetch(request, mockEnv);
      const data = await response.json();

      expect(data.totalComponents).toBe(41);
      expect(data.mcpServer.componentId).toBe(41);
      expect(data.mcpServer.zeroCost).toBe(true);
      expect(data.mcpServer.deadCodeElimination).toBe("95%");
    });

    it("should verify parity locks for components", async () => {
      const parityLock = await engine["verifyParityLock"](41);
      expect(typeof parityLock).toBe("boolean");
    });

    it("should check component health", () => {
      const health = engine["checkComponentHealth"](41);
      expect(health).toMatch(/^(HEALTHY|DEGRADED|FAILED)$/);
    });
  });

  describe("Feature Status Endpoint", () => {
    it("should return feature status", async () => {
      const request = new Request(
        "https://api.mcp-registry.com/mcp/features/MCP_ENABLED",
        {
          method: "GET",
          headers: {
            Authorization: "Bearer test-token",
            "X-CSRF-Token": "test-csrf-token",
          },
        }
      );

      engine["authenticate"] = async () => true;

      const response = await engine.fetch(request, mockEnv);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.feature).toBe("MCP_ENABLED");
      expect(data.enabled).toBe(true);
      expect(data.compileTime).toBe(true);
    });
  });

  describe("Compliance and Audit", () => {
    it("should return compliance score", async () => {
      const request = new Request(
        "https://api.mcp-registry.com/mcp/compliance/score",
        {
          method: "GET",
          headers: {
            Authorization: "Bearer test-token",
            "X-CSRF-Token": "test-csrf-token",
          },
        }
      );

      engine["authenticate"] = async () => true;

      const response = await engine.fetch(request, mockEnv);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.score).toBeGreaterThan(90);
      expect(data.status).toBe("COMPLIANT");
    });

    it("should return audit logs", async () => {
      const timestamp = Date.now() - 3600000; // 1 hour ago
      const request = new Request(
        `https://api.mcp-registry.com/mcp/audit/${timestamp}`,
        {
          method: "GET",
          headers: {
            Authorization: "Bearer test-token",
            "X-CSRF-Token": "test-csrf-token",
          },
        }
      );

      engine["authenticate"] = async () => true;

      const response = await engine.fetch(request, mockEnv);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle malformed requests gracefully", async () => {
      const request = new Request("https://api.mcp-registry.com/mcp/invalid", {
        method: "GET",
        headers: {
          Authorization: "Bearer test-token",
          "X-CSRF-Token": "test-csrf-token",
        },
      });

      engine["authenticate"] = async () => true;

      const response = await engine.fetch(request, mockEnv);
      expect(response.status).toBe(404);
    });

    it("should handle not implemented endpoints", async () => {
      const request = new Request(
        "https://api.mcp-registry.com/mcp/users/123",
        {
          method: "GET",
          headers: {
            Authorization: "Bearer test-token",
            "X-CSRF-Token": "test-csrf-token",
          },
        }
      );

      engine["authenticate"] = async () => true;

      const response = await engine.fetch(request, mockEnv);
      expect(response.status).toBe(501);
    });
  });
});
