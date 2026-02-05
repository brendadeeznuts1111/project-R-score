# Tag Manager Pro - Table Formatting Guide

## Overview

Tag Manager Pro supports advanced table formatting using `Bun.inspect.table()` with extensive configuration options for CI/CD, production, and development use cases.

## Quick Start

### Basic Table Formatting

```bash
# Use table format for scan results
bun run scripts/tag-manager-pro.ts scan "src/**/*.ts" --table

# Or enable via environment variable
TAG_TABLE_FORMAT=true bun run scripts/tag-manager-pro.ts scan "src/**/*.ts"
```

### Table Formatting Demo

```bash
# See all table formatting options
bun run scripts/tag-manager-pro.ts table-demo
```

## Configuration Options

### Custom Table Properties (Columns)

Show only specific columns:

```bash
TAG_TABLE_PROPERTIES=File,Valid,Domain,Priority bun run scripts/tag-manager-pro.ts scan "src/**/*.ts" --table
```

**Available Properties**:
- `File` - File path
- `Line` - Line number
- `Valid` - Validation status (✅/❌)
- `Domain` - Tag domain
- `Scope` - Tag scope
- `Type` - Tag type
- `Priority` - Priority from META
- `Status` - Status from META
- `Class` - Class name
- `Ref` - Reference
- `Time` - Processing time (if available)
- `Memory` - Memory delta (if available)

### Color Control

Disable colors for CI/CD:

```bash
# No colors (CI-friendly)
TAG_TABLE_COLORS=false bun run scripts/tag-manager-pro.ts stats > report.json

# With colors (default)
TAG_TABLE_COLORS=true bun run scripts/tag-manager-pro.ts scan "src/**/*.ts" --table
```

### Column Width

Control maximum column width:

```bash
# Wide columns for long filenames
TAG_TABLE_MAX_WIDTH=50 bun run scripts/tag-manager-pro.ts scan "src/**/*.ts" --table

# Default: 40 characters
```

### Truncation

Control value truncation:

```bash
# Show full values (no truncation)
TAG_TABLE_TRUNCATE=false bun run scripts/tag-manager-pro.ts scan "src/**/*.ts" --table

# Truncate long values (default: true)
TAG_TABLE_TRUNCATE=true bun run scripts/tag-manager-pro.ts scan "src/**/*.ts" --table
```

### Table Depth

Control inspection depth:

```bash
# Shallow inspection (faster)
TAG_TABLE_DEPTH=1 bun run scripts/tag-manager-pro.ts stats

# Deep inspection (default: 2)
TAG_TABLE_DEPTH=3 bun run scripts/tag-manager-pro.ts stats
```

## Usage Examples

### Example 1: Custom Columns

```bash
TAG_TABLE_PROPERTIES=File,Valid,Domain,Priority bun run scripts/tag-manager-pro.ts scan "src/**/*.ts" --table
```

Output:
```
┌───┬────────────────────────────┬───────┬───────────┬──────────┐
│   │ File                       │ Valid │ Domain    │ Priority │
├───┼────────────────────────────┼───────┼───────────┼──────────┤
│ 0 │ src/utils/bun.ts           │ ✅    │ hyper-bun │ high     │
│ 1 │ src/hyper-bun/scheduler.ts │ ✅    │ hyper-bun │ high     │
└───┴────────────────────────────┴───────┴───────────┴──────────┘
```

### Example 2: CI-Friendly (No Colors)

```bash
TAG_TABLE_COLORS=false bun run scripts/tag-manager-pro.ts stats > report.json
```

### Example 3: Wide Columns

```bash
TAG_TABLE_MAX_WIDTH=60 bun run scripts/tag-manager-pro.ts scan "src/**/*.ts" --table
```

### Example 4: No Truncation

```bash
TAG_TABLE_TRUNCATE=false bun run scripts/tag-manager-pro.ts scan "src/**/*.ts" --table
```

### Example 5: Production Configuration

```bash
NODE_ENV=production \
TAG_TABLE_COLORS=true \
TAG_TABLE_MAX_ARRAY_LEN=5 \
TAG_TABLE_DEPTH=1 \
TAG_TABLE_PROPERTIES=File,Domain,Priority \
bun run scripts/tag-manager-pro.ts stats
```

## Environment Variables Reference

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `TAG_TABLE_COLORS` | `boolean` | `true` | Enable/disable table colors |
| `TAG_TABLE_PROPERTIES` | `string` | `undefined` | Comma-separated column list |
| `TAG_TABLE_MAX_WIDTH` | `number` | `40` | Maximum column width |
| `TAG_TABLE_TRUNCATE` | `boolean` | `true` | Enable value truncation |
| `TAG_TABLE_DEPTH` | `number` | `2` | Table inspection depth |
| `TAG_TABLE_FORMAT` | `boolean` | `false` | Use table format for scan |

## Best Practices

1. **CI/CD**: Use `TAG_TABLE_COLORS=false` for machine-readable output
2. **Production**: Combine with `NODE_ENV=production` for optimized output
3. **Custom Columns**: Use `TAG_TABLE_PROPERTIES` to show only relevant data
4. **Long Filenames**: Increase `TAG_TABLE_MAX_WIDTH` for better readability
5. **Performance**: Use `TAG_TABLE_DEPTH=1` for faster rendering

## Integration

Table formatting integrates seamlessly with:
- Custom error inspection (`TagManagerError`)
- Security redaction (sensitive data filtering)
- Environment adaptation (production vs development)
- Caching system (performance optimization)

## See Also

- [Bun.inspect.table Documentation](https://bun.sh/docs/runtime/utils#bun-inspect-table)
- [Tag Manager Pro Documentation](./TAG-MANAGER-PRO.md)
- [CircularBuffer Advanced Features](./CIRCULAR-BUFFER-ADVANCED.md)
