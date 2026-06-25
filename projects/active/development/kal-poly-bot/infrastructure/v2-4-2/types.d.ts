// Type declarations for the Golden Matrix v2.4.2 infrastructure

declare module "bun:bundle" {
  export function feature(featureName: string): boolean;
}

// Global type declarations
declare global {
  var __router_cache: Map<number, URLPattern> | undefined;
  var __sqlite_cache: Map<string, any[]> | undefined;
  var __STANDALONE_EXECUTABLE__: boolean | undefined;
}

export {};
