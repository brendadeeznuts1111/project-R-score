# 🔥 Bun Development Workflow - Complete Guide

Complete guide to **Bun's development workflow features** (`--watch`, `--hot`, `--no-clear-screen`) with best practices and workflows.

---

## 📊 Feature Comparison

| Feature | Purpose | Speed | Use Case |
|---------|---------|-------|----------|
| `--watch` | Restart process on file change | Fast | General development |
| `--hot` | Hot reload (no restart) | **Fastest** | Active development |
| `--no-clear-screen` | Keep terminal history | N/A | Debugging with logs |

---

## 🚀 Quick Start

### 1. Hot Reload (Recommended - Fastest) ⚡
```bash
bun --hot run dev
```
- **Instant reload** without restarting process
- Preserves application state
- Best for active development
- Works with: runtime, test runner, bundler

### 2. Watch Mode (Traditional)
```bash
bun --watch run dev
```
- Restarts process on file change
- Fresh state on each reload
- Good for: servers, long-running processes

### 3. Debug-Friendly Watch
```bash
bun --hot --no-clear-screen run dev
```
- Hot reload + keeps terminal logs
- Perfect for debugging
- See full history of console output

---

## 🎯 Development Workflows

### Workflow 1: Active Development (Recommended)

**Goal**: Fastest iteration cycle

```bash
# Terminal 1: Hot reload server
bun --hot run dev

# Terminal 2: Hot reload tests
bun --hot test
```

**Benefits**:
- ⚡ Instant feedback
- 🔄 No server restart
- 💾 Preserves state (sessions, connections, etc.)

**Use When**:
- Active feature development
- UI/React development
- API endpoint development
- Testing changes rapidly

---

### Workflow 2: Server Development

**Goal**: Test server with clean state

```bash
# Watch mode - restarts server on changes
bun --watch run dev-hq/servers/dashboard-server.ts
```

**Benefits**:
- 🔄 Fresh state on each change
- ✅ Clean reinitialization
- 🐛 Catches startup issues

**Use When**:
- Developing initialization code
- Testing server startup
- Working with connections/sessions
- Memory leak testing

---

### Workflow 3: Debug Mode

**Goal**: Keep logs while developing

```bash
# Hot reload without clearing screen
bun --hot --no-clear-screen run dev
```

**Benefits**:
- 👀 See full log history
- 🐛 Debug with context
- 📝 Track changes over time

**Use When**:
- Debugging complex issues
- Analyzing logs
- Testing API calls
- Monitoring state changes

---

### Workflow 4: Test-Driven Development

**Goal**: Fast test feedback

```bash
# Hot reload tests
bun --hot test

# Or with specific test file
bun --hot test tests/unit/dashboard/
```

**Benefits**:
- ⚡ Instant test re-run
- 🎯 Focus on specific tests
- 🔄 No test runner restart

**Use When**:
- TDD workflow
- Rapid test iteration
- Fixing failing tests
- Writing new tests

---

### Workflow 5: Full-Stack Development

**Goal**: Develop dashboard + server together

```bash
# Terminal 1: Dashboard (Vite dev server with hot reload)
cd dashboard-react && bun run dev

# Terminal 2: Backend API (hot reload)
bun --hot run dev-hq/servers/dashboard-server.ts

# Terminal 3: Tests (hot reload)
bun --hot test
```

**Benefits**:
- 🎨 Frontend hot reload (Vite HMR)
- 🔧 Backend hot reload (Bun)
- 🧪 Tests hot reload
- ⚡ Maximum development speed

---

## 🔧 Advanced Combinations

### Hot Reload + Inspector (Debugging)
```bash
bun --hot --inspect --inspect-wait run dev
```
- Hot reload + debug mode
- Wait for debugger before starting
- Breakpoints preserved across reloads

### Hot Reload + Verbose Logging
```bash
bun --hot --console-depth 5 run dev
```
- Hot reload with deep object inspection
- See full object structures in logs

### Hot Reload + Smol Mode (Low Memory)
```bash
bun --hot --smol run dev
```
- Hot reload in low-memory environments
- Good for: CI/CD, containers, limited RAM

### Watch + No Clear Screen (Server Logs)
```bash
bun --watch --no-clear-screen run dev-hq/servers/dashboard-server.ts
```
- Server restarts + keep logs
- See full request/response history

---

## 📋 Best Practices

### ✅ DO's

1. **Use `--hot` for active development**
   - Fastest feedback loop
   - Preserves application state
   - Best for: UI, API, business logic

2. **Use `--watch` for server development**
   - Clean state on restart
   - Catches initialization issues
   - Best for: servers, workers, background jobs

3. **Use `--no-clear-screen` when debugging**
   - Keep terminal history
   - See full log context
   - Best for: debugging, monitoring, logging

4. **Combine flags for maximum productivity**
   ```bash
   bun --hot --no-clear-screen --console-depth 5 run dev
   ```

### ❌ DON'Ts

1. **Don't put flags at the end**
   ```bash
   # ❌ WRONG - flags ignored!
   bun run dev --hot

   # ✅ CORRECT
   bun --hot run dev
   ```

2. **Don't use `--watch` with `--hot` together**
   ```bash
   # ❌ REDUNDANT
   bun --watch --hot run dev

   # ✅ JUST USE --hot
   bun --hot run dev
   ```

