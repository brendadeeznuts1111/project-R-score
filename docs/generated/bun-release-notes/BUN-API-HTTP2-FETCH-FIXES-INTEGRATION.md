# Bun APIs, HTTP/2, and Fetch API Fixes - Integration Guide

## Overview
This document tracks Bun fixes for JSONC/TOML parsing, HTTP/2 protocol compliance, and Fetch API stability.

## Fixes Applied

### 1. Bun.JSONC.parse & Bun.TOML.parse - Stack Overflow Protection
**Fix:** Added stack overflow checks for deeply nested structures
**Files:** `factorywager/registry/packages/dev-dashboard/src/core/init.ts`

**Documentation added:**
```typescript
/**
 * Load TOML configs using Bun's native TOML.parse API
 * 🔒 BUN FIX: Bun.TOML.parse now has stack overflow protection
 */
```

---

### 2. HTTP/2 Protocol Fixes
**Fixes:**
- No extra empty DATA frames (AWS ALB compatibility)
- DEFAULT_WINDOW_SIZE until SETTINGS_ACK (RFC 7540 Section 6.5.1)
- NGHTTP2_PROTOCOL_ERROR with Fauna fixed
- gRPC NGHTTP2_FRAME_SIZE_ERROR with non-default maxFrameSize fixed
- Settings validation (no truncation)
- Stream window adjustment on INITIAL_WINDOW_SIZE change
- maxHeaderListSize checking (RFC 7540 Section 6.5.2)
- HPACK entry overhead tracking
- Custom settings validation (max 10)
- Setting ID/value validation per RFC 7540

**Files:** `projects/games/2048/demos/bun-136-http2-flowcontrol.ts`

---

### 3. Fetch API Fixes
**Fixes:**
- HTTP proxy with redirects: no crash on socket close
- mTLS: per-request certificates respected
- Request.prototype.text(): fixed method binding
- Request constructor: cache/mode options respected
- NO_PROXY: port numbers respected

**Files:** `src/fetch/enhanced-fetch.ts`

---

## Demo File
- `DEMO-BUN-API-HTTP2-FETCH-FIXES.ts` - Interactive demonstration

Run with:
```bash
bun DEMO-BUN-API-HTTP2-FETCH-FIXES.ts
```

## Files Modified
- `factorywager/registry/packages/dev-dashboard/src/core/init.ts` - TOML.parse fix
- `projects/games/2048/demos/bun-136-http2-flowcontrol.ts` - HTTP/2 fixes
- `src/fetch/enhanced-fetch.ts` - Fetch API fixes

## Migration Notes
- All fixes are automatic in Bun 1.3.10+
- HTTP/2 servers now work correctly with AWS ALB, Fauna, gRPC
- mTLS fetch requests use correct certificates per-request
- NO_PROXY with port numbers works as expected
