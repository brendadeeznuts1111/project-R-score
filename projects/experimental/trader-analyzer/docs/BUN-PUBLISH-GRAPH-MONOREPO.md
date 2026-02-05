# Publish Graph Monorepo - Quick Reference

**Script**: `scripts/publish-graph-monorepo.ts`  
**Enhanced Features**: OTP (2FA), tags, dry-run, custom registry, validation, changeset support

**Best Practices**: See [Bun Publish Best Practices](./BUN-PUBLISH-BEST-PRACTICES.md)

---

## Quick Examples

### Dry Run (Test Without Publishing)

```bash
# Test publish without actually publishing
bun run scripts/publish-graph-monorepo.ts --dry-run

# Or use npm script
bun run publish:graph --dry-run
```

### Publish with 2FA/OTP

```bash
# Publish with one-time password (2FA)
VERSION=1.4.1 bun run scripts/publish-graph-monorepo.ts --otp=123456

# Short form
VERSION=1.4.1 bun run publish:graph --otp=123456
```

### Publish Beta Version

```bash
# Publish beta with beta tag
VERSION=1.5.0-beta.1 bun run scripts/publish-graph-monorepo.ts --tag=beta

# Auto-detects beta from version
VERSION=1.5.0-beta.1 bun run publish:graph
```

### Publish Specific Package

```bash
# Publish only one package
VERSION=1.4.1 bun run publish:graph --package @graph/types --otp=123456
```

### Custom Registry

```bash
# Use different registry
VERSION=1.4.1 bun run publish:graph --registry=https://custom-registry.com

# With custom CA certificate (corporate networks)
VERSION=1.4.1 bun run publish:graph --cafile=./config/ca-bundle.crt

# With reduced network concurrency (slow networks)
VERSION=1.4.1 bun run publish:graph --network-concurrency=16

# All together
VERSION=1.4.1 bun run publish:graph \
  --registry=https://custom-registry.com \
  --cafile=./config/ca-bundle.crt \
  --network-concurrency=16 \
  --otp=123456
```

---

## Command Line Options

| Option | Short | Description | Example |
|--------|-------|-------------|---------|
| `--dry-run` | `-d` | Test without publishing | `--dry-run` |
| `--otp=<code>` | `-o` | One-time password for 2FA | `--otp=123456` |
| `--tag=<tag>` | `-t` | Publish tag (beta, rc, latest) | `--tag=beta` |
| `--package=<name>` | `-p` | Publish specific package | `--package @graph/types` |
| `--registry=<url>` | `-r` | Custom registry URL | `--registry=https://custom.com` |
| `--access=<type>` | `-a` | Access level (restricted/public) | `--access=restricted` |
| `--cafile=<path>` | | CA certificate file path | `--cafile=./config/ca-bundle.crt` |
| `--ca=<cert>` | | CA certificate as string | `--ca="-----BEGIN CERTIFICATE-----..."` |
| `--network-concurrency=<n>` | `-n` | Max concurrent network requests | `--network-concurrency=16` |
| `--skip-validation` | | Skip tests & benchmarks | `--skip-validation` |
| `--skip-tests` | | Skip tests only | `--skip-tests` |
| `--skip-bench` | | Skip benchmarks only | `--skip-bench` |
| `--no-changeset` | | Don't use changeset versioning | `--no-changeset` |

---

## Tag Auto-Detection

The script automatically detects tags from version:

| Version Pattern | Auto Tag |
|----------------|----------|
| `1.4.1` | `latest` |
| `1.5.0-beta.1` | `beta` |
| `1.5.0-rc.1` | `rc` |
| `1.5.0-alpha.1` | `alpha` |

Override with `--tag` flag if needed.

---

## Complete Workflow

### 1. Test First (Dry Run) ✅ Best Practice

```bash
# Always dry-run first to catch packaging errors
bun run publish:graph --dry-run
```

### 2. Validate Before Publish ✅ Best Practice

```bash
# Run tests and benchmarks
bun test && bun bench

# Validate workspace dependencies
bun run validate:workspace
```

### 3. Use Changeset for Versioning ✅ Best Practice

```bash
# Create changeset (if using changesets)
bun changeset

# Version packages
bun changeset version
```

### 4. Publish Stable Release

```bash
# Publish with OTP (2FA) ✅ Best Practice
VERSION=1.4.1 bun run publish:graph --otp=123456

# Uses --access=restricted by default ✅ Best Practice
```

### 5. Publish Beta Release

```bash
# Tag pre-releases ✅ Best Practice
VERSION=1.5.0-beta.1 bun run publish:graph --tag=beta
```

### 6. Verify Published Packages

```bash
bun install --registry https://npm.internal.yourcompany.com
```

## Automated CI Workflow ✅ Best Practice

Use GitHub Actions for consistent, audited publishes:

```bash
# Go to Actions → "Publish Graph Packages"
# Run workflow with:
# - Version: 1.4.1
# - Tag: latest (or beta, rc)
# - Optional: Specific package name
```

See: `.github/workflows/publish-graph-packages.yml`

---

## Environment Variables

- `VERSION` - Required (except for dry-run)
- `GRAPH_NPM_TOKEN` - Registry authentication token (from bunfig.toml)

---

## Error Handling

The script will:
- ✅ Show clear error messages
- ✅ Exit with non-zero code on failure
- ✅ Display stderr output from bun publish
- ✅ Skip packages that don't exist

---

## Related Scripts

- `scripts/publish-to-registry.ts` - Legacy publish script (no OTP/tag support)
- `scripts/validate-workspace-deps.ts` - Validate workspace dependencies
- `scripts/setup-workspace-registry.ts` - Initial setup

---

## See Also

- [Bun Workspaces with Private Registry](./BUN-WORKSPACES-PRIVATE-REGISTRY.md)
- [Bun Workspaces Documentation](./BUN-WORKSPACES.md)
