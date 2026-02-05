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

# 🔍 Bun.which: Advanced Usage Guide (Bun v1.3.8+)

Complete reference for `Bun.which` – Bun's powerful binary resolution utility with advanced path and environment options.

## 📖 Overview

`Bun.which` resolves executable binaries from the system PATH, with advanced options for custom environments. It's Bun's equivalent to Node's `which` package or shell's `which` command, but with project-aware capabilities.

```typescript
import { which } from "bun";

// Basic usage
const python = which("python"); // "/usr/bin/python" or null if not found

// Advanced usage with custom PATH and cwd
const localBin = which("tsc", {
  cwd: "/path/to/project",
  PATH: "/path/to/project/node_modules/.bin:/usr/local/bin:/usr/bin"
});
```

---

## 🎯 API Reference

### `which(binary: string, options?: WhichOptions): string | null`

Resolves the absolute path to an executable binary.

**Parameters:**
- `binary` (string): The executable name to search for (e.g., `"tsc"`, `"bun"`, `"git"`)
- `options` (optional): Configuration object
  - `cwd?: string`: Current working directory to use for relative PATH resolution (default: `process.cwd()`)
  - `PATH?: string`: Custom PATH environment variable string (default: `process.env.PATH`)

**Returns:**
- `string` - Absolute path to the binary if found
- `null` - If binary not found in any directory in PATH

**Throws:**
- `Error` if `binary` is not a string or options are invalid

---

## 🔧 Options Deep Dive

### cwd

