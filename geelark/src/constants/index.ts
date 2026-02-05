/**
 * Bun Runtime Constants
 *
 * Centralized constants for Bun runtime features, defaults, and behaviors.
 * Based on https://bun.sh/docs/runtime
 */

// =============================================================================
// Performance & Timing Constants
// =============================================================================

export const PERF = {
  /** Default console inspection depth for objects */
  CONSOLE_DEPTH: 2,

  /** CPU profile file extension */
  CPU_PROFILE_EXT: '.cpuprofile',

  /** High-precision timing resolution */
  NANOS_RESOLUTION: 'nanoseconds' as const,

  /** Performance timing resolution (milliseconds) */
  PERF_NOW_RESOLUTION: 'milliseconds' as const,
} as const;

// =============================================================================
// Module Resolution Constants
// =============================================================================

export const MODULE = {
  /** Default file extension resolution order */
  EXTENSION_ORDER: ['.tsx', '.ts', '.jsx', '.js', '.json'] as const,

  /** Supported file loaders */
  LOADERS: ['js', 'jsx', 'ts', 'tsx', 'json', 'toml', 'text', 'file', 'wasm', 'napi'] as const,

  /** Installation modes */
  INSTALL_MODE: {
    AUTO: 'auto',
    FALLBACK: 'fallback',
    FORCE: 'force',
    DISABLED: 'no-install',
  } as const,

  /** Runtime targets */
  TARGETS: {
    BUN: 'bun',
    NODE: 'node',
    BROWSER: 'browser',
  } as const,
} as const;

// =============================================================================
// Memory & GC Constants
// =============================================================================

export const MEMORY = {
  /** Environment variable to enable mimalloc stats */
  MIMALLOC_STATS_VAR: 'MIMALLOC_SHOW_STATS=1',

  /** Heap snapshot format */
  SNAPSHOT_FORMAT: 'json',

  /** GC modes */
  GC_MODE: {
    SYNC: true,   // Blocks until GC completes
    ASYNC: false, // Schedules GC for later
  } as const,
} as const;

// =============================================================================
// JSX & Transpilation Constants
// =============================================================================

export const JSX = {
  /** JSX runtime modes */
  RUNTIME: {
    AUTOMATIC: 'automatic', // React 17+ transform
    CLASSIC: 'classic',     // React.createElement transform
  } as const,

  /** Default JSX factory (Bun runtime) */
  DEFAULT_FACTORY: 'createElement',

  /** Default JSX fragment (Bun runtime) */
  DEFAULT_FRAGMENT: 'Fragment',

  /** Default JSX import source (Bun automatic runtime) */
  DEFAULT_IMPORT_SOURCE: 'bun',

  /** JSX compiler options */
  COMPILER_OPTIONS: {
    JSX: 'react-jsx',
    JSX_IMPORT_SOURCE: 'bun',
    JSX_FACTORY: 'createElement',
    JSX_FRAGMENT_FACTORY: 'Fragment',
  } as const,
} as const;

// =============================================================================
// Networking Constants
// =============================================================================

export const NET = {
  /** Maximum HTTP headers size (bytes) */
  MAX_HEADERS_SIZE: 16384, // 16KiB

  /** DNS resolution order */
  DNS_ORDER: {
    VERBATIM: 'verbatim',
    IPV4_FIRST: 'ipv4first',
    IPV6_FIRST: 'ipv6first',
  } as const,

  /** CA store options */
  CA_STORE: {
    SYSTEM: 'system',
    OPENSSL: 'openssl',
    BUN: 'bun',
  } as const,

  /** Default server port (no fixed default in Bun) */
  DEFAULT_PORT: 3000,
} as const;

// =============================================================================
// CLI & Script Constants
// =============================================================================

export const CLI = {
  /** Config file name */
  CONFIG_FILE: 'bunfig.toml',

  /** Shell priority on Linux/macOS */
  SHELL_PRIORITY: ['bash', 'sh', 'zsh'] as const,

  /** Shell on Windows */
  WINDOWS_SHELL: 'bun shell',

  /** Built-in commands */
  BUILT_INS: [
    'init', 'install', 'remove', 'update', 'run',
    'dev', 'build', 'test', 'clean', 'upgrade',
    'pm', 'create', 'completions', 'discord', 'x',
  ] as const,

  /** Script lifecycle hooks */
  HOOKS: {
    PRE: 'pre',
    POST: 'post',
  } as const,
} as const;

// =============================================================================
// Debugging Constants
// =============================================================================

export const DEBUG = {
  /** Inspector flags */
  FLAGS: {
    INSPECT: '--inspect',
    INSPECT_WAIT: '--inspect-wait',
    INSPECT_BRK: '--inspect-brk',
  } as const,

  /** Recommended heap snapshot viewer */
  HEAP_VIEWER: 'Safari/WebKit GTK',

  /** Profile directories */
  PROFILE_DIRS: {
    CPU: './profiles',
    HEAP: './heapsnapshots',
  } as const,
} as const;

// =============================================================================
// Watch & Hot Reload Constants
// =============================================================================

export const WATCH = {
  /** Flags */
  FLAGS: {
    WATCH: '--watch',
    HOT: '--hot',
    NO_CLEAR: '--no-clear',
  } as const,

  /** Default debounce delay (ms) */
  DEBOUNCE_MS: 50,
} as const;

// =============================================================================
// Build Constants
// =============================================================================

