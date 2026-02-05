/**
 * Infrastructure Feature Flag Registry
 * Compile-time feature flags for zero-cost infrastructure builds
 */

// Define feature flag types
export type InfrastructureFeature =
  // Core system flags
  | "KERNEL_OPT"          // Level 0 optimizations
  | "ZERO_IO"             // Zero-I/O idle states
  | "QUANTUM_READY"       // Post-quantum cryptography
  | "ARM_VECTOR"          // ARM64 SIMD optimizations
  | "SECURE_COOKIES"      // Enhanced cookie security

  // Routing & transport
  | "ENHANCED_ROUTING"    // Advanced URL pattern matching
  | "WEBSOCKET_TRANSPORT" // WebSocket communication
  | "CROSS_ORIGIN"        // Cross-origin isolation
  | "CSRF_PROTECTION"     // CSRF validation

  // Storage & caching
  | "CLOUD_STORAGE"       // S3/R2 integration
  | "REDIS_CACHE"         // Redis caching layer
  | "SECURE_VAULT"        // Encrypted data storage

  // Observability & control
  | "MEMORY_AUDIT"        // Heap profiling
  | "THREAT_INTEL"        // Threat intelligence
  | "POLICY_ENGINE"       // Compliance enforcement
  | "LSP_CONTROL"         // Language server orchestration

  // Distribution & sync
  | "CATALOG_RESOLUTION"  // Dependency resolution
  | "GLOBAL_SYNC"         // Multi-region synchronization
  | "ASSET_UPLOAD"        // Cloud asset management
  | "ARCHIVE_MANAGEMENT"  // Lifecycle management
  | "SECURE_PROXY"        // Signed media access

  // Redis-specific features
  | "REDIS_ERROR_HANDLING" // Comprehensive error handling
  | "PUBSUB_PROTOCOL"     // Redis Pub/Sub support
  | "REDIS_DATA_TYPES"    // All Redis data type operations
  | "REDIS_CONNECTION"    // Advanced connection management
  | "REDIS_PERFORMANCE"   // Performance monitoring
  | "REDIS_SECURITY"      // Security features
  | "REDIS_MONITORING"    // Health monitoring

  // Skills Directory features
  | "GLOBAL_SKILLS"       // Global skills directory enabled
  | "LOCAL_SKILLS"        // Local skills directory enabled
  | "SKILLS_HOT_RELOAD"   // Hot-reload for skills
  | "SKILLS_INTEGRITY"    // SHA-256 integrity verification
  | "SKILLS_ROUTES"       // Skill route registration

  // Binary Protocol features
  | "BINARY_PROTOCOL"     // Binary protocol ingressor enabled
  | "BINARY_ALIGNMENT"    // 4-byte alignment enforcement
  | "BINARY_CHECKSUM"     // CRC32 checksum verification
  | "BINARY_STREAMING"    // ReadableStream conversion
  | "BINARY_THREAT_INTEL" // Threat intelligence integration

  // Sportsbook Protocol features
  | "SPORTSBOOK_FEED"     // High-frequency odds feed enabled
  | "SPORTSBOOK_RISK"     // Risk management engine
  | "SPORTSBOOK_ARBITRAGE" // Arbitrage detection
  | "SPORTSBOOK_MATCHING" // Order matching engine
  | "SPORTSBOOK_COMPLIANCE" // Regulatory compliance reporting
  | "SPORTSBOOK_DELTA"    // Delta-Update-Aggregator (#37) for bandwidth reduction

  // v2.4.2 Infrastructure features (Components #42-45)
  | "STRING_WIDTH_OPT"    // Component #42: Unicode width engine
  | "NATIVE_ADDONS"       // Component #43: V8 type checking bridge
  | "YAML12_STRICT"       // Component #44: YAML 1.2 strict parser
  | "SECURITY_HARDENING"  // Component #45: CVE prevention + JSC sandbox
  | "UNICODE_ZWJ"         // Sub-feature: Emoji ZWJ sequence handling
  | "ANSI_CSI_PARSER"     // Sub-feature: ANSI escape sequence handling
  | "V8_TYPE_BRIDGE"      // Sub-feature: Native addon type compatibility
  | "YAML_BOOLEAN_STRICT" // Sub-feature: yes/no as strings (YAML 1.2)
  | "JSC_SANDBOX"         // Sub-feature: JSC loader leak prevention
  | "TRUSTED_DEPS_VALIDATE" // Sub-feature: trustedDependencies protocol validation

  // Development & testing
  | "TEST_VALIDATION"     // Test infrastructure
  | "PREMIUM"             // Premium features
  | "DEBUG"               // Debug logging
  | "BETA_FEATURES"       // Experimental features
  | "MOCK_API"            // API mocking
  | "PLATFORM_SPECIFIC"   // Platform-specific builds
  | "A_B_TESTING"         // A/B testing variants
  | "PAID_TIER"           // Paid feature tier
  | "ENVIRONMENT_BASED"   // Environment-specific code
  | "DEAD_CODE_ELIM"      // Dead code elimination
  | "ZERO_COST_ABSTRACTION" // Zero-cost abstractions
  | "COMPILER_GATEKEEPER" // Compile-time validation

  // v2.4.2 Expansion Components (#46-54)
  | "URL_PATTERN_NATIVE"    // Component #46: Native URLPattern API
  | "FAKE_TIMERS"           // Component #47: Jest-compatible fake timers
  | "PROXY_HEADERS"         // Component #48: Custom proxy headers
  | "HTTP_AGENT_POOL"       // Component #49: Connection pooling with kqueue fix
  | "STANDALONE_OPTIMIZER"  // Component #50: Standalone executable optimization
  | "CONSOLE_JSON"          // Component #51: Console %j JSON formatter
  | "SQLITE_OPT"            // Component #52: SQLite 3.51.1 optimizations
  | "CVE_HARDENING"         // Component #53: CVE hardening layer
  | "NODEJS_COMPAT"         // Component #54: Node.js full compatibility

  // Bun v1.3.3 Infrastructure Components (#55-59)
  | "COMPRESSION_STREAM"    // Component #55: CompressionStream native C++ engine
  | "STANDALONE_CONFIG"     // Component #56: Deterministic standalone config embedding
  | "TEST_RESILIENCE"       // Component #57: Flaky test retry/repeat engine
  | "SQLITE_3_51_0"         // Component #58: SQLite 3.51.0 query optimizer
  | "ZIG_BUILD_OPT"         // Component #59: Zig 0.15.2 binary optimization
  | "ZSTD_COMPRESSION"      // Sub-feature: zstd compression (40% smaller packages)
  | "AUTOLOAD_DISABLE"      // Sub-feature: Disable runtime config autoloading
  | "TEST_EXPONENTIAL_BACKOFF" // Sub-feature: Exponential backoff for retries
  | "PGO_SUPPORT"           // Sub-feature: Profile-guided optimization
  | "PREPARED_STMT_CACHE"   // Sub-feature: SQLite prepared statement caching

  // Bun v1.3.3 Package Manager & Stability Components (#56-64 expansion)
  | "CONFIG_VERSION_STABLE"  // Component #56b: Lockfile configVersion stabilization
  | "CPU_PROFILING"          // Component #57b: CPU profiler with Chrome DevTools output
  | "ON_TEST_FINISHED"       // Component #58b: Test finalization callbacks
  | "WS_SUBSCRIPTIONS"       // Component #59b: WebSocket subscription tracking
  | "GIT_DEPS_SECURE"        // Component #60: Git dependency security layer
  | "SPAWN_SYNC_ISOLATED"    // Component #61: Isolated event loop for spawnSync
  | "BUN_LIST_ALIAS"         // Component #62: bun list CLI alias
  | "CONFIG_LOAD_PATCH"      // Component #63: Config loading deduplication
  | "HOISTED_INSTALL";       // Component #64: Hoisted install restoration

