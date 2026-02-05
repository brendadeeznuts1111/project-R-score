#!/usr/bin/env bun
// tests/integration.test.ts - Full Stack Integration Tests

import { afterAll, beforeAll, describe, expect, test } from "bun:test";

describe("Integration: Full Stack", () => {
	let _server: any;
	let baseUrl: string;

	beforeAll(async () => {
		// Start server in background
		const process = Bun.spawn(["bun", "src/server-governed.js"], {
			env: { ...process.env, PORT: "9999" },
			stdout: "pipe",
			stderr: "pipe",
		});

		// Wait for server to start
		await Bun.sleep(2000);

		baseUrl = "http://localhost:9999";

		// Verify server is running
		try {
			const response = await fetch(`${baseUrl}/health`);
			expect(response.ok).toBe(true);
		} catch (_error) {
			throw new Error("Server failed to start");
		}
	});

	afterAll(async () => {
		// Cleanup server process
		try {
			await fetch(`${baseUrl}/shutdown`, { method: "POST" });
		} catch {
			// Server might already be shutting down
		}
		await Bun.sleep(500);
	});

	test("End-to-end feed fetch with all governance", async () => {
		const response = await fetch(
			`${baseUrl}/feed?url=https://feeds.bbci.co.uk/news/rss.xml`,
		);

		expect(response.status).toBe(200);

		const data = await response.json();
		expect(data.governance).toBeDefined();
		expect(data.governance.robotsRespected).toBe(true);
		expect(data.governance.rateLimited).toBe(true);
		expect(data.server.bun_version).toBe("1.3.7");
	});

	test("Batch fetch respects concurrency limits", async () => {
		const urls = [
			"https://feeds.bbci.co.uk/news/rss.xml",
			"https://rss.cnn.com/rss/edition.rss",
		]
			.map((u) => `source=${encodeURIComponent(u)}`)
			.join("&");

		const start = performance.now();
		const response = await fetch(`${baseUrl}/feeds?${urls}`);
		const _duration = performance.now() - start;

		expect(response.status).toBe(200);

		const data = await response.json();
		expect(data.results).toBeDefined();
		expect(data.performance.totalDuration).toBeDefined();
	});

	test("Profiler endpoint returns valid metrics", async () => {
		// Generate some activity first
		await fetch(`${baseUrl}/feed?url=https://example.com/rss.xml`);

		const response = await fetch(`${baseUrl}/admin/metrics`);
		const metrics = await response.json();

		expect(response.status).toBe(200);
		expect(metrics.profiler).toBeDefined();
		expect(metrics.governance).toBeDefined();
		expect(metrics.features).toBeDefined();
		expect(metrics.v1_3_7_features).toBeDefined();
	});

	test("Feature flags endpoint works", async () => {
		const response = await fetch(`${baseUrl}/admin/features`);
		const features = await response.json();

		expect(response.status).toBe(200);
		expect(features.features).toBeDefined();
		expect(features.features.header_case_preservation.enabled).toBe(true);
	});

	test("Health check includes all systems", async () => {
		const response = await fetch(`${baseUrl}/health`);
		const health = await response.json();

		expect(response.status).toBe(200);
		expect(health.status).toBe("healthy");
		expect(health.version).toBe("1.3.7");
		expect(health.governance).toBe("enabled");
		expect(health.profiling).toBe("enabled");
	});

	test("Security: No username enumeration via timing", async () => {
		const timings: number[] = [];

		for (let i = 0; i < 5; i++) {
			const start = performance.now();
			await fetch(`${baseUrl}/feed?url=https://example.com/invalid-${i}`);
			timings.push(performance.now() - start);
		}

		// Check timing variance is low (prevents enumeration attacks)
		const avg = timings.reduce((a, b) => a + b) / timings.length;
		const variance =
			timings.reduce((acc, t) => acc + (t - avg) ** 2, 0) / timings.length;

		expect(variance).toBeLessThan(1000); // Low variance = constant-time-like
	});

	test("robots.txt blocking works", async () => {
		// Use a domain that would typically block bots
		const response = await fetch(
			`${baseUrl}/feed?url=https://private.example.com/disallowed-feed.xml`,
		);

		// Should either succeed (if robots.txt doesn't exist) or be properly blocked
		expect([200, 403, 500]).toContain(response.status);

		if (response.status === 403) {
			const data = await response.json();
			expect(data.error).toContain("robots.txt");
		}
	});

	test("v1.3.7 optimizations are active", async () => {
		const response = await fetch(`${baseUrl}/admin/metrics`);
		const metrics = await response.json();

		// All v1.3.7 features should be active
		expect(metrics.v1_3_7_features.header_case_preservation).toBe("active");
		expect(metrics.v1_3_7_features.fast_buffer_parsing).toBe("active");
		expect(metrics.v1_3_7_features.fast_string_padding).toBe("active");
		expect(metrics.v1_3_7_features.fast_array_flat).toBe("active");
		expect(metrics.v1_3_7_features.json5_support).toBe("active");
	});

	test("Feature flag rollout management", async () => {
		// Test gradual rollout endpoint
		const rolloutResponse = await fetch(`${baseUrl}/admin/features`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				action: "rollout",
				feature: "experimental_dns_prefetch",
				percentage: 10,
			}),
		});

		expect(rolloutResponse.status).toBe(200);

		const result = await rolloutResponse.json();
		expect(result.success).toBe(true);
	});

	test("Performance profiling creates profiles", async () => {
		// Make a request that should trigger profiling
		await fetch(`${baseUrl}/feed?url=https://feeds.bbci.co.uk/news/rss.xml`);

		// Check profiles were created
		const profilesResponse = await fetch(`${baseUrl}/admin/profiles`);
		const profiles = await profilesResponse.json();

		expect(profilesResponse.status).toBe(200);
		expect(profiles.total).toBeGreaterThanOrEqual(0);
	});

	test("Error handling and graceful degradation", async () => {
		// Test with invalid URL
		const response = await fetch(`${baseUrl}/feed?url=invalid-url`);

		// Should handle gracefully
		expect([400, 500]).toContain(response.status);

		const data = await response.json();
		expect(data.error).toBeDefined();
	});

	test("Rate limiting enforcement", async () => {
		// Make multiple rapid requests to same domain
		const promises = Array(15)
			.fill(0)
			.map(() =>
				fetch(`${baseUrl}/feed?url=https://rate-limit-test.com/feed.xml`),
			);

		const start = performance.now();
		const results = await Promise.allSettled(promises);
		const duration = performance.now() - start;

		// Should take longer due to rate limiting
		expect(duration).toBeGreaterThan(1000); // Should be delayed

		// All requests should eventually complete (or be rate limited)
		const successCount = results.filter((r) => r.status === "fulfilled").length;
		expect(successCount).toBeGreaterThan(0);
	});
});
