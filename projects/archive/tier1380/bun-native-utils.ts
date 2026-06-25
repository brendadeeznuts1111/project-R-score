// tier1380/bun-native-utils.ts
// Complete Bun native utilities integration guide

// ═══════════════════════════════════════════════════════════════════════════════════════
// 1. BUN.INSPECT FAMILY - Deep object visualization
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * Bun.inspect() - Configurable object serialization
 * Perfect for: Logging, debugging, data export
 */
const deepObject = {
  tier: "1380",
  metrics: {
    latency: [1, 2, 3, 4, 5],
    nested: { deep: { value: 42 } }
  },
  map: new Map([["key", "value"]]),
  set: new Set([1, 2, 3]),
  bigint: 9007199254740991n,
  date: new Date(),
  regex: /test/gi,
  error: new Error("test"),
};

// Default inspect
console.info(Bun.inspect(deepObject));
// Colors + compact
console.info(Bun.inspect(deepObject, { colors: true, compact: true }));
// Depth limiting
console.info(Bun.inspect(deepObject, { depth: 2 }));
// Sorted keys
console.info(Bun.inspect(deepObject, { sorted: true }));

/**
 * Bun.inspect.table() - Tabular data visualization
 * Perfect for: Query results, metrics, comparisons
 */
const tableData = [
  { endpoint: "/api/v1/bets", latency: 45, status: 200 },
  { endpoint: "/api/v1/users", latency: 120, status: 200 },
  { endpoint: "/api/v1/legacy", latency: 2500, status: 503 },
];

console.info(Bun.inspect.table(tableData));
// With options
console.info(Bun.inspect.table(tableData, {
  colors: true,
  compact: false,
  depth: 3,
}));

// ═══════════════════════════════════════════════════════════════════════════════════════
// 2. CONSOLE DEPTH & FORMATTING - Global settings
// ═══════════════════════════════════════════════════════════════════════════════════════

// Set global console depth (affects all console.log)
console.info({ deep: { nested: { object: { value: 42 } } } }); // Default depth

// Override for specific log
console.info("%o", { deep: { nested: { object: { value: 42 } } } }); // %o = util.inspect

// ═══════════════════════════════════════════════════════════════════════════════════════
// 3. BUN.COLOR - Universal color conversion
// ═══════════════════════════════════════════════════════════════════════════════════════

// Bun.color(input, outputFormat?) - input is any CSS color string or [r,g,b]
// Output formats: "css", "hex", "rgb", "number", "ansi-256", "ansi-16m"
console.info("Bun.color outputs:");
console.info("  css:", Bun.color("red", "css"));               // red
console.info("  hex:", Bun.color("red", "hex"));               // #ff0000
console.info("  rgb:", Bun.color("red", "rgb"));               // rgb(255, 0, 0)
console.info("  number:", Bun.color("red", "number"));         // 16711680
console.info("  ansi-256:", Bun.color("red", "ansi-256"));     // \x1b[38;5;196m
console.info("  ansi-16m:", Bun.color("red", "ansi-16m"));     // \x1b[38;2;255;0;0m

// HSL input via CSS string
console.info("  hsl->hex:", Bun.color("hsl(142, 76%, 36%)", "hex"));  // #16a34a

// [r,g,b] array input
console.info("  [r,g,b]->css:", Bun.color([22, 163, 74], "css"));
console.info("  [r,g,b]->hex:", Bun.color([22, 163, 74], "hex"));

// ANSI colored text via ansi-16m
const ansi = Bun.color("hsl(142, 76%, 36%)", "ansi-16m");
console.info(`${ansi}Colored Text\x1b[0m`);

// ═══════════════════════════════════════════════════════════════════════════════════════
// 4. BUN.STRINGWIDTH - Unicode-aware text measurement
// ═══════════════════════════════════════════════════════════════════════════════════════

const testStrings = [
  "Hello",
  "🚀 Launch",
  "日本語",
  "👨‍👩‍👧‍👦 Family",
  " Café ",
  "\x1b[32mGreen\x1b[0m",
  "Zero\u200BWidth",
];

