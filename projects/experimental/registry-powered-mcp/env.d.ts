// env.d.ts - Bun Bundle Registry Interface Augmentation
//
// This file provides compile-time validation for feature flags used with Bun's bundler.
// The Registry interface in "bun:bundle" defines valid feature strings that can be used
// with the feature() function for dead-code elimination and conditional compilation.
//
// Valid use cases:
// - Platform-specific builds (DEBUG, PREMIUM, BETA_FEATURES)
// - Environment-based features
// - A/B testing variants
// - Paid tier features
//
// To add new features, simply extend the union type below:
// features: "DEBUG" | "PREMIUM" | "BETA_FEATURES" | "NEW_FEATURE";
//
declare module "bun:bundle" {
  interface Registry {
    // Core Platform Features
    TERMINAL_ENHANCED: boolean;
    POSIX_SHM: boolean;
    UUID_V7_ORDERING: boolean;
    DNS_CACHE_MONITOR: boolean;

    // Enterprise Features
    ENTERPRISE_SECURITY: boolean;
    ADVANCED_TELEMETRY: boolean;
    EDGE_COMPUTE: boolean;

    // Development Features
    DEBUG_MODE: boolean;
    PERFORMANCE_MONITORING: boolean;
    MOCK_API: boolean;

    // Deployment Variants
    PRODUCTION_BUILD: boolean;
    STAGING_BUILD: boolean;
    DEVELOPMENT_BUILD: boolean;

    // Package Manager Features (Components #65-70)
    features:
      | "DEBUG" | "PREMIUM" | "BETA_FEATURES"
      | "NO_PEER_DEPS_OPT"          // Component #65: Skip peer-deps wait
      | "NPMRC_EMAIL"                // Component #66: Email forwarding
      | "SELECTIVE_HOISTING"        // Component #67: Workspace hoisting
      | "NODEJS_READLINES"           // Component #68: FileHandle API
      | "BUNDLER_DETERMINISM"        // Component #69: EXDEV fix
      | "PACK_ENFORCER"              // Component #70: Bin enforcement

      // Stability Layer (Components #76-85)
      | "BUNX_UTF8_FIX"              // Component #76: Windows UTF-8
      | "MYSQL_PARAM_GUARD"          // Component #77: MySQL binding
      | "MYSQL_TLS_FIX"              // Component #78: TLS spin prevention
      | "MYSQL_IDLE_FIX"             // Component #79: Connection cleanup
      | "REDIS_URL_VALIDATE"         // Component #80: URL validation
      | "S3_ETAG_FIX"                // Component #81: Memory leak fix
      | "FFI_ERROR_SURFACE"          // Component #82: Better FFI errors
      | "WS_COOKIE_FIX"              // Component #83: WebSocket cookies
      | "NODEJS_COMPAT_PATCH"        // Component #84: Node.js compatibility
      | "CLOUDFLARE_SEC_PATCH"        // Component #85: Security fixes

      | "BUN_PM_OPTIMIZATIONS"       // Master flag for PM features
      | "NATIVE_STABILITY";          // Master flag for stability features
  }
}