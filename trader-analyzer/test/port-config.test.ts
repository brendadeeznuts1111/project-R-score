/**
 * @fileoverview Port Configuration Tests
 * @description Verify port constants are hardcoded and consistent
 */

import { describe, test, expect } from "bun:test";
import { API_CONSTANTS } from "../src/constants";

describe("Port Configuration", () => {
	test("API_CONSTANTS.PORT should be hardcoded to 3000", () => {
		expect(API_CONSTANTS.PORT).toBe(3000);
		expect(API_CONSTANTS.DEFAULT_PORT).toBe(3000);
	});

	test("API_CONSTANTS.WS_PORT should be hardcoded to 3002", () => {
		expect(API_CONSTANTS.WS_PORT).toBe(3002);
		expect(API_CONSTANTS.DEFAULT_WS_PORT).toBe(3002);
	});

	test("Port constants should be numbers", () => {
		expect(typeof API_CONSTANTS.PORT).toBe("number");
		expect(typeof API_CONSTANTS.WS_PORT).toBe("number");
	});

	test("Ports should be valid port numbers (1-65535)", () => {
		expect(API_CONSTANTS.PORT).toBeGreaterThan(0);
		expect(API_CONSTANTS.PORT).toBeLessThanOrEqual(65535);
		expect(API_CONSTANTS.WS_PORT).toBeGreaterThan(0);
		expect(API_CONSTANTS.WS_PORT).toBeLessThanOrEqual(65535);
	});

	test("API and WS ports should be different", () => {
		expect(API_CONSTANTS.PORT).not.toBe(API_CONSTANTS.WS_PORT);
	});
});

describe("Port Configuration Consistency", () => {
	test("API_CONSTANTS should export PORT and WS_PORT", () => {
		expect("PORT" in API_CONSTANTS).toBe(true);
		expect("WS_PORT" in API_CONSTANTS).toBe(true);
		expect("DEFAULT_PORT" in API_CONSTANTS).toBe(true);
		expect("DEFAULT_WS_PORT" in API_CONSTANTS).toBe(true);
	});

	test("PORT and DEFAULT_PORT should match", () => {
		expect(API_CONSTANTS.PORT).toBe(API_CONSTANTS.DEFAULT_PORT);
	});

	test("WS_PORT and DEFAULT_WS_PORT should match", () => {
		expect(API_CONSTANTS.WS_PORT).toBe(API_CONSTANTS.DEFAULT_WS_PORT);
	});
});