3. **Don't forget `run` keyword for package.json scripts**
   ```bash
   # ❌ WRONG
   bun --hot dev

   # ✅ CORRECT
   bun --hot run dev
   ```

---

## 🎯 Scenario-Based Quick Reference

| Scenario | Command | Why? |
|----------|---------|-----|
| **General development** | `bun --hot run dev` | Fastest reload |
| **Server development** | `bun --watch run server` | Clean restarts |
| **Debugging** | `bun --hot --no-clear-screen run dev` | Keep logs |
| **Testing** | `bun --hot test` | Instant test re-run |
| **Full-stack** | Multiple terminals with `--hot` | Max speed |
| **Low memory** | `bun --hot --smol run dev` | Reduce RAM |
| **Debug inspector** | `bun --hot --inspect run dev` | Debug with hot reload |

---

## 🔄 Hot Reload vs Watch Mode

### Hot Reload (`--hot`)
```text
File Change → Detect → Update Module → ✅ Done (no restart)
```
- **Process keeps running**
- **Modules updated in-place**
- **State preserved**
- **Faster**

### Watch Mode (`--watch`)
```text
File Change → Detect → Stop Process → Start Process → ✅ Done
```
- **Process restarts**
- **Fresh initialization**
- **Clean state**
- **More reliable**

---

## 🛠️ Practical Examples

### Example 1: Dashboard Development
```bash
# Terminal 1: Backend API with hot reload
bun --hot run dev-hq/servers/dashboard-server.ts

# Terminal 2: React dashboard (Vite has own HMR)
cd dashboard-react && bun run dev
```
**Result**: Both frontend and backend reload instantly on changes!

### Example 2: API Endpoint Development
```bash
# Hot reload backend
bun --hot run dev-hq/servers/dashboard-server.ts

# In another terminal, test endpoint
curl http://localhost:3000/api/telemetry/health
```

**Change code** → **Auto reload** → **Test again** → **Repeat**

### Example 3: Test Development
```bash
# Hot reload specific test file
bun --hot test tests/unit/dashboard/
```

**Write test** → **Auto re-run** → **See result** → **Fix** → **Repeat**

### Example 4: Debugging with Logs
```bash
# Keep terminal history while debugging
bun --hot --no-clear-screen run dev
```

**Make changes** → **See all previous logs** → **Spot patterns** → **Fix bugs**

---

## 📊 Performance Impact

| Mode | Startup | Reload Speed | Memory | State |
|------|---------|--------------|--------|-------|
| **Normal** | 5ms | N/A | Baseline | Fresh |
| **--hot** | 5ms | ~1ms | +10-20% | Preserved |
| **--watch** | 5ms | ~5ms (restart) | Baseline | Fresh |
| **--smol** | 5ms | N/A | -30% | Fresh |

---

## 🎨 IDE Integration

### VSCode Tasks (`.vscode/tasks.json`)
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "🔥 Hot Reload Dev",
      "type": "shell",
      "command": "bun --hot run dev",
      "group": "build",
      "isBackground": true,
      "problemMatcher": []
    },
    {
      "label": "👀 Watch Dev",
      "type": "shell",
      "command": "bun --watch run dev",
      "group": "build",
      "isBackground": true,
      "problemMatcher": []
    },
    {
      "label": "🐛 Debug Mode",
      "type": "shell",
      "command": "bun --hot --no-clear-screen run dev",
      "group": "build",
      "isBackground": true,
      "problemMatcher": []
    }
  ]
}
```

**Usage**: Press `Ctrl+Shift+B` (or `Cmd+Shift+B` on Mac) to run tasks.

---

## 🚀 Recommended Scripts for package.json

Already added to your `package.json`:

```json
{
  "scripts": {
    "dev": "bun --watch run src/index.ts",
    "dev:hot": "bun --hot run src/index.ts",
    "dev:debug": "bun --hot --no-clear-screen --console-depth 5 run src/index.ts",

    "dashboard:serve": "bun run dev-hq/servers/dashboard-server.ts",
    "dashboard:serve:watch": "bun --watch run dev-hq/servers/dashboard-server.ts",
    "dashboard:serve:hot": "bun --hot run dev-hq/servers/dashboard-server.ts",

    "test": "bun test",
    "test:watch": "bun --watch test",
    "test:hot": "bun --hot test"
  }
}
```

---

## ✅ Summary

### Key Takeaways

1. **`--hot` is fastest** - Use for active development
2. **`--watch` for servers** - Clean restarts are important
3. **`--no-clear-screen` for debugging** - Keep log history
4. **Always put flags immediately after `bun`**
5. **Combine flags for advanced use cases**

### Quick Commands

```bash
# Start here (hot reload)
bun run dev:hot

# Debug mode
bun run dev:debug

# Dashboard
bun run dashboard:serve:hot

# Tests
bun run test:hot
```

---

## 📚 Further Reading

- [Bun Runtime Docs](https://bun.com/docs/runtime)
- [Watch Mode](https://bun.com/docs/runtime/watch-mode)
- [CLI Usage Guide](./BUN_CLI_GUIDE.md)
- [Improvements Summary](./BUN_IMPROVEMENTS_SUMMARY.md)

---

**🎉 Happy coding with instant hot reload!**
