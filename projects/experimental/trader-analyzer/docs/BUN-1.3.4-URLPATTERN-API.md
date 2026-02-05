# Bun v1.3.4 URLPattern API Integration

**Status**: 🟢 **AVAILABLE** | Bun v1.3.4+ Web API Support

Bun now supports the URLPattern Web API, providing declarative pattern matching for URLs—similar to how regular expressions work for strings. This is especially useful for routing in web servers and frameworks.

**Version**: Bun 1.3.4+  
**Last Updated**: 2025-12-07

---

## Overview

The URLPattern API provides a powerful, declarative way to match and extract parameters from URLs. This is especially useful for:

- **Web Server Routing**: Pattern-based route matching
- **API Endpoint Parsing**: Extract path parameters declaratively
- **URL Validation**: Test if URLs match expected patterns
- **Parameter Extraction**: Get named groups from URLs

**Cross-reference**: [Bun v1.3.4 Release Notes](https://bun.com/blog/bun-v1.3.4#urlpattern-api)

---

## Basic Usage

### Pattern Matching

```typescript
// Match URLs with a user ID parameter
const pattern = new URLPattern({ pathname: "/users/:id" });

pattern.test("https://example.com/users/123"); // true
pattern.test("https://example.com/posts/456"); // false
```

### Parameter Extraction

```typescript
const pattern = new URLPattern({ pathname: "/users/:id" });
const result = pattern.exec("https://example.com/users/123");

console.log(result.pathname.groups.id); // "123"
```

### Wildcard Matching

```typescript
// Wildcard matching
const filesPattern = new URLPattern({ pathname: "/files/*" });
const match = filesPattern.exec("https://example.com/files/image.png");

console.log(match.pathname.groups[0]); // "image.png"
```

---

## API Reference

### Constructor

Create patterns from strings or URLPatternInit dictionaries:

```typescript
// From full URL string
const pattern1 = new URLPattern("https://example.com/users/:id");

// From relative path string (requires baseURL)
const pattern2 = new URLPattern("/users/:id", "https://example.com");

// From URLPatternInit object
const pattern3 = new URLPattern({
  protocol: "https",
  hostname: "example.com",
  pathname: "/users/:id"
});

// Full pattern with all components
const pattern4 = new URLPattern({
  protocol: "https",
  username: "user",
  password: "pass",
  hostname: "example.com",
  port: "8080",
  pathname: "/api/v1/:resource/:id",
  search: "?filter=:filter",  // '?' included in pattern definition
  hash: "#:section"             // '#' included in pattern definition
});

// Note: When accessing properties, search and hash don't include '?' and '#'
console.log(pattern4.search);  // "filter=:filter" (no '?')
console.log(pattern4.hash);    // ":section" (no '#')
```

### test()

Check if a URL matches the pattern (returns boolean):

```typescript
const pattern = new URLPattern({ pathname: "/api/v1/:resource/:id" });

pattern.test("https://api.example.com/api/v1/users/123"); // true
pattern.test("https://api.example.com/api/v1/posts/456"); // true
pattern.test("https://api.example.com/api/v2/users/123"); // false
```

### exec()

Extract matched groups from a URL (returns URLPatternResult or null):

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

### Pattern Properties

Access individual pattern components:

```typescript
const pattern = new URLPattern({
  protocol: "https",
  hostname: "*.example.com",
  pathname: "/api/:version/:resource"
});

console.log(pattern.protocol);   // "https"
console.log(pattern.hostname);   // "*.example.com"
console.log(pattern.pathname);   // "/api/:version/:resource"
console.log(pattern.username);   // undefined (if not set)
console.log(pattern.password);   // undefined (if not set)
console.log(pattern.port);       // undefined (if not set)
console.log(pattern.search);     // "level=:level" (note: '?' prefix not included)
console.log(pattern.hash);       // ":section" (note: '#' prefix not included)
```

**Note**: The `search` and `hash` properties do not include the `?` and `#` prefixes respectively. These are only used when matching URLs.

### hasRegExpGroups

Detect if the pattern uses custom regular expressions:

```typescript
const simplePattern = new URLPattern({ pathname: "/users/:id" });
console.log(simplePattern.hasRegExpGroups); // false

const regexPattern = new URLPattern({ pathname: "/users/:id(\\d+)" });
console.log(regexPattern.hasRegExpGroups); // true
```

**Use Cases**:
- Performance optimization (regex patterns are slower)
- Pattern validation
- Debugging pattern complexity
- Caching strategies (cache simple patterns differently)

---

## Integration Examples

### Hono Route Handler Enhancement

```typescript
import { Hono } from "hono";

const app = new Hono();

// Using URLPattern for route matching
const userPattern = new URLPattern({ pathname: "/api/v1/users/:id" });

app.get("/api/v1/users/:id", async (c) => {
  const url = new URL(c.req.url);
  const match = userPattern.exec(url.toString());
  
  if (match) {
    const userId = match.pathname.groups.id;
    // Use userId for database query
    return c.json({ userId, ... });
  }
  
  return c.json({ error: "Invalid route" }, 400);
});
```

### API Route Parameter Extraction

```typescript
// Extract multiple parameters from complex routes
const apiPattern = new URLPattern({
  pathname: "/api/v1/:resource/:id/:action",
  search: "?include=:include"
});

function extractRouteParams(url: string) {
  const match = apiPattern.exec(url);
  if (!match) return null;
  
  return {
    resource: match.pathname.groups.resource,
    id: match.pathname.groups.id,
    action: match.pathname.groups.action,
    include: match.search.groups.include
  };
}

// Usage
const params = extractRouteParams("https://api.example.com/api/v1/secrets/hyperbun/TELEGRAM_BOT_TOKEN/get?include=metadata");
// { resource: "secrets", id: "hyperbun", action: "TELEGRAM_BOT_TOKEN", include: "metadata" }
```

### Route Validation Middleware

```typescript
// Validate routes before processing
const validRoutes = [
  new URLPattern({ pathname: "/api/v1/auth/:action" }),
  new URLPattern({ pathname: "/api/v1/secrets/:server/:type" }),
  new URLPattern({ pathname: "/api/v1/graph" }),
  new URLPattern({ pathname: "/api/v1/logs" })
];

function isValidRoute(url: string): boolean {
  return validRoutes.some(pattern => pattern.test(url));
}

// Middleware
app.use("*", async (c, next) => {
  if (!isValidRoute(c.req.url)) {
    return c.json({ error: "Invalid route" }, 404);
  }
  await next();
});
```

### Wildcard File Matching

```typescript
// Match file paths with wildcards
const staticFilePattern = new URLPattern({ pathname: "/static/*" });
const imagePattern = new URLPattern({ pathname: "/images/*.png" });

function serveStaticFile(url: string) {
  const fileMatch = staticFilePattern.exec(url);
  if (fileMatch) {
    const filePath = fileMatch.pathname.groups[0];
    // Serve file from static directory
    return Bun.file(`./static/${filePath}`);
  }
  
  const imageMatch = imagePattern.exec(url);
  if (imageMatch) {
    const imageName = imageMatch.pathname.groups[0];
    return Bun.file(`./images/${imageName}`);
  }
  
  return null;
}
```

---

## Advanced Patterns

### Regular Expression Groups

```typescript
// Use regex for parameter validation
const numericIdPattern = new URLPattern({
  pathname: "/users/:id(\\d+)"
});

numericIdPattern.test("https://example.com/users/123");  // true
numericIdPattern.test("https://example.com/users/abc");   // false
```

### Multiple Patterns

```typescript
// Match multiple patterns
const patterns = [
  new URLPattern({ pathname: "/api/v1/:resource" }),
  new URLPattern({ pathname: "/api/v2/:resource" })
];

function matchAny(url: string) {
  for (const pattern of patterns) {
    const match = pattern.exec(url);
    if (match) return match;
  }
  return null;
}
```

### Protocol and Hostname Matching

```typescript
// Match specific domains
const apiPattern = new URLPattern({
  protocol: "https",
  hostname: "api.example.com",
  pathname: "/v1/:endpoint"
});

apiPattern.test("https://api.example.com/v1/users");     // true
apiPattern.test("http://api.example.com/v1/users");      // false (wrong protocol)
apiPattern.test("https://www.example.com/v1/users");    // false (wrong hostname)
```

---

## Performance Considerations

### Pattern Caching

```typescript
// Cache patterns for reuse
const patternCache = new Map<string, URLPattern>();

function getPattern(template: string): URLPattern {
  if (!patternCache.has(template)) {
    patternCache.set(template, new URLPattern({ pathname: template }));
  }
  return patternCache.get(template)!;
}

// Usage
const userPattern = getPattern("/api/v1/users/:id");
```

### Pre-compiled Patterns

```typescript
// Pre-compile common patterns at startup
const COMMON_PATTERNS = {
  user: new URLPattern({ pathname: "/api/v1/users/:id" }),
  secret: new URLPattern({ pathname: "/api/v1/secrets/:server/:type" }),
  graph: new URLPattern({ pathname: "/api/v1/graph" }),
  logs: new URLPattern({ pathname: "/api/v1/logs" })
};

// Fast lookup
function getRouteType(url: string): string | null {
  for (const [type, pattern] of Object.entries(COMMON_PATTERNS)) {
    if (pattern.test(url)) return type;
  }
  return null;
}
```

---

## Testing

### Unit Tests

```typescript
import { test, expect } from "bun:test";

test("URLPattern matches user routes", () => {
  const pattern = new URLPattern({ pathname: "/api/v1/users/:id" });
  
  expect(pattern.test("https://api.example.com/api/v1/users/123")).toBe(true);
  expect(pattern.test("https://api.example.com/api/v1/posts/456")).toBe(false);
});

test("URLPattern extracts parameters", () => {
  const pattern = new URLPattern({ pathname: "/api/v1/users/:id" });
  const result = pattern.exec("https://api.example.com/api/v1/users/123");
  
  expect(result).not.toBeNull();
  expect(result!.pathname.groups.id).toBe("123");
});
```

---

## Migration Guide

### From Manual Parsing

**Before** (manual parsing):
```typescript
app.get("/api/v1/users/:id", async (c) => {
  const pathParts = c.req.path.split("/");
  const userId = pathParts[pathParts.length - 1];
  // ...
});
```

**After** (URLPattern):
```typescript
const userPattern = new URLPattern({ pathname: "/api/v1/users/:id" });

app.get("/api/v1/users/:id", async (c) => {
  const match = userPattern.exec(c.req.url);
  const userId = match?.pathname.groups.id;
  // ...
});
```

### From Regular Expressions

**Before** (regex):
```typescript
const userRouteRegex = /^\/api\/v1\/users\/(\d+)$/;
const match = c.req.path.match(userRouteRegex);
const userId = match?.[1];
```

**After** (URLPattern):
```typescript
const userPattern = new URLPattern({ pathname: "/api/v1/users/:id(\\d+)" });
const match = userPattern.exec(c.req.url);
const userId = match?.pathname.groups.id;
```

---

## Browser Compatibility

URLPattern is a Web Standard API. Bun's implementation passes **408 Web Platform Tests**.

**Web Platform Tests**: 408 tests pass for this implementation. Thanks to the WebKit team for implementing this!

**Browser Support**:
- ✅ Bun 1.3.4+
- ✅ Chrome 95+
- ✅ Edge 95+
- ✅ Safari 16.4+
- ✅ Firefox (via polyfill)

**Ripgrep Pattern**: `URLPattern|url.*pattern|pathname.*:id`

---

## Related Documentation

- [Bun v1.3.4 Release Notes](https://bun.com/blog/bun-v1.3.4#urlpattern-api)
- [MDN URLPattern Documentation](https://developer.mozilla.org/en-US/docs/Web/API/URLPattern)
- [Web Platform Tests](https://github.com/web-platform-tests/wpt/tree/master/urlpattern)

---

## Examples in Codebase

### Current Usage

Check for URLPattern usage in:
- `src/api/routes.ts` - API route handlers
- `src/api/v1/routes.ts` - v1 API routes
- `src/services/ui-context-rewriter.ts` - URL rewriting

### Recommended Integration Points

1. **API Route Handlers**: Replace manual path parsing with URLPattern
2. **Middleware**: Use URLPattern for route validation
3. **Static File Serving**: Match file paths with wildcards
4. **API Gateway**: Pattern-based routing decisions

---

**Last Updated**: 2025-12-07  
**Bun Version**: 1.3.4+  
**Status**: 🟢 Available
