# Bun.spawn() Usage Statistics

**Date:** 2025-01-07  
**Total Files Using Bun.spawn():** 13 files

---

## 📊 Breakdown by Directory

### Source Files (`src/`): 6 files
1. `src/runtime/bun-native-utils-complete.ts` - Documentation and example
2. `src/api/routes.ts` - Bench execution, git log extraction
3. `src/utils/bun.ts` - `spawnWithTimeout` utility function
4. `src/utils/logs-native.ts` - Log streaming with `tail -f`
5. `src/mcp/tools/server-control.ts` - Server process management
6. `src/api/examples.ts` - Example code documentation

### Script Files (`scripts/`): 4 files
1. `scripts/bun-shell-examples.ts` - Examples and demos
2. `scripts/dashboard-server.ts` - Dashboard server spawning
3. `scripts/deploy-prod.ts` - Deployment scripts
4. `scripts/shell-utils.ts` - Shell utility functions

### Example Files (`examples/`): 2 files
1. `examples/demos/demo-bun-spawn-complete.ts` - Complete spawn demo
2. `examples/demos/tag-manager.ts` - Tag manager demo

### Test Files (`test/`): 1 file
1. `test/harness.ts` - Test harness with `runBun()` helper

---

## 📈 Usage Categories

### Log Streaming: 1 file
- `src/utils/logs-native.ts` - Uses `tail -f` for real-time log streaming

### Process Management: 2 files
- `src/mcp/tools/server-control.ts` - Spawns API/dashboard servers
- `scripts/dashboard-server.ts` - Dashboard server management

### Utility Functions: 1 file
- `src/utils/bun.ts` - `spawnWithTimeout` helper

### Bench Execution: 1 file
- `src/api/routes.ts` - Executes benchmark scripts

### Git Operations: 1 file
- `src/api/routes.ts` - Git log extraction

### Examples/Demos: 2 files
- `examples/demos/demo-bun-spawn-complete.ts`
- `examples/demos/tag-manager.ts`

### Test Utilities: 1 file
- `test/harness.ts` - Test helper functions

---

## 🔍 Usage Patterns

### Most Common Patterns

1. **Basic Spawn with Pipes** (~8 instances)
   ```typescript
   const proc = Bun.spawn(["cmd", "arg"], {
     stdout: "pipe",
     stderr: "pipe",
   });
   ```

2. **Spawn with Environment Variables** (~4 instances)
   ```typescript
   const proc = Bun.spawn(["cmd"], {
     env: { ...process.env, VAR: "value" },
   });
   ```

3. **Spawn with Working Directory** (~4 instances)
   ```typescript
   const proc = Bun.spawn(["cmd"], {
     cwd: process.cwd(),
   });
   ```

4. **Spawn with Timeout** (~2 instances)
   ```typescript
   const proc = Bun.spawn(["cmd"], {
     timeout: 5000,
   });
   ```

### Options Used

| Option | Usage Count | Files |
|--------|-------------|-------|
| `stdout: "pipe"` | ~10 | Most files |
| `stderr: "pipe"` | ~8 | Most files |
| `cwd` | ~4 | routes.ts, server-control.ts |
| `env` | ~4 | bun.ts, server-control.ts |
| `timeout` | ~2 | routes.ts, bun.ts |
| `onExit` | ~0 | None (recommendation) |
| `stdin` | ~1 | harness.ts |

### Methods Used

| Method | Usage Count | Purpose |
|--------|-------------|---------|
| `proc.exited` | ~8 | Wait for process completion |
| `proc.stdout` | ~6 | Read stdout stream |
| `proc.stderr` | ~4 | Read stderr stream |
| `proc.kill()` | ~3 | Terminate process |
| `proc.pid` | ~1 | Process ID tracking |

---

## 📝 Complete File List

```
./examples/demos/demo-bun-spawn-complete.ts
./examples/demos/tag-manager.ts
./scripts/bun-shell-examples.ts
./scripts/dashboard-server.ts
./scripts/deploy-prod.ts
./scripts/shell-utils.ts
./src/api/examples.ts
./src/api/routes.ts
./src/mcp/tools/server-control.ts
./src/runtime/bun-native-utils-complete.ts
./src/utils/bun.ts
./src/utils/logs-native.ts
./test/harness.ts
```

---

## 🎯 Comparison: Bun.spawn() vs Bun.Shell ($)

### Usage Statistics

| Feature | Bun.spawn() | Bun.Shell ($) |
|---------|-------------|---------------|
| **Files** | 13 | 26 |
| **Primary Use** | Process control, streaming | Simple commands, git ops |
| **Complexity** | Higher | Lower |
| **Streaming** | ✅ Native | ⚠️ Limited |
| **Process Control** | ✅ Full control | ⚠️ Limited |
| **Shell Features** | ❌ No | ✅ Yes (piping, etc.) |

### When to Use Each

**Use Bun.spawn() when:**
- ✅ Real-time streaming needed (`tail -f`)
- ✅ Process lifecycle management needed
- ✅ Custom stdin/stdout/stderr handling
- ✅ Process monitoring (PID tracking)
- ✅ Long-running processes

**Use Bun.Shell ($) when:**
- ✅ Simple command execution
- ✅ Shell features needed (piping, redirection)
- ✅ Automatic argument escaping
- ✅ Git operations
- ✅ Quick scripts

---

## 🔧 Common Use Cases

### 1. Log Streaming
```typescript
// src/utils/logs-native.ts
const proc = Bun.spawn(["tail", "-f", filePath], {
  stdout: "pipe",
  stderr: "pipe",
});
```

### 2. Process with Timeout
```typescript
// src/utils/bun.ts
const proc = Bun.spawn(cmd, {
  stdout: "pipe",
  stderr: "pipe",
});
const timer = setTimeout(() => proc.kill(9), timeout);
```

### 3. Server Management
```typescript
// src/mcp/tools/server-control.ts
const proc = Bun.spawn(["bun", "run", script], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port) },
});
```

### 4. Bench Execution
```typescript
// src/api/routes.ts
const result = await Bun.spawn({
  cmd: ["bun", "run", "scripts/bench.ts"],
  cwd: process.cwd(),
  stdout: "pipe",
  stderr: "pipe",
});
```

---

## 📊 Summary

- **Total:** 13 files
- **Source code:** 6 files (46%)
- **Scripts:** 4 files (31%)
- **Examples:** 2 files (15%)
- **Tests:** 1 file (8%)

**Primary Use Cases:**
1. Log streaming (real-time tail)
2. Process management (server spawning)
3. Utility functions (timeout wrappers)
4. Bench execution
5. Test harnesses

**Key Features Used:**
- Stream handling (`stdout: "pipe"`, `stderr: "pipe"`)
- Environment variables
- Working directory
- Timeout handling
- Process killing

---

**Last Updated:** 2025-01-07  
**Command Used:** `find . -type f -name "*.ts" -exec grep -l 'Bun\.spawn(' {} \;`
