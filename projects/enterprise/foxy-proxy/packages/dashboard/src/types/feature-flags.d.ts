// Bun Bundle Feature Flags Registry
// This file enables compile-time feature flags for dead-code elimination

declare module "bun:bundle" {
  interface Registry {
    features:
      | "DEBUG" // Debug mode with additional logging
      | "PREMIUM" // Premium features for paid tier
      | "DEV_TOOLS" // Developer tools and panels
      | "ANALYTICS" // Analytics and tracking
      | "MONITORING" // Performance monitoring
      | "DUOPLUS_ENABLED" // DuoPlus cloud phone integration
      | "ENHANCED_TEMPLATES" // Enhanced template system
      | "ADVANCED_ANALYTICS" // Advanced analytics features
      | "BETA_FEATURES" // Beta/experimental features
      | "PERFORMANCE_PROFILING" // Performance profiling tools
      | "ERROR_REPORTING" // Error reporting and crash analytics
      | "IMPORT_EXPORT" // Profile import/export functionality
      | "REAL_TIME_UPDATES" // Real-time data updates
      | "MULTI_TENANT" // Multi-tenant support
      | "WHITE_LABEL" // White-label customization
      | "API_RATE_LIMITING" // API rate limiting features
      | "CACHE_OPTIMIZATION" // Advanced caching features
      | "SECURITY_AUDIT" // Security audit logging
      | "DEVELOPER_MODE" // General developer mode
      | "PRODUCTION_MODE" // Production optimizations
      | "TEST_MODE"; // Test environment mode
  }
}

export {};
