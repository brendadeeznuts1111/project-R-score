# Bun.spawnSync() Performance Guide

**Real-world validation of Bun v1.3.6+ spawn optimizations**

---

## Overview

Bun v1.3.6+ includes a significant `spawnSync()` optimization for Linux systems that support the `close_range()` syscall. This is a **real, measurable improvement** that can provide 20-30x faster process spawning on compatible systems.

## Performance Characteristics

| Platform | Performance | Optimization |
|----------|-------------|--------------|
| **Linux (glibc ≥ 2.34, kernel ≥ 5.9)** | **~0.4-1ms** | `close_range()` syscall |
| Linux (older systems) | ~5-15ms | Iterative FD closing |
| macOS ARM64 | ~0.7-1ms | Platform-specific optimizations |
| macOS x64 | ~5-10ms | Standard implementation |

## How It Works

### The Problem

When spawning processes, the child must close all inherited file descriptors (FDs) except stdin/stdout/stderr. On systems with many open FDs (potentially 65K+), iterating through each FD is expensive:

```c
// Old approach: O(n) where n = max FD limit
for (int fd = 3; fd < get_max_fd(); fd++) {
  close(fd);  // ~0.2μs per FD
}
// With 65K FDs: 65000 × 0.2μs = 13ms overhead
```

### The Solution

The `close_range()` syscall (Linux 5.9+, glibc 2.34+) closes all FDs in a range with a single system call:

```c
// New approach: O(1)
close_range(3, UINT_MAX, 0);  // Closes all FDs ≥ 3 instantly
// ~0.4ms total, regardless of FD count
```

## Validation

### Check Your System

```bash
# Verify glibc version (need ≥ 2.34)
ldd --version | head -n1

# Verify kernel version (need ≥ 5.9)
uname -r

# Quick spawn benchmark
bun run spawn:check
```

### Expected Results

**Linux with close_range():**
```
⏱️  Spawn Performance (100 iterations)
  Min:    0.38ms
  Median: 0.42ms
  Mean:   0.45ms
  P95:    0.58ms
  Max:    0.82ms

Status: ✅ Excellent
```

**macOS ARM64:**
```
⏱️  Spawn Performance (100 iterations)
  Min:    0.65ms
  Median: 0.72ms
  Mean:   0.78ms
  P95:    1.09ms
  Max:    1.60ms

Status: ✅ Excellent
```

## Production Usage

### Safe Spawn Wrapper

```typescript
import { spawn } from "bun";

export function spawnSafe(
  command: string[],
  options: Parameters<typeof spawn>[1] = {}
) {
  // Validate command (prevent injection)
  if (!command || command.length === 0) {
    throw new Error("Empty command");
  }

  // Reject suspicious patterns
  const cmd = command[0];
  if (cmd.includes("..") || cmd.includes(";") || cmd.includes("|")) {
    throw new Error(`Suspicious command: ${cmd}`);
  }

  // Execute with timing
  const start = performance.now();
  const result = Bun.spawnSync(command, {
    ...options,
    stdout: options.stdout ?? "pipe",
    stderr: options.stderr ?? "pipe",
  });
  const duration = performance.now() - start;

  // Warn on slow spawns in production
  if (duration > 5 && process.env.NODE_ENV === "production") {
    console.warn(`Slow spawn: ${command.join(" ")} took ${duration.toFixed(1)}ms`);
  }

  return { ...result, duration };
}
```

### Spawn Monitoring

```typescript
import { SpawnMonitor } from "./tools/spawn-monitor";

const monitor = new SpawnMonitor();

// Wrap your spawn calls
function monitoredSpawn(command: string[]) {
  const start = performance.now();
  const result = Bun.spawnSync(command);
  monitor.record(performance.now() - start);
  return result;
}

// Check stats periodically
setInterval(() => {
  const stats = monitor.getStats();
  if (stats.slowCount > 10) {
    console.warn(`${stats.slowCount} slow spawns detected`);
    console.warn(`Mean: ${stats.mean.toFixed(2)}ms, P95: ${stats.p95.toFixed(2)}ms`);
  }
}, 60000); // Every minute
```

