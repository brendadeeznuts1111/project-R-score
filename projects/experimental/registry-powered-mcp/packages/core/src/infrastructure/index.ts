/**
 * Infrastructure Module - Golden Matrix v1.3.3
 *
 * Zero-Cost Infrastructure Monitoring with 59 Components:
 * - Components #1-41: Core Golden Matrix
 * - Component #42: Unicode-StringWidth-Engine
 * - Component #43: V8-Type-Checking-API
 * - Component #44: YAML-1.2-Parser
 * - Component #45: Security-Hardening-Layer
 * - Components #46-54: v2.4.2 Expansion
 * - Component #55: CompressionStream-Engine (v1.3.3)
 * - Component #56: Standalone-Config-Controller (v1.3.3)
 * - Component #57: Flaky-Test-Resilience-Engine (v1.3.3)
 * - Component #58: SQLite-3.51.0-Engine (v1.3.3)
 * - Component #59: Zig-0.15.2-Build-Optimizer (v1.3.3)
 * - Component #56b: ConfigVersion-Stabilizer (v1.3.3 pkg-mgr)
 * - Component #57b: CPU-Profiler-Engine (v1.3.3 pkg-mgr)
 * - Component #58b: OnTestFinished-Finalizer (v1.3.3 pkg-mgr)
 * - Component #59b: WebSocket-Subscription-Tracker (v1.3.3 pkg-mgr)
 * - Component #60: Git-Dependency-Security-Layer (v1.3.3 pkg-mgr)
 * - Component #61: SpawnSync-Isolated-Loop (v1.3.3 pkg-mgr)
 * - Component #62: Bun-List-Alias (v1.3.3 pkg-mgr)
 * - Component #63: Config-Loading-Patch (v1.3.3 pkg-mgr)
 * - Component #64: Hoisted-Install-Restorer (v1.3.3 pkg-mgr)
 *
 * | Infrastructure ID | Logic Tier | Resource Tax | Parity Lock | Status |
 * |:------------------|:-----------|:-------------|:------------|:-------|
 * | **Infrastructure-Status** | **Level 2: Audit** | `CPU: <0.5%` | `sha256-...` | **ACTIVE** |
 *
 * Endpoints:
 * - GET /mcp/infrastructure/status   - Full Golden Matrix status
 * - GET /mcp/infrastructure/health   - Aggregated health summary
 * - GET /mcp/infrastructure/metrics  - Performance metrics
 * - GET /mcp/infrastructure/components - All components
 * - GET /mcp/infrastructure/component/:id - Individual component health
 *
 * @module infrastructure
 */

// Types
export {
  // Enums
  ComponentStatus,
  LogicTier,

  // Interfaces
  type InfrastructureComponent,
  type InfrastructureHealth,
  type InfrastructureMetrics,
  type InfrastructureStatus,
  type ComponentHealthResult,
  type InfrastructureMessage,
  type InfrastructureMessageType,
  type StatusCollectorConfig,
  type ResourceTax,
  type ResourceCategory,

  // Constants
  DEFAULT_STATUS_COLLECTOR_CONFIG,
  TIER_LABELS,
  STATUS_COLORS,

  // Type guards
  isValidComponentStatus,
  isValidLogicTier,
  isOperational,
  isDegraded,
  isFailed,
} from './types';

// Status Collector
export {
  InfrastructureStatusCollector,
  getStatusCollector,
  resetStatusCollector,
  createInfrastructureHandlers,
  recordRequest,
} from './status-collector';

// Component #42: Unicode StringWidth Engine
export {
  UnicodeStringWidthEngine,
  stringWidth,
  stripAnsi,
  hasAnsi,
  hasEmoji,
} from './stringwidth-engine';

