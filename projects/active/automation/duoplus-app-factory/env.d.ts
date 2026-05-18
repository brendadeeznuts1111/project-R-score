// 🎛️ COSMIC BUNDLE FEATURE FLAG REGISTRY
// Bun:bundle compile-time type definitions
// Generated: January 22, 2026 | Nebula-Flow™ v3.5.0

declare module "bun:bundle" {
  /**
   * Type-safe feature flag registry for compile-time code elimination
   * All features are evaluated at build time, zero runtime overhead
   */
  interface Registry {
    features:
      | "CORE"                    // Essential dashboard infrastructure
      | "PREMIUM"                 // Paid features: billing, team seats
      | "DEBUG"                   // Debug tools: PTY console, verbose logs
      | "BETA_FEATURES"           // Experimental: quantum GNN, 50+ columns
      | "MOCK_API"                // Mock integrations for CI/local dev
      | "PERFORMANCE_POLISH";      // 5 optimization layers
  
    /**
     * Check if a feature is enabled for current build variant
     * @param feature - The feature flag to check
     * @returns boolean - true if feature is enabled at compile time
     * 
     * @example
     * ```typescript
     * import { feature } from 'bun:bundle';
     * 
     * if (feature("PREMIUM")) {
     *   // This code only exists in premium builds
     *   export function PremiumBillingPanel() { ... }
     * }
     * 
     * if (feature("DEBUG")) {
     *   // This code only exists in debug builds
     *   console.trace("Verbose debug info");
     * }
     * ```
     */
    feature(name: Registry["features"]): boolean;
  
    /**
     * Current build variant
     * Values: "free" | "premium" | "debug" | "beta" | "mock"
     */
    variant: "free" | "premium" | "debug" | "beta" | "mock";
  
    /**
     * Bundle metadata
     */
    metadata: {
      version: string;
      timestamp: string;
      features: string[];
      size: number;
      target: "bun";
    };
  }

  // Export the registry
  export const registry: Registry;
  export const feature: Registry["feature"];
  export const variant: Registry["variant"];
}

// Global type augmentation for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "production" | "development" | "test";
      PORT?: string;
      BUILD_VARIANT?: "free" | "premium" | "debug" | "beta" | "mock";
      FEATURE_LIGHTNING?: "true" | "false";
      FEATURE_KYC_ENFORCED?: "true" | "false";
      FEATURE_MOCK_API?: "true" | "false";
    }
  }
}

// TOML module declarations for type-safe imports
declare module "*.toml" {
  const content: any;
  export default content;
}

// CSS module declarations for web-app
declare module "*.css" {
  const content: string;
  export default content;
}

// JSON module declarations
declare module "*.json" {
  const content: any;
  export default content;
}

// Export for module augmentation
export {};