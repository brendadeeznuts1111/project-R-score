#!/usr/bin/env bun
/**
 * @fileoverview Comprehensive Test Suite for Registry Dashboard Entry Point
 * @description Tests for the main application entry point using Bun v1.3.4 patterns
 * @version 1.0.0
 * @since Bun 1.3.4
 *
 * @see {@link https://bun.sh/blog/bun-v1.3.4|Bun v1.3.4 Release}
 * @see {@link ../../test/bun-1.3.4-features.test.ts|Bun v1.3.4 Feature Tests}
 * @see {@link ../../docs/14.4.0.0.0.0.0-BUN-RUNTIME-ENHANCEMENTS.md|Bun Runtime Enhancements}
 *
 * @module apps/registry-dashboard/src/index.test
 */

import { describe, expect, test } from "bun:test";

describe("Registry Dashboard Entry Point", () => {
	/**
	 * Note: Since index.ts starts a server on port 4000, we test the module structure
	 * rather than actually importing and starting the server during tests.
	 */

	describe("Module Structure", () => {
		/**
		 * @test Verify index.ts file exists
		 */
		test("should have index.ts entry point", async () => {
			const file = Bun.file(
				new URL("./index.ts", import.meta.url).pathname
			);
			expect(await file.exists()).toBe(true);
		});

		/**
		 * @test Verify index.ts content structure
		 */
		test("should import required modules", async () => {
			const file = Bun.file(
				new URL("./index.ts", import.meta.url).pathname
			);
			const content = await file.text();

			expect(content).toContain("from \"elysia\"");
			expect(content).toContain("dashboardRoutes");
			expect(content).toContain("teamRoutes");
		});

		/**
		 * @test Verify Elysia app configuration
		 */
		test("should configure Elysia app correctly", async () => {
			const file = Bun.file(
				new URL("./index.ts", import.meta.url).pathname
			);
			const content = await file.text();

			expect(content).toContain("new Elysia()");
			expect(content).toContain(".use(dashboardRoutes)");
			expect(content).toContain(".use(teamRoutes)");
			expect(content).toContain(".listen(4000)");
		});

		/**
		 * @test Verify root redirect to dashboard
		 */
		test("should redirect root path to dashboard", async () => {
			const file = Bun.file(
				new URL("./index.ts", import.meta.url).pathname
			);
			const content = await file.text();

			expect(content).toContain('.get("/", ');
			expect(content).toContain('Response.redirect("/dashboard", 302)');
		});

		/**
		 * @test Verify console output for startup
		 */
		test("should log startup message", async () => {
			const file = Bun.file(
				new URL("./index.ts", import.meta.url).pathname
			);
			const content = await file.text();

			expect(content).toContain("Registry Dashboard running");
			expect(content).toContain("http://localhost:4000");
		});
	});

	describe("Route Dependencies", () => {
		/**
		 * @test Verify dashboard routes import
		 */
		test("should import dashboard routes from pages/dashboard", async () => {
			const file = Bun.file(
				new URL("./index.ts", import.meta.url).pathname
			);
			const content = await file.text();

			expect(content).toContain('./pages/dashboard"');
		});

		/**
		 * @test Verify team routes import
		 */
		test("should import team routes from pages/team/sports-correlation", async () => {
			const file = Bun.file(
				new URL("./index.ts", import.meta.url).pathname
			);
			const content = await file.text();

			expect(content).toContain('./pages/team/sports-correlation"');
		});
	});

	describe("Export Structure", () => {
		/**
		 * @test Verify default export
		 */
		test("should export app as default", async () => {
			const file = Bun.file(
				new URL("./index.ts", import.meta.url).pathname
			);
			const content = await file.text();

			expect(content).toContain("export default app");
		});
	});
});

describe("Application Configuration", () => {
	describe("Port Configuration", () => {
		/**
		 * @test Verify listening port
		 */
		test("should listen on port 4000", async () => {
			const file = Bun.file(
				new URL("./index.ts", import.meta.url).pathname
			);
			const content = await file.text();

			expect(content).toContain(".listen(4000)");
		});
	});

	describe("Shebang", () => {
		/**
		 * @test Verify executable shebang
		 */
		test("should have bun shebang for direct execution", async () => {
			const file = Bun.file(
				new URL("./index.ts", import.meta.url).pathname
			);
			const content = await file.text();

			expect(content.startsWith("#!/usr/bin/env bun")).toBe(true);
		});
	});
});
