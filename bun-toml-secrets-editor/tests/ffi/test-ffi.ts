// test-ffi.ts - Verify v1.3.7 FFI env vars work
import { cc } from "bun:ffi";

console.log("Testing bun:ffi with C_INCLUDE_PATH/LIBRARY_PATH...\n");

// Test 1: libxml2 availability (provided by Nix)
console.log("Test 1: libxml2 parsing");
try {
	const { symbols: xml } = cc({
		source: `
      #include <libxml/parser.h>
      #include <libxml/tree.h>
      
      int test_xml() {
        xmlDocPtr doc = xmlReadMemory("<rss/>", 6, NULL, NULL, 0);
        return doc ? 1 : 0;
      }
    `,
		symbols: {
			test_xml: { returns: "int", args: [] },
		},
	});

	console.log(xml.test_xml() === 1 ? "✅ PASS" : "❌ FAIL");
} catch (e: any) {
	console.error("❌ FAIL:", e.message);
}

// Test 2: zlib compression
console.log("\nTest 2: zlib compression");
try {
	const { symbols: zlib } = cc({
		source: `
      #include <zlib.h>
      int has_zlib() { return strlen(zlibVersion()) > 0; }
    `,
		symbols: {
			has_zlib: { returns: "int", args: [] },
		},
	});

	console.log(zlib.has_zlib() === 1 ? "✅ PASS" : "❌ FAIL");
} catch (e: any) {
	console.error("❌ FAIL:", e.message);
}

// Test 3: OpenSSL for hashing
console.log("\nTest 3: OpenSSL hashing");
try {
	const { symbols: openssl } = cc({
		source: `
      #include <openssl/sha.h>
      int test_sha256() {
        unsigned char hash[SHA256_DIGEST_LENGTH];
        SHA256("test", 4, hash);
        return hash[0] != 0;
      }
    `,
		symbols: {
			test_sha256: { returns: "int", args: [] },
		},
	});

	console.log(openssl.test_sha256() === 1 ? "✅ PASS" : "❌ FAIL");
} catch (e: any) {
	console.error("❌ FAIL:", e.message);
}

console.log("\n✨ All FFI tests complete!");
