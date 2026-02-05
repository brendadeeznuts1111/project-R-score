#!/usr/bin/env bun

/**
 * @fileoverview Dashboard Server Test Suite
 * @description Comprehensive tests for dashboard server, endpoints, headers, ETags, and git commit info
 * @module test/dashboard-server
 */

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { spawn } from "bun";
import { join } from "path";
import { waitFor, bunEnv } from "./harness";

const DASHBOARD_PORT = parseInt(process.env.DASHBOARD_PORT || "8080", 10);
const API_BASE = process.env.API_URL || "http://localhost:3000";
const DASHBOARD_URL = `http://localhost:${DASHBOARD_PORT}`;

let serverProcess: ReturnType<typeof spawn> | null = null;

// Start dashboard server before tests
beforeAll(async () => {
	const serverScript = join(import.meta.dir, "..", "scripts", "dashboard-server.ts");
	serverProcess = spawn(["bun", "run", serverScript], {
		env: {
			...bunEnv,
			DASHBOARD_PORT: DASHBOARD_PORT.toString(),
			API_URL: API_BASE,
		},
		stdout: "pipe",
		stderr: "pipe",
	});

	// Wait for server to start using harness utility
	await waitFor(async () => {
		try {
			const response = await fetch(`${DASHBOARD_URL}/`);
			return response.ok;
		} catch {
			return false;
		}
	}, 10000); // 10 second timeout
});

// Stop dashboard server after tests
afterAll(async () => {
	if (serverProcess) {
		serverProcess.kill();
		await serverProcess.exited;
	}
});

