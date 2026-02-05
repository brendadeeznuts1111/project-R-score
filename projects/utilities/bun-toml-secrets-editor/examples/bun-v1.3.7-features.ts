#!/usr/bin/env bun
/**
 * Bun v1.3.7 Features Showcase
 *
 * This example demonstrates all new features in Bun v1.3.7:
 * - Bun.wrapAnsi() - ANSI-aware text wrapping (88x faster)
 * - Bun.JSON5 - Native JSON5 parsing and stringification
 * - Bun.JSONL - Streaming JSONL parsing
 * - Header case preservation - Exact header casing in fetch()
 * - CPU/Heap profiling - Markdown profiling output
 * - Buffer.swap16/swap64 - Fast byte swapping
 * - Bun.stringWidth with GB9c - Unicode grapheme breaking
 * - WebSocket URL credentials - Basic auth in WebSocket URLs
 */

// ============================================================================
// 1. Bun.wrapAnsi() - ANSI-aware text wrapping (88x faster than wrap-ansi)
// ============================================================================

function demonstrateWrapAnsi(): void {
	console.log("\n" + "=".repeat(60));
	console.log("1. Bun.wrapAnsi() - ANSI-aware text wrapping");
	console.log("=".repeat(60));

	// Check if available
	if (typeof Bun === "undefined" || !("wrapAnsi" in Bun)) {
		console.log("❌ Bun.wrapAnsi() not available (requires Bun v1.3.7+)");
		return;
	}

	console.log("✅ Using native Bun.wrapAnsi()\n");

	// Example 1: Basic wrapping with ANSI colors
	const coloredText =
		"\x1b[31mThis is a long red text that needs wrapping at 30 columns\x1b[0m";
	console.log("Original:");
	console.log(coloredText);
	console.log("\nWrapped at 30 columns:");
	const wrapped1 = (Bun as any).wrapAnsi(coloredText, 30);
	console.log(wrapped1);

	// Example 2: Hard wrap (break words longer than columns)
	const longWord = "\x1b[32mSupercalifragilisticexpialidocious\x1b[0m";
	console.log("\nHard wrap (break long words):");
	const wrapped2 = (Bun as any).wrapAnsi(longWord, 10, { hard: true });
	console.log(wrapped2);

	// Example 3: No trim (preserve leading/trailing whitespace)
	const spacedText = "\x1b[34m   Indented blue text   \x1b[0m";
	console.log("\nWithout trim:");
	const wrapped3 = (Bun as any).wrapAnsi(spacedText, 20, { trim: false });
	console.log(JSON.stringify(wrapped3));

	// Example 4: OSC 8 hyperlinks support
	const linkText =
		"\x1b]8;;https://bun.sh\x1b\\Visit Bun.sh\x1b]8;;\x1b\\ for more info";
	console.log("\nWith hyperlinks:");
	const wrapped4 = (Bun as any).wrapAnsi(linkText, 20);
	console.log(wrapped4);

	// Performance note
	console.log("\n📊 Performance: 88x faster than wrap-ansi npm package");
}

// ============================================================================
// 2. Bun.JSON5 - Native JSON5 parsing and stringification
// ============================================================================

function demonstrateJSON5(): void {
	console.log("\n" + "=".repeat(60));
	console.log("2. Bun.JSON5 - Native JSON5 support");
	console.log("=".repeat(60));

	// Check if available
	if (typeof Bun === "undefined" || !("JSON5" in Bun)) {
		console.log("❌ Bun.JSON5 not available (requires Bun v1.3.7+)");
		return;
	}

	console.log("✅ Using native Bun.JSON5\n");

	// Example 1: Parse JSON5 with comments
	const json5String = `{
		// Application configuration
		name: 'my-app',
		version: "1.0.0",
		port: 3000,
		enabled: true,
		/* Multi-line comment
		   explaining the features array */
		features: ['auth', 'api', 'websocket',],  // trailing comma
		settings: {
			debug: false,
			retryCount: 0x5,  // hexadecimal number
		},
	}`;

	console.log("Parsing JSON5 with comments, trailing commas, etc:");
	console.log(json5String);

	const parsed = (Bun as any).JSON5.parse(json5String);
	console.log("\nParsed result:");
	console.log(JSON.stringify(parsed, null, 2));

	// Example 2: Stringify to JSON5
	const config = {
		app: {
			name: "bun-toml-secrets-editor",
			version: "1.0.0",
		},
		features: ["INTERACTIVE", "PREMIUM"],
	};

	console.log("\nStringifying object to JSON5:");
	const json5Output = (Bun as any).JSON5.stringify(config, null, 2);
	console.log(json5Output);

	// Example 3: Import .json5 file directly (demonstration)
	console.log("\n💡 Tip: You can import .json5 files directly:");
	console.log("   import config from './config.json5';");
}

