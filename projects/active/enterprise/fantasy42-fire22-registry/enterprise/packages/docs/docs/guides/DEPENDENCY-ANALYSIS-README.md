# 🔍 Fire22 Dependency Analysis Guide

## Overview

This guide demonstrates how to use `bun why` for enterprise-grade dependency
analysis in the Fire22 project.

## Quick Start

```bash
# Basic dependency analysis
bun run deps:analyze

# Security-focused analysis
bun run deps:security

# CI/CD integration
bun why "semver*" > semver-analysis.txt
```

## Key Findings from Current Analysis

### 📊 Current State

- **712 total packages** managed efficiently
- **386 Babel packages** in the ecosystem (security monitoring needed)
- **18 webpack packages** with complex peer dependencies
- **14 @types packages** for TypeScript development
- **2 semver versions** (7.7.2 direct, 6.3.1 transitive)

### 🔍 Direct Dependencies (Good for Version Control)

- `axios@1.11.0` - HTTP client
- `typescript@5.9.2` - TypeScript compiler
- `express@5.1.0` - Web framework
- `drizzle-orm@0.44.5` - Database ORM
- `drizzle-kit@0.31.4` - Database toolkit

### ⚠️ Areas Requiring Attention

#### Version Conflicts

```bash
bun why "semver*"
# Shows: semver@7.7.2 (direct) vs semver@6.3.1 (via @babel/core)
```

#### Complex Ecosystems

```bash
bun why "webpack*" --top    # Shows peer dependency complexity
bun why "@babel/*" --depth 1 # Shows Babel ecosystem size
```

#### Bundle Size Impact

```bash
bun why "@types/*" --depth 1 # Shows TypeScript types impact
```

## Enterprise Use Cases

### 1. Security Audits

```bash
# Check for potentially vulnerable packages
bun why "webpack*" | grep "peer"
bun why "@babel/*" | wc -l

# Monitor transitive dependencies
bun why "semver*" --depth 2
```

### 2. Bundle Size Optimization

```bash
# Analyze @types package impact
bun why "@types/*" | grep -c "@types/"

# Check for unused dependencies
bun why axios  # Should show usage or "No dependents found"
```

### 3. Version Management

```bash
# Check for version conflicts
bun why "semver*" | grep "semver@"

# Monitor peer dependency requirements
bun why webpack --top
```

### 4. Build Performance

```bash
# Analyze build tool complexity
bun why "webpack*" --depth 1 | wc -l

# Check for circular dependencies
bun why terser | grep "circular"
```

## Available Scripts

### `bun run deps:analyze`

- Direct dependency analysis
- Version conflict detection
- Complex chain identification
- Automated recommendations

### `bun run deps:security`

- Security vulnerability assessment
- Bundle size analysis
- Orphaned dependency detection
- Performance recommendations

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Dependency Analysis
  run: bun run deps:analyze

- name: Security Check
  run: bun run deps:security
```

### Pre-commit Hooks

```bash
# Check for new dependency issues
bun why "semver*" | grep -q "semver@.*semver@" && echo "Version conflict detected!"
```

## Best Practices

### 1. Regular Monitoring

- Run `bun run deps:analyze` weekly
- Monitor `bun run deps:security` monthly
- Review CI/CD dependency reports

### 2. Version Conflict Resolution

```bash
# Check current conflicts
bun why "semver*" --depth 1

# Resolve by updating root dependency
bun pm pkg set dependencies.semver "^7.6.0"
bun install
```

### 3. Bundle Optimization

```bash
# Identify heavy dependencies
bun why "@types/*" | grep -v "No dependents" | wc -l

# Consider removing unused types
bun why "@types/specific-package" | grep "No dependents"
```

### 4. Security Maintenance

```bash
# Monitor ecosystem sizes
bun why "@babel/*" --depth 1 | wc -l

# Check peer dependency health
bun why webpack --top | grep "peer"
```

## Troubleshooting

### Common Issues

**"No dependents found"**

- ✅ Good: Direct dependency you control
- ⚠️ Check: May indicate unused dependency

**Multiple versions of same package**

- 🔍 Investigate: `bun why "package*" --depth 2`
- 🛠️ Resolve: Update root dependency or use overrides

**Complex peer dependency chains**

- 📊 Analyze: `bun why package --top`
- 🎯 Optimize: Consider alternative packages

## Integration with Enterprise Tools

### Dependency Management

- **Bun Catalogs**: `catalog:` references
- **Workspaces**: Cross-package analysis
- **Lockfiles**: `bun pm hash` verification

### CI/CD Pipeline

```bash
# Pre-deployment checks
bun why "semver*" | tee semver-report.txt
bun run deps:security | tee security-report.txt

# Bundle analysis
bun why "@types/*" | wc -l | tee types-count.txt
```

## Key Metrics to Monitor

- **Ecosystem sizes**: Babel (386), webpack (18), @types (14)
- **Version conflicts**: semver (2 versions)
- **Peer dependencies**: webpack (36 peers)
- **Direct dependencies**: 5 core packages
- **Lockfile integrity**: `7C1C8511B83E6903...`

## Next Steps

1. **Implement weekly dependency audits**
2. **Set up automated CI/CD dependency analysis**
3. **Create dependency governance policies**
4. **Establish bundle size monitoring**
5. **Implement security vulnerability scanning**

This guide provides your enterprise team with powerful tools for maintaining
healthy, secure, and optimized dependency management using `bun why`.
