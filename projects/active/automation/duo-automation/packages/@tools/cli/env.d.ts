// Type Safety Environment Declarations
// Registry interface augmentation for compile-time validation

declare module "bun:bundle" {
  interface Registry {
    // Feature flags for different builds and tiers
    features: "DEBUG" | "PREMIUM" | "BETA_FEATURES" | "ENTERPRISE" | "DEVELOPMENT_TOOLS" | "MULTI_TENANT";
    
    // Platform-specific builds
    platform: "DESKTOP" | "MOBILE" | "SERVER" | "CLOUD" | "EDGE";
    
    // Environment-based configurations
    environment: "DEVELOPMENT" | "STAGING" | "PRODUCTION" | "TESTING";
    
    // A/B testing variants
    variant: "CONTROL" | "TREATMENT_A" | "TREATMENT_B" | "TREATMENT_C";
    
    // Paid tier features
    tier: "FREE" | "PRO" | "BUSINESS" | "ENTERPRISE";
    
    // Component-specific features
    components: "STORAGE" | "SECRETS" | "SERVICE" | "MONITORING" | "ANALYTICS";
    
    // Security levels
    security: "BASIC" | "STANDARD" | "ENHANCED" | "MAXIMUM";
    
    // Performance profiles
    performance: "LOW_LATENCY" | "HIGH_THROUGHPUT" | "BALANCED" | "RESOURCE_OPTIMIZED";
  }
}

// Global type extensions for enhanced type safety
declare global {
  namespace Bun {
    interface BundleRegistry {
      // Feature flags for different builds and tiers
      features: "DEBUG" | "PREMIUM" | "BETA_FEATURES" | "ENTERPRISE" | "DEVELOPMENT_TOOLS" | "MULTI_TENANT";
      
      // Platform-specific builds
      platform: "DESKTOP" | "MOBILE" | "SERVER" | "CLOUD" | "EDGE";
      
      // Environment-based configurations
      environment: "DEVELOPMENT" | "STAGING" | "PRODUCTION" | "TESTING";
      
      // A/B testing variants
      variant: "CONTROL" | "TREATMENT_A" | "TREATMENT_B" | "TREATMENT_C";
      
      // Paid tier features
      tier: "FREE" | "PRO" | "BUSINESS" | "ENTERPRISE";
      
      // Component-specific features
      components: "STORAGE" | "SECRETS" | "SERVICE" | "MONITORING" | "ANALYTICS";
      
      // Security levels
      security: "BASIC" | "STANDARD" | "ENHANCED" | "MAXIMUM";
      
      // Performance profiles
      performance: "LOW_LATENCY" | "HIGH_THROUGHPUT" | "BALANCED" | "RESOURCE_OPTIMIZED";
    }
  }
}

export {};