// ============================================================================
// 3. Bun.JSONL - Streaming JSONL parsing
// ============================================================================

function demonstrateJSONL(): void {
	console.log("\n" + "=".repeat(60));
	console.log("3. Bun.JSONL - Streaming JSONL parsing");
	console.log("=".repeat(60));

	// Check if available
	if (typeof Bun === "undefined" || !("JSONL" in Bun)) {
		console.log("❌ Bun.JSONL not available (requires Bun v1.3.7+)");
		return;
	}

	console.log("✅ Using native Bun.JSONL\n");

	// Example 1: Parse complete JSONL string
	const jsonlString = `{"name":"Alice","action":"login"}
{"name":"Bob","action":"upload"}
{"name":"Charlie","action":"download"}`;

	console.log("Parsing JSONL string:");
	console.log(jsonlString);

	const parsed = (Bun as any).JSONL.parse(jsonlString);
	console.log("\nParsed result:");
	parsed.forEach((record: any, i: number) => {
		console.log(`  ${i + 1}. ${record.name}: ${record.action}`);
	});

	// Example 2: Parse from Uint8Array with UTF-8 BOM handling
	const encoder = new TextEncoder();
	const buffer = encoder.encode(jsonlString);
	console.log("\nParsing from Uint8Array:");
	const fromBuffer = (Bun as any).JSONL.parse(buffer);
	console.log(`  Parsed ${fromBuffer.length} records from buffer`);

	// Example 3: Chunk-based streaming parse
	console.log("\nChunk-based parsing (simulating streaming):");
	const chunk1 = '{"id":1,"name":"Alice"}\n{"id":2,"name';
	const chunk2 = ':"Bob"}\n{"id":3,"name":"Charlie"}\n';

	const result1 = (Bun as any).JSONL.parseChunk(chunk1);
	console.log(
		`  Chunk 1: ${result1.values.length} records, ${result1.read} chars consumed, done: ${result1.done}`,
	);

	const result2 = (Bun as any).JSONL.parseChunk(chunk2);
	console.log(
		`  Chunk 2: ${result2.values.length} records, ${result2.read} chars consumed, done: ${result2.done}`,
	);
}

// ============================================================================
// 4. Header Case Preservation - Exact casing in fetch()
// ============================================================================

async function demonstrateHeaderCasePreservation(): Promise<void> {
	console.log("\n" + "=".repeat(60));
	console.log("4. Header Case Preservation in fetch()");
	console.log("=".repeat(60));

	console.log("✅ Bun v1.3.7+ preserves exact header casing\n");

	console.log("Headers are now sent with their original casing:");
	console.log('  "Authorization": "Bearer token123" → sent as "Authorization"');
	console.log('  "Content-Type": "application/json" → sent as "Content-Type"');
	console.log('  "X-Custom-Header": "value" → sent as "X-Custom-Header"\n');

	// Example: Make a request with specific header casing
	const headers = {
		Accept: "application/json",
		"User-Agent": "Bun-v1.3.7-Example/1.0",
		"X-Request-ID": `req-${Date.now()}`,
		Authorization: "Bearer example-token",
	};

	console.log("Example headers object:");
	console.log(JSON.stringify(headers, null, 2));

	console.log(
		"\n💡 This fixes compatibility with APIs that require exact header names.",
	);
	console.log(
		"   Previously, Bun would lowercase all headers (e.g., 'authorization').",
	);

	// Note: We don't actually make the fetch call to avoid external dependencies
	// but we show how it would work:
	console.log("\nExample fetch call:");
	console.log(`
await fetch("https://api.example.com/data", {
  headers: {
    "Authorization": "Bearer token123", // sent as "Authorization"
    "Content-Type": "application/json", // sent as "Content-Type"
    "X-Custom-Header": "value",         // sent as "X-Custom-Header"
  },
});
`);
}

// ============================================================================
// 5. Buffer.swap16/swap64 - Fast byte swapping
// ============================================================================

