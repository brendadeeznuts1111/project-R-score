#!/usr/bin/env bun
/**
 * 🚀 Bun Globals & Utils MASTER REFERENCE TABLE Generator
 *
 * Generates comprehensive reference tables for all Bun APIs
 * Supports CSV, Markdown, JSON, and Excel formats
 *
 * Usage:
 *   bun run bun-globals-master.ts [--format=csv|md|json|excel] [--output=path]
 *   bun run bun-globals-master.ts --interactive
 */

import { file, nanoseconds, write } from "bun";

// API Categories
const APIS = {
	Info: [
		{
			name: "Bun.version",
			signature: "Bun.version: string",
			description: "Current Bun version string.",
			returns: "string",
			params: "N/A",
			example: '"1.2.21"',
			omegaUse: "Version checks in health endpoints",
			perf: "Const",
			strict: "N/A",
			encoding: "N/A",
			related: "Bun.revision",
			docs: "#version",
		},
		{
			name: "Bun.revision",
			signature: "Bun.revision: string",
			description: "Git commit hash of Bun build.",
			returns: "string",
			params: "N/A",
			example: '"abc123def"',
			omegaUse: "Prod logging, reproducible builds",
			perf: "Const",
			strict: "N/A",
			encoding: "N/A",
			related: "Bun.version",
			docs: "#revision",
		},
	],
	Runtime: [
		{
			name: "Bun.env",
			signature: "Bun.env: Record<string,string>",
			description: "Process env (read-only proxy to process.env).",
			returns: "Record",
			params: "N/A",
			example: '{ PATH: "/bin:/usr/bin" }',
			omegaUse: "Dynamic pool sizes from env (fallback define)",
			perf: "Proxy (fast)",
			strict: "N/A",
			encoding: "N/A",
			related: "process.env",
			docs: "#env",
		},
		{
			name: "Bun.main",
			signature: "Bun.main: string | undefined",
			description: "Path to main script (like __main__).",
			returns: "string | undefined",
			params: "N/A",
			example: '"/project/server.ts"',
			omegaUse: "Resolve relative to main (dbPaths/.bin)",
			perf: "Const",
			strict: "N/A",
			encoding: "N/A",
			related: "import.meta.url",
			docs: "#main",
		},
		{
			name: "Bun.sleep()",
			signature: "Bun.sleep(ms: number): Promise<void>",
			description: "Async sleep (non-blocking).",
			returns: "Promise<void>",
			params: "ms",
			example: "N/A (waits)",
			omegaUse: "Pool health checks, rate limiting",
			perf: "Yielding",
			strict: "N/A",
			encoding: "N/A",
			related: "Bun.sleepSync()",
			docs: "#sleep",
		},
		{
			name: "Bun.sleepSync()",
			signature: "Bun.sleepSync(ms: number): void",
			description: "Sync sleep (blocks thread).",
			returns: "void",
			params: "ms",
			example: "N/A (blocks)",
			omegaUse: "Init delays (avoid in servers)",
			perf: "Precise ns",
			strict: "N/A",
			encoding: "N/A",
			related: "Bun.sleep()",
			docs: "#sleepsync",
		},
	],
	Resolution: [
		{
			name: "Bun.which()",
			signature: "Bun.which(bin: string, opts?: {cwd?: string, PATH?: string})",
			description: "Finds exec via PATH (your demo star).",
			returns: "string | null",
			params: "cwd, PATH",
			example: '"/bin/ls"',
			omegaUse: "Local .bin tools (sqlite3 for pools)",
			perf: "~1.5ms/1k (cache!)",
			strict: "N/A",
			encoding: "N/A",
			related: "Bun.resolveSync()",
			docs: "#which",
		},
		{
			name: "Bun.resolveSync()",
			signature: "Bun.resolveSync(path: string, root: string)",
			description: "Module/path resolve (throws).",
			returns: "string",
			params: "root: cwd/import.meta.dir",
			example: '"/proj/node_modules/zod"',
			omegaUse: "Secure .bin/db loads",
			perf: "Cached",
			strict: "N/A",
			encoding: "N/A",
			related: "Bun.which()",
			docs: "#resolvesync",
		},
	],
	Crypto: [
		{
			name: "Bun.randomUUIDv7()",
			signature: "Bun.randomUUIDv7(encoding?: string, ts?: number)",
			description: "Monotonic UUIDv7 (time+rand).",
			returns: "string | Buffer",
			params: '"hex/base64/buffer", timestamp',
			example: '"0192ce11-..."',
			omegaUse: "Session/pool IDs (sortable DB)",
			perf: "Crypto-fast",
			strict: "N/A",
			encoding: "hex/b64/buffer",
			related: "N/A",
			docs: "#uuidv7",
		},
	],
	Performance: [
		{
			name: "Bun.peek()",
			signature: "Bun.peek(promise: Promise)",
			description: "Non-await peek at settled promise.",
			returns: "T | Promise<T>",
			params: "N/A",
			example: '"hi"',
			omegaUse: "Async pool stats (no ticks)",
			perf: "Zero microtasks",
			strict: "N/A",
			encoding: "N/A",
			related: "Bun.peek.status()",
			docs: "#peek",
		},
		{
			name: "Bun.nanoseconds()",
			signature: "Bun.nanoseconds()",
			description: "Uptime ns (benchmarking).",
			returns: "number",
			params: "N/A",
			example: "7288958",
			omegaUse: "which()/pool timings",
			perf: "Sub-μs",
			strict: "N/A",
			encoding: "N/A",
			related: "process.hrtime.bigint()",
			docs: "#nanoseconds",
		},
	],
	Debug: [
		{
			name: "Bun.openInEditor()",
			signature:
				"Bun.openInEditor(path: string, opts?: {editor?: string, line?: number})",
			description: "Opens in $EDITOR/VSCode.",
			returns: "void",
			params: 'editor: "code", line/col',
			example: "Opens file:10:5",
			omegaUse: "Debug failed which() paths",
			perf: "System spawn",
			strict: "N/A",
			encoding: "N/A",
			related: "N/A",
			docs: "#editor",
		},
		{
			name: "Bun.inspect()",
			signature: "Bun.inspect(obj: any)",
			description: "Pretty-print as console.log().",
			returns: "string",
			params: "N/A",
			example: "'{ foo: \"bar\" }'",
			omegaUse: "Pool dumps",
			perf: "Fast",
			strict: "N/A",
			encoding: "N/A",
			related: "Bun.inspect.table()",
			docs: "#inspect",
		},
		{
			name: "Bun.inspect.custom",
			signature: "[Bun.inspect.custom](): string",
			description: "Custom print override.",
			returns: "string",
			params: "Class method",
			example: '"custom foo"',
			omegaUse: "Custom Pool class",
			perf: "N/A",
			strict: "N/A",
			encoding: "N/A",
			related: "Bun.inspect()",
			docs: "#inspect-custom",
		},
		{
			name: "Bun.inspect.table()",
			signature:
				"Bun.inspect.table(data: any[], props?: string[], opts?: {colors: bool})",
			description: "ASCII table string (console.table drop-in).",
			returns: "string",
			params: "props[], {colors: true}",
			example: "┌───┬───┐...",
			omegaUse: "**which() mega-tables** (CLI health)",
			perf: "Opt render",
			strict: "N/A",
			encoding: "ANSI",
			related: "N/A",
			docs: "#inspect-table",
		},
	],
	Comparison: [
		{
			name: "Bun.deepEquals()",
			signature: "Bun.deepEquals(a: any, b: any, strict?: boolean)",
			description: "Deep equality (powers tests).",
			returns: "boolean",
			params: "strict (undef unequal)",
			example: "true",
			omegaUse: "Pool config validation",
			perf: "Recursion opt",
			strict: "✅",
			encoding: "N/A",
			related: "expect().toEqual()",
			docs: "#deepequals",
		},
	],
	String: [
		{
			name: "Bun.escapeHTML()",
			signature: "Bun.escapeHTML(value: any)",
			description: "Escapes HTML chars (&<>\"').",
			returns: "string",
			params: "N/A",
			example: '"&lt;script&gt;"',
			omegaUse: "Sanitize dashboard/pool stats",
			perf: "480MB/s–20GB/s SIMD",
			strict: "N/A",
			encoding: "N/A",
			related: "N/A",
			docs: "#escapehtml",
		},
	],
	Terminal: [
		{
			name: "Bun.stringWidth()",
			signature: "Bun.stringWidth(str: string, opts?: {countAnsiEscapeCodes?: bool})",
			description: "Terminal col width (ANSI/emoji). ~6k x npm.",
			returns: "number",
			params: "countAnsiEscapeCodes, ambiguousIsNarrow",
			example: '5 ("hello")',
			omegaUse: "Align CLI tables (which() mega-table)",
			perf: "SIMD ns/iter",
			strict: "N/A",
			encoding: "ANSI/Emoji",
			related: "Bun.stripANSI()",
			docs: "#stringwidth",
		},
		{
			name: "Bun.stripANSI()",
			signature: "Bun.stripANSI(text: string)",
			description: "Remove ANSI (~6-57x npm).",
			returns: "string",
			params: "N/A",
			example: '"Hello World"',
			omegaUse: "Clean table exports",
			perf: "SIMD ns",
			strict: "N/A",
			encoding: "ANSI",
			related: "Bun.stringWidth()",
			docs: "#stripansi",
		},
		{
			name: "Bun.wrapAnsi()",
			signature: "Bun.wrapAnsi(str: string, cols: number, opts?)",
			description: "Wrap w/ ANSI/emoji (~npm drop-in).",
			returns: "string",
			params: "hard/wordWrap/trim/ambiguousIsNarrow",
			example: "Wrapped lines",
			omegaUse: "Long CLI stats",
			perf: "Native",
			strict: "N/A",
			encoding: "ANSI/Emoji",
			related: "Bun.stringWidth()",
			docs: "#wrapansi",
		},
	],
	URL: [
		{
			name: "Bun.fileURLToPath()",
			signature: "Bun.fileURLToPath(url: URL)",
			description: "file:// → abs path.",
			returns: "string",
			params: "N/A",
			example: '"/foo/bar.txt"',
			omegaUse: "Import.meta → dbPath",
			perf: "Instant",
			strict: "N/A",
			encoding: "N/A",
			related: "Bun.pathToFileURL()",
			docs: "#fileurltopath",
		},
		{
			name: "Bun.pathToFileURL()",
			signature: "Bun.pathToFileURL(path: string)",
			description: "Abs path → file:// URL.",
			returns: "URL",
			params: "N/A",
			example: "file:///foo/bar.txt",
			omegaUse: "dbPath → Bun.file()",
			perf: "Instant",
			strict: "N/A",
			encoding: "N/A",
			related: "Bun.fileURLToPath()",
			docs: "#pathtofileurl",
		},
	],
	Compression: [
		{
			name: "Bun.gzipSync()",
			signature: "Bun.gzipSync(data: Uint8Array | string)",
			description: "Sync gzip compress.",
			returns: "Uint8Array",
			params: "N/A",
			example: "Compressed bytes",
			omegaUse: "Pool snapshots (disk/network)",
			perf: "SIMD fast",
			strict: "N/A",
			encoding: "Binary",
			related: "Bun.gunzipSync()",
			docs: "#gzipsync",
		},
		{
			name: "Bun.gunzipSync()",
			signature: "Bun.gunzipSync(data: Uint8Array)",
			description: "Sync gzip decompress.",
			returns: "Uint8Array",
			params: "N/A",
			example: "Original bytes",
			omegaUse: "Restore compressed configs",
			perf: "SIMD fast",
			strict: "N/A",
			encoding: "Binary",
			related: "Bun.gzipSync()",
			docs: "#gunzipsync",
		},
		{
			name: "Bun.deflateSync()",
			signature: "Bun.deflateSync(data: Uint8Array | string)",
			description: "Sync deflate compress.",
			returns: "Uint8Array",
			params: "N/A",
			example: "Compressed bytes",
			omegaUse: "Smaller than gzip for pools",
			perf: "SIMD",
			strict: "N/A",
			encoding: "Binary",
			related: "Bun.inflateSync()",
			docs: "#deflatesync",
		},
		{
			name: "Bun.inflateSync()",
			signature: "Bun.inflateSync(data: Uint8Array)",
			description: "Sync deflate decompress.",
			returns: "Uint8Array",
			params: "N/A",
			example: "Original bytes",
			omegaUse: "Decompress pool data",
			perf: "SIMD",
			strict: "N/A",
			encoding: "Binary",
			related: "Bun.deflateSync()",
			docs: "#inflatesync",
		},
		{
			name: "Bun.zstdCompress()",
			signature: "Bun.zstdCompress(data: Uint8Array | string)",
			description: "Async Zstandard compress (fast/small).",
			returns: "Promise<Uint8Array>",
			params: "N/A",
			example: "Compressed bytes",
			omegaUse: "High-perf pool backups (better gzip)",
			perf: "Zstd opt",
			strict: "N/A",
			encoding: "Binary",
			related: "Bun.zstdDecompress()",
			docs: "#zstdcompress",
		},
		{
			name: "Bun.zstdCompressSync()",
			signature: "Bun.zstdCompressSync(data: Uint8Array | string)",
			description: "Sync Zstd compress.",
			returns: "Uint8Array",
			params: "N/A",
			example: "Compressed bytes",
			omegaUse: "Sync backups",
			perf: "Zstd opt",
			strict: "N/A",
			encoding: "Binary",
			related: "Bun.zstdCompress()",
			docs: "#zstdcompresssync",
		},
		{
			name: "Bun.zstdDecompress()",
			signature: "Bun.zstdDecompress(data: Uint8Array)",
			description: "Async Zstd decompress.",
			returns: "Promise<Uint8Array>",
			params: "N/A",
			example: "Original bytes",
			omegaUse: "Restore fast",
			perf: "Zstd opt",
			strict: "N/A",
			encoding: "Binary",
			related: "Bun.zstdCompress()",
			docs: "#zstddecompress",
		},
		{
			name: "Bun.zstdDecompressSync()",
			signature: "Bun.zstdDecompressSync(data: Uint8Array)",
			description: "Sync Zstd decompress.",
			returns: "Uint8Array",
			params: "N/A",
			example: "Original bytes",
			omegaUse: "Sync restore",
			perf: "Zstd opt",
			strict: "N/A",
			encoding: "Binary",
			related: "Bun.zstdDecompress()",
			docs: "#zstddecompresssync",
		},
	],
	Streams: [
		{
			name: "Bun.readableStreamTo*()",
			signature:
				"readableStreamToArrayBuffer/Bytes/Blob/JSON/Text/Array/FormData(stream)",
			description: "Consume stream → formats.",
			returns: "Varies",
			params: "boundary (FormData)",
			example: "Uint8Array",
			omegaUse: "Fetch → pool blobs",
			perf: "Zero-copy",
			strict: "N/A",
			encoding: "All",
			related: "fetch().body",
			docs: "#streamto",
		},
	],
	JSC: [
		{
			name: "bun:jsc.serialize()",
			signature: "serialize(value: any): ArrayBuffer",
			description: "StructuredClone → buffer.",
			returns: "ArrayBuffer",
			params: "N/A",
			example: "Buffer from obj",
			omegaUse: "Pool IPC/snapshots",
			perf: "JSC zero-copy",
			strict: "N/A",
			encoding: "Binary",
			related: "deserialize()",
			docs: "#jsc-serialize",
		},
		{
			name: "bun:jsc.deserialize()",
			signature: "deserialize(buf: ArrayBuffer): any",
			description: "Buffer → value.",
			returns: "any",
			params: "N/A",
			example: "Restored obj",
			omegaUse: "Load snapshots",
			perf: "JSC zero-copy",
			strict: "N/A",
			encoding: "Binary",
			related: "serialize()",
			docs: "#jsc-deserialize",
		},
		{
			name: "bun:jsc.estimateShallowMemoryUsageOf()",
			signature: "estimateShallowMemoryUsageOf(obj: any): number",
			description: "Shallow mem bytes (no props).",
			returns: "number",
			params: "N/A",
			example: "16",
			omegaUse: "Pool leak profiling",
			perf: "Instant",
			strict: "N/A",
			encoding: "N/A",
			related: "Bun.generateHeapSnapshot()",
			docs: "#jsc-mem",
		},
	],
};

