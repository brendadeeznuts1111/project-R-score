# 🚀 Bun.spawn Usage Guide

This document outlines how to use `Bun.spawn` for running benchmarks, tests, and other subprocess operations in the dev dashboard.

## Overview

`Bun.spawn` provides a fast, efficient way to spawn child processes with better resource management and isolation than traditional Node.js `child_process` APIs.

## Key Benefits

1. **Isolation**: Run benchmarks/tests in separate processes for better resource isolation
2. **Performance**: Lower overhead than Node.js `child_process`
3. **Streaming**: Built-in support for ReadableStream, FileSink, and more
4. **Resource Management**: Better control over process lifecycle and cleanup

## Use Cases

### 1. Isolated Benchmark Execution

Run benchmarks in separate processes to avoid interference:

```typescript
const proc = Bun.spawn({
  cmd: ['bun', 'run', './benchmark-runner.ts'],
  stdin: 'pipe',
  stdout: 'pipe',
  env: { ...process.env },
});

// Send benchmark config
proc.stdin.write(JSON.stringify({
  name: 'Profile Query (single)',
  target: 0.8,
  iterations: 10,
  category: 'performance',
}));
proc.stdin.end();

// Read result
const resultJson = await proc.stdout.text();
const result = JSON.parse(resultJson);
await proc.exited;
```

### 2. Parallel Test Execution

Run multiple tests in parallel subprocesses:

```typescript
const testProcs = testFiles.map(file => 
  Bun.spawn({
    cmd: ['bun', 'test', file],
    stdout: 'pipe',
    stderr: 'pipe',
  })
);

const results = await Promise.all(
  testProcs.map(async proc => {
    const stdout = await proc.stdout.text();
    const stderr = await proc.stderr.text();
    await proc.exited;
    return { stdout, stderr, exitCode: proc.exitCode };
  })
);
```

### 3. Timeout Protection

Automatically kill long-running processes:

```typescript
const proc = Bun.spawn({
  cmd: ['bun', 'run', './slow-benchmark.ts'],
  timeout: 5000, // 5 seconds
  killSignal: 'SIGTERM',
});

try {
  await proc.exited;
} catch (error) {
  if (proc.killed) {
    console.error('Benchmark timed out');
  }
}
```

### 4. Resource Usage Tracking

Monitor CPU and memory usage:

```typescript
const proc = Bun.spawn({
  cmd: ['bun', 'run', './benchmark.ts'],
});

await proc.exited;

const usage = proc.resourceUsage();
console.log(`Max memory: ${usage.maxRSS} bytes`);
console.log(`CPU time: ${usage.cpuTime.user + usage.cpuTime.system} µs`);
```

## Implementation Status

### ✅ Created: `benchmark-runner.ts`
- Isolated benchmark runner that can be spawned as a subprocess
- Accepts benchmark config via stdin
- Returns results via stdout as JSON

### 🔄 Current: In-Process Execution
- Benchmarks run directly in the dashboard process
- Faster startup, less isolation
- Good for development and quick iterations

### 🚀 Future: Optional Subprocess Mode
- Add flag to enable subprocess execution
- Better for production monitoring
- Isolated resource usage tracking

## Example: Running Benchmarks with Bun.spawn

```typescript
import { spawn } from 'bun';

async function runBenchmarkInSubprocess(config: BenchmarkConfig): Promise<BenchmarkResult> {
  const proc = Bun.spawn({
    cmd: ['bun', 'run', './benchmark-runner.ts'],
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      NODE_ENV: 'production', // Isolated environment
    },
    onExit(proc, exitCode, signalCode, error) {
      if (error) {
        console.error('Benchmark process error:', error);
      }
    },
  });
  
  // Send config
  const encoder = new TextEncoder();
  proc.stdin.write(encoder.encode(JSON.stringify(config)));
  proc.stdin.end();
  
  // Read result
  const resultText = await proc.stdout.text();
  const errorText = await proc.stderr.text();
  
  if (errorText) {
    console.warn('Benchmark stderr:', errorText);
  }
  
  await proc.exited;
  
  if (proc.exitCode !== 0) {
    throw new Error(`Benchmark failed with exit code ${proc.exitCode}`);
  }
  
  return JSON.parse(resultText);
}
```

## Performance Considerations

### When to Use Subprocesses

✅ **Use subprocesses when**:
- Need resource isolation (memory, CPU limits)
- Running untrusted code
- Want accurate resource usage metrics
- Need timeout protection
- Running long-running operations

❌ **Skip subprocesses when**:
- Need maximum performance (in-process is faster)
- Quick iterations during development
- Simple, fast operations
- Already have good isolation

## References

- [Bun.spawn Documentation](https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn)
- [Bun API Reference](https://bun.com/docs/runtime/bun-apis)
