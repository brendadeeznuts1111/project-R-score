# Real-World Examples: `bun run --parallel` and `--sequential`

Practical examples of how to use the new script orchestration features in real projects.

## 🏗️ Monorepo Build Pipeline

### Scenario: Building multiple packages with dependencies

```bash
# Build all packages in parallel (faster, but may fail if dependencies aren't met)
bun run --parallel --filter '*' build

# Build sequentially to respect dependency order
bun run --sequential --workspaces build

# Build with error tolerance (useful for CI)
bun run --parallel --no-exit-on-error --filter '*' build
```

### Example `package.json` (root)

```json
{
  "name": "monorepo",
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "bun run --parallel --filter '*' build",
    "build:sequential": "bun run --sequential --workspaces build",
    "test": "bun run --parallel --filter '*' test",
    "lint": "bun run --parallel --filter '*' lint",
    "ci": "bun run --parallel --filter '*' build lint test"
  }
}
```

## 🎨 Frontend Development Workflow

### Scenario: Running dev server, watchers, and type checking concurrently

```json
{
  "scripts": {
    "dev": "bun run --parallel server watch:css watch:ts",
    "server": "bun --hot server.ts",
    "watch:css": "bun build --watch styles.css",
    "watch:ts": "bun build --watch app.ts",
    "predev": "echo 'Starting development environment...'",
    "postdev": "echo 'Development server stopped'"
  }
}
```

```bash
# Start everything at once
bun run dev

# Output:
# server    | Starting development environment...
# server    | Server running on http://localhost:3000
# watch:css | Watching styles.css...
# watch:ts  | Watching app.ts...
```

## 🧪 Testing Multiple Test Suites

### Scenario: Running unit tests, integration tests, and E2E tests

```json
{
  "scripts": {
    "test": "bun run --parallel test:unit test:integration test:e2e",
    "test:unit": "bun test tests/unit",
    "test:integration": "bun test tests/integration",
    "test:e2e": "bun test tests/e2e",
    "test:all": "bun run --parallel --no-exit-on-error test:unit test:integration test:e2e"
  }
}
```

```bash
# Run all test suites concurrently
bun run test

# Run with error tolerance (see all failures)
bun run test:all
```

## 📦 Multi-Stage Build Process

### Scenario: Building assets, compiling code, and generating docs

```json
{
  "scripts": {
    "build": "bun run --parallel build:assets build:code build:docs",
    "build:assets": "bun build --outdir dist/assets public/**/*",
    "build:code": "bun build --outdir dist src/index.ts",
    "build:docs": "bun run generate-docs",
    "build:all": "bun run --sequential prebuild build postbuild",
    "prebuild": "echo 'Preparing build...'",
    "postbuild": "echo 'Build complete!'"
  }
}
```

**Note:** Pre/post scripts are automatically grouped, so `build:all` will run:
1. `prebuild` → `build` → `postbuild` as a group
2. The `build` script internally runs `build:assets`, `build:code`, `build:docs` in parallel

## 🔄 Watch Mode for Multiple Services

### Scenario: Running multiple watch processes for a microservices setup

```json
{
  "scripts": {
    "watch": "bun run --parallel watch:api watch:worker watch:frontend",
    "watch:api": "bun --hot api/server.ts",
    "watch:worker": "bun --hot worker/index.ts",
    "watch:frontend": "bun --hot frontend/index.ts"
  }
}
```

```bash
# Start all services in watch mode
bun run watch

# Output:
# watch:api     | API server starting...
# watch:worker  | Worker starting...
# watch:frontend | Frontend dev server starting...
```

## 🚀 CI/CD Pipeline

### Scenario: Running checks before deployment

```json
{
  "scripts": {
    "ci": "bun run --parallel lint typecheck test build",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "bun test",
    "build": "bun build --outdir dist src/index.ts",
    "ci:workspaces": "bun run --parallel --filter '*' lint test build"
  }
}
```

```bash
# Run all CI checks in parallel (faster feedback)
bun run ci

# Run CI checks across all workspace packages
bun run ci:workspaces
```

## 🎯 Conditional Script Execution

### Scenario: Running scripts only if they exist

```bash
# Skip packages that don't have the script
bun run --parallel --workspaces --if-present build

# Useful for monorepos where not all packages have the same scripts
bun run --parallel --workspaces --if-present test:coverage
```

## 🔍 Debugging Script Execution

### Scenario: Understanding what's running

```bash
# See which scripts are running with prefixed output
bun run --parallel build test lint

# Output clearly shows which script produced each line:
# build | Building...
# test  | Running tests...
# lint  | Checking files...
# build | Build complete
# test  | Tests passed
# lint  | Lint complete
```

## 💡 Best Practices

### ✅ Do

- Use `--parallel` for independent scripts (build, lint, test)
- Use `--sequential` when order matters (build → test → deploy)
- Use `--no-exit-on-error` in CI to see all failures
- Use `--if-present` in monorepos with varying scripts
- Use glob patterns for related scripts (`"build:*"`)

### ❌ Don't

- Use `--parallel` for scripts with dependencies (use `--filter` instead)
- Use `--parallel` for scripts that modify shared state
- Forget that pre/post scripts are automatically grouped

## 🎨 Output Formatting Tips

The prefixed output makes it easy to filter logs:

```bash
# Filter output by script name
bun run --parallel build test | grep "^build"

# Filter by workspace package
bun run --parallel --filter '*' build | grep "^app:"
```

## 📚 Related Features

- `bun --filter`: Respects dependency order (use for builds with dependencies)
- `bun run`: Standard script execution
- Workspace support: Full integration with Bun workspaces
