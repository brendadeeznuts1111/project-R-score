# Detailed Behavior Guide: `bun run --parallel` and `--sequential`

This guide explains the detailed behavior of Bun v1.3.9's script orchestration features.

## 📋 Output Format

### Basic Output (Single Package)

When running scripts in a single package, output is prefixed with the script name:

```bash
bun run --parallel build test lint
```

**Output:**
```
build | Building...
test  | Running tests...
lint  | Checking files...
build | Build complete
test  | Tests passed
lint  | Lint complete
```

Notice:
- Each line is prefixed with a **colored, padded label** (script name)
- Labels are left-aligned and padded for readability
- Output is **interleaved** when using `--parallel`

### Workspace Output (Multiple Packages)

When using `--filter` or `--workspaces`, labels include the package name:

```bash
bun run --parallel --filter '*' build
```

**Output:**
```
app:build   | Building application...
lib:build   | Building library...
utils:build | Building utilities...
app:build   | Build complete
lib:build   | Build complete
utils:build | Build complete
```

**Format:** `package-name:script-name | output`

This makes it easy to identify which package produced which output line.

## ⚡ Execution Behavior

### `--parallel` (Concurrent Execution)

**Behavior:**
- ✅ Starts **all scripts immediately**
- ✅ Scripts run **concurrently** (at the same time)
- ✅ Output is **interleaved** (mixed together)
- ✅ Fastest execution time (limited by slowest script)

**Example:**
```bash
bun run --parallel build test lint
```

**Timeline:**
```
Time 0s:  build starts, test starts, lint starts (all at once)
Time 0.5s: lint finishes
Time 1s:  build finishes, test finishes
```

**Use Cases:**
- Independent scripts (build, lint, test)
- Watch mode for multiple services
- CI/CD pipelines where speed matters

### `--sequential` (Ordered Execution)

**Behavior:**
- ✅ Runs scripts **one at a time** in order
- ✅ Each script **completes** before the next starts
- ✅ Output is **sequential** (one script's output, then next)
- ✅ Slower execution time (sum of all script times)

**Example:**
```bash
bun run --sequential build test lint
```

**Timeline:**
```
Time 0s:    build starts
Time 1s:    build finishes, test starts
Time 2s:    test finishes, lint starts
Time 2.5s:  lint finishes
```

**Use Cases:**
- Scripts with dependencies
- When order matters
- When you need clean, separated output

## 🚨 Error Handling

### Default Behavior (Fail Fast)

**By default, a failure in any script kills all remaining scripts:**

```bash
bun run --parallel build fail lint
```

**Behavior:**
1. `build` starts
2. `fail` starts
3. `fail` fails → **All scripts stop immediately**
4. `lint` never runs

**Output:**
```
build | Building...
fail  | This script will fail
fail  | Error: exit code 1
```

**Use Case:** When you want to stop immediately on any error (default CI behavior)

### `--no-exit-on-error` (Continue on Error)

**Use `--no-exit-on-error` to let all scripts finish:**

```bash
bun run --parallel --no-exit-on-error build fail lint
```

**Behavior:**
1. `build` starts
2. `fail` starts
3. `fail` fails → **Other scripts continue**
4. `lint` still runs
5. Exit code reflects failures, but all scripts completed

**Output:**
```
build | Building...
fail  | This script will fail
fail  | Error: exit code 1
lint  | Checking files...
build | Build complete
lint  | Lint complete
```

**Use Case:** When you want to see all failures, not just the first one

## 🔗 Pre/Post Script Grouping

### Automatic Grouping

**Pre/post scripts are automatically grouped with their main script:**

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

### Execution Order

**When running `bun run --parallel build test`:**

1. **Group 1:** `prebuild` → `build` → `postbuild` (runs as a unit)
2. **Group 2:** `pretest` → `test` → `posttest` (runs as a unit)
3. **Both groups run concurrently**

**Output:**
```
prebuild | Pre-build
pretest  | Pre-test
build    | Building
test     | Testing
postbuild | Post-build
posttest  | Post-test
```

### Sequential Execution

**When running `bun run --sequential build test`:**

1. **Group 1 completes:** `prebuild` → `build` → `postbuild`
2. **Then Group 2 runs:** `pretest` → `test` → `posttest`

**Output:**
```
prebuild  | Pre-build
build     | Building
postbuild | Post-build
pretest   | Pre-test
test      | Testing
posttest  | Post-test
```

### Key Points

- ✅ Pre/post scripts **always** run with their main script
- ✅ Pre/post scripts run in **correct dependency order** within the group
- ✅ Groups run **concurrently** with `--parallel`
- ✅ Groups run **sequentially** with `--sequential`
- ✅ Pre/post scripts **cannot** be separated from their main script

## 📊 Comparison Table

| Feature | `--parallel` | `--sequential` |
|---------|-------------|----------------|
| **Start time** | All scripts start immediately | One at a time |
| **Execution** | Concurrent | Sequential |
| **Output** | Interleaved | Sequential |
| **Speed** | Fastest (limited by slowest) | Slowest (sum of all) |
| **Use case** | Independent scripts | Dependent scripts |
| **Error handling** | Fail fast (default) | Fail fast (default) |
| **Pre/post scripts** | Grouped, run concurrently | Grouped, run sequentially |

## 🎯 Best Practices

### Use `--parallel` when:
- ✅ Scripts are independent (no dependencies)
- ✅ Speed is important
- ✅ You want to see all output mixed together
- ✅ Running watch mode for multiple services

### Use `--sequential` when:
- ✅ Scripts have dependencies
- ✅ Order matters
- ✅ You want clean, separated output
- ✅ You need to see one script complete before next starts

### Use `--no-exit-on-error` when:
- ✅ You want to see all failures, not just the first
- ✅ Running tests across multiple packages
- ✅ Debugging multiple issues at once

### Pre/Post Script Tips:
- ✅ Pre/post scripts are automatically grouped (no configuration needed)
- ✅ Use pre/post scripts for setup/cleanup that must run with the main script
- ✅ Pre/post scripts run in correct order automatically

## 🔍 Visual Examples

### Parallel Execution Timeline

```
Script A: |==========|
Script B:   |====|
Script C:     |========|
Time:      0s    1s    2s    3s
```

All scripts start at time 0, run concurrently, finish at different times.

### Sequential Execution Timeline

```
Script A: |==========|
Script B:            |====|
Script C:                 |========|
Time:      0s    1s    2s    3s    4s
```

Scripts run one after another, each starting when the previous finishes.

## 📚 Related Features

- **`--filter`**: Respects dependency order (different from `--parallel`)
- **`--workspaces`**: Runs across all workspace packages
- **`--if-present`**: Skips packages missing the script

## 🚀 Try It Yourself

Run the detailed behavior demo:

```bash
cd parallel-scripts
./detailed-behavior-demo.sh
```

This will demonstrate all the behaviors described above with real examples.
