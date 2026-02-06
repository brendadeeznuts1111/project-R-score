# 🔄 Process Lifecycle State Machine

This document describes Bun's process lifecycle state machine for spawned processes using `Bun.spawn()`.

## 📊 State Machine Diagram

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PROCESS LIFECYCLE STATE MACHINE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                                    ┌─────────────┐                          │
│                                    │   INITIAL   │                          │
│                                    └──────┬──────┘                          │
│                                           │                                 │
│                                           ▼                                 │
│                              ┌─────────────────────┐                        │
│                              │      CREATING       │                        │
│                              │  Bun.spawn() called │                        │
│                              └──────────┬──────────┘                        │
│                                         │                                   │
│                                         ▼                                   │
│                              ┌─────────────────────┐                        │
│                    ┌────────►│      STARTING       │◄────────┐              │
│                    │         │  Process spawned    │         │              │
│                    │         └──────────┬──────────┘         │              │
│                    │                    │                    │              │
│                    │                    ▼                    │              │
│                    │         ┌─────────────────────┐         │              │
│                    │         │      RUNNING        │         │              │
│                    │         │  Process executing  │         │              │
│                    │         └──────────┬──────────┘         │              │
│                    │                    │                    │              │
│                    │    ┌───────────────┼───────────────┐    │              │
│                    │    │               │               │    │              │
│                    │    ▼               ▼               ▼    │              │
│            ┌───────────┐       ┌───────────┐       ┌───────────┐            │
│            │   KILLED  │       │ RESTARTING│       │  STOPPED  │            │
│            │ kill()    │       │ (watch)   │       │ exit()    │──┘        │
│            │ called    │       │           │       │           │            │
│            └─────┬─────┘       └─────┬─────┘       └─────┬─────┘            │
│                  │                   │                   │                  │
│                  │                   │                   ▼                  │
│                  │                   │         ┌─────────────────┐          │
│                  │                   │         │     EXITED      │          │
│                  │                   │         │  proc.exited    │          │
│                  │                   │         │  promise        │          │
│                  │                   │         └────────┬────────┘          │
│                  │                   │                  │                   │
│                  │                   │                  ▼                   │
│                  │                   │         ┌─────────────────┐          │
│                  │                   └────────►│    CLEANUP      │          │
│                  │                           │  Cleanup final-  │          │
│                  │                           │  izers run       │          │
│                  │                           └────────┬────────┘          │
│                  │                                  │                     │
│                  │                                  ▼                     │
│                  │                           ┌─────────────┐              │
│                  └──────────────────────────►│   FINAL     │              │
│                                              └─────────────┘              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🎯 States

### 1. **INITIAL**
- **Description**: Before `Bun.spawn()` is called
- **Properties**: No process exists yet
- **Transitions**: → CREATING (when `Bun.spawn()` is called)

### 2. **CREATING**
- **Description**: `Bun.spawn()` has been called, process is being initialized
- **Properties**: Process handle exists but not yet started
- **Transitions**: → STARTING (when process spawn succeeds)

### 3. **STARTING**
- **Description**: Process has been spawned, preparing to execute
- **Properties**: Process exists, initializing
- **Transitions**:
  - → RUNNING (when process begins executing)
  - → RESTARTING (if restart is requested during startup)

### 4. **RUNNING**
- **Description**: Process is actively executing
- **Properties**: Process is running, handling I/O
- **Transitions**:
  - → KILLED (when `kill()` is called)
  - → RESTARTING (when file change detected in watch mode)
  - → STOPPED (when process exits naturally or calls `process.exit()`)

### 5. **KILLED**
- **Description**: Process was terminated via `kill()` method
- **Properties**: Process received termination signal (SIGTERM/SIGKILL)
- **Transitions**: → CLEANUP (when streams drain)

### 6. **RESTARTING**
- **Description**: Process is being restarted (watch mode)
- **Properties**: Old process is terminating, new process will be created
- **Transitions**: → CREATING (when new process is spawned)

### 7. **STOPPED**
- **Description**: Process has stopped executing
- **Properties**: Process exited naturally or via `process.exit()`
- **Transitions**: → EXITED (when `proc.exited` promise resolves)

### 8. **EXITED**
- **Description**: Process exit is confirmed
- **Properties**: `proc.exited` promise has resolved with exit code
- **Transitions**: → CLEANUP (when output streams are drained)

### 9. **CLEANUP**
- **Description**: Final cleanup operations are running
- **Properties**: Streams are draining, finalizers are executing
- **Transitions**: → FINAL (when cleanup completes)

