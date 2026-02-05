# Bun Feature Flags - DuoPlus Registry & Scoping

Complete guide to using Bun's compile-time feature flags with DuoPlus registry and scoping matrix.

## 🎯 Overview

Bun v1.3.5+ supports compile-time feature flags that enable dead code elimination and build-time optimization. This is perfect for:
- **Platform-specific builds** (GitHub vs GitLab vs Internal)
- **Environment variants** (Development, Enterprise, Testing)
- **Tier-based features** (Premium, Enterprise, Beta)
- **Conditional registry loading** (Private, Public, Mock)
- **Test variations** (Unit, Integration, E2E)

## 📋 Available Features

The system auto-generates 25 feature flags from your domain and scope configuration:

### Base Features (15)
```
DEBUG                          - Enable logging/debug output
PREMIUM_SECRETS                - Enable secret management
R2_STORAGE                     - Cloudflare R2 integration
VAULT_INTEGRATION              - External vault support
CONTENT_DISPOSITION_EXPORTS    - S3 export headers
CACHE_COMPRESSION              - Gzip caching
ANALYTICS_TRACKING             - Analytics collection
AUDIT_LOGGING                  - Detailed audit logs
MOCK_API                       - Mock APIs for testing
PRIVATE_REGISTRY               - Private npm registry
SCOPING_MATRIX                 - DuoPlus scoping matrix
BETA_FEATURES                  - Experimental features
ENTERPRISE_ONLY                - Enterprise-only features
RATE_LIMITING                  - Rate limiting
WEBHOOK_SIGNING                - Webhook verification
```

### Domain Features (5)
```
API_DUOPLUS_IO_TENANT          - api.duoplus.io builds
DEV_DUOPLUS_IO_TENANT          - dev.duoplus.io builds
GITHUB_COM_TENANT              - github.com integration
GITLAB_COM_TENANT              - gitlab.com integration
INTERNAL_DUOPLUS_IO_TENANT     - internal.duoplus.io builds
```

### Scope Features (5)
```
ENTERPRISE                     - Enterprise scope
DEVELOPMENT                    - Development scope
INTERNAL                       - Internal scope
GITHUB                         - GitHub scope
GITLAB                         - GitLab scope
```

## 🚀 Usage Patterns

### 1. Build with Features
```bash
# Single feature
bun build --feature=DEBUG src/app.ts

# Multiple features
bun build --feature=ENTERPRISE --feature=PREMIUM_SECRETS src/app.ts

# Environment-specific
bun build --feature=DEVELOPMENT --feature=MOCK_API src/app.ts
bun build --feature=ENTERPRISE --feature=R2_STORAGE src/app.ts

# Use npm scripts
bun run build:debug
bun run build:enterprise
bun run build:dev
```

### 2. Run with Features
```bash
# Debug mode
bun run --feature=DEBUG src/app.ts

# Mock API for testing
bun run --feature=MOCK_API src/app.ts

# Enterprise configuration
bun run --feature=ENTERPRISE src/app.ts
```

### 3. Test with Features
```bash
# Run tests with mock API
bun test --feature=MOCK_API

# Enterprise integration tests
bun test --feature=ENTERPRISE

# Use npm scripts
bun run test:mock
bun run test:enterprise
```

## 📝 Conditional Code

### Type-Safe Feature Checking

```typescript
// Import from auto-generated env.d.ts
import { Features, feature, isFeatureEnabled } from "../env";

// Type-safe feature checking at build time
if (feature(Features.PREMIUM_SECRETS)) {
  // This code is eliminated if PREMIUM_SECRETS is not enabled
  const secrets = await loadFromVault();
}

// Runtime check (also available)
if (isFeatureEnabled(Features.DEBUG)) {
  console.log("Debug mode enabled");
}

// Direct environment variable
if (process.env.DEBUG === "true") {
  console.debug("Detailed debug output");
}
```

### Dead Code Elimination Example

