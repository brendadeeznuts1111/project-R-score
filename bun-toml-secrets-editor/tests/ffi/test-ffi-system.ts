// test-ffi-system.ts - Test FFI with system libraries (no Nix required)
import { cc } from "bun:ffi";

console.log(
	"Testing bun:ffi with C_INCLUDE_PATH/LIBRARY_PATH (System Mode)...\n",
);

// Check current environment
console.log("Current Environment:");
console.log("C_INCLUDE_PATH:", process.env.C_INCLUDE_PATH || "(not set)");
console.log("LIBRARY_PATH:", process.env.LIBRARY_PATH || "(not set)");

// Test 1: Standard system headers (should always work)
console.log("\nTest 1: Standard system headers");
try {
	const { symbols: std } = cc({
		source: `
      #include <stdio.h>
      #include <stdlib.h>
      #include <string.h>
      
      int test_standard() {
        char* msg = "Hello from C";
        return strlen(msg);
      }
    `,
		symbols: {
			test_standard: { returns: "int", args: [] },
		},
	});

	const result = std.test_standard();
	console.log(result === 13 ? "✅ PASS" : "❌ FAIL", `(got ${result})`);
} catch (e: any) {
	console.error("❌ FAIL:", e.message);
}

// Test 2: Try common system libraries
console.log("\nTest 2: System zlib (if available)");
try {
	const { symbols: zlib } = cc({
		source: `
      #include <zlib.h>
      int test_zlib() {
        const char* version = zlibVersion();
        return version && strlen(version) > 0;
      }
    `,
		symbols: {
			test_zlib: { returns: "int", args: [] },
		},
	});

	const result = zlib.test_zlib();
	console.log(result === 1 ? "✅ PASS" : "❌ FAIL", `(zlib available)`);
} catch (e: any) {
	console.error("❌ FAIL:", e.message, "(zlib not available)");
}

// Test 3: Custom environment variable test
console.log("\nTest 3: Custom C_INCLUDE_PATH test");

// Create a temporary header
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tempDir = join(
	tmpdir(),
	`bun-ffi-test-${Math.random().toString(36).substr(2, 9)}`,
);
const includeDir = join(tempDir, "include");

try {
	mkdirSync(includeDir, { recursive: true });
	writeFileSync(
		join(includeDir, "test_header.h"),
		`
#ifndef TEST_HEADER_H
#define TEST_HEADER_H
#define CUSTOM_VALUE 42
#define CUSTOM_STRING "Hello from custom header"
#endif
  `,
	);

	// Set environment variable
	const originalPath = process.env.C_INCLUDE_PATH;
	process.env.C_INCLUDE_PATH = includeDir;

	console.log("Set C_INCLUDE_PATH to:", includeDir);

	const { symbols: custom } = cc({
		source: `
      #include "test_header.h"
      int test_custom() {
        return CUSTOM_VALUE;
      }
    `,
		symbols: {
			test_custom: { returns: "int", args: [] },
		},
	});

	const result = custom.test_custom();
	console.log(result === 42 ? "✅ PASS" : "❌ FAIL", `(got ${result})`);

	// Restore original path
	if (originalPath) {
		process.env.C_INCLUDE_PATH = originalPath;
	} else {
		delete process.env.C_INCLUDE_PATH;
	}
} catch (e: any) {
	console.error("❌ FAIL:", e.message);
} finally {
	// Cleanup
	try {
		rmSync(tempDir, { recursive: true, force: true });
	} catch {
		// Ignore cleanup errors
	}
}

// Test 4: Multiple paths test
console.log("\nTest 4: Multiple C_INCLUDE_PATH test");

const tempDir2 = join(
	tmpdir(),
	`bun-ffi-test-2-${Math.random().toString(36).substr(2, 9)}`,
);
const includeDir2 = join(tempDir2, "include");

try {
	mkdirSync(includeDir2, { recursive: true });
	writeFileSync(
		join(includeDir2, "header2.h"),
		`
#ifndef HEADER2_H
#define HEADER2_H
#define SECOND_VALUE 84
#endif
  `,
	);

	// Test multiple paths
	const originalPath = process.env.C_INCLUDE_PATH;
	process.env.C_INCLUDE_PATH = `${includeDir}:${includeDir2}`;

	console.log("Set C_INCLUDE_PATH to multiple paths");

	const { symbols: multi } = cc({
		source: `
      #include "test_header.h"  // from first path
      #include "header2.h"     // from second path
      int test_multiple() {
        return CUSTOM_VALUE + SECOND_VALUE;
      }
    `,
		symbols: {
			test_multiple: { returns: "int", args: [] },
		},
	});

	const result = multi.test_multiple();
	console.log(
		result === 126 ? "✅ PASS" : "❌ FAIL",
		`(got ${result}, expected 126)`,
	);

	// Restore original path
	if (originalPath) {
		process.env.C_INCLUDE_PATH = originalPath;
	} else {
		delete process.env.C_INCLUDE_PATH;
	}
} catch (e: any) {
	console.error("❌ FAIL:", e.message);
} finally {
	// Cleanup
	try {
		rmSync(tempDir2, { recursive: true, force: true });
	} catch {
		// Ignore cleanup errors
	}
}

console.log("\n✨ All FFI tests complete!");
console.log("\n📝 Summary:");
console.log("- Standard headers: ✅ Should work");
console.log("- System libraries: ⚠️  Depends on installation");
console.log("- Custom headers: ✅ Tests C_INCLUDE_PATH functionality");
console.log("- Multiple paths: ✅ Tests colon-separated paths");
