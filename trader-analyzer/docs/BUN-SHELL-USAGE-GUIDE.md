# Bun.Shell Usage Guide for Project & Repository

**Purpose:** Practical guide for using Bun.Shell (`$`) throughout the codebase

## 📚 Documentation References

### Primary Documentation
- **Complete API Reference:** `src/runtime/bun-native-utils-complete.ts` (examples 7.4.5.1.0 - 7.4.5.1.19)
- **Example File:** `examples/demos/demo-bun-shell-env-redirect-pipe.ts`
- **Integration Guide:** `BUN-SHELL-INTEGRATION.md`
- **Official Docs:** https://bun.com/docs/runtime/shell

### Quick Reference
```typescript
import { $ } from "bun";

// Basic usage
const output = await $`command`.text();

// With environment variables
await $`command`.env({ VAR: "value" });

// With working directory
await $`command`.cwd("/path");

// Error handling
const result = await $`command`.nothrow().quiet();
```

---

## 🔧 Integration Patterns

### 1. Git Operations

**Current Usage:** `src/api/routes.ts`, `src/index.ts`, `src/utils/metrics-native.ts`

```typescript
// Get commit hash
const hash = await $`git rev-parse HEAD`.text();

// Get branch name
const branch = await $`git rev-parse --abbrev-ref HEAD`.text();

// Get remote URL
const remote = await $`git config --get remote.origin.url`.text().catch(() => null);

// Check if repo is clean
const isClean = (await $`git status --porcelain`.text()).trim() === "";
```

**Best Practices:**
- Use `.text()` for string output
- Use `.nothrow()` for optional commands
- Trim whitespace when needed
- Handle errors gracefully

### 2. Log Processing

**Pattern:** `src/utils/logs-native.ts`

```typescript
// Count error lines
const errorCount = await $`grep -i "\\[error\\]" ${logFile} | wc -l`.text();

// Process logs line by line
for await (const line of $`cat ${logFile}`.lines()) {
  if (line.includes("ERROR")) {
    processError(line);
  }
}

// Filter and redirect
const errors = Buffer.alloc(10000);
await $`grep -i error ${logFile} > ${errors}`;
```

### 3. System Diagnostics

**Pattern:** `src/utils/metrics-native.ts`

```typescript
// Get system info
const uptime = await $`uptime`.text();
const diskUsage = await $`df -h`.text();

// Process monitoring
const processes = await $`ps aux | grep ${serviceName} | grep -v grep`.text();

// With environment variables
const envInfo = await $`env | grep ${prefix}`.env({ ...process.env }).text();
```

### 4. File Operations

```typescript
// Count files
const count = await $`find ${dir} -name "*.ts" | wc -l`.text();

// List files with pattern
const files = await $`ls ${pattern}`.text();

// Copy with redirection
await $`cat ${sourceFile} > ${destFile}`;

// Process file content
const content = await $`cat ${filePath}`.text();
```

### 5. Build & Deployment Scripts

**Pattern:** `scripts/` directory

```typescript
// Pre-flight checks
const bunVersion = await $`bun --version`.text();
await $`bun run typecheck`.quiet();
await $`bun test`.quiet();

// Build process
await $`bun build --outdir dist`.env({ NODE_ENV: "production" });

// Deployment
await $`rsync -av dist/ ${deployTarget}`.cwd(projectRoot);
```

---

## 🛠️ Utility Functions

### Create Reusable Shell Utilities

**File:** `src/utils/shell-helpers.ts`

```typescript
import { $ } from "bun";

/**
 * Git utilities using Bun.Shell
 */
export class GitUtils {
  static async getCommitHash(short = false): Promise<string> {
    const flag = short ? "--short" : "";
    return await $`git rev-parse ${flag} HEAD`.text().then(t => t.trim());
  }

  static async getBranch(): Promise<string> {
    return await $`git rev-parse --abbrev-ref HEAD`.text().then(t => t.trim());
  }

  static async isClean(): Promise<boolean> {
    const status = await $`git status --porcelain`.nothrow().text();
    return status.trim() === "";
  }

  static async getRemoteUrl(): Promise<string | null> {
    return await $`git config --get remote.origin.url`
      .nothrow()
      .text()
      .then(t => t.trim())
      .catch(() => null);
  }
}

/**
 * File system utilities
 */
export class FileUtils {
  static async countFiles(pattern: string, dir: string): Promise<number> {
    const count = await $`find ${dir} -name ${pattern} | wc -l`
      .cwd(process.cwd())
      .text();
    return parseInt(count.trim(), 10);
  }

  static async fileExists(path: string): Promise<boolean> {
    const result = await $`test -f ${path}`.nothrow().quiet();
    return result.exitCode === 0;
  }
}

/**
 * Process utilities
 */
export class ProcessUtils {
  static async isRunning(processName: string): Promise<boolean> {
    const result = await $`pgrep -f ${processName}`.nothrow().quiet();
    return result.exitCode === 0;
  }

  static async getProcessInfo(pid: string): Promise<string> {
    return await $`ps -p ${pid} -o pid,comm,etime`.text();
  }
}
```

### Usage Example

```typescript
import { GitUtils, FileUtils } from "./utils/shell-helpers";

// In your code
const hash = await GitUtils.getCommitHash(true);
const tsFiles = await FileUtils.countFiles("*.ts", "./src");
```

---

## 📝 Adding to Existing Code

### Migration Pattern

**Before (using child_process):**
```typescript
import { execSync } from "child_process";
const hash = execSync("git rev-parse HEAD").toString().trim();
```

