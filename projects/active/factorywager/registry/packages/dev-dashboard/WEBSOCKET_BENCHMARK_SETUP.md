# WebSocket Benchmark Setup & Testing

## ✅ Completed Tasks

### 1. Dashboard HTML Extraction Testing ✓
- **Status:** Verified working
- **Tests:** All 10 tests passing
- **Verification:**
  - HTML file loads successfully (92,691 bytes)
  - Contains required structure (DOCTYPE, head, body, scripts, styles)
  - WebSocket connection code present
  - Fetch API calls present
  - Fraud fragment loads correctly

### 2. Unit Tests for WebSocket Benchmarks ✓
- **Location:** `src/websocket/benchmark.test.ts`
- **Coverage:**
  - Connection time benchmarking
  - Message throughput testing
  - Concurrent connection handling
  - Error handling and timeouts
  - Configuration testing

### 3. Benchmark Requirements Documentation ✓
- **Location:** `src/websocket/BENCHMARK_README.md`
- **Contents:**
  - Server requirements (must be running)
  - Configuration options (3 ways to set URL)
  - Benchmark descriptions
  - Usage examples
  - Troubleshooting guide
  - Performance considerations

### 4. Configurable WebSocket URL ✓
- **Implementation:** Three-tier configuration priority
  1. Function parameter (highest priority)
  2. Environment variable (`WEBSOCKET_BENCHMARK_URL`)
  3. Config file (`server.websocket_url`)
  4. Default construction from server settings

## Configuration Options

### Option 1: Function Parameter
```typescript
await runWebSocketBenchmarks('ws://custom-host:8080/ws');
```

### Option 2: Environment Variable
```bash
WEBSOCKET_BENCHMARK_URL=ws://custom-host:8080/ws bun run dashboard
```

### Option 3: Config File (config.toml)
```toml
[server]
websocket_url = "ws://localhost:3008/ws"
```

### Option 4: Default (Auto-constructed)
Automatically constructs from `server.hostname` and `server.port`:
```toml
[server]
hostname = "0.0.0.0"
port = 3008
# Results in: ws://0.0.0.0:3008/ws
```

## Testing

### Run Dashboard Tests
```bash
bun test src/enhanced-dashboard.test.ts
```

### Run WebSocket Benchmark Tests
```bash
bun test src/websocket/benchmark.test.ts
```

### Run All Tests
```bash
bun test
```

## Requirements

⚠️ **IMPORTANT:** WebSocket benchmarks require a running server:

1. Start the dashboard server:
   ```bash
   bun run dev-dashboard
   # or
   bun src/enhanced-dashboard.ts
   ```

2. Verify server is running:
   ```bash
   curl http://localhost:3008/api/health
   ```

3. Verify WebSocket endpoint:
   ```bash
   # Using wscat (if installed)
   wscat -c ws://localhost:3008/ws
   ```

## Integration

The benchmarks are automatically integrated into the dashboard:

- Run on dashboard data refresh
- Results appear in dashboard UI
- Broadcast via WebSocket (`websocket:complete` events)
- Saved to benchmark history database
- Included in performance score calculation

## Files Modified/Created

### New Files
- `src/websocket/benchmark.ts` - Benchmark implementation
- `src/websocket/benchmark.test.ts` - Unit tests
- `src/websocket/BENCHMARK_README.md` - Documentation
- `src/enhanced-dashboard.test.ts` - Dashboard tests
- `WEBSOCKET_BENCHMARK_SETUP.md` - This file

### Modified Files
- `src/enhanced-dashboard.ts` - Integration and URL configuration
- `src/websocket/manager.ts` - WebSocket optimizations
- `src/types.ts` - Added WebSocketBenchmarkResult type
- `config.toml` - Added WebSocket URL configuration option

## Next Steps

1. ✅ Dashboard HTML extraction verified
2. ✅ Unit tests added
3. ✅ Documentation complete
4. ✅ WebSocket URL configurable
5. ⏭️ Consider adding integration tests with real WebSocket server
6. ⏭️ Add benchmark result visualization in dashboard UI
