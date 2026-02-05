// test-ffi-nix.ts - Verifies v1.3.7 C_INCLUDE_PATH support
import { cc } from "bun:ffi";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

async function runFFITest() {
	console.log(`🔧 Bun v${Bun.version} FFI Test\n`);

	// Check environment
	const hasIncludePath = !!process.env.C_INCLUDE_PATH;
	const hasLibPath = !!process.env.LIBRARY_PATH;

	console.log("Environment:");
	console.log(`  C_INCLUDE_PATH: ${hasIncludePath ? "✅ set" : "❌ not set"}`);
	console.log(`  LIBRARY_PATH: ${hasLibPath ? "✅ set" : "❌ not set"}`);

	if (!hasIncludePath) {
		console.log("\n⚠️  Run with: nix-shell --run 'bun run test-ffi-nix.ts'");
		process.exit(1);
	}

	// Create temp directory for our C files
	const tmpDir = join(process.cwd(), ".tmp-ffi-test");
	await mkdir(tmpDir, { recursive: true });

	// Test 1: Basic compilation (works everywhere)
	console.log("\n1. Basic FFI (no external deps):");
	const basicFile = join(tmpDir, "basic.c");
	await writeFile(
		basicFile,
		`
int multiply(int a, int b) {
  return a * b;
}
`,
	);

	try {
		const { symbols: basic } = cc({
			source: basicFile,
			symbols: {
				multiply: {
					returns: "int",
					args: ["int", "int"],
				},
			},
		});

		const result = basic.multiply(6, 7);
		console.log(`   6×7=${result} ${result === 42 ? "✅" : "❌"}`);
	} catch (e: any) {
		console.error("   ❌ Failed:", e.message);
	}

	// Test 2: libxml2 from C_INCLUDE_PATH (Nix feature!)
	console.log("\n2. libxml2 from Nix (C_INCLUDE_PATH test):");
	const xmlFile = join(tmpDir, "xmltest.c");
	await writeFile(
		xmlFile,
		`
#include <libxml/parser.h>
#include <string.h>

// Returns LIBXML_VERSION (should be > 20000)
int get_xml_version() {
  return LIBXML_VERSION;
}

// Check if a string looks like XML
int is_xml(const char* str) {
  return strstr(str, "<?xml") != NULL ? 1 : 0;
}
`,
	);

	try {
		const { symbols: xml } = cc({
			source: xmlFile,
			symbols: {
				get_xml_version: { returns: "int", args: [] },
				is_xml: { returns: "int", args: ["ptr"] },
			},
		});

		const version = xml.get_xml_version();
		console.log(
			`   libxml2 version: ${version} ${version > 20000 ? "✅" : "❌"}`,
		);

		const xmlTest = "<?xml version='1.0'?><rss/>";
		const isXml = xml.is_xml(Buffer.from(`${xmlTest}\0`)); // null-terminated!
		console.log(`   XML detection: ${isXml === 1 ? "✅" : "❌"}`);
	} catch (e: any) {
		console.error("   ❌ Failed:", e.message);
		console.log("      Make sure libxml2 is in C_INCLUDE_PATH");
		console.log("      Current:", process.env.C_INCLUDE_PATH?.split(":")[0]);
	}

	// Test 3: zlib compression (LIBRARY_PATH test)
	console.log("\n3. zlib from Nix (LIBRARY_PATH test):");
	const zlibFile = join(tmpDir, "zlibtest.c");
	await writeFile(
		zlibFile,
		`
#include <zlib.h>
#include <string.h>

// Get zlib version string length (proves it's linked)
int get_zlib_version_length() {
  const char* v = zlibVersion();
  return v ? (int)strlen(v) : 0;
}

// Simple CRC32 calculation
unsigned long calc_crc(const char* data) {
  return crc32(0L, (const Bytef*)data, (uInt)strlen(data));
}
`,
	);

	try {
		const { symbols: zlib } = cc({
			source: zlibFile,
			symbols: {
				get_zlib_version_length: { returns: "int", args: [] },
				calc_crc: { returns: "u64", args: ["ptr"] }, // unsigned long
			},
		});

		const versionLen = zlib.get_zlib_version_length();
		console.log(
			`   zlib version length: ${versionLen} ${versionLen > 0 ? "✅" : "❌"}`,
		);

		const crc = zlib.calc_crc(Buffer.from("test\0"));
		console.log(`   CRC32 calculated: ${Number(crc) !== 0 ? "✅" : "❌"}`);
	} catch (e: any) {
		console.error("   ❌ Failed:", e.message);
		console.log("      Make sure zlib is in LIBRARY_PATH");
	}

	// Cleanup
	console.log("\n🧹 Cleaning up...");
	await unlink(basicFile).catch(() => {});
	await unlink(xmlFile).catch(() => {});
	await unlink(zlibFile).catch(() => {});
	await Bun.$`rmdir ${tmpDir} 2>/dev/null || true`;

	console.log("\n✨ FFI environment test complete!");
}

runFFITest().catch(console.error);
