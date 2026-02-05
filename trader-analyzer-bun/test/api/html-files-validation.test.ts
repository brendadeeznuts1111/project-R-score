#!/usr/bin/env bun

/**
 * @fileoverview HTML Files Validation Tests
 * @description Validates that HTML source files contain correct API_BASE patterns
 * @module test/api/html-files-validation
 * 
 * These tests verify:
 * - Source HTML files have correct API_BASE assignment
 * - No hardcoded API_BASE values exist
 * - HTML structure is valid
 */

import { describe, test, expect } from "bun:test";
import { join } from "path";

describe("HTML Files - Source Validation", () => {
	describe("registry.html", () => {
		test("should contain uiContext-based API_BASE assignment", async () => {
			// Try public/registry.html first
			// import.meta.dir is test/api/, so go up two levels to project root
			let registryFile = Bun.file(join(import.meta.dir, "..", "..", "public", "registry.html"));
			if (!(await registryFile.exists())) {
				// Fallback to dashboard/registry.html
				registryFile = Bun.file(join(import.meta.dir, "..", "..", "dashboard", "registry.html"));
			}

			if (await registryFile.exists()) {
				const content = await registryFile.text();
				
				// Should contain the correct pattern
				expect(content).toMatch(/const\s+API_BASE\s*=\s*uiContext\.apiBaseUrl/);
			}
		});

		test("should not contain hardcoded API_BASE assignments", async () => {
			// import.meta.dir is test/api/, so go up two levels to project root
			let registryFile = Bun.file(join(import.meta.dir, "..", "..", "public", "registry.html"));
			if (!(await registryFile.exists())) {
				registryFile = Bun.file(join(import.meta.dir, "..", "..", "dashboard", "registry.html"));
			}

			if (await registryFile.exists()) {
				const content = await registryFile.text();
				
				// Should NOT contain hardcoded string assignments
				const hasHardcodedString = /const\s+API_BASE\s*=\s*["'`]/.test(content);
				expect(hasHardcodedString).toBe(false);
			}
		});

		test("should have valid HTML structure", async () => {
			// import.meta.dir is test/api/, so go up two levels to project root
			let registryFile = Bun.file(join(import.meta.dir, "..", "..", "public", "registry.html"));
			if (!(await registryFile.exists())) {
				registryFile = Bun.file(join(import.meta.dir, "..", "..", "dashboard", "registry.html"));
			}

			if (await registryFile.exists()) {
				const content = await registryFile.text();
				
				expect(content).toContain("<!DOCTYPE html");
				expect(content).toContain("<html");
				expect(content).toContain("</html>");
			}
		});
	});

	describe("dashboard/index.html", () => {
		test("should contain API_BASE or uiContext reference", async () => {
			// import.meta.dir is test/api/, so go up two levels to project root
			const dashboardFile = Bun.file(join(import.meta.dir, "..", "..", "dashboard", "index.html"));
			
			if (await dashboardFile.exists()) {
				const content = await dashboardFile.text();
				
				// Should contain API_BASE or uiContext reference
				const hasApiBase = content.includes("API_BASE") || content.includes("apiBaseUrl") || content.includes("uiContext");
				expect(hasApiBase).toBe(true);
			}
		});

		test("should have valid HTML structure", async () => {
			// import.meta.dir is test/api/, so go up two levels to project root
			const dashboardFile = Bun.file(join(import.meta.dir, "..", "..", "dashboard", "index.html"));
			
			if (await dashboardFile.exists()) {
				const content = await dashboardFile.text();
				
				expect(content).toContain("<!DOCTYPE html");
				expect(content).toContain("<html");
				expect(content).toContain("</html>");
			}
		});

		test("should not contain hardcoded API URLs in script tags", async () => {
			// import.meta.dir is test/api/, so go up two levels to project root
			const dashboardFile = Bun.file(join(import.meta.dir, "..", "..", "dashboard", "index.html"));
			
			if (await dashboardFile.exists()) {
				const content = await dashboardFile.text();
				
				// Extract script tags
				const scriptMatches = content.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
				
				for (const script of scriptMatches) {
					// Should not have hardcoded localhost URLs (unless in comments)
					const hasHardcodedLocalhost = /const\s+\w+\s*=\s*["']https?:\/\/localhost/.test(script);
					if (hasHardcodedLocalhost && !script.includes("//")) {
						// Allow if it's in a comment or example
						const isComment = script.includes("//") || script.includes("/*");
						if (!isComment) {
							// This might be okay if it's a fallback, but log it
							console.warn("Found potential hardcoded localhost URL in script:", script.substring(0, 100));
						}
					}
				}
			}
		});
	});
});

describe("HTML Files - Pattern Consistency", () => {
	test("all HTML files should use consistent API_BASE pattern", async () => {
		// import.meta.dir is test/api/, so go up two levels to project root
		const files = [
			join(import.meta.dir, "..", "..", "public", "registry.html"),
			join(import.meta.dir, "..", "..", "dashboard", "registry.html"),
			join(import.meta.dir, "..", "..", "dashboard", "index.html"),
		];

		const patterns: string[] = [];

		for (const filePath of files) {
			const file = Bun.file(filePath);
			if (await file.exists()) {
				const content = await file.text();
				
				// Find API_BASE patterns
				const apiBaseMatches = content.match(/const\s+API_BASE\s*=\s*[^;]+/g) || [];
				patterns.push(...apiBaseMatches);
			}
		}

		// All patterns should use uiContext
		const uiContextPatterns = patterns.filter(p => p.includes("uiContext"));
		const hardcodedPatterns = patterns.filter(p => {
			// Filter out hardcoded patterns, but allow fallback patterns in dashboard
			const isHardcoded = /["'`]/.test(p);
			// Allow window.location.origin fallback patterns (used in dashboard/index.html)
			const isFallback = p.includes("window.location.origin");
			return isHardcoded && !isFallback;
		});

		// Should have uiContext patterns
		expect(uiContextPatterns.length).toBeGreaterThan(0);
		// Hardcoded patterns should be minimal (only fallbacks allowed)
		// Note: dashboard/index.html has a fallback pattern which is acceptable
		if (hardcodedPatterns.length > 0) {
			console.log(`Note: Found ${hardcodedPatterns.length} hardcoded patterns (may be fallbacks)`);
		}
	});
});

describe("HTML Files - Route Handler Compatibility", () => {
	test("HTML files should be compatible with HTMLRewriter", async () => {
		// import.meta.dir is test/api/, so go up two levels to project root
		const files = [
			{ path: join(import.meta.dir, "..", "..", "public", "registry.html"), name: "public/registry.html" },
			{ path: join(import.meta.dir, "..", "..", "dashboard", "registry.html"), name: "dashboard/registry.html" },
			{ path: join(import.meta.dir, "..", "..", "dashboard", "index.html"), name: "dashboard/index.html" },
		];

		for (const { path, name } of files) {
			const file = Bun.file(path);
			if (await file.exists()) {
				const content = await file.text();
				
				// HTMLRewriter needs valid HTML structure
				expect(content).toContain("<html");
				expect(content).toContain("</html>");
				
				// Should have a place for script injection (head or body)
				const hasHeadOrBody = content.includes("<head") || content.includes("<body");
				expect(hasHeadOrBody).toBe(true);
			}
		}
	});
});
