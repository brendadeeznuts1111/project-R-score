# @fire22/security-core

Enterprise-grade security package for Fire22 dashboard with native Bun
integration. Provides secure credential management, vulnerability scanning, and
environment isolation using Bun's native APIs.

## 🚀 Quick Start

```bash
# Install in your Fire22 workspace
bun add @fire22/security-core

# Run integration demo
bun run security:integration
```

## 🔐 Features

### Native Credential Management

- **OS Keychain Integration**: macOS Keychain, Linux libsecret, Windows
  Credential Manager
- **Environment Isolation**: Separate credentials for dev/staging/production
- **Zero Plaintext**: No secrets in code or config files
- **Performance**: 1.3ms average credential retrieval

### Security Scanner

- **Vulnerability Detection**: CVE scanning with severity levels
- **Custom Policies**: Fire22-specific security rules
- **Supply Chain Protection**: Malicious package detection
- **Workspace Integration**: Trusts @fire22/\* packages automatically

### Environment Management

- **Multi-Environment**: Seamless dev/staging/production workflow
- **Credential Validation**: Format checking and security rules
- **Migration Tools**: Easy migration from .env files
- **Audit Capabilities**: Comprehensive security reporting

## 📦 Integration with Fire22 Packages

### @fire22/core

```typescript
import { initializeFire22Security } from '@fire22/security-core';
import type { Fire22Config } from '@fire22/core';

const security = await initializeFire22Security();
const config = await security.credentialManager.loadFire22Config();
```

### @fire22/middleware

```typescript
// JWT secrets stored securely
const jwtSecret = await security.getCredential('jwt_secret');
```

### @fire22/wager-system

```typescript
// Stripe keys encrypted in keychain
const stripeKey = await security.getCredential('stripe_secret_key');
```

## 🛠️ Usage Examples

### Basic Setup

```typescript
import { initializeFire22Security } from '@fire22/security-core';

// Initialize with Fire22 workspace config
const security = await initializeFire22Security({
  service: 'fire22-dashboard',
  environments: ['development', 'staging', 'production'],
  scanner: {
    enabled: true,
    excludePackages: ['@fire22/testing-framework'],
  },
});

// Store credentials securely
await security.storeCredential(
  'database_url',
  'postgresql://user:pass@localhost:5432/fire22',
  'Production database connection',
  'production'
);

// Retrieve during app startup
const dbUrl = await security.getCredential('database_url', {
  environment: 'production',
});
```

### Security Scanning

```typescript
// Scan workspace dependencies
const scanResult = await security.scanDependencies();

if (!scanResult.passed) {
  console.error('Security issues found:', scanResult.issues);
  process.exit(1);
}
```

### Environment Management

```typescript
// Setup secure environment
await security.setupEnvironment('production');

// Migrate from .env files
const migration = await security.credentialManager.migrateFromEnv({
  DATABASE_URL: 'database_url',
  FIRE22_API_TOKEN: 'fire22_api_token',
  JWT_SECRET: 'jwt_secret',
});

console.log('Migrated:', migration.migrated);
```

## 🔧 Configuration

### bunfig.toml

```toml
[install.security]
# Use Fire22 security scanner
scanner = "@fire22/security-scanner"

[install]
auto = false          # Disable auto-install
exact = true          # Use exact versions
production = true     # Production settings

# Fire22 registry
registry = "https://registry.npmjs.org/"
scopes = {
  "@fire22" = "https://fire22.workers.dev/registry"
}
```

### Security Config

```typescript
const securityConfig = {
  service: 'fire22-dashboard-workspace',
  environments: ['development', 'staging', 'production'],
  scanner: {
    enabled: true,
    policies: [
      {
        name: 'no-crypto-mining',
        pattern: '(crypto|mining|bitcoin)',
        severity: 'fatal',
        description: 'Cryptocurrency mining packages not allowed',
      },
    ],
  },
  credentials: {
    validation: true,
    rotation: { enabled: false },
  },
};
```

## 🌍 Cross-Platform Support

| Platform | Credential Storage    | Status          |
| -------- | --------------------- | --------------- |
| macOS    | Keychain Services     | ✅ Full Support |
| Linux    | libsecret (GNOME/KDE) | ✅ Full Support |
| Windows  | Credential Manager    | ✅ Full Support |

## ⚡ Performance

- **Credential Retrieval**: ~1.3ms average
- **Dependency Scanning**: ~1ms per package
- **Memory Usage**: Minimal overhead
- **Zero Dependencies**: Pure Bun native APIs

## 🔍 CLI Commands

```bash
# Interactive demos
bun run security:integration    # Full workspace integration demo
bun run secrets-demo           # Credential management demo
bun run security-demo          # Vulnerability scanner demo

# Production commands
bun run env-setup production   # Setup production credentials
bun run env-audit             # Security audit
```

## 🏗️ Workspace Integration

Perfect integration with Fire22's workspace ecosystem:

- **@fire22/core**: Configuration management
- **@fire22/middleware**: JWT and authentication
- **@fire22/wager-system**: Payment processing
- **@fire22/env-manager**: Environment management
- **@fire22/testing-framework**: Test credentials

## 📊 Security Benefits

✅ **Zero Plaintext Secrets**: All credentials encrypted in OS keychain  
✅ **Supply Chain Security**: Automatic vulnerability scanning  
✅ **Environment Isolation**: Separate credentials per environment  
✅ **Workspace Optimization**: Trusts Fire22 internal packages  
✅ **Enterprise Ready**: Audit trails and compliance features  
✅ **High Performance**: Native Bun APIs for maximum speed

## 🔗 Related Packages

- [@fire22/core](../core) - Core Fire22 functionality
- [@fire22/middleware](../middleware) - Request handling
- [@fire22/wager-system](../wager-system) - Payment processing
- [@fire22/env-manager](../env-manager) - Environment management

## 📝 License

MIT © Fire22 Development Team

---

**🔥 Built for Fire22 dashboard with ⚡ Bun native performance**
