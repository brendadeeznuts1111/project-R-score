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
	console.info("\n" + "=".repeat(60));
	console.info("1. Bun.wrapAnsi() - ANSI-aware text wrapping");
	console.info("=".repeat(60));

	// Check if available
	if (typeof Bun === "undefined" || !("wrapAnsi" in Bun)) {
		console.info("❌ Bun.wrapAnsi() not available (requires Bun v1.3.7+)");
		return;
	}

	console.info("✅ Using native Bun.wrapAnsi()\n");

	// Example 1: Basic wrapping with ANSI colors
	const coloredText =
		"\x1b[31mThis is a long red text that needs wrapping at 30 columns\x1b[0m";
	console.info("Original:");
	console.info(coloredText);
	console.info("\nWrapped at 30 columns:");
	const wrapped1 = (Bun as any).wrapAnsi(coloredText, 30);
	console.info(wrapped1);

	// Example 2: Hard wrap (break words longer than columns)
	const longWord = "\x1b[32mSupercalifragilisticexpialidocious\x1b[0m";
	console.info("\nHard wrap (break long words):");
	const wrapped2 = (Bun as any).wrapAnsi(longWord, 10, { hard: true });
	console.info(wrapped2);

	// Example 3: No trim (preserve leading/trailing whitespace)
	const spacedText = "\x1b[34m   Indented blue text   \x1b[0m";
	console.info("\nWithout trim:");
	const wrapped3 = (Bun as any).wrapAnsi(spacedText, 20, { trim: false });
	console.info(JSON.stringify(wrapped3));

	// Example 4: OSC 8 hyperlinks support
	const linkText =
		"\x1b]8;;https://bun.sh\x1b\\Visit Bun.sh\x1b]8;;\x1b\\ for more info";
	console.info("\nWith hyperlinks:");
	const wrapped4 = (Bun as any).wrapAnsi(linkText, 20);
	console.info(wrapped4);

	// Performance note
	console.info("\n📊 Performance: 88x faster than wrap-ansi npm package");
}

// ============================================================================
// 2. Bun.JSON5 - Native JSON5 parsing and stringification
// ============================================================================

function demonstrateJSON5(): void {
	console.info("\n" + "=".repeat(60));
	console.info("2. Bun.JSON5 - Native JSON5 support");
	console.info("=".repeat(60));

	// Check if available
	if (typeof Bun === "undefined" || !("JSON5" in Bun)) {
		console.info("❌ Bun.JSON5 not available (requires Bun v1.3.7+)");
		return;
	}

	console.info("✅ Using native Bun.JSON5\n");

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

	console.info("Parsing JSON5 with comments, trailing commas, etc:");
	console.info(json5String);

	const parsed = (Bun as any).JSON5.parse(json5String);
	console.info("\nParsed result:");
	console.info(JSON.stringify(parsed, null, 2));

	// Example 2: Stringify to JSON5
	const config = {
		app: {
			name: "bun-toml-secrets-editor",
			version: "1.0.0",
		},
		features: ["INTERACTIVE", "PREMIUM"],
	};

	console.info("\nStringifying object to JSON5:");
	const json5Output = (Bun as any).JSON5.stringify(config, null, 2);
	console.info(json5Output);

	// Example 3: Import .json5 file directly (demonstration)
	console.info("\n💡 Tip: You can import .json5 files directly:");
	console.info("   import config from './config.json5';");
}

// ============================================================================
// 3. Bun.JSONL - Streaming JSONL parsing
// ============================================================================

