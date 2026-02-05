# Feature Flags Developer Guide

Quick reference for using Bun's compile-time feature flags in this project.

## Available Features (Master Table)

| Feature | Type | Category | Domain | Scope | Tier | Size | Release | Status |
|---------|------|----------|--------|-------|------|------|---------|--------|
| `DEBUG` | Utility | Observability | all | Development | basic | +30B | v1.3.5 | ✅ Stable |
| `MOCK_API` | Utility | Testing | all | Development | basic | +50B | v1.3.5 | ✅ Stable |
| `DEVELOPMENT` | Scope | Environment | dev.duoplus.io | Development | basic | +10B | v1.3.5 | ✅ Stable |
| `ENTERPRISE` | Scope | Environment | api.duoplus.io | Enterprise | premium | +40B | v1.3.5 | ✅ Stable |
| `PREMIUM_SECRETS` | Feature | Security | all | Enterprise | premium | +25B | v1.3.5 | ✅ Stable |
| `R2_STORAGE` | Feature | Infrastructure | all | Enterprise | premium | +35B | v1.3.5 | ✅ Stable |
| `INTERNAL` | Scope | Environment | internal.duoplus.io | Internal | standard | +10B | v1.3.5 | ✅ Stable |
| `GITHUB` | Scope | Registry | github.com | GitHub | standard | +15B | v1.3.5 | ✅ Stable |
| `GITLAB` | Scope | Registry | gitlab.com | GitLab | standard | +15B | v1.3.5 | ✅ Stable |
| `AUDIT_LOGGING` | Feature | Compliance | all | Enterprise | premium | +60B | v1.3.5 | ✅ Stable |
| `RATE_LIMITING` | Feature | Protection | all | all | premium | +45B | v1.3.5 | ✅ Stable |
| `WEBHOOK_SIGNING` | Feature | Security | all | Enterprise | premium | +35B | v1.3.5 | ✅ Stable |

**Legend:** Type = Utility|Feature|Scope | Category = Observability|Testing|Environment|Security|Infrastructure|Compliance|Protection | Domain = Target registry/environment | Scope = Deployment context | Tier = basic|standard|premium

**All features** available in [docs/FEATURE_FLAGS_GUIDE.md](./FEATURE_FLAGS_GUIDE.md)

## Quick Start

### 1. Using Features in Code

```typescript
import { feature } from "bun:bundle";

// ✅ CORRECT: Use in if statements
if (feature("DEBUG")) {
  console.log("Debug mode enabled");
}

// ✅ CORRECT: Use in ternary
const mode = feature("DEBUG") ? "verbose" : "silent";

// ✅ CORRECT: Gate entire functions
if (feature("ENTERPRISE")) {
  await initializeEnterpriseFeatures();
}

// ❌ WRONG: Cannot use as variable
const enabled = feature("DEBUG");  // Compilation error!

// ❌ WRONG: Cannot use in object properties
const config = {
  debug: feature("DEBUG"),  // Compilation error!
};
```

### 2. Running with Features

```bash
# Add single feature
bun run --feature=DEBUG src/app.ts

# Add multiple features
bun run --feature=DEBUG --feature=MOCK_API src/app.ts

# Building with features
bun build --feature=ENTERPRISE --minify src/index.ts --outdir dist
```

### 3. npm Scripts

```bash
# Use pre-configured scripts
bun run build:dev        # With DEVELOPMENT, DEBUG, MOCK_API
bun run build:enterprise # With ENTERPRISE, PREMIUM_SECRETS, R2_STORAGE
bun run start:debug      # Runtime with DEBUG
bun run test:mock        # Tests with MOCK_API
```

## Common Patterns

### Pattern 1: Environment-Specific Code

```typescript
import { feature } from "bun:bundle";

export async function initialize() {
  // Enterprise path
  if (feature("ENTERPRISE")) {
    console.log("🏢 Enterprise mode");
    await setupEnterpriseDatabase();
    await configureAdvancedSecrets();
    return;
  }

  // Development path
  if (feature("DEVELOPMENT")) {
    console.log("🔧 Development mode");
    enableDevTools();
    loadMockData();
    return;
  }

  // Production path (default)
  console.log("📦 Production mode");
  await setupProductionDatabase();
}
```

### Pattern 2: Mock vs Real APIs

```typescript
import { feature } from "bun:bundle";

export async function fetchData(endpoint: string) {
  if (feature("MOCK_API")) {
    // This code is eliminated in production builds
    console.log("Using mock data");
    return getMockData(endpoint);
  }
  
  // Real API call
  const response = await fetch(endpoint);
  return response.json();
}
```

### Pattern 3: Conditional Middleware

```typescript
import { feature } from "bun:bundle";
import { Elysia } from "elysia";

const app = new Elysia();

// Debug middleware only in debug builds
if (feature("DEBUG")) {
  app.trace(({ request, response, time }) => {
    console.log(`[${time.ms}ms] ${request.method} ${request.url}`);
  });
}

// Enterprise audit middleware
if (feature("ENTERPRISE")) {
  app.onRequest(async (context) => {
    await auditLog(context);
  });
}
```

### Pattern 4: Build-Time Configuration

```typescript
import { feature } from "bun:bundle";

export const CONFIG = {
  apiTimeout: 5000,
  retryCount: 3,
  logLevel: feature("DEBUG") ? "debug" : "info",
  useMocks: feature("MOCK_API"),
  useR2: feature("R2_STORAGE"),
  isPremium: feature("PREMIUM_SECRETS"),
  isEnterprise: feature("ENTERPRISE"),
};
```

