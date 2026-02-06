---
name: metadata
description: Query and enforce code metadata tags for performance contracts and dependency graphs
user-invocable: false
version: 2.0.0
---

# Metadata Tag System

Query, enforce, and manage structured code tags for refactoring radar and performance audit trails.

## Commands

```bash
bun metadata.ts query --domain BUN       # Find all BUN-tagged code
bun metadata.ts query --ref Bun.file     # Find specific API usage
bun metadata.ts query --bun-native       # Find Bun-native code
bun metadata.ts query --class MyHandler  # Find by class
bun metadata.ts query --function read    # Find by function
bun metadata.ts enforce --threshold 10   # Check performance contracts
bun metadata.ts relationships            # View dependency graph
bun metadata.ts sync                     # Rebuild tag database
```

## Tag Schema

```
[DOMAIN][SCOPE][TYPE][META:{PROPERTY}][CLASS:name][FUNCTION:name][INTERFACE:name][#REF:id][BUN-NATIVE]
```

- **DOMAIN** (`BUN`, `PERF`, `IO`, `CLI`, `API`, `HTTP`, `CACHE`, `GLOB`, `DB`, `SECURITY`, `TEST`) — Category
- **SCOPE** (`API`, `CLI`, `HELPER`, `CORE`, `UTIL`, `TEST`, `CONFIG`, `INTERNAL`, `PUBLIC`) — Subsystem
- **TYPE** (`SYNC`, `ASYNC`, `STREAM`, `BATCH`, `SINGLETON`, `FACTORY`, `BUILDER`) — Execution type
- **META** (`[META:timing]`, `[META:key=value]`) — Properties
- **CLASS** (`[CLASS:MyHandler]`) — Class reference
- **FUNCTION** (`[FUNCTION:read]`) — Function reference
- **INTERFACE** (`[INTERFACE:IConfig]`) — Interface reference
- **REF** (`[#REF:Bun.file]`) — Unique identifier (required)
- **BUN-NATIVE** (`[BUN-NATIVE]`) — Marks Bun-specific code

## Quick Patterns

```typescript
import { TagPatterns, TagParser, tagged, bunNative, perfCritical } from "~/.claude/tools/core/tag";

// Build tags programmatically
TagPatterns.file("readConfig");        // [BUN][IO][FS][API][ASYNC][META:FS][#REF:readConfig][BUN-NATIVE]
TagPatterns.server("handleRequest");   // [BUN][HTTP][API][ASYNC][SINGLETON][#REF:handleRequest][BUN-NATIVE]
TagPatterns.sqlite("UserDB", "Users"); // [BUN][DB][API][SYNC][CLASS:Users][#REF:UserDB][BUN-NATIVE]
TagPatterns.perf("hotPath", "5ms");    // [PERF][META:timing=5ms][#REF:hotPath]

// Custom build
TagParser.build({
  domains: ["BUN", "HTTP"],
  scopes: ["API"],
  types: ["ASYNC"],
  classes: ["RequestHandler"],
  functions: ["handle"],
  reference: "Bun.serve",
  bunNative: true
});
// → [BUN][HTTP][API][ASYNC][CLASS:RequestHandler][FUNCTION:handle][#REF:Bun.serve][BUN-NATIVE]
```

## Decorators

```typescript
import { tagged, bunNative, asyncMethod, perfCritical } from "~/.claude/tools/core/tag";

class FileService {
  @bunNative("Bun.file")
  async read(path: string) { /* ... */ }

  @perfCritical("parseJSON")
  parse(data: string) { /* ... */ }

  @asyncMethod("batchProcess", "PARALLEL")
  async processAll(items: string[]) { /* ... */ }
}
```

## Enforcement

```bash
# CI pipeline
bun metadata.ts enforce --threshold 8 --budget 400 --fail-on-violation

# Query violations
bun metadata.ts query --domain PERF --json | jq '[.[] | select(.avg_ms > 10)]'

# Find all Bun-native code
bun metadata.ts query --bun-native --json
```

## Registry Queries

```typescript
import { TagRegistry, TagParser, scanForTags } from "~/.claude/tools/core/tag";

// Scan file for tags
const source = await Bun.file("./src/server.ts").text();
scanForTags(source, "./src/server.ts");

// Query registry
TagRegistry.findByDomain("BUN");         // All BUN domain code
TagRegistry.findBunNative();             // All Bun-native code
TagRegistry.findByClass("UserHandler");  // By class name
TagRegistry.findByFunction("read");      // By function name
TagRegistry.findByInterface("IConfig");  // By interface
TagRegistry.findPerformanceTags();       // PERF domain or META:timing
TagRegistry.findAsync();                 // ASYNC or STREAM types

// Audit report
console.log(TagRegistry.generateAuditReport());
```

## Database

- **`tags`** — Tag registry (ref, domain, file, line)
- **`timing_metrics`** — Performance samples
- **`relationships`** — Dependency graph (from → to)

## Bun API Cross-Reference

Tags map to CLAUDE.md sections:

- **`Bun.file`** — `TagPatterns.file()` → ## File I/O
- **`Bun.serve`** — `TagPatterns.server()` → ## Server & Requests
- **`Bun.spawn`** — `TagPatterns.spawn()` → ## Shell & Spawn
- **`Bun.write`** — `TagPatterns.file()` → ## File I/O
- **`bun:sqlite`** — `TagPatterns.sqlite()` → ## SQLite
- **`bun:test`** — `TagPatterns.test()` → ## Testing
- **`Bun.Glob`** — `TagPatterns.glob()` → ## File I/O
- **`Bun.Terminal`** — Custom → ## Terminal/PTY
- **`fetch`** — `TagPatterns.http()` → ## Fetch & DNS
- **`WebSocket`** — `TagPatterns.websocket()` → ## Server & Requests
- **`Bun.password`** — `TagPatterns.security()` → ## Utilities
- **`cache`** — `TagPatterns.cache()` → ## Utilities

## Integration with scan.ts

The tag system integrates with the Bun-Pure scanner:

```bash
# Scan codebase and verify BUN-NATIVE tags
bun scan.ts --check-tags

# Find untagged Bun API usage
bun metadata.ts untagged --pattern "Bun\\."
```

Tags marked `[BUN-NATIVE]` indicate code using Bun-specific APIs that won't work in Node.js.