// Type-safe feature flag registry for Bun's compile-time bundler
declare module "bun:bundle" {
  interface Registry {
    features: InfrastructureFeature;
  }
}

// Runtime feature flag evaluation
// In production, Bun's bundler can replace these with compile-time constants
// At runtime, we check environment variables
function evaluateFeatureFlag(flag: InfrastructureFeature): boolean {
  // Check environment variable (FEATURE_FLAG_NAME or just FLAG_NAME)
  const envKey = flag.replace(/-/g, '_');
  const envValue = Bun.env[envKey] ?? Bun.env[`FEATURE_${envKey}`];

  // If explicitly set, use that value
  if (envValue !== undefined) {
    return envValue === 'true' || envValue === '1';
  }

  // Default enabled features (always on in production)
  const alwaysEnabled: InfrastructureFeature[] = [
    'KERNEL_OPT', 'ENHANCED_ROUTING', 'SECURE_COOKIES',
    'WEBSOCKET_TRANSPORT', 'MEMORY_AUDIT', 'TEST_VALIDATION',
  ];

  if (alwaysEnabled.includes(flag)) {
    return true;
  }

  // Development-only features default to off in production
  const devOnly: InfrastructureFeature[] = [
    'DEBUG', 'MOCK_API', 'BETA_FEATURES',
  ];

  if (devOnly.includes(flag)) {
    return Bun.env.NODE_ENV !== 'production';
  }

  // Default: enabled
  return true;
}