// Generate CSV format
function generateCSV(): string {
	const headers = [
		"Category",
		"Name",
		"Signature",
		"Description",
		"Returns",
		"Key Parameters/Options",
		"Example Output",
		"Omega Use Cases (Pools/Phase 3.25)",
		"Perf Notes",
		"Strict?",
		"Encoding?",
		"Related APIs",
		"Docs Link (Short)",
	];

	let csv = headers.join(",") + "\n";

	for (const [category, apis] of Object.entries(APIS)) {
		for (const api of apis) {
			const row = [
				`"${category}"`,
				`"${api.name}"`,
				`"${api.signature}"`,
				`"${api.description}"`,
				`"${api.returns}"`,
				`"${api.params}"`,
				`"${api.example}"`,
				`"${api.omegaUse}"`,
				`"${api.perf}"`,
				`"${api.strict}"`,
				`"${api.encoding}"`,
				`"${api.related}"`,
				`"https://bun.sh/docs/api/globals${api.docs}"`,
			];
			csv += row.join(",") + "\n";
		}
	}

	return csv;
}

// Generate Markdown format
function generateMarkdown(): string {
	let md = `# 📊 Bun Globals & Utils MASTER REFERENCE TABLE 🔥

**Ultimate compilation** of **ALL ${Object.values(APIS).flat().length}+ APIs** for Omega v1.6.3!

| Category | Name | Signature | Description | Returns | Key Parameters | Example | Omega Use Cases | Perf | Strict? | Encoding | Related | Docs |
|----------|------|-----------|-------------|---------|----------------|---------|----------------|------|---------|----------|---------|------|
`;

	for (const [category, apis] of Object.entries(APIS)) {
		for (const api of apis) {
			md += `| **${category}** | \`${api.name}\` | \`${api.signature}\` | ${api.description} | \`${api.returns}\` | ${api.params} | \`${api.example}\` | ${api.omegaUse} | ${api.perf} | ${api.strict} | ${api.encoding} | \`${api.related}\` | [docs](${api.docs}) |\n`;
		}
	}

	md += `\n## 🚀 Omega MASTER Example: Pools + which() Table + Compression

\`\`\`typescript
// omega-master.ts – ALL APIs in action!
import { which, inspect, nanoseconds, zstdCompressSync, version } from 'bun';
import { estimateShallowMemoryUsageOf, serialize } from 'bun:jsc';

// which() table w/ inspect.table()
const whichData = [
  { tool: 'sqlite3', path: which('sqlite3'), cwd: Bun.main!, mem: estimateShallowMemoryUsageOf(pools) },
];
console.log(inspect.table(whichData, ['tool', 'path'], { colors: true }));

// Perf + compress pool snapshot
const startNs = nanoseconds();
const snapshot = zstdCompressSync(serialize(pools));  // Zstd + JSC
console.log(\`Snapshot: \${nanoseconds() - startNs} ns, size: \${snapshot.byteLength}, Bun: \${version}\`);

// Sleep + env fallback
await Bun.sleep(100);  // Rate limit
const poolSize = parseInt(Bun.env.POOL_SIZE || '5');  // define fallback
\`\`\`

## 💡 Pro Tips

- **Compression Kings**: Zstd > gzip (faster/smaller for pools)
- **Table Magic**: \`inspect.table(whichData)\` auto-formats your mega-table!
- **Perf Trio**: \`nanoseconds()\` + \`peek()\` + \`sleep()\` for benchmarks
- **Secure**: \`resolveSync(Bun.main + '/matrix.db')\` + \`which()\`

Generated with Bun Globals Master Generator v1.6.3 🚀
`;

	return md;
}

