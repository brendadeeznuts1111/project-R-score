// Bun v1.3.5 Compile-Time Feature Flags Type Declarations
// Reference: https://bun.sh/blog/bun-v1.3.5#compile-time-feature-flags-for-dead-code-elimination
//
// NOTE: bun:bundle module not yet available in current Bun v1.3.5
// This is prepared for when the feature becomes available in a future version
//
// Current approach: Use environment variables instead
// SURGICAL_DEBUG=true bun run index.ts
// SURGICAL_PRODUCTION=true bun run index.ts

declare module "bun:bundle" {
  interface Registry {
    features: "SURGICAL_DEBUG" | "SURGICAL_PRODUCTION" | "SURGICAL_VERSION" | "DEBUG" | "PREMIUM" | "BETA_FEATURES";
  }

  export function feature(name: string): boolean | string | undefined;
}
