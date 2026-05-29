# 🔒 Benchmark Isolation Features

The dev dashboard now supports running benchmarks in isolated subprocesses with comprehensive resource tracking, timeout protection, and production monitoring capabilities.

## Features

### ✅ Better Isolation
- **Separate Process**: Each benchmark runs in its own Bun subprocess
- **Isolated Environment**: Clean environment variables (NODE_ENV=production)
- **Memory Isolation**: Each benchmark has its own memory space
- **Error Isolation**: Failures in one benchmark don't affect others

### 📊 Resource Tracking
- **Memory Usage**: Track max RSS (Resident Set Size) per benchmark
- **CPU Time**: Monitor user and system CPU time
- **Execution Time**: Total wall-clock time including subprocess overhead
- **Display**: Resource metrics shown in dashboard UI

### ⏱️ Timeout Protection
- **Automatic Kill**: Benchmarks timeout after 10 seconds
- **Signal Handling**: Uses SIGTERM for graceful termination
- **Error Reporting**: Timeout errors are clearly reported
- **Configurable**: Timeout can be adjusted per benchmark

### 🏭 Production Monitoring
- **Isolation Mode**: Enabled by default for production
- **Resource Limits**: Track resource usage per benchmark
- **Performance Metrics**: CPU and memory metrics for monitoring
- **Error Handling**: Robust error handling and reporting

## Usage

### Enable Isolation Mode

**Via Environment Variable:**
```bash
BENCHMARK_ISOLATION=true bun run packages/dev-dashboard/src/enhanced-dashboard.ts
```

**Via Config File (`config.toml`):**
```toml
[features]
isolated_benchmarks = true  # Enable isolation mode
```

**Disable Isolation:**
```bash
BENCHMARK_ISOLATION=false bun run packages/dev-dashboard/src/enhanced-dashboard.ts
```

### Dashboard Display

When isolation is enabled, benchmarks show:
- 🔒 **Isolated Badge**: Blue badge indicating subprocess execution
- 💾 **Memory Usage**: Max RSS in KB
- ⏱️ **CPU Time**: User + system CPU time in milliseconds
- 🕐 **Total Time**: Complete execution time including overhead

### Example Output

```
✅ Profile Query (single) 🔒 Isolated
   0.186ms (target: 0.800ms) - ✅ Fast
   💾 Memory: 45.2 KB | ⏱️ CPU: 2.34 ms | 🕐 Total: 12.45 ms
```

## Implementation Details

### Subprocess Execution

```typescript
const proc = Bun.spawn({
  cmd: ['bun', 'run', './benchmark-runner.ts'],
  stdin: 'pipe',
  stdout: 'pipe',
  stderr: 'pipe',
  timeout: 10000, // 10 seconds
  killSignal: 'SIGTERM',
  env: { ...process.env, NODE_ENV: 'production' },
});
```

### Resource Tracking

```typescript
await proc.exited;
const resourceUsage = proc.resourceUsage();

result.resourceUsage = {
  maxRSS: resourceUsage.maxRSS,           // Memory in bytes
  cpuTime: {
    user: resourceUsage.cpuTime.user,      // User CPU time in microseconds
    system: resourceUsage.cpuTime.system,  // System CPU time in microseconds
  },
  executionTime: executionTime,           // Total time in milliseconds
};
```

### Error Handling

- **Exit Code Checking**: Validates process exit code
- **Timeout Detection**: Checks if process was killed
- **Stderr Capture**: Captures and logs error output
- **Graceful Degradation**: Falls back to in-process mode on errors

## Performance Considerations

### Overhead
- **Subprocess Overhead**: ~10-20ms per benchmark
- **Memory Overhead**: ~40-50 KB per isolated benchmark
- **CPU Overhead**: Minimal (process creation is fast in Bun)

### When to Use

✅ **Use Isolation When**:
- Production monitoring
- Need resource tracking
- Want error isolation
- Running untrusted benchmarks
- Need timeout protection

❌ **Skip Isolation When**:
- Development/debugging
- Need maximum speed
- Simple, fast benchmarks
- Already have good isolation

## Configuration

### Timeout Settings

Default: 10 seconds per benchmark

Can be adjusted in `runBenchmarkIsolated()`:
```typescript
timeout: 10000, // milliseconds
killSignal: 'SIGTERM',
```

### Environment Variables

- `BENCHMARK_ISOLATION`: Enable/disable isolation mode
- `NODE_ENV`: Set to 'production' in isolated processes

## Monitoring

### Resource Metrics

Track these metrics for production monitoring:
- **Memory**: Max RSS per benchmark
- **CPU**: User + system CPU time
- **Duration**: Total execution time
- **Success Rate**: Pass/fail ratio

### Dashboard Integration

Resource usage is displayed in the dashboard:
- Badge showing isolation status
- Memory and CPU metrics
- Total execution time
- Status indicators

## References

- [Bun.spawn Documentation](https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn)
- [Resource Usage API](https://bun.com/docs/runtime/child-process#resource-usage)
- [Timeout Protection](https://bun.com/docs/runtime/child-process#using-timeout-and-killsignal)
