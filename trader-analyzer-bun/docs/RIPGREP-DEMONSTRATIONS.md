# Ripgrep Demonstrations: Architectural Compass for Hyper-Bun

## Overview

Ripgrep (`rg`) serves as your **architectural compass** for navigating Hyper-Bun's codebase. This document provides concrete demonstrations of how version numbers enable instant discovery and traceability.

## Why Ripgrep is Non-Negotiable

The `6.1.1.2.2.x.x.x` schema is a **namespace-encoded address**, not arbitrary versioning. In a system managing dark pool liquidity and covert market signals, ambiguity is a security risk.

### Hierarchical Breakdown

```
6.0.0.0.0.0.0  →  Market Intelligence Visualization Subsystem
  ├── 6.1.0.0.0.0.0  →  High-Level Flow Architecture
  │     └── 6.1.1.0.0.0.0  →  Server-Side HTML Transformation Node
  │           ├── 6.1.1.2.0.0.0  →  HTMLRewriter Deployment Strategy
  │           │     ├── 6.1.1.2.2.0.0  →  Core Service Implementation
  │           │     │     ├── 6.1.1.2.2.1.x.x  →  Service Components
  │           │     │     └── 6.1.1.2.2.2.x.x  →  Transformation Handlers
  │           │     └── 6.1.1.2.2.3.0  →  Strategic Advantages Documentation
  │           └── 6.1.1.2.4.0.0  →  Performance Benchmarking
  └── 6.2.0.0.0.0.0  →  Client-Side Rendering Pipeline
```

## Concrete Ripgrep Demonstrations

### 1. Find Every Mention of RBAC Handler

```bash
# Find every mention of the RBAC handler implementation
rg "6\.1\.1\.2\.2\.2\.3\.0" --type-add 'web:*.{ts,html}' --type web

# Expected output:
# src/services/ui-context-rewriter.ts:69
# public/registry.html:24
# docs/architecture/rbac.md:112
# test/ui-context-injection.spec.ts:45
```

**Use Case**: When modifying RBAC logic, instantly find all related code, tests, and documentation.

### 2. Trace All Feature-Flag Related Code

```bash
# Find all feature-flag related code and docs
rg "6\.1\.1\.2\.2\.2\.2\.\d+" --type ts --line-number | awk '{print $1 " -> " $2}'

# Expected output:
# src/services/ui-context-rewriter.ts -> 6.1.1.2.2.2.2.0: Feature-flag pruning via data-feature attribute
# public/registry.html -> <!-- 6.1.1.2.2.2.2.0: Feature-flagged section -->
# test/ui-context-injection.spec.ts -> test.describe('6.1.1.2.2.2.2.0: Feature Flag Pruning'
```

**Use Case**: Comprehensive audit of feature flag implementation across codebase.

### 3. Live Architectural Audit During Refactoring

```bash
# This command fails CI if RBAC logic is modified without updating docs
rg "element.remove\(\) // (6.1.1.2.2.2.3.0)" src/ || echo "DOC NUMBERING BROKEN"

# Or more robust:
rg "6\.1\.1\.2\.2\.2\.3\.0" src/services/ui-context-rewriter.ts && \
rg "6\.1\.1\.2\.2\.2\.3\.0" docs/ && \
rg "6\.1\.1\.2\.2\.2\.3\.0" test/ || (echo "Missing reference" && exit 1)
```

**Use Case**: CI/CD validation that code changes include documentation updates.

### 4. Find All Test Formulas for a Component

```bash
# Find all test formulas related to context injection
rg "@example.*6\.1\.1\.2\.2\.2\.1\.0" .

# Expected output:
# src/services/ui-context-rewriter.ts:123
#   @example 6.1.1.2.2.2.1.0: Context Injection Verification
# test/ui-context-injection.spec.ts:8
#   // Test Formula: 6.1.1.2.2.2.1.0
```

**Use Case**: Verify test coverage for a specific component.

### 5. Cross-Reference Code and Documentation

```bash
# Find implementation and documentation for timestamp injection
rg "6\.1\.1\.2\.2\.2\.4\.0" --type ts
rg "6\.1\.1\.2\.2\.2\.4\.0" docs/

# Compare outputs to ensure they match
```

**Use Case**: Ensure documentation accurately reflects implementation.

### 6. Find All Components in a Category

```bash
# Find all transformation handlers
rg "6\.1\.1\.2\.2\.2\." --type ts

# Find all interface properties
rg "6\.1\.1\.2\.2\.1\.2\." --type ts

# Find all service-level components
rg "6\.1\.1\.2\.2\.1\." --type ts
```

**Use Case**: Systematic review of component categories.

### 7. Validate Documentation Completeness

```bash
# Find components missing test formulas
rg "6\.1\.1\.2\.2\.\d+\.\d+" src/ | rg -v "@example"

# Find components missing documentation
rg "6\.1\.1\.2\.2\.\d+\.\d+" src/ | rg -v "docs/"
```

**Use Case**: Quality assurance - ensure all components are documented.

### 8. Find Related Components

```bash
# Find all components related to feature flags
rg "6\.1\.1\.2\.2\.(1\.2\.2|2\.2)" .

# Find all components related to RBAC
rg "6\.1\.1\.2\.2\.(1\.2\.3|2\.3)" .
```

**Use Case**: Understand component relationships and dependencies.

### 9. Extract Version Numbers for CI Validation