function demonstrateJSONL(): void {
	console.info("\n" + "=".repeat(60));
	console.info("3. Bun.JSONL - Streaming JSONL parsing");
	console.info("=".repeat(60));

	// Check if available
	if (typeof Bun === "undefined" || !("JSONL" in Bun)) {
		console.info("❌ Bun.JSONL not available (requires Bun v1.3.7+)");
		return;
	}

	console.info("✅ Using native Bun.JSONL\n");

	// Example 1: Parse complete JSONL string
	const jsonlString = `{"name":"Alice","action":"login"}
{"name":"Bob","action":"upload"}
{"name":"Charlie","action":"download"}`;

	console.info("Parsing JSONL string:");
	console.info(jsonlString);

	const parsed = (Bun as any).JSONL.parse(jsonlString);
	console.info("\nParsed result:");
	parsed.forEach((record: any, i: number) => {
		console.info(`  ${i + 1}. ${record.name}: ${record.action}`);
	});

	// Example 2: Parse from Uint8Array with UTF-8 BOM handling
	const encoder = new TextEncoder();
	const buffer = encoder.encode(jsonlString);
	console.info("\nParsing from Uint8Array:");
	const fromBuffer = (Bun as any).JSONL.parse(buffer);
	console.info(`  Parsed ${fromBuffer.length} records from buffer`);

	// Example 3: Chunk-based streaming parse
	console.info("\nChunk-based parsing (simulating streaming):");
	const chunk1 = '{"id":1,"name":"Alice"}\n{"id":2,"name';
	const chunk2 = ':"Bob"}\n{"id":3,"name":"Charlie"}\n';

	const result1 = (Bun as any).JSONL.parseChunk(chunk1);
	console.info(
		`  Chunk 1: ${result1.values.length} records, ${result1.read} chars consumed, done: ${result1.done}`,
	);

	const result2 = (Bun as any).JSONL.parseChunk(chunk2);
	console.info(
		`  Chunk 2: ${result2.values.length} records, ${result2.read} chars consumed, done: ${result2.done}`,
	);
}

// ============================================================================
// 4. Header Case Preservation - Exact casing in fetch()
// ============================================================================

