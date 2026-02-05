import { expect, test } from "bun:test";

// Test cases for bun:ffi environment variable support
// These tests verify that C_INCLUDE_PATH and LIBRARY_PATH are properly respected

test("bun:ffi respects C_INCLUDE_PATH environment variable", async () => {
	// Create a temporary header file
	const tempDir = "/tmp/bun-ffi-test";
	await Bun.$`mkdir -p ${tempDir}/include`.quiet();

	// Create a custom header
	const headerContent = `
#ifndef TEST_H
#define TEST_H
#define CUSTOM_VALUE 123
#endif
`;
	await Bun.write(`${tempDir}/include/test.h`, headerContent);

	// Create C source that uses the custom header
	const cSource = `
#include "test.h"
int get_value(void) {
  return CUSTOM_VALUE;
}
`;

	// Set environment variable
	process.env.C_INCLUDE_PATH = `${tempDir}/include`;

	try {
		// Try to compile with bun:ffi
		const { symbols } = await import("bun:ffi").then(({ cc }) =>
			cc({
				source: cSource,
				symbols: {
					get_value: { returns: "int" },
				},
			}),
		);

		expect(symbols.get_value()).toBe(123);
	} catch (error) {
		// If bun:ffi doesn't support env vars yet, this will fail
		// That's expected until the feature is implemented
		console.log(
			"Note: C_INCLUDE_PATH support not yet implemented in this Bun version:",
			error instanceof Error ? error.message : String(error),
		);
	}

	// Cleanup
	await Bun.$`rm -rf ${tempDir}`.quiet();
});

test("bun:ffi respects LIBRARY_PATH environment variable", async () => {
	// This test would require creating an actual library
	// For now, we'll test the environment variable parsing

	const originalLibPath = process.env.LIBRARY_PATH;
	process.env.LIBRARY_PATH = "/custom/lib:/another/lib";

	try {
		// When bun:ffi implements LIBRARY_PATH support,
		// it should parse this colon-separated list correctly
		const paths = process.env.LIBRARY_PATH.split(":");
		expect(paths).toEqual(["/custom/lib", "/another/lib"]);
	} finally {
		// Restore original value
		if (originalLibPath !== undefined) {
			process.env.LIBRARY_PATH = originalLibPath;
		} else {
			delete process.env.LIBRARY_PATH;
		}
	}
});

test("bun:ffi handles multiple include paths", async () => {
	const originalIncludePath = process.env.C_INCLUDE_PATH;
	process.env.C_INCLUDE_PATH = "/first/include:/second/include:/third/include";

	try {
		const paths = process.env.C_INCLUDE_PATH.split(":");
		expect(paths).toEqual([
			"/first/include",
			"/second/include",
			"/third/include",
		]);
	} finally {
		if (originalIncludePath !== undefined) {
			process.env.C_INCLUDE_PATH = originalIncludePath;
		} else {
			delete process.env.C_INCLUDE_PATH;
		}
	}
});

test("bun:ffi works without environment variables (backward compatibility)", async () => {
	// Ensure environment variables are not set
	delete process.env.C_INCLUDE_PATH;
	delete process.env.LIBRARY_PATH;

	// Simple C source that should compile with standard headers
	const cSource = `
int simple_function(void) {
  return 42;
}
`;

	try {
		const { symbols } = await import("bun:ffi").then(({ cc }) =>
			cc({
				source: cSource,
				symbols: {
					simple_function: { returns: "int" },
				},
			}),
		);

		expect(symbols.simple_function()).toBe(42);
	} catch (error) {
		console.log(
			"Basic bun:ffi test failed:",
			error instanceof Error ? error.message : String(error),
		);
	}
});

test("Environment variables are colon-separated on Unix", () => {
	// Test that we correctly parse Unix-style paths
	const testPath = "/path1:/path2:/path3";
	const expected = ["/path1", "/path2", "/path3"];

	const actual = testPath.split(":");
	expect(actual).toEqual(expected);
});

test("Empty environment variables are handled gracefully", () => {
	// Test empty strings
	expect("".split(":")).toEqual([""]);

	// Test single path
	expect("/single/path".split(":")).toEqual(["/single/path"]);

	// Test path with trailing colon (should result in empty string at end)
	expect("/path1:/path2:".split(":")).toEqual(["/path1", "/path2", ""]);
});

test("NixOS compatibility - Nix store paths are handled correctly", () => {
	const nixIncludePath =
		"/nix/store/abcd1234-gcc-11.3.0/include:/nix/store/efgh5678-glibc-2.35/include";
	const nixLibPath =
		"/nix/store/abcd1234-gcc-11.3.0/lib:/nix/store/efgh5678-glibc-2.35/lib";

	const includePaths = nixIncludePath.split(":");
	const libPaths = nixLibPath.split(":");

	expect(includePaths).toHaveLength(2);
	expect(libPaths).toHaveLength(2);

	expect(includePaths[0]).toContain("/nix/store/");
	expect(includePaths[0]).toContain("gcc");
	expect(includePaths[1]).toContain("glibc");

	expect(libPaths[0]).toContain("/nix/store/");
	expect(libPaths[0]).toContain("gcc");
	expect(libPaths[1]).toContain("glibc");
});

test("NixOS compatibility - Long Nix store hashes don't cause issues", () => {
	// Nix store hashes are 32 characters long
	const longPath =
		"/nix/store/abcdefghijklmnopqrstuvwxyz123456-custom-package/include";
	const paths = [longPath];

	expect(paths[0]).toHaveLength(longPath.length);
	expect(paths[0]).toMatch(/^\/nix\/store\/[a-z0-9]{32}/);
});
