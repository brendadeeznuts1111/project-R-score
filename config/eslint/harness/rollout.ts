/**
 * Harness path scopes and rollout tiers (root paths only, warn → error).
 */

export const HARNESS_PATHS = [
  'lib/**/*.ts',
  'scripts/**/*.ts',
  'packages/**/*.ts',
  'server/**/*.ts',
  'config/**/*.ts',
  'tools/**/*.ts',
] as const;

export const HARNESS_IGNORES = [
  '**/*.test.ts',
  '**/*.spec.ts',
  '**/*.bench.ts',
  '**/*.d.ts',
  'projects/**',
] as const;

/** Files already migrated — strict error tier. */
export const STRICT_INVENTORY = [
  'lib/projects-scan.ts',
  'scripts/projects-table.ts',
  'scripts/projects-dashboard.ts',
  'scripts/dx-mcp.ts',
  'scripts/dx-catalog-cli.ts',
  'scripts/harness-guard.ts',
  'scripts/pre-commit-harness.ts',
] as const;

export const HARNESS_BUN_GLOBALS: Record<string, 'readonly'> = {
  Bun: 'readonly',
  console: 'readonly',
  process: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  setImmediate: 'readonly',
  clearImmediate: 'readonly',
  Buffer: 'readonly',
  TextEncoder: 'readonly',
  TextDecoder: 'readonly',
  fetch: 'readonly',
  Request: 'readonly',
  Response: 'readonly',
  Headers: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  WebSocket: 'readonly',
  crypto: 'readonly',
  performance: 'readonly',
  structuredClone: 'readonly',
  queueMicrotask: 'readonly',
  atob: 'readonly',
  btoa: 'readonly',
  EventTarget: 'readonly',
  Event: 'readonly',
  CustomEvent: 'readonly',
  AbortController: 'readonly',
  AbortSignal: 'readonly',
  ReadableStream: 'readonly',
  WritableStream: 'readonly',
  TransformStream: 'readonly',
  ByteLengthQueuingStrategy: 'readonly',
  CountQueuingStrategy: 'readonly',
  TextEncoderStream: 'readonly',
  TextDecoderStream: 'readonly',
  CompressionStream: 'readonly',
  DecompressionStream: 'readonly',
};
