# 🚀 Bun CLI Scripts Reference Guide

This guide covers the **improved Bun CLI scripts** added to `package.json` following best practices from the [official Bun documentation](https://bun.com/docs/runtime).

## ⚡ Critical Flag Placement Rule

**✅ CORRECT**: Flags immediately after `bun`
```bash
bun --watch run dev
bun --hot run test
bun --inspect run src/index.ts
```

**❌ WRONG**: Flags at the end are ignored
```bash
bun run dev --watch  # Flags passed to script, not Bun!
```

---

## 📋 Available Scripts

### Development Scripts

| Script | Description | Use Case |
|--------|-------------|----------|
| `bun run dev` | Auto-restart on file changes | Default development |
| `bun run dev:hot` | Hot reload (faster than watch) | Active development |
| `bun run dev:debug` | Debug with inspector | Debugging startup issues |
| `bun run dev:verbose` | Deeper console inspection (depth: 5) | Debugging complex objects |
| `bun run dev:smol` | Low memory mode | Memory-constrained environments |
| `bun run dev:cli` | Hot reload CLI with insights table | CLI development |

### Dashboard Scripts

| Script | Description | Use Case |
|--------|-------------|----------|
| `bun run dashboard:serve` | Start dashboard server | Production-like testing |
| `bun run dashboard:serve:watch` | Auto-restart on file changes | Active development |
| `bun run dashboard:serve:hot` | Hot reload dashboard server | Fastest development cycle |
| `bun run dashboard:serve:debug` | Debug dashboard server | Debugging server issues |
| `bun run dev:dashboard` | Build + serve dashboard | Full development workflow |

### Test Scripts

| Script | Description | Use Case |
|--------|-------------|----------|
| `bun test` | Run tests once | CI/CD pipelines |
| `bun run test:watch` | Auto-rerun on file changes | TDD workflow |
| `bun run test:hot` | Hot reload tests | Fastest test iteration |
| `bun run test:debug` | Debug tests with inspector | Debugging failing tests |
| `bun run test:coverage` | Generate coverage report | Code coverage analysis |
| `bun run test:cli:watch` | Watch CLI tests | CLI development |
| `bun run test:cli:debug` | Debug CLI tests | Debugging CLI issues |

---

## 🔧 Debugging with VSCode

1. **Open Debug Panel**: Press `F5` or click the Run icon
2. **Select Configuration**:
   - 🚀 **Debug Dashboard Server** - Debug dashboard with inspector
   - 🔧 **Debug Main Process** - Debug src/index.ts
   - 🧪 **Debug Tests** - Debug test suite
   - 📊 **Debug CLI** - Debug CLI tools
   - 🔌 **Attach to Bun Process** - Attach to running process
   - 🌐 **Debug with Hot Reload** - Debug with auto-reload

3. **Set Breakpoints**: Click in the gutter next to line numbers
4. **Start Debugging**: Press `F5` or click the green play button
5. **Debug Console**: View variables and execute expressions

---

## 🎯 Common Workflows

### 1. Active Development (Fastest)
```bash
bun run dev:hot
```
- Uses `--hot` flag for instant reload
- Faster than `--watch` for development

### 2. Debug Server Issues
```bash
bun run dashboard:serve:debug
```
- Starts inspector with `--inspect-wait`
- Waits for debugger connection before executing
- Use with VSCode or Chrome DevTools

### 3. Test-Driven Development
```bash
bun run test:hot
```
- Hot reload tests for instant feedback
- Faster iteration cycle

### 4. Debug Complex Objects
```bash
bun run dev:verbose
```
- Sets `--console-depth 5` (default: 2)
- See deeply nested object properties

### 5. Memory-Constrained Development
```bash
bun run dev:smol
```
- Uses `--smol` flag
- More frequent garbage collection
- Lower memory footprint

### 6. Full Dashboard Development
```bash
bun run dev:dashboard
```
- Builds React dashboard
- Starts dashboard server
- Complete development environment

---

## 📊 Performance Comparison

Based on [Bun benchmarks](https://bun.com/docs/runtime):

| Command | Startup Time |
|---------|--------------|
| `bun run dev` | ~5ms |
| `node run dev` | ~25ms |
| `npm run dev` | ~170ms |

**Bun is 4x faster than Node.js and 34x faster than npm for startup!**

---

## 🛠️ Advanced CLI Flags

### General Execution
```bash
bun --silent run dev              # Don't print script command
bun --if-present run optional     # No error if missing
bun --eval "console.log('test')"  # Execute code directly
```

### Workspace (Monorepo)
```bash
bun run --filter 'dash*' build    # Build all dashboard packages
bun run --workspaces test          # Run in all workspace packages
```

### Transpilation
```bash
bun --define NODE_ENV:"production" run build
bun --drop=console run build       # Remove console.* calls
bun --loader .js:jsx run build     # Use JSX loader for .js files
```

### Networking
```bash
bun --port 8080 run server         # Set default port
bun --prefer-offline run dev       # Skip staleness checks
bun --fetch-preconnect https://api.example.com run dev
```

### Environment
```bash
bun --env-file .env.local run dev  # Load specific env file
bun --cwd /path/to/dir run dev     # Change working directory
```

---

## 🔍 Troubleshooting

### Issue: "Flags are being ignored"
**Solution**: Move flags immediately after `bun`
```bash
# ❌ Wrong
bun run dev --watch

# ✅ Correct
bun --watch run dev
```

### Issue: "Tests not reloading"
**Solution**: Use `test:hot` instead of `test:watch`
```bash
bun run test:hot  # Faster hot reload
```

### Issue: "Can't see object properties"
**Solution**: Increase console depth
```bash
bun run dev:verbose  # Sets --console-depth 5
```

### Issue: "Out of memory during development"
**Solution**: Use smol mode
```bash
bun run dev:smol  # Reduces memory usage
```

---

## 📚 Additional Resources

- [Bun Runtime Docs](https://bun.com/docs/runtime)
- [Watch Mode](https://bun.com/docs/runtime/watch-mode)
- [Debugging](https://bun.com/docs/runtime/debugging)
- [bunfig.toml](https://bun.com/docs/runtime/bunfigtoml)
- [CLI Usage](https://bun.com/docs/runtime#cli-usage)

---

## ✅ Summary of Changes

### Updated Scripts (Fixed Flag Placement)
- ✅ `dev`: Added `run` keyword
- ✅ `dev:hot`: New hot reload script
- ✅ `dev:debug`: Changed to `--inspect --inspect-wait`
- ✅ `dev:verbose`: New script with `--console-depth 5`
- ✅ `dev:smol`: New low-memory script
- ✅ `dashboard:serve:watch`: New with `--watch`
- ✅ `dashboard:serve:hot`: New with `--hot`
- ✅ `dashboard:serve:debug`: New debug script
- ✅ `test:watch`: Fixed flag placement
- ✅ `test:hot`: New hot reload for tests
- ✅ `test:debug`: New debug test script
- ✅ `test:cli:watch`: Fixed flag placement
- ✅ `test:cli:debug`: New CLI test debugging
- ✅ `health:watch`: Fixed flag placement

### New Configuration Files
- ✅ `.vscode/launch.json`: VSCode debugging configurations
- ✅ `bunfig.toml`: Already existed, well-configured

---

## 🎉 Next Steps

1. **Try hot reload**: `bun run dev:hot`
2. **Debug in VSCode**: Press `F5` and select a configuration
3. **Run tests with hot reload**: `bun run test:hot`
4. **Check verbose output**: `bun run dev:verbose`

Happy coding with Bun! 🚀
