# Quick Test Guide for guide-cli.ts

This document verifies that `guide-cli.ts` is working properly with the advanced Bun.which patterns.

## Test 1: Entry Guard

```bash
cd /Users/nolarose/PROJECTS
bun guide-cli.ts
```

**Expected:** Shows usage message and exits with code 1

## Test 2: Missing Project Error

```bash
cd /Users/nolarose/PROJECTS
bun guide-cli.ts --project nonexistent --bin bun
```

**Expected:** Error message "Project not found" and exit code 1

## Test 3: Binary Resolution with Diagnostics

```bash
cd /Users/nolarose/PROJECTS
BUN_PLATFORM_HOME=/Users/nolarose/PROJECTS bun guide-cli.ts --project my-bun-app --bin bun --diagnostics
```

**Expected:** Shows searched paths and either "Found:" or "Binary not found"

## Test 4: Successful Resolution (if dependencies installed)

```bash
cd /Users/nolarose/PROJECTS
BUN_PLATFORM_HOME=/Users/nolarose/PROJECTS bun guide-cli.ts --project my-bun-app --bin bun --args --version
```

**Expected:** Bun version output (e.g., "1.3.8")

## Test 5: Entry Guard Verification

```bash
cd /Users/nolarose/PROJECTS
bun -e "import('./guide-cli.ts')"
echo $?
```

**Expected:** Exit code 0 (script exits immediately when imported)

## Notes

- The `my-bun-app` project may not have `node_modules/.bin/bun` (since bun is global)
- For a real test, use a project-local binary like `tsc` or `eslint` after running `bun install`
- The diagnostics mode (`--diagnostics`) shows exactly which directories were searched

## Example with Project-Local Binary

```bash
# First, install dependencies in a project that has TypeScript
cd /Users/nolarose/PROJECTS/my-bun-app
bun add -d typescript

# Then test from root
cd /Users/nolarose/PROJECTS
BUN_PLATFORM_HOME=/Users/nolarose/PROJECTS bun guide-cli.ts --project my-bun-app --bin tsc --args --version
```

This should show the TypeScript compiler version, proving that project-isolated binary resolution works correctly.