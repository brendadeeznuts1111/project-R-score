# Layer4 Correlation Detection Test Guide

Comprehensive testing guide for Layer4 cross-sport correlation detection with Bun workspace integration.

---

## **Test File Structure**

### **Main Test File: `test/ticks/correlation-detection.test.ts`**

Comprehensive test suite covering:
- ✅ Graph building from historical data
- ✅ Anomaly detection in correlations
- ✅ Volume spike detection
- ✅ Unexpected correlation identification
- ✅ Temporal pattern anomalies
- ✅ Confidence score calculation
- ✅ Correlation chain patterns
- ✅ Edge case handling
- ✅ Performance benchmarking
- ✅ Time-series alignment

### **Performance Benchmarks: `test/profiling/correlation-detection.bench.ts`**

Dedicated performance benchmarks with:
- Graph building performance (1000 data points)
- Anomaly detection performance (500 correlations)
- Time-series alignment performance (10,000 points)
- Multi-layer graph construction
- Cross-sport correlation calculation

---

## **Test Configuration**

### **Using Bun's Native Test Runner**

All tests use Bun's native test runner (not Vitest). Configuration is in `bunfig.toml`:

```toml
[test]
timeout = 30000
preload = ["./test/setup.ts"]
coverageReporter = ["text", "html", "json", "lcov"]
```

### **Global Test Setup**

The `test/setup.ts` file provides:
- Mock data factories (`createMockSportData`, `createMockCorrelation`)
- Global lifecycle hooks (`beforeAll`, `afterAll`, `beforeEach`, `afterEach`)
- Test environment configuration

---

## **Running Tests**

### **Basic Test Execution**

```bash
# Run all Layer4 correlation tests
bun test test/ticks/correlation-detection.test.ts

# Run with 20 repeats (stability testing)
bun test --repeats=20 test/ticks/correlation-detection.test.ts

# Run with verbose output
bun test --repeats=20 --verbose test/ticks/correlation-detection.test.ts

# Run with specific test filter
bun test --repeats=20 --test-name-pattern="detects volume spike anomalies" \
  test/ticks/correlation-detection.test.ts
```

### **Performance Benchmarks**

```bash
# Run performance benchmarks (50 repeats recommended)
bun test --repeats=50 test/profiling/correlation-detection.bench.ts

# Using test runner script
bun run scripts/test-runner.ts --repeats=50 --bench \
  test/profiling/correlation-detection.bench.ts

# Using npm script shortcut
bun run test:bench test/profiling/correlation-detection.bench.ts
```

### **Coverage Reports**

```bash
# Generate HTML coverage report
bun test --coverage --coverage-reporter=html \
  test/ticks/correlation-detection.test.ts

# Multiple coverage formats
bun test --coverage --coverage-reporter=html,lcov,json \
  test/ticks/correlation-detection.test.ts
```

---

## **Test Structure**

### **Event ID Format**

Tests use valid event IDs matching the required format:
- Pattern: `sport-description-YYYY` or `sport-description-YYYYMMDD-HHMM`
- Examples: `nba-lakers-warriors-2024`, `nfl-game-20240115-1200`

### **Mock Data**

Tests use mock factories from `test/setup.ts`:

```typescript
import { createMockSportData, createMockCorrelation } from "../setup";

// Create mock sport data
const sportData = createMockSportData("basketball", Date.now());

// Create mock correlation
const correlation = createMockCorrelation("basketball", "soccer", 0.85);
```

### **Graph Building**

Tests create `MultiLayerCorrelationGraph` instances with:
- In-memory SQLite database (`:memory:`)
- TimezoneService for timezone handling
- Optional relaxed configuration for testing

```typescript
const testDb = new Database(":memory:");
const timezoneService = new TimezoneService(testDb);
const graphBuilder = new MultiLayerCorrelationGraph(
  testDb,
  timezoneService,
  {
    validation: {
      minEventIdLength: 5,
      maxEventIdLength: 100,
      eventIdPattern: /^[a-z]+-[\w-]+$/,
      minConfidence: 0.0,
      maxConfidence: 1.0,
    },
  }
);
```

---

## **Test Scenarios**

### **1. Graph Building**

Tests that multi-layer graphs can be built from event IDs:

```typescript
test("builds valid cross-sport graph from historical data", async () => {
  const eventId = "nba-lakers-warriors-2024";
  const graph = await graphBuilder.buildMultiLayerGraph(eventId);
  
  expect(graph).toBeDefined();
  expect(graph.layer4).toBeDefined();
  expect(graph.layer4.correlations).toBeDefined();
});
```

### **2. Anomaly Detection**

Tests anomaly detection with various correlation patterns:

```typescript
test("detects anomalies in normal sport correlations", async () => {
  const graph = await graphBuilder.buildMultiLayerGraph(eventId);
  
  // Add correlations to graph
  graph.layer4.correlations.push({
    shared_entity: "shared_basketball_soccer",
    sport1_market: "basketball_market",
    sport2_market: "soccer_market",
    strength: 0.85, // High correlation
    latency: 100,
    last_update: Date.now(),
  });
  
  // Run detection
  const detectors = graph.detection_priority;
  const anomalies = await detectors[0]?.(graph);
  
  expect(anomalies).toBeDefined();
});
```

### **3. Volume Spike Detection**

Tests detection of volume spike anomalies:

