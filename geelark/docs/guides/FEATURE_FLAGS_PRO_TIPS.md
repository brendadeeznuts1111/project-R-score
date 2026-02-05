# 🎯 PRO-TIPS FOR BUN'S COMPILE-TIME FEATURE FLAGS

## ⚡ BUILD-TIME OPTIMIZATION

```bash
# Combine flags for maximum dead code elimination
bun build --feature=PREMIUM --feature=PRODUCTION --feature=ENCRYPTION --minify
```

**Pro-tip**: Bun replaces `feature()` with `true/false` at bundle time - minification then removes dead branches completely.

## 🔧 TYPE SAFETY PATTERN

```typescript
// env.d.ts - Get compile-time errors for typos
declare module "bun:bundle" {
  interface Registry {
    features: "DEBUG" | "PREMIUM" | "MOBILE_ONLY" | "SERVER_SIDE";
  }
}

// TypeScript now validates this!
if (feature("TYPO")) { } // ❌ Compile error!
```

## 🚀 RUNTIME VS COMPILE-TIME SPLIT

```typescript
// Use feature() for build-time flags, keep runtime flags separate
import { feature } from "bun:bundle";

// COMPILE-TIME: Eliminated from bundle
if (feature("MOCK_API")) {
  useMockData(); // ← Removed from production builds
}

// RUNTIME: Stays in bundle, toggle at startup
if (process.env.ENABLE_FEATURE_X) {
  enableFeatureX(); // ← Still in bundle, but conditionally executed
}
```

## 🎛️ ENVIRONMENT-SPECIFIC BUILDS

```bash
# Development build with debugging
bun build --feature=DEBUG --feature=MOCK_API --feature=VERBOSE_LOGS

# Production premium build  
bun build --feature=PREMIUM --feature=ENCRYPTION --feature=PERFORMANCE --minify

# A/B test variant
bun build --feature=VARIANT_B --feature=NEW_UI --feature=ANALYTICS
```

## 📦 BUNDLE SIZE OPTIMIZATION

```typescript
// Entire modules can be eliminated
if (feature("ADMIN_DASHBOARD")) {
  // This import is tree-shaken away if ADMIN_DASHBOARD=false
  const adminModule = await import("./admin-panel");
  adminModule.initialize();
}

// Premium features completely removed from free tier
if (feature("PREMIUM")) {
  export function advancedAnalytics() { /* ... */ }
  export function batchProcessing() { /* ... */ }
  // ^^ None of this exists in free tier bundles
}
```

## 🧪 TESTING STRATEGY

```bash
# Test with specific feature combinations
bun test --feature=MOCK_API --feature=TEST_MODE
bun test --feature=INTEGRATION_TEST --feature=EXTERNAL_API
```

```typescript
// Test files can be feature-gated too!
if (feature("INTEGRATION_TEST")) {
  describe("External API Integration", () => {
    // These tests only run with --feature=INTEGRATION_TEST
    test("calls real API", async () => { /* ... */ });
  });
}
```

## 🔄 PLATFORM-SPECIFIC CODE

```typescript
// Eliminate platform-specific code from wrong builds
if (feature("MOBILE_ONLY")) {
  // This never reaches server-side bundles
  setupMobileGestures();
  initializeTouchEvents();
}

if (feature("SERVER_SIDE")) {
  // This never reaches client bundles
  setupDatabasePool();
  initializeCronJobs();
}
```

## 🚫 PITFALLS TO AVOID

```typescript
// ❌ DON'T: Use dynamic feature names
const flag = "PREMIUM";
if (feature(flag)) { } // Can't be statically analyzed!

// ✅ DO: Use literal strings
if (feature("PREMIUM")) { } // Perfectly analyzable

// ❌ DON'T: Hide side effects in eliminated branches
if (feature("DEBUG")) {
  const importantValue = computeSomething(); // Never runs!
}
useValue(importantValue); // Error in production!

// ✅ DO: Move declarations outside
const importantValue = computeSomething(); // Always runs
if (feature("DEBUG")) {
  console.log("Value:", importantValue); // Only logs in debug
}
```

## 🔍 DEBUGGING TIPS

```bash
# See what features are active
bun --inspect --feature=DEBUG app.ts

# Build with sourcemaps to trace eliminated code
bun build --feature=PREMIUM --sourcemap --outfile=./dist
```

## 🏗️ ARCHITECTURE PATTERNS

```typescript
// 1. Feature-flagged exports
export const features = {
  analytics: feature("ANALYTICS") ? realAnalytics : dummyAnalytics,
  payments: feature("STRIPE_INTEGRATION") ? stripe : mockProcessor,
};

// 2. Feature-gated middleware
const middleware = [
  feature("AUTH_REQUIRED") && authMiddleware,
  feature("RATE_LIMIT") && rateLimitMiddleware,
  feature("CACHE") && cacheMiddleware,
].filter(Boolean);

// 3. Conditional plugin system
const plugins = [
  feature("SEO_PLUGIN") && seoPlugin,
  feature("ANALYTICS_PLUGIN") && analyticsPlugin,
];
```

## 📊 BUNDLE ANALYSIS

```bash
# Compare bundle sizes with/without features
bun build --feature=PREMIUM --outfile=premium.js
bun build --outfile=free.js
ls -lh *.js

# Analyze what was eliminated
bun build --feature=PREMIUM --analyze | grep "Eliminated"
```

## 🚀 DEPLOYMENT STRATEGY

```json
{
  "scripts": {
    "build:free": "bun build --outfile=free.js",
    "build:premium": "bun build --feature=PREMIUM --outfile=premium.js",
    "build:enterprise": "bun build --feature=PREMIUM --feature=ADMIN --feature=API --outfile=enterprise.js"
  }
}
```

## 🎯 QUICK WINS

1. **Gate expensive imports** - `if (feature("ADMIN")) await import("./heavy-admin-module")`
2. **Remove dev tools from production** - `feature("DEBUG") && enableDevTools()`
3. **Create tier-specific bundles** - Different builds for free/premium/enterprise
4. **Eliminate polyfills for modern browsers** - `if (feature("LEGACY_BROWSERS")) includePolyfills()`
5. **Remove A/B test code for control group** - Build different variants
6. **Platform-specific optimization** - Mobile-only code in mobile builds
7. **Localization bundles** - Only include enabled languages
8. **Analytics for paid users only** - `feature("PAID_TIER") && trackEvents()`

## ⚡ PERFORMANCE IMPACT

```typescript
// Before: Runtime check always in bundle
if (config.features.premium) { /* code */ }

// After: No runtime check, no code in free tier
if (feature("PREMIUM")) { /* eliminated from free tier */ }
```

**Result**: 20-60% smaller bundles depending on features disabled.

## 🔒 SECURITY BENEFIT

```typescript
// Sensitive admin code never reaches client bundles
if (feature("ADMIN_PANEL")) {
  // This code ONLY exists in admin builds
  exposeSensitiveApis();
}
```

**Pro-tip**: Combine with environment variables for runtime overrides when needed, but use `feature()` for maximum dead code elimination.


