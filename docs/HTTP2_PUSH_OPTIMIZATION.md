# HTTP/2 Push Optimization Plan

**Target**: P_ratio 1.000 → 1.050 (+0.05)

## Overview

HTTP/2 Server Push allows servers to proactively send resources to clients before they're requested, reducing round-trip latency and improving perceived performance.

## Current State

- **P_ratio**: 1.000 (Native HTTP/1.1 via Bun.fetch)
- **Status**: Optimal for HTTP/1.1, but HTTP/2 push can exceed 1.0

## Implementation Strategy

### Phase 1: HTTP/2 Detection

```typescript
// lib/http2-detection.ts
export function detectHTTP2Support(url: string): Promise<boolean> {
  // Check if server supports HTTP/2
  // Use ALPN negotiation via Bun.connect()
}
```

### Phase 2: Push Promise Implementation

```typescript
// lib/http2-push.ts
export interface PushPromise {
  path: string;
  priority: number;
  dependencies?: string[];
}

export async function fetchWithPush(
  url: string,
  pushPromises: PushPromise[]
): Promise<Response> {
  // Use Bun.connect() with HTTP/2
  // Send PUSH_PROMISE frames for related resources
  // Return main response + pushed resources
}
```

### Phase 3: Resource Discovery

```typescript
// lib/resource-discovery.ts
export async function discoverRelatedResources(
  html: string,
  baseUrl: string
): Promise<PushPromise[]> {
  // Parse HTML for:
  // - CSS links (<link rel="stylesheet">)
  // - JS scripts (<script src>)
  // - Images (<img src>)
  // - Prefetch hints (<link rel="prefetch">)
  
  // Return prioritized list of resources to push
}
```

### Phase 4: Integration with validate-pointers.ts

```typescript
// In validatePointer function
if (pointer.startsWith('https://')) {
  const response = await hardenedFetch({
    url: pointer,
    timeout: 5000,
    method: 'HEAD',
  });
  
  // If HTML response, discover and push related resources
  if (response.headers.get('content-type')?.includes('text/html')) {
    const html = await response.text();
    const pushPromises = await discoverRelatedResources(html, pointer);
    await fetchWithPush(pointer, pushPromises);
  }
}
```

## Expected Impact

| Metric | Before | After | Gain |
|--------|--------|-------|------|
| **P_ratio** | 1.000 | 1.050 | +0.05 |
| **Latency** | Baseline | -20% | Reduced RTT |
| **Throughput** | Baseline | +15% | More efficient |

## Technical Considerations

### Bun HTTP/2 Support

- Check Bun version compatibility (requires HTTP/2 support)
- Use `Bun.connect()` with HTTP/2 protocol negotiation
- Handle PUSH_PROMISE frames in socket handlers

### Cache Validation

- Respect `Cache-Control` headers
- Don't push resources already in cache
- Use `Vary` header for content negotiation

### Priority Handling

- CSS: High priority (blocks rendering)
- JS: Medium priority (may block execution)
- Images: Low priority (non-blocking)

## Implementation Checklist

- [ ] HTTP/2 detection via ALPN
- [ ] PUSH_PROMISE frame handling
- [ ] Resource discovery from HTML
- [ ] Priority-based push ordering
- [ ] Cache-aware push decisions
- [ ] Integration with hardened-fetch
- [ ] Metrics tracking for push effectiveness
- [ ] Fallback to HTTP/1.1 if HTTP/2 unavailable

## Timeline

- **Week 1**: HTTP/2 detection and basic push implementation
- **Week 2**: Resource discovery and prioritization
- **Week 3**: Integration and testing
- **Week 4**: Metrics and optimization

## Success Criteria

- P_ratio > 1.000 (HTTP/2 push active)
- Reduced latency for HTML pages
- No degradation for non-HTML resources
- Backward compatible with HTTP/1.1

## Related Files

- `lib/hardened-fetch.ts` - Base fetch implementation
- `lib/memory-pool.ts` - Memory optimization (complementary)
- `scripts/validate-pointers.ts` - Integration point

## References

- [HTTP/2 Specification (RFC 7540)](https://tools.ietf.org/html/rfc7540)
- [HTTP/2 Server Push Best Practices](https://web.dev/http2-server-push/)
- [Bun HTTP/2 Documentation](https://bun.sh/docs/api/http)
