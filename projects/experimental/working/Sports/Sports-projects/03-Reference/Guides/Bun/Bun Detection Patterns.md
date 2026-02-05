---
title: Bun detection patterns
type: reference
status: active
version: 1.0.0
created: 2025-11-14
updated: 2025-11-14
modified: 2025-11-15
category: reference
description: Documentation for Bun Detection Patterns
acceptEncoding: ""
acceptLanguage: ""
author: Sports Analytics Team
browser: ""
browserName: ""
browserVersion: ""
cacheControl: ""
connectionType: ""
cookies: {}
cookiesRaw: ""
deprecated: false
deviceBrand: ""
deviceModel: ""
deviceType: ""
dns: ""
e_tag: ""
etag: ""
ip: ""
ip4: ""
ip6: ""
ipv4: ""
ipv6: ""
isBot: false
isMobile: false
os: ""
osName: ""
osVersion: ""
referer: ""
referrer: ""
replaces: ""
requestId: ""
requestMethod: GET
requestPath: ""
tags: []
usage: ""
user_agent: ""
userAgentRaw: ""
xff: []
xForwardedFor: []
---
# Bun Detection Patterns - Best Practices

**Reference**: [Bun Documentation - Detect when code is executed with Bun](https://bun.com/docs/runtime/detect-bun)

---

## 🎯 Recommended Patterns

### Pattern 1: Check `typeof Bun` (JavaScript/TypeScript with @types/bun)

```typescript
if (typeof Bun !== "undefined") {
  // This code will only run when the file is run with Bun
  console.log("Running in Bun!");
}
```

**Use When**:
- ✅ You have `@types/bun` installed
- ✅ TypeScript environment with proper types
- ✅ JavaScript files

**Pros**:
- Simple and clear
- Similar to checking `window` in browser code
- Direct check of Bun global

**Cons**:
- Requires `@types/bun` for TypeScript
- Type errors without proper types

---

### Pattern 2: Check `process.versions.bun` (TypeScript-safe)

```typescript
if (process.versions.bun) {
  // This code will only run when the file is run with Bun
  console.log("Running in Bun!");
}
```

**Use When**:
- ✅ TypeScript environments without `@types/bun`
- ✅ Want to avoid type errors
- ✅ Need compatibility with Node.js types

**Pros**:
- ✅ No type errors in TypeScript
- ✅ Works with standard Node.js types
- ✅ More explicit about checking runtime version

**Cons**:
- Slightly more verbose
- Requires `process` to exist

---

## 📊 Current Codebase Usage

### Found Usage

**File**: `packages/bun-platform/src/utils/component-parser.ts`
```typescript
if (process.versions.bun && (Bun as any).Semver) {
  // Uses process.versions.bun for TypeScript safety
}
```

**Status**: ✅ **UPDATED** - Now uses recommended TypeScript-safe pattern

---

## 🔧 Recommended Updates

### Update component-parser.ts

**Current**:
```typescript
if (typeof Bun !== 'undefined' && (Bun as any).Semver) {
```

**Recommended**:
```typescript
if (process.versions.bun && (Bun as any).Semver) {
```

**Why**: Avoids potential type errors, more explicit

---

## 📋 Detection Patterns by Use Case

### 1. Runtime Detection (Simple)
```typescript
// Check if running in Bun
const isBun = typeof Bun !== "undefined";
// or
const isBun = !!process.versions.bun;
```

### 2. Feature Detection
```typescript
// Check for specific Bun features
if (process.versions.bun && Bun.file) {
  // Use Bun-specific file APIs
}
```

### 3. Fallback Pattern
```typescript
// Use Bun APIs with Node.js fallback
const readFile = process.versions.bun 
  ? Bun.file(path).text()
  : require('fs').promises.readFile(path, 'utf-8');
```

### 4. Conditional Execution
```typescript
// Only run Bun-specific code
if (process.versions.bun) {
  // Bun-only code here
} else {
  // Node.js fallback
}
```

---

## ✅ Best Practices

1. **Use `process.versions.bun` for TypeScript**:
   - Avoids type errors
   - Works with standard Node.js types
   - More explicit

2. **Use `typeof Bun` for JavaScript**:
   - Simpler syntax
   - Clear intent
   - Works if you have @types/bun

3. **Check for Features, Not Just Runtime**:
   - Don't just check if Bun exists
   - Check for specific APIs you need
   - Example: `Bun.file`, `Bun.serve`, etc.

4. **Provide Fallbacks**:
   - If code needs to work in Node.js too
   - Use feature detection
   - Graceful degradation

---

## 🔍 When to Use Each Pattern

| Scenario | Recommended Pattern | Reason |
|----------|---------------------|--------|
| TypeScript without @types/bun | `process.versions.bun` | No type errors |
| TypeScript with @types/bun | `typeof Bun !== "undefined"` | Simpler |
| JavaScript | `typeof Bun !== "undefined"` | Clear and simple |
| Feature detection | `process.versions.bun && Bun.feature` | Explicit |
| Cross-runtime code | `process.versions.bun` | More compatible |

---

## 📝 Examples in Codebase

### Current Usage
```typescript
// packages/bun-platform/src/utils/component-parser.ts
if (typeof Bun !== 'undefined' && (Bun as any).Semver) {
  // Uses Bun Semver
}
```

### Recommended Update
```typescript
// More TypeScript-friendly
if (process.versions.bun && (Bun as any).Semver) {
  // Uses Bun Semver
}
```

---

## 🎯 Summary

**For TypeScript**: Use `process.versions.bun`  
**For JavaScript**: Use `typeof Bun !== "undefined"`  
**For Feature Detection**: Check both runtime and feature existence

**Current Status**: ✅ **UPDATED** - Codebase now uses TypeScript-safe `process.versions.bun` pattern

---

**Reference**: https://bun.com/docs/runtime/detect-bun

