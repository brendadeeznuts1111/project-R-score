# Bun.spawn() Codebase Review

**Date:** 2025-01-07  
**Purpose:** Review all `Bun.spawn()` usage in the codebase for best practices, security, and consistency

## 📊 Summary

- **Total Files Using Bun.spawn():** 13 files
- **Source Files:** 6 files
- **Script Files:** 4 files
- **Example Files:** 2 files
- **Test Files:** 1 file
- **Issues Found:** 3 issues
- **Recommendations:** 8 improvements

---

## ✅ Good Practices Found

### 1. Proper Command Array Usage
Most files correctly use command arrays:
```typescript
Bun.spawn(["tail", "-f", filePath], { ... })
```

**Files:**
- ✅ `src/utils/logs-native.ts:89`
- ✅ `src/runtime/bun-native-utils-complete.ts:292`
- ✅ `test/harness.ts:169`

### 2. Proper Stream Handling
Good use of `stdout: "pipe"` and `stderr: "pipe"`:
```typescript
// src/utils/logs-native.ts:89-92
const proc = Bun.spawn(["tail", "-f", filePath], {
  stdout: "pipe",
  stderr: "pipe",
});
```

### 3. Proper Environment Variable Merging
Good pattern of merging with `process.env`:
```typescript
// src/utils/bun.ts:1131
env: { ...process.env }
```

### 4. Proper Timeout Handling
Good timeout implementation:
```typescript
// src/utils/bun.ts:1134-1136
const timer = setTimeout(() => {
  proc.kill(9); // SIGKILL
}, timeout);
```

---

## ⚠️ Issues Found

### 🔴 Critical: Security Vulnerabilities

#### Issue 1: Unsafe Command Splitting in `src/mcp/tools/server-control.ts`

**Location:** Lines 150, 403  
**Problem:** Using `command.split(" ")` is unsafe for commands with quoted arguments

```typescript
// ❌ UNSAFE
const proc = Bun.spawn(command.split(" "), {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port) },
});
```

**Risk:** If `command` contains quoted arguments like `"bun run script.ts"`, splitting will break them

**Fix:**
```typescript
// ✅ SAFE - Use proper command parsing or array directly
// Option 1: If command is controlled, parse properly
const cmdParts = parseCommand(command); // Use a proper parser

// Option 2: Better - Use array directly
const proc = Bun.spawn(["bun", "run", scriptPath], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port) },
});
```

#### Issue 2: Missing Error Handling in `src/runtime/bun-native-utils-complete.ts`

**Location:** Line 292  
**Problem:** No error handling for process failure

```typescript
// ❌ MISSING ERROR HANDLING
const proc = Bun.spawn([chrome, '--headless', '--screenshot', '--window-size=1920,1080', url]);
const screenshot = await Bun.readableStreamToArrayBuffer(proc.stdout);

const exitCode = await proc.exit;
if (exitCode !== 0) throw new Error(`Chrome exited with ${exitCode}`);
```

**Issue:** Should check exit code before reading stdout, and handle stream errors

**Fix:**
```typescript
// ✅ BETTER ERROR HANDLING
const proc = Bun.spawn([chrome, '--headless', '--screenshot', '--window-size=1920,1080', url], {
  stdout: "pipe",
  stderr: "pipe",
});

try {
  const [screenshot, exitCode] = await Promise.all([
    Bun.readableStreamToArrayBuffer(proc.stdout),
    proc.exited,
  ]);
  
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`Chrome exited with ${exitCode}: ${stderr}`);
  }
  
  // ... rest of code
} catch (error) {
  proc.kill(); // Ensure cleanup
  throw error;
}
```

---

### 🟡 Medium: Best Practice Issues

#### Issue 3: Inconsistent API Usage

**Location:** Multiple files  
**Problem:** Mixing command array API with options object API inconsistently

**Current patterns:**
- `src/utils/logs-native.ts`: Uses command array API
- `src/api/routes.ts`: Uses options object API
- `src/utils/bun.ts`: Uses command array API

**Recommendation:** Standardize on one pattern or document when to use each:

```typescript
// Pattern 1: Command array (simpler)
Bun.spawn(["cmd", "arg1", "arg2"], { stdout: "pipe" })

// Pattern 2: Options object (more explicit)
Bun.spawn({ cmd: ["cmd", "arg1", "arg2"], stdout: "pipe" })
```

**Recommendation:** Use command array API for simplicity, options object API when you need more control.

---

### 🟢 Low: Best Practice Improvements

#### Issue 4: Missing `onExit` Handler

