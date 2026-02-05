# Arbitrage Routes Testing Guide

## Overview

This guide demonstrates how to test API routes with dynamic spies and fake timers for rate limiting simulation.

## Key Features

### 1. Spy Kit Integration

```typescript
import spyKit from '@dynamic-spy/kit'; // or use local spyFactory

const oddsSpy = spyKit.create(server, 'updateOdds');
const routeSpy = oddsSpy.spyOnKey('/bookie1/BTC-USD');
```

### 2. Fake Timers for Rate Limiting

```typescript
jest.useFakeTimers();

// Simulate rate limiting
rateLimitDelay = 50; // 50ms delay
const fetchPromise = fetchOdds('/route', { odds: 1.95 });

// Advance timers
jest.advanceTimersByTime(50);
await fetchPromise;
```

### 3. Route Sequence Verification

```typescript
expect(spy).toHaveBeenNthCalledWith(1, '/route1', data1);
expect(spy).toHaveBeenNthCalledWith(2, '/route2', data2);
expect(spy).toHaveBeenCalledTimes(2);
```

## Test Patterns

### Basic Route Testing

```typescript
test('API routes + spies + fake timers', () => {
  const oddsSpy = spyKit.create(server, 'updateOdds');
  const btcSpy = oddsSpy.spyOnKey('/bookie1/BTC-USD');

  fetchOdds('/bookie1/BTC-USD', { odds: 1.95 });

  expect(btcSpy).toHaveBeenCalledWith('/bookie1/BTC-USD', { odds: 1.95 });
  jest.advanceTimersByTime(100);
});
```

### Rate Limiting Simulation

```typescript
test('Rate limiting with fake timers', async () => {
  rateLimitDelay = 50;
  const oddsSpy = spyKit.create(server, 'updateOdds');
  const spy = oddsSpy.spyOnKey('/bookie1/BTC-USD');

  const fetchPromise = fetchOdds('/bookie1/BTC-USD', { odds: 1.95 });

  // Not called immediately
  expect(spy).not.toHaveBeenCalled();

  // Advance timers
  jest.advanceTimersByTime(50);
  await fetchPromise;

  // Now called
  expect(spy).toHaveBeenCalled();
});
```

### Multiple Route Updates

```typescript
test('Multiple route updates with sequence verification', () => {
  const spy = jest.spyOn(server, 'updateOdds');

  fetchOdds('/bookie1/BTC-USD', { odds: 1.95 });
  fetchOdds('/bookie2/ETH-USD', { odds: 2.15 });
  fetchOdds('/bookie3/BNB-USD', { odds: 3.25 });

  expect(spy).toHaveBeenNthCalledWith(1, '/bookie1/BTC-USD', { odds: 1.95 });
  expect(spy).toHaveBeenNthCalledWith(2, '/bookie2/ETH-USD', { odds: 2.15 });
  expect(spy).toHaveBeenCalledTimes(3);
});
```

### Arbitrage Route Testing

```typescript
test('Arbitrage route updates with profit thresholds', () => {
  const arbSpy = spyKit.create(server, 'updateArb');
  const spy = jest.spyOn(server, 'updateArb');

  fetchArb('/arb/nfl-q4-spread', {
    profit_pct: 0.042,
    value_usd: 50000,
    execute: true
  });

  expect(spy).toHaveBeenCalledWith('/arb/nfl-q4-spread', expect.objectContaining({
    profit_pct: 0.042,
    execute: true
  }));
});
```

## Setup and Teardown

```typescript
beforeEach(() => {
  jest.useFakeTimers();
  rateLimitDelay = 0;
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});
```

## Best Practices

1. **Always use fake timers** - For predictable rate limiting tests
2. **Reset timers between tests** - Use `beforeEach` and `afterEach`
3. **Verify call sequences** - Use `toHaveBeenNthCalledWith` for order verification
4. **Test rate limits** - Simulate delays with `advanceTimersByTime`
5. **Isolate spies** - Use separate spy managers for different routes

## Running Tests

```bash
# Run all route tests
bun test tests/arb-routes.test.ts

# Run with coverage
bun test --coverage tests/arb-routes.test.ts

# Run specific test
bun test tests/arb-routes.test.ts -t "Rate limiting"
```

## Real-World Applications

- **Odds feed routes** - `/bookie1/BTC-USD`, `/bookie2/ETH-USD`
- **Arbitrage routes** - `/arb/nfl-q4-spread`, `/arb/nba-q2-total`
- **Rate limiting** - Simulate API rate limits with fake timers
- **Route sequence** - Verify order of route updates
- **URLPattern matching** - Test dynamic route patterns



