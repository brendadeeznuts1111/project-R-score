/**
 * Cross-System Reference Validation Tests
 * 
 * Validates that documentation references between systems are properly implemented
 * 
 * @module test/docs/cross-reference
 */

import { describe, expect, test } from "bun:test";

describe("Cross-System Reference Validation", () => {
	test("9.1.1.6.1.0: HTMLRewriter + Telegram integration test", () => {
		// This test validates the integration point documented in 9.1.1.6.1.0
		// Test Formula from docs/TELEGRAM-DEV-SETUP.md:
		// curl -s -H "X-User-Role: admin" http://localhost:3001/mini-app | rg -c "telegramUserId"
		// Expected Result: 1
		
		// Verify that mini-app-context.ts references both systems
		const fs = require("fs");
		const miniAppContext = fs.readFileSync("src/telegram/mini-app-context.ts", "utf-8");
		
		expect(miniAppContext).toContain("6.1.1.2.2"); // HTMLRewriter reference
		expect(miniAppContext).toContain("9.1.1"); // Telegram reference
	});

	test("9.1.1.6.1.1: Bookmaker router integration test", () => {
		// This test validates the integration point documented in 9.1.1.6.1.1
		// Test Formula from docs/TELEGRAM-DEV-SETUP.md:
		// bun test tests/telegram-bookmaker-router.spec.ts
		// Expected Result: Passes
		
		// Verify that bookmaker-router.ts references both systems
		const fs = require("fs");
		const bookmakerRouter = fs.readFileSync("src/telegram/bookmaker-router.ts", "utf-8");
		
		expect(bookmakerRouter).toContain("6.1.1.2.2"); // HTMLRewriter reference
		expect(bookmakerRouter).toContain("9.1.1"); // Telegram reference
	});

	test("9.1.1.6.1.2: RBAC mapping integration test", () => {
		// This test validates the integration point documented in 9.1.1.6.1.2
		// Test Formula from docs/TELEGRAM-DEV-SETUP.md:
		// rg -A5 "deriveRoleFromTelegram" src/telegram/mini-app-context.ts
		// Expected Result: Shows RBAC mapping
		
		// Verify that mini-app-context.ts contains RBAC mapping
		const fs = require("fs");
		const miniAppContext = fs.readFileSync("src/telegram/mini-app-context.ts", "utf-8");
		
		expect(miniAppContext).toContain("deriveRoleFromTelegram");
		expect(miniAppContext).toContain("6.1.1.2.2.1.2.3"); // RBAC reference
	});

	test("9.1.1.8.1.0: Pre-flight validation script", () => {
		// This test validates the deployment checklist documented in 9.1.1.8.1.0
		// The script validates UIContext injection before Telegram bot startup
		
		// Verify that the documentation exists
		const fs = require("fs");
		const devSetup = fs.readFileSync("docs/TELEGRAM-DEV-SETUP.md", "utf-8");
		
		expect(devSetup).toContain("9.1.1.8.1.0");
		expect(devSetup).toContain("Validate UIContext injection");
	});

	test("9.1.1.8.1.1: Cross-system validation success", () => {
		// This test validates the success message documented in 9.1.1.8.1.1
		
		// Verify that the documentation exists
		const fs = require("fs");
		const devSetup = fs.readFileSync("docs/TELEGRAM-DEV-SETUP.md", "utf-8");
		
		expect(devSetup).toContain("9.1.1.8.1.1");
		expect(devSetup).toContain("Cross-system validation passed");
	});

	test("All integration files reference both systems", () => {
		// Verify that all integration files reference both numbering schemes
		const fs = require("fs");
		const integrationFiles = [
			"src/telegram/mini-app-context.ts",
			"src/telegram/bookmaker-router.ts",
			"src/telegram/mini-app.ts",
			"src/telegram/github-webhook-handler.ts",
		];

		for (const file of integrationFiles) {
			const content = fs.readFileSync(file, "utf-8");
			expect(content).toContain("6.1.1.2.2"); // HTMLRewriter reference
			expect(content).toContain("9.1.1"); // Telegram reference
		}
	});
});
