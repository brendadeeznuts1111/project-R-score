# Bun.spawn() - proc.pid and onExit Handler Guide

**Date:** 2025-01-07  
**Purpose:** Guide for using `proc.pid` and `onExit` handler with Bun.spawn()

---

## 📊 Current Usage in Codebase

### proc.pid Usage: ✅ Implemented

**Location:** `src/mcp/tools/server-control.ts`

**Current Implementation:**
```typescript
// Lines 161, 193, 414, 427
const proc = Bun.spawn(command.split(" "), {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port) },
  stdout: "pipe",
  stderr: "pipe",
});

// Register process with PID
processRegistry.register("api-server", proc.pid, {
  port,
  command,
  url: `http://localhost:${port}`,
});
```

**Status:** ✅ Good - PID is being tracked and registered

### onExit Handler Usage: ❌ Not Implemented

**Current Status:** No `onExit` handlers found in codebase

**Impact:** 
- No automatic cleanup on process exit
- No error logging on process failure
- Process registry not automatically updated on exit
- No metrics collection on process termination

---

## 🎯 proc.pid Usage

### Basic Usage

```typescript
const proc = Bun.spawn(["bun", "--version"]);
console.log(proc.pid); // Process ID number
```

### Process Tracking Pattern

```typescript
// 1. Spawn process
const proc = Bun.spawn(["bun", "run", "server.ts"], {
  stdout: "pipe",
  stderr: "pipe",
});

// 2. Get PID immediately
const pid = proc.pid;

// 3. Register in process registry
processRegistry.register("api-server", pid, {
  startTime: Date.now(),
  command: ["bun", "run", "server.ts"],
  port: 3000,
});

// 4. Use PID for monitoring
console.log(`Server started with PID: ${pid}`);

// 5. Later: Check if process is still running
const isRunning = processRegistry.isRunning(pid);
```

### Current Implementation Example

**File:** `src/mcp/tools/server-control.ts`

```typescript
// Spawn API server
const proc = Bun.spawn(command.split(" "), {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port) },
  stdout: "pipe",
  stderr: "pipe",
});

// Register with PID
processRegistry.register("api-server", proc.pid, {
  port,
  command,
  url: `http://localhost:${port}`,
});

// PID is now available for:
// - Process monitoring
// - Process killing
// - Status checking
```

---

## 🎯 onExit Handler Usage

### Basic Pattern

```typescript
const proc = Bun.spawn(["command"], {
  stdout: "pipe",
  stderr: "pipe",
  onExit(subprocess, exitCode, signalCode, error) {
    console.log("Process exited:");
    console.log("  PID:", subprocess.pid);
    console.log("  Exit code:", exitCode);
    console.log("  Signal:", signalCode);
    console.log("  Error:", error?.message);
  },
});
```

### Complete Example with Cleanup

```typescript
const proc = Bun.spawn(["bun", "run", "server.ts"], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: "3000" },
  stdout: "pipe",
  stderr: "pipe",
  onExit(subprocess, exitCode, signalCode, error) {
    const pid = subprocess.pid;
    
    // 1. Unregister from process registry
    processRegistry.unregister("api-server");
    
    // 2. Log exit information
    if (error) {
      console.error(`Server (PID: ${pid}) failed to start:`, error.message);
    } else if (exitCode !== 0) {
      console.warn(`Server (PID: ${pid}) exited with code ${exitCode}`);
    } else {
      console.log(`Server (PID: ${pid}) exited normally`);
    }
    
    // 3. Cleanup resources
    // Close any open connections, files, etc.
    
    // 4. Collect metrics
    metrics.recordProcessExit({
      pid,
      exitCode,
      signalCode,
      error: error?.message,
    });
  },
});

