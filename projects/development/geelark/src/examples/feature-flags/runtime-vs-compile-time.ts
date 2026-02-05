/**
 * RUNTIME VS COMPILE-TIME FEATURE FLAG PATTERNS
 * Demonstrates the split between build-time elimination and runtime toggles
 */

import { feature } from "bun:bundle";

// =============================================================================
// 🚀 COMPILE-TIME FLAGS (Dead Code Elimination)
// =============================================================================

/**
 * COMPILE-TIME: These are completely eliminated from bundles when disabled
 * Use for features that should never exist in certain builds
 */

export class CompileTimeFeatures {
  // Example: Premium features completely removed from free tier
  static initializePremiumFeatures() {
    if (feature("FEAT_PREMIUM")) {
      // This entire block is removed from free tier bundles
      console.log("🏆 Premium features initialized");
      return {
        advancedAnalytics: () => console.log("Advanced analytics running"),
        batchProcessing: () => console.log("Batch processing enabled"),
        prioritySupport: () => console.log("Priority support available"),
      };
    }

    // Free tier gets nothing - zero bundle impact
    return null;
  }

  // Example: Development tools completely removed from production
  static initializeDevTools() {
    if (feature("FEAT_EXTENDED_LOGGING")) {
      // This code never reaches production bundles
      console.log("📝 Extended logging enabled");
      return {
        debugMode: true,
        verboseOutput: true,
        stackTraces: true,
      };
    }

    return null;
  }

  // Example: Mock API completely removed from production
  static createApiClient() {
    if (feature("FEAT_MOCK_API")) {
      // Mock client only exists in development/test builds
      console.log("🧪 Mock API client created");
      return {
        type: "mock",
        request: async () => ({ success: true, mock: true }),
      };
    }

    // Production builds get real API client
    console.log("🚀 Real API client created");
    return {
      type: "real",
      request: async () => ({ success: true, real: true }),
    };
  }

  // Example: Security features based on environment
  static initializeSecurity() {
    if (feature("FEAT_ENCRYPTION")) {
      // Encryption only included when explicitly enabled
      console.log("🔐 Encryption enabled");
      return {
        encrypt: (data: string) => `encrypted_${data}`,
        decrypt: (data: string) => data.replace("encrypted_", ""),
      };
    }

    return null;
  }
}

// =============================================================================
// 🔄 RUNTIME FLAGS (Bundle Impact, Flexible Toggling)
// =============================================================================

/**
 * RUNTIME: These stay in the bundle but can be toggled at startup or runtime
 * Use for features that might need to be enabled/disabled dynamically
 */

export class RuntimeFeatures {
  private static config = new Map<string, boolean>();

  // Initialize runtime features from environment variables
  static initialize() {
    // Read from environment variables at startup
    this.config.set(
      "ENABLE_ANALYTICS",
      process.env.ENABLE_ANALYTICS === "true"
    );
    this.config.set("ENABLE_CACHE", process.env.ENABLE_CACHE === "true");
    this.config.set("ENABLE_RETRY", process.env.ENABLE_RETRY === "true");
    this.config.set("ENABLE_METRICS", process.env.ENABLE_METRICS === "true");
    this.config.set(
      "MAINTENANCE_MODE",
      process.env.MAINTENANCE_MODE === "true"
    );

    console.log("🔄 Runtime features initialized from environment");
  }

  // Runtime toggle method
  static setFeature(feature: string, enabled: boolean) {
    this.config.set(feature, enabled);
    console.log(`Runtime feature ${feature} set to ${enabled}`);
  }

  static isFeatureEnabled(feature: string): boolean {
    return this.config.get(feature) || false;
  }

  // Example: Analytics that can be toggled at runtime
  static trackEvent(event: string, data?: any) {
    if (this.isFeatureEnabled("ENABLE_ANALYTICS")) {
      // This code stays in bundle but only executes when enabled
      console.log(`📊 Analytics: ${event}`, data);
      // Real analytics implementation would go here
    } else {
      console.log(`📊 Analytics disabled: ${event}`);
    }
  }

  // Example: Cache that can be toggled at runtime
  static async get(key: string) {
    if (this.isFeatureEnabled("ENABLE_CACHE")) {
      console.log(`⚡ Cache HIT: ${key}`);
      return `cached_${key}`;
    } else {
      console.log(`⚡ Cache disabled: ${key}`);
      return null;
    }
  }

