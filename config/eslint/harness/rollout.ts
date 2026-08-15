/**
 * Harness path scopes and rollout tiers (root paths only, warn → error).
 */

export const HARNESS_ROOTS = ['lib', 'scripts', 'packages', 'server', 'config', 'tools'] as const;

export const HARNESS_EXTENSIONS = ['ts', 'tsx'] as const;

/** Root policy files that must lint themselves and participate in staged checks. */
export const HARNESS_ENTRYPOINTS = ['eslint.config.ts', 'eslint.harness.config.ts'] as const;

export const HARNESS_PATHS = [
  ...HARNESS_ENTRYPOINTS,
  ...HARNESS_ROOTS.map(root => `${root}/**/*.{ts,tsx}`),
];

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

function normalizeRepoPath(file: string): string {
  return file.replace(/\\/g, '/').replace(/^\.\//, '');
}

/** True when a repo-relative path belongs to the canonical harness lint scope. */
export function isHarnessLintPath(file: string): boolean {
  const normalized = normalizeRepoPath(file);
  if (normalized.startsWith('projects/')) return false;
  if (normalized.endsWith('.d.ts')) return false;
  if (!HARNESS_EXTENSIONS.some(extension => normalized.endsWith(`.${extension}`))) return false;
  if (/\.(?:test|spec|bench)\.tsx?$/.test(normalized)) return false;
  return (
    HARNESS_ENTRYPOINTS.some(entrypoint => normalized === entrypoint) ||
    HARNESS_ROOTS.some(root => normalized.startsWith(`${root}/`))
  );
}

/**
 * Prettier write scope for pre-commit — lint paths plus tests that ESLint skips.
 * Does not expand ESLint to tests; format-only.
 */
export function isHarnessFormatPath(file: string): boolean {
  if (isHarnessLintPath(file)) return true;
  const normalized = normalizeRepoPath(file);
  if (normalized.startsWith('projects/')) return false;
  if (normalized.endsWith('.d.ts')) return false;
  if (!HARNESS_EXTENSIONS.some(extension => normalized.endsWith(`.${extension}`))) return false;
  if (normalized.startsWith('tests/')) return true;
  if (
    HARNESS_ROOTS.some(root => normalized.startsWith(`${root}/`)) &&
    /\.(?:test|spec|bench)\.tsx?$/.test(normalized)
  ) {
    return true;
  }
  return false;
}

/**
 * Files already migrated — strict error tier for bun-first guard.
 * Paths must exist on main; drop retired scripts rather than leave ENOENT noise.
 */
export const STRICT_INVENTORY = [
  'lib/projects-scan.ts',
  'scripts/dx-mcp.ts',
  'scripts/bun-remediation-cli.ts',
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
