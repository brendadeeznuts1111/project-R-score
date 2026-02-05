<!-- Prefetch Optimizations -->
  <link rel="preconnect" href="https://bun.sh">
  <link rel="dns-prefetch" href="https://bun.sh">
  <link rel="preload" href="https://bun.sh/logo.svg" importance="high" crossorigin="anonymous">
  <link rel="preconnect" href="https://example.com">
  <link rel="dns-prefetch" href="https://example.com">
  <link rel="preconnect" href="https://cdn.jsdelivr.net">
  <link rel="dns-prefetch" href="https://cdn.jsdelivr.net">
  <link rel="preconnect" href="https://github.com">
  <link rel="dns-prefetch" href="https://github.com">
  <link rel="preconnect" href="https://developer.mozilla.org">
  <link rel="dns-prefetch" href="https://developer.mozilla.org">
<!-- End Prefetch Optimizations -->

# 🎯 Bun.main Comprehensive Guide

Complete reference for using `Bun.main` in Bun runtime applications.

## 📖 Overview

`Bun.main` is a runtime global that contains the **absolute path** to the currently executing entrypoint script. It's Bun's answer to Node.js's `require.main` but with important differences that make it more reliable and predictable.

```typescript
console.log(Bun.main);
// Example output: "/path/to/projects/my-bun-app/index.ts"
// Actual path depends on where you run the script from
```

---

## 🔍 Official Definition

