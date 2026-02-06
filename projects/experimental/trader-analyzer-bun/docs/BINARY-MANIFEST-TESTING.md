# Binary Manifest Testing Guide

**Date:** 2025-01-07  
**Version:** 8.2.6.6.0.0.0.0  
**Status:** ✅ Complete

---

## Overview

Comprehensive test suite for binary manifest functionality using **snapshot testing** and **seed-based deterministic testing** for reproducible results.

---

## Test File

**Location:** `test/binary-manifest.test.ts`

**Test Coverage:**
- 23 tests covering all binary manifest functionality
- 12 snapshot tests for deterministic verification
- Seed-based testing for reproducible results
- Performance benchmarks included

---

## Running Tests

### Basic Test Run

```bash
# Run all binary manifest tests
bun test test/binary-manifest.test.ts

# Expected: 23 pass, 0 fail, 12 snapshots
```

### With Custom Seed

```bash
# Use custom seed for deterministic test data
TEST_SEED=12345 bun test test/binary-manifest.test.ts

# Or use Bun's --seed flag
bun test --seed 99999 test/binary-manifest.test.ts
```

**Note:** Snapshots are based on default seed (42). Using different seeds will produce different results but tests will still pass (non-snapshot tests).

### Update Snapshots

```bash
# Update snapshots after code changes
bun test test/binary-manifest.test.ts --update-snapshots

# Expected: Snapshots updated, all tests pass
```

### CI Mode

```bash
# Stricter CI mode (fails on snapshot mismatches)
CI=true bun test test/binary-manifest.test.ts
```

---

## Test Categories

### 1. ManifestDigest Tests (8.2.6.6.1.0.0.0)

**Tests:**
- `8.2.6.6.1.1.0` - Deterministic SHA-256 hash
- `8.2.6.6.1.2.0` - Hash snapshot with seed
- `8.2.6.6.1.3.0` - Deterministic checksum
- `8.2.6.6.1.4.0` - Checksum snapshot with seed
- `8.2.6.6.1.5.0` - Structural hash ignores timestamp
- `8.2.6.6.1.6.0` - Version stamp snapshot

**Snapshots:**
- Hash values (deterministic with seed 42)
- Checksum values (deterministic with seed 42)
- Version stamp structure (timestamp normalized)

### 2. BinaryManifestCodec Tests (8.2.6.6.2.0.0.0)

**Tests:**
- `8.2.6.6.2.1.0` - Valid binary format
- `8.2.6.6.2.2.0` - Binary snapshot with seed
- `8.2.6.6.2.3.0` - Round-trip preservation
- `8.2.6.6.2.4.0` - Decoded manifest snapshot
- `8.2.6.6.2.5.0` - Error handling (invalid magic)
- `8.2.6.6.2.6.0` - Diff identifies identical
- `8.2.6.6.2.7.0` - Diff identifies different
- `8.2.6.6.2.8.0` - Compression ratio snapshot

**Snapshots:**
- Binary header (first 32 bytes)
- Decoded manifest structure
- Compression ratio metrics

### 3. Integration Tests with Seed (8.2.6.6.3.0.0.0)

**Tests:**
- `8.2.6.6.3.1.0` - End-to-end with seed
- `8.2.6.6.3.2.0` - Multiple seeds produce different results
- `8.2.6.6.3.3.0` - Version stamp with seed

**Snapshots:**
- End-to-end results (seed 42)
- Multiple seed comparison
- Version stamp structure

### 4. Performance and Edge Cases (8.2.6.6.4.0.0.0)

**Tests:**
- `8.2.6.6.4.1.0` - Empty manifest handling
- `8.2.6.6.4.2.0` - Large manifest (1000 items)
- `8.2.6.6.4.3.0` - Unicode content handling
- `8.2.6.6.4.4.0` - Checksum performance snapshot

**Snapshots:**
- Performance categories (normalized)

### 5. Snapshot Regression Tests (8.2.6.6.5.0.0.0)

**Tests:**
- `8.2.6.6.5.1.0` - Binary format header snapshot
- `8.2.6.6.5.2.0` - Hash consistency across formats

**Snapshots:**
- Binary header structure
- Hash consistency verification

---

## Seed-Based Testing

### Default Seed

**Default:** `42`

**Usage:**
```typescript
const manifest = generateTestManifest(TEST_SEED);
```

### Custom Seed

**Environment Variable:**
```bash
TEST_SEED=12345 bun test test/binary-manifest.test.ts
```

**Bun Flag:**
```bash
bun test --seed 99999 test/binary-manifest.test.ts
```

### Deterministic Generation

The `generateTestManifest()` function uses a Linear Congruential Generator (LCG) for deterministic random number generation:

