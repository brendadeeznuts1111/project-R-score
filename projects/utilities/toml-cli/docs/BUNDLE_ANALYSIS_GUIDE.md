# 📦 Bundle Matrix Analyzer Guide

Analyze and track your Bun project's bundle health using DuoPlus Scoping Matrix principles.

## Quick Start

### Basic Analysis
```bash
bun run bundle:analyze
```

### Track Changes
```bash
bun run bundle:compare
```

### Check Health Status
```bash
bun run bundle:health
```

## Integration

### In Your Code
```typescript
import { BundleMatrixAnalyzer } from './src/analyzers/BundleMatrix';

// Analyze your project
const matrix = await BundleMatrixAnalyzer.analyzeProject([
  './src/main.ts',
  './src/inspector.ts'
], {
  outdir: './dist',
  target: 'bun',
  minify: true,
  external: ['react', 'react-dom']
});

// Check health
if (matrix.summary.bundleHealth < 60) {
  throw new Error('Bundle health below threshold!');
}

// View metrics
console.log('Bundle size:', matrix.summary.gzippedSize);
console.log('Health score:', matrix.summary.bundleHealth);
console.log('Files:', matrix.summary.fileCount);
```

## Metrics Explained

### Bundle Health (0-100)
Composite score measuring:
- **Total size** (smaller is better)
- **File count** (optimal ~5 files)
- **File size consistency** (avoid huge individual files)

**Targets:**
- 90+ = Excellent
- 70-89 = Good
- 60-69 = Acceptable
- <60 = Needs optimization

### Tension (100 - Health)
Measure of bundle "bloat". Lower is better.

### Compliance Checks
Automated verification of:
- Bundle size < 1MB (gzipped)
- Max imports per file < 50
- File count < 20
- No forbidden packages (axios, dotenv, form-data, node-fetch)
- Health > 60

## Configuration Options

```typescript
interface BundleAnalysisOptions {
  outdir?: string;           // Output directory (default: './dist')
  target?: 'browser' | 'bun' | 'node';  // Build target
  minify?: boolean;          // Minify output
  external?: string[];       // External dependencies to exclude
  verbose?: boolean;         // Print detailed report
}
```

## Understanding the Report

### Example Output
```text
============================================================
📦 BUNDLE ANALYSIS REPORT
============================================================

⏰ 2026-01-15T10:30:00Z
🎯 Target: bun

📊 METRICS
------------------------------------------------------------
  Total Size:        245.3 KB
  Gzipped Size:      65.2 KB
  File Count:        8
  Avg File Size:     30.7 KB
  Bundle Health:     78/100

🏆 TOP 5 LARGEST FILES
------------------------------------------------------------
  1. dist/main.js
     Size: 120 KB
     Imports: 12

  2. dist/api.js
     Size: 85 KB
     Imports: 8

✅ COMPLIANCE CHECKS
------------------------------------------------------------
  ✓ Bundle size < 1MB
  ✓ Max imports per file < 50
  ✓ File count < 20
  ✓ No forbidden packages
  ✗ Bundle health > 60
    Current: 78/100

💡 RECOMMENDATIONS
------------------------------------------------------------
  • Bundle health below optimal - review largest files
  • Consider splitting large files
  • Optimize import patterns

============================================================
```

## CI/CD Integration

### GitHub Actions
Place in `.github/workflows/bundle-analysis.yml`:

```yaml
name: Bundle Health Check

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run bundle:analyze
      - run: bun run bundle:compare
```

### Local Pre-commit Hook
```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Checking bundle health..."
bun run bundle:analyze || exit 1
echo "✓ Bundle health OK"
```

## Tracking Over Time

### Export Metrics
```typescript
await BundleMatrixAnalyzer.exportMetrics(matrix, './metrics/build-2026-01-15.json');
```

### Load Previous Metrics
```typescript
const previous = await BundleMatrixAnalyzer.loadMetrics('./metrics/bundle-previous.json');
```

### Compare Builds
```typescript
const comparison = BundleMatrixAnalyzer.compareAnalyses(before, after);
console.log(comparison.summary);
// Output: Size: +10 KB (2.1%) | Health: -5 | Files: +1
```

## Optimization Strategies