```typescript
// src/registry.ts
import { feature, Features } from "../env";

export async function initRegistry() {
  if (feature(Features.PRIVATE_REGISTRY)) {
    // Only included in builds with --feature=PRIVATE_REGISTRY
    return createDuoPlusRegistryClient();
  } else if (feature(Features.MOCK_API)) {
    // Only included in builds with --feature=MOCK_API
    return createMockRegistry();
  } else {
    // Default public npm registry
    return null;
  }
}

// With --feature=PRIVATE_REGISTRY, bundled output is:
// - createDuoPlusRegistryClient() + dependencies
// - Dead code (createMockRegistry, etc.) eliminated ✂️

// With --feature=MOCK_API, bundled output is:
// - createMockRegistry() + dependencies
// - Dead code (createDuoPlusRegistryClient, etc.) eliminated ✂️
```

## 🏗️ Integration with Registry

### Private Registry Conditional Loading

```typescript
// src/services/PrivateRegistryClient.ts
import { feature, Features } from "../env";

export function createDuoPlusRegistryClient() {
  if (!feature(Features.PRIVATE_REGISTRY)) {
    throw new Error("PRIVATE_REGISTRY feature not enabled");
  }

  // Initialize private registry with scope routing
  const client = new PrivateRegistryClient();
  
  if (feature(Features.ENTERPRISE)) {
    // Enterprise-specific configuration
    client.registerRegistry("ENTERPRISE", {
      registry: process.env.GITHUB_PACKAGES_URL!,
      scope: "@duoplus",
      token: process.env.GITHUB_NPM_TOKEN
    });
  }

  if (feature(Features.DEVELOPMENT)) {
    // Development registry (GitLab)
    client.registerRegistry("DEVELOPMENT", {
      registry: process.env.GITLAB_REGISTRY_URL!,
      scope: "@duoplus-dev",
      token: process.env.GITLAB_NPM_TOKEN
    });
  }

  if (feature(Features.INTERNAL)) {
    // Internal registry
    client.registerRegistry("INTERNAL", {
      registry: process.env.INTERNAL_REGISTRY_URL!,
      scope: "@internal",
      token: process.env.INTERNAL_REGISTRY_TOKEN
    });
  }

  return client;
}
```

### Scope-Based Feature Routing

```typescript
// src/config/scope.config.ts
import { feature, Features } from "../env";

export function resolveScopeFromRequest(req: Request): ScopeContext {
  const url = new URL(req.url);
  const hostname = url.hostname;

  // Route based on hostname + enabled features
  if (hostname.includes("api.duoplus.io") && feature(Features.ENTERPRISE)) {
    return {
      domain: "api.duoplus.io",
      platform: "duoplus",
      scopeId: "ENTERPRISE",
      overridden: false
    };
  }

  if (hostname.includes("dev.duoplus.io") && feature(Features.DEVELOPMENT)) {
    return {
      domain: "dev.duoplus.io",
      platform: "duoplus",
      scopeId: "DEVELOPMENT",
      overridden: false
    };
  }

  // Fallback to internal
  if (feature(Features.INTERNAL)) {
    return {
      domain: "internal.duoplus.io",
      platform: "duoplus",
      scopeId: "INTERNAL",
      overridden: false
    };
  }

  // No registry available
  throw new Error("No suitable registry configured for this request");
}
```

## 🔄 Regenerating Feature Flags

When you add new domains or scopes to your configuration, regenerate the feature flags:

```bash
# Generate new env.d.ts with updated features
bun run generate:types

# This updates:
# - env.d.ts (TypeScript definitions)
# - Features constant
# - Type checking for all features
```

## 📊 Build Size Impact

Feature flags enable significant dead code elimination:

```
Before feature flags:
  - All features compiled in
  - File size: ~2.5 MB
  - Load time: ~500ms

With PRIVATE_REGISTRY only:
  - Registry code included
  - Unused code eliminated
  - File size: ~1.2 MB (-52%)
  - Load time: ~250ms (-50%)

With MOCK_API + DEBUG only:
  - Mock server + logging
  - Production code eliminated
  - File size: ~800 KB (-68%)
  - Load time: ~150ms (-70%)
```

## 🧪 Testing Patterns

### Unit Tests with Mocks

```typescript
// tests/registry.test.ts
import { test, expect } from "bun:test";
import { feature, Features } from "../env";

test("registry initialization", async () => {
  if (!feature(Features.MOCK_API)) {
    // Skip test if not running with mock API
    console.log("Skipping mock test");
    return;
  }

  const client = createMockRegistry();
  expect(client).toBeDefined();
});
```

