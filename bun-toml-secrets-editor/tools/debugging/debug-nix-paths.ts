#!/usr/bin/env bun

console.log("🔍 Nix FFI Environment Debug\n");

const vars = ["C_INCLUDE_PATH", "LIBRARY_PATH", "PATH", "LD_LIBRARY_PATH"];

for (const v of vars) {
	const val = process.env[v];
	console.log(`${v}:`);
	if (val) {
		val.split(":").forEach((p) => {
			const exists = require("node:fs").existsSync(p);
			console.log(`  ${exists ? "✅" : "❌"} ${p}`);
		});
	} else {
		console.log("  (not set)");
	}
	console.log();
}

// Test compilation
console.log("🧪 Testing FFI compilation...");

try {
	const { cc } = require("bun:ffi");

	const { symbols } = cc({
		source: `
      #ifdef __has_include
        #if __has_include(<libxml/parser.h>)
          int has_libxml = 1;
        #else
          int has_libxml = 0;
        #endif
      #else
        int has_libxml = 0;
      #endif
      
      int check() { return has_libxml; }
    `,
		symbols: {
			check: { returns: "int", args: [] },
		},
	});

	console.log(
		`libxml2 available: ${symbols.check() === 1 ? "YES ✅" : "NO ❌"}`,
	);
} catch (e: any) {
	console.error("Compilation failed:", e.message);
}
