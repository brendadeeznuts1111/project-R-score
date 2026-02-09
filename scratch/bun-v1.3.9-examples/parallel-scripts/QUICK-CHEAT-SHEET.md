# Quick Cheat Sheet: `bun run --parallel` and `--sequential`

## 🚀 Basic Commands

```bash
# Parallel execution
bun run --parallel build test lint

# Sequential execution
bun run --sequential build test lint

# Glob patterns
bun run --parallel "build:*"
```

## 📦 Workspace Commands

```bash
# All packages, parallel
bun run --parallel --filter '*' build

# All packages, sequential
bun run --sequential --workspaces build

# Multiple scripts, all packages
bun run --parallel --filter '*' build lint test

# Continue on error
bun run --parallel --no-exit-on-error --filter '*' test

# Skip missing scripts
bun run --parallel --workspaces --if-present build
```

## 📊 Output Format

**Single package:**
```
build | output...
test  | output...
```

**With workspaces:**
```
pkg-a:build | output...
pkg-b:build | output...
```

## ⚡ Execution Behavior

| Mode | Start | Execution | Output |
|------|-------|-----------|--------|
| `--parallel` | All immediately | Concurrent | Interleaved |
| `--sequential` | One at a time | Sequential | Sequential |

## 🚨 Error Handling

```bash
# Default: Fail fast (stops on first error)
bun run --parallel build fail lint

# Continue on error
bun run --parallel --no-exit-on-error build fail lint
```

## 🔗 Pre/Post Scripts

**Automatically grouped:**
- `prebuild` → `build` → `postbuild` (runs as a unit)
- `pretest` → `test` → `posttest` (runs as a unit)

**With `--parallel`:** Groups run concurrently  
**With `--sequential`:** Groups run one after another

## 🎯 When to Use

| Use Case | Command |
|----------|---------|
| Independent scripts | `--parallel` |
| Dependent scripts | `--sequential` |
| Watch mode | `--parallel` |
| CI/CD (speed) | `--parallel` |
| See all failures | `--no-exit-on-error` |
| Skip missing scripts | `--if-present` |

## 🔍 vs `--filter`

| Feature | `--filter` | `--parallel`/`--sequential` |
|---------|-----------|----------------------------|
| Dependency order | ✅ Respected | ❌ Not respected |
| Watch scripts | ⚠️ Can wait | ✅ Starts immediately |
