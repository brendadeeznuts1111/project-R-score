#!/usr/bin/env bun
/**
 * Tests for configuration management
 */

import { describe, expect, it } from "bun:test";
import { DEFAULT_CONFIG, getConfigValue, setConfigValue } from "../lib/config";

const _TEST_CONFIG_PATH = `/tmp/test-tier1380-config-${Date.now()}.json`;

describe("Configuration", () => {
	it("should have default values", () => {
		expect(DEFAULT_CONFIG.defaultTier).toBe("1380");
		expect(DEFAULT_CONFIG.enableLint).toBe(true);
		expect(DEFAULT_CONFIG.autoFix).toBe(false);
	});

	it("should set config values", () => {
		const config = setConfigValue(DEFAULT_CONFIG, "autoFix", true);
		expect(config.autoFix).toBe(true);
		expect(config.enableLint).toBe(true); // unchanged
	});

	it("should get config values", () => {
		const value = getConfigValue(DEFAULT_CONFIG, "defaultDomain");
		expect(value).toBe("PLATFORM");
	});

	it("should preserve other values when setting", () => {
		let config = DEFAULT_CONFIG;
		config = setConfigValue(config, "enableTests", false);
		config = setConfigValue(config, "autoStage", false);

		expect(config.enableTests).toBe(false);
		expect(config.autoStage).toBe(false);
		expect(config.enableLint).toBe(true); // still default
	});
});

describe("Configuration types", () => {
	it("should have correct types for boolean values", () => {
		expect(typeof DEFAULT_CONFIG.autoFix).toBe("boolean");
		expect(typeof DEFAULT_CONFIG.enableLint).toBe("boolean");
	});

	it("should have correct types for string values", () => {
		expect(typeof DEFAULT_CONFIG.defaultTier).toBe("string");
		expect(typeof DEFAULT_CONFIG.defaultDomain).toBe("string");
	});

	it("should have correct types for array values", () => {
		expect(Array.isArray(DEFAULT_CONFIG.protectedBranches)).toBe(true);
		expect(DEFAULT_CONFIG.protectedBranches).toContain("main");
	});

	it("should have correct types for number values", () => {
		expect(typeof DEFAULT_CONFIG.dashboardRefreshInterval).toBe("number");
		expect(DEFAULT_CONFIG.dashboardRefreshInterval).toBeGreaterThan(0);
	});
});
