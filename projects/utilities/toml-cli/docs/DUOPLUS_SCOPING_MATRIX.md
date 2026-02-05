# DuoPlus Scoping Matrix

A comprehensive, Bun-native multi-tenant runtime system that provides domain-aware feature gating, integration control, and compliance validation for virtual device orchestration.

## Overview

The DuoPlus Scoping Matrix is a sophisticated runtime configuration system that automatically detects the execution context (domain, platform, environment) and applies appropriate feature flags, limits, and integration permissions. Built with Bun-native optimizations for maximum performance and observability.

## Key Features

- 🚀 **Ultra-fast lookups** using `Bun.match()` optimization
- 💾 **Zero-copy JSON loading** with `Bun.file().json()`
- 🔍 **Rich debugging** with `Bun.inspect.custom`
- 🧵 **Automatic scope isolation** in tests
- 🌐 **Live compliance middleware** for `Bun.serve()`
- 📊 **Performance monitoring** with GC awareness
- 🏢 **Multi-tenant support** with enterprise-grade controls

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Environment   │ -> │  Scope Context   │ -> │  Matrix Rules   │
│                 │    │                  │    │                 │
│ • Domain        │    │ • Detected Scope │    │ • Features      │
│ • Platform      │    │ • Features       │    │ • Limits        │
│ • Runtime       │    │ • Limits         │    │ • Integrations  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │                       │                       │
        v                       v                       v
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Validation     │    │  Middleware      │    │  Enforcement    │
│                 │    │                  │    │                 │
│ • Compliance    │    │ • Rate Limiting  │    │ • Feature Gates │
│ • Usage Limits  │    │ • Integration    │    │ • Access Control│
│ • Audit Reports │    │ • Feature Flags  │    │ • Quotas        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Quick Start

### Basic Usage

```typescript
import { getScopeContext, isFeatureEnabled, isIntegrationAllowed } from "./config/scope.config.ts";

// Get current scope information
const context = getScopeContext();
console.log(`Domain: ${context.domain}, Scope: ${context.detectedScope}`);

// Check feature availability
if (isFeatureEnabled("advancedAnalytics")) {
  // Enable advanced features
}

// Check integration permissions
if (isIntegrationAllowed("twitter")) {
  // Allow Twitter integration
}
```

### Server Integration

```typescript
import { complianceMiddleware, integrationMiddleware } from "./server/middleware/compliance.ts";

const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    // Apply compliance checking
    const complianceReq = complianceMiddleware(req);
    if (complianceReq instanceof Response) return complianceReq;

    // Check Twitter integration access
    const twitterReq = integrationMiddleware("twitter")(complianceReq);
    if (twitterReq instanceof Response) return twitterReq;

    // Handle request
    return new Response("Hello from compliant server!");
  },
});
```

### Testing

```typescript
import { scopeTestUtils } from "./test/setup.ts";

await scopeTestUtils.testEnterpriseScope(async () => {
  // Test enterprise-specific features
  expect(isFeatureEnabled("complianceMode")).toBe(true);
});

await scopeTestUtils.testDevelopmentScope(async () => {
  // Test development features
  expect(isFeatureEnabled("debugTools")).toBe(true);
});
```

## Scope Types

### Enterprise Scope
- **Domains**: `apple.com`, `microsoft.com`
- **Features**: Advanced analytics, custom integrations, high availability, multi-tenancy, compliance mode
- **Limits**: 1000+ devices, 50+ integrations, 10K API calls/min
- **Integrations**: All available (Twitter, CashApp, Email, SMS, Webhook)

### Development Scope
- **Domains**: `localhost`, `dev.example.com`
- **Features**: Debug tools, basic analytics
- **Limits**: 25 devices, 10 integrations, 500 API calls/min
- **Integrations**: Twitter, CashApp, Email, SMS (no webhook)

### Personal Scope
- **Domains**: `gmail.com`, `outlook.com`
- **Features**: Basic features only
- **Limits**: 3-5 devices, 2-3 integrations, 50-100 API calls/min
- **Integrations**: Twitter, CashApp, Email (limited SMS)

### Public Scope
- **Domains**: `public` (fallback)
- **Features**: Minimal features
- **Limits**: 1 device, 1 integration, 10 API calls/min
- **Integrations**: Email only

## API Reference

### Core Functions

#### `getScopeContext(): ScopeContext`
Returns the current scope context with domain, platform, detected scope, features, limits, and integrations.

#### `isFeatureEnabled(feature: string): boolean`
Checks if a specific feature is enabled in the current scope.

#### `isIntegrationAllowed(integration: string): boolean`
Checks if a specific integration is allowed in the current scope.

#### `getCurrentLimits(): ScopeLimits`
Returns the current usage limits for the scope.

### Matrix Operations

#### `getMatrixRule(domain: string, platform: string): ScopingRule | undefined`
Ultra-fast rule lookup using Bun.match() optimization.

#### `validateMatrixCompliance(): ValidationResult`
Comprehensive compliance validation with violations, warnings, and suggestions.

#### `validateUsageLimits(usage: UsageMetrics): ValidationResult`
Validates current usage against scope limits.

### Middleware

#### `complianceMiddleware(req: Request): Request | Response`
Non-blocking compliance validation middleware.

#### `strictComplianceMiddleware(req: Request): Request | Response`
Blocks non-compliant requests with 403 responses.

