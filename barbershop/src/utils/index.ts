/**
 * Utils Module - Centralized utilities export
 */

// Logger
export { logger, Logger, LogLevel } from './logger';

// Fetch utilities
export { fetchWithDefaults, isPublicHttpUrl, type FetchOptions } from './fetch-utils';

// Crypto utilities
export { checkCrypto } from './check-crypto';

// CLI Table
export {
  generateTable,
  printTable,
  ColumnTypes,
  formatStatus,
  getDisplayWidth,
  padUnicode,
  truncateUnicode,
  wrapText,
  type TableOptions,
  type TableColumn,
  type TableRow,
  type StatusType,
} from './cli-table';

// WebAssembly Table
export {
  WASMMachine,
  createDefaultMachine,
  DefaultHooks,
  type ComputeHook,
  type TableConfig,
  type HookEntry,
  type HookRegistry,
} from './wasm-table';

// Cookie Management with Compression
export {
  CookieManager,
  cookieManager,
  createSessionCookie,
  createTelemetryCookie,
  parseTelemetryCookie,
  type CookieOptions,
  type CompressedCookie,
  type TelemetryData,
  type TelemetryEvent,
} from './cookie-manager';

// Header Compression
export {
  HeaderCompressor,
  headerCompressor,
  compressRequestHeaders,
  decompressResponseHeaders,
  type CompressedHeaders,
  type TelemetryHeaders,
  type ConformanceHeaders,
} from './header-compression';

// Bun-Enhanced Utilities
export {
  // Hashing
  fastHash,
  createStreamingHasher,
  hashPassword,
  verifyPassword,
  type HashAlgorithm,
  type PasswordOptions,
  // Compression
  compressData,
  decompressData,
  type CompressionAlgorithm,
  // Timing
  nanoseconds,
  measure,
  createTimer,
  sleep,
  peekPromise,
  // File I/O
  fastWrite,
  fastReadText,
  fastReadJSON,
  streamFile,
  // Semver
  parseSemver,
  compareVersions,
  satisfiesVersion,
  // HTML
  escapeHTML,
  // System
  which,
  openInEditor,
  getBunVersion,
  isMainModule,
} from './bun-enhanced';
