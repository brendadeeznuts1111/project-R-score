# Fire22 Scoped Package Security

Complete guide to scoped package security in the Fire22 workspace ecosystem.

## 📦 Scoped Package Architecture

### Fire22 Scope Hierarchy

```
@fire22/*                    [Auto-Trusted, Private Registry]
├── @fire22/core
├── @fire22/security-core
├── @fire22/security-scanner
├── @fire22/middleware
├── @fire22/wager-system
├── @fire22/env-manager
├── @fire22/testing-framework
├── @fire22/core-dashboard
├── @fire22/pattern-system
├── @fire22/api-client
├── @fire22/sports-betting
├── @fire22/telegram-integration
└── @fire22/build-system

@types/*                     [High Trust, Public Registry]
@cloudflare/*               [High Trust, Public Registry]
@sendgrid/*                 [Standard Trust, Public Registry]
@typescript-eslint/*        [Standard Trust, Public Registry]
@*                          [Verify, Full Scanning]
unscoped packages           [Comprehensive Scanning]
```

## 🔒 Security Configuration

### bunfig.toml Configuration

```toml
[install.security]
scanner = "@fire22/security-scanner"

[install]
registry = "https://registry.npmjs.org/"
exact = true
auto = false

[install.scopes]
"@fire22" = "https://fire22.workers.dev/registry"
"@types" = "https://registry.npmjs.org/"
"@cloudflare" = "https://registry.npmjs.org/"
```

### Registry Authentication

```typescript
// Store private registry credentials securely
await secrets.set({
  service: 'fire22-registry',
  name: 'auth-token',
  value: process.env.FIRE22_REGISTRY_TOKEN,
});

// Automatically used during package installation
const token = await secrets.get({
  service: 'fire22-registry',
  name: 'auth-token',
});
```

## 🛡️ Security Policies by Scope

### @fire22/\* (Internal Packages)

