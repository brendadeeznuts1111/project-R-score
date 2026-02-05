import "./types.d.ts";
// infrastructure/v2-4-2/feature-registry.ts
// Golden Matrix v2.4.2 Feature Registry and Type Definitions

// Feature registry for Golden Matrix v2.4.2 infrastructure components
export const GOLDEN_MATRIX_FEATURES = {
  // Core infrastructure features
  URL_PATTERN_NATIVE: "URL_PATTERN_NATIVE",
  FAKE_TIMERS: "FAKE_TIMERS",
  PROXY_HEADERS: "PROXY_HEADERS",
  HTTP_AGENT_POOL: "HTTP_AGENT_POOL",
  STANDALONE_OPTIMIZER: "STANDALONE_OPTIMIZER",
  CONSOLE_JSON: "CONSOLE_JSON",
  SQLITE_OPT: "SQLITE_OPT",
  SECURITY_HARDENING: "SECURITY_HARDENING",
  NODEJS_COMPAT: "NODEJS_COMPAT",

  // Supporting features
  INFRASTRUCTURE_HEALTH_CHECKS: "INFRASTRUCTURE_HEALTH_CHECKS",
  ENABLE_COMPRESSION: "ENABLE_COMPRESSION",
  BUN_RUNTIME_CONFIG: "BUN_RUNTIME_CONFIG",
} as const;

// Feature metadata
export const FEATURE_METADATA = {
  [GOLDEN_MATRIX_FEATURES.URL_PATTERN_NATIVE]: {
    component: 42,
    name: "URLPattern API Engine",
    description: "Native C++ pattern matching for O(1) routing",
    status: "stable",
    performance: "sub-100ms",
    zeroCost: true,
  },
  [GOLDEN_MATRIX_FEATURES.FAKE_TIMERS]: {
    component: 43,
    name: "Fake Timers Engine",
    description: "Deterministic test infrastructure with Jest API",
    status: "stable",
    performance: "deterministic",
    zeroCost: true,
  },
  [GOLDEN_MATRIX_FEATURES.PROXY_HEADERS]: {
    component: 44,
    name: "Custom Proxy Headers Handler",
    description: "RFC 9112 compliant proxy authentication",
    status: "stable",
    performance: "sub-50ms",
    zeroCost: true,
  },
  [GOLDEN_MATRIX_FEATURES.HTTP_AGENT_POOL]: {
    component: 45,
    name: "HttpAgent Connection Pool",
    description: "kqueue EV_ONESHOT bug fix with Keep-Alive",
    status: "stable",
    performance: "40% faster",
    zeroCost: true,
  },
  [GOLDEN_MATRIX_FEATURES.STANDALONE_OPTIMIZER]: {
    component: 46,
    name: "Standalone Executable Optimizer",
    description: "8-byte alignment and runtime config embedding",
    status: "stable",
    performance: "40% faster startup",
    zeroCost: true,
  },
  [GOLDEN_MATRIX_FEATURES.CONSOLE_JSON]: {
    component: 47,
    name: "Console JSON Formatter",
    description: "%j specifier support for structured logging",
    status: "stable",
    performance: "sub-10ms",
    zeroCost: true,
  },
  [GOLDEN_MATRIX_FEATURES.SQLITE_OPT]: {
    component: 48,
    name: "SQLite 3.51.1 Engine",
    description: "EXISTS-to-JOIN optimization with query planner",
    status: "stable",
    performance: "30% faster queries",
    zeroCost: true,
  },
  [GOLDEN_MATRIX_FEATURES.SECURITY_HARDENING]: {
    component: 49,
    name: "Security Hardening Layer",
    description: "CVE-2024 prevention and JSC sandbox isolation",
    status: "stable",
    performance: "sub-5ms validation",
    zeroCost: true,
  },
  [GOLDEN_MATRIX_FEATURES.NODEJS_COMPAT]: {
    component: 50,
    name: "Node.js Compatibility Bridge",
    description:
      "Full Node.js compatibility with Buffer, TLSSocket, napi_typeof",
    status: "stable",
    performance: "native performance",
    zeroCost: true,
  },
  [GOLDEN_MATRIX_FEATURES.INFRASTRUCTURE_HEALTH_CHECKS]: {
    component: 11,
    name: "Infrastructure Health Checks",
    description: "Atomic-Integrity-Log integration for monitoring",
    status: "stable",
    performance: "async monitoring",
    zeroCost: true,
  },
  [GOLDEN_MATRIX_FEATURES.ENABLE_COMPRESSION]: {
    component: 46,
    name: "Binary Compression",
    description: "Executable compression for smaller binaries",
    status: "experimental",
    performance: "20% smaller",
    zeroCost: true,
  },
  [GOLDEN_MATRIX_FEATURES.BUN_RUNTIME_CONFIG]: {
    component: 46,
    name: "Runtime Configuration",
    description: "Embedded runtime configuration for standalone executables",
    status: "stable",
    performance: "zero runtime config loading",
    zeroCost: true,
  },
} as const;

