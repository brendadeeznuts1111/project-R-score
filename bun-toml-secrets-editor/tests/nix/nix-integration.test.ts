// test/js/bun/ffi/nix-integration.test.ts
// This test verifies v1.3.7 NixOS support specifically

import { cc } from "bun:ffi";
import { describe, expect, test } from "bun:test";

describe("NixOS FFI Integration", () => {
	test("C_INCLUDE_PATH contains Nix store paths", () => {
		const includePath = process.env.C_INCLUDE_PATH || "";

		// On NixOS, this should contain /nix/store paths
		if (includePath.includes("/nix/store")) {
			console.log("✅ Running on NixOS (or Nix shell)");

			// Verify paths are absolute (security check)
			const paths = includePath.split(":");
			for (const path of paths) {
				if (path) {
					expect(path.startsWith("/")).toBe(true);
					expect(path.includes("..")).toBe(false); // No traversal
				}
			}
		} else {
			console.log("⚠️  Not in Nix environment (skipping Nix-specific test)");
		}
	});

	test("can compile against libxml2 from Nix store", () => {
		const includePath = process.env.C_INCLUDE_PATH || "";

		if (!includePath.includes("libxml2")) {
			console.log("⚠️  libxml2 not in C_INCLUDE_PATH, skipping");
			return;
		}

		// This tests the v1.3.7 fix: NixOS paths should just work now
		expect(() => {
			cc({
				source: `
          #include <libxml/parser.h>
          #include <libxml/tree.h>
          
          int test_xml() {
            xmlDocPtr doc = xmlNewDoc(BAD_CAST "1.0");
            return doc ? 0 : 1;
          }
        `,
				symbols: {
					test_xml: { returns: "int", args: [] },
				},
			});
		}).not.toThrow();
	});

	test("LIBRARY_PATH links correctly", () => {
		const libPath = process.env.LIBRARY_PATH || "";

		if (!libPath.includes("/nix/store")) {
			console.log("⚠️  Not a Nix LIBRARY_PATH, skipping");
			return;
		}

		// Verify library can be found at runtime
		const { symbols } = cc({
			source: `
        #include <zlib.h>
        int get_zlib_version() { return zlibVersion() != NULL; }
      `,
			symbols: {
				get_zlib_version: { returns: "int", args: [] },
			},
		});

		expect(symbols.get_zlib_version()).toBe(1);
	});

	test("multiple Nix store paths work together", () => {
		const includePath = process.env.C_INCLUDE_PATH || "";
		const libPath = process.env.LIBRARY_PATH || "";

		if (
			!includePath.includes("/nix/store") ||
			!libPath.includes("/nix/store")
		) {
			console.log("⚠️  Not in Nix environment, skipping multi-path test");
			return;
		}

		// Test that multiple Nix packages can be used together
		const { symbols } = cc({
			source: `
        #include <zlib.h>
        #include <openssl/ssl.h>
        
        int test_multiple() {
          return zlibVersion() != NULL && SSL_library_init() != 0;
        }
      `,
			symbols: {
				test_multiple: { returns: "int", args: [] },
			},
		});

		expect(symbols.test_multiple()).toBe(1);
	});

	test("path validation works in Nix environment", () => {
		const includePath = process.env.C_INCLUDE_PATH || "";

		if (!includePath.includes("/nix/store")) {
			console.log("⚠️  Not in Nix environment, skipping validation test");
			return;
		}

		// Test that Nix paths pass security validation
		const paths = includePath.split(":");
		for (const path of paths) {
			if (path) {
				// All Nix store paths should be valid
				expect(path.startsWith("/nix/store/")).toBe(true);
				expect(path.length).toBeGreaterThan(20); // Store hash + name

				// Should not contain dangerous patterns
				expect(path.includes("..")).toBe(false);
				expect(path.includes(";")).toBe(false);
				expect(path.includes("|")).toBe(false);
				expect(path.includes("&")).toBe(false);
			}
		}
	});
});