// Type guard for feature flags
export function isFeatureEnabled(flag: InfrastructureFeature): boolean {
  return evaluateFeatureFlag(flag);
}

// Feature flag validation utilities
export class FeatureFlagValidator {
  private static readonly VALID_FLAGS: InfrastructureFeature[] = [
    "KERNEL_OPT", "ZERO_IO", "QUANTUM_READY", "ARM_VECTOR", "SECURE_COOKIES",
    "ENHANCED_ROUTING", "WEBSOCKET_TRANSPORT", "CROSS_ORIGIN", "CSRF_PROTECTION",
    "CLOUD_STORAGE", "REDIS_CACHE", "SECURE_VAULT",
    "MEMORY_AUDIT", "THREAT_INTEL", "POLICY_ENGINE", "LSP_CONTROL",
    "CATALOG_RESOLUTION", "GLOBAL_SYNC", "ASSET_UPLOAD", "ARCHIVE_MANAGEMENT", "SECURE_PROXY",
    "REDIS_ERROR_HANDLING", "PUBSUB_PROTOCOL", "REDIS_DATA_TYPES", "REDIS_CONNECTION", "REDIS_PERFORMANCE", "REDIS_SECURITY", "REDIS_MONITORING",
    "GLOBAL_SKILLS", "LOCAL_SKILLS", "SKILLS_HOT_RELOAD", "SKILLS_INTEGRITY", "SKILLS_ROUTES",
    "BINARY_PROTOCOL", "BINARY_ALIGNMENT", "BINARY_CHECKSUM", "BINARY_STREAMING", "BINARY_THREAT_INTEL",
    "SPORTSBOOK_FEED", "SPORTSBOOK_RISK", "SPORTSBOOK_ARBITRAGE", "SPORTSBOOK_MATCHING", "SPORTSBOOK_COMPLIANCE", "SPORTSBOOK_DELTA",
    "STRING_WIDTH_OPT", "NATIVE_ADDONS", "YAML12_STRICT", "SECURITY_HARDENING",
    "UNICODE_ZWJ", "ANSI_CSI_PARSER", "V8_TYPE_BRIDGE", "YAML_BOOLEAN_STRICT", "JSC_SANDBOX", "TRUSTED_DEPS_VALIDATE",
    "TEST_VALIDATION", "PREMIUM", "DEBUG", "BETA_FEATURES", "MOCK_API", "PLATFORM_SPECIFIC", "A_B_TESTING", "PAID_TIER", "ENVIRONMENT_BASED", "DEAD_CODE_ELIM", "ZERO_COST_ABSTRACTION", "COMPILER_GATEKEEPER",
    "URL_PATTERN_NATIVE", "FAKE_TIMERS", "PROXY_HEADERS", "HTTP_AGENT_POOL", "STANDALONE_OPTIMIZER", "CONSOLE_JSON", "SQLITE_OPT", "CVE_HARDENING", "NODEJS_COMPAT",
    "COMPRESSION_STREAM", "STANDALONE_CONFIG", "TEST_RESILIENCE", "SQLITE_3_51_0", "ZIG_BUILD_OPT",
    "ZSTD_COMPRESSION", "AUTOLOAD_DISABLE", "TEST_EXPONENTIAL_BACKOFF", "PGO_SUPPORT", "PREPARED_STMT_CACHE",
    "CONFIG_VERSION_STABLE", "CPU_PROFILING", "ON_TEST_FINISHED", "WS_SUBSCRIPTIONS",
    "GIT_DEPS_SECURE", "SPAWN_SYNC_ISOLATED", "BUN_LIST_ALIAS", "CONFIG_LOAD_PATCH", "HOISTED_INSTALL"
  ];

