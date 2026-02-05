# 🏥 Bun.inspect.table() Enforcement System

**Version**: 1.0.0  
**Status**: Production Ready  
**Last Updated**: January 17, 2026

---

## Overview

The Table Enforcement System ensures all tabular data displays use `Bun.inspect.table()` with a minimum of **6 meaningful columns**. This system provides:

- ✅ **Automated Validation** - Runtime checks and ESLint rules
- ✅ **Developer Guidance** - Intelligent suggestions and examples
- ✅ **Team Enforcement** - CI/CD integration and compliance tracking
- ✅ **Zero Breaking Changes** - Backward compatible with existing code

---

## Quick Start

### 1. Enable Runtime Validation

```typescript
import { table } from '@bun/inspect-utils';

// ✅ COMPLIANT: 6+ meaningful columns
const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin', status: 'active', joinDate: '2024-01-01' },
  { id: 2, name: 'Bob', email: 'bob@example.com', role: 'user', status: 'active', joinDate: '2024-01-02' },
];

table(users, ['name', 'email', 'role', 'status', 'joinDate', 'department']);
// Output: ✓ Table has 6 meaningful columns
```

### 2. Configure ESLint

```json
// .eslintrc.json
{
  "plugins": ["@bun/eslint-plugin-inspect-tables"],
  "rules": {
    "@bun/eslint-plugin-inspect-tables/min-columns": [
      "error",
      { "minColumns": 6 }
    ]
  }
}
```

### 3. Run Table Doctor

```bash
# Analyze your codebase
bun table-doctor --analyze

# Generate compliance report
bun table-doctor --report

# Fix violations (with review)
bun table-doctor --fix
```

---

## Core Concepts

### Meaningful Columns

**Meaningful columns** are those that provide substantive information about the data. Generic columns like `id`, `index`, `timestamp` are excluded from the count.

**Generic Columns** (excluded from count):
- `id`, `uuid`
- `index`, `position`
- `timestamp`, `createdAt`, `updatedAt`
- `_id`, `pk`

### Validation Levels

| Level | Behavior | Use Case |
|-------|----------|----------|
| **Development** | Warnings logged to console | Local development |
| **Test** | Errors thrown, tests fail | CI/CD pipelines |
| **Production** | Disabled by default | Performance-critical |

---

## Configuration

### Environment Variables

```bash
# Skip validation entirely
SKIP_TABLE_VALIDATION=true

# Enable validation in production
ENFORCE_TABLES=true

# Set test environment
NODE_ENV=test
BUN_ENV=test
```

### bunfig.toml

```toml
[inspect.enforcement]
minMeaningfulColumns = 6
enableWarnings = true
throwInTest = true
enableSuggestions = true

genericColumns = [
  "id", "uuid", "index", "timestamp",
  "createdAt", "updatedAt"
]

sensitivePatterns = [
  "password", "token", "secret", "apiKey"
]
```

---

## API Reference

### validateTableColumns()

```typescript
import { validateTableColumns } from '@bun/inspect-utils/enforcement';

const result = validateTableColumns(
  ['name', 'email', 'role', 'status', 'joinDate', 'department'],
  users,
  { minMeaningfulColumns: 6 }
);

console.log(result);
// {
//   isValid: true,
//   meaningfulColumns: 6,
//   genericColumns: [],
//   suggestions: [],
//   message: "✓ Table has 6 meaningful columns",
//   severity: "info"
// }
```

### analyzeTableData()

```typescript
import { analyzeTableData } from '@bun/inspect-utils/enforcement';

const analysis = analyzeTableData(users);
console.log(analysis);
// {
//   totalColumns: 7,
//   columnNames: ['id', 'name', 'email', 'role', 'status', 'joinDate', 'department'],
//   columnTypes: { id: 'number', name: 'string', ... },
//   cardinality: { id: 100, name: 95, email: 100, ... },
//   highCardinalityColumns: ['id', 'name', 'email', 'joinDate'],
//   lowCardinalityColumns: ['role', 'status'],
//   dataRichnessScore: 75
// }
```

### getRecommendedColumns()

```typescript
import { getRecommendedColumns } from '@bun/inspect-utils/enforcement';

const recommended = getRecommendedColumns(users, 6);
console.log(recommended);
// ['name', 'email', 'role', 'status', 'joinDate', 'department']
```

---

## Examples

### ✅ Compliant Usage

