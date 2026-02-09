# Official Feature Summary: `bun run --parallel` and `--sequential`

Based on the [official Bun v1.3.9 release notes](https://bun.com/blog/bun-v1.3.9#bun-run-parallel-and-bun-run-sequential).

## 🎯 Core Features

### Execution Modes

**`--parallel`**
- ✅ Starts **all scripts immediately**
- ✅ Output is **interleaved** (mixed together)
- ✅ Scripts run **concurrently**

**`--sequential`**
- ✅ Runs scripts **one at a time** in order
- ✅ Output is **sequential** (one script completes before next starts)
- ✅ Scripts run **one after another**

### Output Format

**Single Package:**
```
build | compiling...
test  | running suite...
lint  | checking files...
```

**With Workspaces (`--filter` or `--workspaces`):**
```
pkg-a:build | compiling...
pkg-b:build | compiling...
```

Format: `package-name:script-name | output`

## 🚨 Error Handling

### Default Behavior (Fail Fast)

**By default, a failure in any script kills all remaining scripts.**

```bash
bun run --parallel build fail lint
# If 'fail' fails, 'lint' never runs
```

### Continue on Error

**Use `--no-exit-on-error` to let all scripts finish:**

```bash
bun run --parallel --no-exit-on-error build fail lint
# All scripts run, even if some fail
```

## 🔗 Pre/Post Script Grouping

**Pre/post scripts (`prebuild`/`postbuild`) are automatically grouped with their main script and run in the correct dependency order within each group.**

### Example

```json
{
  "scripts": {
    "prebuild": "echo 'Pre-build'",
    "build": "echo 'Building'",
    "postbuild": "echo 'Post-build'",
    "pretest": "echo 'Pre-test'",
    "test": "echo 'Testing'",
    "posttest": "echo 'Post-test'"
  }
}
```

**When running `bun run --parallel build test`:**

1. **Group 1:** `prebuild` → `build` → `postbuild` (runs as a unit)
2. **Group 2:** `pretest` → `test` → `posttest` (runs as a unit)
3. **Both groups run concurrently**

**When running `bun run --sequential build test`:**

1. **Group 1 completes:** `prebuild` → `build` → `postbuild`
2. **Then Group 2 runs:** `pretest` → `test` → `posttest`

### Key Points

- ✅ Pre/post scripts **always** run with their main script
- ✅ Pre/post scripts run in **correct dependency order** within the group
- ✅ Groups run **concurrently** with `--parallel`
- ✅ Groups run **sequentially** with `--sequential`
- ✅ Pre/post scripts **cannot** be separated from their main script

## 📋 Official Examples

### Basic Usage

```bash
# Run "build" and "test" concurrently
bun run --parallel build test

# Run "build" and "test" sequentially
bun run --sequential build test

# Glob-matched script names
bun run --parallel "build:*"
```

### Workspace Support

```bash
# Run "build" in all workspace packages concurrently
bun run --parallel --filter '*' build

# Run "build" in all workspace packages sequentially
bun run --sequential --workspaces build

# Multiple scripts across all packages
bun run --parallel --filter '*' build lint test

# Continue running even if one package fails
bun run --parallel --no-exit-on-error --filter '*' test

# Skip packages missing the script
bun run --parallel --workspaces --if-present build
```

## 🔍 Difference from `--filter`

**`bun --filter="pkg" <script>`:**
- ✅ Respects dependency order
- ✅ Waits for dependencies before starting
- ⚠️ Can be problematic with long-lived watch scripts

**`bun run --parallel` / `--sequential`:**
- ❌ Does NOT respect dependency order
- ✅ Starts immediately (parallel) or runs in order (sequential)
- ✅ Perfect for independent scripts or watch mode

## 📊 Quick Reference

| Feature | `--parallel` | `--sequential` |
|---------|-------------|----------------|
| **Start** | All immediately | One at a time |
| **Execution** | Concurrent | Sequential |
| **Output** | Interleaved | Sequential |
| **Speed** | Fastest | Slowest |
| **Error handling** | Fail fast (default) | Fail fast (default) |
| **Error tolerance** | `--no-exit-on-error` | `--no-exit-on-error` |
| **Pre/post scripts** | Grouped, concurrent | Grouped, sequential |

## 🎯 Use Cases

### Use `--parallel` for:
- ✅ Independent scripts (build, lint, test)
- ✅ Watch mode for multiple services
- ✅ CI/CD pipelines where speed matters
- ✅ Scripts that don't depend on each other

### Use `--sequential` for:
- ✅ Scripts with dependencies
- ✅ When order matters
- ✅ When you need clean, separated output
- ✅ When you need to see one script complete before next starts

### Use `--no-exit-on-error` for:
- ✅ Seeing all failures, not just the first
- ✅ Running tests across multiple packages
- ✅ Debugging multiple issues at once

## 📚 Official Documentation

- [Bun v1.3.9 Release Notes](https://bun.com/blog/bun-v1.3.9#bun-run-parallel-and-bun-run-sequential)
- [Bun Documentation](https://bun.sh/docs)

## 🔗 Related Files

- [Behavior Guide](BEHAVIOR-GUIDE.md) - Detailed explanation of all behaviors
- [Real-World Examples](real-world-examples.md) - Practical use cases
- [README](README.md) - Quick start guide
