# Process Management Guide

## Overview

Complete process management configuration with benchmark-backed defaults for the Kimi Shell Bridge.

## 📊 Benchmark Summary

### Signal Handling Performance
```
Handler registration:    1,180,000 ops/sec
Listener count check:   11,457,000 ops/sec
Dispatch latency:            0.0001 ms
Baseline shutdown:           5.0 ms
```

### Command Execution Performance
```
Simple command:         32,000 ops/sec  (0.031 ms avg)
With env vars:          31,800 ops/sec  (0.031 ms avg)
With cwd change:        26,855 ops/sec  (0.037 ms avg)
Full wrapper:           21,913 ops/sec  (0.046 ms avg)
```

### Memory Usage
```
Base footprint:         45 MB
Per-command overhead:   1 KB
Signal state:           128 bytes
Telemetry entry:        64 bytes
Max recommended:        512 MB
```

## ⚙️ Default Configuration

### Signal Handling (`config/process-management.config.ts`)
```typescript
{
  gracefulShutdownTimeoutMs: 5000,  // 5 seconds
  forceExitAfterTimeout: true,
  enabled: true,
}
```

**Exit Codes:**
- `0` - Normal exit
- `130` - SIGINT (Ctrl+C)
- `143` - SIGTERM
- `129` - SIGHUP

### Child Process Management
```typescript
{
  defaultTimeoutMs: 30000,      // 30 seconds
  maxBufferSize: 10485760,      // 10 MB
  validateBinary: true,
  maxConcurrent: 100,
}
```

## 🚀 Usage

### View Configuration
```bash
bun run config/process-management.config.ts
```

### Start with Process Management
```bash
kimi-shell start --all
# Automatically handles signals and graceful shutdown
```

### Custom Configuration
```typescript
import { DEFAULT_SIGNAL_CONFIG } from './config/process-management.config';

const config = {
  ...DEFAULT_SIGNAL_CONFIG,
  gracefulShutdownTimeoutMs: 10000, // 10s for slow cleanup
};
```

## ✅ Validation

### Performance Validation
```typescript
import { validatePerformanceMetrics } from './config/process-management.config';

const result = validatePerformanceMetrics({
  opsPerSec: 20000,
  latencyMs: 0.05,
});

if (!result.valid) {
  console.log(result.violations);
}
```

## 📈 Monitoring

### Health Dashboard
```bash
bun run dashboard/health-dashboard.ts
# View at http://localhost:18790
```

### Signal History
Check signal receipts in dashboard or logs:
```bash
kimi-shell logs --service=bridge
```

## 🛑 SIGTERM vs SIGKILL

### Graceful Shutdown (SIGTERM)
```bash
# Allows cleanup handlers to run
kill -SIGTERM <pid>
# or
kill -15 <pid>
```
- **Exit Code**: 143 (128 + 15)
- **Timeout**: 5000ms (configurable)
- **Cleanup**: Runs all registered handlers
- **Use Case**: Normal shutdown, tests finishing

### Force Kill (SIGKILL)
```bash
# Immediate termination, no cleanup
kill -SIGKILL <pid>
# or
kill -9 <pid>
```
- **Exit Code**: 137 (128 + 9)
- **Cleanup**: None (handlers don't run)
- **Use Case**: Hung process, emergency stop

### Implementation
```typescript
// CLI uses graceful → force pattern
process.kill(pid, "SIGTERM");     // Try graceful first
await Bun.sleep(500);              // Wait for cleanup
if (stillRunning) {
  process.kill(pid, "SIGKILL");   // Force if needed
}
```

## 🔧 Troubleshooting

### Issue: Slow Shutdown
**Solution:** Increase timeout or reduce cleanup handlers
```typescript
gracefulShutdownTimeoutMs: 10000 // Increase from 5000
```

### Issue: High Memory
**Solution:** Check telemetry history size
```typescript
maxHistory: 100 // Reduce from 1000
```

### Issue: Signal Not Handled
**Check:** Verify signal is in handled list
```typescript
handledSignals: ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGUSR1', 'SIGUSR2']
```

## 📚 References

- Bun OS Signals: https://bun.com/docs/guides/process/os-signals
- Configuration: `config/process-management.config.ts`
- Tests: `unified-shell-bridge.test.ts` (Signal Handling section)
- Benchmarks: `unified-shell-bridge.bench.ts`
