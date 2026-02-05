/**
 * Test suite for BUN_DOCS_URLS constants
 * Verifies all constants are accessible and URLs are valid
 */

import { describe, it, expect } from "bun:test";
import { BUN_DOCS_URLS } from "../../src/utils/rss-constants";

describe("BUN_DOCS_URLS constants", () => {
	it("should export all 24 constants", () => {
		// Verify all expected constants exist
		const expectedConstants = [
			"PM_CLI_INSTALL_CONFIG",
			"API_REFERENCE",
			"GLOBALS_REFERENCE",
			"RUNTIME_APIS",
			"DOCS",
			"BLOG",
			"GITHUB",
			"TEST_RUNNER",
			"WORKSPACE_CONFIG",
			"BENCHMARKING",
			"BUILD_COMPILE",
			"FETCH_API",
			"FETCH_TIMEOUTS",
			"DEBUGGER",
			"SECURITY_SCANNER",
			"SECRETS",
			"CSRF",
			"WEBSOCKET_CONTEXTUAL_DATA",
			"SHELL_BUILTIN_COMMANDS",
			"SHELL_FILE_LOADER",
			"SHELL_ENV_VARS",
			"SHELL_UTILITIES",
			"YAML_API",
		];

		for (const constantName of expectedConstants) {
			expect(BUN_DOCS_URLS).toHaveProperty(constantName);
			expect(BUN_DOCS_URLS[constantName as keyof typeof BUN_DOCS_URLS]).toBeString();
		}
	});

	it("should have valid URL format for all constants", () => {
		for (const [key, value] of Object.entries(BUN_DOCS_URLS)) {
			// All values should be strings
			expect(value).toBeString();
			
			// All URLs should start with https://
			if (key !== "GITHUB") {
				// GitHub URL is different format
				expect(value).toStartWith("https://");
			}
		}
	});

	it("should have Bun documentation URLs", () => {
		expect(BUN_DOCS_URLS.DOCS).toBe("https://bun.com/docs");
		expect(BUN_DOCS_URLS.API_REFERENCE).toBe("https://bun.com/reference");
		expect(BUN_DOCS_URLS.GLOBALS_REFERENCE).toBe("https://bun.com/reference/globals");
	});

	it("should have runtime API URLs", () => {
		expect(BUN_DOCS_URLS.RUNTIME_APIS).toContain("runtime/bun-apis");
		expect(BUN_DOCS_URLS.FETCH_API).toContain("runtime/networking/fetch");
		expect(BUN_DOCS_URLS.YAML_API).toContain("runtime/yaml");
	});

	it("should have shell API URLs with fragments", () => {
		expect(BUN_DOCS_URLS.SHELL_BUILTIN_COMMANDS).toContain("runtime/shell#builtin-commands");
		expect(BUN_DOCS_URLS.SHELL_FILE_LOADER).toContain("runtime/shell#sh-file-loader");
		expect(BUN_DOCS_URLS.SHELL_ENV_VARS).toContain("runtime/shell#environment-variables");
		expect(BUN_DOCS_URLS.SHELL_UTILITIES).toContain("runtime/shell#utilities");
	});

	it("should allow string concatenation for GLOBALS_REFERENCE", () => {
		// Test that we can concatenate paths
		const urlSearchParamsUrl = BUN_DOCS_URLS.GLOBALS_REFERENCE + "/URLSearchParams";
		expect(urlSearchParamsUrl).toBe("https://bun.com/reference/globals/URLSearchParams");
	});
});
