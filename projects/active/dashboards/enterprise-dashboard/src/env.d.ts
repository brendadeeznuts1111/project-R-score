/// <reference types="bun-types" />

declare module "bun:bundle" {
  interface Registry {
    /**
     * Core feature flags for the Enterprise Dashboard.
     * Using feature("FLAG_NAME") enables compile-time dead code elimination.
     *
     * @example
     * if (feature("PREMIUM")) {
     *   // This code is removed in free builds
     *   return <PremiumBillingPanel />;
     * }
     */
    features:
      | "CORE"
      | "PERFORMANCE_POLISH"
      | "PREMIUM"
      | "DEBUG"
      | "BETA_FEATURES"
      | "MOCK_API"
      | "PREMIUM_BILLING"
      | "PREMIUM_TEAM_SEATS"
      | "PREMIUM_CASH_APP"
      | "PREMIUM_ANALYTICS"
      | "DEBUG_PTY_CONSOLE"
      | "DEBUG_VERBOSE_LOGS"
      | "DEBUG_TRACE_OUTPUT"
      | "DEBUG_MATRIX_TRACES"
      | "BETA_QUANTUM_COLOR"
      | "BETA_EXTRA_COLUMNS"
      | "BETA_ADVANCED_VIRTUALIZATION"
      | "MOCK_CASH_APP"
      | "MOCK_PLAID"
      | "MOCK_ANALYTICS"
      | "MOCK_NETWORK_PROBE";
  }

  /**
   * Check if a feature flag is enabled.
   * Evaluated at compile time for dead code elimination.
   *
   * @param featureName - The feature to check (must be in Registry.features)
   * @returns true if the feature is enabled in the current build
   *
   * @example
   * if (feature("PREMIUM")) {
   *   // Only included in premium builds
   * }
   */
  export function feature<K extends keyof Registry["features"]>(
    featureName: K
  ): boolean;

  /**
   * Get all enabled features for the current build.
   * Useful for runtime feature detection and logging.
   */
  export function getEnabledFeatures(): Set<keyof Registry["features"]>;

  /**
   * Check if the current build is a specific variant.
   */
  export function isVariant(variant: string): boolean;

  /**
   * Get the current build variant name.
   */
  export function getVariant(): string;
}

declare module "bun:ffi" {
  interface FFIRegistry {
    features: {
      ping: {
        args: ["cstring"];
        returns: "f64";
      };
      crc32_compute: {
        args: ["pointer", "uint32"];
        returns: "uint32";
      };
    };
  }
}
