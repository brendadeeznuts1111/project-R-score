# URLPattern API Reference

**Status**: ✅ Comprehensive API Reference  
**Bun Version**: v1.3.4+  
**Last Updated**: 2025-12-08

## Overview

Complete reference for the URLPattern Web API, covering all methods, properties, and usage patterns.

---

## Constructor

### Syntax

```typescript
new URLPattern(pattern: string | URLPatternInit, baseURL?: string)
```

### From Full URL String

```typescript
const pattern = new URLPattern("https://example.com/users/:id");
```

### From Relative Path String (requires baseURL)

```typescript
const pattern = new URLPattern("/users/:id", "https://example.com");
```

### From URLPatternInit Dictionary

```typescript
const pattern = new URLPattern({
  protocol: "https",
  username: "user",
  password: "pass",
  hostname: "api.example.com",
  port: "8080",
  pathname: "/api/v1/:resource/:id",
  search: "?filter=:filter",
  hash: "#:section"
});
```

**Note**: When defining patterns, include `?` and `#` in `search` and `hash` strings. However, when accessing the properties, these prefixes are not included.

---

## Methods

### test(url: string): boolean

Check if a URL matches the pattern. Returns `true` if the URL matches, `false` otherwise.

**Example**:
```typescript
const pattern = new URLPattern({ pathname: "/api/v1/:resource/:id" });

pattern.test("https://api.example.com/api/v1/users/123");  // true
pattern.test("https://api.example.com/api/v1/posts/456");  // true
pattern.test("https://api.example.com/api/v2/users/123");  // false
```

**Use Cases**:
- Route validation
- URL filtering
- Pattern matching without parameter extraction

---

### exec(url: string): URLPatternResult | null

Extract matched groups from a URL. Returns a `URLPatternResult` object if the URL matches, or `null` if it doesn't.

**Basic Example - Named Parameters**:
```typescript
const pattern = new URLPattern({ pathname: "/users/:id" });
const result = pattern.exec("https://example.com/users/123");
console.log(result.pathname.groups.id); // "123"
```

**Wildcard Matching Example**:
```typescript
const filesPattern = new URLPattern({ pathname: "/files/*" });
const match = filesPattern.exec("https://example.com/files/image.png");
console.log(match.pathname.groups[0]); // "image.png"
```

**Multiple Parameters Example**:
```typescript
const pattern = new URLPattern({
  pathname: "/api/v1/:resource/:id",
  search: "?filter=:filter"
});

const result = pattern.exec("https://api.example.com/api/v1/users/123?filter=active");

if (result) {
  console.log(result.pathname.groups.resource); // "users"
  console.log(result.pathname.groups.id);      // "123"
  console.log(result.search.groups.filter);    // "active"
}
```

**URLPatternResult Structure**:
```typescript
{
  pathname: {
    input: "/api/v1/users/123",
    groups: {
      resource: "users",
      id: "123"
    }
  },
  search: {
    input: "?filter=active",
    groups: {
      filter: "active"
    }
  },
  // ... other URL components
}
```

**Use Cases**:
- Parameter extraction from URLs
- Route parameter parsing
- URL component analysis

---

## Properties

### protocol: string

The protocol pattern (e.g., "https", "http").

**Example**:
```typescript
const pattern = new URLPattern({
  protocol: "https",
  pathname: "/api/:resource"
});
console.log(pattern.protocol); // "https"
```

---

### username: string

The username pattern.

**Example**:
```typescript
const pattern = new URLPattern({
  username: ":user",
  pathname: "/api/:resource"
});
console.log(pattern.username); // ":user"
```

---

### password: string

The password pattern.

**Example**:
```typescript
const pattern = new URLPattern({
  password: ":pass",
  pathname: "/api/:resource"
});
console.log(pattern.password); // ":pass"
```

---

### hostname: string

The hostname pattern. Supports wildcards with `*`.

**Example**:
```typescript
const pattern = new URLPattern({
  hostname: "*.example.com",
  pathname: "/api/:resource"
});
console.log(pattern.hostname); // "*.example.com"
```

**Wildcard Examples**:
- `"*.example.com"` - Matches any subdomain
- `"api.example.com"` - Exact match
- `":subdomain.example.com"` - Named group

---

### port: string

The port pattern.

**Example**:
```typescript
const pattern = new URLPattern({
  port: ":port",
  pathname: "/api/:resource"
});
console.log(pattern.port); // ":port"
```

---

### pathname: string

The pathname pattern. This is the most commonly used property.

**Example**:
```typescript
const pattern = new URLPattern({
  pathname: "/api/v1/:resource/:id"
});
console.log(pattern.pathname); // "/api/v1/:resource/:id"
```

**Common Patterns**:
- `"/users/:id"` - Single parameter
- `"/api/v1/:resource/:id"` - Multiple parameters
- `"/files/*"` - Wildcard matching
- `"/users/:id(\\d+)"` - Regex validation

---

### search: string

The search (query string) pattern. **Note**: The `?` prefix is not included in the property value.

**Example**:
```typescript
const pattern = new URLPattern({
  pathname: "/api/logs",
  search: "?level=:level"
});
console.log(pattern.search); // "level=:level" (no '?')
```

**Important**: When defining the pattern, include `?` in the string. When accessing the property, it's omitted.

---

### hash: string

The hash (fragment) pattern. **Note**: The `#` prefix is not included in the property value.

