/**
 * Utils Module - Centralized utilities export
 */

// Logger
export { logger, type Logger, type LogLevel } from './logger';

// Fetch utilities
export { fetchWithDefaults, isPublicHttpUrl, type FetchOptions } from './fetch-utils';

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
  fastHash,
  createStreamingHasher,
  hashPassword,
  verifyPassword,
  type HashAlgorithm,
  type PasswordOptions,
  compressData,
  decompressData,
  type CompressionAlgorithm,
  nanoseconds,
  measure,
  createTimer,
  sleep,
  peekPromise,
  fastWrite,
  fastReadText,
  fastReadJSON,
  streamFile,
  parseSemver,
  compareVersions,
  satisfiesVersion,
  escapeHTML,
  which,
  openInEditor,
  getBunVersion,
  isMainModule,
} from './bun-enhanced';

// Security - Password hashing, HMAC signing, token generation
export {
  PasswordManager,
  RequestSigner,
  FastHash,
  TokenManager,
  createSecurity,
  timingSafeEqual,
  type PasswordConfig,
  type SecurityConfig,
} from './security';

// Circuit Breaker - Resilience pattern for external APIs
export {
  CircuitBreaker,
  CircuitBreakerError,
  CircuitBreakerManager,
  circuitBreakers,
  withCircuitBreaker,
  type CircuitBreakerConfig,
  type CircuitMetrics,
  type CircuitState,
} from './circuit-breaker';

// Rate Limiter - Token bucket & sliding window rate limiting
export {
  RateLimiter,
  MultiTierRateLimiter,
  type RateLimitConfig,
  type RateLimitResult,
  type RateLimitHeaders,
  type RateLimitStrategy,
} from './rate-limiter';

// Structured Logger - Async batching with rotation
export {
  StructuredLogger,
  type LogLevel as StructuredLogLevel,
  type LoggerOptions,
  type LogEntry,
} from './structured-logger';

// Config - Type-safe configuration with schema validation
export {
  ConfigManager,
  s as schema,
  ServerConfigSchema,
  DatabaseConfigSchema,
  RedisConfigSchema,
  AppConfigSchema,
  type ConfigOptions,
  type ConfigSchema,
} from './config-loader';

// Feature Flags - A/B testing and gradual rollouts
export {
  FeatureFlags,
  featureFlags,
  type FeatureFlag,
  type BooleanFlag,
  type GradualRolloutFlag,
  type UserTargetedFlag,
  type TimeBasedFlag,
  type ABTestFlag,
  type FeatureFlagContext,
} from './feature-flags';

// Scheduler - Cron job scheduler with priorities
export {
  Scheduler,
  scheduler,
  type JobOptions,
  type JobPriority,
  type ScheduledJob,
} from './scheduler';

// GraphQL - Schema-first GraphQL with caching
export {
  GraphQLSchema,
  createBarberShopSchema,
  type GraphQLType,
  type GraphQLField,
  type GraphQLResolver,
} from './graphql';