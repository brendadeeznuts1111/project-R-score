---
title: uWebSockets HttpRouter Reference
type: reference
tags:
  - bun
  - uwebsockets
  - http
  - router
  - cpp
  - internal
created: 2025-12-29
updated: 2025-12-29
author: Alex Hultman (uWebSockets)
status: active
domain: infrastructure
component: http-router
license: Apache-2.0
---

# uWebSockets HttpRouter Reference

C++ HTTP router implementation used by Bun. Authored by Alex Hultman, 2018-2020.

> Licensed under the Apache License, Version 2.0

## Overview

`HttpRouter<USERDATA>` is a template struct providing fast HTTP routing with:
- Method-based routing (GET, POST, PUT, DELETE, etc.)
- URL parameter extraction (`:param`)
- Wildcard matching (`*`)
- Priority-based handler ordering
- Zero-copy URL parsing

## Priority Levels

```cpp
static const uint32_t HIGH_PRIORITY = 0xd0000000;
static const uint32_t MEDIUM_PRIORITY = 0xe0000000;
static const uint32_t LOW_PRIORITY = 0xf0000000;
```

Priority is encoded in the upper 4 bits of handler IDs.

## Route Patterns

| Pattern | Match Type |
|---------|------------|
| `/users` | Exact match for `/users` |
| `/users/:id` | Parameter match (captures `id`) |
| `/users/*` | Wildcard match (captures remainder) |

## Key Methods

### route()

```cpp
bool route(std::string_view method, std::string_view url)
```

Matches a request method and URL against registered handlers.

**Returns:** `true` if a handler was executed, `false` otherwise

### add()

```cpp
void add(
  std::vector<std::string> methods,
  std::string pattern,
  MoveOnlyFunction<bool(HttpRouter *)> &&handler,
  uint32_t priority = MEDIUM_PRIORITY
)
```

Registers one or more handlers for specified HTTP methods.

**Example:**
```cpp
router.add({"GET"}, "/api/users", [](auto *router) {
    auto [count, params] = router->getParameters();
    // Handle request
    return true; // Handler consumed request
});
```

### remove()

```cpp
bool remove(std::string method, std::string pattern, uint32_t priority)
```

Removes a handler by method, pattern, and priority.

### getParameters()

```cpp
std::pair<int, std::string_view *> getParameters()
```

Returns extracted URL parameters. First value is count, second is array of parameter values.

**Example:**
```cpp
router.add({"GET"}, "/users/:id/posts/:postId", [](auto *router) {
    auto [count, params] = router->getParameters();
    std::cout << "User: " << params[0] << ", Post: " << params[1];
    return true;
});
```

### getUserData()

```cpp
USERDATA &getUserData()
```

Accesses the userdata associated with the router.

## URL Segment Parsing

The router uses a pre-allocated stack for URL parsing:
- Maximum 100 URL segments (`MAX_URL_SEGMENTS`)
- Lazy parsing with caching
- Zero heap allocation in the hot path

### Segment Types (Lexical Order)

| Prefix | Order | Description |
|--------|-------|-------------|
| `*` | 0 | Wildcard (highest priority) |
| `:` | 1 | Parameter |
| alphanumeric | 2 | Static path |

## Internal Structure

```cpp
struct Node {
    std::string name;                           // Segment name
    std::vector<std::unique_ptr<Node>> children;
    std::vector<uint32_t> handlers;             // Handler IDs
    bool isHighPriority;
};
```

### Handler ID Encoding

```
bits 31-28: Priority (HIGH=1101, MEDIUM=1110, LOW=1111)
bits 27-0:  Handler index in handlers vector
```

## Matching Algorithm

1. Match HTTP method node
2. Traverse URL segments:
   - Static match first
   - Wildcard (`*`) matches anything
   - Parameter (`:`) captures and continues
3. Execute matching handlers in priority order
4. Fall back to ANY_METHOD_TOKEN (`*`) if no method match

## Usage with Bun

Bun's `Bun.serve()` uses this router internally for HTTP routing:

```typescript
const server = Bun.serve({
  fetch(req) {
    const url = new URL(req.url);
    
    if (url.pathname === "/api/users" && req.method === "GET") {
      return Response.json({ users: [] });
    }
    
    // Fallback
    return new Response("Not Found", { status: 404 });
  }
});
```

## Related

- [[Bun-WebSocket-Types]]
- [[Bun v1.3.2 Production Features]]
- [uWebSockets GitHub](https://github.com/uNetworking/uWebSockets)
