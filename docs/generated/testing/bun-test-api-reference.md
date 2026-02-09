# 🧪 Complete Bun Test API Reference v2.8

## 📋 Import Statement

```typescript
import { 
  test, 
  it, 
  describe, 
  expect, 
  beforeAll, 
  beforeEach, 
  afterAll, 
  afterEach, 
  jest, 
  vi 
} from "bun:test";
```

---

## 🏗️ Test Structure Functions

### `describe(name, fn)`
Organizes tests into suites/groups.

```typescript
describe('User Authentication', () => {
  // Tests related to authentication
});
```

### `test(name, fn, options?)`
Defines a test case. Alias for `it()`.

```typescript
test('should create user successfully', () => {
  expect(createUser('john')).toBeTruthy();
});
```

### `it(name, fn, options?)`
Defines a test case. Alias for `test()`.

```typescript
it('should validate email format', () => {
  expect(validateEmail('test@example.com')).toBe(true);
});
```

---

## 🔄 Lifecycle Hooks

### `beforeAll(fn, timeout?)`
Runs once before all tests in the current `describe` block.

```typescript
beforeAll(async () => {
  // Setup database connection
  await connectDatabase();
});
```

### `beforeEach(fn, timeout?)`
Runs before each test in the current `describe` block.

```typescript
beforeEach(() => {
  // Reset test data
  testData = [];
});
```

### `afterEach(fn, timeout?)`
Runs after each test in the current `describe` block.

```typescript
afterEach(() => {
  // Cleanup test data
  testData = [];
});
```

### `afterAll(fn, timeout?)`
Runs once after all tests in the current `describe` block.

```typescript
afterAll(async () => {
  // Close database connection
  await disconnectDatabase();
});
```

---

## 🎯 Assertion API (`expect`)

### Basic Assertions

```typescript
expect(value).toBe(expected);           // Strict equality (===)
expect(value).toEqual(expected);         // Deep equality
expect(value).toBeTruthy();              // Truthy value
expect(value).toBeFalsy();               // Falsy value
expect(value).toBeNull();                 // Null value
expect(value).toBeUndefined();           // Undefined value
```

### String Assertions

```typescript
expect('hello world').toContain('hello');
expect('hello world').toMatch(/hello/);
expect('hello world').toHaveLength(11);
```

### Number Assertions

```typescript
expect(10).toBeGreaterThan(5);
expect(10).toBeLessThan(20);
expect(10.5).toBeCloseTo(10.5, 1);
expect(10).toBeGreaterThanOrEqual(10);
expect(10).toBeLessThanOrEqual(10);
```

### Array Assertions

```typescript
expect([1, 2, 3]).toContain(2);
expect([1, 2, 3]).toHaveLength(3);
expect([{ id: 1 }]).toContainEqual({ id: 1 });
```

### Object Assertions

```typescript
expect({ name: 'John' }).toHaveProperty('name');
expect({ name: 'John' }).toHaveProperty('name', 'John');
expect({ name: 'John', age: 30 }).toMatchObject({ name: 'John' });
```

### Promise Assertions

```typescript
await expect(promise).resolves.toBe('success');
await expect(promise).rejects.toThrow('error');
```

### Function Assertions

```typescript
const mockFn = vi.fn();
mockFn('arg1', 'arg2');

expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
expect(mockFn).toHaveBeenCalledTimes(1);
expect(mockFn).toHaveReturnedTimes(1);
```

### Negated Assertions

```typescript
expect(value).not.toBe(expected);
expect('hello').not.toContain('world');
expect([1, 2]).not.toContain(3);
```

---

## 🔧 Mocking API (`vi`)

### `vi.fn()`
Creates a mock function.

```typescript
const mockFn = vi.fn();
mockFn('arg1', 'arg2');

expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
```

### `vi.spyOn(object, methodName)`
Spies on existing object methods.

```typescript
const calculator = {
  add: (a, b) => a + b
};

const spy = vi.spyOn(calculator, 'add');
calculator.add(2, 3);

expect(spy).toHaveBeenCalledWith(2, 3);
spy.mockRestore(); // Restore original
```

### `vi.mock(path, factory)`
Mock entire modules.

```typescript
vi.mock('./api', () => ({
  fetchUser: vi.fn(() => Promise.resolve({ id: 1, name: 'John' })),
  default: vi.fn(() => 'mocked')
}));
```

