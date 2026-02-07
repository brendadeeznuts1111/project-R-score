# 🚀 Quick Reference Commands

## File Analysis

```bash
# Count TypeScript files
bun -e 'const g=new Bun.Glob("**/*.ts");console.log([...g.scanSync()].length+" TS files")'

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
bun --heap-prof --heap-prof-md run src/core/barber-server.ts

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
