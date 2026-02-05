# Table Enforcement System - Integration Guide

**Version**: 1.0.0  
**Status**: Production Ready  
**Last Updated**: January 17, 2026

---

## Quick Integration Checklist

- [ ] Install enforcement system
- [ ] Configure ESLint plugin
- [ ] Set up pre-commit hooks
- [ ] Configure GitHub Actions
- [ ] Update bunfig.toml
- [ ] Run table-doctor analysis
- [ ] Fix violations
- [ ] Run tests
- [ ] Deploy

---

## Step 1: Install Enforcement System

The enforcement system is built into `@bun/inspect-utils`. No additional installation needed.

```bash
cd bun-inspect-utils
bun install
```

---

## Step 2: Configure ESLint

### 2.1 Update .eslintrc.json

```json
{
  "plugins": ["@bun/eslint-plugin-inspect-tables"],
  "rules": {
    "@bun/eslint-plugin-inspect-tables/min-columns": [
      "error",
      {
        "minColumns": 6,
        "genericColumns": [
          "id",
          "uuid",
          "index",
          "timestamp",
          "createdAt",
          "updatedAt"
        ]
      }
    ]
  }
}
```

### 2.2 Run ESLint

```bash
bun lint --rule @bun/eslint-plugin-inspect-tables/min-columns
```

---

## Step 3: Set Up Pre-commit Hooks

### 3.1 Install Husky

```bash
bun install -D husky
bun exec husky install
```

### 3.2 Add Pre-commit Hook

```bash
cp .husky/pre-commit-table-validation .husky/pre-commit
chmod +x .husky/pre-commit
```

### 3.3 Test Hook

```bash
# Make a change to a table call
git add .
git commit -m "test: table enforcement"
# Should trigger validation
```

---

## Step 4: Configure GitHub Actions

### 4.1 Create Workflow

```bash
mkdir -p .github/workflows
cp .github/workflows/validate-bun-tables.yml .github/workflows/
```

### 4.2 Push to Repository

```bash
git add .github/workflows/validate-bun-tables.yml
git commit -m "ci: add table enforcement validation"
git push
```

### 4.3 Verify Workflow

Check GitHub Actions tab to see workflow running on PRs.

---

## Step 5: Update bunfig.toml

```toml
[inspect.enforcement]
# Minimum meaningful columns required
minMeaningfulColumns = 6

# Enable validation warnings
enableWarnings = true

# Throw errors in test environments
throwInTest = true

# Enable intelligent suggestions
enableSuggestions = true

# Generic columns to exclude from count
genericColumns = [
  "id", "uuid", "index", "position",
  "timestamp", "createdAt", "updatedAt",
  "_id", "pk"
]

# Sensitive column patterns to exclude
sensitivePatterns = [
  "password", "token", "secret", "apiKey", "auth"
]
```

---

## Step 6: Run Table Doctor Analysis

### 6.1 Analyze Current Codebase

```bash
bun table-doctor --analyze
```

### 6.2 Generate Report

```bash
bun table-doctor --report
```

### 6.3 Review Results

```bash
cat table-enforcement-report.json
```

---

## Step 7: Fix Violations

### 7.1 Identify Issues

```bash
bun table-doctor --analyze --pattern "src/**/*.ts"
```

### 7.2 Fix Each Violation

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

### 7.3 Verify Fixes

```bash
bun table-doctor --analyze
```

---

## Step 8: Run Tests

### 8.1 Run Enforcement Tests

```bash
bun test test/enforcement.test.ts
```

### 8.2 Run Full Test Suite

```bash
bun test
```

### 8.3 Check Coverage

```bash
bun test --coverage
```

---

## Step 9: Deploy

### 9.1 Create Feature Branch

```bash
git checkout -b feat/table-enforcement
```

### 9.2 Commit Changes

```bash
git add .
git commit -m "feat: implement table enforcement system"
```

### 9.3 Create Pull Request

```bash
git push origin feat/table-enforcement
# Create PR on GitHub
```

### 9.4 Merge After Review

```bash
# After approval and CI passes
git checkout main
git merge feat/table-enforcement
git push origin main
```

---

## Configuration Options

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

### ESLint Options

```json
{
  "rules": {
    "@bun/eslint-plugin-inspect-tables/min-columns": [
      "error",
      {
        "minColumns": 6,
        "genericColumns": ["id", "index", "timestamp"]
      }
    ]
  }
}
```

### Runtime Options

```typescript
import { table } from '@bun/inspect-utils';

// Skip validation for this call
table(users, ['id', 'name'], { skipValidation: true });

// Use custom config
table(users, ['name', 'email'], {
  minMeaningfulColumns: 4
});
```

---

## Troubleshooting

### Issue: "Table has only X meaningful columns"

**Solution**: Add more meaningful columns

```typescript
// ❌ Before
table(users, ['id', 'name']);

// ✅ After
table(users, ['name', 'email', 'role', 'status', 'joinDate', 'department']);
```

### Issue: ESLint rule not working

**Solution**: Verify plugin is installed and configured

```bash
# Check plugin is in node_modules
ls node_modules/@bun/eslint-plugin-inspect-tables

# Verify .eslintrc.json
cat .eslintrc.json | grep "@bun/eslint-plugin-inspect-tables"
```

### Issue: Pre-commit hook not running

**Solution**: Verify Husky is installed

```bash
# Check Husky
ls -la .husky/

# Reinstall if needed
bun install -D husky
bun exec husky install
```

### Issue: GitHub Actions workflow not running

**Solution**: Check workflow file and permissions

```bash
# Verify workflow file
cat .github/workflows/validate-bun-tables.yml

# Check file permissions
chmod +x .github/workflows/validate-bun-tables.yml
```

---

## Best Practices

1. **Always specify properties** - Explicit is better than implicit
2. **Use meaningful columns** - Avoid generic columns
3. **Analyze before displaying** - Use `analyzeTableData()`
4. **Test in CI/CD** - Catch violations early
5. **Document exceptions** - Use `@table-columns-exempt` for special cases
6. **Review suggestions** - Use `getRecommendedColumns()`
7. **Monitor compliance** - Run `table-doctor --report` regularly

---

## Performance Considerations

- **Validation Overhead**: <5ms per table call
- **Memory Impact**: <10MB increase
- **Disabled in Production**: By default, no performance impact
- **Caching**: Results cached for identical data structures

---

## Support

- **Documentation**: See `TABLE_ENFORCEMENT.md`
- **Examples**: See `examples/table-enforcement-examples.ts`
- **Tests**: See `test/enforcement.test.ts`
- **Issues**: Report on GitHub

---

**Status**: ✅ Production Ready  
**Last Updated**: January 17, 2026  
**Maintainer**: Brenda Williams

