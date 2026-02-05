# Bun 1.3.2 Features Integration

**Status**: ✅ All features available (Bun 1.3.3)

---

## 📋 Features Overview

### ✅ CPU Profiling (`--cpu-prof`)

**Status**: ✅ Already in use

**Usage**:
```bash
# Profile any script
bun --cpu-prof script.ts

# With custom output
bun --cpu-prof --cpu-prof-name=profile.cpuprofile --cpu-prof-dir=./profiles script.ts

# Profile tests
bun test --cpu-prof --test-name-pattern="performance" test.ts
```

**Example**: Used today to optimize `TagParser.validate()` performance (186x speedup)

**Analysis**: Open `.cpuprofile` files in Chrome DevTools → Performance tab

---

### ✅ ServerWebSocket.subscriptions Getter

**Status**: ⚠️ Partially integrated (manual tracking still used)

**New in Bun 1.3.2**: Native `ws.subscriptions` getter returns de-duplicated topics

**Current Implementation**:
```typescript
// Manual tracking (still needed for custom data)
ws.data.subscriptions.add(topic);
ws.subscribe(topic);
```

**Recommended Enhancement**:
```typescript
// Use native getter for debugging/inspection
console.log('Active subscriptions:', ws.subscriptions); // Set<string>

// Still track custom data separately
ws.data.sports.add(sport);
ws.data.bookmakers.add(bookmaker);
```

**Benefits**:
- Automatic de-duplication
- Always accurate (no sync issues)
- Built-in debugging support
- Returns empty array when socket closes

**Files to Update**:
- `src/orca/streaming/server.ts` - Use `ws.subscriptions` for topic inspection
- `src/arbitrage/alerts.ts` - Use `ws.subscriptions` for debugging
- `src/api/telegram-ws.ts` - Use `ws.subscriptions` for connection state

---

### ✅ onTestFinished Hook

**Status**: 🔄 Not yet used

**New in Bun 1.3.2**: Hook that runs after all `afterEach` hooks complete

**Use Cases**:
- Final cleanup after test
- Assertions that must happen last
- Resource teardown

**Example**:
```typescript
import { test, onTestFinished, expect } from "bun:test";

test("example", () => {
  const resource = createResource();
  
  onTestFinished(() => {
    // Runs after all afterEach hooks
    resource.cleanup();
  });
  
  expect(resource).toBeDefined();
});
```

**Note**: Not supported in concurrent tests - use `test.serial` instead

---

### ✅ bun list Alias

**Status**: ✅ Available (shorter than `bun pm ls`)

**Usage**:
```bash
# List dependencies
bun list

# Full transitive tree
bun list --all

# Equivalent to
bun pm ls --all
```

---

### ✅ Improved Git Dependency Resolution

**Status**: ✅ Automatic

**Benefits**:
- Better npm-style Git URL support
- GitHub shorthands work correctly
- Faster HTTP tarball pathway for GitHub repos

**Example**:
```json
{
  "dependencies": {
    "my-package": "git+https://github.com/user/repo.git"
  }
}
```

---

### ✅ Hoisted Installs Restored

**Status**: ✅ Automatic for existing projects

**Details**:
- Existing projects: Use hoisted linker (configVersion 0)
- New projects: Use isolated linker (configVersion 1)
- Prevents breaking changes for existing monorepos

**To Force Isolated**:
```toml
# bunfig.toml
[install]
linker = "isolated"
```

---

### ✅ Faster bun install

**Status**: ✅ Automatic

**Improvements**:
- Smarter postinstall script execution
- 6x faster for next.js + vite projects
- Better dependency resolution

---

## 🎯 Recommended Next Steps

1. **Update WebSocket Code**: Use `ws.subscriptions` getter for debugging
2. **Add Test Cleanup**: Use `onTestFinished` in test files
3. **Document CPU Profiling**: Add profiling guide to docs
4. **Update Debug Endpoints**: Use native subscriptions getter in `/api/debug/ws-subscriptions`

---

## 📚 References

- [Bun 1.3.2 Release Notes](https://bun.com/blog/bun-v1.3.2)
- [CPU Profiling Docs](https://bun.sh/docs/cli/bun#cpu-prof)
- [WebSocket API](https://bun.sh/docs/api/websockets)
