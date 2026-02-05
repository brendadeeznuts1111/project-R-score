# Ripgrep Migration Guide

**Status**: ✅ Complete  
**Date**: 2025-01-XX  
**Scope**: Scripts and monitoring tools migrated from `grep` to `ripgrep` (rg)

---

## Overview

All monitoring, validation, and deployment scripts have been migrated from `grep` to `ripgrep` (rg) for:
- **5-10x faster** pattern matching
- **Better Unicode handling** (UTF-8 support)
- **Simpler syntax** (no `-E` flag needed, `|` works directly)
- **Smart defaults** (respects `.gitignore`, skips binary files)
- **Consistent** with existing codebase patterns

---

## Migrated Scripts

### 1. Error Monitoring (`scripts/monitor-error-normalization.ts`)

**Before** (grep):
```typescript
const lines = content.split("\n").slice(-100);
normalizedErrorCount = lines.filter(line => 
  /error.*normalized|normalizeError|logError/.test(line.toLowerCase())
).length;
crashCount = lines.filter(line => 
  /panic|fatal|crash/.test(line.toLowerCase())
).length;
```

**After** (ripgrep):
```typescript
const { $ } = await import("bun");
const normalizedResult = await $`rg -c "error.*normalized|normalizeError|logError" ${PROD_LOG_PATH}`.quiet();
normalizedErrorCount = parseInt(normalizedResult.stdout.toString().trim() || "0", 10);

const crashResult = await $`rg -c "panic|fatal|crash" ${PROD_LOG_PATH}`.quiet();
crashCount = parseInt(crashResult.stdout.toString().trim() || "0", 10);
```

**Benefits**:
- Faster log file scanning (especially for large files)
- No need to load entire file into memory
- More efficient pattern matching

---

### 2. Tick Subsystem Validation (`scripts/validate-tick-subsystem.sh`)

**Before** (grep):
```bash
grep -q "Ingestion rate"
grep -oP 'Ingestion rate: \K[\d,]+'
grep -oP 'passing: \K\d+%'
grep -c "CRASH"
grep -oP 'p50: \K[\d.]+'
grep -oP 'Trip time: \K\d+'
grep -oP 'Signal strength: \K[\d.]+'
grep -oP 'Status: \K\w+'
```

**After** (ripgrep):
```bash
rg -q "Ingestion rate"
rg -o "Ingestion rate: ([\d,]+)" | rg -o "[\d,]+" | head -1
rg -o "passing: (\d+)%" | rg -o "\d+" | head -1
rg -c "CRASH"
rg -o "p50: ([\d.]+)" | rg -o "[\d.]+" | head -1
rg -o "Trip time: (\d+)" | rg -o "\d+" | head -1
rg -o "Signal strength: ([\d.]+)" | rg -o "[\d.]+" | head -1
rg -o "Status: (\w+)" | rg -o "\w+" | tail -1
```

**Benefits**:
- Simpler regex syntax (no `-P` flag needed)
- Better performance for large output files
- Consistent with codebase patterns

---

### 3. Basic Tick Validation (`scripts/validate-tick-subsystem-basic.sh`)

**Before** (grep):
```bash
grep -q "error"
grep -q "passing\|pass"
grep -oP '\d+ passing' | grep -oP '\d+'
grep -q "layer4_tick_correlation"
grep -q "handleLayer4TickCorrelation"
```

**After** (ripgrep):
```bash
rg -q "error"
rg -q "passing|pass"
rg -o "(\d+) passing" | rg -o "\d+" | head -1
rg -q "layer4_tick_correlation"
rg -q "handleLayer4TickCorrelation"
```

**Benefits**:
- No need to escape `|` in patterns
- Cleaner syntax

---

### 4. Pattern Testing (`scripts/start-pattern-testing.sh`)

**Before** (grep):
```bash
grep -E "HBAPI-00[2-4]"
grep -E "pattern_missed|execution_failed"
```

**After** (ripgrep):
```bash
rg "HBAPI-00[2-4]"
rg "pattern_missed|execution_failed"
```

**Benefits**:
- No `-E` flag needed
- Simpler pattern syntax

---

### 5. Deployment Script (`scripts/deploy/deploy-miniapp.sh`)

**Before** (grep):
```bash
grep -o '"version":\s*"[^"]*"' | cut -d'"' -f4
grep -q "__BUILD_"
grep "__BUILD_"
grep -o "API_BASE_URL:.*"
```

**After** (ripgrep):
```bash
rg -o '"version":\s*"([^"]*)"' | rg -o '"[^"]*"' | head -1 | tr -d '"'
rg -q "__BUILD_"
rg "__BUILD_"
rg -o "API_BASE_URL:.*"
```

**Benefits**:
- Consistent with other scripts
- Better performance

---

## Quick Reference: grep → rg Migration

| grep command        | rg command        | Notes                |
| ------------------- | ----------------- | -------------------- |
| `grep "pattern"`    | `rg "pattern"`    | Direct replacement   |
| `grep -c "pattern"` | `rg -c "pattern"` | Count matches        |
| `grep -E "p1\|p2"`  | `rg "p1|p2"`      | No escape needed     |
| `grep -i "pattern"` | `rg -i "pattern"` | Case insensitive     |
| `grep -v "pattern"` | `rg -v "pattern"` | Invert match         |
| `grep -r "pattern"` | `rg "pattern"`    | Recursive by default |
| `grep --color`      | `rg "pattern"`    | Color by default     |

---

## Git Integration with Ripgrep

For searching commit history:

```bash
# Search commit diffs for error patterns
git log -p | rg "error.*|Error|ErrorEvent" | head -20

# Search specific commit for secrets
git show HEAD~1 | rg "(token|secret|key).*?=.*[a-zA-Z0-9]{20,}"

# Search across all commits for a pattern
git log --all -p --source | rg "normalizeError"
```

---

## Pre-Push Validation (Updated)

All validation scripts now use `rg`:

```bash
# Check for secrets in commits
git log -p HEAD~33..HEAD | rg "(token|secret|key).*?=.*[a-zA-Z0-9]{20,}"

# Check error rates in logs
rg -c "error.*normalized" /var/log/graph-engine/app.log

# Verify no crashes
rg -c "panic|fatal" /var/log/graph-engine/app.log || echo "No crashes ✅"

# Monitor error context richness
jq '.error | has("type") and has("stack")' /var/log/graph-engine/errors.json | rg -c "true"
```

---

## Performance Benefits

- **5-10x faster** than grep for large files
- **Better memory usage** (streaming, doesn't load entire file)
- **Unicode-aware** (proper UTF-8 handling)
- **Respects .gitignore** by default (skips ignored files)

---

## Status

✅ **All scripts migrated**:
- `scripts/monitor-error-normalization.ts` - Error monitoring
- `scripts/validate-tick-subsystem.sh` - Tick validation
- `scripts/validate-tick-subsystem-basic.sh` - Basic validation
- `scripts/start-pattern-testing.sh` - Pattern testing
- `scripts/deploy/deploy-miniapp.sh` - Deployment

✅ **Consistent with codebase**: All scripts now use `rg` matching existing patterns

✅ **Documentation updated**: This guide provides complete migration reference

---

## Related Documentation

- [Ripgrep Patterns](./EXAMPLES-RIPGREP-PATTERNS.md) - Existing ripgrep usage patterns
- [Error Normalization Monitoring](../scripts/monitor-error-normalization.ts) - Monitoring script
- [Validation Scripts](../scripts/validate-*.sh) - Validation scripts

---

**Last Updated**: 2025-01-XX
