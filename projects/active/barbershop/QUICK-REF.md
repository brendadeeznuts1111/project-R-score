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

---

## Cloudflare Domain Management

### Using Bun.secrets (Recommended)

```bash
# Store credentials securely
bun run cf:secrets:setup <api_token> [account_id]

# Check credentials status
bun run cf:secrets:status

# View version history
bun run cf:secrets:history

# Rotate token
bun run cf:secrets:rotate
```

### Domain Management

```bash
# Verify API connection
bun run domain:verify

# List all zones
bun run domain:zones list

# Get zone details
bun run scripts/domain/cf-domain-cli.ts zones get factory-wager.com

# Setup all FactoryWager subdomains
bun run domain:setup

# List DNS records
bun run domain:dns list factory-wager.com

# Add DNS record
bun run scripts/domain/cf-domain-cli.ts dns add factory-wager.com CNAME app factory-wager.com

# Check SSL status
bun run domain:ssl status factory-wager.com

# Set SSL mode (off/flexible/full/strict)
bun run scripts/domain/cf-domain-cli.ts ssl set factory-wager.com strict

# Purge all cache
bun run domain:cache purge factory-wager.com

# View analytics (last 7 days)
bun run domain:analytics factory-wager.com

# View analytics (last 30 days)
bun run domain:analytics factory-wager.com 30
```

### Themed CLI Output

```bash
# Themed output with icons and colors
bun run cf:themed status

# Use specific theme
bun run cf:themed:dark zones
bun run cf:themed:light dns factory-wager.com
bun run cf:themed:pro ssl factory-wager.com

# Theme-aware status commands
bun run cf:themed setup production
```

### Theme Configuration

Domain CLI theme settings in `themes/config/domain.toml`:

```toml
[cli.theme]
default = "professional"
use_icons = true
use_colors = true
border_style = "rounded"

[cli.colors.dns]
A = "colors.error.500"
CNAME = "colors.primary.500"
MX = "colors.warning.500"
```

## Unified Cloudflare (Bun v1.3.7+)

### Status & Features

```bash
# Check Bun v1.3.7+ features and service status
bun run cf:unified:status

# View operation statistics
bun run cf:unified:stats
```

### R2 Storage with S3 Client (α)

```bash
# Upload file with profiling
bun run cf:unified r2-upload ./file.txt [key]

# List objects
bun run cf:unified:r2-list
bun run cf:unified r2-list assets/

# Generate presigned URL (1 hour default)
bun run cf:unified r2-presign assets/file.txt

# Generate presigned URL (24 hours)
bun run cf:unified r2-presign assets/file.txt 86400
```

### Worker Deployment (α)

```bash
# Deploy worker script
bun run cf:unified worker-deploy ./worker.ts [name]

# Deploy with theme
bun run cf:unified dark worker-deploy ./api.ts api-worker
```

### Performance Profiling

```bash
# Capture profile for 5 seconds
bun run cf:unified profile 5000

# Profile with themed output
bun run cf:unified light profile 10000
```

### Full Stack Deployment

```bash
# Deploy domain + R2 + Worker
bun run cf:unified:deploy-stack

# Themed deployment
bun run cf:unified professional deploy-stack
```

### Semantic Versioning (Bun.semver)

```bash
# Validate semver format
bun run cf:version:validate 1.2.3

# Compare versions
bun run cf:version:compare 1.2.3 1.3.0

# Check range satisfaction
bun run cf:version:satisfies 1.2.3 ^1.0.0

# Bump version
bun run cf:version:bump 1.2.3 minor

# Check component compatibility
bun run cf-version.ts compatibility 2.1.0 2.0.5 2.1.3
```

### Bun Data APIs (Cookie, Color, Env, Headers)

```bash
# Bun.Cookie - Manage cookies
bun run cf:data:cookie-set session abc123 --secure --httpOnly
bun run cf:data:cookie-list
bun run cf-data.ts cookie-get session

# Bun.color - CSS color processing
bun run cf:data:color-parse red
bun run cf-data.ts color-brand primary 0.8
bun run cf-data.ts color-gradient red blue green

# Prefixed Environment Variables
bun run cf-data.ts env-set FW API_KEY secret123
bun run cf:data:env-list FW

# Header Management
bun run cf:data:header-cf my-api-token
bun run cf-data.ts header-telemetry

# Complete Data CLI
bun run cf-data.ts data-session
```

### Registry & Playground

```bash
# Visual dashboards
bun run playground:client      # Client dashboard
bun run playground:admin       # Admin dashboard
bun run playground:pipeline    # Payment pipeline view
bun run playground:hierarchy   # Barber hierarchy tree
bun run playground:approvals   # Payment approvals board

# Payment pipeline workflow
bun run playground.ts pipeline-create 150 "Alice" "John"
bun run playground.ts pipeline-advance pay-123456

# Payment approvals
bun run playground.ts approval-create 500 "Equipment purchase"
bun run playground.ts approval-process apr-1 approved "Looks good"
```

### Unified Service (Programmatic)

```typescript
import { unifiedCloudflare, versionManager, registry } from './lib/cloudflare';

// Deploy complete stack
const result = await unifiedCloudflare.deployStack({
  domain: 'api.factory-wager.com',
  workerScript: workerCode,
  r2Assets: [{ key: 'config.json', data: configData }],
});

console.log(`Deployed: ${result.deploymentVersion}`);

// Check compatibility
const matrix = versionManager.checkCompatibility({
  domainVersion: '2.1.0',
  workerVersion: '2.0.5',
  r2Version: '2.1.3',
});

// Upload to R2 with metadata
await unifiedCloudflare.uploadToR2('file.pdf', data, {
  contentType: 'application/pdf',
  metadata: { version: '1.0' },
});

// Generate presigned URL
const url = await unifiedCloudflare.presignR2Url('file.pdf', {
  expiresIn: 86400, // 24 hours
});

// Profile operations
unifiedCloudflare.startProfiling('operation');
// ... do work ...
const profile = await unifiedCloudflare.stopProfiling('operation');
console.log(`Peak CPU: ${profile.summary.peakCpu}%`);
```

### Programmatic Usage

```typescript
import { CloudflareClient, createClientFromEnv } from './lib/cloudflare';

const client = createClientFromEnv();

// List zones
const zones = await client.listZones();

// Get zone ID
const zoneId = await client.getZoneId('factory-wager.com');

// Create DNS record
const record = await client.createDNSRecord(zoneId, {
  type: 'A',
  name: 'api.factory-wager.com',
  content: '192.0.2.1',
  ttl: 1,
  proxied: true,
});

// Purge cache
await client.purgeAllCache(zoneId);

// Get analytics
const analytics = await client.getZoneAnalytics(
  zoneId,
  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  new Date().toISOString()
);
```

See [docs/CLOUDFLARE_DOMAIN_CLI.md](docs/CLOUDFLARE_DOMAIN_CLI.md) for complete documentation.