// Feature status types
export type FeatureStatus = "stable" | "experimental" | "deprecated";

// Feature metadata interface
export interface FeatureMetadata {
  component: number;
  name: string;
  description: string;
  status: FeatureStatus;
  performance: string;
  zeroCost: boolean;
}

// Feature configuration interface
export interface FeatureConfiguration {
  enabled: boolean;
  settings?: Record<string, unknown>;
}

// Golden Matrix configuration interface
export interface GoldenMatrixConfiguration {
  version: string;
  features: Partial<
    Record<
      (typeof GOLDEN_MATRIX_FEATURES)[keyof typeof GOLDEN_MATRIX_FEATURES],
      FeatureConfiguration
    >
  >;
  global: {
    healthChecks: boolean;
    auditLogging: boolean;
    performanceMonitoring: boolean;
  };
}

// Default configuration
export const DEFAULT_CONFIGURATION: GoldenMatrixConfiguration = {
  version: "2.4.2",
  features: {
    [GOLDEN_MATRIX_FEATURES.URL_PATTERN_NATIVE]: { enabled: true },
    [GOLDEN_MATRIX_FEATURES.FAKE_TIMERS]: { enabled: true },
    [GOLDEN_MATRIX_FEATURES.PROXY_HEADERS]: { enabled: true },
    [GOLDEN_MATRIX_FEATURES.HTTP_AGENT_POOL]: { enabled: true },
    [GOLDEN_MATRIX_FEATURES.STANDALONE_OPTIMIZER]: { enabled: true },
    [GOLDEN_MATRIX_FEATURES.CONSOLE_JSON]: { enabled: true },
    [GOLDEN_MATRIX_FEATURES.SQLITE_OPT]: { enabled: true },
    [GOLDEN_MATRIX_FEATURES.SECURITY_HARDENING]: { enabled: true },
    [GOLDEN_MATRIX_FEATURES.NODEJS_COMPAT]: { enabled: true },
    [GOLDEN_MATRIX_FEATURES.INFRASTRUCTURE_HEALTH_CHECKS]: { enabled: true },
    [GOLDEN_MATRIX_FEATURES.ENABLE_COMPRESSION]: { enabled: false },
    [GOLDEN_MATRIX_FEATURES.BUN_RUNTIME_CONFIG]: { enabled: true },
  },
  global: {
    healthChecks: true,
    auditLogging: true,
    performanceMonitoring: true,
  },
};

// Feature registry manager
export class FeatureRegistry {
  private static configuration: GoldenMatrixConfiguration =
    DEFAULT_CONFIGURATION;