// Register process
processRegistry.register("api-server", proc.pid, {
  port: 3000,
  startTime: Date.now(),
});
```

---

## 🔧 Recommended Implementation

### Enhanced Server Control with onExit

**File:** `src/mcp/tools/server-control.ts` (Recommended Update)

```typescript
// Spawn API server with full lifecycle management
const proc = Bun.spawn(command.split(" "), {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port) },
  stdout: "pipe",
  stderr: "pipe",
  onExit(subprocess, exitCode, signalCode, error) {
    const pid = subprocess.pid;
    
    // 1. Always unregister on exit
    processRegistry.unregister("api-server");
    
    // 2. Handle different exit scenarios
    if (error) {
      // Process failed to start or crashed
      console.error(`API server (PID: ${pid}) error:`, error.message);
      
      // Notify monitoring system
      monitoring.recordError({
        service: "api-server",
        pid,
        error: error.message,
        timestamp: Date.now(),
      });
    } else if (signalCode !== null) {
      // Process was killed by signal
      console.log(`API server (PID: ${pid}) killed by signal ${signalCode}`);
    } else if (exitCode !== 0) {
      // Process exited with error code
      console.warn(`API server (PID: ${pid}) exited with code ${exitCode}`);
      
      // Try to read stderr for error details
      if (subprocess.stderr) {
        new Response(subprocess.stderr).text().then(stderr => {
          console.error("Stderr:", stderr);
        });
      }
    } else {
      // Normal exit
      console.log(`API server (PID: ${pid}) exited normally`);
    }
    
    // 3. Cleanup any resources
    // Close file handles, connections, etc.
    
    // 4. Update metrics
    const uptime = processRegistry.getUptime("api-server");
    metrics.recordProcessExit({
      service: "api-server",
      pid,
      exitCode,
      signalCode,
      uptime,
      error: error?.message,
    });
  },
});

// Register process immediately after spawn
const pid = proc.pid;
processRegistry.register("api-server", pid, {
  port,
  command,
  url: `http://localhost:${port}`,
  startTime: Date.now(),
});
```

---

## 📋 Implementation Checklist

### For Each Bun.spawn() Call:

- [ ] **Get PID:** `const pid = proc.pid;`
- [ ] **Register Process:** Store PID in process registry
- [ ] **Add onExit Handler:** Handle cleanup and logging
- [ ] **Error Handling:** Check for errors in onExit
- [ ] **Resource Cleanup:** Close streams, connections, etc.
- [ ] **Metrics Collection:** Record process lifecycle events
- [ ] **Logging:** Log exit codes, signals, errors

---

## 🎯 Example: Complete Pattern

```typescript
import { processRegistry } from "./process-registry";
import { metrics } from "./metrics";

/**
 * Spawn server with full lifecycle management
 */
function spawnServer(
  name: string,
  command: string[],
  options: { port?: number; env?: Record<string, string> } = {}
): Bun.Subprocess {
  const proc = Bun.spawn(command, {
    cwd: process.cwd(),
    env: { ...process.env, ...options.env },
    stdout: "pipe",
    stderr: "pipe",
    onExit(subprocess, exitCode, signalCode, error) {
      const pid = subprocess.pid;
      
      // 1. Unregister
      processRegistry.unregister(name);
      
      // 2. Log
      if (error) {
        console.error(`${name} (PID: ${pid}) error:`, error.message);
      } else if (exitCode !== 0) {
        console.warn(`${name} (PID: ${pid}) exited with code ${exitCode}`);
      }
      
      // 3. Metrics
      metrics.recordProcessExit({
        service: name,
        pid,
        exitCode,
        signalCode,
        error: error?.message,
      });
    },
  });
  
  // Register immediately
  const pid = proc.pid;
  processRegistry.register(name, pid, {
    port: options.port,
    command,
    startTime: Date.now(),
  });
  
  return proc;
}

// Usage
const apiServer = spawnServer("api-server", ["bun", "run", "api.ts"], {
  port: 3000,
  env: { NODE_ENV: "production" },
});

console.log(`API server started with PID: ${apiServer.pid}`);
```

---

## 🔍 Comparison: With vs Without onExit

### Without onExit (Current)

```typescript
const proc = Bun.spawn(["server"], { stdout: "pipe" });
processRegistry.register("server", proc.pid, { ... });

// Problem: If process crashes, registry is never updated
// Problem: No error logging
// Problem: No cleanup
```

### With onExit (Recommended)

```typescript
const proc = Bun.spawn(["server"], {
  stdout: "pipe",
  onExit(subprocess, exitCode, signalCode, error) {
    processRegistry.unregister("server");
    if (error) console.error("Error:", error);
    metrics.recordExit(subprocess.pid, exitCode);
  },
});
processRegistry.register("server", proc.pid, { ... });

// ✅ Registry always updated
// ✅ Errors logged
// ✅ Metrics collected
// ✅ Resources cleaned up
```

---

## 📚 References

- **Current Implementation:** `src/mcp/tools/server-control.ts` (lines 150-165)
- **Process Registry:** `src/mcp/utils/process-registry.ts`
- **Complete API:** `docs/bun/BUN-SPAWN-COMPLETE.md`
- **Example:** `examples/demos/demo-bun-spawn-complete.ts` (line 387)

---

**Last Updated:** 2025-01-07
