# Bun Package Manager - Quick Reference

**Reference**: [Bun Package Manager Documentation](https://bun.com/docs/pm/cli/publish)

---

## Publishing & Analysis Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `bun publish` | Publish packages to registry | `bun publish --dry-run` |
| `bun outdated` | Check for outdated packages | `bun outdated` |
| `bun why` | Explain why package is installed | `bun why <package>` |
| `bun audit` | Security audit for dependencies | `bun audit --fix` |
| `bun info` | Get package information | `bun info <package>` |

---

## Quick Examples

### Publishing

```bash
# Dry run first (best practice)
bun publish --dry-run

# Publish with OTP (2FA)
bun publish --otp=123456

# Publish beta
bun publish --tag=beta

# Restricted access (private packages)
bun publish --access=restricted
```

### Analysis

```bash
# Check outdated packages
bun outdated

# Check workspace packages (monorepo)
bun outdated --filter @graph/types --filter @graph/api
bun outdated --filter "@graph/*"

# Exclude packages (negation)
bun outdated '!@types/*'
bun outdated '!@types/*' '!@graph/dev'

# Recursive (all workspaces)
bun outdated -r
bun outdated --recursive

# Security audit
bun audit

# Why is a package installed?
bun why hono

# Package information
bun info hono
```

### Combined Check

```bash
# Run all checks
bun run pm:check

# Check specific package
bun run pm:check --package hono

# Check workspace packages
bun run pm:check --filter @graph/types --filter @graph/api

# JSON output
bun run pm:check --json
```

---

## NPM Scripts

```bash
# Outdated packages
bun run pm:outdated

# Outdated @graph packages (workspace filter)
bun run pm:outdated:graph

# Security audit
bun run pm:audit

# Why package installed
bun run pm:why <package>

# Package info
bun run pm:info <package>

# Combined check
bun run pm:check

# Combined check with filter
bun run pm:check --filter @graph/types
```

---

## Pre-Publish Checklist

```bash
# 1. Check outdated
bun outdated

# 2. Security audit
bun audit

# 3. Validate workspace
bun run validate:workspace

# 4. Run tests
bun test

# 5. Dry run publish
bun publish --dry-run

# 6. Publish
bun publish --otp=123456
```

---

## Integration with Our Scripts

### Publish Script

Our `publish-graph-monorepo.ts` automatically runs:
- ✅ `bun outdated` - Before publishing
- ✅ `bun audit` - Security check (blocks on vulnerabilities)
- ✅ `bun test` - Validation
- ✅ `bun bench` - Benchmarks

### CI Workflow

`.github/workflows/publish-graph-packages.yml` includes:
- Outdated package check
- Security audit
- Dependency validation

---

## See Also

- [Bun PM Commands](./BUN-PM-COMMANDS.md) - Complete documentation
- [Bun Publish Best Practices](./BUN-PUBLISH-BEST-PRACTICES.md) - Publishing guide
- [Bun Package Manager](./BUN-PM.md) - General PM docs
