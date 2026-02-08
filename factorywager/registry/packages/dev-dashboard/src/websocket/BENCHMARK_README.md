# WebSocket Benchmark Module

Comprehensive benchmarking suite for WebSocket performance testing.

## Requirements

### Server Must Be Running

**⚠️ IMPORTANT:** The WebSocket benchmarks require a running WebSocket server to connect to.

Before running benchmarks, ensure:
1. The dev dashboard server is running (`bun run dev-dashboard` or `bun src/enhanced-dashboard.ts`)
2. The WebSocket endpoint is accessible at the configured URL (default: `ws://localhost:3008/ws`)
3. The server has WebSocket support enabled

### Configuration

The WebSocket URL can be configured in three ways:

1. **Function parameter** (highest priority):
   ```typescript
   await runWebSocketBenchmarks('ws://custom-host:8080/ws');
   ```

2. **Environment variable**:
   ```bash
   WEBSOCKET_BENCHMARK_URL=ws://custom-host:8080/ws bun test
   ```

3. **Default** (lowest priority):
   ```typescript
   await runWebSocketBenchmarks(); // Uses ws://localhost:3008/ws
   ```

## Benchmarks

### 1. Connection Time
Measures the time to establish WebSocket connections.

- **Default iterations:** 10 connections
- **Target:** < 100ms average
- **Metrics:** Average latency, success rate

### 2. Message Throughput
Tests message send/receive performance.

- **Default:** 500 messages, 100 bytes each
- **Target:** > 10,000 messages/second
- **Metrics:** Messages per second, backpressure events

### 3. Concurrent Connections
Tests handling multiple simultaneous connections.

- **Default:** 20 concurrent connections
- **Target:** > 10 connections/second
- **Metrics:** Successful connections, connection rate

### 4. Pub/Sub Performance (Future)
Tests Bun's native pub/sub API performance.

- **Default:** 10 subscribers, 100 messages
- **Target:** > 1,000 messages/second
- **Metrics:** Messages per second, subscriber count

## Usage

### In Dashboard

Benchmarks run automatically when the dashboard loads data:

```typescript
// In enhanced-dashboard.ts
const wsResults = await runWebSocketBenchmarks();
```

### Standalone

```typescript
import { runWebSocketBenchmarks } from './websocket/benchmark.ts';

const results = await runWebSocketBenchmarks('ws://localhost:3008/ws');

results.forEach(result => {
  console.log(`${result.name}: ${result.status} (${result.time.toFixed(2)}ms)`);
  if (result.metadata) {
    console.log('  Metadata:', result.metadata);
  }
});
```

### Individual Benchmarks

```typescript
import {
  benchmarkConnectionTime,
  benchmarkMessageThroughput,
  benchmarkConcurrentConnections,
} from './websocket/benchmark.ts';

// Test connection time
const connectionResult = await benchmarkConnectionTime('ws://localhost:3008/ws', 10);

// Test message throughput
const throughputResult = await benchmarkMessageThroughput('ws://localhost:3008/ws', 1000, 200);

// Test concurrent connections
const concurrentResult = await benchmarkConcurrentConnections('ws://localhost:3008/ws', 50);
```

## Error Handling

All benchmarks include comprehensive error handling:

- **Connection failures:** Gracefully handled, returns `fail` status with error message
- **Timeouts:** Configurable timeouts prevent hanging (default: 10-30 seconds)
- **Network errors:** Caught and reported in benchmark results

## Performance Considerations

- Benchmarks use `Bun.nanoseconds()` for high-precision timing
- Small delays between benchmarks prevent server overload
- Connections are properly closed after each benchmark
- Uses Bun's native WebSocket API for optimal performance

## Troubleshooting

### "Connection failed" errors

1. Verify server is running: `curl http://localhost:3008/api/health`
2. Check WebSocket endpoint: `wscat -c ws://localhost:3008/ws`
3. Verify firewall/network settings

### "Timeout" errors

1. Server may be overloaded - reduce benchmark parameters
2. Network latency - use a closer server URL
3. Server not responding - check server logs

### Low performance scores

1. Check server resources (CPU, memory, network)
2. Verify WebSocket compression is enabled (`perMessageDeflate: true`)
3. Check for network bottlenecks
4. Review server WebSocket configuration

## Integration

The benchmarks are automatically integrated into the dev dashboard:

- Results appear in the dashboard UI
- Broadcast via WebSocket (`websocket:complete` events)
- Saved to benchmark history database
- Included in performance score calculation

## Testing

Run unit tests:

```bash
bun test src/websocket/benchmark.test.ts
```

The test suite includes:
- Mock WebSocket implementations
- Error handling tests
- Timeout tests
- Configuration tests

## References

- [Bun WebSocket Documentation](https://bun.com/docs/runtime/websockets)
- [Bun Performance APIs](https://bun.com/docs/runtime/bun-apis)
- [WebSocket Protocol](https://datatracker.ietf.org/doc/html/rfc6455)