function demonstrateBufferSwapping(): void {
	console.log("\n" + "=".repeat(60));
	console.log("5. Buffer.swap16/swap64 - Fast byte swapping");
	console.log("=".repeat(60));

	console.log("✅ Bun v1.3.7: 1.8x faster swap16, 3.6x faster swap64\n");

	// Example 1: swap16 for UTF-16 encoding conversion
	const buf16 = Buffer.from([0x48, 0x00, 0x65, 0x00, 0x6c, 0x00, 0x6c, 0x00]); // "Hell" in UTF-16LE
	console.log("Buffer.swap16() for UTF-16 conversion:");
	console.log(`  Original: ${buf16.toString("hex")}`);
	buf16.swap16();
	console.log(`  After swap16: ${buf16.toString("hex")}`);
	console.log(`  As UTF-16BE: ${buf16.toString("utf16le")}`);

	// Example 2: swap64 for 64-bit integer endianness
	const buf64 = Buffer.alloc(8);
	buf64.writeBigUInt64LE(BigInt(0x0102030405060708n));
	console.log("\nBuffer.swap64() for 64-bit integer endianness:");
	console.log(`  Original (LE): 0x${buf64.toString("hex")}`);
	buf64.swap64();
	console.log(`  After swap64:  0x${buf64.toString("hex")}`);
	console.log(`  Read as BE: 0x${buf64.readBigUInt64BE().toString(16)}`);

	// Performance note
	console.log("\n📊 Performance improvements:");
	console.log("  swap16: 1.00 μs → 0.56 μs (1.8x faster)");
	console.log("  swap64: 2.02 μs → 0.56 μs (3.6x faster)");
}

// ============================================================================
// 6. Bun.stringWidth with GB9c Support - Unicode grapheme breaking
// ============================================================================

function demonstrateStringWidthGB9c(): void {
	console.log("\n" + "=".repeat(60));
	console.log("6. Bun.stringWidth with GB9c (Indic Conjunct) Support");
	console.log("=".repeat(60));

	if (typeof Bun === "undefined" || !("stringWidth" in Bun)) {
		console.log("❌ Bun.stringWidth not available");
		return;
	}

	console.log("✅ Fixed grapheme breaking for Indic scripts (GB9c rule)\n");

	// Example 1: Devanagari conjuncts (previously broken, now fixed)
	const devanagariExamples = [
		{ text: "क", desc: "Ka (single character)" },
		{ text: "क्ष", desc: "Ka+Virama+Ssa (conjunct)" },
		{ text: "क्‍ष", desc: "Ka+Virama+ZWJ+Ssa (with ZWJ)" },
		{ text: "क्क्क", desc: "Ka+Virama+Ka+Virama+Ka (multiple conjuncts)" },
	];

	console.log(
		"Devanagari conjuncts (now correctly treated as single graphemes):",
	);
	for (const { text, desc } of devanagariExamples) {
		const width = (Bun as any).stringWidth(text);
		console.log(`  "${text}" (${desc})`);
		console.log(`    stringWidth: ${width}`);
	}

	// Example 2: Other Unicode features
	console.log("\nOther Unicode width calculations:");
	const examples = [
		{ text: "Hello", desc: "ASCII" },
		{ text: "🇺🇸", desc: "Flag emoji (2 columns)" },
		{ text: "👨‍👩‍👧‍👦", desc: "Family emoji (2 columns)" },
		{ text: "日本語", desc: "CJK (2 columns each)" },
		{ text: "\x1b[32mGreen\x1b[0m", desc: "ANSI codes (0 columns)" },
	];

	for (const { text, desc } of examples) {
		const width = (Bun as any).stringWidth(text);
		console.log(`  "${text}" (${desc}): ${width} columns`);
	}

	console.log("\n💡 GB9c support reduces table size from ~70KB to ~51KB");
}

// ============================================================================
// 7. WebSocket URL Credentials - Basic auth in WebSocket URLs
// ============================================================================

function demonstrateWebSocketCredentials(): void {
	console.log("\n" + "=".repeat(60));
	console.log("7. WebSocket URL Credentials Support");
	console.log("=".repeat(60));

	console.log("✅ Bun v1.3.7 forwards URL credentials as Basic Auth headers\n");

	console.log("Example WebSocket connections:");
	console.log(`
// Credentials automatically forwarded as Authorization header
const ws1 = new WebSocket("ws://username:password@example.com/socket");
// Sends: Authorization: Basic <base64(username:password)>

// User-provided Authorization header takes precedence
const ws2 = new WebSocket("ws://user:pass@example.com/socket", {
  headers: {
    Authorization: "Bearer custom-token", // This will be used
  },
});
`);

	console.log("💡 This fixes compatibility with:");
	console.log("   - Puppeteer connecting to remote browser instances");
	console.log("   - Services like Bright Data's scraping browser");
	console.log("   - Any WebSocket service requiring URL-based authentication");
}

