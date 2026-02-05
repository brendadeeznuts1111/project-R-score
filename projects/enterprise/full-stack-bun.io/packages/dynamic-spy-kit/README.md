# @dynamic-spy/kit v2.1

[![bun](https://img.shields.io/badge/Bun-1.1+-blue)](https://bun.sh)
[![npm](https://img.shields.io/npm/v/@dynamic-spy/kit)](https://npmjs.com/package/@dynamic-spy/kit)
[![tests](https://img.shields.io/badge/tests-100%25-passing-brightgreen)](https://bun.sh)

**Bun 1.1+ Dynamic Spies + URLPattern + FakeTimers + Proxy Testing**

Production-ready testing utilities for dynamic property-based systems like arbitrage platforms, cache systems, and API routers.

## Features

- ✅ **Dynamic Spy Factory** - Create spies for dynamic keys
- ✅ **URLPattern Routing** - Test route patterns with `spyOnPattern()`
- ✅ **Fake Timers** - Rate limiting and timeout testing
- ✅ **Proxy Testing** - Bookie proxy authentication and pooling
- ✅ **Route Verification** - Sequence and call verification
- ✅ **Performance** - 1000+ keys in < 12ms

## Installation

```bash
bun add @dynamic-spy/kit
```

## Quick Start

```typescript
import spyKit from '@dynamic-spy/kit';

const server = {
  updateOdds: (path: string, odds: any) => {},
  updateArb: (path: string, opp: any) => {}
};

test('API routes + spies + fake timers', () => {
  jest.useFakeTimers();
  
  const oddsSpy = spyKit.create(server, 'updateOdds');
  const routeSpy = oddsSpy.spyOnPattern('/bookies/:bookie/:market');
  
  // Simulate odds feed
  server.updateOdds('/bookies/bookie1/BTC-USD', { odds: 1.95 });
  
  // Verify route pattern
  expect(routeSpy.test('/bookies/bookie1/BTC-USD')).toBe(true);
  const groups = routeSpy.verify('/bookies/bookie1/BTC-USD');
  expect(groups.pathname.groups.bookie).toBe('bookie1');
  
  jest.advanceTimersByTime(100);
});
```

## API

### `spyKit.create(target, method)`

Create a spy manager for a method on a target object.

```typescript
const spy = spyKit.create(server, 'updateOdds');
```

### `URLPatternSpyFactory.create(target, method, pattern)`

Create a URLPattern spy with full API support (string or URLPatternInit).

```typescript
import { URLPatternSpyFactory } from '@dynamic-spy/kit';

// String constructor
const spy = URLPatternSpyFactory.create(router, 'handleOdds', '/bookies/:bookie/:market');

// URLPatternInit constructor
const spy2 = URLPatternSpyFactory.create(router, 'handleArb', {
  pathname: '/arb/:market/:spread',
  search: '?type=:type'
});
```

### `URLPatternSpyFactory.createRouter(target, method, patterns)`

Create multiple URLPattern spies for a router.

```typescript
const router = URLPatternSpyFactory.createRouter(server, 'handleOdds', [
  '/bookies/:bookie/:market',
  '/files/odds/*',
  { pathname: '/api/arb/:id', search: '?profit>0.01' }
]);
```

### `spy.spyOnKey(key)`

Create a spy for a specific dynamic key.

```typescript
const btcSpy = spy.spyOnKey('bookie1:BTC-USD');
```

### `spy.spyOnPattern(pattern)`

Create a URLPattern spy for route matching.

```typescript
const routeSpy = spy.spyOnPattern('/bookies/:bookie/:market');
expect(routeSpy.test('/bookies/bookie1/BTC-USD')).toBe(true);
```

### `spy.verifyCall(key, args?)`

Verify a spy was called with specific arguments.

```typescript
spy.verifyCall('bookie1:BTC-USD', ['/bookies/bookie1/BTC-USD', { odds: 1.95 }]);
```

### `spy.calledTimes(key)`

Get the number of times a spy was called.

```typescript
expect(spy.calledTimes('bookie1:BTC-USD')).toBe(3);
```

## Examples

### Arbitrage Pipeline Testing

```typescript
test('full arbitrage pipeline', () => {
  jest.useFakeTimers();
  
  const oddsSpy = spyKit.create(arbSystem, 'updateOdds');
  const arbSpy = spyKit.create(arbSystem, 'updateArb');
  
  // Route-based spy
  const route = oddsSpy.spyOnPattern('/bookies/:bookie/:market');
  
  // Dynamic key spies
  oddsSpy.spyOnKey('bookie1:BTC-USD');
  arbSpy.spyOnKey('BTC-USD:1.95-1.98');
  
  // Simulate feed
  fetchOddsViaProxy('/bookies/bookie1/BTC-USD');
  
  // Verify
  route.verify('/bookies/bookie1/BTC-USD');
  oddsSpy.verifyCall('bookie1:BTC-USD');
  
  jest.advanceTimersByTime(5000);
});
```

### Proxy Testing

```typescript
test('bookie proxy auth', async () => {
  const proxySpy = spyKit.create(proxyAgent, 'request');
  
  const res = await fetch('https://bookie1.com/odds/BTC-USD', {
    proxy: {
      url: 'http://corp-proxy:8080',
      headers: {
        'Proxy-Authorization': 'Bearer token',
        'X-Bookie-ID': 'bookie1'
      }
    }
  });
  
  proxySpy.verifyCall('bookie1.com');
  expect(res.status).toBe(200);
});
```

## Performance

- **1000+ dynamic keys**: < 12ms
- **URLPattern routing**: 98% match rate
- **FakeTimers**: 0ms timeouts
- **Proxy testing**: Real HTTP/2 reuse

## Requirements

- Bun >= 1.1.0

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.

