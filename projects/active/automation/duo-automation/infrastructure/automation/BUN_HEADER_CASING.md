# Bun Header Case Preservation

## Overview

As of Bun 1.3.6+, `fetch()` and `node:https` now **preserve header case** when sending HTTP requests. This matches Node.js behavior and ensures compatibility with APIs that require specific header casing.

## Why This Matters

While HTTP headers are technically case-insensitive per RFC 7230, many APIs expect specific casing:
- `Authorization` (not `authorization`)
- `Content-Type` (not `content-type`)
- `X-Custom-Header` (not `x-custom-header`)

Previously, Bun would lowercase all headers, which could break compatibility with services requiring exact header names.

## Current Implementation

Our codebase already uses proper header casing throughout:

### ✅ Correct Usage Examples

```typescript
// notifications.ts - Slack/Teams webhooks
await fetch(webhookUrl, {
  headers: { "Content-Type": "application/json" }
});

// duoplus/sdk.ts - API authentication
await fetch(apiUrl, {
  headers: {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  }
});

// duoplus/phone-provisioning.ts - Device provisioning
await fetch(apiUrl, {
  headers: {
    "Authorization": `Bearer ${this.apiKey}`,
    "Content-Type": "application/json"
  }
});

// duoplus/http-client.ts - Keep-alive connections
await fetch(url, {
  headers: {
    "Connection": keepAlive ? "keep-alive" : "close",
    "Keep-Alive": `timeout=${idleTimeout / 1000}`,
    ...fetchInit.headers
  }
});
```

## Header Casing Standards

### Standard Headers (Pascal-Case)

| Header | Correct | Incorrect |
|--------|---------|-----------|
| Authorization | ✅ `Authorization` | ❌ `authorization` |
| Content-Type | ✅ `Content-Type` | ❌ `content-type` |
| Content-Length | ✅ `Content-Length` | ❌ `content-length` |
| User-Agent | ✅ `User-Agent` | ❌ `user-agent` |
| Connection | ✅ `Connection` | ❌ `connection` |
| Keep-Alive | ✅ `Keep-Alive` | ❌ `keep-alive` |

### Custom Headers (X-Prefix)

| Header | Correct | Incorrect |
|--------|---------|-----------|
| X-API-Key | ✅ `X-API-Key` | ❌ `x-api-key` |
| X-Request-ID | ✅ `X-Request-ID` | ❌ `x-request-id` |
| X-Custom-Header | ✅ `X-Custom-Header` | ❌ `x-custom-header` |

## Best Practices

1. **Always use Pascal-Case for standard headers**
   ```typescript
   // ✅ Good
   headers: { "Authorization": "Bearer token" }
   
   // ❌ Bad
   headers: { "authorization": "Bearer token" }
   ```

2. **Use X-Prefix for custom headers**
   ```typescript
   // ✅ Good
   headers: { "X-Request-ID": requestId }
   
   // ❌ Bad
   headers: { "x-request-id": requestId }
   ```

3. **Headers object preserves case**
   ```typescript
   const headers = new Headers();
   headers.set("Content-Type", "application/json"); // sent as "Content-Type"
   headers.set("Authorization", `Bearer ${token}`); // sent as "Authorization"
   ```

## Verification

All fetch calls in the automation suite have been verified to use proper header casing:

- ✅ `notifications.ts` - `Content-Type`
- ✅ `duoplus/sdk.ts` - `Authorization`, `Content-Type`
- ✅ `duoplus/phone-provisioning.ts` - `Authorization`, `Content-Type`
- ✅ `duoplus/http-client.ts` - `Connection`, `Keep-Alive`

## Migration Notes

If you're upgrading from an older Bun version:

1. **No changes needed** - Our code already uses correct casing
2. **Verify API compatibility** - Some APIs may have been working despite incorrect casing
3. **Test thoroughly** - Header case preservation may expose previously hidden issues

## References

- [Bun Release Notes](https://bun.sh/blog/bun-v1.3.6)
- [RFC 7230 - HTTP/1.1 Message Syntax](https://tools.ietf.org/html/rfc7230)
- [MDN - HTTP Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers)

---

**Last Updated**: 2026-01-26  
**Bun Version**: 1.3.6+
