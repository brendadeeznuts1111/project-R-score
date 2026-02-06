# Bun v1.3.2 Profiling Integration - Multi-Layer System Enhancement

**Version**: 1.1.1.1.5.0.0.0  
**Status**: ✅ **PRODUCTION READY**  
**Date**: 2025-01-16  
**Bun Version**: 1.3.2+

---

## Overview

This document describes the integration of Bun v1.3.2 features (CPU profiling, test hooks, URLPattern API) into the multi-layer correlation graph system for production-grade performance optimization.

### Key Features

- ✅ **CPU Profiling Integration** - Identify bottlenecks in recursive algorithms
- ✅ **Test Hooks** - `onTestFinished` for cleanup and performance tracking
- ✅ **URLPattern API** - Intelligent routing for multi-layer data access
- ✅ **Performance Dashboard** - Real-time monitoring and analysis
- ✅ **Profile Analysis** - Automated optimization recommendations

---

## Architecture

### Component Structure

```text
🌐 PROFILING-ENABLED MULTI-LAYER SYSTEM
├── Performance Monitor (performance-monitor.ts)
│   ├── Session tracking
│   ├── Metric recording
│   └── Profile export
├── Instrumented System (instrumented-system.ts)
│   ├── Profiling wrapper
│   ├── Recursive correlation analysis
│   └── Performance anomaly logging
├── Market Data Router (market-patterns.ts)
│   ├── URLPattern-based routing
│   ├── Layer-specific endpoints
│   └── WebSocket upgrade handling
├── Performance Dashboard (performance-dashboard.ts)
│   ├── Profile visualization
│   ├── Layer performance metrics
│   └── Hotspot analysis
└── Test Integration (multilayer-performance.test.ts)
    ├── onTestFinished hooks
    ├── Memory leak detection
    └── Performance assertions
```

---

## Usage

### 1. CPU Profiling

#### Basic Profiling

```bash
# Profile the entire system
bun --cpu-prof --cpu-prof-name=production.cpuprofile src/main.ts

# Profile with custom directory
bun --cpu-prof --cpu-prof-name=analysis.cpuprofile --cpu-prof-dir=./profiles src/main.ts
```

#### Profiled Analysis Script

```bash
# Run profiled market analysis
bun run scripts/profiling/run-profiled-analysis.ts

# With custom configuration
BUN_CPU_PROF=true \
BUN_CPU_PROF_NAME=custom.cpuprofile \
bun run scripts/profiling/run-profiled-analysis.ts
```

### 2. Profile Analysis

```bash
# Analyze a CPU profile
bun run scripts/profiling/analyze-profile.ts ./profiles/production.cpuprofile

# Output includes:
# - Performance hotspots (top 10 functions)
# - Layer performance breakdown
# - Optimization recommendations
```

### 3. Testing with Hooks

```bash
# Run performance tests
bun test test/profiling/multilayer-performance.test.ts

# With profiling enabled
BUN_TEST_PROFILING=true bun test test/profiling/
```

### 4. URLPattern Routing

```typescript
import { MarketDataRouter } from "./src/api/routes/market-patterns";

const router = new MarketDataRouter(graphSystem);

// Handle requests
const response = await router.handleRequest(request);

// Example routes:
// GET /api/v1/layer1/correlation/:marketId/:selectionId
// GET /api/v1/layer3/patterns/:sport/:date
// GET /api/v1/hidden/edges/:layer/:confidence
```

### 5. Performance Dashboard

```typescript
import { PerformanceDashboard } from "./src/monitoring/performance-dashboard";

const dashboard = new PerformanceDashboard(graphSystem);

// Serve dashboard
const response = await dashboard.serveDashboard(request);

// Example routes:
// GET /dashboard/profiles/:sessionId
// GET /dashboard/layer/:layerId/performance
// GET /dashboard/hotspots/:functionName
```

### 6. Deployment with Profiling

```bash
# Run deployment script
./scripts/profiling/deploy-with-profiling.sh

# Or manually:
BUN_CPU_PROF=true \
BUN_CPU_PROF_NAME=deployment.cpuprofile \
bun run scripts/profiling/run-profiled-analysis.ts
```

---

## API Endpoints

### Market Data Routes (URLPattern)

| Pattern | Method | Description |
|---------|--------|-------------|
| `/api/v1/layer1/correlation/:marketId/:selectionId` | GET | Layer 1 correlations |
| `/api/v1/layer2/correlation/:marketType/:eventId` | GET | Layer 2 correlations |
| `/api/v1/layer3/patterns/:sport/:date` | GET | Layer 3 patterns |
| `/api/v1/layer4/anomalies/:sportA/:sportB` | GET | Layer 4 anomalies |
| `/api/v1/hidden/edges/:layer/:confidence` | GET | Hidden edge detection |
| `/api/v1/profiles/:sessionId` | GET/DELETE | Profile management |

### Dashboard Routes

| Pattern | Method | Description |
|---------|--------|-------------|
| `/dashboard/profiles/:sessionId` | GET | Profile details |
| `/dashboard/layer/:layerId/performance` | GET | Layer performance |
| `/dashboard/hotspots/:functionName` | GET | Hotspot analysis |
| `/dashboard/compare/:profileA/:profileB` | GET | Profile comparison |