**Location:** Multiple files  
**Problem:** Not using `onExit` callback for cleanup

**Current:**
```typescript
const proc = Bun.spawn([...]);
await proc.exited;
```

**Better:**
```typescript
const proc = Bun.spawn([...], {
  onExit(proc, exitCode, signalCode, error) {
    // Cleanup resources
    if (error) {
      console.error("Process error:", error);
    }
  },
});
```

#### Issue 5: Not Using `proc.pid` (Partially Addressed)

**Location:** Multiple files  
**Status:** ✅ `proc.pid` IS being used in `src/mcp/tools/server-control.ts` (lines 161, 193, 414, 427)

**Current Usage:**
```typescript
// ✅ GOOD - src/mcp/tools/server-control.ts:161
const proc = Bun.spawn(command.split(" "), { ... });
processRegistry.register("api-server", proc.pid, {
  port,
  command,
  url: `http://localhost:${port}`,
});
```

**Recommendation:** Use `proc.pid` in all spawn calls for process tracking:
```typescript
const proc = Bun.spawn([...]);
const pid = proc.pid;
// Store pid for later cleanup or monitoring
```

#### Issue 6: Not Using `onExit` Handler

**Location:** All files using Bun.spawn()  
**Problem:** No `onExit` handlers for cleanup and error handling

**Current:** Processes exit without cleanup handlers

**Recommendation:** Add `onExit` handlers for:
- Resource cleanup
- Error logging
- Process registry updates
- Metrics collection

```typescript
// ✅ RECOMMENDED PATTERN
const proc = Bun.spawn(["command"], {
  stdout: "pipe",
  stderr: "pipe",
  onExit(subprocess, exitCode, signalCode, error) {
    // Cleanup resources
    if (error) {
      console.error("Process error:", error);
    }
    
    // Update process registry
    processRegistry.unregister("service-name");
    
    // Log metrics
    logProcessExit({
      pid: subprocess.pid,
      exitCode,
      signalCode,
      error: error?.message,
    });
  },
});
```

---

## 📋 Complete File List

### Source Files (6)
1. `src/runtime/bun-native-utils-complete.ts` - Documentation and example
2. `src/api/routes.ts` - Bench execution, git log
3. `src/utils/bun.ts` - `spawnWithTimeout` utility
4. `src/utils/logs-native.ts` - Log streaming with `tail -f`
5. `src/mcp/tools/server-control.ts` - Server process management
6. `src/api/examples.ts` - Example code documentation

### Script Files (4)
1. `scripts/bun-shell-examples.ts` - Examples
2. `scripts/dashboard-server.ts` - Dashboard server spawning
3. `scripts/deploy-prod.ts` - Deployment scripts
4. `scripts/shell-utils.ts` - Shell utilities

### Example Files (2)
1. `examples/demos/demo-bun-spawn-complete.ts` - Complete demo
2. `examples/demos/tag-manager.ts` - Tag manager demo

### Test Files (1)
1. `test/harness.ts` - Test harness with `runBun()` helper

---

## 📈 Usage Statistics

### Usage by Category

| Category | Files | Instances |
|----------|-------|-----------|
| Log Streaming | 1 | ~2 |
| Process Management | 2 | ~4 |
| Server Control | 1 | ~2 |
| Bench Execution | 1 | ~2 |
| Git Operations | 1 | ~1 |
| Examples/Demos | 2 | ~10+ |
| Test Utilities | 1 | ~1 |

### Options Used

| Option | Usage Count |
|--------|-------------|
| `stdout: "pipe"` | ~10 |
| `stderr: "pipe"` | ~8 |
| `cwd` | ~4 |
| `env` | ~4 |
| `timeout` | ~2 |
| `onExit` | ~0 |
| `stdin` | ~1 |

### Methods Used

| Method | Usage Count |
|--------|-------------|
| `proc.exited` | ~8 |
| `proc.stdout` | ~6 |
| `proc.stderr` | ~4 |
| `proc.kill()` | ~3 |
| `proc.pid` | ~1 |

---

## 🎯 Recommendations

### 1. Create Spawn Utility Functions

Create `src/utils/spawn-helpers.ts`:

```typescript
import type { SpawnOptions } from "bun";

/**
 * Safe spawn with automatic error handling
 */