#### `integrationMiddleware(integration: string): MiddlewareFunction`
Feature gate middleware for specific integrations.

#### `featureFlagMiddleware(feature: string): MiddlewareFunction`
Feature flag middleware for specific features.

#### `rateLimitMiddleware(req: Request): Request | Response`
Rate limiting based on scope limits.

## Configuration

### Environment Variables

```bash
# Domain detection
HOST=apple.com
DOMAIN=apple.com

# Platform override
PLATFORM_OVERRIDE=macOS

# Runtime configuration
NODE_ENV=production
```

### External Matrix File

Create `data/scopingMatrix.json` for custom rules:

```json
[
  {
    "servingDomain": "custom.com",
    "detectedScope": "ENTERPRISE",
    "platform": "Any",
    "features": {
      "advancedAnalytics": true,
      "customIntegrations": true
    },
    "limits": {
      "maxDevices": 500,
      "maxIntegrations": 25,
      "apiRateLimit": 5000,
      "storageQuota": 500000
    },
    "integrations": {
      "twitter": true,
      "cashapp": true,
      "email": true,
      "sms": true,
      "webhook": true
    }
  }
]
```

## Performance Characteristics

### Benchmarks (approximate)

- **Matrix Lookup**: < 0.1ms (Bun.match optimization)
- **Scope Context Access**: < 0.5ms (cached)
- **Compliance Validation**: < 1ms (with caching)
- **Memory Overhead**: < 1MB (shared matrix data)
- **Cold Start**: < 5ms (JSON parsing + validation)

### Optimizations

1. **Precompiled Matchers**: Domain-to-rule mapping compiled at startup
2. **LRU Caching**: Validation results cached with TTL
3. **Zero-Copy Loading**: External JSON loaded without copying
4. **GC Awareness**: Memory pressure hints for optimal performance
5. **Lazy Evaluation**: Scope context created only when needed

## Testing

### Running Tests

```bash
# Run all scoping matrix tests
bun test tests/unit/scoping-matrix.test.ts

# Run with coverage
bun test --coverage tests/unit/scoping-matrix.test.ts

# Run performance benchmarks
bun test --grep "Performance Tests"
```

### Test Utilities

```typescript
import { scopeTestUtils, performanceTestUtils, complianceTestUtils } from "./test/setup.ts";

// Test different scopes
await scopeTestUtils.testEnterpriseScope(async () => {
  // Enterprise-specific tests
});

await scopeTestUtils.testDevelopmentScope(async () => {
  // Development-specific tests
});

// Performance monitoring
const result = await performanceTestUtils.benchmark(
  "Matrix Lookup",
  () => getMatrixRule("apple.com", "macOS"),
  1000
);

// Compliance assertions
complianceTestUtils.assertComplianceValid();
complianceTestUtils.assertFeatureEnabled("advancedAnalytics");
complianceTestUtils.assertIntegrationAllowed("twitter");
```

## Demo Server

Run the interactive demo:

```bash
# Start demo server
bun run scripts/demo-scoping.ts

# Open in browser
open http://localhost:8765

# Debug endpoints
curl http://localhost:8765/compliance
curl http://localhost:8765/matrix
curl http://localhost:8765/scope.json
curl http://localhost:8765/performance
```

## Compliance & Security

### Enterprise Compliance

- **Audit Logging**: All scope decisions logged with timestamps
- **Compliance Reports**: Detailed validation reports with recommendations
- **Access Control**: Feature gates and integration restrictions
- **Rate Limiting**: Scope-aware API rate limits
- **Data Isolation**: Multi-tenant data separation

### Security Features

- **Input Validation**: Domain and platform input sanitization
- **Secure Defaults**: Conservative defaults for unknown contexts
- **Audit Trail**: Comprehensive logging of all decisions
- **Fail-Safe**: Graceful degradation on configuration errors

## Troubleshooting

### Common Issues

#### "No scoping rule found"
- Check domain and platform detection
- Verify matrix contains rule for your domain
- Use `public` fallback for testing

#### "Compliance violations"
- Review `validateMatrixCompliance()` output
- Check scope-specific requirements
- Update matrix rules if needed

#### "Performance issues"
- Enable caching with `getCachedValidation()`
- Check memory usage with `Bun.memoryUsage()`
- Profile with performance test utilities

### Debug Commands

```bash
# Inspect current scope
console.log(getScopeContext());

# Validate compliance
console.log(validateMatrixCompliance());

# Check matrix statistics
console.log(await getMatrixStats());

# Performance profiling
console.log(await performanceTestUtils.benchmark("test", fn, 100));
```

## Contributing

### Adding New Scopes

1. Add rule to `SCOPING_MATRIX` in `data/scopingMatrix.ts`
2. Update tests in `tests/unit/scoping-matrix.test.ts`
3. Update documentation
4. Test with demo server

### Performance Optimization

1. Profile with `performanceTestUtils.benchmark()`
2. Monitor memory with `memoryTestUtils.monitorMemory()`
3. Use `Bun.gc()` hints for memory pressure
4. Consider caching strategies for hot paths

## License

This implementation is part of the DuoPlus virtual device orchestration system.

## See Also

- [Virtual Device Tracker](../agent-container/virtual-device-tracker.ts)
- [Configuration Manager](../src/config-manager.ts)
- [Integration APIs](../integrations/)
- [Test Guide](../docs/TEST_GUIDE.md)