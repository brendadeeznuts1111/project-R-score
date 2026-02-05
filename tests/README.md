# Tests Directory

This directory contains consolidated test files for the loose scripts and utilities in the parent directory.

## Test Files

### **Core Tests**

#### `file-io.test.ts`
- **Comprehensive test suite** for Bun file I/O operations
- **Merged from:** `bun-file-io-bench.ts` + `bun-file-io.test.ts` + original `file-io.test.ts`
- **Coverage:** Bun.file, Bun.write, FileSink, benchmarks, and node:fs operations
- **Run:** `bun test tests/file-io.test.ts`

#### `test-entry-guards.ts`
- **Quick verification** of entry guard functionality
- **Tests:** Entry guard utility imports and basic functionality
- **Run:** `bun tests/test-entry-guards.ts`

#### `test-entry-guards-consolidated.ts`
- **Comprehensive entry guard testing** with subprocess verification
- **Tests:** Import guards, direct execution, and non-guarded modules
- **Run:** `bun tests/test-entry-guards-consolidated.ts`

#### `test-guide-cli-simple.ts`
- **Manual testing** for the merged guide-cli.ts functionality
- **Tests:** Help output, error handling, diagnostics, and entry guards
- **Run:** `bun tests/test-guide-cli-simple.ts`

## Usage

### Run All Tests
```bash
# Run file I/O tests (using Bun test runner)
bun test tests/file-io.test.ts

# Run entry guard tests
bun tests/test-entry-guards.ts
bun tests/test-entry-guards-consolidated.ts

# Run CLI manual tests
bun tests/test-guide-cli-simple.ts
```

### Test Categories

1. **Unit Tests** - `file-io.test.ts` (automated)
2. **Integration Tests** - `test-entry-guards-*.ts` (semi-automated)
3. **Manual Tests** - `test-guide-cli-simple.ts` (verification)

## Organization

These files were consolidated from the root directory to reduce clutter and improve organization:

- **Before:** 4 loose test files in root directory
- **After:** 4 organized test files in dedicated `/tests/` directory
- **Benefits:** Cleaner root directory, better test organization, easier maintenance

## Notes

- All tests maintain their original functionality
- Import paths have been updated for the new directory structure
- Tests are designed to work from the project root directory
- Some tests require specific project structures (e.g., my-bun-app for CLI tests)