## Testing with Features

### Unit Tests

```bash
# Test with mock APIs
bun run test:mock

# Test with enterprise features
bun run test:enterprise

# Test in your code
import { feature } from "bun:bundle";
import { describe, it, expect } from "bun:test";

describe("Feature-gated functionality", () => {
  it("uses mocks when MOCK_API enabled", () => {
    if (feature("MOCK_API")) {
      // This test only runs in MOCK_API builds
      expect(fetchData()).resolves.toBeDefined();
    }
  });
});
```

### Integration Tests

```bash
# Run with multiple feature combinations
bun build --feature=ENTERPRISE --feature=DEBUG tests/integration.test.ts
bun run tests/integration.test.ts

bun build --feature=MOCK_API --feature=DEVELOPMENT tests/integration.test.ts
bun run tests/integration.test.ts
```

## Build Variants

### Production (Smallest Bundle)

```bash
bun build --minify src/index.ts --outdir dist/prod
```

**What's included:**
- Core functionality only
- No debug code
- No mock APIs
- No enterprise features

**Size:** ~1.4 KB

### Development

```bash
bun build --feature=DEVELOPMENT --feature=DEBUG --feature=MOCK_API --minify src/index.ts --outdir dist/dev
```

**What's included:**
- All production features
- Debug logging
- Mock APIs for testing
- Development tools

**Size:** ~1.6 KB

### Enterprise

```bash
bun build --feature=ENTERPRISE --feature=PREMIUM_SECRETS --feature=R2_STORAGE --minify src/index.ts --outdir dist/enterprise
```

**What's included:**
- All production features
- Enterprise audit logging
- Premium secret management
- Cloudflare R2 integration

**Size:** ~1.8 KB

### Testing

```bash
bun build --feature=MOCK_API --feature=DEBUG --minify tests/ --outdir dist/test
```

**What's included:**
- Mock API responses
- Debug logging
- No external network calls

**Size:** ~1.5 KB

## Debugging

### See What Features Are Enabled

```typescript
import { feature } from "bun:bundle";

export function reportBuildInfo() {
  console.log("Build Features:");
  console.log(`  DEBUG: ${feature("DEBUG") ? "✓" : "✗"}`);
  console.log(`  DEVELOPMENT: ${feature("DEVELOPMENT") ? "✓" : "✗"}`);
  console.log(`  ENTERPRISE: ${feature("ENTERPRISE") ? "✓" : "✗"}`);
  console.log(`  MOCK_API: ${feature("MOCK_API") ? "✓" : "✗"}`);
}

// Run it
reportBuildInfo();
```

### Verify Bundle Size

```bash
# Check bundle size
ls -lh dist/index.js
stat -f%z dist/index.js

# Compare production vs development
ls -lh dist/prod/index.js dist/dev/index.js
```

### Inspect Bundled Code

```bash
# See if feature code is actually in bundle (should be empty if disabled)
grep -i "debug\|mock_api\|enterprise" dist/prod/index.js
# If feature is disabled, should return nothing

# If enabled, should show the code
grep -i "debug\|mock_api" dist/dev/index.js
```

## CI/CD Integration

GitHub Actions workflow automatically builds all variants:

```bash
# GitHub builds these automatically on push:
- Production (no features)
- Development (with debug + mocks)
- Enterprise (with premium features)
- Testing (with mocks + debug)
```

Check [.github/workflows/build-variants.yml](./.github/workflows/build-variants.yml) for details.

## Best Practices

✅ **DO:**
- Use feature flags to gate entire initialization blocks
- Test each variant in CI/CD
- Document feature dependencies
- Combine related features (e.g., all enterprise features together)
- Use strict feature names that match across CLI and code

❌ **DON'T:**
- Store feature values in variables
- Use features in object properties
- Check same feature multiple times
- Mix feature flags with runtime configuration
- Assume features are available across module boundaries

## Performance Impact

| Feature | Code Added | Build Time | Runtime Overhead |
|---------|-----------|-----------|-----------------|
| Single feature | +50-100 bytes | +0ms | 0ms |
| 3 features | +150-300 bytes | +1-2ms | 0ms |
| 5 features | +250-500 bytes | +2-3ms | 0ms |

**Key insight:** Feature flags have **zero runtime overhead** because they're replaced with constants during compilation.

## Troubleshooting

### "feature() is not defined"

```typescript
// ❌ WRONG: Missing import
if (feature("DEBUG")) { }

// ✅ CORRECT: Import from bun:bundle
import { feature } from "bun:bundle";
if (feature("DEBUG")) { }
```

### "Feature must be string literal"

```typescript
// ❌ WRONG: Variable usage
const name = "DEBUG";
if (feature(name)) { }

// ✅ CORRECT: String literal
if (feature("DEBUG")) { }
```

### Feature code in bundle when disabled

```typescript
// ❌ WRONG: Code stays in bundle
function maybeDebug() {
  if (feature("DEBUG")) {
    console.log("debug");
  }
}

// ✅ CORRECT: Code eliminated
if (feature("DEBUG")) {
  console.log("debug");
}
```

## References

- [Bun Feature Flags Docs](https://bun.sh/blog/bun-v1.3.5)
- [Build Optimization Guide](./BUILD_OPTIMIZATION.md)
- [Feature Flags Complete Guide](./FEATURE_FLAGS_GUIDE.md)
- [Example Implementation](../src/examples/registry-features.ts)
