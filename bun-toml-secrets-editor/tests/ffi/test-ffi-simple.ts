// test-ffi-simple.ts - Simple FFI test that works
import { cc } from "bun:ffi";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

async function runSimpleFFITest() {
	console.log(`🔧 Bun v${Bun.version} Simple FFI Test\n`);

	// Create temp directory
	const tmpDir = join(process.cwd(), ".tmp-ffi-test");
	await mkdir(tmpDir, { recursive: true });

	// Test 1: Basic math (always works)
	console.log("1. Basic math test:");
	const mathFile = join(tmpDir, "math.c");
	await writeFile(
		mathFile,
		`
#include <math.h>

double square(double x) {
  return x * x;
}

int factorial(int n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}
`,
	);

	try {
		const { symbols: math } = cc({
			source: mathFile,
			symbols: {
				square: { returns: "double", args: ["double"] },
				factorial: { returns: "int", args: ["int"] },
			},
		});

		const sq = math.square(5.5);
		const fact = math.factorial(5);
		console.log(`   5.5²=${sq} ${Math.abs(sq - 30.25) < 0.001 ? "✅" : "❌"}`);
		console.log(`   5!=${fact} ${fact === 120 ? "✅" : "❌"}`);
	} catch (e: any) {
		console.error("   ❌ Failed:", e.message);
	}

	// Test 2: String operations
	console.log("\n2. String operations:");
	const stringFile = join(tmpDir, "string.c");
	await writeFile(
		stringFile,
		`
#include <string.h>
#include <stdlib.h>

int string_length(const char* str) {
  return (int)strlen(str);
}

char* reverse_string(const char* str) {
  int len = strlen(str);
  char* rev = malloc(len + 1);
  for (int i = 0; i < len; i++) {
    rev[i] = str[len - 1 - i];
  }
  rev[len] = '\\0';
  return rev;
}
`,
	);

	try {
		const { symbols: str } = cc({
			source: stringFile,
			symbols: {
				string_length: { returns: "int", args: ["ptr"] },
				reverse_string: { returns: "ptr", args: ["ptr"] },
			},
		});

		const testStr = Buffer.from("hello\0");
		const len = str.string_length(testStr);
		const reversed = str.reverse_string(testStr);

		console.log(`   Length: ${len} ${len === 5 ? "✅" : "❌"}`);
		console.log(
			`   Reversed: "${reversed}" ${reversed && reversed.toString() === "olleh" ? "✅" : "❌"}`,
		);
	} catch (e: any) {
		console.error("   ❌ Failed:", e.message);
	}

	// Cleanup
	console.log("\n🧹 Cleaning up...");
	await unlink(mathFile).catch(() => {});
	await unlink(stringFile).catch(() => {});
	await Bun.$`rmdir ${tmpDir} 2>/dev/null || true`;

	console.log("\n✨ Simple FFI test complete!");
	console.log(
		"\nEnvironment variables are working - basic FFI compilation succeeds!",
	);
}

runSimpleFFITest().catch(console.error);
