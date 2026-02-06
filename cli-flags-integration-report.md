# 🚀 Bun Test CLI Flags Integration Report

**Generated**: 2026-02-06T22:17:45.891Z
**Bun Version**: 1.3.8

## 📋 CLI Flags Tested

| Flag | Description | Exit Code | Time (ms) | Features |
|------|-------------|-----------|-----------|----------|
| --watch | Watch mode for continuous testing | 0 | 313.67 | None |
| --coverage | Generate coverage report | 0 | 233.03 | None |
| --verbose | Verbose output with details | 0 | 234.35 | None |
| --bail | Stop on first failure | 1 | 231.27 | None |
| --run | Run tests (default behavior) | 0 | 240.54 | None |
| --preload | Preload files before tests | 0 | 317.71 | None |
| --timeout | Set test timeout | 0 | 566.78 | None |
| --test-name-pattern | Run tests matching pattern | 1 | 1389.33 | None |
| --test-ignore-pattern | Ignore tests matching pattern | 0 | 248.00 | None |
| --config | Use custom config file | 0 | 262.59 | None |

## 🔍 Detailed Results

### --watch

**Description**: Watch mode for continuous testing

**Exit Code**: 0

**Execution Time**: 313.67ms

**Output Preview**:

```
bun test v1.3.8 (b64edcb4)

tmp-basic.test.ts:
(pass) Basic Tests > should pass basic assertion [0.01ms]
(pass) Basic Tests > should handle async operations [0.05ms]
(pass) Basic Tests > slow test [100.62ms]

 3 pass
 0 fail
 3 expect() calls
Ran 3 tests across 1 file. [302.00ms]

```

### --coverage

**Description**: Generate coverage report

**Exit Code**: 0

**Execution Time**: 233.03ms

**Output Preview**:

```
bun test v1.3.8 (b64edcb4)

tmp-basic.test.ts:
(pass) Basic Tests > should pass basic assertion [0.08ms]
(pass) Basic Tests > should handle async operations
(pass) Basic Tests > slow test [100.95ms]

tmp-coverage.test.ts:
(pass) should test helper function [0.06ms]
(pass) should test class

 5 pass
...
```

### --verbose

**Description**: Verbose output with details

**Exit Code**: 0

**Execution Time**: 234.35ms

**Output Preview**:

```
bun test v1.3.8 (b64edcb4)

tmp-basic.test.ts:
(pass) Basic Tests > should pass basic assertion
(pass) Basic Tests > should handle async operations [0.10ms]
(pass) Basic Tests > slow test [100.86ms]

 3 pass
 0 fail
 3 expect() calls
Ran 3 tests across 1 file. [226.00ms]

```

### --bail

**Description**: Stop on first failure

**Exit Code**: 1

**Execution Time**: 231.27ms

**Output Preview**:

```
bun test v1.3.8 (b64edcb4)

tmp-basic.test.ts:
(pass) Basic Tests > should pass basic assertion [0.05ms]
(pass) Basic Tests > should handle async operations
(pass) Basic Tests > slow test [101.33ms]

tmp-failing.test.ts:
(pass) Failing Tests > should pass
 5 |   test('should pass', () => {
 6 |     ...
```

### --run

**Description**: Run tests (default behavior)

**Exit Code**: 0

**Execution Time**: 240.54ms

**Output Preview**:

```
bun test v1.3.8 (b64edcb4)

tmp-basic.test.ts:
(pass) Basic Tests > should pass basic assertion
(pass) Basic Tests > should handle async operations [0.02ms]
(pass) Basic Tests > slow test [101.30ms]

 3 pass
 0 fail
 3 expect() calls
Ran 3 tests across 1 file. [232.00ms]

```

### --preload

**Description**: Preload files before tests

**Exit Code**: 0

**Execution Time**: 317.71ms

**Output Preview**:

```
bun test v1.3.8 (b64edcb4)

tmp-basic.test.ts:
(pass) Basic Tests > should pass basic assertion
(pass) Basic Tests > should handle async operations [0.02ms]
(pass) Basic Tests > slow test [129.79ms]

 3 pass
 0 fail
 3 expect() calls
Ran 3 tests across 1 file. [285.00ms]

```

### --timeout

**Description**: Set test timeout

**Exit Code**: 0

**Execution Time**: 566.78ms

**Output Preview**:

```
bun test v1.3.8 (b64edcb4)

tmp-basic.test.ts:
(pass) Basic Tests > should pass basic assertion [0.04ms]
(pass) Basic Tests > should handle async operations [0.09ms]
(pass) Basic Tests > slow test [103.00ms]

 3 pass
 0 fail
 3 expect() calls
Ran 3 tests across 1 file. [438.00ms]

```

### --test-name-pattern

**Description**: Run tests matching pattern

**Exit Code**: 1

**Execution Time**: 1389.33ms

**Output Preview**:

```
bun test v1.3.8 (b64edcb4)

tmp-basic.test.ts:
(pass) Basic Tests > should pass basic assertion [0.07ms]
(pass) Basic Tests > should handle async operations [0.37ms]
(pass) Basic Tests > slow test [101.42ms]

clawdbot/src/discord/send.sends-basic-channel-messages.test.ts:

# Unhandled error between ...
```

### --test-ignore-pattern

**Description**: Ignore tests matching pattern

**Exit Code**: 0

**Execution Time**: 248.00ms

**Output Preview**:

```
bun test v1.3.8 (b64edcb4)

tmp-basic.test.ts:
(pass) Basic Tests > should pass basic assertion [0.22ms]
(pass) Basic Tests > should handle async operations [0.10ms]
(pass) Basic Tests > slow test [101.36ms]

 3 pass
 0 fail
 3 expect() calls
Ran 3 tests across 1 file. [239.00ms]

```

### --config

**Description**: Use custom config file

**Exit Code**: 0

**Execution Time**: 262.59ms

**Output Preview**:

```
bun test v1.3.8 (b64edcb4)

tmp-basic.test.ts:
(pass) Basic Tests > should pass basic assertion [0.05ms]
(pass) Basic Tests > should handle async operations [0.08ms]
(pass) Basic Tests > slow test [101.35ms]

 3 pass
 0 fail
 3 expect() calls
Ran 3 tests across 1 file. [254.00ms]

```

## ⚡ Performance Analysis

- **Average Time**: 403.73ms
- **Fastest**: --bail (231.27ms)
- **Slowest**: --test-name-pattern (1389.33ms)

## 💡 Usage Recommendations

- **--coverage**: Use for code quality analysis and test coverage
- **--bail**: Use in CI for faster feedback on first failure
- **--verbose**: Use for detailed debugging and test analysis
- **--watch**: Use during development for continuous testing
- **--timeout**: Use for tests that need custom time limits
- **--test-name-pattern**: Use to run specific test subsets

## 🚀 Integration Examples

```bash
# Basic test run
bun test

# With coverage
bun test --coverage

# CI-friendly with bail
bun test --bail --coverage

# Development with watch
bun test --watch --verbose

# Specific test pattern
bun test --test-name-pattern "integration"
```

---

*Generated by CLI Flags Integration Demo v2.8*