### Batch Processing

```typescript
async function spawnBatch(
  commands: Array<{ cmd: string[]; options?: SpawnOptions }>,
  concurrency = 10
): Promise<SpawnResult[]> {
  const results: SpawnResult[] = [];

  for (let i = 0; i < commands.length; i += concurrency) {
    const batch = commands.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(({ cmd, options }) =>
        Bun.spawn(cmd, { ...options, stdout: "pipe", stderr: "pipe" })
      )
    );

    for (const proc of batchResults) {
      results.push({
        stdout: await new Response(proc.stdout).text(),
        stderr: await new Response(proc.stderr).text(),
        exitCode: await proc.exitCode,
        pid: proc.pid,
      });
    }
  }

  return results;
}
```

## Benchmarking

### Quick Benchmark

```bash
# 100 iterations (default)
bun run spawn:monitor

# 500 iterations for more accuracy
bun run spawn:bench

# Just check system support
bun run spawn:check
```

### Manual Benchmark

```typescript
// Warmup
for (let i = 0; i < 10; i++) {
  Bun.spawnSync(["true"]);
}

// Timed runs
const times: number[] = [];
for (let i = 0; i < 100; i++) {
  const start = performance.now();
  Bun.spawnSync(["true"]);
  times.push(performance.now() - start);
}

const sorted = times.sort((a, b) => a - b);
const median = sorted[Math.floor(sorted.length / 2)];
console.log(`Median: ${median.toFixed(2)}ms`);
```

## Security Considerations

### ⚠️ Never Do This

```typescript
// 🚫 DANGEROUS - Command injection vulnerability
const userInput = req.query.command; // Attacker: "; rm -rf /"
Bun.spawnSync([userInput]);
```

### ✅ Always Do This

```typescript
// Whitelist allowed commands
const ALLOWED_COMMANDS = ["git", "npm", "bun", "node"];

function safeSpawn(command: string, args: string[]) {
  if (!ALLOWED_COMMANDS.includes(command)) {
    throw new Error(`Command not allowed: ${command}`);
  }

  // Validate arguments (no shell metacharacters)
  for (const arg of args) {
    if (/[;&|`$()]/.test(arg)) {
      throw new Error(`Invalid argument: ${arg}`);
    }
  }

  return Bun.spawnSync([command, ...args]);
}
```

## Troubleshooting

### Slow Spawns on Linux

If you have close_range() support but still see slow spawns (>2ms average):

1. **Check system load**: High CPU or memory pressure affects all syscalls
2. **Check ulimits**: `ulimit -n` - very high limits can slow fallback paths
3. **Check kernel version**: Ensure you're actually running kernel ≥ 5.9
4. **Profile with strace**: `strace -c -f bun your-script.ts` to see syscall breakdown

### False Positives

The monitor may report "slow" spawns if:
- System is under heavy load
- First spawn includes JIT compilation overhead
- Running inside containers with resource limits
- Network file systems (NFS/EFS) are involved

Run with `-n 500` for more stable measurements.

## References

- **Bun Spawn API**: https://bun.sh/docs/api/spawn
- **close_range() man page**: `man 2 close_range`
- **Linux kernel 5.9 release**: https://kernelnewbies.org/Linux_5.9
- **Tool**: `bun run spawn:monitor` - included in this repo

## Scripts

| Command | Description |
|---------|-------------|
| `bun run spawn:monitor` | Full validation with benchmark (100 iterations) |
| `bun run spawn:check` | Quick system capability check |
| `bun run spawn:bench` | Extended benchmark (500 iterations) |

---

*Last updated: January 31, 2026*  
*Validated on: Bun 1.3.7, macOS 14.7 ARM64*
