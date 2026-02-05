# Correlation Graph Console Logging with Bun

**Version**: 4.2.2.4.0.0.0  
**Last Updated**: 2025-01-15

## Overview

The Correlation Graph Dashboard uses a Bun-native logger utility (`src/utils/bun-logger.ts`) that leverages:

- **Direct `stdout.write()`**: Fast output bypassing console wrapper
- **Bun's built-in ANSI colors**: No external color library needed
- **Bun's Temporal polyfill**: No external date/time library needed
- **Structured object logging**: Benefits from bunfig.toml depth=5 setting

This provides optimal performance and removes unnecessary dependencies.

## Bun Console Depth Configuration

### Configuration

The project is configured in `bunfig.toml`:

```toml
[console]
depth = 5
```

This setting controls how deeply nested objects are displayed in `console.log()`, `console.debug()`, `console.info()`, etc.

**Official Documentation**: [Bun Console Depth](https://bun.com/docs/runtime/console#object-inspection-depth)

### How It Works

- **Default**: Objects are inspected to depth `2` levels (without configuration)
- **Configured**: Our project uses depth `5` for detailed inspection
- **CLI Override**: Use `--console-depth <number>` to override for a single run
- **Precedence**: CLI flags override `bunfig.toml` settings

### Configuration File Location

Bun looks for `bunfig.toml` in the following order (local overrides global):

1. **Local**: `./config/bunfig.toml` (project config directory) - **Current configuration**
2. **Global**: `$HOME/.bunfig.toml`
3. **Global**: `$XDG_CONFIG_HOME/.bunfig.toml`

CLI flags always take precedence over configuration files.

### Benefits for Correlation Graph Logging

With `depth = 5`, structured logging objects display full nested details:

```typescript
console.info(`[correlation-graph] Aggregation complete:`, {
  nodes: 28,
  edges: 52,
  bookmakers: 3,
  duration: "265.89ms",
  operationId: "op-1234567890-abc123",
  performanceBreakdown: {
    query: "123.45ms",
    nodes: "45.67ms",
    edges: "78.90ms",
    layers: "12.34ms",
    stats: "5.67ms"
  }
});
```

**Output with depth=5:**
```
[correlation-graph] Aggregation complete: {
  nodes: 28,
  edges: 52,
  bookmakers: 3,
  duration: "265.89ms",
  operationId: "op-1234567890-abc123",
  performanceBreakdown: {
    query: "123.45ms",
    nodes: "45.67ms",
    edges: "78.90ms",
    layers: "12.34ms",
    stats: "5.67ms"
  }
}
```

**With default depth=2:**
```
[correlation-graph] Aggregation complete: {
  nodes: 28,
  edges: 52,
  bookmakers: 3,
  duration: "265.89ms",
  operationId: "op-1234567890-abc123",
  performanceBreakdown: [Object]
}
```

## Structured Logging Patterns

### Request Logging

```typescript
console.info(`[api/correlation-graph] Request received:`, {
  requestId,
  eventId: eventId || "missing",
  timeWindow: timeWindowParam || "default",
  clientIp,
  userAgent: userAgent.substring(0, 100),
});
```

### Performance Breakdown

```typescript
console.debug(`[correlation-graph] Performance breakdown:`, {
  query: `${queryDuration.toFixed(2)}ms`,
  nodes: `${nodeDuration.toFixed(2)}ms`,
  edges: `${edgeDuration.toFixed(2)}ms`,
  layers: `${layerDuration.toFixed(2)}ms`,
  stats: `${statsDuration.toFixed(2)}ms`,
  total: `${totalDuration.toFixed(2)}ms`,
});
```

### Layer Summaries

```typescript
console.debug(`[correlation-graph] Layer summaries calculated:`, {
  duration: `${layerDuration.toFixed(2)}ms`,
  layers: layerSummaries.map(l => ({
    layer: l.layer,
    nodes: l.nodeCount,
    edges: l.edgeCount,
    avgCorrelation: l.avgCorrelationStrength.toFixed(3),
  })),
});
```

**Output (depth=5 shows full array details):**
```
[correlation-graph] Layer summaries calculated: {
  duration: "12.34ms",
  layers: [
    {
      layer: 1,
      nodes: 5,
      edges: 8,
      avgCorrelation: "0.720"
    },
    {
      layer: 2,
      nodes: 12,
      edges: 24,
      avgCorrelation: "0.580"
    },
    {
      layer: 3,
      nodes: 8,
      edges: 15,
      avgCorrelation: "0.450"
    },
    {
      layer: 4,
      nodes: 3,
      edges: 5,
      avgCorrelation: "0.320"
    }
  ]
}
```

### Error Logging

```typescript
console.error(`[correlation-graph] Aggregation error:`, {
  eventId,
  operationId,
  error: errorMessage,
  duration: `${errorDuration.toFixed(2)}ms`,
  stack: error instanceof Error ? error.stack : undefined,
});
```

## Console Methods Used

### `console.info()`
- Request lifecycle events
- Aggregation completion
- Cache operations

### `console.debug()`
- Detailed diagnostics
- Performance breakdowns
- Data processing steps
- Cache hits/misses

### `console.warn()`
- Validation failures
- Invalid parameters
- Configuration issues

### `console.error()`
- Error conditions
- Exceptions with stack traces
- Failed operations

## CLI Override Examples

### Temporary Depth Increase

For deeper inspection during debugging:

```bash
bun --console-depth 10 run dev
```

### Temporary Depth Decrease

For cleaner output:

```bash
bun --console-depth 2 run dev
```

### Testing with Different Depths

```bash
# See full nested structures
bun --console-depth 10 test test/api/dashboard-correlation-graph.test.ts

# See minimal output
bun --console-depth 1 test test/api/dashboard-correlation-graph.test.ts
```

## Best Practices

### 1. Use Structured Objects

**Good:**
```typescript
console.info(`[correlation-graph] Operation:`, {
  operationId,
  eventId,
  duration: `${duration}ms`,
  result: { nodes: 28, edges: 52 }
});
```

**Avoid:**
```typescript
console.info(`[correlation-graph] Operation ${operationId} for ${eventId} took ${duration}ms with ${nodes} nodes and ${edges} edges`);
```

### 2. Leverage Depth for Nested Data

With `depth = 5`, you can log complex nested structures:

```typescript
console.debug(`[correlation-graph] Full operation result:`, {
  operationId,
  eventId,
  success: true,
  duration: 265.89,
  nodesGenerated: 28,
  edgesGenerated: 52,
  performanceBreakdown: {
    query: { time: 123.45, rows: 15 },
    nodes: { time: 45.67, count: 28 },
    edges: { time: 78.90, count: 52 },
    layers: { time: 12.34, summaries: [...] },
    stats: { time: 5.67 }
  },
  statistics: {
    totalNodes: 28,
    totalEdges: 52,
    avgCorrelationStrength: 0.58,
    maxCorrelationStrength: 0.95,
    bookmakers: ["pinnacle", "draftkings", "betfair"]
  }
});
```

### 3. Include Operation Context

Always include operation IDs and request IDs for traceability:

```typescript
console.info(`[correlation-graph] Operation:`, {
  operationId,      // Unique operation identifier
  requestId,        // Request identifier (if available)
  eventId,          // Event being processed
  // ... other context
});
```

### 4. Performance Metrics

Structure performance data for easy inspection:

```typescript
console.debug(`[correlation-graph] Performance:`, {
  total: `${totalDuration.toFixed(2)}ms`,
  breakdown: {
    query: `${queryDuration.toFixed(2)}ms`,
    processing: `${processingDuration.toFixed(2)}ms`,
    aggregation: `${aggregationDuration.toFixed(2)}ms`,
  },
  efficiency: {
    nodesPerMs: (nodes.length / totalDuration).toFixed(2),
    edgesPerMs: (edges.length / totalDuration).toFixed(2),
  }
});
```

## Comparison: Before vs After

### Before (String Concatenation)

```typescript
logger.info(
  `[correlation-graph] Graph aggregation complete: ${nodes.length} nodes, ` +
  `${edges.length} edges, ${allBookmakers.length} bookmakers, ` +
  `${totalDuration.toFixed(2)}ms total`
);
```

**Output:**
```
[correlation-graph] Graph aggregation complete: 28 nodes, 52 edges, 3 bookmakers, 265.89ms total
```

### After (Structured Objects)

```typescript
console.info(`[correlation-graph] Aggregation complete:`, {
  nodes: nodes.length,
  edges: edges.length,
  bookmakers: allBookmakers.length,
  duration: `${totalDuration.toFixed(2)}ms`,
  operationId,
});
```

**Output (with depth=5):**
```
[correlation-graph] Aggregation complete: {
  nodes: 28,
  edges: 52,
  bookmakers: 3,
  duration: "265.89ms",
  operationId: "op-1234567890-abc123"
}
```

## Debugging Tips

### 1. Increase Depth for Complex Objects

When debugging complex nested structures:

```bash
bun --console-depth 10 run dev
```

### 2. Use console.debug() for Detailed Info

Set `LOG_LEVEL=debug` to see all debug logs:

```bash
LOG_LEVEL=debug bun run dev
```

### 3. Filter Logs by Operation ID

Use operation IDs to trace specific requests:

```bash
# In terminal
bun run dev | grep "op-1234567890-abc123"
```

### 4. Inspect Performance Breakdowns

Performance breakdowns are structured for easy inspection:

```typescript
// All timing data is in one structured object
console.debug(`[correlation-graph] Performance breakdown:`, {
  query: "123.45ms",
  nodes: "45.67ms",
  edges: "78.90ms",
  layers: "12.34ms",
  stats: "5.67ms",
  total: "265.89ms"
});
```

## References

- **[Bun Console Documentation - Object Inspection Depth](https://bun.com/docs/runtime/console#object-inspection-depth)** - Official Bun documentation
- [bunfig.toml Configuration](../config/bunfig.toml) - Project console depth configuration
- [Correlation Graph Logging](./CORRELATION-GRAPH-LOGGING.md) - General logging documentation
- [Console Depth Debugging Features](./7.0.0.0.0.0.0-CONSOLE-DEPTH-DEBUGGING.md) - Hyper-Bun console enhancements

## Quick Reference

### Configure Depth

**bunfig.toml:**
```toml
[console]
depth = 5  # Current project setting
```

**CLI Override:**
```bash
bun --console-depth 10 run dev  # Temporary override
```

### Example Output Comparison

**With depth=2 (default):**
```
[correlation-graph] Operation result: {
  operationId: "op-123",
  performanceBreakdown: [Object]  # Hidden!
}
```

**With depth=5 (configured):**
```
[correlation-graph] Operation result: {
  operationId: "op-123",
  performanceBreakdown: {
    query: "123.45ms",
    nodes: "45.67ms",
    edges: "78.90ms",
    layers: "12.34ms",
    stats: "5.67ms"
  }
}
```

### Best Practices

1. **Use Structured Objects**: Always log objects, not string concatenation
2. **Leverage Depth**: Configure appropriate depth for your data structures
3. **CLI Override**: Use `--console-depth` for temporary debugging
4. **Document Depth**: Reference depth setting in code comments
