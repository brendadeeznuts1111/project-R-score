# Bun 1.3.7 Performance & APIs Reference

> Released January 27, 2026. Use this skill for new APIs (JSON5, JSONL, wrapAnsi) and performance optimization patterns.

## Quick Reference

- **`Bun.JSON5.parse()`** — Config with comments (before: json5 pkg, after: native, delta: faster)
- **`Bun.JSONL.parse()`** — Streaming NDJSON (before: manual split, after: native, delta: memory-efficient)
- **`Bun.JSONL.parseChunk()`** — Network streams (before: readline, after: native, delta: streaming)
- **`Bun.wrapAnsi()`** — Terminal wrapping (before: wrap-ansi, after: native, delta: 33-88x)

## JSC Performance Wins (Automatic)

No code changes needed - these are faster in 1.3.7:

- **`Buffer.from(array)`** — 1.0x to 1.5x (+50%)
- **`async/await`** — 1.0x to 1.35x (+35%)
- **`Array.prototype.flat()`** — 1.0x to 3.0x (+200%)
- **`String.prototype.padStart/padEnd()`** — 1.0x to 1.9x (+90%)

## New APIs

### Bun.JSON5 - Config Files with Comments

```typescript
const config = Bun.JSON5.parse(`
{
  // Server configuration
  host: "localhost",
  port: 3000,
  debug: true,  // trailing comma OK
}
`);
```

### Bun.JSONL - Streaming NDJSON

```typescript
// Parse from string
const events = [...Bun.JSONL.parse(jsonlString)];

// Parse from file
const text = await Bun.file("events.jsonl").text();
for (const obj of Bun.JSONL.parse(text)) {
  processEvent(obj);
}

// Chunk parsing (network streams) - returns { values, read, done, error }
let result = Bun.JSONL.parseChunk(chunk1);
console.log(result.values);  // Parsed objects
const remainder = chunk1.slice(result.read);  // Unprocessed bytes
result = Bun.JSONL.parseChunk(remainder + chunk2);
```

### Bun.wrapAnsi - Terminal Text Wrapping

```typescript
const text = "\x1b[31mThis is a long red text that needs wrapping\x1b[0m";
const wrapped = Bun.wrapAnsi(text, 20);
// Wraps at 20 columns, preserving the red color across line breaks
```

**API:**
```typescript
Bun.wrapAnsi(text: string, columns: number, options?: {
  hard?: boolean;             // Break words longer than columns (default: false)
  wordWrap?: boolean;         // Wrap at word boundaries (default: true)
  trim?: boolean;             // Trim leading/trailing whitespace (default: true)
  ambiguousIsNarrow?: boolean; // Treat ambiguous-width chars as narrow (default: true)
}): string
```

**Features:**
- Preserves ANSI escape codes (SGR colors/styles)
- Supports OSC 8 hyperlinks
- Respects Unicode display widths (full-width characters, emoji)
- Normalizes carriage return newline to newline

**Performance (vs wrap-ansi npm):**

- **Short text (45 chars)** — npm: 25.81 µs, Bun: 685 ns, speedup: 37x
- **Medium text (810 chars)** — npm: 568 µs, Bun: 11.22 µs, speedup: 50x
- **Long text (8100 chars)** — npm: 7.66 ms, Bun: 112 µs, speedup: 68x
- **Hard wrap colored** — npm: 8.82 ms, Bun: 174 µs, speedup: 50x
- **No trim long** — npm: 8.32 ms, Bun: 93.92 µs, speedup: 88x

### Bun.stringWidth - GB9c Indic Conjunct Support

Grapheme breaking now properly supports Unicode's GB9c rule for Indic Conjunct Break. Devanagari and other Indic script conjuncts correctly form single grapheme clusters.

```typescript
// Devanagari conjuncts now correctly treated as single grapheme clusters
Bun.stringWidth("क्ष");    // Ka+Virama+Ssa → width 2 (single cluster)
Bun.stringWidth("क्‍ष");   // Ka+Virama+ZWJ+Ssa → width 2 (single cluster)
Bun.stringWidth("क्क्क");  // Ka+Virama+Ka+Virama+Ka → width 3 (single cluster)
```

