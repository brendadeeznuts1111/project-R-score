# Bun Package Manager Commands

**Reference**: [Bun Package Manager Documentation](https://bun.com/docs/pm/cli/publish)

---

## Publishing & Analysis Commands

### `bun publish`

Publish packages to npm registry.

**Basic Usage**:
```bash
# Publish current package
bun publish

# Dry run (test without publishing)
bun publish --dry-run

# With OTP (2FA)
bun publish --otp=123456

# With tag
bun publish --tag=beta

# Access level
bun publish --access=restricted
```

**See**: [Bun Publish Best Practices](./BUN-PUBLISH-BEST-PRACTICES.md) for complete guide.

---

### `bun outdated`

Check for outdated packages in dependencies.

**Usage**:
```bash
# Check all outdated packages
bun outdated

# Check specific package
bun outdated <package-name>

# Filter workspace packages (monorepo)
bun outdated --filter @monorepo/types --filter @monorepo/cli

# Filter by workspace pattern
bun outdated --filter "@graph/*"

# Exclude packages (negation)
bun outdated '!@types/*'
bun outdated '!@types/*' '!@graph/dev'

# Recursive (check all workspaces in monorepo)
bun outdated -r
bun outdated --recursive

# JSON output
bun outdated --json
```

**Example Output**:
```text
Package          Current  Wanted  Latest  Location
hono             4.5.0    4.6.0   4.6.0   trader-analyzer
zod              4.1.10   4.1.13  4.1.13  trader-analyzer
```

**Workspace Filtering**:
```bash
# Check specific workspace packages
bun outdated --filter @graph/types --filter @graph/api

# Check all @graph packages
bun outdated --filter "@graph/*"

# Check root workspace
bun outdated --filter "."
```

**Use Cases**:
- Regular dependency updates
- Security vulnerability checks
- CI/CD dependency monitoring
- Monorepo package-specific checks

---

### `bun why`

Explain why a package is installed (dependency tree analysis).

**Usage**:
```bash
# Why is a package installed?
bun why <package-name>

# Show full dependency tree
bun why <package-name> --all
```

**Example**:
```bash
$ bun why hono

hono@4.6.0
└── trader-analyzer@0.1.0
    └── dependencies
        └── hono@^4.6.0
```

**Use Cases**:
- Debug dependency issues
- Understand package relationships
- Find unused dependencies
- Resolve version conflicts

---

### `bun audit`

Security audit for dependencies (vulnerability scanning).

**Usage**:
```bash
# Run security audit
bun audit

# Fix automatically (if possible)
bun audit --fix

# JSON output
bun audit --json

# Only show vulnerabilities
bun audit --severity=high
```

**Severity Levels**:
- `low` - Low severity vulnerabilities
- `moderate` - Moderate severity vulnerabilities
- `high` - High severity vulnerabilities
- `critical` - Critical vulnerabilities

**Example Output**:
```text
Found 2 vulnerabilities

Package: zod
Severity: moderate
Issue: Prototype pollution
Fix: Update to 4.1.13
```

**Integration**: Our project uses custom security scanner (`src/security/bun-scanner.ts`)

**See**: [Bun Security Scanner](./BUN-SECURITY-SCANNER.md) for custom scanner details.

---

### `bun info`

Get information about a package.

**Usage**:
```bash
# Package information
bun info <package-name>

# Specific field
bun info <package-name> --json

# Local package
bun info .  # Current package
```

**Example**:
```bash
$ bun info hono

hono@4.6.0
├── Description: Fast web framework
├── Repository: https://github.com/honojs/hono
├── License: MIT
├── Dependencies: 5
└── Latest: 4.6.0
```

**Use Cases**:
- Check package details before installing
- Verify package versions
- Check license compatibility
- View package metadata

---

## Common Workflows

### Pre-Publish Checklist

```bash
# 1. Check for outdated dependencies
bun outdated

# 2. Run security audit
bun audit

# 3. Check why packages are installed
bun why <suspicious-package>

# 4. Get package info
bun info <package-name>

# 5. Publish
bun publish --dry-run  # Test first
bun publish --otp=123456
```

### Dependency Analysis

```bash
# Find why a large package is installed
bun why <large-package>

# Check for outdated security-critical packages
bun outdated | grep -E "(security|auth|crypto)"

# Audit specific package
bun audit <package-name>
```

### CI/CD Integration

```bash
# In CI: Check for outdated packages
bun outdated --json > outdated.json

# In CI: Run security audit
bun audit --json > audit.json

# In CI: Verify dependencies
bun why <critical-package>
```

---

## NPM Scripts Integration

Add to `package.json`:

```json
{
  "scripts": {
    "pm:outdated": "bun outdated",
    "pm:audit": "bun audit",
    "pm:why": "bun why",
    "pm:info": "bun info",
    "pm:check": "bun outdated && bun audit"
  }
}
```

**Usage**:
```bash
bun run pm:outdated
bun run pm:audit
bun run pm:why <package>
bun run pm:info <package>
bun run pm:check  # Run both outdated and audit
```

---

## Best Practices

### 1. Regular Dependency Updates

```bash
# Weekly check
bun outdated

# Update packages
bun update
```

### 2. Security Audits

```bash
# Before publishing
bun audit

# Fix automatically
bun audit --fix
```

### 3. Dependency Analysis

```bash
# Understand large dependency trees
bun why <package-name> --all

# Find unused dependencies
bun why <package-name>  # If not found, might be unused
```

### 4. Package Information

```bash
# Before installing
bun info <package-name>

# Check license
bun info <package-name> | grep License
```

---

## Integration with Our Scripts

### Publish Script Integration

Our `publish-graph-monorepo.ts` script can integrate these commands:

```typescript
// Before publishing
await $`bun outdated`.quiet();
await $`bun audit`.quiet();
await $`bun why @graph/types`.quiet();
```

### CI Workflow Integration

Add to `.github/workflows/publish-graph-packages.yml`:

```yaml
- name: Check outdated packages
  run: bun outdated --json > outdated.json

- name: Security audit
  run: bun audit --json > audit.json

- name: Dependency analysis
  run: bun why @graph/types
```

---

## Troubleshooting

### Issue: `bun outdated` shows many updates

**Solution**: Review updates carefully, test before updating:
```bash
bun outdated
bun update <package-name>
bun test
```

### Issue: `bun audit` finds vulnerabilities

**Solution**: Fix automatically or manually:
```bash
bun audit --fix
# Or update specific package
bun update <vulnerable-package>
```

### Issue: `bun why` shows unexpected dependency

**Solution**: Check dependency tree:
```bash
bun why <package-name> --all
# Remove if unnecessary
bun remove <package-name>
```

---

## Related Documentation

- [Bun Publish Best Practices](./BUN-PUBLISH-BEST-PRACTICES.md)
- [Bun Workspaces](./BUN-WORKSPACES.md)
- [Bun Security Scanner](./BUN-SECURITY-SCANNER.md)
- [Bun Package Manager](./BUN-PM.md)

---

## Quick Reference

```bash
# Publishing
bun publish --dry-run
bun publish --otp=123456

# Analysis
bun outdated
bun why <package>
bun audit
bun info <package>

# Combined check
bun outdated && bun audit && bun why <package>
```