// ============================================================================
// 8. CPU Profiling - Markdown output
// ============================================================================

function demonstrateCPProfiling(): void {
	console.log("\n" + "=".repeat(60));
	console.log("8. CPU Profiling with Markdown Output");
	console.log("=".repeat(60));

	console.log("✅ Bun v1.3.7: --cpu-prof-md flag for Markdown profiles\n");

	console.log("Usage:");
	console.log("  # Generate markdown profile only");
	console.log("  bun --cpu-prof-md script.js");
	console.log("");
	console.log("  # Generate both Chrome DevTools JSON and markdown");
	console.log("  bun --cpu-prof --cpu-prof-md script.js");
	console.log("");
	console.log("  # Custom filename and directory");
	console.log(
		"  bun --cpu-prof-md --cpu-prof-name my-profile --cpu-prof-dir ./profiles script.js",
	);

	console.log("\nMarkdown output includes:");
	console.log("  📊 Summary table (duration, samples, interval)");
	console.log("  🔥 Hot functions ranked by self-time");
	console.log("  🌳 Call tree with total time");
	console.log("  🔍 Function details with caller/callee");
	console.log("  📁 File breakdown by time spent");

	console.log("\nTry it:");
	console.log("  bun run profile:cpu:advanced src/main.ts --both");
}

// ============================================================================
// 9. Heap Profiling - Memory leak detection
// ============================================================================

function demonstrateHeapProfiling(): void {
	console.log("\n" + "=".repeat(60));
	console.log("9. Heap Profiling with --heap-prof");
	console.log("=".repeat(60));

	console.log("✅ Bun v1.3.7: Heap profiling for memory leak detection\n");

	console.log("Usage:");
	console.log("  # Generate V8-compatible heap snapshot");
	console.log("  bun --heap-prof script.js");
	console.log("");
	console.log("  # Generate markdown heap profile");
	console.log("  bun --heap-prof-md script.js");
	console.log("");
	console.log("  # Custom output location");
	console.log(
		"  bun --heap-prof --heap-prof-dir ./profiles --heap-prof-name snapshot script.js",
	);

	console.log("\nMarkdown format includes:");
	console.log("  📊 Heap summary (size, objects, GC roots)");
	console.log("  📈 Top types by retained size");
	console.log("  🔍 Searchable object listings");
	console.log("  🔗 Retainer chains");

	console.log("\nUseful grep commands:");
	console.log("  grep 'type=Function' profile.md      # Find Function objects");
	console.log("  grep 'size=[0-9]\\{5,\\}' profile.md  # Find objects >= 10KB");
	console.log("  grep 'gcroot=1' profile.md           # Find GC roots");

	console.log("\nTry it:");
	console.log("  bun run profile:heap:advanced src/main.ts --both");
}

// ============================================================================
// 10. S3 presign() with contentDisposition and type
// ============================================================================

function demonstrateS3Presign(): void {
	console.log("\n" + "=".repeat(60));
	console.log("10. S3 presign() with contentDisposition and type");
	console.log("=".repeat(60));

	console.log(
		"✅ Bun v1.3.7: S3File.presign() now supports contentDisposition and type\n",
	);

	console.log("Example:");
	console.log(`
import { S3Client } from "bun";

const s3 = new S3Client({
  region: "us-east-1",
  bucket: "my-bucket",
  // ... credentials
});

const file = s3.file("report.pdf");

const url = file.presign({
  method: "GET",
  expiresIn: 900,
  contentDisposition: 'attachment; filename="quarterly-report.pdf"',
  type: "application/octet-stream",
});
// URL now includes:
//   response-content-disposition=attachment%3B%20filename%3D%22quarterly-report.pdf%22
//   response-content-type=application%2Foctet-stream
`);

	console.log("💡 Use this for:");
	console.log(
		"   - Forcing browser download (Content-Disposition: attachment)",
	);
	console.log("   - Setting specific MIME types for presigned URLs");
	console.log("   - Custom filenames for downloaded files");
}

// ============================================================================
// 11. replMode option for Bun.Transpiler
// ============================================================================

