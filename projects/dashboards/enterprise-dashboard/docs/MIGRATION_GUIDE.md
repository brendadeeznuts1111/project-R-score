# Migration Guide - CLI Tools

This guide helps you migrate to and use the new CLI analysis tools.

## Overview

Three new CLI tools have been added to the project:

1. **`/analyze`** - Code analysis and refactoring
2. **`/diagnose`** - Project health and painpoint detection  
3. **`/!`** - Quick actions and shortcuts

## Quick Migration

### Before

```bash
# Manual code inspection
grep -r "interface" src/
find src/ -name "*.ts" | wc -l
git status
```

### After

```bash
# Automated analysis
bun run analyze types --exported-only
bun run analyze scan src/ --depth=3
bun run diagnose health --quick
bun run ! h  # Quick health check
```

## Feature Migration

### Code Analysis

**Old way:** Manual grep/search
```bash
grep -r "export interface" src/
grep -r "export class" src/
```

**New way:** Automated extraction
```bash
bun run analyze types --exported-only
bun run analyze classes --inheritance
```

### Health Monitoring

**Old way:** Manual checks
```bash
git status
npm outdated
npm audit
```

**New way:** Comprehensive health report
```bash
bun run diagnose health --deep
bun run diagnose painpoints --top=10
bun run diagnose grade
```

### Quick Commands

**Old way:** Remembering full commands
```bash
bun run cli/diagnose.ts health --quick
bun test --preload ./test-setup.ts
```

**New way:** Short aliases
```bash
bun run ! h
bun run ! test
```

## Configuration

### Setup `.analyze.json`

```json
{
  "ignore": ["node_modules", "dist", ".git"],
  "thresholds": {
    "maxComplexity": 10
  }
}
```

### Setup `.diagnose.json`

```json
{
  "ignore": ["node_modules", "dist", ".git"],
  "thresholds": {
    "maxComplexity": 10,
    "minCoverage": 80
  }
}
```

## Daily Workflow

### Morning Check

```bash
# Quick health check
bun run ! h

# Check for new painpoints
bun run ! pp
```

### Before Committing

```bash
# Full health analysis
bun run diagnose health --deep

# Check for circular dependencies
bun run analyze deps --circular

# Run tests
bun run ! test
```

### Weekly Review

```bash
# Comprehensive analysis
bun run analyze scan src/ --depth=3
bun run analyze strength --by-complexity
bun run diagnose grade --format=json > weekly-report.json
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Health Check
  run: bun run diagnose health --all --format=json > health.json

- name: Code Analysis
  run: bun run analyze types --exported-only --format=json > types.json

- name: Upload Reports
  uses: actions/upload-artifact@v3
  with:
    name: analysis-reports
    path: |
      health.json
      types.json
```

### Pre-commit Hook

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
bun run diagnose health --quick
if [ $? -ne 0 ]; then
  echo "Health check failed"
  exit 1
fi
```

## Advanced Usage

### Custom Analysis

```bash
# Analyze specific directory
bun run analyze scan src/server/kyc --depth=2

# Extract only exported types
bun run analyze types --exported-only

# Find strongest components
bun run analyze strength --by-complexity
```

### Multiple Output Formats

```bash
# JSON for scripting
bun run diagnose health --format=json > report.json

# Markdown for documentation
bun run diagnose health --format=markdown > health.md

# HTML for sharing
bun run diagnose health --format=html > health.html

# Chart for quick view
bun run diagnose health --format=chart
```

### Feature Flags

```bash
# Quick analysis (git + basic stats)
bun run diagnose health --quick

# Full analysis (+ benchmarks + deps)
bun run diagnose health --deep

# With StringWidth validation
bun run diagnose health --stringwidth

# With DCE testing
bun run diagnose health --dce

# With performance benchmarks
bun run diagnose health --performance

# All features
bun run diagnose health --all
```

## Troubleshooting

### Issue: No files found

**Solution:** Check ignore patterns in `.analyze.json` or `.diagnose.json`

```json
{
  "ignore": ["node_modules", "dist", ".git", "__tests__"]
}
```

### Issue: Command not found

**Solution:** Ensure you're using `bun run`:

```bash
bun run analyze scan src/
# Not: bun analyze scan src/
```

### Issue: Slow performance

**Solution:** Use `--quick` mode or reduce depth:

```bash
bun run diagnose health --quick
bun run analyze scan src/ --depth=1
```

## Best Practices

1. **Daily:** Run quick health checks (`bun run ! h`)
2. **Before commits:** Run full health analysis
3. **Weekly:** Generate comprehensive reports
4. **CI/CD:** Integrate health checks into pipeline
5. **Documentation:** Export reports in markdown/html format

## Related Documentation

- [`cli/CLI_TOOLS.md`](cli/CLI_TOOLS.md) - Complete CLI tools reference
- `COUNCIL_ANALYSIS.md` - Comprehensive codebase analysis
- `KYC_VERIFICATION.md` - KYC implementation verification

## Support

For issues or questions:
- Check [`cli/CLI_TOOLS.md`](cli/CLI_TOOLS.md) for detailed usage
- Run `bun run ! help` for quick actions
- Run `bun run analyze help` for analysis commands
- Run `bun run diagnose help` for health commands