# Bun.spawn() Resource Usage Monitoring Guide

**Date:** 2025-01-07  
**Purpose:** Guide for using `proc.resourceUsage()` to monitor process CPU, memory, and system stats

---

## 📊 ResourceUsage Interface

```typescript
interface ResourceUsage {
  // Context switches
  contextSwitches: {
    voluntary: number;    // Voluntary context switches
    involuntary: number;  // Involuntary context switches
  };
  
  // CPU time (nanoseconds)
  cpuTime: {
    user: number;    // User CPU time
    system: number;  // System CPU time
    total: number;   // Total CPU time
  };
  
  // Memory
  maxRSS: number;  // Maximum resident set size (bytes)
  
  // IPC messages (if ipc enabled)
  messages: {
    sent: number;      // Messages sent
    received: number;  // Messages received
  };
  
  // I/O operations
  ops: {
    in: number;   // Input operations
    out: number;  // Output operations
  };
  
  // Shared memory
  shmSize: number;  // Shared memory size (bytes)
  
  // Signals
  signalCount: number;  // Number of signals received
  
  // Memory swapping
  swapCount: number;  // Swap count
}
```

---

## 🎯 Basic Usage

### Simple Example

```typescript
const proc = Bun.spawn(["bun", "--version"]);
await proc.exited;

const usage = proc.resourceUsage();
if (usage) {
  console.log(`Max memory used: ${usage.maxRSS} bytes`);
  console.log(`CPU time (user): ${usage.cpuTime.user} ns`);
  console.log(`CPU time (system): ${usage.cpuTime.system} ns`);
}
```

### With Formatting

```typescript
const proc = Bun.spawn(["bun", "--version"]);
await proc.exited;

const usage = proc.resourceUsage();
if (usage) {
  // Convert nanoseconds to microseconds
  const userCpuUs = usage.cpuTime.user / 1_000; // ns to µs
  const systemCpuUs = usage.cpuTime.system / 1_000;
  
  // Convert bytes to MB
  const memoryMB = usage.maxRSS / 1024 / 1024;
  
  console.log(`Max memory: ${memoryMB.toFixed(2)} MB`);
  console.log(`CPU time (user): ${userCpuUs.toFixed(2)} µs`);
  console.log(`CPU time (system): ${systemCpuUs.toFixed(2)} µs`);
  console.log(`Total CPU time: ${(usage.cpuTime.total / 1_000).toFixed(2)} µs`);
}
```

---

## 📈 Common Use Cases

### 1. Performance Monitoring

```typescript
async function benchmarkCommand(cmd: string[]): Promise<{
  exitCode: number;
  cpuTimeMs: number;
  memoryMB: number;
  contextSwitches: number;
}> {
  const proc = Bun.spawn(cmd, {
    stdout: "pipe",
    stderr: "pipe",
  });
  
  await proc.exited;
  
  const usage = proc.resourceUsage();
  if (!usage) {
    throw new Error("Resource usage not available");
  }
  
  return {
    exitCode: await proc.exited,
    cpuTimeMs: usage.cpuTime.total / 1_000_000, // Convert ns to ms
    memoryMB: usage.maxRSS / 1024 / 1024, // Convert bytes to MB
    contextSwitches: usage.contextSwitches.voluntary + usage.contextSwitches.involuntary,
  };
}

// Usage
const result = await benchmarkCommand(["bun", "run", "build"]);
console.log(`Build took ${result.cpuTimeMs.toFixed(2)}ms CPU time`);
console.log(`Peak memory: ${result.memoryMB.toFixed(2)} MB`);
```

### 2. Resource Limits Monitoring

```typescript
async function checkResourceUsage(cmd: string[]): Promise<boolean> {
  const proc = Bun.spawn(cmd, {
    stdout: "pipe",
    stderr: "pipe",
  });
  
  await proc.exited;
  
  const usage = proc.resourceUsage();
  if (!usage) return false;
  
  const memoryMB = usage.maxRSS / 1024 / 1024;
  const cpuTimeMs = usage.cpuTime.total / 1_000_000;
  
  // Check limits
  const memoryLimitMB = 500; // 500 MB limit
  const cpuTimeLimitMs = 5000; // 5 seconds CPU time limit
  
  if (memoryMB > memoryLimitMB) {
    console.warn(`Memory limit exceeded: ${memoryMB.toFixed(2)} MB > ${memoryLimitMB} MB`);
    return false;
  }
  
  if (cpuTimeMs > cpuTimeLimitMs) {
    console.warn(`CPU time limit exceeded: ${cpuTimeMs.toFixed(2)} ms > ${cpuTimeLimitMs} ms`);
    return false;
  }
  
  return true;
}
```

### 3. Metrics Collection