function demonstrateReplMode(): void {
	console.log("\n" + "=".repeat(60));
	console.log("11. replMode option for Bun.Transpiler");
	console.log("=".repeat(60));

	console.log("✅ Bun v1.3.7: Build Node.js-compatible REPLs\n");

	console.log("Features:");
	console.log("  • Variable hoisting (var/let/const persist across lines)");
	console.log("  • const → let conversion (allows re-declaration)");
	console.log("  • Expression result capture");
	console.log("  • Object literal auto-detection");
	console.log("  • Top-level await support");

	console.log("\nExample:");
	console.log(`
import vm from "node:vm";

const transpiler = new Bun.Transpiler({
  loader: "tsx",
  replMode: true,  // Enable REPL mode
});

const context = vm.createContext({ console, Promise });

async function repl(code: string) {
  const transformed = transpiler.transformSync(code);
  const result = await vm.runInContext(transformed, context);
  return result.value;
}

// Variables persist across lines
await repl("var x = 10");     // 10
await repl("x + 5");          // 15

// Classes and functions are hoisted
await repl("class Counter {}");
await repl("new Counter()");  // Counter {}

// Object literals auto-detected
await repl("{a: 1, b: 2}");   // {a: 1, b: 2}

// Top-level await works
await repl("await Promise.resolve(42)");  // 42
`);
}

// ============================================================================
// 12. Other improvements
// ============================================================================

function demonstrateOtherImprovements(): void {
	console.log("\n" + "=".repeat(60));
	console.log("12. Other Bun v1.3.7 Improvements");
	console.log("=".repeat(60));

	console.log("HTTP & Networking:");
	console.log("  • Maximum HTTP headers increased: 100 → 200");
	console.log("  • WebSocket URL credentials forwarded as Basic Auth");
	console.log("  • fetch() preserves header case exactly as defined");
	console.log("");

	console.log("Performance:");
	console.log("  • Buffer.swap16(): 1.8x faster");
	console.log("  • Buffer.swap64(): 3.6x faster");
	console.log("  • Bun.wrapAnsi(): 88x faster than wrap-ansi npm");
	console.log("  • String.isWellFormed/toWellFormed: 5.2-5.4x faster");
	console.log("  • RegExp matchAll/replace reimplemented in C++");
	console.log("");

	console.log("Package Management:");
	console.log("  • bun pm pack re-reads package.json after lifecycle scripts");
	console.log("  • Matches npm's behavior for tools like clean-package");
	console.log("");

	console.log("Debugging:");
	console.log("  • node:inspector Profiler API supported");
	console.log("  • Bun.profile() fixed for subsequent calls");
	console.log("  • --cpu-prof-md for Markdown CPU profiles");
	console.log("  • --heap-prof and --heap-prof-md for heap profiling");
	console.log("");

	console.log("Unicode:");
	console.log("  • Bun.stringWidth: GB9c support for Indic scripts");
	console.log("  • Devanagari conjuncts correctly measured");
	console.log("  • Table size reduced: ~70KB → ~51KB");
}

// ============================================================================
// Main - Run all demonstrations
// ============================================================================

async function main(): Promise<void> {
	console.log("\n" + "🚀".repeat(30));
	console.log("     Bun v1.3.7 Features Showcase");
	console.log("🚀".repeat(30));
	console.log(`\nBun version: ${Bun.version || "unknown"}`);

	// Run demonstrations
	demonstrateWrapAnsi();
	demonstrateJSON5();
	demonstrateJSONL();
	await demonstrateHeaderCasePreservation();
	demonstrateBufferSwapping();
	demonstrateStringWidthGB9c();
	demonstrateWebSocketCredentials();
	demonstrateCPProfiling();
	demonstrateHeapProfiling();
	demonstrateS3Presign();
	demonstrateReplMode();
	demonstrateOtherImprovements();

	console.log("\n" + "=".repeat(60));
	console.log("✨ All demonstrations complete!");
	console.log("=".repeat(60));
	console.log("\nRun specific demonstrations:");
	console.log("  bun examples/bun-v1.3.7-features.ts");
	console.log("\nFor more examples, see:");
	console.log("  - examples/profiling/");
	console.log("  - examples/cli/");
	console.log("  - examples/secrets/");
}

if (import.meta.main) {
	main().catch(console.error);
}

export {
	demonstrateWrapAnsi,
	demonstrateJSON5,
	demonstrateJSONL,
	demonstrateHeaderCasePreservation,
	demonstrateBufferSwapping,
	demonstrateStringWidthGB9c,
	demonstrateWebSocketCredentials,
	demonstrateCPProfiling,
	demonstrateHeapProfiling,
	demonstrateS3Presign,
	demonstrateReplMode,
	demonstrateOtherImprovements,
};
