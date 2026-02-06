---
name: metrics
description: View system performance metrics and telemetry. Use when checking heap statistics, route performance, system health, or debugging performance issues.
---

# Metrics

View system performance metrics and telemetry.

## Usage

```text
/metrics           - Show current performance metrics
/metrics heap      - Heap statistics (memory usage)
/metrics routes    - Route performance breakdown
/metrics health    - System health status
/metrics report    - Full performance report
```

## HTTP Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /mcp/metrics` | Registry performance metrics |
| `GET /mcp/health` | Health check with status |

## Examples

```bash
# Get registry metrics
curl http://localhost:3333/mcp/metrics

# Health check
curl http://localhost:3333/mcp/health
```

## Performance Targets (SLA)

| Metric | Target | Description |
|--------|--------|-------------|
| P99 Latency | 10.8ms | 99th percentile request |
| Dispatch | <0.03ms | URLPattern match + params |
| Route Test | <0.01ms | URLPattern.test() only |
| Heap Reduction | -14% | vs Node.js baseline |
| Cold Start | ~0ms | Server initialization |

## Health Status Levels

| Status | Heap Pressure | Dispatch Time |
|--------|--------------|---------------|
| EXCELLENT | <30% | <0.05us |
| GOOD | 30-50% | 0.05-0.5us |
| ACCEPTABLE | 50-70% | 0.5-5us |
| DEGRADED | 70-90% | 5-10us |
| CRITICAL | >90% | >10us |

## Telemetry Functions

```typescript
import { getPerformanceTelemetry, getPerformanceHealth } from './core/performance';

const telemetry = getPerformanceTelemetry();
console.log(`Health: ${getPerformanceHealth()}`);
console.log(`Heap: ${telemetry.heapPressure.toFixed(2)}%`);
```

## Heap Analysis

```typescript
import { heapStats } from 'bun:jsc';

const stats = heapStats();
console.log(`Heap Size: ${stats.heapSize}`);
console.log(`Object Count: ${stats.objectCount}`);
```

## Related Skills

- `/bench` - Run performance benchmarks
- `/exchange` - Exchange-specific metrics
