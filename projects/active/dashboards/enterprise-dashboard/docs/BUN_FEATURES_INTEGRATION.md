# Bun Latest Features Integration

This document tracks integration of the latest Bun features from recent commits into the enterprise-dashboard.

**Note: This project is Bun-native always - all features are used directly without fallbacks.**

## Recent Features Integrated

### 1. Bun.wrapAnsi() (Jan 17, 2026)
**Commit:** `44df912` - Add Bun.wrapAnsi() for text wrapping with ANSI escape code preservation

**Integration:**
- ✅ Test Runner Service: Uses `Bun.wrapAnsi()` to format test output with preserved ANSI codes
- ✅ Benchmark Service: Uses `Bun.wrapAnsi()` for benchmark output formatting
- ✅ Output width: 120 characters for optimal terminal display

**Usage:**
```typescript
if (typeof Bun.wrapAnsi === "function") {
  formattedOutput = Bun.wrapAnsi(output, 120);
}
```

**Benefits:**
- Preserves ANSI color codes while wrapping text
- Better readability in terminal output
- Maintains formatting in test/benchmark results

### 2. Profiler API (Jan 16, 2026)
**Commit:** `8da29af` - feat(node:inspector): implement Profiler API

**Integration:**
- ✅ Benchmark Service: Added `runBenchmarkWithProfiling()` function
- ✅ Uses Inspector.Profiler for CPU profiling during benchmarks
- ✅ Captures profile data (nodes, samples, timing)

**Usage:**
```typescript
const results = await runBenchmarkWithProfiling("crc32", { profile: true });
// Returns benchmark results with profile data
```

**Benefits:**
- CPU profiling during benchmark execution
- Performance analysis with node-level granularity
- Integration with benchmark results

### 3. Test Seed Integration
**Feature:** Shared test seed between benchmarks and test runner

**Integration:**
- ✅ Test seed generator in `bench-service.ts`
- ✅ Test runner uses same seed system
- ✅ Reproducible test runs with `--seed` flag

**Usage:**
```typescript
// Generate seed
const { seed } = generateTestSeed();

// Use in benchmarks
await runBenchmark("crc32", { testSeed: seed });

// Use in tests
await runTestsWithSeed(seed, { pattern: "*.test.ts" });
```

## Future Integrations

### Potential Features to Watch

1. **JSONC Parser Improvements** (Jan 17, 2026)
   - Commit: `1344151` - fix(json): prevent stack overflow in JSONC parser
   - Could improve config file parsing

2. **Buffer Optimizations** (Jan 15, 2026)
   - Commit: `f01467d` - perf(buffer): optimize Buffer.from(array)
   - Could benefit benchmark operations

3. **S3 Content-Encoding Support** (Jan 16, 2026)
   - Commit: `5d3f37d` - feat(s3): add Content-Encoding header support
   - Could enhance export functionality

4. **WebKit Upgrades**
   - Multiple commits upgrading WebKit
   - Benefits DOM testing and UI components

## Version Compatibility

- **Minimum Bun Version:** 1.3.6+ (for existing features)
- **Latest Features:** Requires Bun from Jan 16-17, 2026 commits
- **Feature Detection:** All new features use `typeof` checks for graceful fallback

## Testing

To verify feature availability:

```typescript
// Check for Bun.wrapAnsi()
if (typeof Bun.wrapAnsi === "function") {
  // Feature available
}

// Check for Profiler API
if (typeof (globalThis as any).Inspector !== "undefined") {
  const Inspector = (globalThis as any).Inspector;
  if (Inspector.Profiler) {
    // Profiler available
  }
}
```

## References

- [Bun Commits](https://github.com/oven-sh/bun/commits/main/)
- [Bun.wrapAnsi() Documentation](https://bun.sh/docs/api/utils#bun-wrapansi)
- [Node.js Inspector API](https://nodejs.org/api/inspector.html)
