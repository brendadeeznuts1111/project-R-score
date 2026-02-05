# Bun Verbose Fetch Debugging

## Overview

Bun provides built-in verbose fetch logging that outputs curl commands for all fetch requests, making it easy to debug and reproduce API calls.

## Quick Start

### Enable Verbose Fetch Globally

```typescript
// Set environment variable
Bun.env.BUN_CONFIG_VERBOSE_FETCH = 'curl';

// Now all fetch() calls will output curl commands
await fetch('https://api.example.com', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ foo: 'bar' })
});
```

### Output Example

```
curl -X POST https://api.example.com \
  -H "Content-Type: application/json" \
  -d '{"foo":"bar"}'
```

## Integration with fetch-wrapper

The `fetchWithErrorHandling` wrapper automatically enables verbose fetch in development mode:

```typescript
import { fetchWithErrorHandling } from './utils/fetch-wrapper';

// Automatically verbose in development
const data = await fetchWithErrorHandling<ApiResponse>('https://api.example.com', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ data: 'test' })
});
```

## Using fetch-debug Utilities

### Enable/Disable Verbose Fetch

```typescript
import { enableVerboseFetch, disableVerboseFetch } from './utils/fetch-debug';

enableVerboseFetch();  // Enable globally
await fetch('https://api.example.com');
disableVerboseFetch(); // Disable
```

### Debug Single Request

```typescript
import { debugFetch } from './utils/fetch-debug';

// Automatically enables verbose for this request only
await debugFetch('https://api.example.com', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ test: 'data' })
});
```

### Debug with Response Inspection

```typescript
import { debugFetchWithInspection } from './utils/fetch-debug';

const { response, metadata } = await debugFetchWithInspection(
  'https://api.example.com',
  { method: 'GET' },
  true // logResponse
);

console.log('Status:', metadata.status);
console.log('Duration:', metadata.durationMs, 'ms');
```

### Environment-Aware Configuration

```typescript
import { configureVerboseFetch } from './utils/fetch-debug';

// Automatically configures based on NODE_ENV and DEBUG_FETCH
configureVerboseFetch();
```

## Environment Variables

| Variable | Values | Effect |
|----------|--------|--------|
| `BUN_CONFIG_VERBOSE_FETCH` | `'curl'` | Enables verbose fetch logging globally |
| `DEBUG_FETCH` | `'1'` or `'true'` | Auto-enables verbose fetch in fetch-wrapper |
| `NODE_ENV` | `'development'` | Auto-enables verbose fetch in fetch-wrapper |

## Format as Curl Command

Generate curl command strings for documentation:

```typescript
import { formatAsCurl } from './utils/fetch-debug';

const curl = formatAsCurl('https://api.example.com', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token123'
  },
  body: JSON.stringify({ foo: 'bar' })
});

console.log(curl);
// curl -X POST https://api.example.com \
//   -H "Content-Type: application/json" \
//   -H "Authorization: Bearer token123" \
//   -d '{"foo":"bar"}'
```

## Syntax-Highlighted Source Code Preview

Bun's debugger provides syntax-highlighted source code preview when debugging. This works seamlessly with verbose fetch:

1. Run with `bun --inspect` or `bun --inspect-wait`
2. Connect debugger (Chrome DevTools, VS Code, etc.)
3. Set breakpoints in fetch code
4. View syntax-highlighted source with curl output

## Best Practices

1. **Development**: Enable verbose fetch globally for all debugging
2. **Production**: Disable verbose fetch (automatic in fetch-wrapper)
3. **Debugging**: Use `debugFetch()` for one-off verbose requests
4. **Documentation**: Use `formatAsCurl()` to generate curl examples
5. **CI/CD**: Set `DEBUG_FETCH=1` for verbose logging in CI

## Integration Examples

### With Hyper-Bun Components

```typescript
import { MarketProbeService } from './hyper-bun/market-probe-service';
import { enableVerboseFetch } from './utils/fetch-debug';

// Enable verbose fetch for all market probe requests
enableVerboseFetch();

const probeService = new MarketProbeService(authService);
await probeService.probeDarkPoolMarket('betfair', 'market-123');
// Outputs curl command for the probe request
```

### With fetch-wrapper

```typescript
import { fetchWithErrorHandling } from './utils/fetch-wrapper';

// Automatically verbose in development
Bun.env.NODE_ENV = 'development';

const data = await fetchWithErrorHandling('https://api.example.com');
// Outputs curl command automatically
```

## See Also

- [Bun Debugger Documentation](https://bun.com/docs/runtime/debugger#syntax-highlighted-source-code-preview)
- [fetch-wrapper.ts](../src/utils/fetch-wrapper.ts)
- [fetch-debug.ts](../src/utils/fetch-debug.ts)
- [Hyper-Bun Manifesto](./HYPER-BUN-MANIFESTO.md)
