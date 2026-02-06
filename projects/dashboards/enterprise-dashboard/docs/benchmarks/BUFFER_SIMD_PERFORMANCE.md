# Buffer SIMD Performance Optimization

## Overview
Bun 1.3.6+ includes SIMD-optimized search functions for `Buffer.indexOf()` and `Buffer.includes()`, providing **up to 2x faster** performance when searching for patterns in large buffers.

## Performance Improvement

**Before (Bun 1.3.5):**
- `Buffer.includes()` (found): 25.52ms
- `Buffer.includes()` (not found): 3.25s

**After (Bun 1.3.6+):**
- `Buffer.includes()` (found): 21.90ms
- `Buffer.includes()` (not found): 1.42s
- **Improvement: Up to 2x faster**

## Usage

### Basic Pattern Search
```typescript
const buffer = Buffer.from("a".repeat(1_000_000) + "needle");

// Both methods are now faster with SIMD acceleration
buffer.indexOf("needle");     // Returns position or -1
buffer.includes("needle");    // Returns true/false
```

### Multi-byte Patterns
SIMD optimization works with both single-byte and multi-byte patterns:

```typescript
const buffer = Buffer.from("Hello World".repeat(1000));
const pattern = Buffer.from("World");

// Fast search with Buffer pattern
const pos = buffer.indexOf(pattern);
const found = buffer.includes(pattern);
```

### String Patterns
You can also use string patterns directly:

```typescript
const buffer = Buffer.from("Hello World".repeat(1000));

// String patterns work too
const pos = buffer.indexOf("World");
const found = buffer.includes("World");
```

## Real-World Usage in Codebase

### Log Search Endpoint (`/api/logs/search`)
The log search endpoint uses SIMD-accelerated `Buffer.indexOf()` for fast pattern matching:

```typescript
// Use SIMD-accelerated Buffer operations for fast searching
const buffer = Buffer.from(await file.arrayBuffer());
const needle = Buffer.from(body.pattern);

while (offset < buffer.length && matches.length < limit) {
  // SIMD-accelerated indexOf (up to 2x faster in Bun 1.3.6+)
  const found = buffer.indexOf(needle, offset);
  if (found === -1) break;
  // ... process match
}
```

## Performance Characteristics

### When SIMD Helps Most
- **Large buffers**: Performance improvement increases with buffer size
- **Repeated searches**: Multiple searches benefit from SIMD acceleration
- **Pattern matching**: Both single and multi-byte patterns benefit

### Benchmark Results
From `examples/bun-1.3.6-bench.ts`:

```text
🔍 Buffer.indexOf/includes (SIMD search)
   indexOf (found):      ~X ms (Y ops/s)
   indexOf (not found):  ~X ms (Y ops/s)
   includes (found):     ~X ms (Y ops/s)
   includes (not found): ~X ms (Y ops/s)
```

## Best Practices

### 1. Use Buffer Methods for Binary Data
```typescript
// ✅ Good: Use Buffer methods for binary data
const buffer = Buffer.from(binaryData);
const found = buffer.includes(pattern);

// ❌ Avoid: Converting to string for search
const text = buffer.toString();
const found = text.includes(pattern); // Slower
```

### 2. Pre-compile Patterns for Repeated Searches
```typescript
// ✅ Good: Pre-compile pattern Buffer
const pattern = Buffer.from("search-term");
for (const buffer of buffers) {
  if (buffer.includes(pattern)) {
    // Process match
  }
}
```

### 3. Use includes() for Boolean Checks
```typescript
// ✅ Good: Use includes() for simple existence checks
if (buffer.includes(pattern)) {
  // Process
}

// ✅ Also good: Use indexOf() when you need position
const pos = buffer.indexOf(pattern);
if (pos !== -1) {
  // Use position
}
```

### 4. Leverage Offset for Sequential Searches
```typescript
// ✅ Good: Use offset parameter for sequential searches
let offset = 0;
while ((offset = buffer.indexOf(pattern, offset)) !== -1) {
  // Process match at offset
  offset += pattern.length; // Move past match
}
```

## Comparison with String Methods

| Method | Use Case | Performance |
|--------|----------|-------------|
| `Buffer.indexOf()` | Binary data, large files | ✅ SIMD-optimized (2x faster) |
| `Buffer.includes()` | Boolean checks on binary data | ✅ SIMD-optimized (2x faster) |
| `String.indexOf()` | Text data, small strings | Standard performance |
| `String.includes()` | Text data, small strings | Standard performance |

**Recommendation**: Use `Buffer` methods when working with:
- File contents (logs, binary files)
- Network data
- Large data structures
- Binary patterns

## Code Examples

### Log File Search
```typescript
async function searchLogFile(filePath: string, pattern: string) {
  const file = Bun.file(filePath);
  const buffer = Buffer.from(await file.arrayBuffer());
  const needle = Buffer.from(pattern);
  
  // SIMD-accelerated search
  return buffer.includes(needle);
}
```

### Pattern Counting
```typescript
function countPattern(buffer: Buffer, pattern: string): number {
  const needle = Buffer.from(pattern);
  let count = 0;
  let offset = 0;
  
  // SIMD-accelerated sequential search
  while ((offset = buffer.indexOf(needle, offset)) !== -1) {
    count++;
    offset += needle.length;
  }
  
  return count;
}
```

### Multi-Pattern Search
```typescript
function findAnyPattern(buffer: Buffer, patterns: string[]): boolean {
  // Use includes() for fast boolean checks
  return patterns.some(pattern => 
    buffer.includes(Buffer.from(pattern))
  );
}
```

## Related Documentation

- [Bun Buffer API](https://bun.sh/docs/api/buffer)
- [Bun 1.3.6 Release Notes](https://bun.sh/blog/bun-1.3.6)
- Performance benchmarks: `examples/bun-1.3.6-bench.ts`

## Migration Notes

No code changes required! Existing `Buffer.indexOf()` and `Buffer.includes()` calls automatically benefit from SIMD optimization in Bun 1.3.6+.

However, consider:
1. **Review string conversions**: If you're converting buffers to strings just to search, consider using Buffer methods instead
2. **Pattern compilation**: Pre-compile frequently searched patterns as Buffer objects
3. **Sequential searches**: Use the `offset` parameter for better performance in loops