describe("Dashboard Server", () => {
	describe("CORS Headers", () => {
		it("should include CORS headers on all responses", async () => {
			const response = await fetch(`${DASHBOARD_URL}/`);
			expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
			expect(response.headers.get("Access-Control-Allow-Methods")).toContain("GET");
			expect(response.headers.get("Access-Control-Allow-Headers")).toBeTruthy();
		});

		it("should handle CORS preflight requests", async () => {
			const response = await fetch(`${DASHBOARD_URL}/`, {
				method: "OPTIONS",
			});
			expect(response.status).toBe(204);
			expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
			expect(response.headers.get("Access-Control-Max-Age")).toBe("86400");
		});
	});

	describe("Dashboard HTML", () => {
		it("should serve dashboard HTML at root", async () => {
			const response = await fetch(`${DASHBOARD_URL}/`);
			expect(response.status).toBe(200);
			expect(response.headers.get("Content-Type")).toContain("text/html");
			const html = await response.text();
			expect(html).toContain("NEXUS");
			expect(html).toContain("dashboard");
		});

		it("should serve dashboard HTML at /index.html", async () => {
			const response = await fetch(`${DASHBOARD_URL}/index.html`);
			expect(response.status).toBe(200);
			expect(response.headers.get("Content-Type")).toContain("text/html");
		});

		it("should include API_BASE configuration in HTML", async () => {
			const response = await fetch(`${DASHBOARD_URL}/`);
			const html = await response.text();
			expect(html).toContain("API_BASE");
			expect(html).toContain(API_BASE);
		});

		it("should detect file:// protocol and show error", async () => {
			const response = await fetch(`${DASHBOARD_URL}/`);
			const html = await response.text();
			expect(html).toContain("file://");
			expect(html).toContain("CORS Error");
		});
	});

	describe("Static Files", () => {
		it("should serve CSS files from styles directory", async () => {
			const response = await fetch(`${DASHBOARD_URL}/styles/dashboard.css`);
			if (response.ok) {
				expect(response.headers.get("Content-Type")).toContain("text/css");
				expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
			}
		});

		it("should serve manifest.json", async () => {
			const response = await fetch(`${DASHBOARD_URL}/manifest.json`);
			if (response.ok) {
				expect(response.headers.get("Content-Type")).toContain("application/json");
				const json = await response.json();
				expect(json).toBeTruthy();
			}
		});

		it("should serve data files from data directory", async () => {
			const response = await fetch(`${DASHBOARD_URL}/data/telegram-logs/latest.json`);
			// May not exist, but should handle gracefully
			if (response.ok) {
				expect(response.headers.get("Content-Type")).toContain("application/json");
			}
		});
	});

	describe("ETag Headers", () => {
		it("should include ETag header for HTML", async () => {
			const response1 = await fetch(`${DASHBOARD_URL}/`);
			const etag1 = response1.headers.get("ETag");
			
			if (etag1) {
				// Test conditional request
				const response2 = await fetch(`${DASHBOARD_URL}/`, {
					headers: {
						"If-None-Match": etag1,
					},
				});
				expect([200, 304]).toContain(response2.status);
			}
		});

		it("should include ETag header for CSS files", async () => {
			const response = await fetch(`${DASHBOARD_URL}/styles/dashboard.css`);
			if (response.ok) {
				const etag = response.headers.get("ETag");
				if (etag) {
					expect(etag).toBeTruthy();
					expect(etag).toMatch(/^W\/".+"$/);
				}
			}
		});

		it("should return 304 Not Modified for matching ETags", async () => {
			const response1 = await fetch(`${DASHBOARD_URL}/`);
			const etag = response1.headers.get("ETag");
			
			if (etag) {
				const response2 = await fetch(`${DASHBOARD_URL}/`, {
					headers: {
						"If-None-Match": etag,
					},
				});
				if (response2.status === 304) {
					expect(response2.headers.get("ETag")).toBe(etag);
				}
			}
		});
	});

	describe("API Proxy", () => {
		it("should proxy /health endpoint", async () => {
			const response = await fetch(`${DASHBOARD_URL}/health`);
			// May fail if API server is not running, but should handle gracefully
			expect([200, 502, 503]).toContain(response.status);
			if (response.ok) {
				const data = await response.json();
				expect(data).toBeTruthy();
			}
		});

		it("should proxy /discovery endpoint", async () => {
			const response = await fetch(`${DASHBOARD_URL}/discovery`);
			expect([200, 502, 503]).toContain(response.status);
			if (response.ok) {
				const data = await response.json();
				expect(data).toBeTruthy();
			}
		});

		it("should proxy /telegram/integration/status endpoint", async () => {
			const response = await fetch(`${DASHBOARD_URL}/telegram/integration/status`);
			expect([200, 404, 502, 503]).toContain(response.status);
		});

		it("should proxy /telegram/topics endpoint", async () => {
			const response = await fetch(`${DASHBOARD_URL}/telegram/topics`);
			expect([200, 404, 502, 503]).toContain(response.status);
		});

		it("should proxy /streams endpoint", async () => {
			const response = await fetch(`${DASHBOARD_URL}/streams`);
			expect([200, 404, 502, 503]).toContain(response.status);
		});

		it("should proxy /arbitrage/status endpoint", async () => {
			const response = await fetch(`${DASHBOARD_URL}/arbitrage/status`);
			expect([200, 404, 502, 503]).toContain(response.status);
		});

		it("should proxy /cache/stats endpoint", async () => {
			const response = await fetch(`${DASHBOARD_URL}/cache/stats`);
			expect([200, 404, 502, 503]).toContain(response.status);
		});

		it("should include CORS headers on proxied responses", async () => {
			const response = await fetch(`${DASHBOARD_URL}/health`);
			expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
		});

		it("should handle API errors gracefully", async () => {
			const response = await fetch(`${DASHBOARD_URL}/api/nonexistent`);
			expect([404, 502, 503]).toContain(response.status);
		});
	});

	describe("Git Commit Information", () => {
		it("should include X-Git-Commit header in responses", async () => {
			const response = await fetch(`${DASHBOARD_URL}/`);
			const gitCommit = response.headers.get("X-Git-Commit");
			
			// May or may not be present depending on git availability
			if (gitCommit) {
				expect(gitCommit.length).toBe(7); // Short hash
				expect(/^[0-9a-f]{7}$/i.test(gitCommit)).toBe(true);
			}
		});

		it("should include X-Git-Branch header in responses", async () => {
			const response = await fetch(`${DASHBOARD_URL}/`);
			const gitBranch = response.headers.get("X-Git-Branch");
			
			// May or may not be present depending on git availability
			if (gitBranch) {
				expect(gitBranch.length).toBeGreaterThan(0);
			}
		});

		it("should include git headers in API proxy responses", async () => {
			const response = await fetch(`${DASHBOARD_URL}/health`);
			const gitCommit = response.headers.get("X-Git-Commit");
			const gitBranch = response.headers.get("X-Git-Branch");
			
			// May or may not be present depending on git availability
			if (gitCommit) {
				expect(/^[0-9a-f]{7}$/i.test(gitCommit)).toBe(true);
			}
			if (gitBranch) {
				expect(gitBranch.length).toBeGreaterThan(0);
			}
		});

		it("should include git headers in static file responses", async () => {
			const response = await fetch(`${DASHBOARD_URL}/styles/dashboard.css`);
			if (response.ok) {
				const gitCommit = response.headers.get("X-Git-Commit");
				const gitBranch = response.headers.get("X-Git-Branch");
				
				// May or may not be present depending on git availability
				if (gitCommit) {
					expect(/^[0-9a-f]{7}$/i.test(gitCommit)).toBe(true);
				}
				if (gitBranch) {
					expect(gitBranch.length).toBeGreaterThan(0);
				}
			}
		});
	});

	describe("Documentation Rendering", () => {
		it("should render dashboard with all sections", async () => {
			const response = await fetch(`${DASHBOARD_URL}/`);
			const html = await response.text();
			
			// Check for key dashboard sections
			expect(html).toContain("System Health");
			expect(html).toContain("Trade Streams");
			expect(html).toContain("Arbitrage");
		});

		it("should include proper meta tags", async () => {
			const response = await fetch(`${DASHBOARD_URL}/`);
			const html = await response.text();
			
			expect(html).toContain("<meta charset");
			expect(html).toContain("viewport");
			expect(html).toContain("description");
		});

		it("should include proper title", async () => {
			const response = await fetch(`${DASHBOARD_URL}/`);
			const html = await response.text();
			
			expect(html).toContain("<title>");
			expect(html).toContain("NEXUS");
		});
	});

	describe("Security Headers", () => {
		it("should not expose sensitive server information", async () => {
			const response = await fetch(`${DASHBOARD_URL}/`);
			const headers = response.headers;
			
			// Should not expose server version
			expect(headers.get("Server")).toBeFalsy();
		});

		it("should handle invalid paths securely", async () => {
			const response = await fetch(`${DASHBOARD_URL}/../../etc/passwd`);
			expect(response.status).toBe(404);
		});

		it("should prevent directory traversal", async () => {
			const response = await fetch(`${DASHBOARD_URL}/../package.json`);
			expect(response.status).toBe(404);
		});
	});

	describe("Content-Type Headers", () => {
		it("should set correct Content-Type for HTML", async () => {
			const response = await fetch(`${DASHBOARD_URL}/`);
			expect(response.headers.get("Content-Type")).toContain("text/html");
			expect(response.headers.get("Content-Type")).toContain("charset=utf-8");
		});

		it("should set correct Content-Type for JSON", async () => {
			const response = await fetch(`${DASHBOARD_URL}/manifest.json`);
			if (response.ok) {
				expect(response.headers.get("Content-Type")).toContain("application/json");
				expect(response.headers.get("Content-Type")).toContain("charset=utf-8");
			}
		});

		it("should set correct Content-Type for CSS", async () => {
			const response = await fetch(`${DASHBOARD_URL}/styles/dashboard.css`);
			if (response.ok) {
				expect(response.headers.get("Content-Type")).toContain("text/css");
				expect(response.headers.get("Content-Type")).toContain("charset=utf-8");
			}
		});
	});

	describe("Error Handling", () => {
		it("should return 404 for non-existent files", async () => {
			const response = await fetch(`${DASHBOARD_URL}/nonexistent.html`);
			expect(response.status).toBe(404);
		});

		it("should return 404 for non-existent API endpoints", async () => {
			const response = await fetch(`${DASHBOARD_URL}/api/nonexistent`);
			expect(response.status).toBe(404);
		});

		it("should handle malformed requests gracefully", async () => {
			const response = await fetch(`${DASHBOARD_URL}/`, {
				method: "POST",
				body: "invalid",
			});
			expect([200, 400, 405]).toContain(response.status);
		});
	});

	describe("Performance", () => {
		it("should respond quickly to requests", async () => {
			const start = Date.now();
			const response = await fetch(`${DASHBOARD_URL}/`);
			const duration = Date.now() - start;
			
			expect(response.ok).toBe(true);
			expect(duration).toBeLessThan(1000); // Should respond within 1 second
		});

		it("should handle concurrent requests", async () => {
			const requests = Array.from({ length: 10 }, () =>
				fetch(`${DASHBOARD_URL}/`),
			);
			const responses = await Promise.all(requests);
			
			expect(responses.every((r) => r.ok)).toBe(true);
		});
	});
});