```bash
# Extract all version numbers from docs for validation
rg -o "6\.1\.1\.2\.2\.\d+\.\d+" docs/ | sort -u > doc-numbers.txt

# Validate each exists in code
while read num; do
  escaped=$(echo "$num" | sed 's/\./\\./g')
  rg -q "$escaped" src/ || echo "Missing: $num"
done < doc-numbers.txt
```

**Use Case**: Automated validation script (see `scripts/validate-doc-numbers.sh`).

### 10. Find Implementation Patterns

```bash
# Find all "element.remove()" calls with version numbers
rg "element\.remove\(\)" src/ -A 2 | rg "6\.1\.1\.2\.2"

# Find all context injection patterns
rg "window\.HYPERBUN_UI_CONTEXT" . -B 2 | rg "6\.1\.1\.2\.2"
```

**Use Case**: Code review - verify consistent implementation patterns.

## Advanced Ripgrep Patterns

### Multi-File Search with Context

```bash
# Find version number with 5 lines of context
rg "6\.1\.1\.2\.2\.2\.1\.0" -C 5

# Find in specific file types only
rg "6\.1\.1\.2\.2\.2\.1\.0" --type ts --type html
```

### Exclude Patterns

```bash
# Find version numbers excluding test files
rg "6\.1\.1\.2\.2\.2\.1\.0" --type ts --type-not test

# Find in source but not in node_modules
rg "6\.1\.1\.2\.2\.2\.1\.0" src/ --glob '!node_modules'
```

### Count Matches

```bash
# Count how many times a version number appears
rg -c "6\.1\.1\.2\.2\.2\.1\.0" .

# Count matches per file
rg -c "6\.1\.1\.2\.2\.2\.1\.0" . | sort -t: -k2 -rn
```

### Extract and Process

```bash
# Extract all version numbers and count unique ones
rg -o "6\.1\.1\.2\.2\.\d+\.\d+" . | sort -u | wc -l

# Extract version numbers with file context
rg -o "6\.1\.1\.2\.2\.\d+\.\d+" . --with-filename | sort
```

## CI/CD Integration

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Validate all doc numbers exist in code
./scripts/validate-doc-numbers.sh || exit 1

# Check for missing test formulas
MISSING_TESTS=$(rg "6\.1\.1\.2\.2\.\d+\.\d+" src/ | rg -v "@example" | wc -l)
if [ "$MISSING_TESTS" -gt 0 ]; then
  echo "⚠️  Some components missing test formulas"
fi
```

### GitHub Actions Workflow

```yaml
name: Validate Documentation Numbers

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install ripgrep
        run: sudo apt-get install -y ripgrep
      - name: Validate doc numbers
        run: ./scripts/validate-doc-numbers.sh
```

## Real-World Workflows

### Workflow 1: Modifying Feature Flag Logic

```bash
# 1. Find all related code
rg "6\.1\.1\.2\.2\.2\.2\.0" .

# 2. Review test formulas
rg "@example.*6\.1\.1\.2\.2\.2\.2\.0" .

# 3. Run tests
bun test test/ui-context-injection.spec.ts -t "Feature Flag"

# 4. Verify documentation updated
rg "6\.1\.1\.2\.2\.2\.2\.0" docs/
```

### Workflow 2: Onboarding New Developer

```bash
# 1. Find all components in a category
rg "6\.1\.1\.2\.2\.2\." --type ts

# 2. Read documentation for each
rg "6\.1\.1\.2\.2\.2\.1\.0" docs/
rg "6\.1\.1\.2\.2\.2\.2\.0" docs/
rg "6\.1\.1\.2\.2\.2\.3\.0" docs/

# 3. Review test formulas
rg "@example.*6\.1\.1\.2\.2\.2\." src/

# 4. Run tests to verify understanding
bun test test/ui-context-injection.spec.ts
```

### Workflow 3: Architectural Audit

```bash
# 1. Extract all version numbers
rg -o "6\.1\.1\.2\.2\.\d+\.\d+" . | sort -u > audit-numbers.txt

# 2. For each number, verify:
#    - Implementation exists
#    - Documentation exists
#    - Test formula exists
#    - Test case exists

for num in $(cat audit-numbers.txt); do
  echo "Checking $num..."
  rg -q "$num" src/ || echo "  ❌ Missing implementation"
  rg -q "$num" docs/ || echo "  ❌ Missing documentation"
  rg -q "@example.*$num" src/ || echo "  ❌ Missing test formula"
  rg -q "$num" test/ || echo "  ⚠️  Missing test case"
done
```

## Performance Tips

### Use File Type Filters

```bash
# Faster: Search only TypeScript files
rg "6\.1\.1\.2\.2\.2\.1\.0" --type ts

# Slower: Search all files
rg "6\.1\.1\.2\.2\.2\.1\.0" .
```

### Use Case-Insensitive When Appropriate

```bash
# Case-insensitive search (if version numbers might vary)
rg -i "6\.1\.1\.2\.2\.2\.1\.0" .
```

### Limit Search Scope

```bash
# Search only in specific directories
rg "6\.1\.1\.2\.2\.2\.1\.0" src/ docs/ test/

# Exclude build artifacts
rg "6\.1\.1\.2\.2\.2\.1\.0" . --glob '!dist' --glob '!node_modules'
```

## Related Documentation

- [UIContextRewriter Numbering Scheme](./UI-CONTEXT-REWRITER-NUMBERING.md) - Version numbering details
- [Test Formula Blueprint](./TEST-FORMULA-BLUEPRINT.md) - Test formula specifications
- [Examples Ripgrep Patterns](./EXAMPLES-RIPGREP-PATTERNS.md) - General ripgrep patterns