---

## Performance Monitoring

### Metrics Tracked

- **Session Duration** - Time spent in profiling sessions
- **Memory Usage** - Heap memory consumption
- **Recursive Calls** - Depth and count of recursive operations
- **Correlation Pairs** - Number of pairs processed
- **Layer Performance** - Per-layer timing breakdown

### Example Output

```text
📊 Profile Summary: {
  totalSessions: 15,
  activeSessions: 0,
  totalMetrics: 15,
  averageDuration: 234.5
}

🔥 Performance Hotspots:
  1. computeRecursiveCorrelations: 1234.56ms
  2. detectHiddenEdges: 567.89ms
  3. mergeGraphsWithCorrelation: 234.12ms

🏗️  Layer Performance:
  layer1: 123.45ms
  layer2: 234.56ms
  layer3: 345.67ms
  layer4: 456.78ms
  crossLayer: 567.89ms

💡 Recommendations:
  1. 🚨 Optimize recursive function computeRecursiveCorrelations...
  2. ⚖️  Layer layer4 is taking 456.78ms (2.1x average)...
```

---

## Test Hooks Usage

### Basic Cleanup

```typescript
test("example test", () => {
  // Test code...
  
  onTestFinished(() => {
    // Cleanup after test
    system.clearLayerCache(1);
  });
});
```

### Multiple Hooks

```typescript
test("complex test", async () => {
  // Test code...
  
  onTestFinished(() => {
    console.log("First cleanup");
    system.clearEdgeCache();
  });
  
  onTestFinished(() => {
    console.log("Second cleanup");
    system.cleanup();
  });
  
  onTestFinished(async () => {
    console.log("Async cleanup");
    await system.cleanupDatabase();
  });
});
```

### Performance Tracking

```typescript
test("performance test", () => {
  const start = performance.now();
  
  // CPU-intensive operation
  const result = computeIntensiveOperation();
  
  const duration = performance.now() - start;
  
  onTestFinished(() => {
    system.recordPerformanceMetric("test_operation", duration, {
      resultSize: result.length,
    });
  });
});
```

---

## Best Practices

### 1. Profiling

- ✅ Enable profiling only when needed (not in production by default)
- ✅ Use descriptive session names for easy identification
- ✅ Analyze profiles regularly to catch regressions
- ✅ Set reasonable recursion depth limits

### 2. Testing

- ✅ Use `onTestFinished` for cleanup to prevent resource leaks
- ✅ Track performance metrics in tests
- ✅ Use `test.serial` for tests that need cleanup hooks
- ✅ Skip CPU-intensive profiling tests in CI

### 3. Routing

- ✅ Use URLPattern for type-safe routing
- ✅ Validate all path parameters
- ✅ Handle errors gracefully
- ✅ Document route patterns

### 4. Performance

- ✅ Monitor layer-specific performance
- ✅ Optimize recursive functions first
- ✅ Use memoization for repeated calculations
- ✅ Consider parallelization for independent operations

---

## Troubleshooting

### Profile Not Generated

**Problem**: CPU profile file not created.

**Solution**: 
- Ensure `--cpu-prof` flag is used
- Check write permissions for profile directory
- Verify Bun version supports CPU profiling (1.3.2+)

### Test Hooks Not Executing

**Problem**: `onTestFinished` hooks not running.

**Solution**:
- Ensure test completes successfully (hooks don't run on failure)
- Check Bun test version supports hooks
- Verify hooks are registered before test completion

### URLPattern Not Matching

**Problem**: Routes not matching expected patterns.

**Solution**:
- Verify pattern syntax matches URL structure
- Check for trailing slashes
- Use `pattern.test(url)` for debugging
- Inspect `pattern.exec(url)` for match details

---

## Related Documentation

- [Bun CPU Profiling](https://bun.com/docs/cli/bun#cpu-profiling)
- [Bun Test Hooks](https://bun.com/docs/test/hooks)
- [URLPattern API](https://developer.mozilla.org/en-US/docs/Web/API/URLPattern)
- [Multi-Layer Correlation System](./1.1.1.1.4-MULTI-LAYER-CORRELATION-SYSTEM-SPECIFICATION.md)
- [Anti-Patterns Guide](./ANTI-PATTERNS.md)

---

## File Structure

```text
src/
├── arbitrage/shadow-graph/profiling/
│   ├── performance-monitor.ts          # Performance tracking
│   └── instrumented-system.ts          # Profiling wrapper
├── api/routes/
│   └── market-patterns.ts              # URLPattern routing
└── monitoring/
    └── performance-dashboard.ts        # Dashboard

test/
└── profiling/
    └── multilayer-performance.test.ts  # Test hooks

scripts/profiling/
├── analyze-profile.ts                  # Profile analysis
├── run-profiled-analysis.ts            # Profiled execution
└── deploy-with-profiling.sh            # Deployment script
```

---

**Last Updated**: 2025-01-16  
**Bun Version**: 1.3.2+