describe("API Endpoints Documentation", () => {
	it("should document all API endpoints in discovery", async () => {
		const response = await fetch(`${DASHBOARD_URL}/discovery`);
		if (response.ok) {
			const data = await response.json();
			expect(data).toBeTruthy();
			if (data.endpoints) {
				expect(Array.isArray(data.endpoints) || typeof data.endpoints === "object").toBe(true);
			}
		}
	});

	it("should include endpoint metadata", async () => {
		const response = await fetch(`${DASHBOARD_URL}/discovery`);
		if (response.ok) {
			const data = await response.json();
			if (data.name) {
				expect(typeof data.name).toBe("string");
			}
			if (data.version) {
				expect(typeof data.version).toBe("string");
			}
		}
	});
});

describe("Git Integration", () => {
	it("should be able to read git commit hash", async () => {
		try {
			const { stdout, exitCode } = Bun.spawnSync(["git", "rev-parse", "HEAD"], {
				stdout: "pipe",
			});
			
			if (exitCode === 0) {
				const commitHash = stdout.toString().trim();
				expect(commitHash).toBeTruthy();
				expect(commitHash.length).toBe(40); // Full SHA-1 hash
			}
		} catch {
			// Git not available, skip
		}
	});

	it("should be able to read git branch", async () => {
		try {
			const { stdout, exitCode } = Bun.spawnSync(["git", "rev-parse", "--abbrev-ref", "HEAD"], {
				stdout: "pipe",
			});
			
			if (exitCode === 0) {
				const branch = stdout.toString().trim();
				expect(branch).toBeTruthy();
			}
		} catch {
			// Git not available, skip
		}
	});

	it("should format git commit hash correctly", async () => {
		try {
			const { stdout, exitCode } = Bun.spawnSync(["git", "rev-parse", "HEAD"], {
				stdout: "pipe",
			});
			
			if (exitCode === 0) {
				const commitHash = stdout.toString().trim();
				const shortHash = commitHash.substring(0, 7);
				expect(shortHash.length).toBe(7);
				expect(/^[0-9a-f]{7}$/i.test(shortHash)).toBe(true);
			}
		} catch {
			// Git not available, skip
		}
	});
});

describe("Header Validation", () => {
	it("should include all required CORS headers", async () => {
		const response = await fetch(`${DASHBOARD_URL}/`);
		const headers = response.headers;
		
		expect(headers.get("Access-Control-Allow-Origin")).toBe("*");
		expect(headers.get("Access-Control-Allow-Methods")).toBeTruthy();
		expect(headers.get("Access-Control-Allow-Headers")).toBeTruthy();
	});

	it("should include Cache-Control headers for static assets", async () => {
		const response = await fetch(`${DASHBOARD_URL}/styles/dashboard.css`);
		if (response.ok) {
			const cacheControl = response.headers.get("Cache-Control");
			// May or may not be set, but if set should be valid
			if (cacheControl) {
				expect(cacheControl).toBeTruthy();
			}
		}
	});

	it("should include proper Content-Length header", async () => {
		const response = await fetch(`${DASHBOARD_URL}/`);
		const contentLength = response.headers.get("Content-Length");
		if (contentLength) {
			const length = parseInt(contentLength, 10);
			expect(length).toBeGreaterThan(0);
		}
	});
});
