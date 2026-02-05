#!/usr/bin/env bun
// Smoke tests for Config Server Dashboard
// Tests critical functionality to ensure dashboard is working properly

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { ConfigServer } from "../src/admin/config-server";

describe("Config Server Smoke Tests", () => {
	let server: ConfigServer | null = null;
	const BASE_URL = "http://localhost:3227";
	let serverStarted = false;

	beforeAll(async () => {
		// Check if server is already running
		try {
			const response = await fetch(`${BASE_URL}/health`);
			if (response.ok) {
				console.log(
					"Server already running on port 3227, using existing instance",
				);
				serverStarted = false; // Use existing server
				return;
			}
		} catch {
			// Server not running, start our own
		}

		// Start our own test server
		try {
			server = new ConfigServer();
			await server.start();
			serverStarted = true;
			// Wait for server to be ready
			await new Promise((resolve) => setTimeout(resolve, 1000));
		} catch (error: unknown) {
			if (
				error instanceof Error &&
				"code" in error &&
				error.code === "EADDRINUSE"
			) {
				console.log("Port 3227 in use, using existing server instance");
				serverStarted = false;
			} else {
				throw error;
			}
		}
	});

	afterAll(async () => {
		// Only stop if we started our own server
		if (server && serverStarted) {
			await server.stop();
		}
	});

	describe("Health & Status Endpoints", () => {
		it("should respond to health check", async () => {
			const response = await fetch(`${BASE_URL}/health`);
			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.status).toBe("healthy");
			expect(data.timestamp).toBeDefined();
		});

		it("should return status API with valid structure", async () => {
			const response = await fetch(`${BASE_URL}/api/status`);
			expect(response.status).toBe(200);
			const data = await response.json();

			expect(data).toHaveProperty("status");
			expect(data).toHaveProperty("statusCode", 200);
			expect(data).toHaveProperty("score");
			expect(data).toHaveProperty("uptime");
			expect(data).toHaveProperty("memory");
			expect(data).toHaveProperty("cpu");
			expect(data).toHaveProperty("server");
			expect(data.server).toHaveProperty("port", 3227);
		});

		it("should return metrics endpoint", async () => {
			// Try both /metrics and /api/metrics
			let response = await fetch(`${BASE_URL}/api/metrics`);
			if (response.status === 404) {
				response = await fetch(`${BASE_URL}/metrics`);
			}
			expect(response.status).toBe(200);
			const data = await response.json();

			expect(data).toHaveProperty("server");
			expect(data).toHaveProperty("process");
			expect(data).toHaveProperty("application");
		});
	});

	describe("Configuration Endpoints", () => {
		it("should return configuration API", async () => {
			const response = await fetch(`${BASE_URL}/api/config`);
			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toBeDefined();
			expect(typeof data).toBe("object");
		});

		it("should return freeze status", async () => {
			const response = await fetch(`${BASE_URL}/api/config/freeze-status`);
			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty("frozen");
			expect(typeof data.frozen).toBe("boolean");
		});
	});

	describe("Web Pages", () => {
		it("should serve main landing page", async () => {
			const response = await fetch(`${BASE_URL}/`);
			expect(response.status).toBe(200);
			expect(response.headers.get("content-type")).toContain("text/html");
			const html = await response.text();
			expect(html).toContain("Citadel Configuration");
		});

		it("should serve config page", async () => {
			const response = await fetch(`${BASE_URL}/config`);
			expect(response.status).toBe(200);
			expect(response.headers.get("content-type")).toContain("text/html");
			const html = await response.text();
			expect(html.length).toBeGreaterThan(0);
		});

		it("should serve demo page", async () => {
			const response = await fetch(`${BASE_URL}/demo`);
			expect(response.status).toBe(200);
			expect(response.headers.get("content-type")).toContain("text/html");
			const html = await response.text();
			expect(html).toContain("Citadel");
		});
	});

	describe("Freeze/Unfreeze Functionality", () => {
		it("should freeze configuration with valid reason", async () => {
			const response = await fetch(`${BASE_URL}/api/config/freeze`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ reason: "Smoke test freeze" }),
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.success).toBe(true);
		});

		it("should reject freeze with invalid content type", async () => {
			const response = await fetch(`${BASE_URL}/api/config/freeze`, {
				method: "POST",
				headers: { "Content-Type": "text/plain" },
				body: "invalid",
			});

			expect(response.status).toBe(400);
		});

		it("should reject freeze with invalid reason type", async () => {
			const response = await fetch(`${BASE_URL}/api/config/freeze`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ reason: 123 }),
			});

			expect(response.status).toBe(400);
		});

		it("should reject freeze with reason too long", async () => {
			const longReason = "a".repeat(501);
			const response = await fetch(`${BASE_URL}/api/config/freeze`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ reason: longReason }),
			});

			expect(response.status).toBe(400);
		});

		it("should unfreeze configuration", async () => {
			const response = await fetch(`${BASE_URL}/api/config/unfreeze`, {
				method: "POST",
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.success).toBe(true);
		});
	});

	describe("Reload Functionality", () => {
		it("should reload configuration when not frozen", async () => {
			// Ensure not frozen
			await fetch(`${BASE_URL}/api/config/unfreeze`, { method: "POST" });
			await new Promise((resolve) => setTimeout(resolve, 100));

			const response = await fetch(`${BASE_URL}/api/reload`, {
				method: "POST",
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.success).toBe(true);
		});

		it("should reject reload when frozen", async () => {
			// Freeze first
			await fetch(`${BASE_URL}/api/config/freeze`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ reason: "Test freeze" }),
			});
			await new Promise((resolve) => setTimeout(resolve, 100));

			const response = await fetch(`${BASE_URL}/api/reload`, {
				method: "POST",
			});

			expect(response.status).toBe(423); // Locked
			const data = await response.json();
			expect(data.frozen).toBe(true);

			// Unfreeze for cleanup
			await fetch(`${BASE_URL}/api/config/unfreeze`, { method: "POST" });
		});
	});

	describe("Error Handling", () => {
		it("should return 404 for unknown routes", async () => {
			const response = await fetch(`${BASE_URL}/unknown-route`);
			expect(response.status).toBe(404);
		});

		it("should handle CORS properly", async () => {
			const response = await fetch(`${BASE_URL}/api/status`, {
				headers: { Origin: "http://localhost:3000" },
			});
			expect(response.status).toBe(200);
		});
	});

	describe("Server Statistics", () => {
		it("should track request count", async () => {
			if (!server) {
				// Skip if server is null (external server case)
				return;
			}
			const initialStats = server.getServerStats();
			expect(initialStats.requestCount).toBeGreaterThanOrEqual(0);

			// Make a request
			await fetch(`${BASE_URL}/health`);

			const updatedStats = server.getServerStats();
			expect(updatedStats.requestCount).toBeGreaterThanOrEqual(
				initialStats.requestCount,
			);
		});

		it("should track server uptime", async () => {
			if (!server) {
				// Skip if server is null (external server case)
				return;
			}
			const stats = server.getServerStats();
			expect(stats.uptime).toBeGreaterThanOrEqual(0);
			expect(stats.startTime).toBeInstanceOf(Date);
		});
	});

	describe("Performance", () => {
		it("should respond to health check within 100ms", async () => {
			const start = Date.now();
			await fetch(`${BASE_URL}/health`);
			const duration = Date.now() - start;
			expect(duration).toBeLessThan(100);
		});

		it("should handle concurrent requests", async () => {
			const requests = Array(10)
				.fill(null)
				.map(() => fetch(`${BASE_URL}/health`));
			const responses = await Promise.all(requests);
			expect(responses.every((r) => r.status === 200)).toBe(true);
		});
	});

	describe("Configuration Management", () => {
		it("should export configuration in JSON format", async () => {
			const response = await fetch(`${BASE_URL}/api/config/export`);
			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty("config");
			expect(data).toHaveProperty("exportedAt");
			expect(data).toHaveProperty("version");
		});

		it("should export configuration in YAML format", async () => {
			const response = await fetch(`${BASE_URL}/api/config/export/yaml`);
			expect(response.status).toBe(200);
			const yaml = await response.text();
			expect(yaml).toContain("config:");
			expect(yaml).toContain("exportedAt:");
		});

		it("should export configuration in TOML format", async () => {
			const response = await fetch(`${BASE_URL}/api/config/export/toml`);
			expect(response.status).toBe(200);
			const toml = await response.text();
			expect(toml).toContain("[config]");
			expect(toml).toContain("exportedAt");
		});

		it("should export configuration in CSV format", async () => {
			const response = await fetch(`${BASE_URL}/api/config/export/csv`);
			expect(response.status).toBe(200);
			const csv = await response.text();
			expect(csv).toContain("Key,Value,Type");
		});

		it("should validate configuration", async () => {
			const response = await fetch(`${BASE_URL}/api/config/validate`);
			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty("valid");
			expect(data).toHaveProperty("errors");
			expect(Array.isArray(data.errors)).toBe(true);
		});

		it("should backup configuration", async () => {
			const response = await fetch(`${BASE_URL}/api/config/backup`);
			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty("success");
			expect(data).toHaveProperty("backupId");
			expect(data).toHaveProperty("timestamp");
		});

		it("should handle configuration templates", async () => {
			const response = await fetch(`${BASE_URL}/api/config/templates`);
			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty("templates");
			expect(Array.isArray(data.templates)).toBe(true);
		});
	});

	describe("Search and Logs", () => {
		it("should search configuration", async () => {
			const response = await fetch(`${BASE_URL}/api/search?q=config`);
			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty("results");
			expect(Array.isArray(data.results)).toBe(true);
			expect(data).toHaveProperty("total");
		});

		it("should return logs", async () => {
			const response = await fetch(`${BASE_URL}/api/logs`);
			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty("logs");
			expect(Array.isArray(data.logs)).toBe(true);
			expect(data).toHaveProperty("total");
		});

		it("should filter logs by level", async () => {
			const response = await fetch(`${BASE_URL}/api/logs?level=error`);
			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty("logs");
			expect(data).toHaveProperty("level");
			expect(data.level).toBe("error");
		});
	});

	describe("Bulk Operations", () => {
		it("should handle bulk configuration update", async () => {
			const bulkData = {
				operations: [
					{ path: "test.key1", value: "value1", type: "string" },
					{ path: "test.key2", value: 42, type: "number" },
				],
			};
			const response = await fetch(`${BASE_URL}/api/config/bulk`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(bulkData),
			});
			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty("success");
			expect(data).toHaveProperty("results");
			expect(Array.isArray(data.results)).toBe(true);
		});

		it("should reject bulk operations with invalid data", async () => {
			const response = await fetch(`${BASE_URL}/api/config/bulk`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ invalid: "data" }),
			});
			expect(response.status).toBe(400);
		});
	});

	describe("Configuration Diff", () => {
		it("should compare configurations", async () => {
			const diffData = {
				base: { key1: "value1", key2: "value2" },
				compare: { key1: "updated", key3: "value3" },
			};
			const response = await fetch(`${BASE_URL}/api/config/diff`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(diffData),
			});
			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty("diff");
			expect(data).toHaveProperty("added");
			expect(data).toHaveProperty("removed");
			expect(data).toHaveProperty("modified");
		});
	});

	describe("ShortcutRegistry API", () => {
		it("should list all shortcuts", async () => {
			const response = await fetch(`${BASE_URL}/api/shortcuts`);
			expect(response.status).toBe(200);
			const data = await response.json();
			expect(Array.isArray(data)).toBe(true);
		});

		it("should list all profiles", async () => {
			const response = await fetch(`${BASE_URL}/api/profiles`);
			expect(response.status).toBe(200);
			const data = await response.json();
			expect(Array.isArray(data)).toBe(true);
		});

		it("should get active profile", async () => {
			const response = await fetch(`${BASE_URL}/api/profiles/active`);
			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty("id");
			expect(data).toHaveProperty("name");
		});

		it("should detect conflicts", async () => {
			const response = await fetch(`${BASE_URL}/api/conflicts`);
			expect(response.status).toBe(200);
			const data = await response.json();
			expect(Array.isArray(data)).toBe(true);
		});

		it("should get usage statistics", async () => {
			const response = await fetch(`${BASE_URL}/api/stats/usage`);
			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty("totalUsage");
			expect(data).toHaveProperty("dailyStats");
		});

		it("should register new shortcut", async () => {
			const shortcutData = {
				id: "test-shortcut",
				name: "Test Shortcut",
				command: "echo test",
				keybinding: "ctrl+shift+t",
			};
			const response = await fetch(`${BASE_URL}/api/shortcuts`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(shortcutData),
			});
			expect(response.status).toBe(201);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.shortcut.id).toBe("test-shortcut");

			// Cleanup
			await fetch(`${BASE_URL}/api/shortcuts/test-shortcut`, {
				method: "DELETE",
			});
		});
	});

	describe("WindSurf Actions API", () => {
		it("should refresh dashboard", async () => {
			const response = await fetch(`${BASE_URL}/api/actions/dashboard/refresh`, {
				method: "POST",
			});
			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data).toHaveProperty("data");
			expect(data).toHaveProperty("timestamp");
		});

		it("should export dashboard data", async () => {
			const response = await fetch(`${BASE_URL}/api/actions/dashboard/export`, {
				method: "POST",
			});
			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty("version");
			expect(data).toHaveProperty("exportedAt");
			expect(data).toHaveProperty("dashboard");
		});

		it("should analyze risk", async () => {
			const response = await fetch(`${BASE_URL}/api/actions/risk/analyze`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userId: "test-user" }),
			});
			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data).toHaveProperty("analysis");
			expect(data.analysis).toHaveProperty("overallRisk");
		});

		it("should get admin config", async () => {
			const response = await fetch(`${BASE_URL}/api/actions/admin/config`);
			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data).toHaveProperty("config");
			expect(data).toHaveProperty("freezeStatus");
			expect(data).toHaveProperty("version");
		});

		it("should get dashboard data", async () => {
			const response = await fetch(`${BASE_URL}/api/dashboard/data`);
			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data).toHaveProperty("data");
		});

		it("should get dashboard metrics", async () => {
			const response = await fetch(`${BASE_URL}/api/dashboard/metrics`);
			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data).toHaveProperty("metrics");
		});

		it("should get dashboard status", async () => {
			const response = await fetch(`${BASE_URL}/api/dashboard/status`);
			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.status).toHaveProperty("status");
			expect(data.status).toHaveProperty("uptime");
		});
	});

	describe("Nexus API", () => {
		it("should get citadel dashboard", async () => {
			const response = await fetch(`${BASE_URL}/api/nexus/dashboard`);
			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data).toHaveProperty("dashboard");
		});

		it("should refresh citadel dashboard", async () => {
			const response = await fetch(`${BASE_URL}/api/nexus/dashboard/refresh`, {
				method: "POST",
			});
			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.success).toBe(true);
		});

		it("should get advanced metrics", async () => {
			const response = await fetch(`${BASE_URL}/api/nexus/metrics/advanced`);
			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data).toHaveProperty("metrics");
		});

		it("should get package registry metrics", async () => {
			const response = await fetch(`${BASE_URL}/api/nexus/metrics/packages`);
			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data).toHaveProperty("metrics");
		});

		it("should get TypeScript metrics", async () => {
			const response = await fetch(`${BASE_URL}/api/nexus/metrics/typescript`);
			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data).toHaveProperty("metrics");
		});

		it("should get security metrics", async () => {
			const response = await fetch(`${BASE_URL}/api/nexus/metrics/security`);
			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data).toHaveProperty("metrics");
		});

		it("should get comprehensive report", async () => {
			const response = await fetch(`${BASE_URL}/api/nexus/metrics/comprehensive`);
			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data).toHaveProperty("report");
		});
	});

	describe("WebSocket Support", () => {
		it("should handle WebSocket upgrade", async () => {
			// Note: This test verifies WebSocket endpoint availability
			// Actual WebSocket testing requires more complex setup
			const response = await fetch(`${BASE_URL}/ws`, {
				headers: {
					"Upgrade": "websocket",
					"Connection": "Upgrade",
					"Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
					"Sec-WebSocket-Version": "13",
				},
			});
			// Should either upgrade (101) or reject with proper error
			expect([101, 400, 500]).toContain(response.status);
		});
	});

	describe("Security and Validation", () => {
		it("should reject invalid JSON on POST endpoints", async () => {
			const response = await fetch(`${BASE_URL}/api/config/freeze`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: "invalid json{",
			});
			expect(response.status).toBe(400);
		});

		it("should handle large payloads gracefully", async () => {
			const largePayload = {
				reason: "a".repeat(10000), // Very large reason
			};
			const response = await fetch(`${BASE_URL}/api/config/freeze`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(largePayload),
			});
			// Should either accept or reject gracefully
			expect([200, 400, 413]).toContain(response.status);
		});

		it("should sanitize HTML in responses", async () => {
			// Test XSS prevention by checking HTML content in pages
			const response = await fetch(`${BASE_URL}/`);
			expect(response.status).toBe(200);
			const html = await response.text();
			// Should not contain unescaped HTML entities
			expect(html).not.toContain("<script>");
			expect(html).not.toContain("javascript:");
		});
	});

	describe("Load Testing", () => {
		it("should handle 50 concurrent health checks", async () => {
			const requests = Array(50)
				.fill(null)
				.map(() => fetch(`${BASE_URL}/health`));
			const responses = await Promise.all(requests);
			expect(responses.every((r) => r.status === 200)).toBe(true);
		});

		it("should maintain performance under load", async () => {
			const startTime = Date.now();
			const requests = Array(20)
				.fill(null)
				.map(() => fetch(`${BASE_URL}/api/status`));
			await Promise.all(requests);
			const duration = Date.now() - startTime;
			// Should complete 20 requests in under 2 seconds
			expect(duration).toBeLessThan(2000);
		});
	});
});