```typescript
interface ProcessMetrics {
  pid: number;
  command: string[];
  exitCode: number;
  cpuTime: {
    user: number;    // ms
    system: number;  // ms
    total: number;   // ms
  };
  memory: {
    maxRSS: number;  // MB
  };
  contextSwitches: {
    voluntary: number;
    involuntary: number;
    total: number;
  };
  io: {
    input: number;
    output: number;
  };
  signals: number;
  swaps: number;
}

async function collectProcessMetrics(
  cmd: string[],
  options?: { stdout?: "pipe" | "inherit"; stderr?: "pipe" | "inherit" }
): Promise<ProcessMetrics> {
  const proc = Bun.spawn(cmd, {
    stdout: options?.stdout || "pipe",
    stderr: options?.stderr || "pipe",
  });
  
  const exitCode = await proc.exited;
  const usage = proc.resourceUsage();
  
  if (!usage) {
    throw new Error("Resource usage not available");
  }
  
  return {
    pid: proc.pid,
    command: cmd,
    exitCode,
    cpuTime: {
      user: usage.cpuTime.user / 1_000_000, // ns to ms
      system: usage.cpuTime.system / 1_000_000,
      total: usage.cpuTime.total / 1_000_000,
    },
    memory: {
      maxRSS: usage.maxRSS / 1024 / 1024, // bytes to MB
    },
    contextSwitches: {
      voluntary: usage.contextSwitches.voluntary,
      involuntary: usage.contextSwitches.involuntary,
      total: usage.contextSwitches.voluntary + usage.contextSwitches.involuntary,
    },
    io: {
      input: usage.ops.in,
      output: usage.ops.out,
    },
    signals: usage.signalCount,
    swaps: usage.swapCount,
  };
}

// Usage
const metrics = await collectProcessMetrics(["bun", "test"]);
console.log(JSON.stringify(metrics, null, 2));
```

### 4. Comparison Between Commands

```typescript
async function compareCommands(
  commands: Array<{ name: string; cmd: string[] }>
): Promise<Array<{ name: string; metrics: ProcessMetrics }>> {
  const results = await Promise.all(
    commands.map(async ({ name, cmd }) => {
      const metrics = await collectProcessMetrics(cmd);
      return { name, metrics };
    })
  );
  
  // Sort by CPU time
  results.sort((a, b) => a.metrics.cpuTime.total - b.metrics.cpuTime.total);
  
  return results;
}

// Usage
const comparison = await compareCommands([
  { name: "Bun", cmd: ["bun", "--version"] },
  { name: "Node", cmd: ["node", "--version"] },
]);

comparison.forEach(({ name, metrics }) => {
  console.log(`${name}:`);
  console.log(`  CPU: ${metrics.cpuTime.total.toFixed(2)} ms`);
  console.log(`  Memory: ${metrics.memory.maxRSS.toFixed(2)} MB`);
});
```

### 5. Integration with Process Registry

```typescript
import { processRegistry } from "./process-registry";

async function spawnWithMetrics(
  name: string,
  cmd: string[],
  options?: { port?: number; env?: Record<string, string> }
): Promise<{ pid: number; metrics?: ProcessMetrics }> {
  const proc = Bun.spawn(cmd, {
    cwd: process.cwd(),
    env: { ...process.env, ...options?.env },
    stdout: "pipe",
    stderr: "pipe",
    onExit(subprocess, exitCode, signalCode, error) {
      // Collect metrics on exit
      const usage = subprocess.resourceUsage();
      if (usage) {
        const metrics: ProcessMetrics = {
          pid: subprocess.pid,
          command: cmd,
          exitCode: exitCode ?? -1,
          cpuTime: {
            user: usage.cpuTime.user / 1_000_000,
            system: usage.cpuTime.system / 1_000_000,
            total: usage.cpuTime.total / 1_000_000,
          },
          memory: {
            maxRSS: usage.maxRSS / 1024 / 1024,
          },
          contextSwitches: {
            voluntary: usage.contextSwitches.voluntary,
            involuntary: usage.contextSwitches.involuntary,
            total: usage.contextSwitches.voluntary + usage.contextSwitches.involuntary,
          },
          io: {
            input: usage.ops.in,
            output: usage.ops.out,
          },
          signals: usage.signalCount,
          swaps: usage.swapCount,
        };
        
        // Store metrics in registry
        processRegistry.updateMetrics(name, metrics);
      }
      
      // Unregister
      processRegistry.unregister(name);
    },
  });
  
  const pid = proc.pid;
  processRegistry.register(name, pid, {
    port: options?.port,
    command: cmd,
    startTime: Date.now(),
  });
  
  return { pid };
}
```

---

## 🔍 Understanding the Metrics

### CPU Time

- **Units:** Nanoseconds (ns)
- **user:** Time spent in user mode
- **system:** Time spent in kernel mode
- **total:** Sum of user + system

**Conversion:**
```typescript
const cpuTimeMs = usage.cpuTime.total / 1_000_000; // ns to ms
const cpuTimeUs = usage.cpuTime.total / 1_000;     // ns to µs
const cpuTimeS = usage.cpuTime.total / 1_000_000_000; // ns to seconds
```

### Memory (maxRSS)

- **Units:** Bytes
- **maxRSS:** Maximum Resident Set Size - peak physical memory used