export async function safeSpawn(
  cmd: string[],
  options?: SpawnOptions
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(cmd, {
    stdout: "pipe",
    stderr: "pipe",
    ...options,
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (exitCode !== 0) {
    throw new Error(`Process exited with code ${exitCode}: ${stderr}`);
  }

  return { stdout, stderr, exitCode };
}

/**
 * Spawn with timeout (enhanced version of existing)
 */
export async function spawnWithTimeout(
  cmd: string[],
  timeout: number,
  options?: SpawnOptions
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(cmd, {
    stdout: "pipe",
    stderr: "pipe",
    ...options,
  });

  const timer = setTimeout(() => {
    proc.kill(9); // SIGKILL
  }, timeout);

  try {
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);

    clearTimeout(timer);
    return { stdout, stderr, exitCode };
  } catch (error) {
    clearTimeout(timer);
    proc.kill();
    throw error;
  }
}

/**
 * Spawn with exit handler
 */
export function spawnWithExitHandler(
  cmd: string[],
  onExit: (exitCode: number, signal: number | null, error: Error | null) => void,
  options?: SpawnOptions
) {
  return Bun.spawn(cmd, {
    ...options,
    onExit(proc, exitCode, signalCode, error) {
      onExit(exitCode, signalCode, error);
    },
  });
}
```

### 2. Fix Command Splitting

Fix `src/mcp/tools/server-control.ts`:

```typescript
// Instead of:
const proc = Bun.spawn(command.split(" "), { ... });

// Use:
const cmdParts = ["bun", "run", scriptPath]; // Direct array
const proc = Bun.spawn(cmdParts, { ... });
```

### 3. Add Error Handling

Add proper error handling to all spawn calls:

```typescript
try {
  const proc = Bun.spawn([...], {
    stdout: "pipe",
    stderr: "pipe",
  });
  
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  
  if (exitCode !== 0) {
    throw new Error(`Command failed: ${stderr}`);
  }
  
  return stdout;
} catch (error) {
  // Handle error
  throw error;
}
```

### 4. Use `proc.pid` for Process Tracking ✅ (Already Implemented)

**Current Implementation:** `src/mcp/tools/server-control.ts` already uses `proc.pid`:

```typescript
// ✅ CURRENT USAGE - Good example
const proc = Bun.spawn(command.split(" "), { ... });
processRegistry.register("api-server", proc.pid, {
  port,
  command,
  url: `http://localhost:${port}`,
});
```

**Recommendation:** Extend this pattern to all spawn calls:
```typescript
const proc = Bun.spawn([...]);
const pid = proc.pid;

// Store in registry with full metadata
processRegistry.register("service-name", pid, {
  process: proc,
  startTime: Date.now(),
  command: [...],
});
```

### 5. Add `onExit` Handlers for Cleanup ⚠️ (Not Implemented)

**Current Status:** No `onExit` handlers in codebase

**Recommendation:** Add `onExit` handlers to all spawn calls:

```typescript
const proc = Bun.spawn(["command"], {
  stdout: "pipe",
  stderr: "pipe",
  onExit(subprocess, exitCode, signalCode, error) {
    // 1. Cleanup resources
    if (subprocess.stdout) {
      // Close streams if needed
    }
    
    // 2. Update process registry
    processRegistry.unregister("service-name");
    
    // 3. Log errors
    if (error) {
      console.error(`Process ${subprocess.pid} error:`, error);
    }
    
    // 4. Collect metrics
    metrics.recordProcessExit({
      pid: subprocess.pid,
      exitCode,
      signalCode,
      duration: Date.now() - startTime,
    });
  },
});
```

**Example Implementation for server-control.ts:**
```typescript
const proc = Bun.spawn(command.split(" "), {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port) },
  stdout: "pipe",
  stderr: "pipe",
  onExit(subprocess, exitCode, signalCode, error) {
    // Unregister from process registry
    processRegistry.unregister("api-server");
    
    // Log exit
    if (error) {
      console.error(`API server (PID: ${subprocess.pid}) error:`, error);
    } else if (exitCode !== 0) {
      console.warn(`API server (PID: ${subprocess.pid}) exited with code ${exitCode}`);
    }
  },
});
```

### 5. Standardize API Usage

Document when to use each API:

- **Command Array API**: Use for simple commands
  ```typescript
  Bun.spawn(["cmd", "arg"], { stdout: "pipe" })
  ```

- **Options Object API**: Use for complex configurations
  ```typescript
  Bun.spawn({ cmd: ["cmd"], stdout: "pipe", env: {...} })
  ```

### 6. Add Documentation Comments

Add JSDoc comments referencing documentation:

```typescript
/**
 * Spawn process with timeout
 * 
 * @see src/runtime/bun-native-utils-complete.ts (example 7.4.3.1.0)
 * @see docs/bun/BUN-SPAWN-COMPLETE.md
 */