// Component #43: V8 Type Checking Bridge
export {
  V8TypeCheckingBridge,
  isMap,
  isSet,
  isArray,
  isInt32,
  isUint32,
  isBigInt,
  isBoolean,
  isString,
  isSymbol,
  isFunction,
  isObject,
  isNull,
  isUndefined,
  isNullOrUndefined,
  isDate,
  isRegExp,
  isPromise,
  isTypedArray,
  isArrayBuffer,
  isSharedArrayBuffer,
  isDataView,
  isWeakMap,
  isWeakSet,
  isNumber,
  isFiniteNumber,
  registerTypeChecks,
  getTypeChecks,
} from './v8-type-bridge';

// Component #44: YAML 1.2 Strict Parser
export {
  YAML12StrictParser,
  parseBoolean,
  parseNull,
  parseNumber,
  parseScalar,
  parseConfig,
  validateConfig as validateYamlConfig,
  isAmbiguousBoolean,
  type ParsedValue,
  type ParsedObject,
  type ParsedArray,
} from './yaml-1-2-parser';

// Component #45: Security Hardening Layer
export {
  SecurityHardeningLayer,
  validateTrustedDependency,
  createIsolatedContext,
  validateBunfigConfig,
  timingSafeEqual,
  isDangerousGlobal,
  auditGlobalExposure,
  sanitizeError,
  type SecurityValidationResult,
  type TrustedDependencyResult,
  type IsolatedContextOptions,
} from './security-hardening-layer';

// Golden Matrix v2.4.2 Integration
export {
  MATRIX_VERSION,
  V242_COMPONENTS,
  INFRASTRUCTURE_MATRIX,
  getV242Features,
  getMatrixStatistics,
  validateV242Components,
  getV242Component,
  formatMatrixReport,
  exportMatrix,
  type MatrixStatistics,
  type V242Features,
} from './golden-matrix-v2-4-2';

// Component #46: URLPattern API Engine
export {
  URLPatternEngine,
  compile as compilePattern,
  match as matchPattern,
  test as testPattern,
  compileAll as compileAllPatterns,
  createPatternRouter,
  type CompiledPattern,
  type PatternMatchResult,
} from './urlpattern-engine';

// Component #47: Fake Timers Engine
export {
  FakeTimersEngine,
  jest as jestTimers,
  withFakeTimers,
  type FakeTimersOptions,
} from './fake-timers-engine';

// Component #48: Custom Proxy Headers
export {
  ProxyHeadersHandler,
  createProxyConfig,
  setAuthHeader as setProxyAuthHeader,
  sanitizeHeaders as sanitizeProxyHeaders,
  parseProxyUrl,
  type ProxyConfig,
  type ProxyAuthOptions,
  type SanitizationResult,
} from './proxy-headers-handler';

// Component #49: HttpAgent Connection Pool
export {
  HttpAgentConnectionPool,
  getConnectionPool,
  resetConnectionPool,
  createAgent,
  type ConnectionPoolConfig,
  type ConnectionStats,
} from './httpagent-connection-pool';

// Component #50: Standalone Executable Optimizer
export {
  StandaloneExecutableOptimizer,
  BUILD_OPTIONS,
  buildExecutable,
  compileStandalone,
  getRecommendedConfig,
  analyzeBundleSize,
  type StandaloneBuildConfig,
  type AutoloadConfig,
  type BuildResult,
} from './standalone-executable-config';

// Component #51: Console JSON Formatter
export {
  ConsoleJSONFormatter,
  formatLog,
  logAudit,
  logEndpointAccess,
  logComponentHealth,
  enableFormatting,
  disableFormatting,
  prettyPrint,
  type LogLevel,
  type LogEntry,
} from './console-json-formatter';

// Component #52: SQLite 3.51.1 Engine
export {
  SQLite3511Engine,
  createDatabase,
  createMemoryDatabase,
  executeOptimizedQuery,
  type SQLiteConfig,
  type QueryOptimizationResult,
  type QueryStats,
} from './sqlite-3-51-1-engine';