  // Initialize feature registry with configuration
  static initialize(config?: Partial<GoldenMatrixConfiguration>): void {
    if (config) {
      this.configuration = {
        ...DEFAULT_CONFIGURATION,
        ...config,
        features: {
          ...DEFAULT_CONFIGURATION.features,
          ...config.features,
        },
        global: {
          ...DEFAULT_CONFIGURATION.global,
          ...config.global,
        },
      };
    }

    // Log initialization
    if (this.configuration.global.auditLogging) {
      this.logFeatureInitialization();
    }
  }

  // Check if a feature is enabled
  static isEnabled(
    featureName: (typeof GOLDEN_MATRIX_FEATURES)[keyof typeof GOLDEN_MATRIX_FEATURES]
  ): boolean {
    const featureConfig = this.configuration.features[featureName];
    return featureConfig?.enabled ?? false;
  }

  // Get feature configuration
  static getFeatureConfig(
    featureName: (typeof GOLDEN_MATRIX_FEATURES)[keyof typeof GOLDEN_MATRIX_FEATURES]
  ): FeatureConfiguration | undefined {
    return this.configuration.features[featureName];
  }

  // Get all enabled features
  static getEnabledFeatures(): (typeof GOLDEN_MATRIX_FEATURES)[keyof typeof GOLDEN_MATRIX_FEATURES][] {
    return Object.entries(this.configuration.features)
      .filter(([_, config]) => config.enabled)
      .map(
        ([name, _]) =>
          name as (typeof GOLDEN_MATRIX_FEATURES)[keyof typeof GOLDEN_MATRIX_FEATURES]
      );
  }

  // Get feature metadata
  static getFeatureMetadata(
    featureName: (typeof GOLDEN_MATRIX_FEATURES)[keyof typeof GOLDEN_MATRIX_FEATURES]
  ): FeatureMetadata | undefined {
    return FEATURE_METADATA[featureName];
  }

  // Get all feature metadata
  static getAllFeatureMetadata(): Record<
    (typeof GOLDEN_MATRIX_FEATURES)[keyof typeof GOLDEN_MATRIX_FEATURES],
    FeatureMetadata
  > {
    return FEATURE_METADATA;
  }

  // Enable/disable feature
  static setFeatureEnabled(
    featureName: (typeof GOLDEN_MATRIX_FEATURES)[keyof typeof GOLDEN_MATRIX_FEATURES],
    enabled: boolean
  ): void {
    if (!this.configuration.features[featureName]) {
      this.configuration.features[featureName] = { enabled };
    } else {
      this.configuration.features[featureName]!.enabled = enabled;
    }
  }

  // Update feature settings
  static updateFeatureSettings(
    featureName: (typeof GOLDEN_MATRIX_FEATURES)[keyof typeof GOLDEN_MATRIX_FEATURES],
    settings: Record<string, unknown>
  ): void {
    if (!this.configuration.features[featureName]) {
      this.configuration.features[featureName] = { enabled: true, settings };
    } else {
      this.configuration.features[featureName]!.settings = {
        ...this.configuration.features[featureName]!.settings,
        ...settings,
      };
    }
  }

  // Get current configuration
  static getConfiguration(): GoldenMatrixConfiguration {
    return { ...this.configuration };
  }

  // Reset to default configuration
  static resetConfiguration(): void {
    this.configuration = DEFAULT_CONFIGURATION;
  }

  // Export configuration to JSON
  static exportConfiguration(): string {
    return JSON.stringify(this.configuration, null, 2);
  }

