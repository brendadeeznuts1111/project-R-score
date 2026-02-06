# 🚀 Advanced Bun Testing Features Guide

## 📋 Feature Overview

This guide demonstrates the advanced testing features introduced in Bun v1.3+:
- `test.serial` for sequential execution within concurrent groups
- Test qualifier chaining (`.failing.each`, `.skip.each`, `.only.each`)
- Randomization with `--randomize` and `--seed`
- Stricter CI environment behavior
- Improved test execution order

---

## 🔧 test.serial Feature

### **Purpose**
Run specific tests sequentially while others run concurrently within the same `describe.concurrent` block.

### **Syntax**
```typescript
describe.concurrent("mixed tests", () => {
  test.concurrent("runs in parallel", async () => {
    // Runs concurrently with other test.concurrent
  });
  
  test.serial("runs sequentially", () => {
    // Runs AFTER all concurrent tests complete
  });
});
```

### **Real Example**
```typescript
describe.concurrent("API Integration Tests", () => {
  test.concurrent("concurrent API call #1", async () => {
    await fetch("https://api.example.com/endpoint1");
    expect(response.status).toBe(200);
  });
  
  test.concurrent("concurrent API call #2", async () => {
    await fetch("https://api.example.com/endpoint2");
    expect(response.status).toBe(200);
  });
  
  test.serial("sequential cleanup", () => {
    // Runs after both API calls complete
    expect(global.apiCalls).toHaveLength(2);
    cleanupResources();
  });
});
```

### **Execution Order**
```text
Phase 1 (Concurrent):
├── test.concurrent #1
├── test.concurrent #2
└── test.concurrent #3

Phase 2 (Sequential):
├── test.serial #1
└── test.serial #2

Phase 3 (Concurrent):
├── test.concurrent #4
└── test.concurrent #5
```

---

## 🎲 Randomization Features

### **--randomize Flag**
Run tests in random order to expose hidden dependencies:

```bash
# Random execution order
bun test --randomize

# Output includes seed for reproduction
--seed=4265819852
10 pass
2 fail
Ran 12 tests across 3 files. [250.00ms]
```

### **--seed Flag**
Reproduce exact same test order for debugging:

```bash
# Reproduce specific random order
bun test --seed 4265819852

# Automatically enables randomization
bun test --seed 12345
```

### **Practical Usage**
```typescript
describe("Randomization-Ready Tests", () => {
  test("setup database", () => {
    // Test order shouldn't matter
    expect(database.connected).toBe(true);
  });
  
  test("create user", () => {
    // Independent of other tests
    expect(createUser()).toBeDefined();
  });
  
  test("verify user", () => {
    // Should work regardless of execution order
    expect(getUser()).toBeDefined();
  });
});
```

---

## ⛓️ Qualifier Chaining

### **Supported Combinations**
```typescript
// Expected to fail, runs for each item
test.failing.each([1, 2, 3])("each %i", (i) => {
  throw new Error(`Expected failure: ${i}`);
});

// Skipped tests, runs for each item
test.skip.each(["a", "b", "c"])("skipped %s", (item) => {
  expect(item).toBeDefined();
});

// Focused tests, runs for each item
test.only.each([{type: "api"}, {type: "db"}])("focused %s", ({type}) => {
  expect(type).toBeDefined();
});
```

### **Real-World Examples**
```typescript
describe("Error Handling Tests", () => {
  test.failing.each([
    { scenario: "timeout", code: "TIMEOUT" },
    { scenario: "auth", code: "UNAUTHORIZED" },
    { scenario: "rate-limit", code: "RATE_LIMITED" }
  ])("handles %s errors gracefully", ({ scenario, code }) => {
    // These tests verify error handling but are expected to fail
    // until proper error handling is implemented
    throw new Error(`${scenario}: ${code}`);
  });
});

describe("Feature Flags", () => {
  test.skip.each([
    "beta-feature-1",
    "beta-feature-2",
    "experimental-feature"
  ])("disabled feature %s", (feature) => {
    // Tests for features not yet enabled
    expect(feature).toBeDefined();
  });
});
```

---

## 🚦 Stricter CI Environment

### **New CI Restrictions**
When `CI=true` is set in the environment:

1. **test.only() throws error**:
   ```bash
   # CI will fail if test.only() is committed
   bun test
   # Error: test.only() is not allowed in CI environments
   ```

2. **Snapshot creation requires flag**:
   ```bash
   # CI will fail if new snapshots are created without flag
   bun test
   # Error: Use --update-snapshots to create new snapshots in CI
   
   # Correct way in CI
   bun test --update-snapshots
   ```

### **Disable CI Restrictions**
```bash
# Disable strict CI behavior
CI=false bun test

# Or set environment variable
export CI=false
bun test
```

### **Best Practices**
```typescript
// ✅ Good: Normal tests for CI
test("production feature works", () => {
  expect(feature()).toBe(true);
});

// ❌ Bad: test.only() will fail in CI
test.only("debugging test", () => {
  expect(debugFeature()).toBe(true);
});

// ✅ Good: Use test.skip() for temporary exclusions
test.skip("temporarily disabled", () => {
  expect(tempFeature()).toBe(true);
});
```

---

## 📊 Test Execution Order Improvements

### **Before (Old Behavior)**
```text
describe("suite", () => {
  beforeAll()  // Unpredictable timing
  test("test1")
  test("test2")
  afterAll()   // Unpredictable timing
});
```

### **After (New Behavior)**
```text
describe("suite", () => {
  beforeAll()  // Predictable: before all tests
  test("test1")
  test("test2")
  afterAll()   // Predictable: after all tests
});
```

