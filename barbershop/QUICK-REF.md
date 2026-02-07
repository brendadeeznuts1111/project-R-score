# 🚀 Quick Reference Commands

## File Analysis

```bash
# Count TypeScript files
bun -e 'const{ Glob } = require("bun"); console.log(new Glob("**/*.ts").scanSync().length + " TS files")' 2>/dev/null || \
find . -name "*.ts" -type f | wc -l | xargs -I{} echo "{} TS files"

# Quick dupe check
bun run scripts/analysis/dupe-analyzer.ts

# JSON output for piping
bun run scripts/analysis/dupe-analyzer.ts --json

# Show only high-frequency dupes (3+ files)
bun run scripts/analysis/dupe-analyzer.ts --threshold=3

# Top 10 only
bun run scripts/analysis/dupe-analyzer.ts --top=10
```

## Performance

```bash
# CPU profile (markdown)
bun --cpu-prof --cpu-prof-md run src/core/barber-server.ts

# Heap profile (markdown)
bun --heap-prof --cpu-prof-md run src/core/barber-server.ts

# Quick sampling
bun run src/profile/sampling-profile.ts --quick

# Benchmark
bun run src/debug/benchmark.ts
```

## Building

```bash
# Quick build
bun run build:server

# Production build
bun run build:prod

# With metafile
bun run build:meta
```

## Monitoring (One-liners)

```bash
# Health check
curl -s http://localhost:3000/api/health | jq .

# Runtime metrics
curl -s http://localhost:3000/ops/runtime | jq .

# R2 status
curl -s http://localhost:3000/ops/r2-status | jq .

# All in one
bun -e 'const urls=["/api/health","/ops/runtime","/ops/r2-status"];for(const u of urls){const r=await fetch("http://localhost:3000"+u);console.log(u,await r.json())}'
```

## Kimi Integration

```bash
# Quick analyze
kimi -e 'Analyze src/core/barber-server.ts performance'

# Review code
kimi -e 'Review security in lib/secrets/'

# Find issues
kimi -e 'Find potential bugs in src/debug/'
```

## Stats Summary

```bash
# One-liner stats
bun -e '
const g=new Bun.Glob("**/*.ts");
const files=[...g.scanSync()].filter(f=>!f.includes("node_modules")&&!f.includes("dist/"));
console.log(`📁 TS Files: ${files.length}`);
let lines=0;
for(const f of files.slice(0,50)){
  try{lines+=(await Bun.file(f).text()).split("\\n").length}catch{}
}
console.log(`📊 Lines (est): ${lines}+`);
'
```

## CLI Tables (Unicode-Aware)

```bash
# Run table demo
bun run src/utils/cli-table.ts

# Import in your scripts:
import { generateTable, ColumnTypes, formatStatus } from './src/utils/cli-table';

# Example:
generateTable({
  title: 'Service Status',
  columns: [
    ColumnTypes.text('name', 'Service'),
    ColumnTypes.status('status', 'Status'),
    ColumnTypes.duration('latency', 'Latency'),
  ],
  rows: [
    { name: 'API', status: 'online', latency: 45 },
    { name: 'Worker', status: 'busy', latency: 1250 },
  ],
  border: 'rounded'
});

# Format status with Unicode indicators
formatStatus('online');    // 🟢 ONLINE
formatStatus('warning');   // ⚠️ WARNING
formatStatus('error');     // ❌ ERROR
```

## Bun v1.3.7+ Features

```bash
# Bun.wrapAnsi() - ANSI-aware text wrapping
bun -e 'console.log(Bun.wrapAnsi("\x1b[31mRed text that wraps\x1b[0m", 10))'

# fetch() preserves header case
bun -e '
await fetch("https://httpbin.org/headers", {
  headers: {
    "Authorization": "Bearer token",  // Preserves "Authorization"
    "X-Custom-Header": "value"
  }
});
'

# CPU profiling with markdown output
bun --cpu-prof-md src/core/barber-server.ts

# Heap profiling
bun --heap-prof-md src/core/barber-server.ts
```

## WebAssembly.Table

```bash
# Run WASM Table demo
bun run src/utils/wasm-table.ts

# Usage:
import { WASMMachine, createDefaultMachine } from './src/utils/wasm-table';

const machine = createDefaultMachine();

// Execute compute hooks
machine.execute(0, [7.5, 30, 1000]);  // Risk score
machine.execute(1, [0.1, 0.2, 0.3]);  // Entropy

// Hot-swap algorithms at runtime
machine.hotSwap(0, newRiskFunction, 'v2');

// Grow table dynamically
machine.grow(8);  // Returns previous length

// Access table.length
console.log(machine.length);  // 16

// Load WASM module
await machine.loadWASM(wasmBuffer);
```

## Bun-Native APIs (High Performance)

```bash
# Run Bun API demo
bun run src/utils/bun-enhanced.ts

# Run performance benchmarks
bun run src/utils/bun-benchmark.ts
```

```typescript
import { 
  fastHash,           // 25x faster than crypto
  hashPassword,       // Argon2 native
  compressData,       // gzip/zstd native
  nanoseconds,        // High-res timing
  fastWrite,          // Fast file I/O
  sleep,              // Async sleep
  parseSemver,        // Version parsing
  escapeHTML,         // HTML sanitization
} from './src/utils';

// Hashing (25x faster than crypto.createHash)
const hash = fastHash('data', 'wyhash');

// Password hashing with Argon2 (built into Bun)
const pwHash = await hashPassword('password');
const valid = await verifyPassword('password', pwHash);

// Native compression
const compressed = compressData(data, 'gzip');
const original = decompressData(compressed, 'gzip');

// High-resolution timing
const start = nanoseconds();
// ... work ...
const elapsedMs = Number(nanoseconds() - start) / 1_000_000;

// Fast file I/O with Bun.write()
await fastWrite('/tmp/file.txt', 'content');
const text = await fastReadText('/tmp/file.txt');
const json = await fastReadJSON('/tmp/data.json');

// Async sleep (more efficient than setTimeout)
await sleep(100);  // 100ms

// Semver parsing (Bun.semver)
if (satisfiesVersion('1.2.3', '^1.0.0')) {
  // Version compatible
}
const comparison = compareVersions('1.2.3', '1.3.0');  // -1

// HTML escaping
const safe = escapeHTML('<script>alert("xss")</script>');
// &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;

// Find executable in PATH
const nodePath = which('node');  // /usr/local/bin/node

// Check if main module
if (isMainModule(import.meta)) {
  // Running as script, not imported
}

// Performance measurement
const { result, durationMs } = await measure(
  () => expensiveOperation(),
  'Operation'
);

// Timer utility
const timer = createTimer('Task');
await doWork();
const elapsed = timer.log();  // Logs to console
```

### Performance Comparison

| Operation | Bun API | Node.js | Speedup |
|-----------|---------|---------|---------|
| Hashing (1MB) | Bun.hash() | crypto.createHash | **25x** |
| File Write | Bun.write() | fs.writeFile | **2-3x** |
| Compression | Bun.gzip() | zlib.gzip | **1.5x** |
| Password | Bun.password | bcrypt package | Built-in |
| Timing | Bun.nanoseconds() | process.hrtime | Same |

All Bun-native APIs available via `import { ... } from './src/utils'`
