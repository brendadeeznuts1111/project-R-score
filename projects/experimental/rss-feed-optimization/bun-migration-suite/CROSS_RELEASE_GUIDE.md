# Bun Cross-Release Reference Guide v4.0

## Overview

This guide provides comprehensive cross-release analysis for Bun APIs from v1.0.0 through v1.3.7, helping you understand API evolution and plan migrations.

## Quick Start

```bash
# View complete release timeline
bun run timeline

# Generate visual evolution charts
bun run timeline:visual

# Check API compatibility across versions
bun run compatibility:matrix

# Analyze dependencies against Bun releases
bun run deps:analyze

# Check code compatibility
bun run compatibility:check ./src/server.js
```

## Release Timeline

### Major Releases

| Version | Date | Key Features |
|---------|------|--------------|
| v1.0.0 | 2023-09-08 | Initial stable release, core APIs |
| v1.1.0 | 2024-10-15 | Concurrency utilities (sleep, peek, threadId) |
| v1.2.0 | 2025-01-22 | Built-in Postgres, S3, SQL APIs |
| v1.3.0 | 2025-10-10 | FFI, SQLite, Redis, unified SQL |
| v1.3.7 | 2026-01-27 | wrapAnsi, JSON5, JSONL, enhanced S3 |

## API Evolution by Category

### Core APIs
- **v1.0.0**: Bun.serve, Bun.file, Bun.spawn
- **v1.0.14**: Bun.plugin
- **v1.2.0**: Bun.JSC.Profile, Bun.Transpiler.replMode
- **v1.3.0**: Bun.FFI, Bun.SQLite
- **v1.3.7**: Enhanced with new utilities

### I/O APIs
- **v1.0.0**: Bun.file, Bun.write
- **v1.0.6**: Bun.TemporaryDirectory
- **v1.1.0**: Streaming support
- **v1.3.7**: Complete I/O suite

### Networking APIs
- **v1.0.0**: Bun.serve, Bun.connect
- **v1.2.0**: Bun.S3Client
- **v1.3.7**: Enhanced S3Client with list/presign

### Process APIs
- **v1.0.0**: Bun.spawn, Bun.which
- **v1.1.0**: Bun.sleep, Bun.peek, Bun.threadId
- **v1.3.7**: Bun.$ shell syntax

## Migration Paths

### From v1.0.0 to v1.3.7
1. **v1.0.0 → v1.0.6**: Add TemporaryDirectory, Bun.gc()
2. **v1.0.6 → v1.0.14**: Implement Bun.plugin
3. **v1.0.14 → v1.1.0**: Replace setTimeout with Bun.sleep()
4. **v1.1.0 → v1.2.0**: Use Bun.SQL, Bun.S3Client
5. **v1.2.0 → v1.3.0**: Migrate to Bun.FFI, Bun.SQLite
6. **v1.3.0 → v1.3.7**: Replace npm packages with natives

### Quick Migration (v1.2.0 → v1.3.7)
- Replace `wrap-ansi` → `Bun.wrapAnsi` (88x faster)
- Replace `json5` → `Bun.JSON5` (10x faster)
- Use `Bun.JSONL` for streaming JSON
- Enhanced `Bun.S3Client` methods

## Compatibility Matrix

See `bun run compatibility:matrix` for full compatibility table.

### Key Compatibility Notes

- **Bun.wrapAnsi**: Requires v1.3.7+
- **Bun.JSON5**: Requires v1.3.7+
- **Bun.S3Client**: Available from v1.2.0, enhanced in v1.3.7
- **Bun.FFI**: Requires v1.3.0+
- **Bun.SQL**: Available from v1.2.0+

## Dependency Migration

### Immediate Migrations (v1.3.7)
- `wrap-ansi` → `Bun.wrapAnsi` (88x faster)
- `json5` → `Bun.JSON5` (10x faster)
- `string-width` → `Bun.stringWidth` (8-15x faster)

### Available from v1.2.0
- `@aws-sdk/client-s3` → `Bun.S3Client` (3x faster)
- `pg` → `Bun.SQL` (PostgreSQL)

### Available from v1.3.0
- `sqlite3` → `Bun.SQLite` (5-10x faster)
- `ffi-napi` → `Bun.FFI` (Native bindings)

### Available from v1.0.0
- `node-fetch` → `fetch` (global, 2-4x faster)
- `execa` → `Bun.spawn` (10-20x faster)
- `ws` → `Bun.serve` WebSocket (20x faster)

## Performance Evolution

| Version | Avg Speedup | Notable Improvements |
|---------|-------------|---------------------|
| v1.0.0 | 2-5x | Core APIs faster than Node.js |
| v1.1.0 | 5-10x | Optimizations across the board |
| v1.2.0 | 10-20x | Database and storage APIs |
| v1.3.7 | 33-88x | Text processing APIs |

## Recommendations by Use Case

### High Performance Text Processing
- **Target**: v1.3.7
- **APIs**: Bun.wrapAnsi, Bun.stringWidth
- **Speedup**: 33-88x

### Database Operations
- **Target**: v1.3.0+
- **APIs**: Bun.SQL, Bun.SQLite
- **Speedup**: 5-10x

### Cloud Storage
- **Target**: v1.2.0+ (v1.3.7 for enhanced features)
- **APIs**: Bun.S3Client
- **Speedup**: 3x

### Native Extensions
- **Target**: v1.3.0+
- **APIs**: Bun.FFI
- **Benefit**: Replace node-gyp

## Tools

### Timeline Explorer
```bash
bun run timeline
```
Shows complete release history with API introductions.

### Visual Evolution
```bash
bun run timeline:visual
```
Generates growth charts and migration paths.

### Compatibility Check
```bash
bun run compatibility:check ./src/server.js
```
Checks which Bun version supports your code.

### Dependency Analysis
```bash
bun run deps:analyze
```
Maps npm packages to Bun native alternatives.

## Output Files

- `bun-cross-release-report.json` - Complete timeline data
- `api-growth-chart.svg` - Visual growth chart
- `dependency-migration-analysis.json` - Dependency mapping

## Best Practices

1. **Start with Core APIs**: Use v1.0.0 APIs first (most stable)
2. **Gradual Migration**: Upgrade incrementally through versions
3. **Check Compatibility**: Use compatibility matrix before upgrading
4. **Test Thoroughly**: Each version may have breaking changes
5. **Monitor Performance**: Track improvements after migration

## Resources

- [Bun Blog](https://bun.sh/blog) - Release announcements
- [Bun Documentation](https://bun.sh/docs) - API reference
- [Migration Suite](./README.md) - Migration tools