From the [Bun documentation 🌐](https://bun.sh/docs/runtime/utils#bun-main):

> `Bun.main` contains the absolute path to the main entrypoint script that was executed. This is always defined when running a file directly with `bun <file>`.

Key points from official docs:
- Always an **absolute path**
- Points to the **original entrypoint**, not any imported modules
- Only set when running a script directly (not in REPL or eval)
- Read-only string property

---

## 🆚 Bun.main vs require.main (Node.js Comparison)

| Feature | Bun (`Bun.main`) | Node.js (`require.main`) |
|---------|------------------|--------------------------|
| **Type** | `string` (absolute path) | `Module` object |
| **Entry detection** | `import.meta.path === Bun.main` | `require.main === module` |
| **Reliability** | ✅ Always absolute path | ⚠️ Can be relative or undefined |
| **ESM support** | ✅ Native in ESM & CJS | ⚠️ Limited in ESM |
| **Simplicity** | ✅ Path comparison works | ❌ Requires module object comparison |
| **In REPL** | `undefined` | `undefined` |

### Why `import.meta.path === Bun.main` is Superior

**Node.js pattern:**
```javascript
// Node.js - requires module object access
if (require.main === module) {
  // direct execution
}
```

**Bun pattern:**
```typescript
// Bun - simple string comparison
if (import.meta.path === Bun.main) {
  // direct execution
}
```

Benefits:
- Works in both ESM and CJS without special handling
- No need to access `module` object
- String comparison is faster and more predictable
- Absolute path prevents ambiguity

---

## 🛡️ Entry Guard Pattern

Prevent shared scripts from being imported accidentally.

### Basic Guard

```typescript
// shared/cli-tool.ts
if (import.meta.path !== Bun.main) {
  process.exit(0);
}

// Rest of CLI code...
```

### Reusable Utility (Recommended)

```typescript
// shared/entry-guard.ts
export function ensureDirectExecution(): void {
  if (import.meta.path !== Bun.main) {
    process.exit(0);
  }
}

export function isDirectExecution(): boolean {
  return import.meta.path === Bun.main;
}
```

**Usage:**
```typescript
import { ensureDirectExecution } from "./shared/entry-guard.ts";
ensureDirectExecution(); // Place at very top

// Rest of your CLI code...
```

---

## 🎯 Common Use Cases

### 1. **CLI Tools That Should Only Run Directly**

Shared utilities that provide command-line interfaces should exit if imported:

```typescript
#!/usr/bin/env bun
import { ensureDirectExecution } from "./shared/entry-guard.ts";
ensureDirectExecution();

// CLI implementation...
```

### 2. **Project-Specific Path Resolution**

Derive project root from entrypoint location:

```typescript
// Get directory containing the entry script
const entryDir = Bun.main.slice(0, Bun.main.lastIndexOf('/'));

// Resolve project-local binaries
import { which } from "bun";
const tsc = which("tsc", {
  cwd: entryDir,
  PATH: `${entryDir}/node_modules/.bin:${process.env.PATH}`
});
```

### 3. **Isolated Output Files**

Generate unique filenames based on entrypoint to avoid collisions:

```typescript
const timestamp = Date.now();
const entryName = Bun.main.split('/').pop()?.replace('.ts', '');
const outputPath = `/tmp/${entryName}-${timestamp}.json`;

await Bun.write(outputPath, data);
```

### 4. **Context-Aware Logging**

Tag all logs with project identifier:

```typescript
function log(message: string) {
  const project = Bun.main.split('/').pop();
  console.log(`[${project}] ${message}`);
}
```

### 5. **Environment Variable Derivation**

Automatically set environment based on entrypoint:

```typescript
process.env.PROJECT_HOME = Bun.main.slice(0, Bun.main.lastIndexOf('/'));
process.env.ENTRY_SCRIPT = Bun.main;
```

---

## 📝 Real Examples from Project Matrix

### Overseer CLI (`tools/overseer-cli.ts`)

```typescript
#!/usr/bin/env bun
import { ensureDirectExecution } from "../shared/tools/entry-guard.ts";
ensureDirectExecution();

console.log(`Overseer running from: ${Bun.main}`);
// Runs only when executed directly, not imported
```

**What it does:**
- Entry guard prevents accidental import
- Logs `Bun.main` for debugging
- Manages multiple isolated projects

### CLI Resolver (`cli-resolver.ts`)

```typescript
const mainDir = Bun.main.slice(0, Bun.main.lastIndexOf('/'));

const tscPath = which("tsc", {
  cwd: mainDir,
  PATH: `${mainDir}/node_modules/.bin:${process.env.PATH}`
});
```

**What it does:**
- Derives project directory from `Bun.main`
- Resolves `tsc` from project's local `node_modules`
- Runs type-check with project isolation

---

## ⚠️ Edge Cases & Gotchas

### 1. **Bun.main is undefined in:**
- REPL mode (`bun` with no arguments)
- `bun eval` (evaluating code strings)
- `bun --bun` (when loading packages)
- Worker threads (different context)

**Check safely:**
```typescript
if (typeof Bun !== "undefined" && Bun.main) {
  console.log(`Running from: ${Bun.main}`);
}
```

### 2. **Symlinks Resolve to Real Path**

`Bun.main` always returns the **real** (dereferenced) path:

```bash
ln -s /actual/path/script.ts link.ts
bun link.ts
console.log(Bun.main); // "/actual/path/script.ts", not ".../link.ts"
```

### 3. **Windows Path Separators**

On Windows, `Bun.main` uses forward slashes (POSIX-style):

```typescript
// Windows: "C:\projects\app\index.ts"
console.log(Bun.main); // "C:/projects/app/index.ts"
```

Use `path` methods or regex that handle both:

```typescript
import { resolve } from "bun";
const dir = resolve(Bun.main).split(path.win32).slice(0, -1).join(path.posix);
```

### 4. **Bun.main Changes with Different Invocations**

Same script, different entry points:

```bash
bun ./local/path/script.ts
# Bun.main = "/absolute/path/to/local/path/script.ts"

bun ../relative/script.ts
# Bun.main = "/absolute/path/to/relative/script.ts"
```

Always use absolute paths for consistency.

---

## 🏆 Best Practices

### ✅ DO:

1. **Use `import.meta.path === Bun.main` for guards**
   ```typescript
   if (import.meta.path !== Bun.main) process.exit(0);
   ```

2. **Derive paths from Bun.main, not process.cwd()**
   ```typescript
   const projectRoot = Bun.main.slice(0, Bun.main.lastIndexOf('/'));
   ```

3. **Log Bun.main in debugging**
   ```typescript
   console.log(`[DEBUG] Entry: ${Bun.main}`);
   ```

4. **Check existence before using**
   ```typescript
   if (!Bun.main) {
     console.error("Not running as entrypoint");
     process.exit(1);
   }
   ```

5. **Use URL pattern for robust path manipulation**
   ```typescript
   const entryUrl = new URL(`file://${Bun.main}`);
   const entryDir = entryUrl.pathname.slice(0, entryUrl.pathname.lastIndexOf('/'));
   ```

### ❌ DON'T:

1. **Don't assume Bun.main is always defined**
   ```typescript
   // Wrong - will crash in REPL
   const dir = Bun.main.split('/');
   ```

2. **Don't use relative path comparisons**
   ```typescript
   // Wrong - too fragile
   if (__filename.endsWith('script.ts')) ...
   ```

3. **Don't mutate Bun.main** (it's read-only anyway)

4. **Don't rely on string.slice for paths**
   ```typescript
   // Wrong - platform-dependent
   const dir = Bun.main.substring(0, Bun.main.lastIndexOf('\\'));
   ```

   Use URL API instead:
   ```typescript
   const dir = new URL(`file://${Bun.main}`).pathname.slice(0, -path.basename(Bun.main).length);
   ```

---

## 🔧 Helper Functions

### Get Entry Directory

```typescript
export function getEntryDirectory(): string {
  return Bun.main.slice(0, Bun.main.lastIndexOf('/'));
}

// Or using URL API (more robust):
export function getEntryDirectory(): string {
  const url = new URL(`file://${Bun.main}`);
  return url.pathname.slice(0, url.pathname.lastIndexOf('/'));
}
```

### Get Project Name

```typescript
export function getProjectName(): string {
  return Bun.main.split('/').pop()?.replace(/\.[tj]s$/, '') || 'unknown';
}
```

### Check if Running as Entrypoint

```typescript
export function isEntrypoint(): boolean {
  return import.meta.path === Bun.main;
}
```

---

## 🧪 Testing Entry Guards

### Test that guard works when imported:

```typescript
// test-import.ts
import "./tools/overseer-cli.ts"; // Should exit immediately (code 0)
console.log("This should never print");
```

Run test:
```bash
bun test-import.ts
# Should exit silently with code 0
echo $? # should print 0
```

### Test that guard allows direct execution:

```bash
bun tools/overseer-cli.ts
# Should show project list normally
```

---

## 📊 Performance Notes

- `import.meta.path` comparison: **O(1)** string equality check
- `Bun.main` access: **O(1)** property lookup
- No significant performance impact
- Early exit pattern reduces memory footprint when imported

---

## 🔗 Related Resources

- [Official Bun Docs: Bun.main 🌐](https://bun.sh/docs/runtime/utils#bun-main)
- [Bun Runtime Utilities 🌐](https://bun.sh/docs/runtime)
- [Import Meta in Bun 🌐](https://bun.sh/docs/import)
- Node.js: [require.main 🌐](https://nodejs.org/api/modules.html#requiremain)

---

## 📋 Quick Reference

| Task | Code |
|------|------|
| Check direct execution | `if (import.meta.path === Bun.main)` |
| Exit if imported | `if (import.meta.path !== Bun.main) process.exit(0)` |
| Get entry directory | `Bun.main.slice(0, Bun.main.lastIndexOf('/'))` |
| Get filename only | `Bun.main.split('/').pop()` |
| Get entry name | `Bun.main.split('/').pop()?.replace(/\.[tj]s$/, '')` |
| Safe check | `if (typeof Bun !== 'undefined' && Bun.main)` |
| URL-based dir | `new URL(\`file://${Bun.main}\`).pathname.slice(0, -path.basename(Bun.main).length)` |

---

## 🤝 Contributing

This guide is part of the Project Matrix. For examples and patterns, see:
- `tools/overseer-cli.ts` - Monorepo manager
- `cli-resolver.ts` - Project-specific binary resolution
- `shared/tools/entry-guard.ts` - Reusable guard utilities

---

**Last Updated:** 2025-02-02  
**Bun Version:** 1.2.0+  
**License:** MIT
