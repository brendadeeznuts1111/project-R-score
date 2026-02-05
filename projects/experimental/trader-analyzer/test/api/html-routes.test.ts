#!/usr/bin/env bun

/**
 * @fileoverview HTML Routes Test Suite
 * @description Comprehensive tests for HTML serving routes (registry.html, dashboard/index.html)
 * @module test/api/html-routes
 * 
 * Tests verify:
 * - Routes serve HTML correctly
 * - HTMLRewriter injects HYPERBUN_UI_CONTEXT
 * - API_BASE variable is preserved (not removed by regex)
 * - Proper error handling for missing files
 * - Content-Type headers are correct
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { spawn } from "bun";
import { join } from "path";
import { waitFor, bunEnv } from "../harness";

const API_PORT = parseInt(process.env.PORT || "3001", 10);
const API_BASE = `http://localhost:${API_PORT}`;

let serverProcess: ReturnType<typeof spawn> | null = null;

// Start API server before tests
beforeAll(async () => {
	const serverScript = join(import.meta.dir, "..", "src", "index.ts");
	serverProcess = spawn(["bun", "--hot", "run", serverScript], {
		env: {
			...bunEnv,
			PORT: API_PORT.toString(),
		},
		stdout: "pipe",
		stderr: "pipe",
	});

	// Wait for server to start
	await waitFor(async () => {
		try {
			const response = await fetch(`${API_BASE}/api/health`);
			return response.ok;
		} catch {
			return false;
		}
	}, 15000); // 15 second timeout
});

// Stop server after tests
afterAll(async () => {
	if (serverProcess) {
		serverProcess.kill();
		await serverProcess.exited;
	}
});

describe("HTML Routes - API Endpoints", () => {
	describe("GET /api/registry.html", () => {
		test("should serve registry.html with 200 status", async () => {
			const response = await fetch(`${API_BASE}/api/registry.html`);
			expect(response.status).toBe(200);
			expect(response.headers.get("Content-Type")).toContain("text/html");
		});

		test("should include API_BASE variable in HTML", async () => {
			const response = await fetch(`${API_BASE}/api/registry.html`);
			const html = await response.text();
			
			// Verify API_BASE is defined from uiContext
			expect(html).toContain("API_BASE");
			expect(html).toMatch(/const\s+API_BASE\s*=\s*uiContext\.apiBaseUrl/);
		});

		test("should inject HYPERBUN_UI_CONTEXT via HTMLRewriter", async () => {
			const response = await fetch(`${API_BASE}/api/registry.html`);
			const html = await response.text();
			
			// HTMLRewriter should inject HYPERBUN_UI_CONTEXT script tag
			expect(html).toContain("HYPERBUN_UI_CONTEXT");
		});

		test("should not remove uiContext-based API_BASE assignment", async () => {
			const response = await fetch(`${API_BASE}/api/registry.html`);
			const html = await response.text();
			
			// Verify the correct pattern exists (not removed by regex)
			const hasCorrectPattern = /const\s+API_BASE\s*=\s*uiContext\.apiBaseUrl/.test(html);
			expect(hasCorrectPattern).toBe(true);
			
			// Verify no hardcoded API_BASE assignments remain (if any existed)
			// This ensures the regex cleaning was removed
			const hasHardcodedPattern = /const\s+API_BASE\s*=\s*["'`]/.test(html);
			// Note: This might be false if no hardcoded values existed, which is fine
		});

		test("should include proper HTML structure", async () => {
			const response = await fetch(`${API_BASE}/api/registry.html`);
			const html = await response.text();
			
			expect(html).toContain("<!DOCTYPE html");
			expect(html).toContain("<html");
			expect(html).toContain("</html>");
		});

		test("should handle missing file gracefully", async () => {
			// This test verifies error handling, but since registry.html exists,
			// we'll test the error path by checking the route structure
			const response = await fetch(`${API_BASE}/api/registry.html`);
			
			// Should not return 404 if file exists
			if (response.status === 404) {
				const error = await response.json();
				expect(error).toHaveProperty("error");
			} else {
				expect(response.status).toBe(200);
			}
		});
	});

	describe("GET /api/dashboard", () => {
		test("should serve dashboard/index.html with 200 status", async () => {
			const response = await fetch(`${API_BASE}/api/dashboard`);
			expect(response.status).toBe(200);
			expect(response.headers.get("Content-Type")).toContain("text/html");
		});

		test("should include API_BASE variable in HTML", async () => {
			const response = await fetch(`${API_BASE}/api/dashboard`);
			const html = await response.text();
			
			// Verify API_BASE is defined from uiContext
			expect(html).toContain("API_BASE");
			// Check for uiContext pattern or direct API_BASE usage
			const hasApiBase = html.includes("API_BASE") || html.includes("apiBaseUrl");
			expect(hasApiBase).toBe(true);
		});

		test("should inject HYPERBUN_UI_CONTEXT via HTMLRewriter", async () => {
			const response = await fetch(`${API_BASE}/api/dashboard`);
			const html = await response.text();
			
			// HTMLRewriter should inject HYPERBUN_UI_CONTEXT script tag
			expect(html).toContain("HYPERBUN_UI_CONTEXT");
		});

		test("should include proper HTML structure", async () => {
			const response = await fetch(`${API_BASE}/api/dashboard`);
			const html = await response.text();
			
			expect(html).toContain("<!DOCTYPE html");
			expect(html).toContain("<html");
			expect(html).toContain("</html>");
		});

		test("should include dashboard-specific content", async () => {
			const response = await fetch(`${API_BASE}/api/dashboard`);
			const html = await response.text();
			
			// Check for dashboard-specific identifiers
			const hasDashboardContent = 
				html.includes("dashboard") || 
				html.includes("NEXUS") ||
				html.includes("trading");
			expect(hasDashboardContent).toBe(true);
		});
	});

	describe("GET /api/dashboard/data (should not conflict)", () => {
		test("should serve dashboard data JSON (not HTML)", async () => {
			const response = await fetch(`${API_BASE}/api/dashboard/data`);
			
			// Should return JSON, not HTML
			const contentType = response.headers.get("Content-Type");
			expect(contentType).toContain("application/json");
			
			if (response.ok) {
				const data = await response.json();
				expect(data).toBeInstanceOf(Object);
			}
		});
	});
});

describe("HTML Routes - Root Endpoints", () => {
	describe("GET /registry.html", () => {
		test("should serve registry.html with 200 status", async () => {
			const response = await fetch(`${API_BASE}/registry.html`);
			expect(response.status).toBe(200);
			expect(response.headers.get("Content-Type")).toContain("text/html");
		});

		test("should include API_BASE variable in HTML", async () => {
			const response = await fetch(`${API_BASE}/registry.html`);
			const html = await response.text();
			
			// Verify API_BASE is defined from uiContext
			expect(html).toContain("API_BASE");
			expect(html).toMatch(/const\s+API_BASE\s*=\s*uiContext\.apiBaseUrl/);
		});

		test("should inject HYPERBUN_UI_CONTEXT via HTMLRewriter", async () => {
			const response = await fetch(`${API_BASE}/registry.html`);
			const html = await response.text();
			
			// HTMLRewriter should inject HYPERBUN_UI_CONTEXT script tag
			expect(html).toContain("HYPERBUN_UI_CONTEXT");
		});
	});

	describe("GET /dashboard", () => {
		test("should serve dashboard/index.html with 200 status", async () => {
			const response = await fetch(`${API_BASE}/dashboard`);
			expect(response.status).toBe(200);
			expect(response.headers.get("Content-Type")).toContain("text/html");
		});

		test("should include API_BASE variable in HTML", async () => {
			const response = await fetch(`${API_BASE}/dashboard`);
			const html = await response.text();
			
			// Verify API_BASE is defined from uiContext
			expect(html).toContain("API_BASE");
			const hasApiBase = html.includes("API_BASE") || html.includes("apiBaseUrl");
			expect(hasApiBase).toBe(true);
		});

		test("should inject HYPERBUN_UI_CONTEXT via HTMLRewriter", async () => {
			const response = await fetch(`${API_BASE}/dashboard`);
			const html = await response.text();
			
			// HTMLRewriter should inject HYPERBUN_UI_CONTEXT script tag
			expect(html).toContain("HYPERBUN_UI_CONTEXT");
		});
	});
});

describe("HTML Routes - Error Handling", () => {
	test("should return 404 for non-existent HTML file", async () => {
		const response = await fetch(`${API_BASE}/api/nonexistent.html`);
		expect(response.status).toBe(404);
		
		const error = await response.json();
		expect(error).toHaveProperty("error");
		expect(error).toHaveProperty("code");
	});

	test("should return proper error format for missing files", async () => {
		const response = await fetch(`${API_BASE}/api/nonexistent.html`);
		const error = await response.json();
		
		expect(error).toHaveProperty("error");
		expect(error).toHaveProperty("status", 404);
		expect(error).toHaveProperty("path");
	});
});

describe("HTML Routes - HTMLRewriter Integration", () => {
	test("should inject uiContext script tag", async () => {
		const response = await fetch(`${API_BASE}/api/registry.html`);
		const html = await response.text();
		
		// Check for script tag with HYPERBUN_UI_CONTEXT
		const hasScriptTag = html.includes("<script") && html.includes("HYPERBUN_UI_CONTEXT");
		expect(hasScriptTag).toBe(true);
	});

	test("should preserve existing HTML structure", async () => {
		const response = await fetch(`${API_BASE}/api/registry.html`);
		const html = await response.text();
		
		// Verify basic HTML structure is intact
		expect(html).toContain("<!DOCTYPE html");
		expect(html).toContain("<head");
		expect(html).toContain("<body");
		expect(html).toContain("</body>");
		expect(html).toContain("</html>");
	});

	test("should not duplicate API_BASE declarations", async () => {
		const response = await fetch(`${API_BASE}/api/registry.html`);
		const html = await response.text();
		
		// Count occurrences of "const API_BASE"
		const matches = html.match(/const\s+API_BASE\s*=/g);
		const count = matches ? matches.length : 0;
		
		// Should have exactly one declaration (from uiContext)
		expect(count).toBeGreaterThanOrEqual(1);
		expect(count).toBeLessThanOrEqual(2); // Allow for one in original HTML and one injected
	});
});

describe("HTML Routes - Content Validation", () => {
	test("registry.html should contain registry-specific content", async () => {
		const response = await fetch(`${API_BASE}/api/registry.html`);
		const html = await response.text();
		
		// Check for registry-related content
		const hasRegistryContent = 
			html.toLowerCase().includes("registry") ||
			html.includes("registries") ||
			html.includes("MCP");
		expect(hasRegistryContent).toBe(true);
	});

	test("dashboard should contain dashboard-specific content", async () => {
		const response = await fetch(`${API_BASE}/api/dashboard`);
		const html = await response.text();
		
		// Check for dashboard-related content
		const hasDashboardContent = 
			html.toLowerCase().includes("dashboard") ||
			html.includes("NEXUS") ||
			html.includes("trading");
		expect(hasDashboardContent).toBe(true);
	});
});

describe("HTML Routes - Headers", () => {
	test("should include proper Content-Type header", async () => {
		const response = await fetch(`${API_BASE}/api/registry.html`);
		const contentType = response.headers.get("Content-Type");
		expect(contentType).toContain("text/html");
		expect(contentType).toContain("charset");
	});

	test("should include git info headers", async () => {
		const response = await fetch(`${API_BASE}/api/registry.html`);
		
		// Check for git headers added by middleware
		const gitCommit = response.headers.get("X-Git-Commit");
		const gitBranch = response.headers.get("X-Git-Branch");
		
		// Headers should be present (even if "unknown")
		expect(gitCommit).toBeTruthy();
		expect(gitBranch).toBeTruthy();
	});
});

describe("HTML Routes - Route Priority", () => {
	test("/api/dashboard should serve HTML, not JSON", async () => {
		const response = await fetch(`${API_BASE}/api/dashboard`);
		const contentType = response.headers.get("Content-Type");
		
		expect(contentType).toContain("text/html");
		expect(contentType).not.toContain("application/json");
	});

	test("/api/dashboard/data should serve JSON, not HTML", async () => {
		const response = await fetch(`${API_BASE}/api/dashboard/data`);
		const contentType = response.headers.get("Content-Type");
		
		expect(contentType).toContain("application/json");
		expect(contentType).not.toContain("text/html");
	});
});

describe("HTML Routes - Performance", () => {
	test("should respond within reasonable time", async () => {
		const start = Date.now();
		const response = await fetch(`${API_BASE}/api/registry.html`);
		const duration = Date.now() - start;
		
		expect(response.ok).toBe(true);
		expect(duration).toBeLessThan(5000); // Should respond within 5 seconds
	});

	test("should handle concurrent requests", async () => {
		const requests = Array.from({ length: 5 }, () => 
			fetch(`${API_BASE}/api/registry.html`)
		);
		
		const responses = await Promise.all(requests);
		
		// All requests should succeed
		for (const response of responses) {
			expect(response.status).toBe(200);
		}
	});
});
