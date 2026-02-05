// test-ffi-homebrew.ts - Test FFI with Homebrew libraries
import { cc } from "bun:ffi";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

async function runHomebrewFFITest() {
	console.log(`🔧 Bun v${Bun.version} FFI Test (Homebrew)\n`);

	// Set up Homebrew paths
	const brewPrefix = "/opt/homebrew"; // Apple Silicon Mac
	const includePath = `${brewPrefix}/include`;
	const libPath = `${brewPrefix}/lib`;

	process.env.C_INCLUDE_PATH = includePath;
	process.env.LIBRARY_PATH = libPath;

	console.log("Environment:");
	console.log(`  C_INCLUDE_PATH: ${process.env.C_INCLUDE_PATH}`);
	console.log(`  LIBRARY_PATH: ${process.env.LIBRARY_PATH}`);

	// Create temp directory
	const tmpDir = join(process.cwd(), ".tmp-ffi-test");
	await mkdir(tmpDir, { recursive: true });

	// Test basic FFI
	console.log("\n1. Basic FFI test:");
	const basicFile = join(tmpDir, "basic.c");
	await writeFile(
		basicFile,
		`
int add(int a, int b) {
  return a + b;
}
`,
	);

	try {
		const { symbols: basic } = cc({
			source: basicFile,
			symbols: {
				add: { returns: "int", args: ["int", "int"] },
			},
		});

		const result = basic.add(5, 3);
		console.log(`   5+3=${result} ${result === 8 ? "✅" : "❌"}`);
	} catch (e: any) {
		console.error("   ❌ Failed:", e.message);
	}

	// Cleanup
	await unlink(basicFile).catch(() => {});
	await Bun.$`rmdir ${tmpDir} 2>/dev/null || true`;

	console.log("\n✨ Basic FFI test complete!");
	console.log("\nFor full library support, install:");
	console.log("  brew install libxml2 zlib");
	console.log("Then run with proper paths set.");
}

runHomebrewFFITest().catch(console.error);
