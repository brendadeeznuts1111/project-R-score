// Type-safe feature flags for the dashboard
declare module "bun:bundle" {
  interface Registry {
    features:
      | "PREMIUM"
      | "DEBUG"
      | "CLOUD_UPLOAD"
      | "LOCAL_DEV"
      | "AUDIT_LOG"
      | "ADVANCED_UI"
      | "METRICS";
  }
}

// Global feature detection
declare global {
  var __FEATURES__: Set<string>;
  var __BUILD_MODE__: "production" | "premium" | "development" | "testing";
}

export {};