  // Example: Retry logic that can be toggled at runtime
  static async retry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
    if (!this.isFeatureEnabled("ENABLE_RETRY")) {
      return fn(); // No retry if disabled
    }

    console.log(`🔄 Retry enabled, max attempts: ${maxAttempts}`);
    for (let i = 0; i < maxAttempts; i++) {
      try {
        return await fn();
      } catch (error) {
        console.log(`🔄 Attempt ${i + 1} failed, retrying...`);
        if (i === maxAttempts - 1) throw error;
      }
    }
    throw new Error("Max retry attempts exceeded");
  }

  // Example: Metrics collection that can be toggled
  static recordMetric(name: string, value: number) {
    if (this.isFeatureEnabled("ENABLE_METRICS")) {
      console.log(`📈 Metric: ${name} = ${value}`);
      // Real metrics collection would go here
    }
  }

  // Example: Maintenance mode
  static checkMaintenanceMode() {
    if (this.isFeatureEnabled("MAINTENANCE_MODE")) {
      throw new Error("System is under maintenance");
    }
  }
}

// =============================================================================
// 🎯 HYBRID PATTERNS (Best of Both Worlds)
// =============================================================================

/**
 * HYBRID: Combines compile-time elimination with runtime flexibility
 * Maximum optimization with necessary runtime control
 */

export class HybridFeatures {
  // Example: Analytics with compile-time elimination and runtime toggle
  static setupAnalytics() {
    // Compile-time: Completely remove from builds without premium
    if (!feature("FEAT_PREMIUM")) {
      return null; // No analytics code in free tier bundles
    }

    // Runtime: Premium builds can still toggle analytics
    return {
      track: (event: string, data?: any) => {
        if (process.env.ANALYTICS_ENABLED !== "false") {
          console.log(`🏆 Premium Analytics: ${event}`, data);
        }
      },
      isEnabled: () => process.env.ANALYTICS_ENABLED !== "false",
    };
  }

  // Example: API client with compile-time features and runtime config
  static createOptimizedApiClient() {
    const baseConfig = {
      timeout: feature("FEAT_PREMIUM") ? 30000 : 10000,
      retries: feature("FEAT_PREMIUM") ? 3 : 1,
    };

    // Compile-time: Mock API in development
    if (feature("FEAT_MOCK_API")) {
      return {
        ...baseConfig,
        type: "mock",
        request: async () => ({ success: true, mock: true }),
      };
    }

    // Runtime: Real API with environment-based configuration
    return {
      ...baseConfig,
      type: "real",
      baseUrl: process.env.API_BASE_URL || "https://api.example.com",
      request: async (endpoint: string) => {
        console.log(`🚀 API Request: ${endpoint}`);
        return { success: true, data: "real_response" };
      },
    };
  }

  // Example: Logging with compile-time levels and runtime verbosity
  static createLogger() {
    // Compile-time: Determine maximum logging level
    const maxLevel = feature("FEAT_EXTENDED_LOGGING")
      ? "debug"
      : feature("ENV_DEVELOPMENT")
      ? "info"
      : "warn";

    return {
      debug: (message: string, data?: any) => {
        if (maxLevel === "debug" && process.env.VERBOSE_LOGGING !== "false") {
          console.log(`🐛 DEBUG: ${message}`, data);
        }
      },
      info: (message: string, data?: any) => {
        if (["debug", "info"].includes(maxLevel)) {
          console.log(`ℹ️ INFO: ${message}`, data);
        }
      },
      warn: (message: string, data?: any) => {
        console.log(`⚠️ WARN: ${message}`, data);
      },
      error: (message: string, data?: any) => {
        console.log(`❌ ERROR: ${message}`, data);
      },
    };
  }
}

// =============================================================================
// 📊 FEATURE FLAG COMPARISON EXAMPLES
// =============================================================================