### 10. **FINAL**
- **Description**: Process lifecycle is complete
- **Properties**: All resources cleaned up, no further state changes
- **Transitions**: None (terminal state)

## 🔄 State Transitions

| From State | To State | Trigger | Description |
|------------|----------|---------|-------------|
| **INITIAL** | **CREATING** | `Bun.spawn()` called | Process creation begins |
| **CREATING** | **STARTING** | Process spawned | Process initialization complete |
| **STARTING** | **RUNNING** | First instruction executes | Process begins execution |
| **STARTING** | **RESTARTING** | Restart requested during startup | Immediate restart before running |
| **RUNNING** | **KILLED** | `kill(SIGTERM/SIGKILL)` called | Process termination requested |
| **RUNNING** | **RESTARTING** | File change detected (watch mode) | Restart triggered by file watcher |
| **RUNNING** | **STOPPED** | `process.exit()` or natural exit | Process exits normally |
| **STOPPED** | **EXITED** | `proc.exited` promise resolves | Exit code confirmed |
| **KILLED** | **CLEANUP** | Streams drained | Cleanup after kill signal |
| **EXITED** | **CLEANUP** | Output streams drained | Cleanup after exit |
| **RESTARTING** | **CREATING** | New process spawned | Restart cycle begins |
| **CLEANUP** | **FINAL** | Cleanup handlers complete | Lifecycle complete |

## 💻 Code Examples

### Basic Process Lifecycle

```typescript
import { spawn } from "bun";

// INITIAL → CREATING
const proc = spawn({
  cmd: ["bun", "run", "server.ts"],
});

// CREATING → STARTING → RUNNING
// Process automatically transitions through these states

// Monitor state transitions
proc.exited.then((code) => {
  // RUNNING → STOPPED → EXITED → CLEANUP → FINAL
  console.log(`Process exited with code ${code}`);
});
```

### Process with Kill Signal

```typescript
import { spawn } from "bun";

const proc = spawn({
  cmd: ["node", "long-running.js"],
});

// RUNNING → KILLED → CLEANUP → FINAL
setTimeout(() => {
  proc.kill(); // Send SIGTERM
}, 5000);

// Force kill if needed
setTimeout(() => {
  proc.kill("SIGKILL"); // Force termination
}, 10000);
```

### Watch Mode (Restart Cycle)

```typescript
import { spawn } from "bun";

const proc = spawn({
  cmd: ["bun", "run", "--watch", "server.ts"],
  cwd: "./src",
});

// RUNNING → RESTARTING → CREATING → STARTING → RUNNING
// This cycle repeats when files change
```

### Waiting for Exit

```typescript
import { spawn } from "bun";

const proc = spawn({
  cmd: ["bun", "test"],
});

// Wait for STOPPED → EXITED transition
const exitCode = await proc.exited;
console.log(`Tests completed with code: ${exitCode}`);
```

### Exit Code Handling

```typescript
import { spawn } from "bun";

const proc = spawn({
  cmd: ["bun", "build"],
});

try {
  const exitCode = await proc.exited;

  if (exitCode === 0) {
    console.log("✅ Build succeeded");
  } else {
    console.error(`❌ Build failed with code ${exitCode}`);
    process.exit(exitCode);
  }
} catch (error) {
  console.error("Process error:", error);
}
```

### Stream Monitoring

```typescript
import { spawn } from "bun";

const proc = spawn({
  cmd: ["bun", "run", "script.ts"],
  stdout: "pipe",
  stderr: "pipe",
});

// Monitor stdout during RUNNING state
for await (const chunk of proc.stdout) {
  console.log("Output:", new TextDecoder().decode(chunk));
}

// Monitor stderr
for await (const chunk of proc.stderr) {
  console.error("Error:", new TextDecoder().decode(chunk));
}

// Wait for EXITED state
await proc.exited;
```

## 🔍 State Detection

### Checking Process Status

```typescript
import { spawn } from "bun";

const proc = spawn({
  cmd: ["bun", "run", "server.ts"],
});

// Check if process has exited (EXITED state)
if (proc.exitCode !== null) {
  console.log(`Process exited with code: ${proc.exitCode}`);
}

// Wait for exit (STOPPED → EXITED)
proc.exited.then((code) => {
  console.log(`Exit code: ${code}`);
});

// Check if process is killed (KILLED state)
proc.killed; // boolean - true if kill() was called
```

### Process State Properties

