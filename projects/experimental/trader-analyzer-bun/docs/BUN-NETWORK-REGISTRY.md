# Bun Network & Registry Configuration

**Reference**: [Bun Package Manager Documentation](https://bun.com/docs/pm/cli/publish)

---

## Network & Registry Options

### `--ca` / `--cafile`

Provide Certificate Authority signing certificate for TLS verification.

**Usage**:
```bash
# Certificate as string
bun install --ca="-----BEGIN CERTIFICATE-----\n..."

# Certificate file path
bun install --cafile=/path/to/cert.pem

# Or use --cafile
bun install --cafile=./ca-bundle.crt
```

**Use Cases**:
- Corporate networks with custom CA certificates
- Self-signed certificates
- Internal registries with custom SSL

**Example**:
```bash
# Install with custom CA
bun install --cafile=./config/ca-bundle.crt

# Publish with custom CA
bun publish --cafile=./config/ca-bundle.crt
```

---

### `--registry`

Use a specific registry by default, overriding `.npmrc`, `bunfig.toml` and environment variables.

**Usage**:
```bash
# Use specific registry
bun install --registry=https://npm.internal.yourcompany.com

# Publish to specific registry
bun publish --registry=https://npm.internal.yourcompany.com

# Override for single command
bun add <package> --registry=https://custom-registry.com
```

**Priority Order**:
1. CLI `--registry` flag (highest priority)
2. Environment variable (`NPM_CONFIG_REGISTRY`)
3. `.npmrc` file
4. `bunfig.toml` scoped registry
5. Default npm registry (lowest priority)

**Example**:
```bash
# Install from private registry
bun install --registry=https://npm.internal.yourcompany.com

# Publish to private registry
bun publish --registry=https://npm.internal.yourcompany.com --otp=123456
```

**Configuration in `bunfig.toml`**:
```toml
[install.scopes."@graph"]
registry = "https://npm.internal.yourcompany.com"
token = "$GRAPH_NPM_TOKEN"
```

---

### `--network-concurrency`

Maximum number of concurrent network requests (default: 48).

**Usage**:
```bash
# Reduce concurrency (slower but more stable)
bun install --network-concurrency=16

# Increase concurrency (faster but more resource-intensive)
bun install --network-concurrency=96

# For slow networks
bun install --network-concurrency=8
```

**Default**: `48` concurrent requests

**Use Cases**:
- **Reduce concurrency** (`8-16`):
  - Slow/unstable networks
  - Rate-limited APIs
  - Corporate firewalls
  - CI/CD with limited resources

- **Increase concurrency** (`64-96`):
  - Fast networks
  - Large dependency trees
  - CI/CD with good resources

**Example**:
```bash
# Slow network
bun install --network-concurrency=8

# Fast network, many packages
bun install --network-concurrency=96

# CI/CD (balanced)
bun install --network-concurrency=32
```

---

## Configuration Examples

### Corporate Network Setup

```bash
# Install with corporate CA certificate
bun install \
  --registry=https://npm.internal.company.com \
  --cafile=./config/corporate-ca.pem \
  --network-concurrency=16
```

### Private Registry Setup

```bash
# Install from private registry
bun install \
  --registry=https://npm.internal.yourcompany.com \
  --network-concurrency=32
```

### CI/CD Configuration

```bash
# CI with custom registry and reduced concurrency
bun install \
  --registry=https://npm.internal.yourcompany.com \
  --network-concurrency=24 \
  --frozen-lockfile
```

---

## Environment Variables

Set registry via environment variable:

```bash
# Set default registry
export NPM_CONFIG_REGISTRY="https://npm.internal.yourcompany.com"

# Then use normally
bun install
bun publish
```

**Priority**: CLI flag > Environment variable > Config files

---

## bunfig.toml Configuration

### Scoped Registry

```toml
[install.scopes."@graph"]
registry = "https://npm.internal.yourcompany.com"
token = "$GRAPH_NPM_TOKEN"
```

### Global Registry

```toml
[install]
registry = "https://npm.internal.yourcompany.com"
```

### Network Concurrency

```toml
[install]
network-concurrency = 32  # Default: 48
```

---

## Integration with Our Scripts

### Publish Script

Our `publish-graph-monorepo.ts` supports registry:

```bash
# Custom registry
VERSION=1.4.1 bun run publish:graph \
  --registry=https://custom-registry.com \
  --otp=123456
```

### Install Scripts

Add network options to install commands:

```bash
# Install with custom CA
bun install --cafile=./config/ca-bundle.crt

# Install with reduced concurrency
bun install --network-concurrency=16
```

---

## Troubleshooting

### Issue: SSL Certificate Errors

**Error**: `certificate verify failed`

**Solution**:
```bash
# Use custom CA certificate
bun install --cafile=./config/ca-bundle.crt

# Or disable verification (not recommended)
bun install --no-verify
```

### Issue: Network Timeouts

**Error**: `network timeout` or `ECONNRESET`

**Solution**:
```bash
# Reduce concurrency
bun install --network-concurrency=8

# Or increase timeout
bun install --timeout=60000
```

### Issue: Registry Not Found

**Error**: `registry not found` or `404`

**Solution**:
```bash
# Verify registry URL
bun install --registry=https://npm.internal.yourcompany.com

# Check bunfig.toml configuration
cat bunfig.toml | grep registry
```

---

## Best Practices

### 1. Use Scoped Registries

Configure in `bunfig.toml` for automatic use:

```toml
[install.scopes."@graph"]
registry = "https://npm.internal.yourcompany.com"
token = "$GRAPH_NPM_TOKEN"
```

### 2. Set Network Concurrency for CI

```bash
# CI/CD: Balanced concurrency
bun install --network-concurrency=32

# Local: Default (48) or higher
bun install --network-concurrency=64
```

### 3. Use CA Certificates for Corporate Networks

```bash
# Store CA in config/
bun install --cafile=./config/ca-bundle.crt

# Or configure in bunfig.toml
```

### 4. Override Registry Per Command

```bash
# One-off registry override
bun install --registry=https://custom-registry.com
```

---

## Quick Reference

```bash
# Custom registry
bun install --registry=https://npm.internal.yourcompany.com

# Custom CA certificate
bun install --cafile=./config/ca-bundle.crt

# Reduce concurrency
bun install --network-concurrency=16

# All together
bun install \
  --registry=https://npm.internal.yourcompany.com \
  --cafile=./config/ca-bundle.crt \
  --network-concurrency=24
```

---

## Related Documentation

- [Bun PM Commands](./BUN-PM-COMMANDS.md) - Package manager commands
- [Bun Workspaces with Private Registry](./BUN-WORKSPACES-PRIVATE-REGISTRY.md) - Registry setup
- [Bun Package Manager](./BUN-PM.md) - General PM docs