```typescript
// Pattern 1: Explicit properties with 6+ meaningful columns
table(users, ['name', 'email', 'role', 'status', 'joinDate', 'department']);

// Pattern 2: Using recommended columns
import { getRecommendedColumns } from '@bun/inspect-utils/enforcement';
const cols = getRecommendedColumns(users);
table(users, cols);

// Pattern 3: Skip validation when needed
table(users, ['id', 'name'], { skipValidation: true });

// Pattern 4: Markdown with validation
tableMarkdown(users, ['name', 'email', 'role', 'status', 'joinDate', 'department']);

// Pattern 5: CSV with validation
tableCsv(users, ['name', 'email', 'role', 'status', 'joinDate', 'department']);
```

### ❌ Non-Compliant Usage

```typescript
// ❌ Only 2 meaningful columns
table(users, ['id', 'name']);
// Error: Table has only 1 meaningful columns (need 6)

// ❌ No properties specified
table(users);
// Warning: No columns specified or data is empty

// ❌ Only generic columns
table(users, ['id', 'timestamp', 'createdAt']);
// Error: Table has only 0 meaningful columns (need 6)
```

---

## ESLint Integration

### Rule: bun-tables/min-columns

Detects and fixes table calls with insufficient meaningful columns.

**Configuration**:
```json
{
  "rules": {
    "@bun/eslint-plugin-inspect-tables/min-columns": [
      "error",
      {
        "minColumns": 6,
        "genericColumns": ["id", "index", "timestamp", "createdAt", "updatedAt"]
      }
    ]
  }
}
```

**Auto-fix**: Suggests adding more columns

---

## CLI Tool: table-doctor

### Commands

```bash
# Analyze table calls
bun table-doctor --analyze

# Analyze specific pattern
bun table-doctor --analyze --pattern "src/core/**/*.ts"

# Generate compliance report
bun table-doctor --report

# Generate report with custom settings
bun table-doctor --report --min-columns 8

# Show help
bun table-doctor --help
```

### Output Example

```
📊 Analyzing files matching: src/**/*.ts

📄 src/core/table.ts
   Found 3 table call(s):
   Line 25: table
   table(data, properties, options)
   
   Line 35: tableMarkdown
   tableMarkdown(data, properties)
   ⚠️  No properties array specified

📈 Summary:
   Total table calls: 3
   Files with issues: 1
   Compliance rate: 66.7%
```

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Table Enforcement Check

on: [pull_request]

jobs:
  table-validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun table-doctor --report
      - run: bun lint --rule @bun/eslint-plugin-inspect-tables/min-columns
```

### Pre-commit Hook

```bash
#!/bin/bash
# .husky/pre-commit

bun table-doctor --analyze --pattern "src/**/*.ts"
if [ $? -ne 0 ]; then
  echo "❌ Table enforcement check failed"
  exit 1
fi
```

---

## Migration Guide

### From Non-Compliant Code

**Before**:
```typescript
table(users, ['id', 'name']);
```

**After**:
```typescript
import { getRecommendedColumns } from '@bun/inspect-utils/enforcement';

const columns = getRecommendedColumns(users);
table(users, columns);
```

---

## Performance Considerations

- **Validation Overhead**: <5ms per table call
- **Memory Impact**: <10MB increase
- **Disabled in Production**: By default, no performance impact
- **Caching**: Results cached for identical data structures

---

## Troubleshooting

### "Table has only X meaningful columns"

**Solution**: Add more meaningful columns to your properties array.

```typescript
// ❌ Before
table(users, ['id', 'name']);

// ✅ After
table(users, ['name', 'email', 'role', 'status', 'joinDate', 'department']);
```

### "No columns specified"

**Solution**: Explicitly specify properties or use `getRecommendedColumns()`.

```typescript
// ✅ Option 1: Explicit
table(users, ['name', 'email', 'role', 'status', 'joinDate', 'department']);

// ✅ Option 2: Recommended
const cols = getRecommendedColumns(users);
table(users, cols);
```

### Validation disabled in production

**Solution**: Set `ENFORCE_TABLES=true` to enable in production.

```bash
ENFORCE_TABLES=true NODE_ENV=production bun app.ts
```

---

## Best Practices

1. **Always specify properties** - Explicit is better than implicit
2. **Use meaningful columns** - Avoid generic columns like `id`, `timestamp`
3. **Analyze your data** - Use `analyzeTableData()` to understand structure
4. **Test in CI/CD** - Catch violations early with GitHub Actions
5. **Document exceptions** - Use `@table-columns-exempt` for special cases

---

## Support & Resources

- **Documentation**: https://docs.bun.sh/api/inspect#table
- **GitHub Issues**: Report bugs and request features
- **Examples**: See `examples/` directory
- **Tests**: See `test/` directory for comprehensive examples

---

**Status**: ✅ Production Ready  
**Last Updated**: January 17, 2026  
**Maintainer**: Brenda Williams