async function demonstrateHeaderCasePreservation(): Promise<void> {
	console.info("\n" + "=".repeat(60));
	console.info("4. Header Case Preservation in fetch()");
	console.info("=".repeat(60));

	console.info("✅ Bun v1.3.7+ preserves exact header casing\n");

	console.info("Headers are now sent with their original casing:");
	console.info('  "Authorization": "Bearer token123" → sent as "Authorization"');
	console.info('  "Content-Type": "application/json" → sent as "Content-Type"');
	console.info('  "X-Custom-Header": "value" → sent as "X-Custom-Header"\n');

	// Example: Make a request with specific header casing
	const headers = {
		Accept: "application/json",
		"User-Agent": "Bun-v1.3.7-Example/1.0",
		"X-Request-ID": `req-${Date.now()}`,
		Authorization: "Bearer example-token",
	};

	console.info("Example headers object:");
	console.info(JSON.stringify(headers, null, 2));

	console.info(
		"\n💡 This fixes compatibility with APIs that require exact header names.",
	);
	console.info(
		"   Previously, Bun would lowercase all headers (e.g., 'authorization').",
	);

	// Note: We don't actually make the fetch call to avoid external dependencies
	// but we show how it would work:
	console.info("\nExample fetch call:");
	console.info(`
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
	console.info("\n" + "=".repeat(60));
	console.info("5. Buffer.swap16/swap64 - Fast byte swapping");
	console.info("=".repeat(60));

	console.info("✅ Bun v1.3.7: 1.8x faster swap16, 3.6x faster swap64\n");

	// Example 1: swap16 for UTF-16 encoding conversion
	const buf16 = Buffer.from([0x48, 0x00, 0x65, 0x00, 0x6c, 0x00, 0x6c, 0x00]); // "Hell" in UTF-16LE
	console.info("Buffer.swap16() for UTF-16 conversion:");
	console.info(`  Original: ${buf16.toString("hex")}`);
	buf16.swap16();
	console.info(`  After swap16: ${buf16.toString("hex")}`);
	console.info(`  As UTF-16BE: ${buf16.toString("utf16le")}`);

	// Example 2: swap64 for 64-bit integer endianness
	const buf64 = Buffer.alloc(8);
	buf64.writeBigUInt64LE(BigInt(0x0102030405060708n));
	console.info("\nBuffer.swap64() for 64-bit integer endianness:");
	console.info(`  Original (LE): 0x${buf64.toString("hex")}`);
	buf64.swap64();
	console.info(`  After swap64:  0x${buf64.toString("hex")}`);
	console.info(`  Read as BE: 0x${buf64.readBigUInt64BE().toString(16)}`);

	// Performance note
	console.info("\n📊 Performance improvements:");
	console.info("  swap16: 1.00 μs → 0.56 μs (1.8x faster)");
	console.info("  swap64: 2.02 μs → 0.56 μs (3.6x faster)");
}

// ============================================================================
// 6. Bun.stringWidth with GB9c Support - Unicode grapheme breaking
// ============================================================================

function demonstrateStringWidthGB9c(): void {
	console.info("\n" + "=".repeat(60));
	console.info("6. Bun.stringWidth with GB9c (Indic Conjunct) Support");
	console.info("=".repeat(60));

	if (typeof Bun === "undefined" || !("stringWidth" in Bun)) {
		console.info("❌ Bun.stringWidth not available");
		return;
	}

	console.info("✅ Fixed grapheme breaking for Indic scripts (GB9c rule)\n");

	// Example 1: Devanagari conjuncts (previously broken, now fixed)
	const devanagariExamples = [
		{ text: "क", desc: "Ka (single character)" },
		{ text: "क्ष", desc: "Ka+Virama+Ssa (conjunct)" },
		{ text: "क्‍ष", desc: "Ka+Virama+ZWJ+Ssa (with ZWJ)" },
		{ text: "क्क्क", desc: "Ka+Virama+Ka+Virama+Ka (multiple conjuncts)" },
	];

	console.info(
		"Devanagari conjuncts (now correctly treated as single graphemes):",
	);
	for (const { text, desc } of devanagariExamples) {
		const width = (Bun as any).stringWidth(text);
		console.info(`  "${text}" (${desc})`);
		console.info(`    stringWidth: ${width}`);
	}

	// Example 2: Other Unicode features
	console.info("\nOther Unicode width calculations:");
	const examples = [
		{ text: "Hello", desc: "ASCII" },
		{ text: "🇺🇸", desc: "Flag emoji (2 columns)" },
		{ text: "👨‍👩‍👧‍👦", desc: "Family emoji (2 columns)" },
		{ text: "日本語", desc: "CJK (2 columns each)" },
		{ text: "\x1b[32mGreen\x1b[0m", desc: "ANSI codes (0 columns)" },
	];

	for (const { text, desc } of examples) {
		const width = (Bun as any).stringWidth(text);
		console.info(`  "${text}" (${desc}): ${width} columns`);
	}

	console.info("\n💡 GB9c support reduces table size from ~70KB to ~51KB");
}

// ============================================================================
// 7. WebSocket URL Credentials - Basic auth in WebSocket URLs
// ============================================================================

function demonstrateWebSocketCredentials(): void {
	console.info("\n" + "=".repeat(60));
	console.info("7. WebSocket URL Credentials Support");
	console.info("=".repeat(60));

	console.info("✅ Bun v1.3.7 forwards URL credentials as Basic Auth headers\n");

	console.info("Example WebSocket connections:");
	console.info(`
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

	console.info("💡 This fixes compatibility with:");
	console.info("   - Puppeteer connecting to remote browser instances");
	console.info("   - Services like Bright Data's scraping browser");
	console.info("   - Any WebSocket service requiring URL-based authentication");
}

// ============================================================================
// 8. CPU Profiling - Markdown output
// ============================================================================

function demonstrateCPProfiling(): void {
	console.info("\n" + "=".repeat(60));
	console.info("8. CPU Profiling with Markdown Output");
	console.info("=".repeat(60));

	console.info("✅ Bun v1.3.7: --cpu-prof-md flag for Markdown profiles\n");

	console.info("Usage:");
	console.info("  # Generate markdown profile only");
	console.info("  bun --cpu-prof-md script.js");
	console.info("");
	console.info("  # Generate both Chrome DevTools JSON and markdown");
	console.info("  bun --cpu-prof --cpu-prof-md script.js");
	console.info("");
	console.info("  # Custom filename and directory");
	console.info(
		"  bun --cpu-prof-md --cpu-prof-name my-profile --cpu-prof-dir ./profiles script.js",
	);

	console.info("\nMarkdown output includes:");
	console.info("  📊 Summary table (duration, samples, interval)");
	console.info("  🔥 Hot functions ranked by self-time");
	console.info("  🌳 Call tree with total time");
	console.info("  🔍 Function details with caller/callee");
	console.info("  📁 File breakdown by time spent");

	console.info("\nTry it:");
	console.info("  bun run profile:cpu:advanced src/main.ts --both");
}

// ============================================================================
// 9. Heap Profiling - Memory leak detection
// ============================================================================

function demonstrateHeapProfiling(): void {
	console.info("\n" + "=".repeat(60));
	console.info("9. Heap Profiling with --heap-prof");
	console.info("=".repeat(60));

	console.info("✅ Bun v1.3.7: Heap profiling for memory leak detection\n");

	console.info("Usage:");
	console.info("  # Generate V8-compatible heap snapshot");
	console.info("  bun --heap-prof script.js");
	console.info("");
	console.info("  # Generate markdown heap profile");
	console.info("  bun --heap-prof-md script.js");
	console.info("");
	console.info("  # Custom output location");
	console.info(
		"  bun --heap-prof --heap-prof-dir ./profiles --heap-prof-name snapshot script.js",
	);

	console.info("\nMarkdown format includes:");
	console.info("  📊 Heap summary (size, objects, GC roots)");
	console.info("  📈 Top types by retained size");
	console.info("  🔍 Searchable object listings");
	console.info("  🔗 Retainer chains");

	console.info("\nUseful grep commands:");
	console.info("  grep 'type=Function' profile.md      # Find Function objects");
	console.info("  grep 'size=[0-9]\\{5,\\}' profile.md  # Find objects >= 10KB");
	console.info("  grep 'gcroot=1' profile.md           # Find GC roots");

	console.info("\nTry it:");
	console.info("  bun run profile:heap:advanced src/main.ts --both");
}

// ============================================================================
// 10. S3 presign() with contentDisposition and type
// ============================================================================

function demonstrateS3Presign(): void {
	console.info("\n" + "=".repeat(60));
	console.info("10. S3 presign() with contentDisposition and type");
	console.info("=".repeat(60));

	console.info(
		"✅ Bun v1.3.7: S3File.presign() now supports contentDisposition and type\n",
	);

	console.info("Example:");
	console.info(`
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

	console.info("💡 Use this for:");
	console.info(
		"   - Forcing browser download (Content-Disposition: attachment)",
	);
	console.info("   - Setting specific MIME types for presigned URLs");
	console.info("   - Custom filenames for downloaded files");
}

// ============================================================================
// 11. replMode option for Bun.Transpiler
// ============================================================================

function demonstrateReplMode(): void {
	console.info("\n" + "=".repeat(60));
	console.info("11. replMode option for Bun.Transpiler");
	console.info("=".repeat(60));

	console.info("✅ Bun v1.3.7: Build Node.js-compatible REPLs\n");

	console.info("Features:");
	console.info("  • Variable hoisting (var/let/const persist across lines)");
	console.info("  • const → let conversion (allows re-declaration)");
	console.info("  • Expression result capture");
	console.info("  • Object literal auto-detection");
	console.info("  • Top-level await support");

	console.info("\nExample:");
	console.info(`
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
	console.info("\n" + "=".repeat(60));
	console.info("12. Other Bun v1.3.7 Improvements");
	console.info("=".repeat(60));

	console.info("HTTP & Networking:");
	console.info("  • Maximum HTTP headers increased: 100 → 200");
	console.info("  • WebSocket URL credentials forwarded as Basic Auth");
	console.info("  • fetch() preserves header case exactly as defined");
	console.info("");

	console.info("Performance:");
	console.info("  • Buffer.swap16(): 1.8x faster");
	console.info("  • Buffer.swap64(): 3.6x faster");
	console.info("  • Bun.wrapAnsi(): 88x faster than wrap-ansi npm");
	console.info("  • String.isWellFormed/toWellFormed: 5.2-5.4x faster");
	console.info("  • RegExp matchAll/replace reimplemented in C++");
	console.info("");

	console.info("Package Management:");
	console.info("  • bun pm pack re-reads package.json after lifecycle scripts");
	console.info("  • Matches npm's behavior for tools like clean-package");
	console.info("");

	console.info("Debugging:");
	console.info("  • node:inspector Profiler API supported");
	console.info("  • Bun.profile() fixed for subsequent calls");
	console.info("  • --cpu-prof-md for Markdown CPU profiles");
	console.info("  • --heap-prof and --heap-prof-md for heap profiling");
	console.info("");

	console.info("Unicode:");
	console.info("  • Bun.stringWidth: GB9c support for Indic scripts");
	console.info("  • Devanagari conjuncts correctly measured");
	console.info("  • Table size reduced: ~70KB → ~51KB");
}

// ============================================================================
// Main - Run all demonstrations
// ============================================================================

async function main(): Promise<void> {
	console.info("\n" + "🚀".repeat(30));
	console.info("     Bun v1.3.7 Features Showcase");
	console.info("🚀".repeat(30));
	console.info(`\nBun version: ${Bun.version || "unknown"}`);

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

	console.info("\n" + "=".repeat(60));
	console.info("✨ All demonstrations complete!");
	console.info("=".repeat(60));
	console.info("\nRun specific demonstrations:");
	console.info("  bun examples/bun-v1.3.7-features.ts");
	console.info("\nFor more examples, see:");
	console.info("  - examples/profiling/");
	console.info("  - examples/cli/");
	console.info("  - examples/secrets/");
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