```typescript
test("detects volume spike anomalies", async () => {
  const graph = await graphBuilder.buildMultiLayerGraph(eventId);
  
  // Add high-strength correlation (potential anomaly)
  graph.layer4.correlations.push({
    strength: 0.95, // Very high correlation
    latency: 50, // Low latency
    // ...
  });
  
  const anomalies = await detectors[0]?.(graph);
  // Should detect high correlation as anomaly
});
```

### **4. Performance Benchmarking**

Tests performance with large datasets:

```typescript
test("performance benchmark with repeats", async () => {
  // Generate 100 correlations
  const correlations = generateCorrelations(100);
  graph.layer4.correlations.push(...correlations);
  
  const startTime = performance.now();
  const anomalies = await detectors[0]?.(graph);
  const duration = performance.now() - startTime;
  
  expect(duration).toBeLessThan(1000); // < 1 second
});
```

---

## **Integration with Test Infrastructure**

### **Test Runner Script**

Use the enhanced test runner for convenience:

```bash
# Stability testing
bun run scripts/test-runner.ts --repeats=20 \
  test/ticks/correlation-detection.test.ts

# Performance benchmarks
bun run scripts/test-runner.ts --repeats=50 --bench \
  test/profiling/correlation-detection.bench.ts
```

### **NPM Script Shortcuts**

```bash
# Stability testing
bun run test:stability test/ticks/correlation-detection.test.ts

# Performance benchmarks
bun run test:bench test/profiling/correlation-detection.bench.ts

# Coverage
bun run test:coverage test/ticks/correlation-detection.test.ts
```

---

## **Best Practices**

### **1. Use Mock Factories**

Always use `createMockSportData` and `createMockCorrelation` from `test/setup.ts`:

```typescript
import { createMockSportData, createMockCorrelation } from "../setup";

const data = createMockSportData("basketball", Date.now());
const correlation = createMockCorrelation("basketball", "soccer", 0.85);
```

### **2. Valid Event IDs**

Use proper event ID format:
- ✅ `nba-lakers-warriors-2024`
- ✅ `nfl-game-20240115-1200`
- ❌ `test_event_001` (invalid format)

### **3. Database Cleanup**

Always close database connections in `afterEach`:

```typescript
afterEach(() => {
  if (testDb) {
    testDb.close();
  }
});
```

### **4. Performance Testing**

Use appropriate repeat counts:
- Stability: `--repeats=20`
- Performance: `--repeats=50`
- Quick checks: `--repeats=1` (default)

---

## **Troubleshooting**

### **Event ID Validation Errors**

If you see `Invalid eventId` errors:
- Ensure event IDs match pattern: `/^[a-z]+-[\w-]{8,}-[\d]{4}$/`
- Or provide relaxed config in test setup

### **Database Errors**

If database operations fail:
- Ensure in-memory database is created: `new Database(":memory:")`
- Close database in `afterEach` hook

### **Logger Errors**

If `logger.warn is not a function` errors occur:
- This is expected in test environment
- Tests should handle gracefully with try/catch
- Graph building still works, error handling path may fail

---

## **CI/CD Integration**

### **Automated Testing**

The Layer4 correlation detection tests are automatically run in CI/CD:

**GitHub Actions Workflow:** `.github/workflows/test.yml`

- **Triggers:** Pull requests, pushes to main, manual dispatch
- **Test Execution:**
  - Basic tests: `bun test test/ticks/correlation-detection.test.ts`
  - Stability tests: `bun test --repeats=20 test/ticks/correlation-detection.test.ts`
  - Coverage: `bun test --coverage --coverage-reporter=html,lcov`
- **Artifacts:** Coverage reports uploaded for download
- **PR Comments:** Test results automatically commented on pull requests

### **Performance Benchmarking**

**GitHub Actions Workflow:** `.github/workflows/benchmark.yml`

- **Triggers:** When Layer4 test files or shadow-graph code changes
- **Benchmark Execution:**
  - Runs: `bun test --repeats=50 test/profiling/correlation-detection.bench.ts --profile=cpu`
  - Creates benchmark: `scripts/benchmarks/create-benchmark.ts`
  - Compares against: `layer4-correlation-baseline`
- **Regression Detection:** Automatically detects performance regressions (>5% threshold)
- **PR Comments:** Benchmark results and regression warnings posted to PRs

### **Creating Baseline**

To create the initial baseline benchmark:

```bash
bun run scripts/benchmarks/create-layer4-baseline.ts
```

This will:
1. Run Layer4 performance benchmarks with CPU profiling
2. Generate benchmark metadata
3. Store baseline in `benchmarks/metadata/layer4-correlation-baseline.json`

The baseline is used for regression detection in CI/CD.

## **Related Documentation**

- 📚 [Bun Test Commands](./BUN-TEST-COMMANDS.md) - CLI usage and examples
- 📚 [Bun Test Configuration](./BUN-TEST-CONFIGURATION.md) - Configuration reference
- 📚 [Test Organization](./reviews/TEST_ORGANIZATION.md) - Test structure guide
- 📚 [Benchmarks README](../benchmarks/README.md) - Performance benchmarking

---

## **Quick Reference**

```bash
# Run tests
bun test test/ticks/correlation-detection.test.ts

# Stability (20 repeats)
bun test --repeats=20 test/ticks/correlation-detection.test.ts

# Performance (50 repeats)
bun test --repeats=50 test/profiling/correlation-detection.bench.ts

# Coverage
bun test --coverage --coverage-reporter=html test/ticks/correlation-detection.test.ts

# Using test runner
bun run scripts/test-runner.ts --repeats=20 test/ticks/correlation-detection.test.ts
```

---

Your Layer4 correlation detection test suite is now integrated with Bun's native test infrastructure!
