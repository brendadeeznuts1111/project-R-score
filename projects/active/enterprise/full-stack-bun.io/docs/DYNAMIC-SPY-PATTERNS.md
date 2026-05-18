# Dynamic Spy Patterns - Production Testing Guide

## Overview

This guide demonstrates how to use `jest.spyOn()` with dynamic property keys for testing real-world systems like databases, caches, and arbitrage tracking systems.

## Key Patterns

### 1. Method-Based Spies (Not Property Assignment)

**❌ Wrong Approach:**
```typescript
// This doesn't work - can't spy on direct property assignment
const spy = jest.spyOn(obj, "dynamicKey");
obj["dynamicKey"] = newValue; // Spy won't catch this
```

**✅ Correct Approach:**
```typescript
// Wrap mutations in methods
const manager = {
  update: (key: string, value: any) => {
    obj[key] = value;
  }
};

const spy = jest.spyOn(manager, 'update');
manager.update("dynamicKey", newValue); // Spy catches this ✅
```

### 2. Generic Spy Factory

Use the `createDynamicSpy` utility for reusable spy management:

```typescript
import { createDynamicSpy } from "../src/utils/spyFactory";

const cache = new Cache();
const spyManager = createDynamicSpy(cache, 'set');

// Create spies for specific keys
const user123Spy = spyManager.spyOnKey("user:123");
const arb456Spy = spyManager.spyOnKey("arb:456");

// Verify calls
const spy = spyManager.getSpy("user:123");
expect(spy).toHaveBeenCalledWith("user:123", { balance: 1000 });
```

### 3. Enhanced Assertions

Use `toHaveBeenNthCalledWith` for sequence verification:

```typescript
const spy = jest.spyOn(manager, 'update');

manager.update("key1", { value: 1 });
manager.update("key2", { value: 2 });

// Verify call sequence
expect(spy).toHaveBeenNthCalledWith(1, "key1", { value: 1 });
expect(spy).toHaveBeenNthCalledWith(2, "key2", { value: 2 });
expect(spy).toHaveBeenCalledTimes(2);
```

### 4. Mock Reset Utility

Always reset mocks between tests:

```typescript
import { afterEach } from "bun:test";

afterEach(() => {
  jest.restoreAllMocks();
});
```

## Test Patterns

### Database Mutations

```typescript
test("Database record mutations", () => {
  const dbWrapper = {
    setUser: (userId: string, data: any) => {
      userDatabase[userId] = data;
    }
  };

  const spy = jest.spyOn(dbWrapper, 'setUser');
  
  dbWrapper.setUser("1001", { name: "Alice", role: "admin" });
  
  expect(spy).toHaveBeenCalledWith("1001", expect.objectContaining({
    name: "Alice",
    role: "admin"
  }));
});
```

### Cache Operations

```typescript
test("Cache system with dynamic keys", () => {
  const cache = new Cache();
  const spy = jest.spyOn(cache, 'set');
  
  cache.set("user:123", { name: "John" });
  
  expect(spy).toHaveBeenCalledWith("user:123", { name: "John" });
});
```

### Arbitrage Tracking

```typescript
test("Arbitrage opportunity tracking", () => {
  const arbManager = {
    updateArb: (key: string, updates: any) => {
      arbDatabase[key] = { ...arbDatabase[key], ...updates };
    }
  };

  const spy = jest.spyOn(arbManager, 'updateArb');
  
  arbManager.updateArb("nfl-q4-spread", { profit_pct: 0.042, execute: true });
  
  expect(spy).toHaveBeenCalledWith("nfl-q4-spread", expect.objectContaining({
    profit_pct: 0.042,
    execute: true
  }));
});
```

## Performance Testing

### Scaling to 1000+ Dynamic Keys

```typescript
test("scales to 1000+ dynamic keys", () => {
  const cache = new Cache();
  const spy = jest.spyOn(cache, 'set');
  
  const keys = Array.from({ length: 1000 }, (_, i) => `user:${i}`);
  
  keys.forEach((key, index) => {
    cache.set(key, { data: `test-${index}` });
  });
  
  expect(spy).toHaveBeenCalledTimes(1000);
  expect(spy).toHaveBeenNthCalledWith(1, "user:0", expect.any(Object));
  expect(spy).toHaveBeenNthCalledWith(1000, "user:999", expect.any(Object));
});
```

## Best Practices

1. **Always wrap mutations in methods** - Direct property assignment can't be spied on
2. **Use `expect.toMatchObject()`** - For partial state verification
3. **Reset mocks between tests** - Use `afterEach(() => jest.restoreAllMocks())`
4. **Use spy factories** - For reusable spy management across tests
5. **Verify call sequences** - Use `toHaveBeenNthCalledWith` for order verification

## Running Tests

```bash
# Run all dynamic spy pattern tests
bun test tests/dynamic-spy-patterns.test.ts

# Run with coverage
bun test --coverage tests/dynamic-spy-patterns.test.ts

# Run specific test
bun test tests/dynamic-spy-patterns.test.ts -t "scales to 1000+"
```

## Real-World Applications

These patterns are perfect for testing:

- **Database operations** - User records, arbitrage opportunities
- **Cache systems** - Redis-like key-value stores
- **API normalization** - Response transformation
- **MLGS graph updates** - Multi-layer graph node management
- **Bookie odds tracking** - Sportsbook odds updates
- **High-scale systems** - 1000+ dynamic keys

## Performance Benchmarks

On a typical system:
- **100 keys**: < 1ms
- **1000 keys**: < 10ms
- **10000 keys**: < 100ms

The spy factory pattern scales linearly with the number of keys.

