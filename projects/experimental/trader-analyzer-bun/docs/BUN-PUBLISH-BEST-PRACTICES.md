# Bun Publish Best Practices

**Reference**: [Bun Publish Documentation](https://bun.com/docs/pm/cli/publish)

---

## Best Practices Table

| Practice                    | Command                        | Rationale                        |
| --------------------------- | ------------------------------ | -------------------------------- |
| **Always dry-run first**    | `bun publish --dry-run`        | Catches packaging errors early   |
| **Use scoped packages**     | `@graph/layer4`                | Prevents name collisions         |
| **Restrict access**         | `--access restricted`          | Private packages only            |
| **Automate in CI**          | GitHub Actions                 | Consistent, audited publishes    |
| **Tag pre-releases**        | `--tag=beta`                   | Separate stable from unstable    |
| **Validate before publish** | `bun test && bun bench`        | No broken packages in registry   |
| **Use OTP in CI**           | `--otp=${{ secrets.NPM_OTP }}` | 2FA security compliance          |
| **Version with changesets** | `bun changeset version`        | Automated changelog & versioning |

---

## 1. Always Dry-Run First

**Why**: Catches packaging errors before publishing to registry.

```bash
# Test packaging without publishing
bun run publish:graph --dry-run

# Or with bun publish directly
bun publish --dry-run
```

**Our Script**: Automatically runs dry-run first (unless `--skip-validation` is used).

---

## 2. Use Scoped Packages

**Why**: Prevents name collisions, groups related packages.

```json
{
  "name": "@graph/layer4",
  "name": "@graph/types",
  "name": "@graph/api"
}
```

**Best Practice**: All `@graph/*` packages are scoped.

---

## 3. Restrict Access

**Why**: Private packages should not be publicly accessible.

```bash
# Private packages (default in our script)
bun publish --access restricted

# Public packages (only if needed)
bun publish --access public
```

**Our Script**: Defaults to `--access restricted` for private registry.

---

## 4. Automate in CI

**Why**: Consistent, audited publishes with proper security.

**GitHub Actions Workflow**: `.github/workflows/publish-graph-packages.yml`

```yaml
- name: Publish packages
  run: |
    VERSION=${{ inputs.version }} bun run publish:graph \
      --otp=${{ secrets.NPM_OTP }} \
      --tag=${{ inputs.tag }} \
      --access=restricted
  env:
    GRAPH_NPM_TOKEN: ${{ secrets.GRAPH_NPM_TOKEN }}
    NPM_OTP: ${{ secrets.NPM_OTP }}
```

**Usage**:
1. Go to Actions → "Publish Graph Packages"
2. Click "Run workflow"
3. Enter version, tag, optional package name
4. Workflow validates, tests, and publishes

---

## 5. Tag Pre-Releases

**Why**: Separate stable releases from unstable pre-releases.

```bash
# Beta release
VERSION=1.5.0-beta.1 bun run publish:graph --tag=beta

# Release candidate
VERSION=1.5.0-rc.1 bun run publish:graph --tag=rc

# Stable release (default)
VERSION=1.4.1 bun run publish:graph
```

**Auto-Detection**: Script automatically detects tags from version:
- `1.5.0-beta.1` → `beta`
- `1.5.0-rc.1` → `rc`
- `1.4.1` → `latest`

---

## 6. Validate Before Publish

**Why**: No broken packages in registry.

```bash
# Run tests
bun test

# Run benchmarks
bun bench

# Then publish
VERSION=1.4.1 bun run publish:graph
```

**Our Script**: Automatically runs validation (unless `--skip-validation`):
- ✅ Runs `bun test` (required)
- ✅ Runs `bun bench` (non-blocking)

**Skip Validation** (not recommended):
```bash
VERSION=1.4.1 bun run publish:graph --skip-validation
```

---

## 7. Use OTP in CI

**Why**: 2FA security compliance.

```bash
# Manual publish with OTP
VERSION=1.4.1 bun run publish:graph --otp=123456

# CI with secret
VERSION=1.4.1 bun run publish:graph --otp=${{ secrets.NPM_OTP }}
```

**Setup**:
1. Enable 2FA on npm registry
2. Store OTP in GitHub Secrets (`NPM_OTP`)
3. CI workflow uses it automatically

---

## 8. Version with Changesets

**Why**: Automated changelog & versioning.

```bash
# Install changesets
bun add -d @changesets/cli

# Create changeset
bun changeset

# Version packages
bun changeset version

# Publish
VERSION=1.4.1 bun run publish:graph
```

**Our Script**: Automatically uses changeset if available (unless `--no-changeset`).

---

## Complete Workflow Example

### Development

```bash
# 1. Make changes
git checkout -b feat/new-feature

# 2. Create changeset
bun changeset

# 3. Commit changes
git commit -am "feat: add new feature"
```

### Pre-Publish

```bash
# 1. Always dry-run first
bun run publish:graph --dry-run

# 2. Run validation
bun test && bun bench

# 3. Check workspace dependencies
bun run validate:workspace
```

### Publishing

```bash
# 1. Version with changeset
bun changeset version

# 2. Publish with OTP
VERSION=1.4.1 bun run publish:graph --otp=123456

# 3. Verify published packages
bun install --registry https://npm.internal.yourcompany.com
```

### CI/CD

```bash
# Automated via GitHub Actions
# 1. Go to Actions → "Publish Graph Packages"
# 2. Run workflow with version and tag
# 3. Workflow handles validation, testing, and publishing
```

---

## Command Reference

### Our Enhanced Script

```bash
# Dry run
bun run publish:graph --dry-run

# Publish with OTP
VERSION=1.4.1 bun run publish:graph --otp=123456

# Publish beta
VERSION=1.5.0-beta.1 bun run publish:graph --tag=beta

# Publish specific package
VERSION=1.4.1 bun run publish:graph --package @graph/types

# Skip validation (not recommended)
VERSION=1.4.1 bun run publish:graph --skip-validation

# Custom access
VERSION=1.4.1 bun run publish:graph --access=public
```

### Direct Bun Publish

```bash
# Dry run
bun publish --dry-run

# With OTP
bun publish --otp=123456

# With tag
bun publish --tag=beta

# Restricted access
bun publish --access=restricted
```

---

## Security Checklist

- [ ] ✅ Always dry-run first
- [ ] ✅ Use scoped packages (`@graph/*`)
- [ ] ✅ Use `--access restricted` for private packages
- [ ] ✅ Use OTP/2FA in CI
- [ ] ✅ Validate before publish (tests & benchmarks)
- [ ] ✅ Tag pre-releases appropriately
- [ ] ✅ Use changesets for versioning
- [ ] ✅ Automate in CI for consistency

---

## Related Documentation

- [Publish Graph Monorepo](./BUN-PUBLISH-GRAPH-MONOREPO.md) - Script usage
- [Bun Workspaces with Private Registry](./BUN-WORKSPACES-PRIVATE-REGISTRY.md) - Registry setup
- [Bun Publish Documentation](https://bun.com/docs/pm/cli/publish) - Official docs
