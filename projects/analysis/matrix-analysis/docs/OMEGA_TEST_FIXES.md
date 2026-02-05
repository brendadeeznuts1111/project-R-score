# OMEGA Test Failures - Analysis & Solutions

## 🚨 Issue Summary

120 out of 547 tests are failing due to missing OMEGA binaries and incorrect working directory paths.

## 🔍 Root Cause Analysis

### 1. **Working Directory Issue**

- Tests run from repo root (`/Users/nolarose`)
- But OMEGA config files are in `.claude/config/`
- And binaries are in `.claude/bin/`

### 2. **Missing Path Resolution**

- Tests expect `./bin/omega` but it's actually at `./.claude/bin/omega`
- Tests expect `./config/acp-tier1380-omega.json` but it's at `./.claude/config/acp-tier1380-omega.json`

### 3. **Missing Scripts**

- Tests expect scripts in `./scripts/` but they're in `./.claude/scripts/`

## 🛠️ Quick Fixes

### Option 1: Update Test Paths (Recommended)

Update the failing tests to use correct paths:

```typescript
// In .claude/tests/omega/pipeline.test.ts
test("CLI help works", async () => {
  const proc = Bun.spawn(["./.claude/bin/omega", "help"], { stdout: "pipe" });
  const out = await new Response(proc.stdout).text();
  expect(out).toContain("Tier-1380 OMEGA");
});
```

And update the config path in `.claude/config/pipeline.ts`:

```typescript
export async function getVersion(kv?: KVNamespace): Promise<Version | null> {
  if (!kv) {
    try {
      // Use absolute path or resolve from current file
      const configFile = new URL("../config/acp-tier1380-omega.json", import.meta.url);
      const file = await Bun.file(configFile).json();
      return parseVersion(file.version);
    } catch {
      return null;
    }
  }
  // ... rest of function
}
```

### Option 2: Symlink Solution (Quick)

Create symlinks from repo root:

```bash
# In repo root
ln -sf .claude/bin/omega ./bin/omega
ln -sf .claude/bin/kimi-shell ./bin/kimi-shell
ln -sf .claude/config ./config
ln -sf .claude/scripts ./scripts
```

### Option 3: Test Runner Script

Create a test wrapper that sets up the correct environment:

```bash
#!/bin/bash
# test-omega.sh
cd .claude
bun test tests/omega/pipeline.test.ts
cd ..
```

## 📊 Failing Test Categories

1. **OMEGA Pipeline** (1 test)
   - `getVersion returns version` - Working directory issue

2. **OMEGA CLI** (1 test)
   - `CLI help works` - Binary path issue

3. **OMEGA Integration** (15+ tests)
   - Binary existence checks
   - Script existence checks
   - Config file checks
   - Version registry checks

## 🎯 Immediate Action Plan

1. **Fix the working directory issue** in `pipeline.ts`
2. **Update binary paths** in test files
3. **Run tests from correct directory** or use absolute paths
4. **Consider moving OMEGA tests** to a separate test suite that runs from `.claude/`

## 💡 Long-term Solution

1. **Create a proper build process** that copies necessary files to expected locations
2. **Use environment variables** for path configuration
3. **Separate OMEGA-specific tests** from the main test suite
4. **Add test setup/teardown** that handles path resolution

## 🔧 Sample Fix Implementation

Here's a minimal fix for the getVersion issue:

```typescript
// .claude/config/pipeline.ts
export async function getVersion(kv?: KVNamespace): Promise<Version | null> {
  if (!kv) {
    try {
      // Try multiple possible locations
      const possiblePaths = [
        "./config/acp-tier1380-omega.json",
        "../config/acp-tier1380-omega.json",
        new URL("../config/acp-tier1380-omega.json", import.meta.url).pathname,
      ];

      for (const path of possiblePaths) {
        try {
          const file = await Bun.file(path).json();
          return parseVersion(file.version);
        } catch {}
      }

      return null;
    } catch {
      return null;
    }
  }
  // ... rest
}
```

This would make the test more resilient to different working directories.