**Example**:
```typescript
const pattern = new URLPattern({
  pathname: "/docs/:page",
  hash: "#:section"
});
console.log(pattern.hash); // ":section" (no '#')
```

**Important**: When defining the pattern, include `#` in the string. When accessing the property, it's omitted.

---

### hasRegExpGroups: boolean

Detects if the pattern uses custom regular expressions. This property helps identify patterns that may have performance implications or require special handling.

**Example**:
```typescript
const simplePattern = new URLPattern({ pathname: "/users/:id" });
console.log(simplePattern.hasRegExpGroups); // false

const regexPattern = new URLPattern({ pathname: "/users/:id(\\d+)" });
console.log(regexPattern.hasRegExpGroups); // true
```

**Use Cases**:
- **Performance optimization**: Regex patterns are slower than simple named groups
- **Pattern validation**: Ensure patterns match expected complexity
- **Debugging**: Identify why a pattern might be slow
- **Caching strategies**: Cache simple patterns differently from regex patterns

**Performance Note**: Patterns with `hasRegExpGroups: true` require regex compilation and matching, which is slower than simple string matching. Consider caching regex patterns or using simpler patterns when possible.

---

## Pattern Syntax

### Named Groups

```typescript
// Single parameter
"/users/:id"

// Multiple parameters
"/api/v1/:resource/:id/:action"

// Optional parameters (not supported - use separate patterns or regex)
```

### Wildcards

```typescript
// Match any path segment
"/files/*"

// Match specific file extensions
"/images/*.png"
```

### Regular Expressions

```typescript
// Numeric ID validation
"/users/:id(\\d+)"

// Alphanumeric validation
"/users/:id([a-zA-Z0-9]+)"

// Multiple options
"/api/:version(v1|v2|v3)"
```

### Hostname Wildcards

```typescript
// Match any subdomain
hostname: "*.example.com"

// Match specific subdomain
hostname: "api.example.com"
```

---

## Complete Example

```typescript
// Create pattern with all components
const pattern = new URLPattern({
  protocol: "https",
  username: ":user",
  password: ":pass",
  hostname: "*.example.com",
  port: ":port",
  pathname: "/api/v:version(\\d+)/:resource",
  search: "?filter=:filter&sort=:sort",
  hash: "#:section"
});

// Test URL
const url = "https://admin:secret@api.example.com:8080/api/v1/users?filter=active&sort=name#details";

// Check if matches
if (pattern.test(url)) {
  // Extract parameters
  const result = pattern.exec(url);
  
  if (result) {
    console.log("Username:", result.username.groups.user);      // "admin"
    console.log("Password:", result.password.groups.pass);      // "secret"
    console.log("Port:", result.port.groups.port);              // "8080"
    console.log("Version:", result.pathname.groups.version);     // "v1"
    console.log("Resource:", result.pathname.groups.resource);  // "users"
    console.log("Filter:", result.search.groups.filter);         // "active"
    console.log("Sort:", result.search.groups.sort);            // "name"
    console.log("Section:", result.hash.groups.section);         // "details"
  }
}

// Access pattern properties
console.log("Protocol:", pattern.protocol);   // "https"
console.log("Hostname:", pattern.hostname);   // "*.example.com"
console.log("Pathname:", pattern.pathname);   // "/api/v:version(\\d+)/:resource"
console.log("Search:", pattern.search);       // "filter=:filter&sort=:sort" (no '?')
console.log("Hash:", pattern.hash);           // ":section" (no '#')
console.log("Has Regex:", pattern.hasRegExpGroups); // true
```

---

## Test Coverage

**Test File**: `test/urlpattern-api-comprehensive.test.ts`

**Coverage**:
- ✅ Constructor (from strings and dictionaries)
- ✅ test() method (all matching scenarios)
- ✅ exec() method (all extraction scenarios)
- ✅ All pattern properties
- ✅ hasRegExpGroups property
- ✅ Integration examples

**Run Tests**:
```bash
bun test test/urlpattern-api-comprehensive.test.ts
```

---

## Web Platform Tests Compliance

Bun's URLPattern implementation passes **408 Web Platform Tests**, ensuring full compliance with the Web Standard API specification.

**Credits**: Thanks to the WebKit team for implementing this!

**Test Suite**: [Web Platform Tests - URLPattern](https://github.com/web-platform-tests/wpt/tree/master/urlpattern)

**Compliance Areas**:
- ✅ Pattern matching
- ✅ Parameter extraction
- ✅ Wildcard handling
- ✅ Regex group support
- ✅ URL component parsing
- ✅ Edge cases and error handling

---

## Related Documentation

- [Bun 1.3.4 URLPattern API](./BUN-1.3.4-URLPATTERN-API.md) - Integration guide
- [URLPattern Web Platform Tests](./URLPATTERN-WEB-PLATFORM-TESTS.md) - Test compliance details
- [URLPattern Quick Reference](./operators/url-pattern-quickref.md) - Quick reference
- [MDN URLPattern Documentation](https://developer.mozilla.org/en-US/docs/Web/API/URLPattern)
- [Web Platform Tests](https://github.com/web-platform-tests/wpt/tree/master/urlpattern) - Official test suite

---

**Last Updated**: 2025-12-08  
**Status**: ✅ Complete  
**Web Platform Tests**: ✅ 408 Tests Passing  
**Credits**: Thanks to the WebKit team!
