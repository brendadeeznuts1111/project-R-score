# BunUtilities Integration Guide

## Overview

BunUtilities has been integrated into registries, test runners, benchmarks, and CLI commands for consistent formatting and performance monitoring.

## Registry Integration

### Formatted Registry Endpoints

```typescript
// Get formatted registry overview
GET /api/registry/formatted

// Returns text/plain formatted table using BunUtilities
```

### Usage in Registry API

```typescript
import { RegistryFormatter, BunUtilities } from '../utils/bun-utilities';

// Format registry overview
const overview = await getRegistriesOverview();
const formatted = RegistryFormatter.formatOverview(overview.registries);

// Format registry items
const items = await getRegistryItems('properties');
const formatted = RegistryFormatter.formatItems(items);

// Format metrics
const metrics = await getRegistryMetrics('properties');
const formatted = RegistryFormatter.formatMetrics(metrics);
```

## Test Runner Integration

### Enhanced Test Runner

```typescript
import { TestRunner, TestIntegration } from './src/utils/bun-utilities';

const runner = new TestRunner();

// Run test with performance monitoring
const { result, duration } = await runner.runTest('my-test', async () => {
  // Test code
  return await doSomething();
});

// Format test summary
const summary = runner.formatSummary({
  passed: 10,
  failed: 2,
  skipped: 1,
  total: 13,
  duration: 5000
});

// Get performance metrics
const metrics = runner.getPerformanceMetrics();
```

### Test Integration Utilities

```typescript
import { TestIntegration } from './src/utils/bun-utilities';

// Format test summary
const summary = TestIntegration.formatTestSummary({
  passed: 10,
  failed: 2,
  skipped: 1,
  total: 13,
  duration: 5000
});

// Format test cases
const formatted = TestIntegration.formatTestCases([
  { name: 'test1', status: 'pass', duration: 10.5 },
  { name: 'test2', status: 'fail', duration: 5.2, error: 'Assertion failed' }
]);

// Create progress bar
const progress = TestIntegration.createTestProgress(5, 10);
```

## Benchmark Integration

### Enhanced Benchmark Script

The `scripts/bench.ts` script now uses BunUtilities:

```typescript
import { BunUtilities, BenchIntegration } from '../src/utils/bun-utilities';

// Format benchmark results
const formatted = BenchIntegration.formatBenchResults(results);

// Create progress indicator
const progress = BenchIntegration.createBenchProgress(current, total, 'Running benchmarks...');

// Get performance summary
const summary = BenchIntegration.formatBenchSummary(monitor);
```

### Usage

```bash
# Run benchmarks with BunUtilities formatting
BENCH_FORMAT=bun-utilities bun run scripts/bench.ts

# Standard format (default)
bun run scripts/bench.ts
```

## Command Integration

### Command Formatter

```typescript
import { CommandFormatter } from './src/utils/bun-utilities';

// Format command help
const help = CommandFormatter.formatHelp([
  { name: 'telegram', description: 'Telegram CLI', usage: 'bun run telegram', options: ['--topic', '--pin'] }
]);

// Format progress
const progress = CommandFormatter.formatProgress(75, 100, 'Processing...', { color: 'cyan' });

// Format results
const results = CommandFormatter.formatResults(data, ['name', 'status', 'duration']);

// Format errors
const error = CommandFormatter.formatError('Failed to connect', 'Connection timeout after 5s');

// Format success
const success = CommandFormatter.formatSuccess('Operation completed');
```

## Integration Points

### 1. Registry API (`src/api/registry.ts`)

- ✅ Added `formatRegistriesOverview()` function
- ✅ Added `formatRegistryItems()` function
- ✅ Uses `RegistryFormatter` for table formatting
- ✅ Integrated with BunUtilities for consistent output

### 2. Test Runners

- ✅ `TestRunner` class with performance monitoring
- ✅ `TestIntegration` utilities for formatting
- ✅ Progress bars for test execution
- ✅ Formatted test summaries

### 3. Benchmark Script (`scripts/bench.ts`)

- ✅ Integrated BunUtilities imports
- ✅ Added BenchIntegration support
- ✅ Performance monitoring integration
- ✅ Alternative formatting option via `BENCH_FORMAT` env var

### 4. CLI Commands

- ✅ `CommandFormatter` for consistent command output
- ✅ Progress bars for long-running operations
- ✅ Formatted tables for command results
- ✅ Color-coded error/success messages

## Examples

### Registry Display

```typescript
// In registry API endpoint
import { formatRegistriesOverview } from './registry';

const overview = await getRegistriesOverview();
const formatted = formatRegistriesOverview(overview);
return c.text(formatted);
```

### Test Execution

```typescript
// In test file
import { TestIntegration } from '../utils/bun-utilities';

afterAll(() => {
  const summary = TestIntegration.formatTestSummary({
    passed: testResults.passed,
    failed: testResults.failed,
    skipped: testResults.skipped,
    total: testResults.total,
    duration: Date.now() - startTime
  });
  console.log(summary);
});
```

### Benchmark Execution

```typescript
// In benchmark script
import { BenchIntegration } from '../utils/bun-utilities';

const results = await runBenchmarks();
const formatted = BenchIntegration.formatBenchResults(results);
console.log(formatted);
```

## Benefits

1. **Consistent Formatting** - All output uses same table/formatting utilities
2. **Performance Monitoring** - Built-in performance tracking
3. **Progress Indicators** - Visual feedback for long operations
4. **Color Support** - ANSI colors for better readability
5. **Unified API** - Single import point for all utilities

## See Also

- `docs/BUN-UTILITIES-COMPLETE.md` - Complete BunUtilities API reference
- `src/utils/bun-utilities.ts` - Unified namespace implementation
- `src/utils/registry-formatter.ts` - Registry formatting utilities
- `src/utils/test-integration.ts` - Test runner integration
- `src/utils/bench-integration.ts` - Benchmark integration