- **Trust Level**: Automatic
- **Scanning**: Skip (pre-vetted)
- **Registry**: Private (https://fire22.workers.dev/registry)
- **Updates**: Workspace-controlled
- **Authentication**: Bearer token via Bun.secrets

### @types/\* (TypeScript Definitions)

- **Trust Level**: High
- **Scanning**: Minimal (definition files only)
- **Registry**: Public npm
- **Updates**: Auto-patch for security
- **Special**: No executable code

### @cloudflare/\* (Platform Integration)

- **Trust Level**: High
- **Scanning**: Standard
- **Registry**: Public npm
- **Updates**: Manual review
- **Special**: Workers runtime compatibility

### Other Scoped Packages

- **Trust Level**: Verify
- **Scanning**: Full security scan
- **Registry**: Public npm
- **Updates**: Manual approval required
- **Special**: Enhanced typosquatting detection

### Unscoped Packages

- **Trust Level**: Verify
- **Scanning**: Comprehensive + policy checks
- **Registry**: Public npm
- **Updates**: Manual approval required
- **Special**: Maximum security scrutiny

## 🔍 Scope Squatting Detection

The security scanner automatically detects potential scope squatting attempts:

### Detection Patterns

- **Hyphenation**: `@fire-22/*` instead of `@fire22/*`
- **Suffixes**: `@fire22js/*`, `@fire22io/*`
- **Character Substitution**: `@f1re22/*`, `@fir322/*`
- **Similar Names**: `@firebase22/*`, `@fire2/*`
- **Leetspeak**: `@f1r322/*`

### Protection Measures

```typescript
// Automatic detection during installation
if (isScopeSquat(packageScope, '@fire22')) {
  throw new SecurityError('Potential scope squatting detected');
}

// Levenshtein distance algorithm
// Blocks packages with distance ≤ 2 from legitimate scopes
```

## 🏗️ Workspace Protocol Security

### workspace:\* Protocol

```json
{
  "dependencies": {
    "@fire22/core": "workspace:*",
    "@fire22/security-core": "workspace:*"
  }
}
```

### Security Benefits

- **No Network**: Packages never leave local system
- **Zero Supply Chain Risk**: No external dependencies
- **Version Locking**: Precise workspace version control
- **Automatic Trust**: Pre-vetted internal code
- **Build-time Resolution**: Resolved during build, not runtime

## 🌐 Private Registry Integration

### Fire22 Private Registry

- **URL**: https://fire22.workers.dev/registry
- **Scope**: @fire22/\*
- **Authentication**: Bearer token (Bun.secrets)
- **Fallback**: Disabled (no public registry fallback)

### Security Features

- **Package Signing**: All packages cryptographically signed
- **Version Pinning**: Exact versions enforced
- **Audit Trail**: Complete installation history
- **Access Control**: Role-based package access
- **Integrity Checks**: SHA-256 hash verification

## 📊 Security Scanning Matrix

| Scope          | Trust  | Scan Level    | Registry | Auto-Update | Example                   |
| -------------- | ------ | ------------- | -------- | ----------- | ------------------------- |
| @fire22/\*     | Auto   | None          | Private  | No          | @fire22/core              |
| @types/\*      | High   | Minimal       | Public   | Patch       | @types/node               |
| @cloudflare/\* | High   | Standard      | Public   | No          | @cloudflare/workers-types |
| @aws-sdk/\*    | Medium | Full          | Public   | No          | @aws-sdk/client-s3        |
| @\* (other)    | Low    | Full          | Public   | No          | @unknown/package          |
| unscoped       | Low    | Comprehensive | Public   | No          | express                   |

## 🚀 Implementation Examples

### Secure Package Installation

```bash
# Automatically scans based on scope
bun add @fire22/core        # Skip scan (trusted)
bun add @types/node         # Minimal scan
bun add @unknown/package    # Full security scan
bun add malicious-package   # Blocked by scanner
```

### Workspace Configuration

```typescript
// workspace-config.json
{
  "workspaces": {
    "core-dashboard": {
      "dependencies": {
        "@fire22/pattern-system": "workspace:*",  // Internal, trusted
        "@cloudflare/workers-types": "^4.0.0",    // External, verified
        "express": "^4.18.2"                      // Unscoped, scanned
      }
    }
  }
}
```

### CI/CD Integration

```yaml
# GitHub Actions Example
- name: Security Scan
  run: |
    # Configure scanner
    echo '[install.security]' > bunfig.toml
    echo 'scanner = "@fire22/security-scanner"' >> bunfig.toml

    # Install with security scanning
    bun install --frozen-lockfile

    # Scanner automatically:
    # - Trusts @fire22/* packages
    # - Verifies other scoped packages
    # - Blocks malicious packages
```

## 🔐 Best Practices

### For Fire22 Development

1. **Always use @fire22/ scope** for internal packages
2. **Configure private registry** in bunfig.toml
3. **Store registry tokens** in Bun.secrets
4. **Use workspace:\*** protocol for local packages
5. **Enable security scanner** in production

### For External Dependencies

1. **Prefer scoped packages** from trusted organizations
2. **Verify scope ownership** before installation
3. **Review security advisories** for all packages
4. **Pin exact versions** in production
5. **Regular security audits** with `bun audit`

### For Package Publishing

1. **Publish to private registry** for @fire22/\* packages
2. **Sign packages** with GPG keys
3. **Include integrity hashes** in package.json
4. **Document security policies** in README
5. **Automate security scanning** in CI/CD

## 📝 Security Commands

```bash
# Complete security demo
bun run security:complete

# Scoped package security demo
bun run security:scoped-demo

# Security scanner demo
bun run security:scanner-demo

# Test security scanner
bun run security:scanner-test

# Workspace security integration
bun run workspace:security
```

## 🎯 Summary

Fire22's scoped package security provides:

- **Automatic trust** for @fire22/\* internal packages
- **Private registry** integration with secure authentication
- **Scope squatting** detection and prevention
- **Granular policies** per package scope
- **Workspace protocol** security benefits
- **Zero-trust model** for external packages
- **Enterprise-grade** threat detection

This multi-layered approach ensures maximum security while maintaining developer
productivity in the Fire22 workspace ecosystem.