**After (using Bun.Shell):**
```typescript
import { $ } from "bun";
const hash = await $`git rev-parse HEAD`.text().then(t => t.trim());
```

### Benefits
- ✅ Cross-platform (Windows, macOS, Linux)
- ✅ Better error handling (`.nothrow()`, `.quiet()`)
- ✅ Type-safe with TypeScript
- ✅ No need for `cross-env`, `rimraf`, etc.

---

## 🧪 Testing Patterns

### Unit Tests

```typescript
import { describe, test, expect } from "bun:test";
import { $ } from "bun";

describe("Bun.Shell", () => {
  test("git rev-parse returns hash", async () => {
    const hash = await $`git rev-parse HEAD`.text();
    expect(hash.trim()).toMatch(/^[a-f0-9]{40}$/);
  });

  test("environment variables work", async () => {
    const result = await $`echo $TEST_VAR`.env({ TEST_VAR: "test" }).text();
    expect(result.trim()).toBe("test");
  });

  test("working directory changes", async () => {
    const pwd = await $`pwd`.cwd("/tmp").text();
    expect(pwd.trim()).toBe("/tmp");
  });
});
```

### Integration Tests

```typescript
import { describe, test, expect } from "bun:test";
import { GitUtils } from "./utils/shell-helpers";

describe("GitUtils", () => {
  test("getCommitHash returns valid hash", async () => {
    const hash = await GitUtils.getCommitHash();
    expect(hash).toMatch(/^[a-f0-9]{40}$/);
  });

  test("getBranch returns current branch", async () => {
    const branch = await GitUtils.getBranch();
    expect(branch).toBeTruthy();
  });
});
```

---

## 🚀 CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      
      - name: Run tests
        run: bun test
        
      - name: Type check
        run: bun run typecheck
        
      - name: Build
        run: bun run build
        env:
          NODE_ENV: production
```

### Pre-commit Hooks

**File:** `.husky/pre-commit`

```bash
#!/usr/bin/env bun

import { $ } from "bun";

// Run typecheck
await $`bun run typecheck`.quiet();

// Run linter
await $`bun run lint`.quiet();

// Run tests
await $`bun test`.quiet();
```

---

## 📖 Documentation Examples

### Code Comments

```typescript
/**
 * Gets the current git commit hash
 * 
 * Uses Bun.Shell for cross-platform git command execution.
 * See: src/runtime/bun-native-utils-complete.ts (example 7.4.5.1.0)
 * 
 * @returns Promise resolving to 40-character commit SHA
 */
async function getCommitHash(): Promise<string> {
  return await $`git rev-parse HEAD`.text().then(t => t.trim());
}
```

### README Examples

```markdown
## Git Operations

This project uses Bun.Shell for git operations:

```typescript
import { $ } from "bun";

// Get commit hash
const hash = await $`git rev-parse HEAD`.text();
```

See [Bun.Shell Documentation](./docs/BUN-SHELL-USAGE-GUIDE.md) for more examples.
```

---

## 🔍 Finding Usage Examples

### Search Patterns

```bash
# Find all Bun.Shell usage
rg '\$`' src/

# Find git commands
rg '\$`.*git' src/

# Find with environment variables
rg '\.env\(' src/

# Find with working directory
rg '\.cwd\(' src/
```

### Common Locations

- **Git Operations:** `src/api/routes.ts`, `src/index.ts`
- **Metrics:** `src/utils/metrics-native.ts`
- **Logs:** `src/utils/logs-native.ts`
- **Build Scripts:** `scripts/` directory
- **MCP Tools:** `src/mcp/tools/bun-shell-tools.ts`

---

## ⚠️ Security Best Practices

### ✅ Safe Patterns

```typescript
// ✅ Safe: Bun.Shell escapes automatically
const branch = "main";
await $`git checkout ${branch}`; // Safe

// ✅ Safe: Use .env() for environment variables
await $`command`.env({ VAR: userInput });

// ✅ Safe: Use .cwd() for working directory
await $`command`.cwd(safePath);
```

### ❌ Unsafe Patterns

```typescript
// ❌ UNSAFE: Don't spawn external shell
await $`bash -c "echo ${userInput}"`; // Dangerous!

// ❌ UNSAFE: Don't use malicious flags
const branch = "--upload-pack=echo pwned";
await $`git ls-remote origin ${branch}`; // Dangerous!

// ❌ UNSAFE: Don't bypass Bun's protections
await $`sh -c "${userCommand}"`; // Dangerous!
```

**See:** `src/runtime/bun-native-utils-complete.ts` (examples 7.4.5.1.2, 7.4.5.1.3)

---

## 📚 Reference Links

- **Complete Documentation:** `src/runtime/bun-native-utils-complete.ts`
- **Examples:** `examples/demos/demo-bun-shell-env-redirect-pipe.ts`
- **Integration Guide:** `BUN-SHELL-INTEGRATION.md`
- **Official Docs:** https://bun.com/docs/runtime/shell
- **Environment Variables:** https://bun.com/docs/runtime/shell#environment-variables

---

## 🎯 Quick Start Checklist

- [ ] Import: `import { $ } from "bun"`
- [ ] Use `.text()` for string output
- [ ] Use `.nothrow()` for optional commands
- [ ] Use `.env()` for environment variables
- [ ] Use `.cwd()` for working directory
- [ ] Handle errors appropriately
- [ ] Test cross-platform compatibility
- [ ] Document usage in code comments

---

**Last Updated:** 2025-01-07  
**Maintained By:** See `src/runtime/bun-native-utils-complete.ts` for complete API reference