// Component #53: CVE Hardening Layer
export {
  CVEHardeningLayer,
  validatePackageSource,
  createIsolatedSandbox,
  validateBunfigSecurity,
  getActiveMitigations,
  isCVEMitigated,
  sanitizeError as sanitizeCVEError,
  timingSafeEqual as cveTimingSafeEqual,
  type CVEMitigationResult,
  type PackageValidationResult,
  type SandboxConfig,
} from './cve-hardening-layer';

// Component #54: Node.js Compatibility Bridge
export {
  NodeJSCompatBridge,
  hexSlice,
  napiTypeof,
  getTypeInfo,
  deepStrictEqual,
  isSessionReused,
  bufferCompare,
  bufferEquals,
  hrtimeBigint,
  hrtime,
  inspect,
  installGlobalShims,
  type TypeCheckResult,
} from './nodejs-compat-bridge';

// ============================================================================
// Bun v1.3.3 Infrastructure Components (#55-59)
// ============================================================================

// Component #55: CompressionStream Engine
export {
  CompressionStreamEngine,
  createCompressionStream,
  createDecompressionStream,
  compressFile,
  compress,
  decompress,
  compressPackage,
  decompressPackageStream,
  isFormatSupported,
  type CompressionFormat,
  type CompressionOptions,
  type CompressionResult,
} from './compression-stream-engine';

// Component #56: Standalone Config Controller
export {
  StandaloneConfigController,
  BUILD_OPTIONS as STANDALONE_BUILD_OPTIONS,
  parseEnv,
  parseBunfig,
  loadEnvFile,
  loadBunfigFile,
  createEmbeddedConfig,
  generateDefines,
  buildDeterministicExecutable,
  calculateParityHash,
  verifyDeterminism,
  getEmbeddedConfig,
  isStandaloneBuild,
  type StandaloneBuildOptions,
  type EmbeddedConfig,
  type BuildResult as StandaloneBuildResult,
} from './standalone-config-controller';

// Component #57: Flaky Test Resilience Engine
export {
  FlakyTestResilienceEngine,
  calculateRetryDelay,
  executeWithRetry,
  executeWithRepeat,
  withRetry,
  withRepeat,
  parseCliArgs,
  isFlakyTest,
  calculateFlakinessScore,
  createIsolationContext as createTestIsolationContext,
  executeWithIsolation,
  type RetryConfig,
  type RepeatConfig,
  type TestExecutionResult,
  type RepeatExecutionResult,
  type TestFn,
} from './flaky-test-resilience-engine';

// Component #58: SQLite 3.51.0 Engine
export {
  SQLite3510Engine,
  getCacheKey,
  isStatementCached,
  getStatementMetadata,
  cacheStatement,
  clearCache,
  analyzeQuery,
  suggestIndexes,
  buildPragmas,
  getStats as getSQLiteStats,
  resetStats as resetSQLiteStats,
  validateQuery,
  estimateQueryTime,
  type DatabaseConfig,
  type QueryResult,
  type StatementMetadata,
  type QueryPlan,
  type DatabaseStats,
} from './sqlite-3-51-0-engine';

// Component #59: Zig 0.15.2 Build Optimizer
export {
  Zig0152BuildOptimizer,
  getBuildFlags,
  estimateSizeReduction,
  analyzeBinarySize,
  getPGOInstrumentFlags,
  getPGOOptimizeFlags,
  parsePGOProfile,
  getDCEConfig,
  calculateMetrics,
  getAvailableTargets,
  validateBuildConfig,
  formatMetrics,
  getRecommendedConfig as getZigRecommendedConfig,
  type BuildTarget,
  type OptimizationLevel,
  type BuildConfig as ZigBuildConfig,
  type BuildMetrics,
  type PGOProfile,
  type SizeAnalysis,
} from './zig-0-15-2-build-optimizer';

