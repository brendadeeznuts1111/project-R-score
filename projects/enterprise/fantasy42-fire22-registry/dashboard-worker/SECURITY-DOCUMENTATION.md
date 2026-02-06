# 🛡️ Fire22 Security System Documentation

Complete documentation for the Fire22 dashboard security infrastructure powered
by Bun's native security APIs.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Security Packages](#security-packages)
4. [Credential Management](#credential-management)
5. [Security Scanner](#security-scanner)
6. [Scoped Package Security](#scoped-package-security)
7. [Installation & Setup](#installation--setup)
8. [Configuration](#configuration)
9. [API Reference](#api-reference)
10. [Commands Reference](#commands-reference)
11. [Integration Examples](#integration-examples)
12. [Best Practices](#best-practices)
13. [Troubleshooting](#troubleshooting)

---

## Overview

The Fire22 Security System is an enterprise-grade security infrastructure built
on Bun's native security APIs. It provides comprehensive protection against
supply chain attacks, credential leaks, and malicious packages while maintaining
excellent developer experience.

### Key Features

- 🔐 **Native Credential Storage** - OS keychain integration (Keychain,
  libsecret, Credential Manager)
- 🛡️ **Security Scanner** - Production-ready Bun Security Scanner API
  implementation
- 📦 **Scoped Package Security** - Granular control over package scopes and
  registries
- 🔍 **Threat Detection** - CVE scanning, typosquatting detection, malware
  blocking
- ⚡ **Zero Dependencies** - Pure Bun native APIs for maximum performance
- 🏗️ **Workspace Integration** - Seamless integration with Fire22 package
  ecosystem

### System Requirements

- **Bun**: v1.2.20 or higher
- **Node.js**: v18.0.0 or higher (for TypeScript compilation)
- **OS Support**: macOS, Linux, Windows
- **TypeScript**: v5.9.2 or higher

---

## Architecture

### Component Overview

```text
┌─────────────────────────────────────────────────────┐
│                 Fire22 Security System               │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────┐    ┌──────────────────┐      │
│  │ @fire22/security │    │ @fire22/security │      │
│  │      -core       │    │    -scanner      │      │
│  └──────────────────┘    └──────────────────┘      │
│           │                        │                 │
│           ▼                        ▼                 │
│  ┌──────────────────────────────────────────┐      │
│  │         Bun Native Security APIs          │      │
│  ├──────────────────────────────────────────┤      │
│  │ • Bun.secrets (Credential Management)     │      │
│  │ • Security Scanner API                    │      │
│  │ • Bun.semver.satisfies (Version Checking) │      │
│  │ • Bun.hash (Integrity Verification)       │      │
│  └──────────────────────────────────────────┘      │
│                                                      │
│  ┌──────────────────────────────────────────┐      │
│  │          OS Native Integration            │      │
│  ├──────────────────────────────────────────┤      │
│  │ • macOS: Keychain Services                │      │
│  │ • Linux: libsecret (GNOME/KDE)           │      │
│  │ • Windows: Credential Manager             │      │
│  └──────────────────────────────────────────┘      │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Package Structure

```text
packages/
├── security-core/          # Core security utilities
│   ├── src/
│   │   ├── index.ts       # Main exports
│   │   ├── secrets.ts     # Credential management
│   │   ├── scanner.ts     # Security scanning
│   │   ├── env.ts         # Environment management
│   │   └── types.ts       # TypeScript definitions
│   └── package.json
│
├── security-scanner/       # Bun Security Scanner
│   ├── src/
│   │   ├── index.ts       # Scanner implementation
│   │   ├── types.ts       # Type definitions
│   │   ├── demo.ts        # Interactive demo
│   │   ├── scoped-demo.ts # Scoped package demo
│   │   └── scanner.test.ts # Test suite
│   └── package.json
│
scripts/
├── bun-secrets-demo.ts    # Credential management demo
├── security-scanner-demo.ts # Scanner capabilities demo
└── secure-env-manager.ts  # Environment security demo
```

---

## Security Packages

### @fire22/security-core

Core security utilities and credential management for Fire22 dashboard.

#### Installation

```bash
bun add @fire22/security-core
```

#### Features

- Secure credential storage using OS keychain
- Environment management with validation
- Security auditing and reporting
- Integration with Fire22 package ecosystem

#### Usage

```typescript
import { initializeFire22Security } from '@fire22/security-core';

const security = await initializeFire22Security({
  service: 'fire22-dashboard',
  environments: ['development', 'staging', 'production'],
});

// Store credentials
await security.storeCredential('database_url', 'postgresql://...');

// Retrieve credentials
const dbUrl = await security.getCredential('database_url');

// Audit environment
await security.auditSecurity();
```

### @fire22/security-scanner

Production-ready implementation of Bun's Security Scanner API.

#### Installation

```bash
bun add -d @fire22/security-scanner
```

#### Features

- Fatal/warn advisory levels
- CVE vulnerability detection
- Typosquatting protection
- Fire22 workspace policies
- Threat feed integration
- Scope squatting detection

#### Configuration

```toml
# bunfig.toml
[install.security]
scanner = "@fire22/security-scanner"
```

---

## Credential Management

### Bun.secrets Integration

The Fire22 security system uses Bun's native `secrets` API for secure credential
storage.

#### Storing Credentials

```typescript
import { secrets } from 'bun';

// Store database credentials
await secrets.set({
  service: 'fire22-dashboard',
  name: 'database_url',
  value: 'postgresql://user:pass@localhost:5432/fire22',
});

// Store API tokens
await secrets.set({
  service: 'fire22-dashboard',
  name: 'fire22_api_token',
  value: 'f22_live_api_xxxxx',
});
```

#### Retrieving Credentials

```typescript
// Get credentials during app startup
const dbUrl = await secrets.get({
  service: 'fire22-dashboard',
  name: 'database_url',
});

const apiToken = await secrets.get({
  service: 'fire22-dashboard',
  name: 'fire22_api_token',
});
```

#### Environment-Specific Credentials

```typescript
const envManager = new SecureEnvironmentManager();

// Setup production credentials
await envManager.setupEnvironment('production');

// Load environment with validation
const env = await envManager.loadEnvironment('production');
```

### Platform-Specific Storage

| Platform    | Storage Location                  | Access Method                      |
| ----------- | --------------------------------- | ---------------------------------- |
| **macOS**   | Keychain Services                 | Keychain Access app                |
| **Linux**   | libsecret (GNOME Keyring/KWallet) | seahorse or kwalletmanager         |
| **Windows** | Credential Manager                | Control Panel → Credential Manager |

### Migration from .env Files

```typescript
// Migrate existing .env files to secure storage
const migration = await security.credentialManager.migrateFromEnv({
  DATABASE_URL: 'database_url',
  FIRE22_API_TOKEN: 'fire22_api_token',
  JWT_SECRET: 'jwt_secret',
});

console.log('Migrated:', migration.migrated);
console.log('Skipped:', migration.skipped);
console.log('Errors:', migration.errors);
```

---

## Security Scanner

### Advisory Levels

The security scanner implements two advisory levels as per Bun's specification:

#### Fatal Level

- **Behavior**: Installation stops immediately
- **Exit Code**: Non-zero
- **Examples**: Malware, backdoors, token stealers, critical CVEs
- **Fire22 Policies**: Cryptocurrency mining, known malicious packages

#### Warning Level

- **Behavior**: User prompted in TTY, auto-cancel in CI
- **Exit Code**: Zero in interactive mode (if user continues)
- **Examples**: Deprecated packages, pre-release versions, policy violations
- **Fire22 Policies**: Gambling packages, network tunneling tools

### Threat Detection

#### CVE Vulnerability Detection

```typescript
// Uses Bun.semver.satisfies for precise version checking
if (Bun.semver.satisfies(version, '>=1.0.0 <1.2.5')) {
  // Version is vulnerable
  return {
    level: 'fatal',
    cve: 'CVE-2021-23337',
    description: 'Command injection vulnerability',
  };
}
```

#### Typosquatting Detection

```typescript
// Levenshtein distance algorithm
const popularPackages = ['react', 'lodash', 'express'];
if (isTyposquat(packageName, popularPackage)) {
  return {
    level: 'fatal',
    title: 'Potential typosquatting detected',
    description: `Suspicious similarity to ${popularPackage}`,
  };
}
```

#### Fire22 Custom Policies

```typescript
const fire22Policies = [
  {
    name: 'no-crypto-mining',
    pattern: /(crypto|mining|bitcoin)/i,
    level: 'fatal',
    description: 'Cryptocurrency mining not allowed',
  },
  {
    name: 'gambling-restriction',
    pattern: /(gambling|casino|poker)/i,
    level: 'warn',
    description: 'Requires security team approval',
  },
];
```

### Threat Feed Integration

```typescript
// Threat feed with Zod validation
const ThreatFeedSchema = z.object({
  version: z.string(),
  lastUpdated: z.string(),
  items: z.array(
    z.object({
      package: z.string(),
      version: z.string(),
      severity: z.enum(['fatal', 'warn']),
      categories: z.array(z.enum(['backdoor', 'malware', 'token-stealer'])),
    })
  ),
});

// Validated threat feed updates
const validatedFeed = ThreatFeedSchema.parse(threatFeedData);
```

---

## Scoped Package Security

### Scope Hierarchy

```text
Trust Level: AUTO-TRUST → HIGH → MEDIUM → VERIFY → BLOCK

@fire22/*           [AUTO-TRUST]  Private registry, no scanning
@types/*            [HIGH]         Type definitions, minimal scan
@cloudflare/*       [HIGH]         Platform packages, standard scan
@sendgrid/*         [MEDIUM]       Third-party, full scan
@typescript-eslint/* [MEDIUM]       Dev tools, full scan
@*                  [VERIFY]       Unknown scopes, comprehensive scan
unscoped            [VERIFY]       Maximum scrutiny
```

### Registry Configuration

```toml
# bunfig.toml
[install]
registry = "https://registry.npmjs.org/"

[install.scopes]
"@fire22" = "https://fire22.workers.dev/registry"
"@types" = "https://registry.npmjs.org/"
"@cloudflare" = "https://registry.npmjs.org/"
```

### Scope Squatting Protection

Automatically detects and blocks suspicious scope names:

- **Hyphenation**: `@fire-22` → Blocked
- **Suffixes**: `@fire22js`, `@fire22io` → Blocked
- **Substitution**: `@f1re22`, `@fir322` → Blocked
- **Similar**: `@firebase22` → Warning

### Workspace Protocol Security

```json
{
  "dependencies": {
    "@fire22/core": "workspace:*",
    "@fire22/security-core": "workspace:*"
  }
}
```

Benefits:

- No network requests (zero supply chain risk)
- Local-only resolution
- Automatic trust
- Version locking

---

## Installation & Setup

### Quick Start

#### 1. Install Security Packages

```bash
# Install security core
bun add @fire22/security-core

# Install security scanner (dev dependency)
bun add -d @fire22/security-scanner
```

#### 2. Configure bunfig.toml

```toml
[install.security]
scanner = "@fire22/security-scanner"

[install]
auto = false
exact = true
production = true

[install.scopes]
"@fire22" = "https://fire22.workers.dev/registry"
```

#### 3. Setup Credentials

```bash
# Run interactive setup
bun run env-setup production

# Or programmatically
bun run security:setup
```

#### 4. Verify Installation

```bash
# Run security demos
bun run security:complete

# Test scanner
bun run security:scanner-test
```

### Production Setup

#### CI/CD Integration

```yaml
# .github/workflows/security.yml
name: Security Scan

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1

      - name: Configure Security Scanner
        run: |
          echo '[install.security]' > bunfig.toml
          echo 'scanner = "@fire22/security-scanner"' >> bunfig.toml

      - name: Install with Security Scanning
        run: bun install --frozen-lockfile

      - name: Security Audit
        run: bun audit --audit-level=high --prod
```

#### Docker Integration

```dockerfile
FROM oven/bun:1.2.20

# Copy security configuration
COPY bunfig.toml .

# Install with security scanning
RUN bun install --production

# Store credentials securely (example)
RUN --mount=type=secret,id=db_url \
    bun run store-credential database_url "$(cat /run/secrets/db_url)"
```

---

## Configuration

### bunfig.toml Complete Example

```toml
# Fire22 Security Configuration
[install.security]
scanner = "@fire22/security-scanner"

[install]
# Security settings
auto = false          # Disable auto-install
exact = true          # Exact versions only
production = true     # Production mode

# Registry configuration
registry = "https://registry.npmjs.org/"

[install.scopes]
# Private registry for Fire22 packages
"@fire22" = "https://fire22.workers.dev/registry"
# Public registries for trusted scopes
"@types" = "https://registry.npmjs.org/"
"@cloudflare" = "https://registry.npmjs.org/"

[install.cache]
dir = "~/.bun/install/cache"
disable = false

[install.lockfile]
save = true
print = "yarn"

[test]
coverage = true
timeout = 30000

[logLevel]
default = "info"
install = "verbose"   # Detailed security logs
```

### Environment Variables

```bash
# Security-related environment variables
FIRE22_SECURITY_LEVEL=strict         # strict | standard | permissive
FIRE22_SCANNER_ENABLED=true          # Enable/disable scanner
FIRE22_THREAT_FEED_URL=https://...   # Custom threat feed
FIRE22_REGISTRY_TOKEN=xxxxx          # Private registry token
```

### Security Policies Configuration

```typescript
// security-config.ts
export const securityConfig = {
  scanner: {
    enabled: true,
    policies: [
      {
        name: 'no-eval',
        pattern: /eval/i,
        level: 'fatal',
        description: 'eval() usage prohibited',
      },
    ],
  },
  credentials: {
    validation: true,
    rotation: {
      enabled: true,
      interval: '30d',
    },
  },
  audit: {
    enabled: true,
    schedule: '0 0 * * *', // Daily at midnight
  },
};
```

---

## API Reference

### Security Core API

#### initializeFire22Security(config?)

Initialize the security system with optional configuration.

```typescript
const security = await initializeFire22Security({
  service: 'fire22-dashboard',
  environments: ['development', 'staging', 'production'],
  scanner: {
    enabled: true,
    excludePackages: ['@fire22/testing-framework'],
  },
});
```

#### storeCredential(name, value, description?, environment?)

Store a credential securely in OS keychain.

```typescript
await security.storeCredential(
  'database_url',
  'postgresql://localhost:5432/fire22',
  'Production database',
  'production'
);
```

#### getCredential(name, options?)

Retrieve a credential from secure storage.

```typescript
const dbUrl = await security.getCredential('database_url', {
  environment: 'production',
  fallback: process.env.DATABASE_URL,
});
```

#### scanDependencies()

Scan all project dependencies for security issues.

```typescript
const result = await security.scanDependencies();
if (!result.passed) {
  console.error('Security issues:', result.issues);
}
```

### Security Scanner API

#### scan(request)

Main scanner function (Bun Security Scanner API compliant).

```typescript
const result = await scanner.scan({
  packages: [
    { name: 'express', version: '4.18.2' },
    { name: 'lodash', version: '4.17.21' },
  ],
  context: {
    production: true,
    environment: 'production',
  },
});
```

#### Response Format

```typescript
interface ScanResult {
  advisories: Array<{
    level: 'fatal' | 'warn';
    package: string;
    version: string;
    title: string;
    description: string;
    recommendation: string;
    url?: string;
    cve?: string;
  }>;
  metadata: {
    scannerName: string;
    scannerVersion: string;
    scanTime: number;
    packagesScanned: number;
  };
}
```

---

## Commands Reference

### Security Commands

| Command                            | Description                        |
| ---------------------------------- | ---------------------------------- |
| `bun run security:complete`        | Run all security demos             |
| `bun run security:integration`     | Fire22 workspace integration demo  |
| `bun run security:scanner-demo`    | Security scanner capabilities demo |
| `bun run security:scoped-demo`     | Scoped package security demo       |
| `bun run security:scanner-test`    | Run security scanner tests         |
| `bun run security:setup`           | Install and configure security     |
| `bun run security:publish-scanner` | Prepare scanner for publishing     |

### Credential Commands

| Command                   | Description                            |
| ------------------------- | -------------------------------------- |
| `bun run secrets-demo`    | Interactive credential management demo |
| `bun run env-setup [env]` | Setup environment credentials          |
| `bun run env-audit`       | Security audit of environment          |

### Workspace Commands

| Command                               | Description                    |
| ------------------------------------- | ------------------------------ |
| `bun run workspace:security`          | Workspace security integration |
| `bun audit --audit-level=high --prod` | Audit production dependencies  |

---

## Integration Examples

### Express.js Application

```typescript
import express from 'express';
import { initializeFire22Security } from '@fire22/security-core';

const app = express();
const security = await initializeFire22Security();

// Load secure credentials
const dbUrl = await security.getCredential('database_url');
const jwtSecret = await security.getCredential('jwt_secret');

// Configure with secure values
app.set('db-url', dbUrl);
app.set('jwt-secret', jwtSecret);
```

### Cloudflare Workers

```typescript
import { initializeFire22Security } from '@fire22/security-core';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const security = await initializeFire22Security();

    // Get Fire22 API token from secure storage
    const apiToken = await security.getCredential('fire22_api_token');

    // Use for API requests
    const fire22Response = await fetch('https://api.fire22.com/data', {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

    return new Response('Secure!');
  },
};
```

### Database Connection

```typescript
import { Pool } from 'pg';
import { initializeFire22Security } from '@fire22/security-core';

async function createDatabasePool() {
  const security = await initializeFire22Security();
  const dbUrl = await security.getCredential('database_url', {
    environment: process.env.NODE_ENV || 'development',
  });

  return new Pool({
    connectionString: dbUrl,
    max: 20,
    idleTimeoutMillis: 30000,
  });
}
```

### Package Installation Hook

```typescript
// .bunfig.toml hook script
import { Fire22SecurityScanner } from '@fire22/security-scanner';

export async function preInstall(packages) {
  const scanner = new Fire22SecurityScanner();
  const result = await scanner.scan({ packages });

  if (!result.passed) {
    const fatalIssues = result.advisories.filter(a => a.level === 'fatal');
    if (fatalIssues.length > 0) {
      throw new Error(
        `Security threats detected: ${fatalIssues.length} fatal issues`
      );
    }
  }
}
```

---

## Best Practices

### Credential Management

#### DO:

- ✅ Use Bun.secrets for all sensitive credentials
- ✅ Store environment-specific credentials separately
- ✅ Rotate credentials regularly (30-90 days)
- ✅ Use validation patterns for credential formats
- ✅ Audit credential access regularly

#### DON'T:

- ❌ Store credentials in .env files in production
- ❌ Commit credentials to version control
- ❌ Use the same credentials across environments
- ❌ Share credential access broadly
- ❌ Log credential values

### Package Security

#### DO:

- ✅ Enable security scanner in bunfig.toml
- ✅ Use exact versions in production (`exact = true`)
- ✅ Prefer scoped packages from trusted organizations
- ✅ Regular security audits (`bun audit`)
- ✅ Use workspace protocol for internal packages

#### DON'T:

- ❌ Disable security scanner in production
- ❌ Use auto-install in production (`auto = false`)
- ❌ Install packages from untrusted sources
- ❌ Ignore security warnings
- ❌ Use deprecated packages

### Registry Management

#### DO:

- ✅ Configure private registry for internal packages
- ✅ Use scoped registries in bunfig.toml
- ✅ Authenticate private registry with Bun.secrets
- ✅ Verify package signatures when available
- ✅ Monitor registry access logs

#### DON'T:

- ❌ Allow fallback to public registry for private packages
- ❌ Store registry tokens in plaintext
- ❌ Use insecure registry connections (HTTP)
- ❌ Share registry tokens across teams
- ❌ Bypass registry authentication

### Development Workflow

#### DO:

- ✅ Run security scanner in CI/CD pipelines
- ✅ Test security policies locally before deployment
- ✅ Document security requirements in README
- ✅ Train team on security best practices
- ✅ Regular security reviews and updates

#### DON'T:

- ❌ Skip security checks for "quick fixes"
- ❌ Disable security for development convenience
- ❌ Assume internal packages are always safe
- ❌ Ignore security advisories
- ❌ Deploy without security scanning

---

## Troubleshooting

### Common Issues

#### Issue: Credentials not found in keychain

```bash
Error: Credential 'database_url' not found in keychain
```

**Solution:**

```bash
# Setup credentials for current environment
bun run env-setup development

# Or manually store
bun run scripts/bun-secrets-demo.ts
```

#### Issue: Security scanner blocking legitimate package

```bash
Fatal: Package 'crypto-js' blocked by security policy
```

**Solution:**

```typescript
// Add exception in security config
const policies = [
  {
    name: 'crypto-policy',
    pattern: /crypto/i,
    excludePatterns: ['crypto-js'], // Add exception
    level: 'fatal',
  },
];
```

#### Issue: Private registry authentication failing

```bash
Error: 401 Unauthorized - @fire22/core
```

**Solution:**

```bash
# Store registry token securely
await secrets.set({
  service: 'fire22-registry',
  name: 'auth-token',
  value: 'your-registry-token'
});
```

#### Issue: Scope squatting false positive

```bash
Warning: @firebase/core detected as potential squatting
```

**Solution:**

```toml
# Add to trusted scopes in bunfig.toml
[install.scopes]
"@firebase" = "https://registry.npmjs.org/"
```

### Debug Mode

Enable detailed logging for troubleshooting:

```bash
# Set log level in bunfig.toml
[logLevel]
install = "verbose"
security = "debug"

# Or via environment variable
FIRE22_DEBUG=security bun install
```

### Performance Issues

#### Slow credential retrieval

- Check keychain access permissions
- Clear keychain cache
- Reduce concurrent credential operations

#### Slow security scanning

- Update threat feed cache
- Reduce package scan batch size
- Enable parallel scanning

```typescript
// Optimize scanning
const scanner = new Fire22SecurityScanner({
  caching: { enabled: true, ttl: 3600000 },
  parallel: true,
  batchSize: 50,
});
```

---

## Support & Resources

### Documentation

- [Fire22 Endpoints Security](./FIRE22-ENDPOINTS-SECURITY.md)
- [Security Integration Guide](./SECURITY-INTEGRATION-GUIDE.md)
- [@fire22/validator Documentation](./packages/fire22-validator/README.md)
- [Endpoint Matrix](./ENDPOINT-MATRIX.md)
- [Bun Security Scanner API](https://bun.sh/docs/api/security-scanner)
- [Bun.secrets API](https://bun.sh/docs/api/secrets)
- [Fire22 Security GitHub](https://github.com/fire22/security)

### Community

- Fire22 Discord: [discord.gg/fire22](https://discord.gg/fire22)
- Security Issues: security@fire22.com
- Bug Reports:
  [GitHub Issues](https://github.com/brendadeeznuts1111/fire22-dashboard-worker/issues)

### Version History

- v1.0.0 - Initial release with Bun.secrets and scanner
- v1.1.0 - Added scoped package security
- v1.2.0 - Workspace protocol integration
- v1.3.0 - Enhanced threat detection

---

## License

MIT © Fire22 Development Team

---

**Last Updated**: December 2024  
**Version**: 1.3.0  
**Status**: Production Ready

🔥 Built with Bun for maximum security and performance.