// Generate JSON format
function generateJSON(): string {
	return JSON.stringify(APIS, null, 2);
}

// Interactive mode
async function interactiveMode() {
	console.log("\n🚀 Bun Globals & Utils Master Reference Generator");
	console.log("==================================================\n");

	// Display which() demo table
	console.log("📋 Demo: which() Mega-Table");
	const whichData = [
		{ tool: "sqlite3", path: Bun.which("sqlite3"), available: !!Bun.which("sqlite3") },
		{ tool: "bun", path: Bun.which("bun"), available: !!Bun.which("bun") },
		{ tool: "node", path: Bun.which("node"), available: !!Bun.which("node") },
		{ tool: "code", path: Bun.which("code"), available: !!Bun.which("code") },
	];
	console.log(
		Bun.inspect.table(whichData, ["tool", "path", "available"], { colors: true }),
	);

	// Performance demo
	console.log("\n⚡ Performance Demo");
	const start = nanoseconds();
	await Bun.sleep(10);
	const elapsed = nanoseconds() - start;
	console.log(`Bun.sleep(10) took: ${elapsed} nanoseconds`);

	// UUID demo
	console.log("\n🔑 UUID v7 Demo");
	const uuid = Bun.randomUUIDv7();
	console.log(`Generated UUIDv7: ${uuid}`);

	// Compression demo
	console.log("\n📦 Compression Demo");
	const testData = "Hello, Bun! ".repeat(1000);
	const compressed = Bun.gzipSync(testData);
	const compressionRatio = (1 - compressed.byteLength / testData.length) * 100;
	console.log(`Original: ${testData.length} bytes`);
	console.log(`Compressed: ${compressed.byteLength} bytes`);
	console.log(`Compression ratio: ${compressionRatio.toFixed(1)}%`);

	console.log("\n✨ Interactive demo complete!");
}

