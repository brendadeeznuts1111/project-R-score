# 🔧 Remaining Bun-First Issues

This document tracks files that still need to be migrated to Bun-native APIs.

## 📊 Summary

- **Total files with violations**: 30+ in lib/
- **Most common issues**: fs.readFileSync, fs.writeFileSync,
  child_process.spawn, crypto.createHash
- **Priority**: Critical files in core paths first

## 🚨 Critical Priority Files

These files should be fixed first as they're in core paths:

| File                                 | Issues           | Migration               |
| ------------------------------------ | ---------------- | ----------------------- |
| `lib/utils/safe-file-operations.ts`  | fs.\*Sync        | Bun.file / Bun.write    |
| `lib/security/master-token.ts`       | crypto.\*        | Bun.hash / Bun.password |
| `lib/security/secret-lifecycle.ts`   | fs.\*Sync        | Bun.file / Bun.write    |
| `lib/core/core-documentation.ts`     | node:fs examples | Documentation data      |
| `lib/http/port-management-system.ts` | fs.\*            | Bun.file                |

## 🛠️ How to Fix

### 1. Check a file

```bash
bun run lib/guards/bun-first-guard.ts lib/utils/safe-file-operations.ts
```

### 2. Fix the issues

Use patterns from `docs/BUN_MIGRATION_EXAMPLES.ts`:

- `fs.readFileSync(path)` → `await Bun.file(path).text()`
- `fs.writeFileSync(path, data)` → `await Bun.write(path, data)`
- `crypto.createHash('sha256').update(data).digest('hex')` →
  `Buffer.from(await Bun.hash(data, 'sha256')).toString('hex')`
- `child_process.spawn(cmd, args)` → `Bun.spawn([cmd, ...args])`

### 3. Verify the fix

```bash
bun run lib/guards/bun-first-guard.ts lib/utils/safe-file-operations.ts
# Should show: ✅ lib/utils/safe-file-operations.ts - No violations
```

### 4. Run ESLint

```bash
bun run lint
```

## 📋 File Status

### lib/ directory (30 files with violations)

- [ ] lib/core/core-documentation.ts
- [ ] lib/core/core-types.ts
- [ ] lib/core/documentation-url-handler.ts
- [ ] lib/deployment/tier1380-directories-enhanced.ts
- [ ] lib/deployment/tier1380-directories.ts
- [ ] lib/docs/enhanced-markdown.ts
- [ ] lib/docs/reference.ts
- [ ] lib/docs/scraper.ts
- [ ] lib/docs/untracked-files-analyzer.ts
- [ ] lib/docs/url-fixer-optimizer.ts
- [ ] lib/guards/bun-first-guard.ts
- [ ] lib/http/port-management-system.ts
- [ ] lib/performance/optimized-server.ts
- [ ] lib/performance/optimized-spawn-test.ts
- [ ] lib/performance/optimizer.ts
- [ ] lib/registry/docs-sync.ts
- [ ] lib/registry/r2-storage.ts
- [ ] lib/security/enterprise-auth.ts
- [ ] lib/security/master-token.ts
- [ ] lib/security/mcp-server.ts
- [ ] lib/security/secret-lifecycle.ts
- [ ] lib/security/test-integration.ts
- [ ] lib/security/zero-trust-manager.ts
- [ ] lib/utils/ffi-environment.ts
- [ ] lib/utils/input-validation-lib.ts
- [ ] lib/utils/safe-file-operations.ts
- [ ] lib/validation/automated-validation-system.ts
- [ ] lib/validation/bun-first-auditor.ts
- [ ] lib/validation/bun-first-compliance.ts
- [ ] lib/validation/complete-documentation-validator.ts

### tools/ directory

Run: `bun run lib/guards/bun-first-guard.ts tools/**/*.ts`

### Other directories

Run: `bun run lib/guards/bun-first-guard.ts cli/**/*.ts server/**/*.ts`

## 🎯 Quick Commands

```bash
# Check all lib files
bun run lib/guards/bun-first-guard.ts lib/**/*.ts

# Check specific file
bun run lib/guards/bun-first-guard.ts lib/utils/safe-file-operations.ts

# Check with ESLint
bun run lint

# Auto-fix ESLint issues
bun run lint:fix
```

## 📚 Resources

- [Bun File I/O](https://bun.sh/docs/api/file-io)
- [Bun Spawn](https://bun.sh/docs/api/spawn)
- [Bun Hash](https://bun.sh/docs/api/utils#bun-hash)
- [Bun Password](https://bun.sh/docs/api/password)
- [Migration Examples](../BUN_MIGRATION_EXAMPLES.ts)