export async function spawnWithTimeout(...) {
  // ...
}
```

### 7. Add Tests

Create tests for spawn utilities:

```typescript
// test/utils/spawn-helpers.test.ts
import { describe, test, expect } from "bun:test";
import { safeSpawn, spawnWithTimeout } from "../src/utils/spawn-helpers";

describe("spawn-helpers", () => {
  test("safeSpawn executes command successfully", async () => {
    const result = await safeSpawn(["echo", "test"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe("test");
  });

  test("spawnWithTimeout kills process on timeout", async () => {
    await expect(
      spawnWithTimeout(["sleep", "10"], 100)
    ).rejects.toThrow();
  });
});
```

### 8. Add Resource Usage Monitoring

**Current Status:** `resourceUsage()` is not used in production code

**Recommendation:** Add resource usage monitoring to:
- `src/utils/metrics-native.ts` - Process metrics collection
- `src/mcp/tools/server-control.ts` - Server resource tracking
- `src/utils/bun.ts` - Add to `spawnWithTimeout` utility

**Example:**
```typescript
const proc = Bun.spawn(["command"], { stdout: "pipe" });
await proc.exited;

const usage = proc.resourceUsage();
if (usage) {
  metrics.record({
    cpuTimeMs: usage.cpuTime.total / 1_000_000,
    memoryMB: usage.maxRSS / 1024 / 1024,
    contextSwitches: usage.contextSwitches.voluntary + usage.contextSwitches.involuntary,
  });
}
```

**See:** `docs/BUN-SPAWN-RESOURCE-USAGE-GUIDE.md` for complete guide

### 9. Add Stdin Usage Examples

**Current Status:** Stdin is used in examples but not in production code

**Recommendation:** Add stdin usage for:
- Processing fetched data (Response as stdin)
- File processing (BunFile as stdin)
- Stream processing (ReadableStream as stdin)

**Example:**
```typescript
// Process fetched data
const response = await fetch("https://api.example.com/data.json");
const proc = Bun.spawn(["jq", "."], {
  stdin: response,
  stdout: "pipe",
});
const processed = await proc.stdout.text();
```

**See:** `docs/BUN-SPAWN-STDIN-GUIDE.md` for complete stdin guide

### 10. Update Documentation

Update `src/runtime/bun-native-utils-complete.ts` with:
- `onExit` handler examples
- `proc.pid` usage
- `resourceUsage()` examples
- Stdin usage examples (all types)
- Error handling patterns
- Process cleanup examples

---

## 🔍 Comparison: Bun.spawn() vs Bun.Shell ($)

### When to Use Bun.spawn()

✅ **Use Bun.spawn() when:**
- You need fine-grained control over process lifecycle
- You need to stream output in real-time
- You need to handle stdin/stdout/stderr separately
- You need process monitoring (PID tracking)
- You need custom exit handlers
- You're spawning long-running processes

**Example:**
```typescript
// Log streaming - needs real-time output
const proc = Bun.spawn(["tail", "-f", logFile], {
  stdout: "pipe",
  stderr: "pipe",
});
```

### When to Use Bun.Shell ($)

✅ **Use Bun.Shell ($) when:**
- You want simple command execution
- You want automatic argument escaping
- You want shell features (piping, redirection)
- You want simpler API
- You're executing simple commands

**Example:**
```typescript
// Simple git command
const hash = await $`git rev-parse HEAD`.text();
```

---

## 📚 References

- **Complete API Reference:** `src/runtime/bun-native-utils-complete.ts` (example 7.4.3.0.0.0.0)
- **Spawn Documentation:** `docs/bun/BUN-SPAWN-COMPLETE.md`
- **Official Docs:** https://bun.sh/docs/api/spawn
- **Comparison Guide:** See "Comparison" section above

---

## 🎯 Action Items

### High Priority
1. ✅ Fix unsafe command splitting in `src/mcp/tools/server-control.ts`
2. ✅ Add error handling to `src/runtime/bun-native-utils-complete.ts`
3. ✅ Create `src/utils/spawn-helpers.ts` with safe wrappers

### Medium Priority
4. ✅ Standardize API usage (command array vs options object)
5. ✅ Add `proc.pid` tracking for process management
6. ✅ Add `onExit` handlers for cleanup

### Low Priority
7. ✅ Add documentation comments
8. ✅ Add tests for spawn utilities
9. ✅ Update documentation with new patterns

---

**Review Status:** Complete  
**Next Review:** After fixes are implemented