// Main execution
async function main() {
	const args = process.argv.slice(2);
	const format = args.find((arg) => arg.startsWith("--format="))?.split("=")[1] || "md";
	const output = args.find((arg) => arg.startsWith("--output="))?.split("=")[1];

	if (args.includes("--interactive")) {
		await interactiveMode();
		return;
	}

	let content: string;
	let defaultExt: string;

	switch (format.toLowerCase()) {
		case "csv":
			content = generateCSV();
			defaultExt = ".csv";
			break;
		case "json":
			content = generateJSON();
			defaultExt = ".json";
			break;
		case "excel":
			// For Excel, we generate CSV and note it can be imported
			content = generateCSV();
			defaultExt = ".csv";
			console.log("📊 Excel format: CSV generated - import directly into Excel");
			break;
		case "md":
		default:
			content = generateMarkdown();
			defaultExt = ".md";
			break;
	}

	const outputPath = output || `bun-globals-master-reference${defaultExt}`;

	try {
		await write(outputPath, content);
		console.log(`✅ Generated ${format.toUpperCase()} reference: ${outputPath}`);

		// Show stats
		const stats = await file(outputPath).stat();
		console.log(`📊 Size: ${(stats.size / 1024).toFixed(1)} KB`);
		console.log(`🚀 APIs covered: ${Object.values(APIS).flat().length}`);
		console.log(`📝 Categories: ${Object.keys(APIS).length}`);
	} catch (error) {
		console.error("❌ Error writing file:", error);
		process.exit(1);
	}
}

// Run if executed directly
if (import.meta.main) {
	main().catch(console.error);
}

export { generateCSV, generateMarkdown, generateJSON, APIS };