  // Import configuration from JSON
  static importConfiguration(json: string): void {
    try {
      const config = JSON.parse(json) as GoldenMatrixConfiguration;
      this.initialize(config);
    } catch (error) {
      throw new Error(
        `Invalid configuration JSON: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Validate configuration
  static validateConfiguration(
    config: GoldenMatrixConfiguration
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check version
    if (!config.version) {
      errors.push("Configuration version is required");
    }

    // Check features
    if (!config.features) {
      warnings.push("No features configured");
    } else {
      for (const [featureName, featureConfig] of Object.entries(
        config.features
      )) {
        if (
          !Object.values(GOLDEN_MATRIX_FEATURES).includes(featureName as any)
        ) {
          warnings.push(`Unknown feature: ${featureName}`);
        }

        if (
          !featureConfig.enabled &&
          typeof featureConfig.enabled !== "boolean"
        ) {
          errors.push(`Feature ${featureName} must have enabled property`);
        }
      }
    }

    // Check global settings
    if (!config.global) {
      errors.push("Global configuration is required");
    } else {
      const requiredGlobals = [
        "healthChecks",
        "auditLogging",
        "performanceMonitoring",
      ];
      for (const global of requiredGlobals) {
        if (typeof (config.global as any)[global] !== "boolean") {
          errors.push(`Global setting ${global} must be a boolean`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Log feature initialization
  private static logFeatureInitialization(): void {
    console.log("🚀 Golden Matrix v2.4.2 Feature Registry Initialized");
    console.log("==================================================");

    const enabledFeatures = this.getEnabledFeatures();
    console.log(
      `✅ Enabled Features (${enabledFeatures.length}/${Object.keys(GOLDEN_MATRIX_FEATURES).length}):`
    );

    for (const featureName of enabledFeatures) {
      const metadata = this.getFeatureMetadata(featureName);
      if (metadata) {
        console.log(
          `   ${metadata.name} (Component #${metadata.component}) - ${metadata.performance}`
        );
      }
    }

    console.log(
      `📊 Zero-Cost Abstractions: ${enabledFeatures.filter((f) => FEATURE_METADATA[f]?.zeroCost).length}/${enabledFeatures.length}`
    );
    console.log(
      `🔧 Health Checks: ${this.configuration.global.healthChecks ? "Enabled" : "Disabled"}`
    );
    console.log(
      `📝 Audit Logging: ${this.configuration.global.auditLogging ? "Enabled" : "Disabled"}`
    );
    console.log(
      `📈 Performance Monitoring: ${this.configuration.global.performanceMonitoring ? "Enabled" : "Disabled"}`
    );
  }

  // Get performance summary
  static getPerformanceSummary(): PerformanceSummary {
    const enabledFeatures = this.getEnabledFeatures();
    const stableFeatures = enabledFeatures.filter(
      (f) => FEATURE_METADATA[f]?.status === "stable"
    );
    const experimentalFeatures = enabledFeatures.filter(
      (f) => FEATURE_METADATA[f]?.status === "experimental"
    );
    const zeroCostFeatures = enabledFeatures.filter(
      (f) => FEATURE_METADATA[f]?.zeroCost
    );

    return {
      totalFeatures: Object.keys(GOLDEN_MATRIX_FEATURES).length,
      enabledFeatures: enabledFeatures.length,
      stableFeatures: stableFeatures.length,
      experimentalFeatures: experimentalFeatures.length,
      zeroCostFeatures: zeroCostFeatures.length,
      zeroCostPercentage:
        Math.round((zeroCostFeatures.length / enabledFeatures.length) * 100) ||
        0,
    };
  }
}

// Performance summary interface
export interface PerformanceSummary {
  totalFeatures: number;
  enabledFeatures: number;
  stableFeatures: number;
  experimentalFeatures: number;
  zeroCostFeatures: number;
  zeroCostPercentage: number;
}

// Validation result interface
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Export feature registry utilities
export const {
  initialize,
  isEnabled,
  getFeatureConfig,
  getEnabledFeatures,
  getFeatureMetadata,
  getAllFeatureMetadata,
  setFeatureEnabled,
  updateFeatureSettings,
  getConfiguration,
  resetConfiguration,
  exportConfiguration,
  importConfiguration,
  validateConfiguration,
  getPerformanceSummary,
} = FeatureRegistry;

// Initialize with default configuration
FeatureRegistry.initialize();

export default FeatureRegistry;
