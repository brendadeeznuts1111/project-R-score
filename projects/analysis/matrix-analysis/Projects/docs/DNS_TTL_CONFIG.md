# DNS Cache TTL Configuration

Bun allows you to configure the DNS cache Time-To-Live (TTL) via environment variable.

## Configuration

### Environment Variable

```bash
BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS=<seconds>
```

### Default Value

**30 seconds** - Bun's default DNS cache TTL

### Why 30 Seconds?

Unfortunately, the system API underneath (`getaddrinfo`) does not provide a way to get the TTL of a DNS entry. This means Bun has to pick a number arbitrarily. 

Bun chose **30 seconds** because:
- ✅ Long enough to see the benefits of caching
- ✅ Short enough to be unlikely to cause issues if a DNS entry changes

### Industry Recommendations

- **Amazon Web Services**: Recommends 5 seconds for the Java Virtual Machine
- **JVM Default**: Caches indefinitely (not recommended)
- **Bun Default**: 30 seconds (balanced approach)

## Usage Examples

### Set TTL to 5 seconds (AWS recommendation)

```bash
BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS=5 bun run my-script.ts
```

### Set TTL to 60 seconds (longer cache)

```bash
BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS=60 bun unified-network-system.ts
```

### Set TTL to 1 second (very short, for testing)

```bash
BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS=1 bun dns-prefetch-performance.ts
```

### Check Current Configuration

The unified network system automatically detects and displays the configured TTL:

```bash
bun unified-network-system.ts
```

Output:
```
🚀 Starting Unified Network Server
📡 Hostname: your-hostname
🔷 IPv4: 192.168.1.100
🔶 IPv6: 2001:db8::1
🌐 WebSocket: ws://your-hostname:3000
💾 Database: Connected
🔍 DNS Cache TTL: 5s (configured)
```

Or if using default:
```
🔍 DNS Cache TTL: 30s (default)
   💡 Set BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS to customize (default: 30s)
```

## Programmatic Access

### Check TTL Configuration

```typescript
import { NetworkResolver } from "./unified-network-system.ts";

const resolver = new NetworkResolver();
const stats = resolver.getDNSCacheStats();

console.log(`TTL: ${stats.config.ttl || stats.config.defaultTtl}s`);
console.log(`Configured: ${stats.config.ttl ? "Yes" : "No (using default)"}`);
```

### Health Endpoint

The unified network server exposes DNS configuration via `/health`:

```bash
curl http://localhost:3000/health
```

Response includes:
```json
{
  "dns": {
    "config": {
      "ttl": 5,
      "defaultTtl": 30
    },
    "bun": {
      "cacheHitsCompleted": 15,
      "cacheMisses": 3,
      "size": 10,
      ...
    }
  }
}
```

## Best Practices

### Development
- Use default (30s) or shorter (5-10s) for faster iteration
- Shorter TTL helps catch DNS changes quickly

### Production
- **Static services**: 30-60 seconds (default is usually fine)
- **Dynamic services**: 5-10 seconds (AWS recommendation)
- **High-traffic**: 30 seconds (good balance)

### Testing
- Use 1-5 seconds to test cache behavior
- Use longer TTLs to test cache effectiveness

## Technical Details

### Why No Native TTL?

The underlying system API (`getaddrinfo`) doesn't provide TTL information from DNS responses. This means:

1. Bun cannot know the actual TTL from DNS servers
2. Bun must use a configurable cache duration
3. The cache is time-based, not TTL-based

### Cache Behavior

- DNS entries are cached for the configured duration
- After TTL expires, next lookup goes to DNS server
- Prefetching (`dns.prefetch()`) still benefits from cache
- Cache stats show hits/misses regardless of TTL setting

## Related APIs

- `dns.prefetch(hostname, port)` - Prefetch DNS entry
- `dns.lookup(hostname, options)` - Resolve hostname
- `dns.getCacheStats()` - Get cache statistics

## See Also

- [Bun DNS Documentation](https://bun.sh/docs/api/dns)
- [Unified Network System](./unified-network-system.ts)
- [DNS Prefetch Performance](./dns-prefetch-performance.ts)
