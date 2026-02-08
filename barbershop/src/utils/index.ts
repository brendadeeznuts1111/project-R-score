/**
 * Utils Module - Centralized utilities export
 */

// Logger
export { logger, type Logger, type LogLevel } from './logger';

// Fetch utilities
export { fetchWithDefaults, isPublicHttpUrl, type FetchOptions } from './fetch-utils';

// Crypto utilities (script only, no exports)
// check-crypto.ts is a diagnostic script: bun run src/utils/check-crypto.ts

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

// ═══════════════════════════════════════════════════════════════════════════════
// ELITE MODULES - Production-grade utilities with Bun-native APIs
// ═══════════════════════════════════════════════════════════════════════════════

// Elite Security - Password hashing, HMAC signing, token generation
export {
  ElitePasswordManager,
  EliteRequestSigner,
  EliteFastHash,
  EliteTokenManager,
  createEliteSecurity,
  timingSafeEqual,
  type PasswordConfig,
  type HashAlgorithm,
  type SecurityConfig,
} from './elite-security';

// Elite Circuit Breaker - Resilience pattern for external APIs
export {
  EliteCircuitBreaker,
  CircuitBreakerError,
  CircuitBreakerManager,
  circuitBreakers,
  withCircuitBreaker,
  type CircuitBreakerConfig,
  type CircuitMetrics,
  type CircuitState,
} from './elite-circuit-breaker';

// Elite Rate Limiter - Token bucket & sliding window rate limiting
export {
  EliteRateLimiter,
  MultiTierRateLimiter,
  type RateLimitConfig,
  type RateLimitResult,
  type RateLimitHeaders,
  type RateLimitStrategy,
} from './elite-rate-limiter';

// Elite Logger - Structured logging with async batching
export {
  EliteLogger,
  LogLevel as EliteLogLevel,
  type LoggerOptions as EliteLoggerOptions,
  type LogEntry as EliteLogEntry,
} from './elite-logger';

// Elite Config - Type-safe configuration with schema validation
export {
  EliteConfigManager,
  s as schema,
  ServerConfigSchema,
  DatabaseConfigSchema,
  RedisConfigSchema,
  AppConfigSchema,
  type ConfigOptions,
  type ConfigSchema,
} from './elite-config';

// Elite Feature Flags - A/B testing and gradual rollouts
export {
  EliteFeatureFlags,
  featureFlags,
  type FeatureFlag,
  type BooleanFlag,
  type GradualRolloutFlag,
  type UserTargetedFlag,
  type TimeBasedFlag,
  type ABTestFlag,
  type FeatureFlagContext,
} from './elite-flags';

// Elite Scheduler - Cron job scheduler with priorities
export {
  EliteScheduler,
  scheduler,
  type JobOptions,
  type JobPriority,
  type ScheduledJob,
} from './elite-scheduler';

// Elite GraphQL - Schema-first GraphQL with caching
export {
  EliteGraphQLSchema,
  createBarberShopSchema,
  type GraphQLType,
  type GraphQLField,
  type GraphQLResolver,
} from './elite-graphql';