console.info("Bun.stringWidth() measurements:");
for (const str of testStrings) {
  const width = Bun.stringWidth(str);
  const clean = str.replace(/\x1b\[[0-9;]*m/g, "");
  console.info(`  "${clean}" = ${width} columns`);
}

// Perfect for table alignment
function alignText(text: string, width: number, align: "left" | "right" | "center" = "left"): string {
  const textWidth = Bun.stringWidth(text.replace(/\x1b\[[0-9;]*m/g, ""));
  const padding = width - textWidth;

  if (padding <= 0) return text;

  const leftPad = align === "center" ? Math.floor(padding / 2) :
                  align === "right" ? padding : 0;
  const rightPad = padding - leftPad;

  return " ".repeat(leftPad) + text + " ".repeat(rightPad);
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// 5. BUN.HASH - Fast hashing utilities
// ═══════════════════════════════════════════════════════════════════════════════════════

const data = "Tier-1380 Matrix Data";

// Multiple algorithms
console.info("Hash algorithms:");
console.info("  crc32:", Bun.hash.crc32(data).toString(16));     // HW-accelerated, ~20x faster since 1.3.9
console.info("  wyhash:", Bun.hash.wyhash(data).toString(16));   // Fast, 64-bit
console.info("  adler32:", Bun.hash.adler32(data).toString(16)); // Fast, 32-bit

// Object hashing
const obj = { tier: 1380, status: "active" };
console.info("  Object hash:", Bun.hash.wyhash(JSON.stringify(obj)).toString(16));

// ═══════════════════════════════════════════════════════════════════════════════════════
// 6. BUN.GC - Garbage collection control
// ═══════════════════════════════════════════════════════════════════════════════════════

console.info("Heap stats:", Bun.gc(true)); // Force GC + return stats

// Memory pressure monitoring
function getMemoryPressure(): "low" | "medium" | "high" {
  const stats: any = Bun.gc(false); // Don't force, just stats
  const used = stats.heapSize;
  const total = stats.heapSize + stats.freeMemory;
  const ratio = used / total;

  if (ratio < 0.5) return "low";
  if (ratio < 0.8) return "medium";
  return "high";
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// 7. BUN.ESCAPEHTML - Fast HTML escaping
// ═══════════════════════════════════════════════════════════════════════════════════════

const unsafe = '<script>alert("XSS")</script> & "quotes"';
console.info("Escaped:", Bun.escapeHTML(unsafe));
// &lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt; &amp; &quot;quotes&quot;

// ═══════════════════════════════════════════════════════════════════════════════════════
// 8. BUN.MARKDOWN - Native markdown parsing (Bun 1.3.8+)
// ═══════════════════════════════════════════════════════════════════════════════════════

const md = `
# Tier-1380 Status

| Metric | Value |
|--------|-------|
| Health | 🟢 98% |
| Latency | 45ms |

- [x] Active
- [ ] Maintenance
`;

// Parse to HTML
const html = Bun.markdown.html(md, {
  tables: true,
  tasklists: true,
  strikethrough: true,
  latexMath: true,
});
console.info("Markdown HTML:", html.slice(0, 200));

// ═══════════════════════════════════════════════════════════════════════════════════════
// 9. BUN.FILE / BUN.WRITE - Optimized I/O
// ═══════════════════════════════════════════════════════════════════════════════════════

// Fast file operations - write first so read works
await Bun.write("/tmp/test.txt", "Tier-1380 file test");
const file = Bun.file("/tmp/test.txt");

// Streaming read
const text = await file.text();
const stream = file.stream();
const arrayBuffer = await file.arrayBuffer();

// Fast write
await Bun.write("/tmp/output.json", JSON.stringify({ tier: 1380 }));

// ═══════════════════════════════════════════════════════════════════════════════════════
// 10. BUN.SPAWN / BUN.$ - Process management
// ═══════════════════════════════════════════════════════════════════════════════════════

// Simple spawn
const proc = Bun.spawn(["git", "status"], {
  cwd: "/tmp",
  env: { ...process.env, GIT_PAGER: "" },
  stdout: "pipe",
  stderr: "pipe",
});

const output = await new Response(proc.stdout).text();
console.info("Git status:", output.slice(0, 100));

// Shell with template literals
// 🔒 BUN FIX: Bun Shell crash (opencode) and EBADF errors with &> redirect fixed
const result = await Bun.$`echo "Tier-1380" | wc -c`;
console.info("Char count:", result.stdout.toString().trim());

// ═══════════════════════════════════════════════════════════════════════════════════════
// 11. BUN.CRYPTO - Native crypto operations
// ═══════════════════════════════════════════════════════════════════════════════════════

// Fast hashing
const hasher = new Bun.CryptoHasher("sha256");
hasher.update("Tier-1380");
hasher.update(" data");
console.info("SHA256:", hasher.digest("hex"));

// HMAC
const hmac = new Bun.CryptoHasher("sha256", "secret-key");
hmac.update("message");
console.info("HMAC:", hmac.digest("hex"));

// Random bytes
const random = crypto.getRandomValues(new Uint8Array(32));
console.info("Random:", Buffer.from(random).toString("hex"));

// ═══════════════════════════════════════════════════════════════════════════════════════
// 12. BUN.ZSTD - Native compression
// ═══════════════════════════════════════════════════════════════════════════════════════

const largeData = "x".repeat(10000);

// Compress
const compressed = Bun.zstdCompressSync(Buffer.from(largeData));
console.info(`Zstd: ${largeData.length} -> ${compressed.length} bytes`);

// Decompress
const decompressed = Bun.zstdDecompressSync(compressed);
console.info("Decompressed length:", decompressed.length);

// ═══════════════════════════════════════════════════════════════════════════════════════
// 13. BUN.PASSWORD - Secure credential hashing
// ═══════════════════════════════════════════════════════════════════════════════════════

// Store secret
const hashed = await Bun.password.hash("my-secret", {
  algorithm: "bcrypt",
  cost: 10,
});

// Verify
const isValid = await Bun.password.verify("my-secret", hashed);
console.info("Password valid:", isValid);

// ═══════════════════════════════════════════════════════════════════════════════════════
// 14. BUN.DNS - Fast DNS resolution
// ═══════════════════════════════════════════════════════════════════════════════════════

const ips = await Bun.dns.resolve("example.com");
console.info("DNS resolved:", ips);

// ═══════════════════════════════════════════════════════════════════════════════════════
// 15. BUN.TOML - Native TOML parsing
// ═══════════════════════════════════════════════════════════════════════════════════════

const toml = `
[server]
host = "0.0.0.0"
port = 3000

[database]
url = "postgres://localhost:5432/tier1380"
`;

const config = Bun.TOML.parse(toml);
console.info("TOML config:", config);

// ═══════════════════════════════════════════════════════════════════════════════════════
// 16. BUN.GLOB - Fast glob matching
// ═══════════════════════════════════════════════════════════════════════════════════════

const glob = new Bun.Glob("**/*.md");
const files = await Array.fromAsync(glob.scan({ cwd: "./docs" }));
console.info("Markdown files:", files.length);

// ═══════════════════════════════════════════════════════════════════════════════════════
// INTEGRATION: Tier-1380 Complete Observability Stack
// ═══════════════════════════════════════════════════════════════════════════════════════

export class Tier1380Observability {
  private startTime = performance.now();
  private spans: any[] = [];

  log(level: "debug" | "info" | "warn" | "error", message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const color = {
      debug: "\x1b[90m",  // Gray
      info: "\x1b[36m",   // Cyan
      warn: "\x1b[33m",   // Yellow
      error: "\x1b[31m",  // Red
    }[level];

    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      data,
      memory: Bun.gc(false),
      uptime: performance.now() - this.startTime,
    };

    // Use Bun.inspect for consistent formatting
    console.info(
      `${color}[${logEntry.level}]\x1b[0m`,
      message,
      data ? Bun.inspect(data, { colors: true, depth: 3 }) : ""
    );

    return logEntry;
  }

  table(data: any[], title?: string) {
    if (title) {
      console.info(`\n\x1b[1;35m${title}\x1b[0m`);
    }
    console.info(Bun.inspect.table(data, { colors: true }));
  }

  metrics() {
    return {
      heap: Bun.gc(false),
      hash: Bun.hash.wyhash,
      stringWidth: Bun.stringWidth,
      color: Bun.color,
    };
  }

  async export(format: "json" | "toml" | "markdown"): Promise<string> {
    const exportData = {
      spans: this.spans,
      timestamp: new Date().toISOString(),
      bunVersion: Bun.version,
    };

    switch (format) {
      case "json":
        return JSON.stringify(exportData, null, 2);
      case "toml":
        return `# Tier-1380 Export\nversion = "${Bun.version}"\n`;
      case "markdown":
        return this.toMarkdown(exportData);
      default:
        return Bun.inspect(exportData);
    }
  }

  private toMarkdown(exportData: any): string {
    const fence = '```';
    return `# Tier-1380 Observability Report

| Metric | Value |
|--------|-------|
| Bun Version | ${exportData.bunVersion} |
| Timestamp | ${exportData.timestamp} |
| Spans | ${exportData.spans.length} |

## Raw Data

${fence}json
${JSON.stringify(exportData, null, 2)}
${fence}
`;
  }
}

// Usage
const obs = new Tier1380Observability();
obs.log("info", "System initialized", { tier: 1380 });
obs.table([
  { service: "api", status: "healthy", latency: 45 },
  { service: "db", status: "healthy", latency: 12 },
], "Service Health");

console.info(await obs.export("markdown"));
