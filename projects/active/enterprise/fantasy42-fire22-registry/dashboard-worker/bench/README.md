# 🚀 Fire22 Benchmarking Suite

Comprehensive performance testing and analysis tools optimized for Bun runtime.

## 📦 Installation

```bash
# Install all benchmark packages
bun install

# Install without dev dependencies
bun install --omit=dev

# Install with frozen lockfile for reproducible builds
bun install --frozen-lockfile

# Install only production dependencies
bun install --production

# Install with specific dependency types
bun install --omit=dev --omit=peer --omit=optional
```

## 🎯 Quick Start

```bash
# Run complete benchmark suite
bun run bench

# Run specific benchmarks
bun run bench:micro      # Microbenchmarks
bun run bench:memory     # Memory profiling
bun run bench:load       # Load testing
bun run bench:ci         # CI/CD benchmarks

# Generate reports
bun run bench:report     # Generate HTML/Markdown reports
bun run bench:format     # Format output beautifully
```

## 📊 Available Tools

### 1. **BenchmarkSuite** - Core benchmarking

- Nanosecond precision with `Bun.nanoseconds()`
- Statistical analysis (P50, P90, P95, P99)
- JSON/Markdown export

### 2. **MemoryProfiler** - Memory analysis

- Heap statistics via `bun:jsc`
- Memory leak detection
- Heap snapshot generation

### 3. **MicroBenchmarks** - Precision testing

- API handler benchmarks
- Database operation testing
- Crypto and validation benchmarks

### 4. **LoadTester** - Stress testing

- HTTP endpoint load testing
- WebSocket performance
- Concurrent connection testing

### 5. **CIBenchmarks** - Continuous integration

- Regression detection
- Baseline comparison
- GitHub Actions integration

### 6. **BenchmarkFormatter** - Beautiful output

- Uses `Bun.stringWidth()` for alignment
- `Bun.inspect()` for serialization
- `Bun.inspect.table()` for tables

### 7. **BenchmarkReporter** - Report generation

- Multiple formats (JSON, HTML, Markdown, CSV)
- Trend analysis
- Performance recommendations

## 💻 Usage Examples

### Basic Benchmarking

```typescript
import { BenchmarkSuite } from '@fire22/benchmark-suite';

const suite = new BenchmarkSuite('My Benchmarks');

await suite.benchmark('JSON parsing', () => {
  JSON.parse('{"test": true}');
});

const report = suite.generateReport();
console.log(report);
```

### Memory Profiling

```typescript
import { MemoryProfiler } from '@fire22/memory-profiler';

const profiler = new MemoryProfiler('Memory Test');

const { result, memory } = await profiler.profileFunction(
  'Array allocation',
  () => new Array(10000).fill(0)
);

console.log(
  `Heap growth: ${memory.finalMemory.heapSize - memory.initialMemory.heapSize}`
);
```

### Load Testing

```typescript
import { LoadTester } from '@fire22/load-testing';

const tester = new LoadTester();
await tester.startTestServer(3456);

await tester.runLoadTestSuite();
await tester.runStressTest('/api/endpoint', 100);

tester.stopServer();
```

### Beautiful Formatting

```typescript
import { BenchmarkFormatter } from '@fire22/benchmark-formatter';

const formatter = new BenchmarkFormatter();

// Progress bar
formatter.displayProgress(75, 100, 'Running tests...');

// Formatted table
formatter.formatTable(benchmarkData, 'Results');

// Comparison
console.log(formatter.formatComparison(100, 85, 'ms'));
// Output: 100.00ms → 85.00ms (-15.00ms, ↓ 15.0%)
```

## 📁 Project Structure

```text
bench/
├── index.ts                 # Main entry point
├── benchmark-suite.ts       # Core benchmarking
├── memory-profiler.ts       # Memory analysis
├── micro-benchmarks.ts      # Microbenchmarks
├── load-testing.ts          # Load testing
├── ci-benchmarks.ts         # CI/CD integration
├── benchmark-reporter.ts    # Report generation
├── benchmark-formatter.ts   # Output formatting
└── results/                 # Generated reports
    ├── benchmark-report.md
    ├── benchmark-report.html
    └── benchmark-results.json

packages/
├── benchmark-suite/         # Core package
├── memory-profiler/         # Memory package
├── micro-benchmarks/        # Micro package
├── load-testing/            # Load package
└── benchmark-formatter/     # Formatter package
```

## 🔧 Configuration

### Package Installation Options

```json
{
  "bun": {
    "install": {
      "frozen-lockfile": false, // Use exact versions
      "production": false, // Production mode
      "optional": true, // Install optional deps
      "dev": true, // Install dev deps
      "peer": true, // Install peer deps
      "concurrent-scripts": 4 // Parallel script execution
    }
  }
}
```

### Trusted Dependencies

```json
{
  "trustedDependencies": ["@fire22/benchmark-suite", "mitata"]
}
```

### Workspaces Configuration

```json
{
  "workspaces": ["packages/*", "bench"]
}
```

## 🎯 Performance Targets

- Response time: < 100ms
- Throughput: > 1000 req/s
- Memory usage: < 512MB
- Test coverage: > 80%

## 📈 CI/CD Integration

```yaml
# .github/workflows/benchmark.yml
name: Benchmarks
on: [push, pull_request]
jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install --frozen-lockfile
      - run: bun run bench:ci
      - uses: actions/upload-artifact@v3
        with:
          name: benchmark-results
          path: bench/results/
```

## 📝 License

MIT © Fire22 Development Team
