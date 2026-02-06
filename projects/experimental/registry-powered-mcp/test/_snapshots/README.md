# Test Snapshots

Snapshot testing for output validation and regression prevention using [Bun's snapshot API](https://bun.sh/docs/test/writing#snapshots).

## Snapshot Testing Infrastructure Matrix

| Feature ID | Type | Resource Cost | Bun Source | Protocol/RFC | Implementation Logic | Status | Usage Location |
|------------|------|---------------|------------|--------------|---------------------|--------|----------------|
| **Core Snapshot APIs** |
| `toMatchSnapshot()` | Matcher | Heap: ~5KB/snap | [bun-test.d.ts#L142](https://github.com/oven-sh/bun/blob/main/packages/bun-types/bun-test.d.ts#L142) | Jest Compat | Serializes object → .snap file; fuzzy-diff on mismatch | ✅ ACTIVE | test/unit/api/server.test.ts:L45 |
| `toMatchSnapshot(name)` | Named Matcher | Heap: ~5KB/snap | [bun-test.d.ts#L142](https://github.com/oven-sh/bun/blob/main/packages/bun-types/bun-test.d.ts#L142) | Jest Compat | Multiple snapshots/test; name-keyed storage | ✅ ACTIVE | test/unit/core/lattice.test.ts:L78 |
| `toMatchInlineSnapshot()` | Inline Matcher | Heap: ~1KB | [bun-test.d.ts#L144](https://github.com/oven-sh/bun/blob/main/packages/bun-types/bun-test.d.ts#L144) | Jest Compat | AST-injection into source; no .snap file | ⚠️ AVAILABLE | Not yet used |
| **Snapshot File Management** |
| `.snap` files | Storage Format | Disk: 1-50KB/file | [snapshots.ts](https://github.com/oven-sh/bun/blob/main/test/js/bun/test/snapshots.test.ts) | Custom Format | Human-readable serialization; git-committed | ✅ ACTIVE | test/_snapshots/*/*.snap |
| Snapshot Directory | Organization | Disk: ~300KB total | Project Pattern | Convention | Domain-based: api/, routing/, config/ | ✅ OPTIMIZED | test/_snapshots/ |
| **Update Mechanisms** |
| `bun test -u` | CLI Flag | CPU: +5% (serialize) | [CLI](https://bun.sh/docs/test#update-snapshots-flag) | Bun CLI | Regenerates all .snap files; overwrites existing | ✅ CONFIGURED | package.json:L23 |
| `--update-snapshots` | CLI Flag (long) | CPU: +5% (serialize) | [CLI](https://bun.sh/docs/test#update-snapshots-flag) | Bun CLI | Alias for -u; explicit form | ✅ CONFIGURED | test:update-snapshots |
| Selective Update | Pattern Match | CPU: +2% (filter) | [CLI](https://bun.sh/docs/test#test-name-pattern-flag) | Bun CLI | Update only tests matching -t pattern | ✅ AVAILABLE | `bun test -t "API" -u` |
| **Normalization Patterns** |
| `expect.any(Number)` | Type Matcher | CPU: <0.1μs | [bun-test.d.ts#L98](https://github.com/oven-sh/bun/blob/main/packages/bun-types/bun-test.d.ts#L98) | Jest Compat | Wildcard for timestamps/IDs; prevents false failures | ✅ IMPLEMENTED | test/unit/api/server.test.ts:L52 |
| `expect.any(String)` | Type Matcher | CPU: <0.1μs | [bun-test.d.ts#L98](https://github.com/oven-sh/bun/blob/main/packages/bun-types/bun-test.d.ts#L98) | Jest Compat | Wildcard for UUIDs/dynamic strings | ✅ IMPLEMENTED | test/unit/core/lattice.test.ts:L89 |
| `expect.stringContaining()` | Partial Matcher | CPU: <0.5μs | [bun-test.d.ts#L102](https://github.com/oven-sh/bun/blob/main/packages/bun-types/bun-test.d.ts#L102) | Jest Compat | Fuzzy string matching within snapshots | ⚠️ AVAILABLE | Not yet used |
| **Version Control** |
| Git Commit .snap | VCS Integration | Disk: Per-file | Git Best Practice | Git | Snapshot files committed to repository | ✅ VERIFIED | .gitignore excludes none |
| Diff Review | PR Process | Human: 2-5min/PR | Git Workflow | Team Process | Manual review of .snap changes in PRs | ✅ REQUIRED | GitHub PR review |

## Quick Reference

### Common Commands

| Command | Purpose | When to Use | Example |
|---------|---------|-------------|---------|
| `bun test` | Run tests + verify snapshots | Every test run | `bun test test/unit/api/` |
| `bun test -u` | Update all snapshots | After verified intentional changes | `bun test -u` |
| `bun test file.test.ts -u` | Update specific file snapshots | Changed one file's output | `bun test test/unit/api/server.test.ts -u` |
| `bun test -t "pattern" -u` | Update matching snapshots | Changed specific feature | `bun test -t "health check" -u` |
| `git diff test/_snapshots/` | Review snapshot changes | Before committing | `git diff test/_snapshots/` |

## Snapshot Organization

```text
test/_snapshots/
├── api/                                    # API endpoint snapshots (3 files)
│   ├── health.test.ts.snap                 # Health check responses
│   ├── registry.test.ts.snap               # Registry lookup responses
│   └── metrics.test.ts.snap                # Metrics output
├── routing/                                # Router output snapshots (2 files)
│   ├── lattice.test.ts.snap                # Route compilation output
│   └── patterns.test.ts.snap               # URLPattern matching
└── config/                                 # Configuration snapshots (1 file)
    └── toml-parser.test.ts.snap            # TOML parsing results
```

**Total**: 6 snapshot files | 10 tests using snapshots | ~300KB disk usage

## Usage Patterns

### Basic Snapshot
```typescript
// test/unit/api/server.test.ts
test("API response structure", () => {
  const response = { status: "ok", data: { version: "2.4.1" } };
  expect(response).toMatchSnapshot();
});
```

### Named Snapshot (Multiple per test)
```typescript
test("user registration flows", () => {
  expect(registerUser({ valid: true })).toMatchSnapshot("success");
  expect(registerUser({ valid: false })).toMatchSnapshot("error");
});
```

### Normalized Snapshot (Dynamic data)
```typescript
test("health check with timestamp", () => {
  const response = {
    status: "ok",
    timestamp: Date.now(),  // Dynamic value
    uptime: process.uptime()
  };

  // Normalize before snapshot
  expect({
    ...response,
    timestamp: expect.any(Number),
    uptime: expect.any(Number),
  }).toMatchSnapshot();
});
```

### Parameterized Snapshots
```typescript
test.each([
  ["minimal", "minimal-config"],
  ["full", "full-config"],
])("config %s snapshot", async (fixture, name) => {
  const config = await loadConfigFixture(fixture);
  expect(config).toMatchSnapshot(name);
});
```

## Troubleshooting Matrix

| Issue | Cause | Solution | Command |
|-------|-------|----------|---------|
| Snapshot mismatch | Intentional output change | Update snapshots | `bun test -u` |
| Snapshot mismatch | Unintentional change | Fix code, re-run | `bun test` |
| Can't find snapshot | First run / new test | Run to generate | `bun test` |
| CI fails, local passes | Line ending differences | Normalize git config | `.gitattributes: * text=auto` |
| CI fails, local passes | Timezone differences | Normalize timestamps | `expect.any(Number)` |
| Large diff hard to read | Too much snapshot data | Snapshot smaller parts | `expect(result.summary).toMatchSnapshot()` |
| Multiple snapshots updated | Widespread change | Review all carefully | `git diff test/_snapshots/` |

## Best Practices

### ✅ DO
- Normalize dynamic data (timestamps, IDs, UUIDs)
- Use named snapshots for multiple cases
- Review snapshot diffs in PRs carefully
- Snapshot only essential output structure
- Commit .snap files with code changes

### ❌ DON'T
- Snapshot huge objects (>1KB recommended)
- Snapshot time-dependent data without normalization
- Update snapshots without reviewing changes
- Use snapshots for simple value assertions
- Skip .snap files in .gitignore

## Configuration

### bunfig.toml
```toml
[test]
updateSnapshots = false  # Never auto-update (safety)
```

## Bun Documentation Links

- [Snapshot Testing](https://bun.sh/docs/test/writing#snapshots) - Core snapshot API
- [Update Snapshots Flag](https://bun.sh/docs/test#update-snapshots-flag) - CLI reference
- [Matchers](https://bun.sh/docs/test/writing#matchers) - expect.any() and other matchers
- [Bun Test Source](https://github.com/oven-sh/bun/blob/main/test/js/bun/test/snapshots.test.ts) - Reference implementation

---

**Status**: 6 snapshot files | 10 tests | ✅ ACTIVE | Last Updated: 2024-12-19