### **Consistent with Other Test Runners**
- **beforeAll**: Runs once before all tests in describe
- **afterAll**: Runs once after all tests in describe
- **beforeEach/afterEach**: Run around each test
- **Hooks**: Respect test nesting and ordering

---

## ⚠️ Concurrent Test Limitations

### **Unsupported Features**
```typescript
describe.concurrent("limitations", () => {
  test.concurrent("this won't work", async () => {
    // ❌ Not supported
    expect.assertions(3);
    
    // ❌ Not supported  
    expect.hasAssertions();
    
    // ❌ Not supported
    expect(result).toMatchSnapshot();
    
    // ✅ Supported alternative
    expect(result).toMatchInlineSnapshot(`...`);
  });
});
```

### **Workarounds**
```typescript
test.concurrent("manual assertion counting", async () => {
  let assertionCount = 0;
  
  expect(true).toBe(true);
  assertionCount++;
  
  expect(1 + 1).toBe(2);
  assertionCount++;
  
  // Manual verification instead of expect.assertions()
  expect(assertionCount).toBe(2);
});
```

### **Hook Behavior**
```typescript
describe.concurrent("hooks", () => {
  beforeAll(() => {
    // ✅ Runs once (not concurrently)
    console.log("Setup for all concurrent tests");
  });
  
  test.concurrent("test 1", async () => { /* ... */ });
  test.concurrent("test 2", async () => { /* ... */ });
  
  afterAll(() => {
    // ✅ Runs once (not concurrently)
    console.log("Cleanup after all concurrent tests");
  });
});
```

---

## 🎯 Practical Examples

### **1. API Testing with Mixed Execution**
```typescript
describe.concurrent("API Integration", () => {
  test.concurrent("parallel API calls", async () => {
    const [users, posts, comments] = await Promise.all([
      fetch("/api/users"),
      fetch("/api/posts"), 
      fetch("/api/comments")
    ]);
    expect(users.status).toBe(200);
  });
  
  test.serial("sequential validation", () => {
    // Validate that all API calls completed
    expect(global.apiCallCount).toBe(3);
    resetGlobalState();
  });
});
```

### **2. Database Testing with Cleanup**
```typescript
describe.concurrent("Database Operations", () => {
  test.concurrent("concurrent inserts", async () => {
    await db.insert({ table: "users", data: mockUser1 });
    await db.insert({ table: "users", data: mockUser2 });
  });
  
  test.serial("verify and cleanup", () => {
    const users = db.select("SELECT * FROM users");
    expect(users).toHaveLength(2);
    db.truncate("users");
  });
});
```

### **3. Error Scenario Testing**
```typescript
describe("Error Scenarios", () => {
  test.failing.each([
    { input: "invalid", error: "ValidationError" },
    { input: "null", error: "NullError" },
    { input: "empty", error: "EmptyError" }
  ])("validates %s input", ({ input, error }) => {
    // Test expected to fail until validation is implemented
    validateInput(input);
  });
});
```

---

## 🚀 Performance Benefits

### **Concurrent + Serial Pattern**
```typescript
// Before: All sequential (slow)
test("setup", () => setup());      // 100ms
test("api call 1", async () => await api1()); // 200ms
test("api call 2", async () => await api2()); // 200ms  
test("cleanup", () => cleanup());  // 50ms
// Total: 550ms

// After: Concurrent + Serial (fast)
describe.concurrent("optimized", () => {
  test.concurrent("api call 1", async () => await api1()); // 200ms
  test.concurrent("api call 2", async () => await api2()); // 200ms (parallel)
  test.serial("cleanup", () => cleanup()); // 50ms (after)
});
// Total: 250ms (2.2x faster)
```

---

## 📈 Configuration Examples

### **bunfig.toml Setup**
```toml
[test]
# Enable randomization by default
randomize = true

# Default concurrency
maxConcurrency = 10

# Files to run concurrently
concurrentTestGlob = [
  "**/integration/**/*.test.ts",
  "**/api/**/*.test.ts",
  "**/*-concurrent.test.ts"
]
```

### **Package.json Scripts**
```json
{
  "scripts": {
    "test": "bun test",
    "test:random": "bun test --randomize",
    "test:reproduce": "bun test --seed 12345",
    "test:concurrent": "bun test --max-concurrency 20",
    "test:ci": "bun test --randomize --reporter=junit"
  }
}
```

---

## 🎊 Summary

### **Key Features**
✅ **test.serial()** - Sequential execution within concurrent groups  
✅ **Qualifier Chaining** - `.failing.each`, `.skip.each`, `.only.each`  
✅ **Randomization** - `--randomize` and `--seed` for dependency detection  
✅ **CI Safety** - Stricter rules for production environments  
✅ **Execution Order** - Predictable and consistent test ordering  

### **Benefits**
- **Performance**: Up to 2.2x faster with concurrent patterns
- **Reliability**: Randomization exposes hidden dependencies  
- **Safety**: CI restrictions prevent accidental commits
- **Flexibility**: Mixed concurrent/sequential execution patterns
- **Compatibility**: Consistent with other test runners

### **Production Ready**
These features make Bun's test runner suitable for:
- **Large test suites** with mixed execution patterns
- **CI/CD pipelines** with strict safety requirements  
- **Development workflows** with debugging capabilities
- **Performance testing** with concurrent execution
- **Enterprise environments** with reliability needs

---

**Implementation**: All features demonstrated in working test files  
**Performance**: Up to 2.2x improvement with optimal patterns  
**Compatibility**: Fully backward compatible with existing tests
