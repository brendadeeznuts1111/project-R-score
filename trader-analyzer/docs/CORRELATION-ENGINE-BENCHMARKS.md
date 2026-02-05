# Correlation Engine Benchmarks

**Version:** 1.1.1.1.4.5.0  
**Date:** 2024-01-XX  
**Runtime:** Bun 1.3.3 (arm64-darwin)  
**CPU:** Apple M4 @ ~4.21 GHz

## Overview

Performance benchmarks for the DoD Multi-Layer Correlation Engine, testing layer building, anomaly detection, propagation prediction, and error handling.

## Test Setup

- **Test Database:** SQLite with WAL mode
- **Test Data:** 12,000 correlations (3 events × 4 layers × 1,000 correlations each)
- **Time Windows:**
  - Layer 1: 1 hour
  - Layer 2: 24 hours
  - Layer 3: 7 days
  - Layer 4: 24 hours

## Benchmark Results

### Layer Building Performance

| Operation | Average | Min | Max | P75 | P99 |
|-----------|---------|-----|-----|-----|-----|
| `buildLayer1` - Direct correlations | **48.08 µs** | 40.71 µs | 327.54 µs | 48.75 µs | 101.42 µs |
| `buildLayer2` - Cross-market correlations | **676.53 µs** | 617.92 µs | 864.63 µs | 695.88 µs | 810.42 µs |
| `buildLayer3` - Cross-event correlations | **681.34 µs** | 628.29 µs | 961.29 µs | 699.08 µs | 851.00 µs |
| `buildLayer4` - Cross-sport correlations | **689.91 µs** | 628.13 µs | 850.29 µs | 707.71 µs | 832.92 µs |

**Analysis:**
- Layer 1 is significantly faster (~14x) due to smaller time window (1 hour vs 24 hours/7 days)
- Layers 2-4 show consistent performance (~680-690 µs) despite different time windows
- All layers complete well under 1ms, suitable for real-time operations

### Graph Building Performance

| Operation | Average | Min | Max | P75 | P99 |
|-----------|---------|-----|-----|-----|-----|
| `buildMultiLayerGraph` - All layers | **2.20 ms** | 2.04 ms | 2.82 ms | 2.24 ms | 2.61 ms |
| `buildMultiLayerGraph` - Invalid eventId (error handling) | **22.27 µs** | 12.21 µs | 2.00 ms | 16.17 µs | 48.63 µs |

**Analysis:**
- Full graph building takes ~2.2ms (all 4 layers in parallel)
- Error handling is fast (~22µs) for invalid inputs
- Parallel execution of layers provides good performance

### Anomaly Detection Performance

| Operation | Average | Min | Max | P75 | P99 |
|-----------|---------|-----|-----|-----|-----|
| `detectAnomalies` - Full graph (0.6 threshold) | **3.91 ms** | 3.39 ms | 6.43 ms | 3.97 ms | 5.73 ms |
| `detectAnomalies` - High confidence (0.9 threshold) | **4.17 ms** | 3.65 ms | 5.51 ms | 4.42 ms | 5.30 ms |
| `detectAnomalies` - Low confidence (0.3 threshold) | **4.76 ms** | 4.38 ms | 5.56 ms | 4.86 ms | 5.45 ms |

**Analysis:**
- Anomaly detection adds ~1.7ms overhead to graph building
- Higher thresholds slightly faster (fewer anomalies to process)
- Performance consistent across confidence thresholds (~4-5ms)

### Propagation Prediction Performance

| Operation | Average | Min | Max | P75 | P99 |
|-----------|---------|-----|-----|-----|-----|
| `predictPropagationPath` - Short path (depth=2) | **367.60 µs** | 330.38 µs | 1.01 ms | 371.33 µs | 435.75 µs |
| `predictPropagationPath` - Deep path (depth=4) | **365.10 µs** | 328.92 µs | 648.83 µs | 369.13 µs | 410.38 µs |

**Analysis:**
- Propagation prediction is fast (~365-370 µs)
- Depth doesn't significantly impact performance (recursive SQL is efficient)
- Well-suited for real-time path analysis

### Database Query Performance

| Operation | Average | Min | Max | P75 | P99 |
|-----------|---------|-----|-----|-----|-----|
| Layer 1 query (1 hour window) | **163.00 µs** | 147.00 µs | 314.46 µs | 165.38 µs | 189.38 µs |
| Layer 2 query (24 hour window) | **1.00 ms** | 950.13 µs | 1.23 ms | 1.01 ms | 1.13 ms |
| Layer 3 query (7 day window) | **1.01 ms** | 947.96 µs | 1.43 ms | 1.01 ms | 1.13 ms |
| Layer 4 query (24 hour window) | **961.88 µs** | 883.71 µs | 1.13 ms | 977.00 µs | 1.06 ms |

**Analysis:**
- Layer 1 queries are fastest (smallest time window)
- Layers 2-4 queries are consistent (~1ms) despite different windows
- Indexes are effective (queries use `idx_layer_confidence` and `idx_event_detection`)

### Error Handling Performance

| Operation | Average | Min | Max | P75 | P99 |
|-----------|---------|-----|-----|-----|-----|
| `buildLayer1` - Invalid eventId | **11.78 µs** | 11.29 µs | 12.34 µs | 11.96 µs | 12.26 µs |
| `buildLayer2` - Invalid eventId | **10.57 µs** | 10.30 µs | 10.94 µs | 10.69 µs | 10.76 µs |
| `buildLayer3` - Invalid eventId | **10.51 µs** | 10.36 µs | 10.70 µs | 10.64 µs | 10.69 µs |
| `buildLayer4` - Invalid eventId | **10.60 µs** | 10.42 µs | 10.86 µs | 10.70 µs | 10.84 µs |

**Analysis:**
- Error handling is very fast (~10-12 µs)
- All layers handle errors consistently
- Try-catch overhead is minimal

## Performance Summary

### Throughput Estimates

- **Graph Building:** ~450 graphs/second (2.2ms per graph)
- **Anomaly Detection:** ~250 detections/second (4ms per detection)
- **Propagation Prediction:** ~2,700 predictions/second (370µs per prediction)

### Latency Targets

✅ **All operations meet real-time requirements:**
- Layer building: < 1ms ✅
- Graph building: < 3ms ✅
- Anomaly detection: < 5ms ✅
- Propagation prediction: < 1ms ✅

### Memory Usage

- Peak memory during benchmarks: ~512 KB
- Average memory per operation: ~10-20 KB
- Database queries: ~0-32 KB per query

## Recommendations

1. **Layer 1 Optimization:** Already optimal due to small time window
2. **Layers 2-4:** Consider query result caching for frequently accessed events
3. **Anomaly Detection:** Current performance is acceptable; consider parallel processing for very large graphs
4. **Database:** Indexes are working well; monitor query performance as data grows

## Running Benchmarks

```bash
# Run benchmarks
bun run bench/correlation-engine.ts

# JSON output (for CI/CD)
BENCHMARK_RUNNER=1 bun run bench/correlation-engine.ts
```

## Test Data

Benchmarks use synthetic data:
- 3 event IDs (NBA, NFL, MLB)
- 4 layers (1-4)
- 1,000 correlations per layer per event
- Random correlation scores (-1 to 1)
- Random timestamps (within time windows)

## Notes

- Benchmarks run with WAL mode enabled for better concurrency
- All timings include database I/O
- Results may vary based on system load and database size
- Real-world performance may differ with actual data patterns