**Improvements:**
- Indic conjunct sequences (consonant + virama + consonant) no longer split incorrectly
- Internal table size reduced from ~70KB to ~51KB
- More comprehensive Unicode support

## S3 Enhancements

```typescript
import { s3 } from "bun";

// New presign options
const url = await s3.presign("report.pdf", {
  expiresIn: 3600,
  contentDisposition: 'attachment; filename="Q4-Report.pdf"',
  type: "application/pdf",
});

// Content encoding
await s3.write("data.json.gz", gzippedData, {
  contentEncoding: "gzip",
});
```

## Profiling (New Markdown Output)

> [Official docs](https://bun.sh/blog/bun-v1.3.7#markdown-cpu-profile-output)

### CPU Profiling

```bash
# Generate markdown profile only (LLM-friendly)
bun --cpu-prof-md script.js

# Generate both Chrome DevTools JSON and markdown formats
bun --cpu-prof --cpu-prof-md script.js

# Custom output location
bun --cpu-prof --cpu-prof-dir=./profiles --cpu-prof-name=my-profile script.js
```

**Markdown output includes:**
- Summary table with duration, sample count, and interval
- Hot functions ranked by self-time percentage
- Call tree showing total time including children
- Function details with caller/callee relationships
- File breakdown showing time spent per source file

### Heap Profiling

```bash
# Generate V8-compatible heap snapshot (opens in Chrome DevTools)
bun --heap-prof script.js

# Generate markdown heap profile (for CLI analysis with grep/sed/awk)
bun --heap-prof-md script.js

# Specify output location
bun --heap-prof --heap-prof-dir=./profiles --heap-prof-name=my-snapshot.heapsnapshot script.js
```

### All Flags

```bash
# bun --help | grep prof
--cpu-prof                 Start CPU profiler and write profile to disk on exit
--cpu-prof-name=<val>      Specify the name of the CPU profile file
--cpu-prof-dir=<val>       Specify the directory where the CPU profile will be saved
--cpu-prof-md              Output CPU profile in markdown format (LLM analysis)
--heap-prof                Generate V8 heap snapshot on exit (.heapsnapshot)
--heap-prof-name=<val>     Specify the name of the heap profile file
--heap-prof-dir=<val>      Specify the directory where the heap profile will be saved
--heap-prof-md             Generate markdown heap profile on exit (CLI analysis)
```

### node:inspector Profiler API

```typescript
import { Session } from "node:inspector/promises";

const session = new Session();
session.connect();

await session.post("Profiler.enable");
await session.post("Profiler.start");

// ... run code to profile ...

const { profile } = await session.post("Profiler.stop");
await Bun.write("profile.cpuprofile", JSON.stringify(profile));
```

## Local Benchmarks

Run the 1.3.7 feature benchmarks:

```bash
bun run benchmarks/bun-1.3.7.bench.ts
```

See: [`benchmarks/bun-1.3.7.bench.ts`](../benchmarks/bun-1.3.7.bench.ts)

## Transpiler REPL Mode

```typescript
const transpiler = new Bun.Transpiler({ replMode: true });
const result = transpiler.transformSync("1 + 2");
// Returns evaluated result, not just transformed code
```

## Migration Checklist

- [ ] Replace `json5` package with `Bun.JSON5.parse()`
- [ ] Replace manual JSONL parsing with `Bun.JSONL.parse()`
- [ ] Replace `wrap-ansi` package with `Bun.wrapAnsi()`
- [ ] Replace `string-width` package with `Bun.stringWidth()`
- [ ] Use `--cpu-prof-md` for shareable profiles

## Anti-Patterns to Avoid

```typescript
// BAD: Manual JSONL parsing
const lines = text.split("\n").filter(Boolean).map(JSON.parse);

// GOOD: Native streaming
for await (const obj of Bun.JSONL.parse(file)) { }

// BAD: External package for terminal width
import wrapAnsi from "wrap-ansi";

// GOOD: Native (33-88x faster)
Bun.wrapAnsi(text, { width: 80 });
```

## Links

- [Release Notes](https://bun.sh/blog/bun-v1.3.7)
- [GitHub Release](https://github.com/oven-sh/bun/releases/tag/bun-v1.3.7)
