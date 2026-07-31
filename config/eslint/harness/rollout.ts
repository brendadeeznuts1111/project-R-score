/**
 * Harness path scopes and rollout tiers (root paths only, warn → error).
 */

export const HARNESS_ROOTS = ['lib', 'scripts', 'packages', 'server', 'config', 'tools'] as const;

export const HARNESS_EXTENSIONS = ['ts', 'tsx'] as const;

export const HARNESS_PATHS = HARNESS_ROOTS.map(root => `${root}/**/*.{ts,tsx}`);

export const HARNESS_IGNORES = [
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/*.spec.ts',
  '**/*.spec.tsx',
  '**/*.bench.ts',
  '**/*.bench.tsx',
  '**/*.d.ts',
  'projects/**',
] as const;

/** True when a repo-relative path belongs to the canonical harness lint scope. */
export function isHarnessLintPath(file: string): boolean {
  const normalized = file.replace(/\\/g, '/').replace(/^\.\//, '');
  if (normalized.startsWith('projects/')) return false;
  if (normalized.endsWith('.d.ts')) return false;
  if (!HARNESS_EXTENSIONS.some(extension => normalized.endsWith(`.${extension}`))) return false;
  if (/\.(?:test|spec|bench)\.tsx?$/.test(normalized)) return false;
  return HARNESS_ROOTS.some(root => normalized.startsWith(`${root}/`));
}

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
