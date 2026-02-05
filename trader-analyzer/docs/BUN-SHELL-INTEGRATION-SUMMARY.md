# Bun.Shell Integration Summary

**Quick overview of Bun.Shell usage in the project**

## 📍 Where to Find Documentation

1. **Complete API Reference:** `src/runtime/bun-native-utils-complete.ts`
   - Examples 7.4.5.1.0 through 7.4.5.1.19
   - All features documented with test formulas

2. **Practical Usage Guide:** `docs/BUN-SHELL-USAGE-GUIDE.md`
   - Integration patterns
   - Utility functions
   - Testing examples
   - CI/CD integration

3. **Quick Reference:** `docs/BUN-SHELL-QUICK-REFERENCE.md`
   - One-page cheat sheet
   - Common patterns
   - Security notes

4. **Example File:** `examples/demos/demo-bun-shell-env-redirect-pipe.ts`
   - 26 working examples
   - Run with: `bun examples/demos/demo-bun-shell-env-redirect-pipe.ts`

## 🔍 Current Usage in Codebase

### Git Operations
- `src/api/routes.ts` - Git info endpoint
- `src/index.ts` - Commit hash retrieval
- `src/utils/metrics-native.ts` - Metrics collection
- `src/utils/cpu-profiling-registry.ts` - Profiling

### Pattern to Follow
```typescript
import { $ } from "bun";

// Get commit hash
const hash = await $`git rev-parse HEAD`.text().then(t => t.trim());

// Get branch
const branch = await $`git rev-parse --abbrev-ref HEAD`.text().then(t => t.trim());
```

## 🚀 How to Use

### 1. For New Features

**When adding git operations:**
```typescript
import { $ } from "bun";

// Reference: src/runtime/bun-native-utils-complete.ts (example 7.4.5.1.0)
const hash = await $`git rev-parse HEAD`.text();
```

**When adding file operations:**
```typescript
// Reference: src/runtime/bun-native-utils-complete.ts (example 7.4.5.1.7)
const buffer = Buffer.alloc(100);
await $`echo "data" > ${buffer}`;
```

### 2. For Utility Functions

Create reusable utilities in `src/utils/shell-helpers.ts`:

```typescript
import { $ } from "bun";

export class GitUtils {
  static async getCommitHash(): Promise<string> {
    return await $`git rev-parse HEAD`.text().then(t => t.trim());
  }
}
```

### 3. For Scripts

Use in `scripts/` directory:

```typescript
// scripts/deploy.ts
import { $ } from "bun";

await $`bun run typecheck`.quiet();
await $`bun test`.quiet();
await $`bun build`.env({ NODE_ENV: "production" });
```

## 📚 Documentation Structure

```
docs/
├── BUN-SHELL-USAGE-GUIDE.md          # Complete usage guide
├── BUN-SHELL-QUICK-REFERENCE.md      # Quick reference card
└── BUN-SHELL-INTEGRATION-SUMMARY.md  # This file

src/runtime/
└── bun-native-utils-complete.ts      # Complete API reference

examples/demos/
└── demo-bun-shell-env-redirect-pipe.ts  # Working examples
```

## 🎯 Key Features Available

- ✅ Environment variables (inline, `.env()`, global)
- ✅ Working directory (`.cwd()`, global)
- ✅ Redirection (to/from Buffer, Response, files)
- ✅ Piping commands
- ✅ Command substitution (`$(...)`)
- ✅ Output reading (`.text()`, `.json()`, `.lines()`, `.blob()`)
- ✅ Error handling (`.nothrow()`, `.quiet()`)

## 🔗 Links

- **Usage Guide:** `docs/BUN-SHELL-USAGE-GUIDE.md`
- **Quick Reference:** `docs/BUN-SHELL-QUICK-REFERENCE.md`
- **API Reference:** `src/runtime/bun-native-utils-complete.ts`
- **Examples:** `examples/demos/demo-bun-shell-env-redirect-pipe.ts`
- **Official Docs:** https://bun.com/docs/runtime/shell

---

**Last Updated:** 2025-01-07