```typescript
const rng = (() => {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
})();
```

**Benefits:**
- Reproducible test data
- Same seed = same manifest
- Different seeds = different but deterministic manifests

---

## Snapshot Testing

### Snapshot Files

**Location:** `test/__snapshots__/binary-manifest.test.ts.snap`

**Format:** Bun snapshot format (v1)

### Snapshot Contents

1. **Hash Values** - SHA-256 hashes (deterministic)
2. **Checksums** - 32-bit checksums (deterministic)
3. **Binary Headers** - First 32 bytes of binary format
4. **Manifest Structures** - Decoded manifests (timestamp normalized)
5. **Compression Ratios** - Size reduction metrics
6. **Performance Categories** - Normalized performance data

### Normalization

**Timestamp Normalization:**
```typescript
timestamp: "<TIMESTAMP>"
```

**Performance Normalization:**
```typescript
performanceCategory: "fast" | "medium" | "slow"
```

---

## Test Results

### Default Run (Seed 42)

```text
✅ 23 pass
✅ 0 fail
✅ 12 snapshots
✅ 37 expect() calls
```

### With Different Seed

```text
✅ Non-snapshot tests: Pass
⚠️ Snapshot tests: Fail (expected - different seed produces different results)
```

**Solution:** Use `--update-snapshots` to update snapshots for new seed, or use default seed (42) for CI.

---

## CI/CD Integration

### Recommended Workflow

```bash
# 1. Run tests with default seed
bun test test/binary-manifest.test.ts

# 2. Verify snapshots match
CI=true bun test test/binary-manifest.test.ts

# 3. Update snapshots if needed (after code changes)
bun test test/binary-manifest.test.ts --update-snapshots
```

### GitHub Actions Example

```yaml
- name: Run Binary Manifest Tests
  run: |
    bun test test/binary-manifest.test.ts
    CI=true bun test test/binary-manifest.test.ts
```

---

## Verification Commands

### Verify Snapshots Exist

```bash
ls -lh test/__snapshots__/binary-manifest.test.ts.snap
```

### Verify Test Coverage

```bash
bun test test/binary-manifest.test.ts --coverage
```

### Run Specific Test

```bash
bun test test/binary-manifest.test.ts -t "8.2.6.6.2.3.0"
```

---

## Example Test Output

### Successful Run

```text
bun test v1.3.3

test/binary-manifest.test.ts:
(pass) 8.2.6.6.1.1.0: computeHash produces deterministic SHA-256 hash [0.35ms]
(pass) 8.2.6.6.1.2.0: computeHash with seed-based content produces snapshot [1.49ms]
...
(pass) 8.2.6.6.5.2.0: hash consistency across formats snapshot [0.07ms]

 23 pass
 0 fail
snapshots: 12 passed
 37 expect() calls
Ran 23 tests across 1 file. [25.00ms]
```

### Snapshot Mismatch

```text
(fail) 8.2.6.6.1.2.0: computeHash with seed-based content produces snapshot
- Expected: "1156018f5367a133..."
+ Received: "different-hash-value..."

Snapshots: 1 failed, 11 passed
```

**Solution:** Review changes, then update if correct:
```bash
bun test test/binary-manifest.test.ts --update-snapshots
```

---

## Best Practices

### ✅ Do

- Use default seed (42) for CI/CD
- Update snapshots after intentional code changes
- Normalize timestamps and dynamic values in snapshots
- Use seed-based testing for deterministic results
- Test with multiple seeds to verify uniqueness

### ❌ Don't

- Commit snapshots with different seeds
- Ignore snapshot failures without review
- Include absolute paths in snapshots
- Include random values without normalization
- Update snapshots without code review

---

## Troubleshooting

### Snapshot Mismatches

**Problem:** Snapshots fail after code changes

**Solution:**
1. Review code changes
2. Verify changes are intentional
3. Update snapshots: `bun test --update-snapshots`

### Seed-Related Failures

**Problem:** Tests fail with different seed

**Solution:**
- Use default seed (42) for CI
- Or update snapshots for new seed
- Non-snapshot tests should pass regardless of seed

### Performance Test Flakiness

**Problem:** Performance snapshot fails intermittently

**Solution:**
- Already normalized to performance categories
- If still flaky, use relative timing instead of absolute

---

## Cross-References

- **8.2.6.1.0.0.0.0** - ManifestDigest utility
- **8.2.6.2.0.0.0.0** - BinaryManifestCodec utility
- **test/snapshot-examples.test.ts** - Snapshot testing patterns
- **test/harness.ts** - Test utilities and normalization

---

**Last Updated:** 2025-01-07  
**Status:** ✅ Tested and Verified