**Conversion:**
```typescript
const memoryKB = usage.maxRSS / 1024;        // bytes to KB
const memoryMB = usage.maxRSS / 1024 / 1024; // bytes to MB
const memoryGB = usage.maxRSS / 1024 / 1024 / 1024; // bytes to GB
```

### Context Switches

- **voluntary:** Process voluntarily gave up CPU (e.g., waiting for I/O)
- **involuntary:** Process was preempted by scheduler
- **total:** Sum of both

**Interpretation:**
- High voluntary switches: Process is I/O bound
- High involuntary switches: Process is CPU bound or system is overloaded

### I/O Operations

- **ops.in:** Input operations (reads)
- **ops.out:** Output operations (writes)

**Use Case:** Monitor I/O-intensive processes

### Signals

- **signalCount:** Number of signals received by process

**Use Case:** Monitor processes that handle signals frequently

### Swaps

- **swapCount:** Number of times process was swapped to disk

**Use Case:** Detect memory pressure (high swap count = system running out of RAM)

---

## 📋 Utility Functions

### Format Resource Usage

```typescript
function formatResourceUsage(usage: ResourceUsage): string {
  const cpuTimeMs = usage.cpuTime.total / 1_000_000;
  const memoryMB = usage.maxRSS / 1024 / 1024;
  const contextSwitches = usage.contextSwitches.voluntary + usage.contextSwitches.involuntary;
  
  return [
    `CPU Time: ${cpuTimeMs.toFixed(2)} ms`,
    `Memory: ${memoryMB.toFixed(2)} MB`,
    `Context Switches: ${contextSwitches}`,
    `I/O Ops: ${usage.ops.in} in, ${usage.ops.out} out`,
    `Signals: ${usage.signalCount}`,
    `Swaps: ${usage.swapCount}`,
  ].join(", ");
}
```

### Check Resource Usage Availability

```typescript
function hasResourceUsage(proc: Bun.Subprocess): boolean {
  return proc.resourceUsage() !== undefined;
}
```

### Safe Resource Usage Collection

```typescript
async function safeResourceUsage(
  proc: Bun.Subprocess
): Promise<ResourceUsage | null> {
  await proc.exited;
  return proc.resourceUsage() ?? null;
}
```

---

## 🎯 Integration Opportunities

### Current Codebase Usage

**Not Currently Used:** `resourceUsage()` is not used in production code

**Potential Integration Points:**

1. **`src/utils/metrics-native.ts`** - Add process resource usage to metrics
2. **`src/mcp/tools/server-control.ts`** - Track server resource usage
3. **`src/utils/bun.ts`** - Add resource usage to `spawnWithTimeout`
4. **`src/api/routes.ts`** - Track bench execution resource usage

### Example Integration

```typescript
// src/utils/metrics-native.ts enhancement
export class NativeMetricsCollector {
  // ... existing code ...
  
  /**
   * Collect process resource usage
   */
  async collectProcessResourceUsage(
    cmd: string[]
  ): Promise<ProcessResourceMetrics | null> {
    const proc = Bun.spawn(cmd, {
      stdout: "pipe",
      stderr: "pipe",
    });
    
    await proc.exited;
    const usage = proc.resourceUsage();
    
    if (!usage) return null;
    
    return {
      pid: proc.pid,
      exitCode: await proc.exited,
      cpuTime: {
        user: usage.cpuTime.user / 1_000_000, // ms
        system: usage.cpuTime.system / 1_000_000,
        total: usage.cpuTime.total / 1_000_000,
      },
      memory: {
        maxRSS: usage.maxRSS / 1024 / 1024, // MB
      },
      contextSwitches: {
        voluntary: usage.contextSwitches.voluntary,
        involuntary: usage.contextSwitches.involuntary,
        total: usage.contextSwitches.voluntary + usage.contextSwitches.involuntary,
      },
      io: {
        input: usage.ops.in,
        output: usage.ops.out,
      },
      signals: usage.signalCount,
      swaps: usage.swapCount,
    };
  }
}
```

---

## 📚 References

- **Complete API:** `docs/BUN-SPAWN-COMPLETE-API.md`
- **Example:** `examples/demos/demo-bun-spawn-complete.ts` (line 332)
- **Documentation:** `src/runtime/bun-native-utils-complete.ts` (example 7.4.3.1.4)
- **Official Docs:** https://bun.sh/docs/api/spawn

---

## 🎯 Quick Reference

```typescript
// Basic usage
const proc = Bun.spawn(["command"]);
await proc.exited;
const usage = proc.resourceUsage();

// Format values
const cpuTimeMs = usage.cpuTime.total / 1_000_000;
const memoryMB = usage.maxRSS / 1024 / 1024;

// Common checks
if (usage.maxRSS > 500 * 1024 * 1024) {
  console.warn("High memory usage");
}

if (usage.cpuTime.total > 5_000_000_000) {
  console.warn("High CPU time");
}
```

---

**Last Updated:** 2025-01-07
