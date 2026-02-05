# Bun Workspaces with Private Registry

**Last Updated**: 2025-01-XX  
**Bun Version**: 1.3.4+  
**Reference**: [Bun Workspaces Documentation](https://bun.com/docs/pm/workspaces)

## Overview

This guide covers configuring Bun workspaces with a private npm registry for `@graph` scoped packages. It ensures proper dependency management, version pinning, and CI/CD integration.

---

## 1. Configure Private Registry in `bunfig.toml`

Add scoped registry configuration for `@graph` packages:

```toml
[install.scopes."@graph"]
registry = "https://npm.internal.yourcompany.com"
token = "$GRAPH_NPM_TOKEN"
```

**Security**: The token loads from:
1. Environment variable `GRAPH_NPM_TOKEN`
2. Bun.secrets (recommended for production)
3. `.env.local` file (for local development)

**See**: `bunfig.toml` in project root for complete configuration.

---

## 2. Use `workspace:*` for Inter-Package Dependencies

**✅ Correct**: Use `workspace:*` protocol

```json
{
  "dependencies": {
    "@graph/types": "workspace:*",
    "@graph/api": "workspace:*"
  }
}
```

**❌ Incorrect**: Never use `bun link` in workspace

```bash
# DON'T DO THIS in workspace
bun link @graph/types
```

**Why**: `workspace:*` is automatic, faster, and works correctly with isolated installs. `bun link` is for external packages outside the monorepo.

---

## 3. Never Use `bun link` in Workspace

### When to Use `workspace:*`
- ✅ Packages within the same monorepo
- ✅ Inter-package dependencies
- ✅ Workspace package references

### When to Use `bun link`
- ✅ External packages outside monorepo
- ✅ Testing packages before publishing
- ✅ Global CLI tool development

**See**: [Bun Link Documentation](./BUN-LINK.md) for complete guide.

---

## 4. Publish with Version Pinning Script

Use the publish script to pin versions before publishing:

```bash
# Publish all @graph packages with version 1.4.0
VERSION=1.4.0 bun run scripts/publish-to-registry.ts

# Publish specific package
VERSION=1.4.0 bun run scripts/publish-to-registry.ts --package @graph/types

# Dry run (test without publishing)
VERSION=1.4.0 bun run scripts/publish-to-registry.ts --dry-run

# Custom registry
VERSION=1.4.0 bun run scripts/publish-to-registry.ts --registry https://custom-registry.com
```

**What it does**:
1. Updates `package.json` version to specified version
2. Replaces `workspace:*` with `workspace:VERSION` in dependencies
3. Publishes to private registry
4. Ensures version consistency across packages

**Script**: `scripts/publish-to-registry.ts`

---

## 5. CI Configuration: Toggle Workspaces

In CI/CD, you can disable workspaces if needed:

```bash
# Disable workspaces (treat as regular packages)
export BUN_WORKSPACES_DISABLED=1
bun install

# Enable workspaces (default)
unset BUN_WORKSPACES_DISABLED
bun install
```

**Use Cases**:
- Testing published packages (not workspace versions)
- Debugging dependency resolution issues
- Ensuring packages work outside workspace context

**GitHub Actions Example**:

```yaml
name: Test Published Packages

on: [push]

jobs:
  test-published:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
      
      - name: Test with workspaces disabled
        env:
          BUN_WORKSPACES_DISABLED: 1
          GRAPH_NPM_TOKEN: ${{ secrets.GRAPH_NPM_TOKEN }}
        run: |
          bun install
          bun test
```

---

## Complete Workflow

### Initial Setup

```bash
# Option 1: Automated setup
bun run setup:workspace

# Option 2: Manual setup
export GRAPH_NPM_TOKEN="your-token-here"
bun run validate:workspace
bun install
```

### Development

```bash
# 1. Install dependencies (workspace:* resolves automatically)
bun install

# 2. Develop packages
cd packages/types
# Make changes...

# 3. Test locally
bun test

# 4. Validate workspace dependencies
bun run validate:workspace
```

### Publishing

**Enhanced Script** (`publish-graph-monorepo.ts`):

```bash
# Dry run (test without publishing)
bun run scripts/publish-graph-monorepo.ts --dry-run

# Publish with 2FA/OTP
VERSION=1.4.1 bun run scripts/publish-graph-monorepo.ts --otp=123456

# Publish beta version
VERSION=1.5.0-beta.1 bun run scripts/publish-graph-monorepo.ts --tag=beta

# Publish specific package
VERSION=1.4.1 bun run scripts/publish-graph-monorepo.ts --package @graph/types

# Custom registry
VERSION=1.4.1 bun run scripts/publish-graph-monorepo.ts --registry=https://custom-registry.com
```

**Legacy Script** (`publish-to-registry.ts`):

```bash
# 1. Set version
export VERSION=1.4.0

# 2. Dry run to verify
bun run scripts/publish-to-registry.ts --dry-run

# 3. Publish
bun run scripts/publish-to-registry.ts

# 4. Verify published packages
bun install --registry https://npm.internal.yourcompany.com
```

### CI/CD

```bash
# Test with workspaces enabled (default)
bun install
bun test

# Test with workspaces disabled (published packages)
BUN_WORKSPACES_DISABLED=1 bun install
bun test
```

---

## Troubleshooting

### Issue: Token Not Found

**Error**: `Authentication failed for @graph packages`

**Solution**:
1. Set `GRAPH_NPM_TOKEN` environment variable
2. Or use Bun.secrets: `bun run scripts/registry-secrets.ts set @graph --token <token>`
3. Verify token in `bunfig.toml`

### Issue: Workspace Dependencies Not Resolving

**Error**: `Cannot find module @graph/types`

**Solution**:
1. Ensure `workspace:*` is used (not `bun link`)
2. Run `bun install` to resolve workspace dependencies
3. Check `package.json` has `workspaces` array

### Issue: Version Mismatch After Publishing

**Error**: `Version mismatch between packages`

**Solution**:
1. Use publish script with `VERSION` environment variable
2. Script automatically updates all versions
3. Verify with `--dry-run` first

---

## Best Practices

1. **Always use `workspace:*`** for inter-package dependencies
2. **Never use `bun link`** within workspace
3. **Pin versions** before publishing with `VERSION=1.4.0 bun run scripts/publish-to-registry.ts`
4. **Test published packages** in CI with `BUN_WORKSPACES_DISABLED=1`
5. **Use Bun.secrets** for token storage in production

---

## Related Documentation

- [Bun Workspaces](./BUN-WORKSPACES.md) - Complete workspace guide
- [Bun Link](./BUN-LINK.md) - External package linking
- [Bun Isolated Installs](./BUN-ISOLATED-INSTALLS.md) - Dependency isolation
- [Bun Catalogs & Workspace Protocol](./BUN-CATALOGS-WORKSPACE-PROTOCOL.md) - Version management

---

## Quick Start

### Automated Setup

Run the interactive setup script:

```bash
# Interactive setup (guides through all steps)
bun run setup:workspace

# Non-interactive (uses environment variables)
bun run setup:workspace --non-interactive
```

Or use the shell script:

```bash
# Set token first
export GRAPH_NPM_TOKEN="your-token-here"

# Run quick start
./scripts/quick-start-workspace.sh
```

### Manual Setup

```bash
# 1. Set registry token
export GRAPH_NPM_TOKEN="your-token-here"

# 2. Validate workspace dependencies
bun run validate:workspace

# 3. Install dependencies (workspace:* resolves automatically)
bun install

# 4. Publish packages with version pinning
VERSION=1.4.0 bun run publish:registry

# 5. In CI, test with workspaces disabled
BUN_WORKSPACES_DISABLED=1 bun install && bun test
```

## Quick Reference

```bash
# Setup workspace registry
bun run setup:workspace

# Validate workspace dependencies
bun run validate:workspace

# Install with workspace dependencies
bun install

# Publish with version pinning (enhanced script with OTP/tag support)
VERSION=1.4.1 bun run publish:graph --otp=123456

# Or use legacy script
VERSION=1.4.0 bun run publish:registry

# Test published packages (CI)
BUN_WORKSPACES_DISABLED=1 bun install && bun test

# Check workspace packages
bun pm ls

# Verify registry configuration
cat bunfig.toml | grep -A 3 "@graph"
```
