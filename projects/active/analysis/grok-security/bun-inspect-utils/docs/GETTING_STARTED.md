# Getting Started with @bun/inspect-utils

## Installation

```bash
# Clone and setup
git clone <repo-url>
cd bun-inspect-utils
bun install
bun run build
```

## Core Concepts

### 1. Inspection Depth
Control how deep objects are inspected:

```typescript
import { inspect } from "@bun/inspect-utils";

const deep = { a: { b: { c: { d: 1 } } } };

// Shallow inspection
inspect(deep, { depth: 1 });

// Deep inspection
inspect(deep, { depth: 10 });
```

### 2. Dark-Mode Formatting
All output is dark-mode-first with ANSI colors:

```typescript
import { formatDarkMode } from "@bun/inspect-utils";

console.log(formatDarkMode("Success", "green"));
console.log(formatDarkMode("Error", "red"));
console.log(formatDarkMode("Info", "cyan"));
```

### 3. Table Formatting
Format arrays as ASCII tables with multiple export formats:

```typescript
import { table, tableMarkdown, tableCsv } from "@bun/inspect-utils";

const data = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
];

console.log(table(data));           // ASCII table
console.log(tableMarkdown(data));   // Markdown
console.log(tableCsv(data));        // CSV
```

### 4. Deep Comparison
Compare objects deeply and find differences:

```typescript
import { deepEquals, findDifferences } from "@bun/inspect-utils";

const obj1 = { a: 1, b: 2 };
const obj2 = { a: 1, b: 3 };

deepEquals(obj1, obj2);        // false
findDifferences(obj1, obj2);   // { equal: false, differences: [...] }
```

### 5. String Width
Calculate display width with emoji and ANSI support:

```typescript
import { stringWidth, padToWidth, truncateToWidth } from "@bun/inspect-utils";

stringWidth("Hello 👋");           // 8
padToWidth("hi", 10);              // "hi        "
truncateToWidth("Hello World", 8); // "Hello …"
```

### 6. Promise Peeking
Inspect Promise values without awaiting:

```typescript
import { peek, peekWithState } from "@bun/inspect-utils";

const promise = Promise.resolve({ data: "value" });

peek(promise);           // { data: "value" }
peekWithState(promise);  // { state: "fulfilled", value: {...}, duration: 0.5 }
```

## Common Patterns

### Logging with Context
```typescript
import { inspectForLog } from "@bun/inspect-utils";

function logWithContext(label: string, data: unknown) {
  console.log(`[${label}]`, inspectForLog(data));
}

logWithContext("User", { id: 1, name: "Alice" });
```

### Data Validation
```typescript
import { deepEquals, findDifferences } from "@bun/inspect-utils";

function validateSchema(data: unknown, schema: unknown) {
  const diff = findDifferences(data, schema);
  if (!diff.equal) {
    console.error("Validation failed:", diff.differences);
  }
}
```

### Table Export
```typescript
import { tableMarkdown, tableCsv } from "@bun/inspect-utils";

const users = [/* ... */];

// Export to Markdown
const md = tableMarkdown(users);
Bun.write("users.md", md);

// Export to CSV
const csv = tableCsv(users);
Bun.write("users.csv", csv);
```

### Custom Class Inspection
```typescript
import { formatDarkMode } from "@bun/inspect-utils";

class User {
  constructor(public name: string) {}

  [Symbol.for("Bun.inspect.custom")](): string {
    return formatDarkMode(`User<${this.name}>`, "cyan");
  }
}
```

## Configuration

Edit `bunfig.toml` to customize behavior:

```toml
[inspect]
depthDefault = 5
maxArrayLength = 100
colors = true
darkMode = true

[performance]
cacheInspections = true
cacheTTL = 3600
```

## Next Steps

- Read [API Reference](./API_REFERENCE.md)
- Explore [Examples](../examples/)
- Check [Cloudflare Integration](./CLOUDFLARE.md)
- Review [Performance Tips](./PERFORMANCE.md)

## Troubleshooting

**Q: Colors not showing?**
A: Check `Bun.isTTY` or set `colors: true` explicitly

**Q: Large objects slow?**
A: Reduce `depth` or use `inspectCompact()`

**Q: Memory issues?**
A: Use `maxArrayLength` and `maxStringLength` options

---

**Need help?** Check the [examples](../examples/) directory or open an issue!

