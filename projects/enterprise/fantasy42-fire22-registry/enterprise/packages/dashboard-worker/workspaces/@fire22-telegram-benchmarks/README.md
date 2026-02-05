# 🎯 @fire22/telegram-benchmarks

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](package.json)
[![Tests](https://img.shields.io/badge/tests-7_categories-green.svg)](src/)
[![Bun](https://img.shields.io/badge/bun-%3E%3D1.2.20-f472b6.svg)](https://bun.sh)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Comprehensive performance benchmarking suite for the Fire22 Telegram integration
system with nanosecond precision.

## 📦 Installation

```bash
bun add --dev @fire22/telegram-benchmarks
```

## 🚀 Features

- **Nanosecond Precision**: Using `Bun.nanoseconds()` for ultra-precise timing
- **7 Benchmark Categories**: Complete coverage of all system components
- **Memory Profiling**: Track memory usage and detect leaks
- **Warmup Iterations**: JIT optimization before actual benchmarks
- **JSON Export**: Export results for comparison and tracking
- **Visual Reports**: Generate readable benchmark reports
- **Stress Testing**: Test system limits and breaking points

## 📖 Quick Start

```bash
# Run all benchmarks
bun run benchmark

# Run specific category
bun run benchmark:telegram
bun run benchmark:queue
bun run benchmark:language
bun run benchmark:workflow
bun run benchmark:dashboard

# Memory benchmarks
bun run benchmark:memory

# Stress testing
bun run benchmark:stress

# Generate report
bun run report

# Compare results
bun run compare
```

## 📊 Benchmark Categories

### 1. Telegram Performance

Tests core Telegram bot operations:

- Message processing speed
- Command routing efficiency
- Callback query handling
- Webhook processing
- Bot initialization time

### 2. Queue Matching Performance

Tests P2P queue operations:

- Match scoring algorithm (100,000 ops)
- Best match finding (1000 ops)
- Batch matching (100 ops)
- Queue sorting (1000 items)
- Statistics calculation

### 3. Language Translation Performance

Tests multilingual system:

- Translation lookup (cached) - 100,000 ops
- Variable interpolation - 50,000 ops
- Language detection - 50,000 ops
- Batch translations - 10,000 ops
- Cache miss handling - 1000 ops

### 4. Workflow Orchestration Performance

Tests workflow system:

- Command routing
- Permission checking
- State transitions
- Department routing
- Workflow initialization

### 5. Dashboard SSE Performance

Tests real-time dashboard:

- SSE streaming throughput
- Widget update speed
- Data aggregation
- Subscription handling
- Concurrent connections

### 6. Memory Benchmarks

Tests memory usage:

- Baseline memory usage
- Memory per user session
- Cache memory consumption
- Memory leak detection
- Garbage collection impact

### 7. Stress Testing

Tests system limits:

- Maximum concurrent users
- Message burst handling
- Queue overflow behavior
- Database connection limits
- Rate limiting effectiveness

## 🎯 Performance Targets

```typescript
{
  "responseTime": "< 100ms",      // Bot response time
  "throughput": "> 1000 req/s",   // Request throughput
  "matchingSpeed": "< 50ms",      // Queue matching
  "translationSpeed": "< 1ms",    // Translation lookup
  "memoryUsage": "< 100MB",       // Memory footprint
  "errorRate": "< 0.1%"           // Error tolerance
}
```

## 📈 Sample Results

```
🎯 BENCHMARK RESULTS
══════════════════════════════════════════════

📁 LANGUAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Translation Lookup (Cached) (Language)
  Iterations:  100,000
  Average:     0.012 ms
  Min:         0.008 ms
  Max:         0.045 ms
  Throughput:  83,333 ops/sec
  Memory:      N/A

📊 Translation with Variables (Language)
  Iterations:  50,000
  Average:     0.028 ms
  Min:         0.021 ms
  Max:         0.089 ms
  Throughput:  35,714 ops/sec
  Memory:      2.45 MB

📁 QUEUE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Match Scoring Algorithm (Queue)
  Iterations:  100,000
  Average:     0.034 ms
  Min:         0.025 ms
  Max:         0.098 ms
  Throughput:  29,411 ops/sec
  Memory:      N/A

📊 Find Best Match (100 deposits) (Queue)
  Iterations:  1,000
  Average:     3.245 ms
  Min:         2.890 ms
  Max:         4.123 ms
  Throughput:  308 ops/sec
  Memory:      8.12 MB

📈 SUMMARY
══════════════════════════════════════════════
🏆 Fastest: Translation Lookup (Cached)
   0.012 ms average

🐌 Slowest: Batch Matching (50 withdrawals, 100 deposits)
   45.234 ms average

📊 Total Statistics:
   Tests Run: 12
   Total Iterations: 313,100
   Total Time: 8.45 seconds
```

## 🔧 Configuration

### Benchmark Runner Configuration

```typescript
const runner = new BenchmarkRunner({
  warmupIterations: 100, // Warmup runs
  testIterations: 10000, // Test runs
  verbose: true, // Detailed output
});
```

### Custom Benchmarks

```typescript
import { BenchmarkRunner } from '@fire22/telegram-benchmarks';

const runner = new BenchmarkRunner({ verbose: true });

// Add custom benchmark
await runner.benchmark(
  'My Custom Test', // Name
  'Custom Category', // Category
  async () => {
    // Test function
    // Your test code here
    await someAsyncOperation();
  },
  1000 // Iterations
);

// Print results
runner.printResults();

// Export to JSON
runner.exportJSON('my-results.json');
```

## 📊 Result Analysis

### JSON Export Format

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "environment": {
    "platform": "darwin",
    "arch": "arm64",
    "bunVersion": "1.2.20",
    "nodeVersion": "20.0.0"
  },
  "config": {
    "warmupIterations": 100,
    "testIterations": 10000
  },
  "results": [
    {
      "name": "Translation Lookup",
      "category": "Language",
      "iterations": 100000,
      "averageTime": 12000,
      "throughput": 83333,
      "memoryUsed": 0
    }
  ]
}
```

### Comparison Tool

```bash
# Compare two benchmark runs
bun run compare baseline.json latest.json

# Output:
Performance Comparison
═════════════════════

Translation Lookup:
  Baseline: 0.015 ms
  Latest:   0.012 ms
  Change:   -20.0% ✅ (improvement)

Queue Matching:
  Baseline: 0.030 ms
  Latest:   0.034 ms
  Change:   +13.3% ⚠️ (regression)
```

## 🧪 Testing

```bash
# Verify benchmarks work
bun test

# Run quick smoke test
bun run benchmark --quick

# Full benchmark suite
bun run benchmark:all
```

## 📈 Performance Tips

1. **Run on consistent hardware** for comparable results
2. **Close other applications** to reduce noise
3. **Use warmup iterations** for JIT optimization
4. **Run multiple times** and average results
5. **Monitor system resources** during benchmarks
6. **Test in production-like environment** when possible

## 📄 API Reference

### `BenchmarkRunner`

Main benchmark execution class.

#### Methods

- `benchmark(name, category, fn, iterations?)` - Run a benchmark
- `printResults()` - Display formatted results
- `getResults()` - Get raw results array
- `exportJSON(filename)` - Export results to JSON

## 🔗 Dependencies

All Fire22 Telegram packages for comprehensive testing:

- `@fire22/telegram-bot`
- `@fire22/queue-system`
- `@fire22/multilingual`
- `@fire22/telegram-workflows`
- `@fire22/telegram-dashboard`

## 🤝 Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines.

### Adding New Benchmarks

1. Create new file in `src/`
2. Export `runBenchmarks(runner)` function
3. Add to main index imports
4. Update package.json scripts

## 📝 License

MIT © Fire22 Team

## 🔗 Related Packages

- [@fire22/telegram-bot](../fire22-telegram-bot) - Core bot
- [@fire22/queue-system](../fire22-queue-system) - Queue system
- [@fire22/multilingual](../fire22-multilingual) - Language system
- [@fire22/telegram-workflows](../fire22-telegram-workflows) - Workflows
- [@fire22/telegram-dashboard](../fire22-telegram-dashboard) - Dashboard

## 📞 Support

For benchmark issues or performance questions, please open an issue on GitHub.