```typescript
interface ProcessState {
  // State indicators
  pid: number;           // Process ID (available after STARTING)
  exitCode: number | null; // Exit code (null until EXITED)
  killed: boolean;       // true if kill() was called (KILLED state)

  // State transitions
  exited: Promise<number>; // Resolves when EXITED state reached

  // Streams (available during RUNNING → CLEANUP)
  stdin: WritableStream | null;
  stdout: ReadableStream | null;
  stderr: ReadableStream | null;
}
```

## ⚠️ Error Handling

### Spawn Errors

```typescript
import { spawn } from "bun";

try {
  // INITIAL → CREATING (may fail here)
  const proc = spawn({
    cmd: ["nonexistent-command"],
  });

  // CREATING → STARTING → RUNNING
  await proc.exited;
} catch (error) {
  // Error during CREATING or STARTING
  console.error("Spawn failed:", error);
}
```

### Exit Code Errors

```typescript
import { spawn } from "bun";

const proc = spawn({
  cmd: ["bun", "test"],
});

const exitCode = await proc.exited;

if (exitCode !== 0) {
  // Process exited with error (EXITED state)
  throw new Error(`Process failed with exit code ${exitCode}`);
}
```

## 🎯 Best Practices

### 1. Always Wait for Exit

```typescript
// ✅ Good: Wait for exit
const proc = spawn({ cmd: ["bun", "build"] });
await proc.exited;

// ❌ Bad: Don't assume immediate completion
const proc = spawn({ cmd: ["bun", "build"] });
// Process might still be in RUNNING state
```

### 2. Handle Streams Before Exit

```typescript
// ✅ Good: Read streams before waiting for exit
const proc = spawn({
  cmd: ["bun", "run", "script.ts"],
  stdout: "pipe",
});

// Read output during RUNNING state
for await (const chunk of proc.stdout) {
  process.stdout.write(chunk);
}

// Then wait for EXITED
await proc.exited;
```

### 3. Clean Kill Signals

```typescript
// ✅ Good: Try SIGTERM first, then SIGKILL
proc.kill(); // SIGTERM (allows cleanup)

setTimeout(() => {
  if (proc.exitCode === null) {
    proc.kill("SIGKILL"); // Force kill if needed
  }
}, 5000);

// ❌ Bad: Immediate SIGKILL (no cleanup)
proc.kill("SIGKILL");
```

### 4. Monitor State Transitions

```typescript
// ✅ Good: Monitor state through events/promises
const proc = spawn({ cmd: ["bun", "test"] });

proc.exited.then((code) => {
  console.log(`Process completed with code ${code}`);
});

// Also monitor streams for real-time feedback
for await (const chunk of proc.stdout) {
  console.log(new TextDecoder().decode(chunk));
}
```

## 📊 State Flow Diagram (Text)

```text
┌─────────┐
│ INITIAL │
└───┬─────┘
    │ Bun.spawn() called
    ▼
┌─────────┐
│CREATING │
└───┬─────┘
    │ Process spawned
    ▼
┌─────────┐
│STARTING │───┐
└───┬─────┘   │
    │ First   │ Restart requested
    │ exec    │
    ▼         │
┌─────────┐   │
│RUNNING  │◄──┘
└───┬─────┘
    │
    ├─── kill() ────► ┌───────┐
    │                 │KILLED │
    │                 └───┬───┘
    │                     │ Streams drain
    │                     ▼
    ├─── File change ──► ┌───────────┐
    │ (watch mode)       │RESTARTING │
    │                    └───┬───────┘
    │                        │ New spawn
    │                        ▼
    │                   ┌─────────┐
    │                   │CREATING │ (loop)
    │                   └─────────┘
    │
    └─── exit() ─────► ┌────────┐
                       │STOPPED │
                       └───┬────┘
                           │ proc.exited resolves
                           ▼
                       ┌───────┐
                       │EXITED │
                       └───┬───┘
                           │ Streams drain
                           ▼
                       ┌────────┐
                       │CLEANUP │
                       └───┬────┘
                           │ Cleanup complete
                           ▼
                       ┌───────┐
                       │ FINAL │
                       └───────┘
```

## 🔗 Related Documentation

- [Bun.spawn() API](https://bun.sh/docs/api/spawn)
- [Process Management](https://bun.com/docs/runtime#runtime-%26-process-control)
- [Watch Mode](../guides/testing/TESTING_ALIGNMENT.md)
- [Benchmarking](./RUNTIME_CONTROLS.md)

