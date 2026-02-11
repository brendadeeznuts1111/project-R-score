# `bun run --parallel` and `bun run --sequential` Examples

This directory demonstrates the new script orchestration features in Bun v1.3.9, which allow you to run multiple `package.json` scripts concurrently or sequentially with Foreman-style prefixed output.

## 🎯 Key Features

- **Parallel execution**: Run multiple scripts concurrently with interleaved, prefixed output
- **Sequential execution**: Run scripts one at a time in order
- **Workspace support**: Full `--filter` and `--workspaces` integration
- **Glob patterns**: Match script names with patterns like `"build:*"`
- **Error handling**: `--no-exit-on-error` to continue even if one script fails
- **Missing scripts**: `--if-present` to skip packages without the script
- **Pre/post hooks**: Automatically grouped and run in correct dependency order

## 📋 Examples

### Basic Usage

```bash
# Run "build" and "test" concurrently
bun run --parallel build test

# Run "build" and "test" sequentially
bun run --sequential build test
```

**Output:**
```
build | Building...
test  | Running tests...
build | Build complete
test  | Tests passed
```

### Glob Pattern Matching

```bash
# Run all scripts matching "build:*"
bun run --parallel "build:*"
```

This will run `build:client`, `build:server`, `build:shared`, etc. concurrently.

### Workspace Execution

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

**Output with workspaces:**
```
app:build   | Building application...
lib:build   | Building library...
utils:build | Building utilities...
app:build   | Build complete
lib:build   | Build complete
utils:build | Build complete
```

## 🚀 Running the Demo

```bash
# Make demo scripts executable
chmod +x demo.sh detailed-behavior-demo.sh

# Run basic examples
./demo.sh

# Run detailed behavior demonstration
./detailed-behavior-demo.sh
```

Or run individual examples:

```bash
cd parallel-scripts

# Basic parallel
bun run --parallel build test

# Basic sequential
bun run --sequential build test

# Glob patterns
bun run --parallel "build:*"

# Workspace examples
cd workspace-demo
bun run --parallel --filter '*' build
bun run --sequential --workspaces build
```

## 🔍 How It Differs from `--filter`

**`bun --filter="pkg" <script>`:**
- Respects dependency order
- Waits for dependencies before starting
- Can be problematic with long-lived watch scripts

**`bun run --parallel` / `--sequential`:**
- Does NOT respect dependency order
- Starts immediately (parallel) or runs in order (sequential)
- Perfect for independent scripts or watch mode

## 📝 Pre/Post Scripts

Pre/post scripts (`prebuild`/`postbuild`) are automatically grouped with their main script:

```json
{
  "scripts": {
    "prebuild": "echo 'Pre-build'",
    "build": "echo 'Building'",
    "postbuild": "echo 'Post-build'"
  }
}
```

When you run `bun run --parallel build test`, it will:
1. Run `prebuild` → `build` → `postbuild` as a group
2. Run `pretest` → `test` → `posttest` as a group
3. Both groups run concurrently

## 🎨 Output Formatting

Each line of output is prefixed with a colored, padded label:

```
build | compiling...
test  | running suite...
lint  | checking files...
```

With workspaces, labels include the package name:

```
pkg-a:build | compiling...
pkg-b:build | compiling...
```

## ⚠️ Error Handling

By default, a failure in any script kills all remaining scripts. Use `--no-exit-on-error` to let them all finish:

```bash
# Stop on first error (default)
bun run --parallel build test

# Continue even if one fails
bun run --parallel --no-exit-on-error build test
```

## 📚 Additional Documentation

- [Official Feature Summary](OFFICIAL-FEATURE-SUMMARY.md) - Summary based on official Bun v1.3.9 release notes
- [Quick Cheat Sheet](QUICK-CHEAT-SHEET.md) - Quick reference for common commands
- [Detailed Behavior Guide](BEHAVIOR-GUIDE.md) - In-depth explanation of execution behavior, error handling, and pre/post scripts
- [Real-World Examples](real-world-examples.md) - Practical use cases and patterns

## 📚 References

- [Bun v1.3.9 Release Notes](https://bun.com/blog/bun-v1.3.9#bun-run-parallel-and-bun-run-sequential)
- [Bun Documentation](https://bun.sh/docs)