### 1. Reduce File Size
```typescript
// Before: One large file
export * from './huge-module.ts';

// After: Split into smaller pieces
export { feature1 } from './features/feature1.ts';
export { feature2 } from './features/feature2.ts';
```

### 2. Tree Shake Dead Code
```typescript
// Mark as side-effect free
{
  "sideEffects": false
}
```

### 3. Minimize Dependencies
Use Bun-native APIs:
- ❌ axios → ✅ fetch()
- ❌ dotenv → ✅ Bun.env
- ❌ express → ✅ Bun.serve()

### 4. Lazy Load Modules
```typescript
// Load on demand
const module = await import('./heavy-module.ts');
```

### 5. Code Splitting
```typescript
// Bun build with code splitting
await Bun.build({
  entrypoints: ['src/main.ts'],
  splitting: true,
  outdir: './dist'
});
```

## API Reference

### BundleMatrixAnalyzer

#### `analyzeProject(entryPoints, options?)`
Analyze a project and return bundle metrics.

**Returns:** `Promise<BundleMatrix>`

#### `exportMetrics(matrix, filepath?)`
Export analysis to JSON file.

**Returns:** `Promise<void>`

#### `loadMetrics(filepath?)`
Load previous metrics from file.

**Returns:** `Promise<BundleMatrix | null>`

#### `compareAnalyses(before, after)`
Compare two analyses and get differences.

**Returns:** Object with `sizeChange`, `healthChange`, `fileCountChange`, `summary`

### Types

```typescript
interface BundleMatrix {
  timestamp: string;
  target: string;
  files: FileMetrics[];
  summary: BundleMetrics;
  compliance: ComplianceCheck[];
  recommendations: string[];
}

interface BundleMetrics {
  totalSize: number;
  gzippedSize: number;
  fileCount: number;
  avgFileSize: number;
  avgGzippedSize: number;
  largestFiles: FileMetrics[];
  bundleHealth: number;
  tension: number;
}

interface FileMetrics {
  path: string;
  size: number;
  gzipped: number;
  imports: string[];
  scope?: string;
}

interface ComplianceCheck {
  rule: string;
  passed: boolean;
  details: string;
}
```

## Troubleshooting

### "Build failed"
Check that entry points exist and are valid TypeScript.

### "No files found"
Ensure output directory exists and build completed successfully.

### "Health score too low"
Review recommendations and largest files. Consider:
- Splitting large files
- Removing unused dependencies
- Optimizing imports

### "Forbidden packages detected"
Use Bun-native APIs instead:
- `axios` → `fetch()`
- `dotenv` → `Bun.env`
- `form-data` → `FormData` API
- `node-fetch` → `fetch()`

## Best Practices

1. **Run before commits** - Check health doesn't degrade
2. **Track over time** - Maintain metrics history
3. **Set thresholds** - Fail CI if health < 60
4. **Monitor growth** - Alert on size increases > 10%
5. **Review recommendations** - Address suggestions proactively
6. **Use Bun-native** - Follow DuoPlus patterns

## Performance Tips

- Analyze after major changes
- Keep baseline metrics tracked
- Run bundle:compare in CI/CD
- Review compliance regularly
- Optimize before deployment

## Examples

### Track Bundle Health Over Time
```typescript
const analyses = [];

for (let i = 0; i < 5; i++) {
  const matrix = await BundleMatrixAnalyzer.analyzeProject(entries, options);
  analyses.push(matrix);
  
  // Check trend
  if (i > 0) {
    const prev = analyses[i - 1];
    const trend = BundleMatrixAnalyzer.compareAnalyses(prev, matrix);
    console.log(`Build ${i}: ${trend.summary}`);
  }
}
```

### Automated Alerts
```typescript
const matrix = await BundleMatrixAnalyzer.analyzeProject(entries, options);

if (matrix.summary.bundleHealth < 60) {
  // Send alert to Slack, email, etc.
  notifyTeam('Bundle health degraded to ' + matrix.summary.bundleHealth);
}

if (matrix.summary.gzippedSize > 500000) {
  // Alert on size threshold
  notifyTeam('Bundle size exceeded 500KB');
}
```

---

**Keep your bundles lean and healthy! 🐰**