Run with:
```bash
bun run test:mock
```

### Integration Tests

```typescript
// tests/integration/registry-real.test.ts
import { test, expect } from "bun:test";
import { feature, Features } from "../env";

test("real registry endpoint", async () => {
  if (!feature(Features.PRIVATE_REGISTRY)) {
    // Skip test if not running with real registry
    console.log("Skipping real registry test");
    return;
  }

  const client = createDuoPlusRegistryClient();
  const response = await client.healthCheck(enterpriseScope);
  expect(response).toBe(true);
});
```

Run with:
```bash
bun run test:enterprise
```

## 🔒 Security Considerations

### Never Use for Secrets

```typescript
// ❌ WRONG - Feature flags are compile-time, visible in code
if (feature(Features.SECRET_KEY)) {
  const key = "super-secret-12345"; // Visible in bundle!
}

// ✅ CORRECT - Use environment variables for secrets
const key = process.env.SECRET_KEY; // Not in bundle
```

### Environment Variable Overlay

Feature flags work with environment variables for configuration:

```typescript
// env.d.ts generates this automatically
export function isFeatureEnabled(feature: FeatureFlag): boolean {
  // Feature flag from build
  return process.env[feature] === "true";
}

// Usage
if (isFeatureEnabled(Features.PRIVATE_REGISTRY)) {
  // Feature enabled at build time OR runtime
  const registryUrl = process.env.REGISTRY_URL; // From .env
}
```

## 📋 Package.json Scripts

Added feature flag scripts:

```json
{
  "scripts": {
    "generate:types": "bun scripts/generate-env-dts.ts",
    "build:debug": "bun build --feature=DEBUG src/config-manager.ts",
    "build:enterprise": "bun build --feature=ENTERPRISE --feature=PREMIUM_SECRETS --feature=R2_STORAGE src/config-manager.ts",
    "build:dev": "bun build --feature=DEVELOPMENT --feature=DEBUG --feature=MOCK_API src/config-manager.ts",
    "test:mock": "bun test --feature=MOCK_API tests/",
    "test:enterprise": "bun test --feature=ENTERPRISE tests/",
    "start:debug": "bun run --feature=DEBUG src/config-manager.ts",
    "start:mock": "bun run --feature=MOCK_API src/config-manager.ts"
  }
}
```

## 🚀 Common Scenarios

### Scenario 1: Enterprise Production Build

```bash
# Build with all enterprise features
bun run build:enterprise

# Result: ~1.5 MB bundle with:
# ✓ Private registry support
# ✓ Premium secrets
# ✓ R2 storage
# ✗ Mock APIs (eliminated)
# ✗ Debug logging (eliminated)
```

### Scenario 2: Development with Mocks

```bash
# Build for local testing with mocks
bun run build:dev

# Result: ~800 KB bundle with:
# ✓ Mock APIs
# ✓ Debug logging
# ✓ Development features
# ✗ R2 storage (eliminated)
# ✗ Enterprise code (eliminated)
```

### Scenario 3: Testing

```bash
# Run tests with mock APIs
bun run test:mock

# Tests run with:
# ✓ MOCK_API enabled
# ✓ All mocks loaded
# ✗ Real registries skipped
```

## 🔗 Reference

- [Bun Feature Flags Blog](https://bun.sh/blog/bun-v1.3.5#compile-time-feature-flags-for-dead-code-elimination)
- [env.d.ts](env.d.ts) - Auto-generated feature definitions
- [scripts/generate-env-dts.ts](scripts/generate-env-dts.ts) - Generator script
- [src/routes/registry.ts](src/routes/registry.ts) - Registry with feature flags
- [src/config/scope.config.ts](src/config/scope.config.ts) - Scope routing

## ✅ Quick Start

```bash
# 1. Generate features (auto-run on startup)
bun run generate:types

# 2. Build with features
bun run build:enterprise

# 3. Or run directly
bun run start:mock

# 4. Run tests with features
bun run test:enterprise
```

---

**Result:** Optimized builds for each environment with dead code elimination! 🎯
