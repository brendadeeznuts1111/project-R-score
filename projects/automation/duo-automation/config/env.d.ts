// env.d.ts
declare module "bun:bundle" {
  interface Registry {
    features: "DEBUG_MODE" | "ADVANCED_MONITORING" | "PTY_SESSIONS" | "BETA_FEATURES";
  }
}
