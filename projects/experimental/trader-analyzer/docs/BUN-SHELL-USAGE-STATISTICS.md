# Bun.Shell Usage Statistics

**Date:** 2025-01-07  
**Total Files Using Bun.Shell ($):** 26 files

---

## 📊 Breakdown by Directory

### Source Files (`src/`): 12 files
1. `src/runtime/bun-native-utils-complete.ts` - Documentation
2. `src/api/routes.ts` - Git info endpoint
3. `src/index.ts` - Git commit/branch retrieval
4. `src/cli/management.ts` - Service status checking
5. `src/utils/cpu-profiling-registry.ts` - Git hash for profiling
6. `src/mcp/tools/bun-shell-tools.ts` - MCP shell tools
7. `src/api/git-info-constants.ts` - Git constants
8. `src/mcp/tools/docs-integration.ts` - Documentation tools
9. `src/mcp/tools/bun-tooling.ts` - Bun tooling utilities
10. `src/utils/logs-native.ts` - Log processing
11. `src/utils/metrics-native.ts` - Metrics collection
12. `src/utils/ranking-native.ts` - Ranking utilities

### Script Files (`scripts/`): 12 files
1. `scripts/bun-shell-examples.ts` - Examples and demos
2. `scripts/cpu-profiling-test.ts` - CPU profiling tests
3. `scripts/deploy-prod.ts` - Production deployment
4. `scripts/deploy-worker.ts` - Worker deployment
5. `scripts/evolve.ts` - Pattern evolution
6. `scripts/shell-utils.ts` - Shell utility functions
7. `scripts/test-buffer-format.ts` - Buffer format tests
8. `scripts/test-buffer-output.ts` - Buffer output tests
9. `scripts/test-bun-shell-advanced.ts` - Advanced shell tests
10. `scripts/test-bun-shell.ts` - Basic shell tests
11. `scripts/test-error-handling.ts` - Error handling tests
12. `scripts/verify-examples-ripgrep.ts` - Verification scripts

### Example Files (`examples/`): 1 file
1. `examples/demos/demo-bun-shell-env-redirect-pipe.ts` - Demo examples

### Test Files (`test/`): 1 file
1. `test/bun-1.3.3-dependency-tests.ts` - Dependency tests

---

## 📈 Usage Categories

### Git Operations: 5 files
- `src/api/routes.ts`
- `src/index.ts`
- `src/utils/metrics-native.ts`
- `src/utils/cpu-profiling-registry.ts`
- `src/api/git-info-constants.ts`

### Process Management: 2 files
- `src/cli/management.ts`
- `src/utils/logs-native.ts`

### MCP Tools: 3 files
- `src/mcp/tools/bun-shell-tools.ts`
- `src/mcp/tools/bun-tooling.ts`
- `src/mcp/tools/docs-integration.ts`

### Utilities: 3 files
- `src/utils/logs-native.ts`
- `src/utils/metrics-native.ts`
- `src/utils/ranking-native.ts`

### Scripts & Tests: 13 files
- All files in `scripts/` directory
- Test files

### Documentation: 1 file
- `src/runtime/bun-native-utils-complete.ts`

---

## 🔍 Usage Patterns

### Most Common Commands
1. **Git commands** (~15 instances)
   - `git rev-parse HEAD`
   - `git rev-parse --abbrev-ref HEAD`
   - `git config --get remote.origin.url`
   - `git status --porcelain`

2. **Process commands** (~5 instances)
   - `ps aux | grep`
   - `pgrep`

3. **File operations** (~3 instances)
   - `tail`
   - `grep`
   - `wc`

4. **Build/deploy commands** (~10 instances)
   - `bun run typecheck`
   - `bun test`
   - `bun build`

### Methods Used
- `.text()` - ~40 instances
- `.quiet()` - ~10 instances
- `.nothrow()` - ~5 instances
- `.env()` - ~3 instances
- `.cwd()` - ~2 instances
- `.json()` - ~1 instance
- `.lines()` - ~0 instances (not used yet)

---

## 📝 Complete File List

```
./examples/demos/demo-bun-shell-env-redirect-pipe.ts
./scripts/bun-shell-examples.ts
./scripts/cpu-profiling-test.ts
./scripts/deploy-prod.ts
./scripts/deploy-worker.ts
./scripts/evolve.ts
./scripts/shell-utils.ts
./scripts/test-buffer-format.ts
./scripts/test-buffer-output.ts
./scripts/test-bun-shell-advanced.ts
./scripts/test-bun-shell.ts
./scripts/test-error-handling.ts
./scripts/verify-examples-ripgrep.ts
./src/api/git-info-constants.ts
./src/api/routes.ts
./src/cli/management.ts
./src/index.ts
./src/mcp/tools/bun-shell-tools.ts
./src/mcp/tools/bun-tooling.ts
./src/mcp/tools/docs-integration.ts
./src/runtime/bun-native-utils-complete.ts
./src/utils/cpu-profiling-registry.ts
./src/utils/logs-native.ts
./src/utils/metrics-native.ts
./src/utils/ranking-native.ts
./test/bun-1.3.3-dependency-tests.ts
```

---

## 🎯 Summary

- **Total:** 26 files
- **Source code:** 12 files (46%)
- **Scripts:** 12 files (46%)
- **Examples:** 1 file (4%)
- **Tests:** 1 file (4%)

**Primary Use Cases:**
1. Git operations (commit hash, branch, remote URL)
2. Process management (checking service status)
3. Log processing (filtering, streaming)
4. Build/deployment scripts
5. MCP tools (shell command execution)

---

**Last Updated:** 2025-01-07  
**Command Used:** `find . -type f -name "*.ts" -exec grep -l '\$`' {} \;`