  static isValidFlag(flag: string): flag is InfrastructureFeature {
    return this.VALID_FLAGS.includes(flag as InfrastructureFeature);
  }

  static getAllValidFlags(): InfrastructureFeature[] {
    return [...this.VALID_FLAGS];
  }

  static validateFlag(flag: string): { valid: boolean; error?: string } {
    if (!flag) {
      return { valid: false, error: "Flag cannot be empty" };
    }

    if (!this.isValidFlag(flag)) {
      return {
        valid: false,
        error: `Unknown feature flag: ${flag}. Valid flags: ${this.VALID_FLAGS.join(', ')}`
      };
    }

    return { valid: true };
  }
}

// Infrastructure feature flag groups for common build configurations
export const INFRASTRUCTURE_FEATURE_GROUPS = {
  // Production builds - maximum performance
  production: [
    "KERNEL_OPT", "SECURE_COOKIES", "QUANTUM_READY", "ARM_VECTOR", "ZERO_IO",
    "ENHANCED_ROUTING", "CLOUD_STORAGE", "REDIS_CACHE", "DEAD_CODE_ELIM", "ZERO_COST_ABSTRACTION"
  ] as const,

  // Development builds - maximum debugging
  development: [
    "DEBUG", "BETA_FEATURES", "MOCK_API", "PLATFORM_SPECIFIC", "MEMORY_AUDIT",
    "THREAT_INTEL", "LSP_CONTROL", "TEST_VALIDATION", "REDIS_ERROR_HANDLING", "PUBSUB_PROTOCOL"
  ] as const,

  // Premium tier builds
  premium: [
    "PREMIUM", "WEBSOCKET_TRANSPORT", "CROSS_ORIGIN", "CSRF_PROTECTION", "SECURE_VAULT",
    "GLOBAL_SYNC", "ASSET_UPLOAD", "ARCHIVE_MANAGEMENT", "SECURE_PROXY", "PAID_TIER",
    "REDIS_CACHE", "REDIS_PERFORMANCE", "REDIS_SECURITY"
  ] as const,

  // Free tier builds - minimal features
  free: [
    "WEBSOCKET_TRANSPORT", "ENVIRONMENT_BASED", "REDIS_ERROR_HANDLING"
  ] as const,

  // Zero-cost builds - maximum dead code elimination
  zeroCost: [
    "KERNEL_OPT", "QUANTUM_READY", "ARM_VECTOR", "ZERO_IO", "DEAD_CODE_ELIM", "ZERO_COST_ABSTRACTION"
  ] as const,

  // Redis-focused builds
  redis: [
    "REDIS_CACHE", "REDIS_ERROR_HANDLING", "PUBSUB_PROTOCOL", "REDIS_DATA_TYPES",
    "REDIS_CONNECTION", "REDIS_PERFORMANCE", "REDIS_SECURITY", "REDIS_MONITORING"
  ] as const,

  // Skills Directory builds
  skills: [
    "GLOBAL_SKILLS", "LOCAL_SKILLS", "SKILLS_HOT_RELOAD",
    "SKILLS_INTEGRITY", "SKILLS_ROUTES"
  ] as const,

  // Binary Protocol builds
  binary: [
    "BINARY_PROTOCOL", "BINARY_ALIGNMENT", "BINARY_CHECKSUM",
    "BINARY_STREAMING", "BINARY_THREAT_INTEL"
  ] as const,

  // Sportsbook Protocol builds
  sportsbook: [
    "SPORTSBOOK_FEED", "SPORTSBOOK_RISK", "SPORTSBOOK_ARBITRAGE",
    "SPORTSBOOK_MATCHING", "SPORTSBOOK_COMPLIANCE", "SPORTSBOOK_DELTA"
  ] as const,

  // v2.4.2 Infrastructure builds (Components #42-45)
  v242: [
    "STRING_WIDTH_OPT", "NATIVE_ADDONS", "YAML12_STRICT", "SECURITY_HARDENING",
    "UNICODE_ZWJ", "ANSI_CSI_PARSER", "V8_TYPE_BRIDGE", "YAML_BOOLEAN_STRICT",
    "JSC_SANDBOX", "TRUSTED_DEPS_VALIDATE"
  ] as const,

  // Security-hardened builds
  securityHardened: [
    "SECURITY_HARDENING", "JSC_SANDBOX", "TRUSTED_DEPS_VALIDATE",
    "CSRF_PROTECTION", "SECURE_COOKIES", "SECURE_VAULT"
  ] as const,

  // v2.4.2 Expansion builds (Components #46-54)
  v242Expansion: [
    "URL_PATTERN_NATIVE", "FAKE_TIMERS", "PROXY_HEADERS", "HTTP_AGENT_POOL",
    "STANDALONE_OPTIMIZER", "CONSOLE_JSON", "SQLITE_OPT", "CVE_HARDENING", "NODEJS_COMPAT"
  ] as const,

  // Testing infrastructure builds
  testing: [
    "TEST_VALIDATION", "FAKE_TIMERS", "MOCK_API", "DEBUG"
  ] as const,

  // Full Node.js compatibility builds
  nodejsCompat: [
    "NODEJS_COMPAT", "HTTP_AGENT_POOL", "CONSOLE_JSON"
  ] as const,

  // Bun v1.3.3 Infrastructure builds (Components #55-59)
  bunV133: [
    "COMPRESSION_STREAM", "STANDALONE_CONFIG", "TEST_RESILIENCE",
    "SQLITE_3_51_0", "ZIG_BUILD_OPT", "ZSTD_COMPRESSION",
    "AUTOLOAD_DISABLE", "TEST_EXPONENTIAL_BACKOFF", "PGO_SUPPORT",
    "PREPARED_STMT_CACHE"
  ] as const,

  // Streaming & compression builds
  streaming: [
    "COMPRESSION_STREAM", "ZSTD_COMPRESSION", "BINARY_STREAMING"
  ] as const,

  // Build optimization builds
  buildOptimization: [
    "STANDALONE_CONFIG", "ZIG_BUILD_OPT", "PGO_SUPPORT",
    "AUTOLOAD_DISABLE", "STANDALONE_OPTIMIZER", "DEAD_CODE_ELIM"
  ] as const,

  // Database optimization builds
  database: [
    "SQLITE_3_51_0", "SQLITE_OPT", "PREPARED_STMT_CACHE", "REDIS_CACHE"
  ] as const,

  // Bun v1.3.3 Package Manager & Stability builds (Components #56-64 expansion)
  bunV133PackageManager: [
    "CONFIG_VERSION_STABLE", "CPU_PROFILING", "ON_TEST_FINISHED",
    "WS_SUBSCRIPTIONS", "GIT_DEPS_SECURE", "SPAWN_SYNC_ISOLATED",
    "BUN_LIST_ALIAS", "CONFIG_LOAD_PATCH", "HOISTED_INSTALL"
  ] as const,

  // Package manager stability builds
  packageManagerStability: [
    "CONFIG_VERSION_STABLE", "CONFIG_LOAD_PATCH", "HOISTED_INSTALL",
    "BUN_LIST_ALIAS", "CATALOG_RESOLUTION"
  ] as const,

  // Process & system builds
  processSystem: [
    "SPAWN_SYNC_ISOLATED", "KERNEL_OPT", "NODEJS_COMPAT"
  ] as const,

  // Profiling & diagnostics builds
  profiling: [
    "CPU_PROFILING", "MEMORY_AUDIT", "DEBUG"
  ] as const
} as const;

// Export types for use in other modules
export type FeatureGroup = keyof typeof INFRASTRUCTURE_FEATURE_GROUPS;