The **current working directory** used as a reference for relative PATH entries. This does **not** change the working directory of the spawned process (that's controlled by `spawn` options).

```typescript
// Resolve relative to specific project
const bin = which("tsc", {
  cwd: "/Users/ashley/PROJECTS/my-bun-app"
});
// If PATH contains "node_modules/.bin", it resolves to:
// "/Users/ashley/PROJECTS/my-bun-app/node_modules/.bin/tsc"
```

**Key insight:** `cwd` allows you to simulate "being in" a different directory just for PATH resolution, without affecting the actual process.

### PATH

A **custom PATH string** that overrides `process.env.PATH`. Use this to prioritize project-specific binaries over global ones.

```typescript
// Prioritize project node_modules/.bin, then fall back to system PATH
const projectBin = which("eslint", {
  cwd: projectHome,
  PATH: `${projectHome}/node_modules/.bin:${process.env.PATH}`
});
```

**Standard PATH format:** Colon-separated (POSIX) or semicolon-separated (Windows) directory list.

---

## 🏆 Real-World Patterns

### Pattern 1: Project-Isolated Binary Resolution

Most common use case: Run project-local binaries without global installation.

```typescript
import { which, spawn } from "bun";

const projectHome = "/Users/ashley/PROJECTS/my-bun-app";

// Prepend project's node_modules/.bin to PATH
const binPath = which("tsc", {
  cwd: projectHome,
  PATH: `${projectHome}/node_modules/.bin:${process.env.PATH}`
});

if (binPath) {
  spawn([binPath, "--noEmit"], { cwd: projectHome });
}
```

**Why this works:**
- `cwd` sets the base for relative PATH entries (like `node_modules/.bin`)
- Custom `PATH` ensures project-local binaries are checked first
- The resolved `binPath` is an absolute path, safe to spawn directly

### Pattern 2: Bun.main-Based Resolution (Dynamic Projects)

When building shared tools that run across multiple projects, derive paths from `Bun.main`.

```typescript
// From cli-resolver.ts
const mainDir = Bun.main.slice(0, Bun.main.lastIndexOf('/'));

const binPath = which("tsc", {
  cwd: mainDir,
  PATH: `${mainDir}/node_modules/.bin:${process.env.PATH || ""}`
});
```

**Benefits:**
- Works from any project without hardcoding paths
- Automatically uses the entry script's project directory
- Perfect for shared utilities in a monorepo

### Pattern 3: Multi-Project Tool (Guide CLI Pattern)

From `guide-cli.ts`: resolve and run binaries in any specified project.

```typescript
const platformHome = process.env.BUN_PLATFORM_HOME || Bun.cwd;
const projectHome = `${platformHome}/${projectName}`;

const binPath = which(binary, {
  cwd: projectHome,
  PATH: `${projectHome}/node_modules/.bin:${process.env.PATH || ""`
});

if (binPath) {
  spawn([binPath, ...args], {
    cwd: projectHome,
    env: { ...process.env, PROJECT_HOME: projectHome }
  });
}
```

**This pattern:**
- Accepts a project name as argument
- Resolves project directory relative to `BUN_PLATFORM_HOME`
- Finds binaries in that project's `node_modules/.bin`
- Spawns with project isolation (cwd and env)

### Pattern 4: Fallback Strategy

Try project-local, then fall back to global if not found.

```typescript
functionresolveBinary(name: string, projectHome: string): string | null {
  // First, try project-local
  const local = which(name, {
    cwd: projectHome,
    PATH: `${projectHome}/node_modules/.bin:${process.env.PATH}`
  });
  if (local) return local;

  // Fall back to system PATH only
  return which(name);
}
```

### Pattern 5: Validation Before Spawn

Ensure binary exists before attempting to spawn.

```typescript
const bin = which("bun", { PATH: customPath });
if (!bin) {
  console.error("bun not found in PATH");
  console.error("Custom PATH:", customPath);
  process.exit(1);
}

spawn([bin, "run", "dev"]);
```

### Pattern 6: Using `$PROJECT_HOME` for Environment-Based PATH

Build custom PATH from environment variables for portable project-specific resolution.

```typescript
// From user feedback example
const customPATH = `${process.env.PROJECT_HOME}/node_modules/.bin:/usr/local/bin:${process.env.PATH}`;
const tscPath = which("tsc", { PATH: customPATH });

if (tscPath) {
  console.log(`Found tsc at: ${tscPath}`); // e.g., "/Users/ashley/PROJECTS/my-bun-app/node_modules/.bin/tsc"
} else {
  console.error("tsc not found in custom PATH!");
}
```

**Why this is advanced:**
- Overrides default PATH for complete separation
- Uses `PROJECT_HOME` env var for portability across environments
- Prioritizes local project binaries over global ones

### Pattern 7: Custom cwd for Directory-Specific Resolution

Resolve binaries relative to a specific directory without changing the process cwd.

```typescript
// From user feedback example
const subDir = "/Users/ashley/PROJECTS/my-bun-app/sub-tool";
const scriptPath = which("./my-script.sh", { cwd: subDir });

if (scriptPath) {
  console.log(`Found relative script at: ${scriptPath}`); // e.g., "/Users/ashley/PROJECTS/my-bun-app/sub-tool/my-script.sh"
}
```

**Why this is advanced:**
- Resolves relative paths (`.`, `..`) from a specified directory
- Does not affect the current working directory of the process
- Useful for nested project structures and sub-tools

### Pattern 8: Combined Options with Explicit Error Handling

Use both `cwd` and `PATH` together with comprehensive error handling.

```typescript
// From user feedback example
const options = {
  PATH: "/custom/bin:/usr/bin",
  cwd: "/tmp",
};
const missingBin = which("non-existent", options); // null

if (!missingBin) {
  console.error("Binary not found—fallback or error!");
}
```

**Key takeaway:** Both options work together seamlessly—`cwd` resolves relative PATH entries, and `PATH` defines the search path.

### Pattern 9: Which + Spawn with Environment-Passed PATH

Resolve binary using custom PATH, then spawn with the same PATH environment.

```typescript
// From user feedback example (expanded)
const customPath = `${process.env.PROJECT_HOME}/node_modules/.bin:${process.env.PATH}`;
const bunPath = which("bun", { PATH: customPath, cwd: process.env.PROJECT_HOME });

if (bunPath) {
  Bun.spawn([bunPath, "--version"], {
    stdio: "inherit",
    env: {
      ...process.env,
      PATH: customPath // Ensure spawned process uses same PATH
    }
  });
}
```

**Why this matters:** The spawned process inherits the modified PATH, ensuring consistency between resolution and execution.

---

## 🔄 Integration with Bun.spawn

`Bun.which` is typically used **before** `Bun.spawn` to resolve the binary path.

### Standard Pattern

```typescript
import { which, spawn } from "bun";

const binPath = which("tsc", {
  cwd: projectHome,
  PATH: `${projectHome}/node_modules/.bin:${process.env.PATH}`
});

if (!binPath) {
  throw new Error("Binary not found");
}

const proc = spawn([binPath, "--noEmit"], {
  cwd: projectHome,
  env: { ...process.env, PROJECT_HOME: projectHome }
});
```

### Why Resolve First?

1. **Error handling:** Clear "binary not found" message vs cryptic spawn ENOENT
2. **Logging:** Show which path was used
3. **Validation:** Check binary exists before starting process
4. **Security:** Avoid shell=True behavior (use absolute path)

### Alternative: Let spawn Resolve (Shell=True)

You can skip `which` and let spawn search PATH internally:

```typescript
spawn(["tsc", "--noEmit"], {
  cwd: projectHome,
  env: { ...process.env, PROJECT_HOME: projectHome }
});
```

**But:** Spawn uses `process.env.PATH` directly, ignoring project-local overrides unless you modify `env.PATH`. The `which` pattern gives you explicit control.

---

## 🌍 Cross-Platform Considerations

### Windows Path Separators

On Windows, PATH is semicolon-separated. `Bun.which` handles this automatically.

```typescript
// Works on both POSIX and Windows:
const binPath = which("python", {
  cwd: projectHome,
  PATH: `${projectHome}\\node_modules\\.bin;${process.env.PATH}`
});
```

**Best practice:** Use template literals with platform detection:

```typescript
const separator = process.platform === "windows" ? ";" : ":";
const path = [
  `${projectHome}/node_modules/.bin`,
  process.env.PATH || ""
].join(separator);
```

### Windows Executable Extensions

Windows requires `.exe`, `.cmd`, `.bat` extensions. `Bun.which` automatically tries these extensions:

```typescript
which("eslint"); // Searches for:
// "eslint" (no extension)
// "eslint.exe"
// "eslint.cmd"
// "eslint.bat"
```

You don't need to specify extensions; `which` handles it.

### Case Sensitivity

POSIX filesystems are case-sensitive; Windows is not. `Bun.which` performs case-sensitive searches on all platforms (matching actual filesystem behavior).

```typescript
// Linux/macOS: case matters
which("TSC"); // null (if only "tsc" exists)
which("tsc"); // "/path/to/tsc"

// Windows: case-insensitive (both work)
which("TSC"); // "C:\\path\\to\\tsc.cmd"
which("tsc"); // "C:\\path\\to\\tsc.cmd"
```

---

## ⚡ Performance Characteristics

### Complexity
- Worst-case: **O(n × m)** where:
  - `n` = number of directories in PATH
  - `m` = average length of binary name + path
- In practice: Very fast (native implementation, lazy stat calls)

### Caching

`Bun.which` does **not** cache results. If you call it repeatedly with same arguments, it re-searches.

**Cache manually for repeated lookups:**

```typescript
const cache = new Map<string, string | null>();

function getCachedBinary(name: string, projectHome: string): string | null {
  const key = `${projectHome}:${name}`;
  if (!cache.has(key)) {
    cache.set(key, which(name, {
      cwd: projectHome,
      PATH: `${projectHome}/node_modules/.bin:${process.env.PATH}`
    }));
  }
  return cache.get(key)!;
}
```

### vs. Shell `which`

`Bun.which` is:
- **Faster**: No subprocess spawn overhead (shell's `which` is an external command)
- **More portable**: Built into Bun runtime
- **More controllable**: No shell-specific behaviors (aliases, functions)
- **Simpler**: Pure function, no side effects

---

## 🔀 Comparison with Alternatives

| Feature | `Bun.which` | Node's `which` package | Shell `which` |
|---------|-------------|------------------------|---------------|
| Platform support | ✅ Bun only | ✅ Cross-platform | ✅ POSIX only |
| Custom PATH | ✅ Yes | ✅ Yes | ❌ Uses $PATH only |
| Custom cwd | ✅ Yes | ✅ Yes | ❌ Uses $PWD |
| No subprocess | ✅ Yes | ✅ Yes | ❌ Spawns external |
| Native performance | ✅ Yes | ❌ JS implementation | ❌ External command |
| Cache control | ❌ No | ✅ Manual | N/A |
| Windows .exe/.bat | ✅ Auto | ✅ Auto | ❌ Not on Windows |

**When to use `Bun.which`:**
- Building Bun-native tooling
- Want performance and simplicity
- Need custom `cwd` and `PATH` options
- Avoiding subprocess overhead

**When to use alternatives:**
- Running in non-Bun environments (use Node's `which` package)
- Need shell builtins/aliases (Bun.which only searches PATH for binaries)

---

## ⚠️ Gotchas & Edge Cases

### 1. Which Returns null, Not Throws

`which("nonexistent")` returns `null`, not an error.

```typescript
const bin = which("not-a-real-binary");
if (bin === null) {
  console.log("Binary not found"); // Handle gracefully
}
```

### 2. PATH Must Be Absolute or Relative to cwd

If PATH contains relative paths, they're resolved relative to the provided `cwd` (or `process.cwd()` if omitted).

```typescript
which("my-script", {
  cwd: "/projects/app",
  PATH: "node_modules/.bin:../shared/bin"
});
// Searches:
// 1. "/projects/app/node_modules/.bin/my-script"
// 2. "/projects/shared/bin/my-script"
```

### 3. Executable Permissions

On POSIX systems, `which` only returns paths to **executable** files (has `x` bit set). Non-executable files are skipped.

```bash
chmod -x script.sh
```

```typescript
which("script.sh"); // null if not executable
```

### 4. Symlinks

`which` returns the **actual binary path**, resolving symlinks:

```bash
ln -s /usr/local/bin/tsc node_modules/.bin/tsc
```

```typescript
which("tsc", { cwd: projectHome });
// Returns: "/usr/local/bin/tsc" (dereferenced)
```

### 5. Multiple Matches

First match wins. `which` searches PATH in order and returns the **first** executable found.

```typescript
which("python", {
  PATH: "/local/python3.11:/usr/bin/python3:/usr/bin/python2"
});
// Returns first match, e.g., "/local/python3.11" if exists
```

---

## 🎓 Advanced Examples

### Example 1: Dynamic PATH Building for Nested Projects

```typescript
function getProjectBinPath(projectHome: string, binary: string): string | null {
  // Build a comprehensive PATH including:
  // 1. Project-local node_modules/.bin
  // 2. Project's parent (monorepo root) node_modules/.bin
  // 3. System PATH
  const separator = process.platform === "windows" ? ";" : ":";
  const monorepoRoot = projectHome.split("/").slice(0, -1).join("/");

  const path = [
    `${projectHome}/node_modules/.bin`,
    `${monorepoRoot}/node_modules/.bin`,
    process.env.PATH || ""
  ].join(separator);

  return which(binary, {
    cwd: projectHome,
    PATH: path
  });
}
```

### Example 2: Binary Discovery with Diagnostics

```typescript
function resolveWithDiagnostics(binary: string, projectHome: string): {
  path: string | null;
  searched: string[];
} {
  const searched: string[] = [];
  const originalPath = process.env.PATH || "";
  const customPath = `${projectHome}/node_modules/.bin:${originalPath}`;

  const pathDirs = customPath.split(process.platform === "windows" ? ";" : ":");

  for (const dir of pathDirs) {
    searched.push(dir);
    const fullPath = `${dir}/${binary}`;
    try {
      const stat = Bun.stat(fullPath);
      if (stat && stat.isFile && (stat.mode & 0o111)) {
        return { path: fullPath, searched };
      }
    } catch {
      // Not found or no permission
    }
  }

  return { path: null, searched };
}
```

### Example 3: Which + Spawn with Resource Limits

```typescript
import { which, spawn } from "bun";

const bin = which("bun", { PATH: customPath });
if (!bin) throw new Error("bun not found");

const proc = spawn([bin, "run", "heavy-task.ts"], {
  cwd: projectHome,
  timeout: 30000, // 30 second timeout
  killSignal: "SIGTERM",
  onExit(proc, code, signal) {
    if (signal === "SIGTERM") {
      console.log("Process timed out");
    }
  }
});

await proc.exited;
```

### Example 4: Concurrent Resolution for Multiple Binaries

```typescript
const binaries = ["tsc", "eslint", "jest"];

const resolutions = await Promise.all(
  binaries.map(async name => {
    const path = which(name, { cwd: projectHome, PATH: customPath });
    return { name, path };
  })
);

// Filter failures
const found = resolutions.filter(r => r.path !== null);
console.log(`Found ${found.length}/${binaries.length} binaries`);
```

---

## 📊 Binary Resolution Algorithm

`Bun.which` uses the following algorithm:

1. **Validate input:** `binary` must be a non-empty string
2. **Get PATH:** Use provided `options.PATH` or `process.env.PATH`
3. **Split PATH:** Split string into directory list using `:` (POSIX) or `;` (Windows)
4. **For each directory:**
   - Construct full path: `dir + "/" + binary`
   - On Windows, also try with extensions: `.exe`, `.cmd`, `.bat`
   - Check if file exists and is executable
   - Return first match
5. **Return null** if no matches found

---

## 🧪 Testing Bun.which

### Test Basic Resolution

```typescript
// test-which.ts
import { which } from "bun";

const node = which("node");
console.log(node); // e.g., "/usr/local/bin/node" or null

if (!node) {
  console.error("node not found in PATH");
  process.exit(1);
}
```

### Test Custom PATH

```typescript
const customPath = "/tmp/fake-bin:/usr/local/bin";
const result = which("nonexistent", { PATH: customPath });
console.log(result); // null

const realBin = which("ls", { PATH: customPath });
console.log(realBin); // "/usr/local/bin/ls" (if exists)
```

### Test Project Isolation

```typescript
import fs from "bun:fs";

// Create a fake project structure
const testDir = "/tmp/test-which-project";
fs.mkdirSync(testDir, { recursive: true });
fs.mkdirSync(`${testDir}/node_modules/.bin`, { recursive: true });

// Create a dummy executable
const fakeBin = `${testDir}/node_modules/.bin/mycli`;
fs.writeFileSync(fakeBin, "#!/usr/bin/env bun\nconsole.log('hello')");
fs.chmodSync(fakeBin, 0o755);

// Resolve
const resolved = which("mycli", {
  cwd: testDir,
  PATH: `${testDir}/node_modules/.bin:${process.env.PATH}`
});

console.log(resolved); // fakeBin
```

---

## 🔗 Related Resources

- **Related Bun APIs:**
  - [`Bun.spawn`](./BUN_SPAWN_GUIDE.md) - Subprocess spawning
  - `Bun.spawnSync` - Synchronous spawn
  - `Bun.PID` - Process ID (for spawned processes)

- **In this Project:**
  - `cli-resolver.ts` - Basic which usage with custom PATH
  - `guide-cli.ts` - Advanced which in multi-project tool
  - `BUN_SPAWN_GUIDE.md` - Spawn integration patterns

- **External:**
  - [Node.js which package 🌐](https://www.npmjs.com/package/which)
  - [POSIX which man page 🌐](https://linux.die.net/man/1/which)

---

## 📋 Quick Reference

| Task | Code |
|------|------|
| Find binary in system PATH | `which("binary")` |
| Find binary in project | `which("bin", { cwd: projectPath, PATH: \`\${projectPath}/node_modules/.bin:\${process.env.PATH}\` })` |
| Check if binary exists | `if (which("binary")) { ... }` |
| Resolve with custom PATH | `which("bin", { PATH: "/custom/path:/usr/bin" })` |
| Resolve relative to entry | `which("bin", { cwd: Bun.mainDir, PATH: \`\${Bun.mainDir}/node_modules/.bin:\${process.env.PATH}\` })` |
| Get all PATH components | `process.env.PATH?.split(process.platform === "windows" ? ";" : ":")` |
| Build project-local PATH | `[\`\${projectHome}/node_modules/.bin\`, process.env.PATH].join(separator)` |

---

## ✅ Best Practices Checklist

- ✅ **Always check return value:** `which()` returns `null`, don't assume found
- ✅ **Use with spawn:** Resolve binary path before spawning for better error handling
- ✅ **Prepend project bin dir:** Use custom PATH to prioritize project-local binaries
- ✅ **Pass cwd:** Set `cwd` option to simulate project directory for relative PATH entries
- ✅ **Platform-aware PATH:** Use `;` on Windows, `:` on POSIX for custom PATH strings
- ✅ **Validate permissions:** On POSIX, ensure executable bit is set
- ✅ **Log resolved path:** Show which binary path was used for debugging
- ✅ **Fall back gracefully:** Handle `null` with clear error message

---

## ❌ Common Pitfalls

1. **Not checking for null**
   ```typescript
   const bin = which("tsc");
   spawn([bin, "--noEmit"]); // Crashes if bin is null
   ```

2. **Using relative PATH without cwd**
   ```typescript
   which("tsc", { PATH: "node_modules/.bin" }); // Resolves relative to process.cwd(), not project
   ```

3. **Forgetting Windows separator**
   ```typescript
   PATH: "${dir1}:${dir2}" // Wrong on Windows - use conditional separator
   ```

4. **Assuming executable exists**
   ```typescript
   // File exists but not executable -> which returns null
   which("script.sh"); // null if missing +x bit
   ```

5. **Not including system PATH fallback**
   ```typescript
   // Only searches project bin, never falls back to global
   which("git", { PATH: "${projectHome}/node_modules/.bin" }); // Bad
   ```

---

**Last Updated:** 2025-02-02  
**Bun Version:** 1.3.8+  
**License:** MIT