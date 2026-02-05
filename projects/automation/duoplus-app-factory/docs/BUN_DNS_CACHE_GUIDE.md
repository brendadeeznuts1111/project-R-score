# 🌐 Bun DNS Cache Live Stats Dashboard

A lightweight DNS cache monitoring tool that shows real-time hit-ratio, cache size, and performance metrics. Perfect for optimizing your DNS prefetch and pre-connect strategy.

## Quick Start

```bash
# Terminal 1: Run your app
bun your-app.ts

# Terminal 2: Monitor DNS cache
bun bun-dns-live-stats.ts

# Or with custom TTL (5 seconds instead of default 30)
BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS=5 bun bun-dns-live-stats.ts
```

## What You'll See

```
🌐 DNS Cache Live View  (TTL: 30s)

Hit ratio : ✅ 92.3% ████████████████████████████████████████░
Hits      :    723 completed +      4 in-flight
Misses    :     61
Errors    :      2
Size      :     12/255

Recent hit-ratio trend (► = now)
▃▄▅▅▆▆▇▇██████████████████████████████████████████████████ ►

📊 Interpretation:
   ✅ Excellent! Prefetch/pre-connect strategy is working.
   ℹ️  Cache is small - plenty of room for more entries.
```

## Metrics Explained

### Hit Ratio
- **Formula:** `(cacheHitsCompleted + cacheHitsInflight) / totalCount * 100`
- **What it means:** Percentage of DNS lookups served from cache
- **Target:** ≥ 90% for optimal performance

### Hits
- **Completed:** DNS queries resolved from cache
- **In-flight:** Queries currently being resolved (will be cached)

### Misses
- **Count:** DNS queries that required a network lookup
- **Indicates:** Cache misses or new domains

### Errors
- **Count:** Failed DNS lookups (bad hosts, network issues)
- **Action:** Investigate if growing; failed hosts are evicted

### Size
- **Format:** `current/255`
- **Max:** 255 entries
- **Warning:** If > 200, consider lowering TTL or raising limit

## Performance Interpretation

### ✅ Hit Ratio ≥ 90%
Your prefetch/pre-connect strategy is working well. DNS lookups are being cached effectively.

```typescript
// Good prefetch strategy
<link rel="dns-prefetch" href="//api.example.com">
<link rel="preconnect" href="//cdn.example.com">
```

### ⚠️ Hit Ratio 70-89%
Good performance, but room for improvement. Consider:
- Adding more DNS prefetch hints
- Increasing TTL
- Pre-connecting to more critical domains

### ❌ Hit Ratio < 70%
Low cache effectiveness. Actions:
- Add DNS prefetch for all external domains
- Use preconnect for critical resources
- Check if TTL is too low
- Verify cache isn't being cleared

## Configuration

### TTL (Time To Live)

```bash
# Default: 30 seconds
bun bun-dns-live-stats.ts

# Custom: 5 seconds (shorter cache)
BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS=5 bun bun-dns-live-stats.ts

# Custom: 60 seconds (longer cache)
BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS=60 bun bun-dns-live-stats.ts
```

**When to adjust:**
- **Lower TTL (5-10s):** Frequently changing DNS records
- **Higher TTL (60-120s):** Stable infrastructure, better cache hits

### Cache Size Limit

Default: 255 entries

If you hit the limit:
1. Lower TTL to evict stale entries faster
2. Reduce number of unique domains
3. Use connection pooling to reuse connections

## Real-World Example

### Scenario: Web App with Multiple APIs

```typescript
// app.ts
import { serve } from "bun";

serve({
  port: 3000,
  async fetch(req) {
    // These domains will be cached after first lookup
    const api1 = await fetch("https://api.example.com/data");
    const api2 = await fetch("https://cdn.example.com/assets");
    const api3 = await fetch("https://analytics.example.com/track");
    
    return new Response("OK");
  },
});
```

### Monitor with DNS Dashboard

```bash
# Terminal 1
bun app.ts

# Terminal 2
bun bun-dns-live-stats.ts
```

**Expected progression:**
1. **First 30 seconds:** Hit ratio climbs from 0% to ~90%
2. **After 30s:** Stable at 90%+ (cache working)
3. **If TTL expires:** Ratio dips, then recovers

## Optimization Tips

### 1. DNS Prefetch (HTML)
```html
<link rel="dns-prefetch" href="//api.example.com">
<link rel="dns-prefetch" href="//cdn.example.com">
<link rel="dns-prefetch" href="//analytics.example.com">
```

### 2. Preconnect (HTML)
```html
<!-- For critical resources -->
<link rel="preconnect" href="//api.example.com">
<link rel="preconnect" href="//cdn.example.com">
```

### 3. Connection Pooling (Bun)
```typescript
// Reuse connections to reduce DNS lookups
const pool = new Map<string, Response>();

async function cachedFetch(url: string) {
  if (pool.has(url)) return pool.get(url);
  const res = await fetch(url);
  pool.set(url, res);
  return res;
}
```

### 4. Batch Requests
```typescript
// Instead of sequential requests
const [api1, api2, api3] = await Promise.all([
  fetch("https://api.example.com/data"),
  fetch("https://cdn.example.com/assets"),
  fetch("https://analytics.example.com/track"),
]);
```

## Troubleshooting

### Hit Ratio Stuck at 0%
- Check if DNS is working: `nslookup example.com`
- Verify TTL is set correctly
- Check for DNS errors in the dashboard

### Cache Size Growing Too Fast
- Lower TTL to evict entries faster
- Reduce number of unique domains
- Check for DNS resolution errors

### High Error Count
- Verify domain names are correct
- Check network connectivity
- Investigate failed hosts (they're evicted)

## Code Reference

### dns.getCacheStats()

```typescript
interface DNSCacheStats {
  cacheHitsCompleted: number;  // Resolved from cache
  cacheHitsInflight: number;   // Currently resolving
  cacheMisses: number;         // Required network lookup
  errors: number;              // Failed lookups
  size: number;                // Current cache entries
  totalCount: number;          // Total lookups
}
```

### Hit Ratio Calculation

```typescript
const hitRatio = (
  (stats.cacheHitsCompleted + stats.cacheHitsInflight) / 
  stats.totalCount
) * 100;
```

## See Also

- [bun-dns-live-stats.ts](./bun-dns-live-stats.ts) - Live monitoring tool
- [Bun DNS Documentation](https://bun.sh/docs)
- [MDN: DNS Prefetch](https://developer.mozilla.org/en-US/docs/Web/Performance/dns-prefetch)
- [MDN: Preconnect](https://developer.mozilla.org/en-US/docs/Web/Link/preconnect)