// Golden Matrix v1.3.3 Integration
export {
  MATRIX_VERSION as V133_MATRIX_VERSION,
  BUN_VERSION_REQUIREMENT,
  V133_COMPONENTS,
  INFRASTRUCTURE_MATRIX as V133_INFRASTRUCTURE_MATRIX,
  PERFORMANCE_TARGETS as V133_PERFORMANCE_TARGETS,
  getMatrixStats,
  getEnabledV133Features,
  validateComponents as validateV133Components,
  getComponentById,
  getComponentsByTier,
  isCompressionAvailable,
  isStandaloneBuildAvailable,
  isTestResilienceAvailable,
  isSQLiteOptimized,
  isBuildOptimized,
  performHealthCheck,
  type ComponentDefinition,
  type MatrixStats,
  type ComponentStatus as V133ComponentStatus,
  type LogicTier as V133LogicTier,
} from './golden-matrix-v1-3-3';

// ============================================================================
// Bun v1.3.3 Package Manager & Stability Components (#56-64 expansion)
// ============================================================================

// Component #56b: ConfigVersion Stabilizer
export {
  ConfigVersionStabilizer,
  initializeLockfile,
  getDefaultLinker,
  getConfigVersion,
  hasWorkspaces as hasWorkspacesConfig,
  CONFIG_VERSIONS,
  type ConfigVersion,
  type LockfileConfig,
  type StabilizationResult,
} from './configversion-stabilizer';

// Component #57b: CPU Profiler Engine
export {
  CPUProfilerEngine,
  startCPUProfiler,
  stopCPUProfiler,
  isProfilerActive,
  getSampleCount,
  cpuProfCLIHelper,
  type CPUProfileOptions,
  type CPUProfile,
} from './cpu-profiler-engine';

// Component #58b: OnTestFinished Finalizer
export {
  OnTestFinishedFinalizer,
  onTestFinished,
  withFinalizers as testWithFinalizers,
  finalized,
  enforceSerial,
  registerFinalizer,
  runFinalizers,
  type FinalizerCallback,
  type FinalizerResult,
} from './ontestfinished-finalizer';

// Component #59b: WebSocket Subscription Tracker
export {
  WebSocketSubscriptionTracker,
  upgradeConnection,
  subscribe as wsSubscribe,
  unsubscribe as wsUnsubscribe,
  getSubscriptions,
  handleClose as wsHandleClose,
  type TrackedWebSocketData,
  type TrackedWebSocket,
  type SubscriptionEvent,
} from './websocket-subscription-tracker';

// Component #60: Git Dependency Security Layer
export {
  GitDependencySecurityLayer,
  resolveGitDependency,
  validateGitHubShorthand,
  validateGitUrl,
  fetchGitHubTarball,
  isGitHubDependency,
  parseGitHubShorthand,
  KNOWN_PROTOCOLS,
  type ResolvedGitDependency,
  type GitHubTarballResult,
  type KnownProtocol,
} from './git-dependency-security-layer';

// Component #61: SpawnSync Isolated Loop
export {
  SpawnSyncIsolatedLoop,
  spawnSync,
  execSync,
  testTimeoutReliability,
  verifyWindowsIsolation,
  getSpawnStats,
  type SpawnSyncOptions,
  type SpawnSyncResult,
  type ExecSyncOptions,
} from './spawnsync-isolated-loop';

// Component #62: Bun List Alias
export {
  BunListAlias,
  executeAlias,
  resolveAlias,
  isAlias,
  getAliases,
  getAliasUsageStats,
  ALIAS_COMMANDS,
  type AliasCommand,
  type ParsedCommand,
  type AliasResult,
} from './bun-list-alias';

// Component #63: Config Loading Patch
export {
  ConfigLoadingPatch,
  loadConfig,
  isConfigLoaded,
  getCachedConfig,
  invalidateConfig,
  clearConfigCache,
  getConfigStats,
  type ConfigLoadResult,
} from './config-loading-patch';

// Component #64: Hoisted Install Restorer
export {
  HoistedInstallRestorer,
  restoreForExistingWorkspace,
  detectProject,
  hasWorkspaces as hasWorkspacesHoisted,
  getCurrentLinker,
  getRestorationStats,
  type RestorationResult,
  type ProjectDetection,
} from './hoisted-install-restorer';