export class FeatureComparison {
  static demonstrateDifference() {
    console.log("\n🎯 FEATURE FLAG COMPARISON DEMO");
    console.log("=".repeat(50));

    // COMPILE-TIME EXAMPLE
    console.log("\n📦 COMPILE-TIME FLAGS:");
    console.log("• Eliminated from bundle when disabled");
    console.log("• Zero runtime overhead");
    console.log("• Cannot be changed after build");

    const premiumFeatures = CompileTimeFeatures.initializePremiumFeatures();
    if (premiumFeatures) {
      premiumFeatures.advancedAnalytics();
    } else {
      console.log("• Premium features: NOT IN BUNDLE (free tier)");
    }

    // RUNTIME EXAMPLE
    console.log("\n🔄 RUNTIME FLAGS:");
    console.log("• Stay in bundle regardless of state");
    console.log("• Can be toggled at startup/runtime");
    console.log("• Small runtime overhead");

    RuntimeFeatures.initialize();
    RuntimeFeatures.trackEvent("user_action", { action: "login" });

    // HYBRID EXAMPLE
    console.log("\n🎯 HYBRID FLAGS:");
    console.log("• Compile-time elimination for major features");
    console.log("• Runtime control for fine-tuning");
    console.log("• Best of both worlds");

    const analytics = HybridFeatures.setupAnalytics();
    if (analytics) {
      analytics.track("premium_feature_used");
    } else {
      console.log("• Analytics: NOT IN BUNDLE (free tier)");
    }
  }

  static performanceComparison() {
    console.log("\n📊 PERFORMANCE COMPARISON:");
    console.log("=".repeat(30));

    console.log("Compile-Time Flags:");
    console.log("• Bundle Size: Minimal (dead code eliminated)");
    console.log("• Runtime Performance: Zero overhead");
    console.log("• Memory Usage: Minimal");
    console.log("• Startup Time: Fastest");

    console.log("\nRuntime Flags:");
    console.log("• Bundle Size: Larger (code always included)");
    console.log("• Runtime Performance: Small overhead");
    console.log("• Memory Usage: Higher");
    console.log("• Startup Time: Slightly slower");

    console.log("\nHybrid Approach:");
    console.log("• Bundle Size: Optimized");
    console.log("• Runtime Performance: Balanced");
    console.log("• Memory Usage: Efficient");
    console.log("• Startup Time: Optimized");
  }
}

// =============================================================================
// 🎛️ CONFIGURATION MANAGEMENT
// =============================================================================

export class ConfigurationManager {
  // Load configuration based on both compile-time and runtime flags
  static loadConfiguration() {
    const config: any = {
      // Compile-time determined values
      environment: feature("ENV_PRODUCTION") ? "production" : "development",
      tier: feature("FEAT_PREMIUM") ? "premium" : "free",
      hasEncryption: feature("FEAT_ENCRYPTION"),
      hasBatchProcessing: feature("FEAT_BATCH_PROCESSING"),

      // Runtime configurable values
      apiTimeout:
        process.env.API_TIMEOUT ||
        (feature("FEAT_PREMIUM") ? "30000" : "10000"),
      cacheEnabled: process.env.ENABLE_CACHE === "true",
      logLevel:
        process.env.LOG_LEVEL ||
        (feature("FEAT_EXTENDED_LOGGING") ? "debug" : "info"),

      // Hybrid values
      analyticsEnabled:
        feature("FEAT_PREMIUM") && process.env.ANALYTICS_ENABLED !== "false",
      mockData:
        feature("FEAT_MOCK_API") && process.env.USE_MOCK_DATA === "true",
    };

    console.log("🎛️ Configuration loaded:", config);
    return config;
  }

  // Validate feature combinations
  static validateConfiguration() {
    const errors: string[] = [];

    // Production should not have mock API
    if (feature("ENV_PRODUCTION") && feature("FEAT_MOCK_API")) {
      errors.push("Production builds should not use mock API");
    }

    // Premium features require premium tier
    if (!feature("FEAT_PREMIUM") && feature("FEAT_ADVANCED_MONITORING")) {
      errors.push("Advanced monitoring requires premium tier");
    }

    // Encryption should be enabled in production
    if (feature("ENV_PRODUCTION") && !feature("FEAT_ENCRYPTION")) {
      errors.push("Production builds should have encryption enabled");
    }

    if (errors.length > 0) {
      console.error("❌ Configuration validation errors:", errors);
      throw new Error("Invalid feature configuration");
    }

    console.log("✅ Configuration validation passed");
    return true;
  }
}

// Initialize everything when this module is imported
RuntimeFeatures.initialize();
