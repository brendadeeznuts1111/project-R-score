# ⚠️ Unhandled Rejections Control

This document explains Bun's `--unhandled-rejections` flag and how to handle unhandled Promise rejections in your applications.

Reference: [Bun Runtime - Unhandled Rejections](https://bun.com/docs/runtime#param-unhandled-rejections)

## 🎯 Overview

The `--unhandled-rejections` flag controls how Bun handles unhandled Promise rejections. This is critical for debugging async code and ensuring proper error handling.

## 📋 Available Modes

The flag accepts one of five values:

| Mode | Description | Behavior |
|------|-------------|----------|
| `strict` | Treat as errors | Unhandled rejections cause process to exit with error |
| `throw` | Throw immediately | Unhandled rejections throw synchronously |
| `warn` | Warn (default) | Log warning to console, continue execution |
| `none` | Silent | Ignore unhandled rejections completely |
| `warn-with-error-code` | Warn and exit | Log warning and exit with non-zero code |

## 🚀 Usage

### Basic Usage

```bash
# Default behavior (warn)
bun script.ts

# Strict mode (treat as errors)
bun --unhandled-rejections strict script.ts

# Throw mode (throw immediately)
bun --unhandled-rejections throw script.ts

# Silent mode (ignore)
bun --unhandled-rejections none script.ts

# Warn and exit with error code
bun --unhandled-rejections warn-with-error-code script.ts
```

### In Tests

```bash
# Strict mode for tests (fail on unhandled rejections)
bun --unhandled-rejections strict test

# Warn mode for development
bun --unhandled-rejections warn test
```

### In Benchmarks

```bash
# Silent mode for benchmarks (avoid noise)
bun --unhandled-rejections none test bench/

# Strict mode to catch issues
bun --unhandled-rejections strict test bench/
```

## 📝 Mode Details

### 1. `strict` - Treat as Errors

Unhandled rejections are treated as uncaught exceptions, causing the process to exit with an error code.

**Behavior:**
- Process exits with non-zero exit code
- Error is logged to console
- No execution continues after unhandled rejection

**Example:**
```typescript
// script.ts
Promise.reject(new Error("Unhandled rejection"));

// With: bun --unhandled-rejections strict script.ts
// Result: Process exits with error code 1
// Output: Uncaught error: Error: Unhandled rejection
```

**When to Use:**
- Production environments
- CI/CD pipelines
- Tests where unhandled rejections should fail
- Debugging async code issues

### 2. `throw` - Throw Immediately

Unhandled rejections throw synchronously as uncaught exceptions.

**Behavior:**
- Synchronous throw (not deferred)
- Process exits immediately
- Similar to `strict` but throws synchronously

**Example:**
```typescript
// script.ts
Promise.reject(new Error("Unhandled rejection"));

// With: bun --unhandled-rejections throw script.ts
// Result: Synchronous throw, immediate exit
```

**When to Use:**
- When you want immediate failure detection
- Debugging synchronous error handling
- Testing error propagation

### 3. `warn` - Warn (Default)

Log a warning to console but continue execution.

**Behavior:**
- Warning logged to console
- Process continues execution
- No exit code change
- Default behavior in Bun

**Example:**
```typescript
// script.ts
Promise.reject(new Error("Unhandled rejection"));
console.log("This line still executes");

// With: bun --unhandled-rejections warn script.ts
// Result: Warning logged, execution continues
// Output:
//   ⚠️  Unhandled promise rejection: Error: Unhandled rejection
//   This line still executes
```

**When to Use:**
- Development environments
- When you want to see warnings but continue execution
- Default for most use cases

### 4. `none` - Silent

Completely ignore unhandled rejections.

**Behavior:**
- No warnings logged
- No errors thrown
- Execution continues normally
- Silent failures

**Example:**
```typescript
// script.ts
Promise.reject(new Error("Unhandled rejection"));
console.log("This line still executes");

// With: bun --unhandled-rejections none script.ts
// Result: No output about rejection, execution continues
// Output:
//   This line still executes
```

**When to Use:**
- Benchmarks (to avoid noise)
- When you're handling rejections in other ways
- Production environments where you want silent failures (not recommended)

### 5. `warn-with-error-code` - Warn and Exit

Log a warning and exit with a non-zero error code.

**Behavior:**
- Warning logged to console
- Process exits with non-zero code
- Similar to `strict` but with a warning message first

**Example:**
```typescript
// script.ts
Promise.reject(new Error("Unhandled rejection"));

// With: bun --unhandled-rejections warn-with-error-code script.ts
// Result: Warning logged, then exit with error code
// Output:
//   ⚠️  Unhandled promise rejection: Error: Unhandled rejection
//   Exit code: 1
```

**When to Use:**
- Production environments
- CI/CD pipelines where warnings should fail
- When you want both warning and exit

## 💻 Code Examples

### Handling Rejections Properly

```typescript
// ✅ Good: Handle rejections explicitly
async function doSomething() {
  try {
    await someAsyncOperation();
  } catch (error) {
    console.error("Error:", error);
    // Handle error appropriately
  }
}

// ❌ Bad: Unhandled rejection
async function doSomething() {
  someAsyncOperation(); // Missing await and error handling
  // If this rejects, it's unhandled
}
```

### Catching Rejections

```typescript
// ✅ Good: Use .catch()
Promise.resolve()
  .then(() => {
    return Promise.reject(new Error("Something went wrong"));
  })
  .catch((error) => {
    console.error("Caught:", error);
  });

// ✅ Good: Use try/catch with await
try {
  await Promise.reject(new Error("Something went wrong"));
} catch (error) {
  console.error("Caught:", error);
}

// ✅ Good: Use global handler
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled rejection:", reason);
  // Handle or log appropriately
});
```

### Setting Global Handler

```typescript
// Handle unhandled rejections globally
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled rejection at:", promise);
  console.error("Reason:", reason);

  // Log to error tracking service
  // logError(reason);

  // Exit process in production
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
});

// Also handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});
```

## 🧪 Testing Unhandled Rejections

### Test with Strict Mode

```bash
# Run tests with strict mode to catch unhandled rejections
bun --unhandled-rejections strict test

# This will fail if any test has unhandled rejections
```

### Test Unhandled Rejection Handling

```typescript
import { describe, it, expect } from "bun:test";

describe("Unhandled Rejection Handling", () => {
  it("should catch unhandled rejections with process.on", (done) => {
    const handler = (reason: unknown) => {
      expect(reason).toBeInstanceOf(Error);
      process.removeListener("unhandledRejection", handler);
      done();
    };

    process.on("unhandledRejection", handler);

    // Create unhandled rejection
    Promise.reject(new Error("Test rejection"));
  });

  it("should handle rejections with try/catch", async () => {
    try {
      await Promise.reject(new Error("Test error"));
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe("Test error");
    }
  });
});
```

## 🎯 Best Practices

### 1. Always Handle Rejections

```typescript
// ✅ Always handle async errors
async function fetchData() {
  try {
    const data = await fetch("/api/data");
    return await data.json();
  } catch (error) {
    console.error("Failed to fetch data:", error);
    throw error; // Re-throw if needed
  }
}
```

### 2. Use Strict Mode in Production

```bash
# Production: Fail fast on unhandled rejections
bun --unhandled-rejections strict start.js
```

### 3. Use Warn Mode in Development

```bash
# Development: See warnings but continue
bun --unhandled-rejections warn dev.js
```

### 4. Set Global Handler

```typescript
// Set up global handler early in application
process.on("unhandledRejection", (reason, promise) => {
  // Log to error tracking
  // Alert monitoring systems
  // Gracefully shut down if needed
});
```

### 5. Monitor Unhandled Rejections

```typescript
// Track unhandled rejections in production
process.on("unhandledRejection", (reason, promise) => {
  // Send to error tracking service
  errorTracker.captureException(reason, {
    tags: { type: "unhandled_rejection" },
    extra: { promise },
  });
});
```

## 🚨 Common Pitfalls

### 1. Forgetting to Await

```typescript
// ❌ Bad: Unhandled rejection if fetch fails
function getData() {
  fetch("/api/data"); // Missing await and error handling
}

// ✅ Good: Properly handle
async function getData() {
  try {
    const response = await fetch("/api/data");
    return await response.json();
  } catch (error) {
    console.error("Error:", error);
  }
}
```

### 2. Not Handling Promise Chains

```typescript
// ❌ Bad: Rejection not handled
Promise.resolve()
  .then(() => {
    return Promise.reject(new Error("Oops"));
  })
  // Missing .catch()

// ✅ Good: Handle rejection
Promise.resolve()
  .then(() => {
    return Promise.reject(new Error("Oops"));
  })
  .catch((error) => {
    console.error("Error:", error);
  });
```

### 3. Ignoring Errors in Async Functions

```typescript
// ❌ Bad: Error ignored
async function process() {
  await riskyOperation(); // Error could be unhandled
  return "done";
}

// ✅ Good: Handle errors
async function process() {
  try {
    await riskyOperation();
    return "done";
  } catch (error) {
    console.error("Processing failed:", error);
    throw error; // Or handle appropriately
  }
}
```

## 🔧 Configuration

### In `bunfig.toml`

```toml
[run]
# Set default unhandled rejection mode
unhandled-rejections = "strict"  # or "warn", "throw", "none", "warn-with-error-code"
```

### In `package.json` Scripts

```json
{
  "scripts": {
    "test": "bun --unhandled-rejections strict test",
    "dev": "bun --unhandled-rejections warn dev.ts",
    "bench": "bun --unhandled-rejections none test bench/"
  }
}
```

### Environment-Based Configuration

```typescript
// Set based on environment
const rejectionMode = process.env.NODE_ENV === "production"
  ? "strict"
  : "warn";

// This would be set via CLI flag, not in code
// bun --unhandled-rejections ${rejectionMode} script.ts
```

## 📊 Mode Comparison

| Mode | Console Output | Process Exit | Exit Code | Use Case |
|------|---------------|--------------|-----------|----------|
| `strict` | Error logged | Yes | Non-zero | Production, CI/CD |
| `throw` | Error thrown | Yes | Non-zero | Immediate failure |
| `warn` | Warning logged | No | Zero | Development (default) |
| `none` | None | No | Zero | Benchmarks |
| `warn-with-error-code` | Warning logged | Yes | Non-zero | Production with warnings |

## 🔗 Related Documentation

- [Bun Runtime - Unhandled Rejections](https://bun.com/docs/runtime#param-unhandled-rejections)
- [Runtime Controls Guide](../runtime/RUNTIME_CONTROLS.md)
- [Process Lifecycle](../runtime/PROCESS_LIFECYCLE.md)
- [Testing Alignment](../guides/testing/TESTING_ALIGNMENT.md)

