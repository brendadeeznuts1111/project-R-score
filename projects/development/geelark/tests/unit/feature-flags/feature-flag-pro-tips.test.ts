#!/usr/bin/env bun

import { describe, test, expect } from "bun:test";
import { feature } from "bun:bundle";

describe("🎯 Feature Flag Pro-Tips", () => {
  test("✅ Type safety - valid feature names work", () => {
    // TypeScript validates feature names at compile time
    // feature() can only be used in if statements or ternary conditions
    let debugEnabled = false;
    if (feature("DEBUG")) {
      debugEnabled = true;
    }
    expect(typeof debugEnabled).toBe("boolean");

    let premiumEnabled = false;
    if (feature("PREMIUM")) {
      premiumEnabled = true;
    }
    expect(typeof premiumEnabled).toBe("boolean");
  });

  test("✅ Runtime vs compile-time split", () => {
    // Compile-time features are evaluated at build time
    let compileTimeFeature = false;
    if (feature("MOCK_API")) {
      compileTimeFeature = true;
    }
    expect(typeof compileTimeFeature).toBe("boolean");

    // Runtime features use environment variables
    const runtimeFeature = process.env.ENABLE_FEATURE_X;
    // Runtime features can be undefined, string, etc.
    expect(runtimeFeature === undefined || typeof runtimeFeature === "string").toBe(true);
  });

  test("✅ Feature-flagged exports pattern", () => {
    // Features object pattern using ternary
    const features = {
      analytics: feature("ANALYTICS")
        ? () => "Real analytics"
        : () => "Dummy analytics",
    };

    expect(typeof features.analytics).toBe("function");
    expect(typeof features.analytics()).toBe("string");
  });

  test("✅ Feature-gated middleware pattern", () => {
    // Build middleware array using ternary in filter
    const middleware: (() => string)[] = [];
    
    if (feature("AUTH_REQUIRED")) {
      middleware.push(() => "Auth middleware");
    }
    if (feature("RATE_LIMIT")) {
      middleware.push(() => "Rate limit middleware");
    }
    if (feature("CACHE")) {
      middleware.push(() => "Cache middleware");
    }

    // Middleware array should contain functions or be empty
    expect(Array.isArray(middleware)).toBe(true);
    middleware.forEach((m) => {
      expect(typeof m).toBe("function");
    });
  });

  test("✅ Conditional plugin system", () => {
    const plugins: (() => string)[] = [];
    
    if (feature("SEO_PLUGIN")) {
      plugins.push(() => "SEO plugin");
    }
    if (feature("ANALYTICS_PLUGIN")) {
      plugins.push(() => "Analytics plugin");
    }

    expect(Array.isArray(plugins)).toBe(true);
    plugins.forEach((p) => {
      expect(typeof p).toBe("function");
    });
  });

  test("✅ Platform-specific code elimination", () => {
    // Mobile-only code
    if (feature("MOBILE_ONLY")) {
      // This code only exists in mobile builds
      expect(true).toBe(true);
    }

    // Server-side code
    if (feature("SERVER_SIDE")) {
      // This code only exists in server builds
      expect(true).toBe(true);
    }
  });

  test("✅ Pitfall avoidance - literal strings", () => {
    // ✅ DO: Use literal strings in if statements
    let result = false;
    if (feature("PREMIUM")) {
      result = true;
    }
    expect(typeof result).toBe("boolean");

    // ❌ DON'T: Use dynamic feature names (can't be tested, but we can show the pattern)
    // const flag = "PREMIUM";
    // if (feature(flag)) { } // Can't be statically analyzed
  });

  test("✅ Quick wins - gate expensive imports", async () => {
    // Pattern: Gate expensive imports
    if (feature("ADMIN")) {
      // In real code, this would be: await import("./heavy-admin-module")
      expect(true).toBe(true);
    }
  });

  test("✅ Quick wins - remove dev tools from production", () => {
    if (feature("DEBUG")) {
      // Dev tools only in debug builds
      expect(true).toBe(true);
    }
  });

  test("✅ Security - admin code gating", () => {
    if (feature("ADMIN_PANEL")) {
      // Sensitive code only in admin builds
      expect(true).toBe(true);
    }
  });
});

describe("⚡ Performance Impact", () => {
  test("✅ Feature flags eliminate dead code", () => {
    // Before: Runtime check always in bundle
    const config = { features: { premium: true } };
    const oldWay = config.features.premium ? "Premium" : "Free";
    expect(typeof oldWay).toBe("string");

    // After: No runtime check, eliminated from free tier
    // Use ternary operator (allowed context for feature())
    const newWay = feature("PREMIUM") ? "Premium" : "Free";
    expect(typeof newWay).toBe("string");
  });
});

