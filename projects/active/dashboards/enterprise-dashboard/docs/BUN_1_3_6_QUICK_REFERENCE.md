# Bun 1.3.6+ Quick Reference

## Performance Improvements (Automatic)

| Feature | Improvement | Impact |
|---------|------------|--------|
| `Bun.spawnSync()` | 30x faster on Linux ARM64 | Build scripts, spawn operations |
| `Bun.hash.crc32()` | 20x faster (hardware-accelerated) | Integrity checks, hashing |
| `Response.json()` | 3.5x faster (SIMD) | All JSON responses |
| `Buffer.indexOf/includes` | 2x faster (SIMD) | Log search, pattern matching |
| JSON serialization | 3x faster | console.log, PostgreSQL, MySQL |

## New Features

### Test Runner
```bash
# New --grep flag (Jest/Mocha compatible)
bun test --grep "should handle"
bun test --test-name-pattern "should handle"  # Still works
bun test -t "should handle"                   # Still works
```

### S3 Requester Pays
```typescript
import { s3 } from "bun";

const file = s3.file("data.csv", {
  bucket: "requester-pays-bucket",
  requestPayer: true,  // Requester pays for data transfer
});
```

### WebSocket Proxy Support
```typescript
new WebSocket("wss://example.com", {
  proxy: "http://proxy:8080",
  // or with auth
  proxy: "http://user:pass@proxy:8080",
  // or object format
  proxy: {
    url: "http://proxy:8080",
    headers: { "Proxy-Authorization": "Bearer token" },
  },
});
```

### sql() INSERT with undefined
```typescript
// undefined values are now filtered out (not converted to NULL)
await sql`INSERT INTO "MyTable" ${sql({ 
  foo: undefined,  // Omitted - uses DEFAULT
  id: Bun.randomUUIDv7() 
})}`;
```

### Fake Timers with @testing-library/react
```typescript
import { jest } from "bun:test";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

it("works with fake timers", async () => {
  jest.useFakeTimers();
  const { getByRole } = render(<button>Click me</button>);
  const user = userEvent.setup();
  
  // No longer hangs!
  await user.click(getByRole("button"));
  
  jest.useRealTimers();
});
```

## Codebase Status

✅ **Already Optimized**:
- `Bun.hash.crc32()` - Extensively used, now 20x faster
- `Response.json()` - 246+ instances, now 3.5x faster
- `Buffer.indexOf()` - Used in log search, now 2x faster
- `Bun.spawnSync()` - Used in build scripts, now 30x faster on Linux ARM64

✅ **Already Supported**:
- S3 Requester Pays - Via `config.S3.REQUESTER_PAYS`
- Fake Timers - Works with `@testing-library/react`

📝 **Consider Adding**:
- WebSocket proxy support for corporate environments
- `--grep` flag in test scripts for better Jest compatibility
- Leverage `sql()` undefined handling in INSERT statements

## Related Files

- [`BUN_1_3_6_IMPROVEMENTS.md`](../BUN_1_3_6_IMPROVEMENTS.md) - Detailed improvements documentation
- [`benchmarks/BUFFER_SIMD_PERFORMANCE.md`](benchmarks/BUFFER_SIMD_PERFORMANCE.md) - Buffer optimizations
- [`benchmarks/RESPONSE_JSON_PERFORMANCE.md`](benchmarks/RESPONSE_JSON_PERFORMANCE.md) - Response.json optimizations
- `examples/bun-1.3.6-bench.ts` - Performance benchmarks