### `vi.clearAllMocks()`
Clears all mock instances and calls.

```typescript
vi.clearAllMocks();
```

### `vi.resetAllMocks()`
Resets all mock state including implementations.

```typescript
vi.resetAllMocks();
```

### `vi.restoreAllMocks()`
Restores all mocks to their original implementations.

```typescript
vi.restoreAllMocks();
```

### Timer Mocks

```typescript
vi.useFakeTimers();

setTimeout(callback, 1000);
vi.advanceTimersByTime(1000); // Fast-forward
expect(callback).toHaveBeenCalled();

vi.useRealTimers(); // Restore real timers
```

---

## 🎭 Jest Compatibility (`jest`)

### `jest.fn()`
Jest-style mock function (alias for `vi.fn()`).

```typescript
const mockFn = jest.fn();
mockFn.mockReturnValue('test');
```

### `jest.spyOn()`
Jest-style spy (alias for `vi.spyOn()`).

```typescript
const spy = jest.spyOn(object, 'method');
```

### `jest.mock()`
Jest-style module mocking (alias for `vi.mock()`).

```typescript
jest.mock('fs', () => ({
  readFileSync: jest.fn(() => 'mocked content')
}));
```

---

## ⚡ Advanced Patterns

### Async/Await Testing

```typescript
test('async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBe('expected');
});
```

### Error Testing

```typescript
test('error handling', async () => {
  await expect(throwingFunction()).rejects.toThrow('Specific error');
});
```

### Callback Testing

```typescript
test('callback functions', (done) => {
  callbackFunction((result) => {
    expect(result).toBe('expected');
    done();
  });
});
```

### Concurrent Testing

```typescript
test('concurrent operations', async () => {
  const results = await Promise.all([
    operation1(),
    operation2(),
    operation3()
  ]);
  expect(results).toHaveLength(3);
});
```

---

## 🏗️ Nested Test Suites

```typescript
describe('Outer Suite', () => {
  beforeEach(() => {
    // Runs for all tests in outer and inner suites
  });

  describe('Inner Suite', () => {
    beforeEach(() => {
      // Runs only for tests in this inner suite
    });

    test('nested test', () => {
      // Test implementation
    });
  });
});
```

---

## 📊 Test Options

### Timeout Configuration

```typescript
test('slow test', async () => {
  // Test implementation
}, { timeout: 5000 }); // 5 second timeout
```

### Test Skipping

```typescript
test.skip('skipped test', () => {
  // This test will be skipped
});

// Conditional skipping
test('conditional test', () => {
  if (process.env.CI) {
    // Skip in CI environment
    return;
  }
  // Test implementation
});
```

### Todo Tests

```typescript
test.todo('test to be implemented later');
```

---

## 🌐 Global Configuration

### Setup Files

Create a `setup.ts` file for global test configuration:

```typescript
// setup.ts
import { expect, vi } from 'bun:test';

// Global setup
beforeAll(async () => {
  // Global test setup
});

// Global expectations
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Usage: expect(5).toBeWithinRange(1, 10);
```

---

## 🚀 CLI Usage

```bash
# Run all tests
bun test

# Run specific file
bun test user.test.ts

# Run with watch mode
bun test --watch

# Run with coverage
bun test --coverage

# Run tests matching pattern
bun test --test-name-pattern "authentication"

# Run in verbose mode
bun test --verbose
```

---

## 📈 Best Practices

1. **Descriptive Test Names**: Use clear, descriptive test names
2. **Arrange-Act-Assert**: Structure tests with setup, action, and assertion phases
3. **Isolation**: Keep tests independent with proper setup/teardown
4. **Mocking**: Use mocks to isolate dependencies
5. **Error Testing**: Test both success and error scenarios
6. **Async Testing**: Handle promises and async operations properly
7. **Lifecycle Hooks**: Use appropriate hooks for setup/teardown

---

## 🎯 Migration from Jest

Bun Test is largely compatible with Jest:

```typescript
// Jest syntax works in Bun
describe('migration', () => {
  test('works with jest syntax', () => {
    expect(true).toBe(true);
  });
});
```

Key differences:
- Faster execution (Zig-based)
- Built-in mocking capabilities
- No separate setup required
- Better TypeScript support

---

*Generated by Bun Test API Reference v2.8*