export const BUILD = {
  /** Define flag prefix */
  DEFINE_PREFIX: '--define',

  /** Loader flag prefix */
  LOADER_PREFIX: '--loader',

  /** Drop targets */
  DROP_TARGETS: ['console', 'debugger'] as const,

  /** Tree shaking annotation */
  PURE_ANNOTATION: '@__PURE__',
} as const;

// =============================================================================
// TypeScript Constants
// =============================================================================

export const TS = {
  /** Default tsconfig location */
  DEFAULT_CONFIG: './tsconfig.json',

  /** Compiler options for Bun */
  BUN_OPTIONS: {
    TARGET: 'ESNext',
    MODULE: 'ESNext',
    LIB: ['ESNext', 'DOM'],
    MODULE_RESOLUTION: 'bundler',
    JSX: 'react-jsx',
    TYPESCRIPT: true,
  } as const,
} as const;

// =============================================================================
// Test Constants
// =============================================================================

export const TEST = {
  /** Preload environment variable */
  PRELOAD_VAR: 'BUN_TEST_SETUP',

  /** Default timeout (ms) */
  DEFAULT_TIMEOUT: 5000,

  /** Coverage thresholds */
  COVERAGE_THRESHOLDS: {
    STATEMENTS: 80,
    BRANCHES: 80,
    FUNCTIONS: 80,
    LINES: 80,
  } as const,
} as const;

// =============================================================================
// Security Constants
// =============================================================================

export const SECURITY = {
  /** Deprecation modes */
  DEPRECATION_MODE: {
    STRICT: 'strict',
    THROW: 'throw',
    WARN: 'warn',
    NONE: 'none',
    WARN_WITH_ERROR_CODE: 'warn-with-error-code',
  } as const,

  /** Buffer zero-fill */
  BUFFER_ZERO_FILL: true,
} as const;

// =============================================================================
// Environment Detection
// =============================================================================

export const ENV = {
  /** Development detection */
  isDevelopment: (): boolean => {
    return process.env.NODE_ENV === 'development' || process.env.BUN_DEV === 'true';
  },

  /** Production detection */
  isProduction: (): boolean => {
    return process.env.NODE_ENV === 'production';
  },

  /** Test detection */
  isTest: (): boolean => {
    return process.env.NODE_ENV === 'test' || process.env.BUN_TEST === 'true';
  },

  /** Get required environment variable */
  getRequired: (key: string): string => {
    const value = process.env[key];
    if (value === undefined) {
      throw new Error(`Required environment variable "${key}" is not set`);
    }
    return value;
  },

  /** Get environment variable with default */
  get: (key: string, defaultValue: string): string => {
    return process.env[key] ?? defaultValue;
  },
} as const;

// =============================================================================
// Version Constants
// =============================================================================

export const VERSION = {
  /** Minimum Bun version */
  MINIMUM_BUN: '1.3.6',

  /** Minimum Node version (for compatibility) */
  MINIMUM_NODE: '18.0.0',

  /** Current Bun version */
  currentBun: (): string => {
    return Bun.version;
  },

  /** Check if Bun version meets minimum */
  satisfiesBun: (minimum = '1.3.6'): boolean => {
    const [major, minor, patch = 0] = minimum.split('.').map(Number);
    const [currentMajor, currentMinor, currentPatch = 0] = Bun.version.split('.').map(Number);

    if (currentMajor > major) return true;
    if (currentMajor < major) return false;
    if (currentMinor > minor) return true;
    if (currentMinor < minor) return false;
    return currentPatch >= patch;
  },
} as const;

// =============================================================================
// Platform Constants
// =============================================================================

export const PLATFORM = {
  /** Current platform */
  current: process.platform,

  /** Current architecture */
  arch: process.arch,

  /** Is Linux */
  isLinux: process.platform === 'linux',

  /** Is macOS */
  isMacOS: process.platform === 'darwin',

  /** Is Windows */
  isWindows: process.platform === 'win32',

  /** CPU count for parallel operations */
  cpuCount: navigator.hardwareConcurrency ?? 4,

  /** Endianness */
  endianness: (() => {
    const buffer = new Uint8Array(4);
    new Uint32Array(buffer.buffer)[0] = 0x12345678;
    return buffer[0] === 0x12 ? 'BE' : 'LE';
  })(),
} as const;

// =============================================================================
// Utility Type Exports
// =============================================================================

export type InstallMode = typeof MODULE.INSTALL_MODE[keyof typeof MODULE.INSTALL_MODE];
export type Target = typeof MODULE.TARGETS[keyof typeof MODULE.TARGETS];
export type DnsOrder = typeof NET.DNS_ORDER[keyof typeof NET.DNS_ORDER];
export type CaStore = typeof NET.CA_STORE[keyof typeof NET.CA_STORE];
export type JsxRuntime = typeof JSX.RUNTIME[keyof typeof JSX.RUNTIME];
export type DeprecationMode = typeof SECURITY.DEPRECATION_MODE[keyof typeof SECURITY.DEPRECATION_MODE];

// =============================================================================
// Re-export Template & Feature Constants
// =============================================================================

export * from './features/compile-time.js';
export * from './templates.js';

// =============================================================================
// Default Exports
// =============================================================================

export default {
  PERF,
  MODULE,
  MEMORY,
  JSX,
  NET,
  CLI,
  DEBUG,
  WATCH,
  BUILD,
  TS,
  TEST,
  SECURITY,
  ENV,
  VERSION,
  PLATFORM,
} as const;
