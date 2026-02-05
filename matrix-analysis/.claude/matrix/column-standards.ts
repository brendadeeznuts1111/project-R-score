/**
 * Tier-1380 OMEGA: Column Standards & Base Context
 *
 * Standardized metadata system for 78-column matrix
 * Provides type safety, validation, and documentation for all columns
 *
 * @module column-standards
 * @tier 1380-OMEGA
 */

// ============================================================================
// Base Types & Interfaces
// ============================================================================

/**
 * Standard column metadata - every column must implement this
 */
export interface BaseColumn {
	/** Column index (1-95) */
	index: number;

	/** Machine-readable identifier (snake_case) */
	id: string;

	/** Human-readable display name */
	displayName: string;

	/** Column category/group */
	category: ColumnCategory;

	/** Value type for type safety */
	type: ColumnType;

	/** Default value if not set */
	defaultValue: unknown;

	/** Whether this column is required */
	required: boolean;

	/** Description of what this column tracks */
	description: string;

	/** Related Bun version that introduced this capability */
	bunVersion: string;

	/** Validation function */
	validate?: (value: unknown) => boolean;
}

/**
 * Column categories for grouping
 */
export type ColumnCategory =
	| "core" // Core runtime (1-10)
	| "security" // Security & secrets (11-20)
	| "storage" // Storage & persistence (21-30)
	| "compute" // Compute & performance (31-40)
	| "protocol" // Protocol & transport (41-50)
	| "hardware" // Hardware acceleration (51-55, 81-88)
	| "audit" // Audit & compliance (56-60, 80)
	| "environment" // Bun environment variables (61-70)
	| "database" // Bun SQL behaviors (71-72)
	| "serialization" // JSON serialization (73-75)
	| "shell" // Bun Shell API (76-78)
	| "testing" // Test runner features (79)
	| "skills"; // Skills compliance (89-95)

/**
 * Column value types
 */
export type ColumnType =
	| "string"
	| "number"
	| "bigint"
	| "boolean"
	| "timestamp"
	| "hex"
	| "uuid"
	| "json"
	| "enum";

/**
 * Column context - the complete state of all 70 columns
 */
export interface ColumnContext {
	/** Matrix version */
	version: string;

	/** When this context was created */
	timestamp: bigint;

	/** Bun version that generated this context */
	bunVersion: string;

	/** All 78 columns */
	columns: Record<string, ColumnValue>;

	/** Metadata about the run */
	meta: MatrixMeta;
}

/**
 * Individual column value with metadata
 */
export interface ColumnValue {
	/** The actual value */
	value: unknown;

	/** When this value was set */
	setAt: bigint;

	/** Source of this value (test, probe, manual) */
	source: ValueSource;

	/** Validation status */
	valid: boolean;

	/** Optional error message if invalid */
	error?: string;
}

/**
 * Sources of column values
 */
export type ValueSource = "test" | "probe" | "manual" | "inherited" | "computed";

/**
 * Matrix run metadata
 */
export interface MatrixMeta {
	/** Run identifier */
	runId: string;

	/** Environment (staging/production) */
	environment: string;

	/** Commit SHA */
	commit: string;

	/** Host platform */
	platform: string;

	/** Architecture */
	arch: string;

	/** Optional description */
	description?: string;
}

// ============================================================================
// Base Column Definitions (Standards)
// ============================================================================

/**
 * Standards for all Tier-1380 columns
 * These are the base definitions that all matrix entries must follow
 */
export const COLUMN_STANDARDS: Record<string, BaseColumn> = {
	// ==========================================================================
	// CORE RUNTIME (1-10)
	// ==========================================================================
	col_01_runtime_version: {
		index: 1,
		id: "runtime_version",
		displayName: "Runtime Version",
		category: "core",
		type: "string",
		defaultValue: "unknown",
		required: true,
		description: "Bun runtime version (e.g., 1.3.7)",
		bunVersion: "1.0.0",
		validate: (v) => typeof v === "string" && /^\d+\.\d+\.\d+/.test(v as string),
	},

	col_02_engine_mode: {
		index: 2,
		id: "engine_mode",
		displayName: "Engine Mode",
		category: "core",
		type: "enum",
		defaultValue: "standard",
		required: true,
		description: "JavaScript engine mode (standard/strict/fast)",
		bunVersion: "1.0.0",
	},

	col_03_gc_strategy: {
		index: 3,
		id: "gc_strategy",
		displayName: "GC Strategy",
		category: "core",
		type: "enum",
		defaultValue: "generational",
		required: true,
		description: "Garbage collection strategy",
		bunVersion: "1.0.0",
	},

	col_04_module_system: {
		index: 4,
		id: "module_system",
		displayName: "Module System",
		category: "core",
		type: "enum",
		defaultValue: "esm",
		required: true,
		description: "Module system (esm/cjs/both)",
		bunVersion: "1.0.0",
	},

	col_05_target_platform: {
		index: 5,
		id: "target_platform",
		displayName: "Target Platform",
		category: "core",
		type: "enum",
		defaultValue: "bun",
		required: true,
		description: "Target platform (bun/node/bun-darwin-arm64/etc)",
		bunVersion: "1.0.0",
	},

	col_06_ansi_wrapping: {
		index: 6,
		id: "ansi_wrapping",
		displayName: "ANSI Wrapping",
		category: "core",
		type: "boolean",
		defaultValue: true,
		required: true,
		description: "Bun.wrapAnsi ANSI-aware text wrapping enabled",
		bunVersion: "1.3.7",
	},

	col_07_sourcemap_mode: {
		index: 7,
		id: "sourcemap_mode",
		displayName: "Source Map Mode",
		category: "core",
		type: "enum",
		defaultValue: "none",
		required: true,
		description: "Source map generation (inline/external/hidden/none)",
		bunVersion: "1.0.0",
	},

	col_08_typescript_mode: {
		index: 8,
		id: "typescript_mode",
		displayName: "TypeScript Mode",
		category: "core",
		type: "enum",
		defaultValue: "strip",
		required: true,
		description: "TypeScript handling (strip/transpile/none)",
		bunVersion: "1.0.0",
	},

	col_09_hot_reload: {
		index: 9,
		id: "hot_reload",
		displayName: "Hot Reload",
		category: "core",
		type: "boolean",
		defaultValue: false,
		required: true,
		description: "Hot module reloading enabled",
		bunVersion: "1.0.0",
	},

	col_10_macro_enabled: {
		index: 10,
		id: "macro_enabled",
		displayName: "Macro Enabled",
		category: "core",
		type: "boolean",
		defaultValue: false,
		required: true,
		description: "Bun macros enabled for compile-time execution",
		bunVersion: "1.0.0",
	},

	// ==========================================================================
	// SECURITY (11-20)
	// ==========================================================================
	col_11_secrets_engine: {
		index: 11,
		id: "secrets_engine",
		displayName: "Secrets Engine",
		category: "security",
		type: "string",
		defaultValue: "none",
		required: true,
		description: "Secrets management engine (bun-native-v1.3.7/env/none)",
		bunVersion: "1.3.7",
	},

	col_12_secret_redaction: {
		index: 12,
		id: "secret_redaction",
		displayName: "Secret Redaction",
		category: "security",
		type: "enum",
		defaultValue: "off",
		required: true,
		description: "Automatic secret redaction in logs (auto/off)",
		bunVersion: "1.3.7",
	},

	col_13_secret_propagation: {
		index: 13,
		id: "secret_propagation",
		displayName: "Secret Propagation",
		category: "security",
		type: "enum",
		defaultValue: "none",
		required: true,
		description: "How secrets propagate to children (inherit/none)",
		bunVersion: "1.3.7",
	},

	col_14_secrets_verified: {
		index: 14,
		id: "secrets_verified",
		displayName: "Secrets Verified",
		category: "security",
		type: "timestamp",
		defaultValue: 0n,
		required: false,
		description: "Timestamp of last secrets audit",
		bunVersion: "1.3.7",
	},

	col_15_csrf_protection: {
		index: 15,
		id: "csrf_protection",
		displayName: "CSRF Protection",
		category: "security",
		type: "boolean",
		defaultValue: false,
		required: true,
		description: "CSRF token validation enabled",
		bunVersion: "1.1.0",
	},

	col_16_tls_version: {
		index: 16,
		id: "tls_version",
		displayName: "TLS Version",
		category: "security",
		type: "enum",
		defaultValue: "1.3",
		required: true,
		description: "TLS protocol version (1.2/1.3/none)",
		bunVersion: "1.0.0",
	},

	col_17_cert_pinning: {
		index: 17,
		id: "cert_pinning",
		displayName: "Certificate Pinning",
		category: "security",
		type: "boolean",
		defaultValue: false,
		required: true,
		description: "Certificate pinning enabled for HTTPS connections",
		bunVersion: "1.2.0",
	},

	col_18_csp_hash: {
		index: 18,
		id: "csp_hash",
		displayName: "CSP Hash",
		category: "security",
		type: "hex",
		defaultValue: "0x0",
		required: false,
		description: "Content-Security-Policy integrity hash",
		bunVersion: "1.1.0",
	},

	col_19_cors_mode: {
		index: 19,
		id: "cors_mode",
		displayName: "CORS Mode",
		category: "security",
		type: "enum",
		defaultValue: "none",
		required: true,
		description: "CORS handling mode (permissive/strict/none)",
		bunVersion: "1.0.0",
	},

	col_20_env_isolation: {
		index: 20,
		id: "env_isolation",
		displayName: "Env Isolation",
		category: "security",
		type: "enum",
		defaultValue: "shared",
		required: true,
		description: "Environment variable isolation level (shared/worker/strict)",
		bunVersion: "1.0.0",
	},

	// ==========================================================================
	// STORAGE (21-30)
	// ==========================================================================
	col_21_storage_backend: {
		index: 21,
		id: "storage_backend",
		displayName: "Storage Backend",
		category: "storage",
		type: "enum",
		defaultValue: "none",
		required: true,
		description: "Primary storage backend (r2/s3/sqlite/none)",
		bunVersion: "1.0.0",
	},

	col_22_r2_region: {
		index: 22,
		id: "r2_region",
		displayName: "R2 Region",
		category: "storage",
		type: "string",
		defaultValue: "auto",
		required: false,
		description: "R2/S3 region (auto/us-east-1/etc)",
		bunVersion: "1.0.0",
	},

	col_23_content_encoding: {
		index: 23,
		id: "content_encoding",
		displayName: "Content Encoding",
		category: "storage",
		type: "enum",
		defaultValue: "identity",
		required: true,
		description: "Content encoding (gzip/br/zstd/identity)",
		bunVersion: "1.3.0",
	},

	col_24_content_disposition: {
		index: 24,
		id: "content_disposition",
		displayName: "Content Disposition",
		category: "storage",
		type: "enum",
		defaultValue: "inline",
		required: true,
		description: "Content disposition (inline/attachment)",
		bunVersion: "1.3.0",
	},

	col_25_cache_backend: {
		index: 25,
		id: "cache_backend",
		displayName: "Cache Backend",
		category: "storage",
		type: "enum",
		defaultValue: "none",
		required: true,
		description: "Cache storage backend (memory/disk/r2/none)",
		bunVersion: "1.0.0",
	},

	col_26_cache_ttl_sec: {
		index: 26,
		id: "cache_ttl_sec",
		displayName: "Cache TTL (sec)",
		category: "storage",
		type: "number",
		defaultValue: 0,
		required: false,
		description: "Cache time-to-live in seconds",
		bunVersion: "1.0.0",
		validate: (v) => typeof v === "number" && v >= 0,
	},

	col_27_sqlite_wal_mode: {
		index: 27,
		id: "sqlite_wal_mode",
		displayName: "SQLite WAL Mode",
		category: "storage",
		type: "boolean",
		defaultValue: false,
		required: true,
		description: "SQLite write-ahead logging mode enabled",
		bunVersion: "1.0.0",
	},

	col_28_sqlite_page_size: {
		index: 28,
		id: "sqlite_page_size",
		displayName: "SQLite Page Size",
		category: "storage",
		type: "number",
		defaultValue: 4096,
		required: false,
		description: "SQLite page size in bytes",
		bunVersion: "1.0.0",
		validate: (v) => typeof v === "number" && v > 0,
	},

	col_29_blob_max_bytes: {
		index: 29,
		id: "blob_max_bytes",
		displayName: "Blob Max Size",
		category: "storage",
		type: "number",
		defaultValue: 0,
		required: false,
		description: "Maximum blob size in bytes (0 = unlimited)",
		bunVersion: "1.2.0",
		validate: (v) => typeof v === "number" && v >= 0,
	},

	col_30_persistence_mode: {
		index: 30,
		id: "persistence_mode",
		displayName: "Persistence Mode",
		category: "storage",
		type: "enum",
		defaultValue: "sync",
		required: true,
		description: "Persistence strategy (sync/async/lazy/none)",
		bunVersion: "1.0.0",
	},

	// ==========================================================================
	// COMPUTE (31-40)
	// ==========================================================================
	col_31_crc32_throughput: {
		index: 31,
		id: "crc32_throughput",
		displayName: "CRC32 Throughput",
		category: "compute",
		type: "number",
		defaultValue: 0,
		required: false,
		description: "CRC32 throughput in MB/s",
		bunVersion: "1.3.7",
		validate: (v) => typeof v === "number" && v >= 0,
	},

	col_32_json_stringify_perf: {
		index: 32,
		id: "json_stringify_perf",
		displayName: "JSON Stringify Performance",
		category: "compute",
		type: "number",
		defaultValue: 0,
		required: false,
		description: "JSON stringify ops/sec",
		bunVersion: "1.3.7",
	},

	col_33_simd_enabled: {
		index: 33,
		id: "simd_enabled",
		displayName: "SIMD Enabled",
		category: "compute",
		type: "boolean",
		defaultValue: false,
		required: true,
		description: "SIMD instructions available and used",
		bunVersion: "1.3.0",
	},

	col_34_jit_tier: {
		index: 34,
		id: "jit_tier",
		displayName: "JIT Tier",
		category: "compute",
		type: "enum",
		defaultValue: "baseline",
		required: true,
		description: "JIT compilation tier (llint/baseline/dfg/ftl)",
		bunVersion: "1.0.0",
	},

	col_35_buffer_pool_kb: {
		index: 35,
		id: "buffer_pool_kb",
		displayName: "Buffer Pool (KB)",
		category: "compute",
		type: "number",
		defaultValue: 0,
		required: false,
		description: "Buffer pool size in kilobytes",
		bunVersion: "1.0.0",
		validate: (v) => typeof v === "number" && v >= 0,
	},

	col_36_worker_count: {
		index: 36,
		id: "worker_count",
		displayName: "Worker Count",
		category: "compute",
		type: "number",
		defaultValue: 0,
		required: false,
		description: "Active worker thread count",
		bunVersion: "1.0.0",
		validate: (v) => typeof v === "number" && v >= 0,
	},

	col_37_ffi_enabled: {
		index: 37,
		id: "ffi_enabled",
		displayName: "FFI Enabled",
		category: "compute",
		type: "boolean",
		defaultValue: false,
		required: true,
		description: "Foreign function interface enabled (bun:ffi)",
		bunVersion: "1.0.0",
	},

	col_38_wasm_enabled: {
		index: 38,
		id: "wasm_enabled",
		displayName: "WASM Enabled",
		category: "compute",
		type: "boolean",
		defaultValue: false,
		required: true,
		description: "WebAssembly module execution enabled",
		bunVersion: "1.0.0",
	},

	col_39_napi_version: {
		index: 39,
		id: "napi_version",
		displayName: "N-API Version",
		category: "compute",
		type: "number",
		defaultValue: 0,
		required: false,
		description: "N-API compatibility version (0 = unused)",
		bunVersion: "1.0.0",
		validate: (v) => typeof v === "number" && v >= 0,
	},

	col_40_event_loop_lag_ms: {
		index: 40,
		id: "event_loop_lag_ms",
		displayName: "Event Loop Lag (ms)",
		category: "compute",
		type: "number",
		defaultValue: 0,
		required: false,
		description: "Event loop lag in milliseconds",
		bunVersion: "1.0.0",
		validate: (v) => typeof v === "number" && v >= 0,
	},

	// ==========================================================================
	// PROTOCOL (41-50)
	// ==========================================================================
	col_41_osc8_links: {
		index: 41,
		id: "osc8_links",
		displayName: "OSC 8 Links",
		category: "protocol",
		type: "boolean",
		defaultValue: false,
		required: true,
		description: "OSC 8 hyperlink support enabled",
		bunVersion: "1.2.0",
	},

	col_42_case_preserved_headers: {
		index: 42,
		id: "case_preserved_headers",
		displayName: "Case-Preserved Headers",
		category: "protocol",
		type: "boolean",
		defaultValue: true,
		required: true,
		description: "HTTP header case preservation",
		bunVersion: "1.3.0",
	},

	col_43_http2_enabled: {
		index: 43,
		id: "http2_enabled",
		displayName: "HTTP/2 Enabled",
		category: "protocol",
		type: "boolean",
		defaultValue: true,
		required: true,
		description: "HTTP/2 protocol support",
		bunVersion: "1.2.0",
	},

	col_44_websocket_version: {
		index: 44,
		id: "websocket_version",
		displayName: "WebSocket Version",
		category: "protocol",
		type: "string",
		defaultValue: "13",
		required: true,
		description: "WebSocket protocol version",
		bunVersion: "1.0.0",
	},

	col_45_ipc_enabled: {
		index: 45,
		id: "ipc_enabled",
		displayName: "IPC Enabled",
		category: "protocol",
		type: "boolean",
		defaultValue: false,
		required: true,
		description: "Inter-process communication enabled",
		bunVersion: "1.0.0",
	},

	col_46_unix_socket: {
		index: 46,
		id: "unix_socket",
		displayName: "Unix Socket",
		category: "protocol",
		type: "boolean",
		defaultValue: false,
		required: true,
		description: "Unix domain socket transport enabled",
		bunVersion: "1.0.0",
	},

	col_47_dns_prefetch: {
		index: 47,
		id: "dns_prefetch",
		displayName: "DNS Prefetch",
		category: "protocol",
		type: "boolean",
		defaultValue: false,
		required: true,
		description: "DNS prefetch for registry hostnames enabled",
		bunVersion: "1.2.0",
	},

	col_48_cookie_engine: {
		index: 48,
		id: "cookie_engine",
		displayName: "Cookie Engine",
		category: "protocol",
		type: "enum",
		defaultValue: "none",
		required: true,
		description: "Cookie handling engine (native/none)",
		bunVersion: "1.3.7",
	},

	col_49_fetch_proxy: {
		index: 49,
		id: "fetch_proxy",
		displayName: "Fetch Proxy",
		category: "protocol",
		type: "boolean",
		defaultValue: false,
		required: true,
		description: "Fetch proxy support enabled (HTTPS_PROXY)",
		bunVersion: "1.1.0",
	},

	col_50_streaming_body: {
		index: 50,
		id: "streaming_body",
		displayName: "Streaming Body",
		category: "protocol",
		type: "boolean",
		defaultValue: false,
		required: true,
		description: "Streaming request/response body support",
		bunVersion: "1.0.0",
	},

	// ==========================================================================
	// HARDWARE (51-55)
	// ==========================================================================
	col_51_hardware_hash: {
		index: 51,
		id: "hardware_hash",
		displayName: "Hardware Hash",
		category: "hardware",
		type: "hex",
		defaultValue: "0x0",
		required: false,
		description: "CRC32 hardware hash value",
		bunVersion: "1.3.6",
	},

	col_52_hardware_accel: {
		index: 52,
		id: "hardware_accel",
		displayName: "Hardware Acceleration",
		category: "hardware",
		type: "enum",
		defaultValue: "none",
		required: true,
		description: "Hardware acceleration type (pclmulqdq/armv8/none)",
		bunVersion: "1.3.6",
	},

	col_53_integrity_verified: {
		index: 53,
		id: "integrity_verified",
		displayName: "Integrity Verified",
		category: "hardware",
		type: "boolean",
		defaultValue: false,
		required: true,
		description: "Profile integrity verified with CRC32",
		bunVersion: "1.3.6",
	},

	col_54_simd_json_time: {
		index: 54,
		id: "simd_json_time",
		displayName: "SIMD JSON Time",
		category: "hardware",
		type: "number",
		defaultValue: 0,
		required: false,
		description: "JSON serialization time in ms (SIMD)",
		bunVersion: "1.3.6",
	},

	col_55_stringifier_ops: {
		index: 55,
		id: "stringifier_ops",
		displayName: "Stringifier Ops/sec",
		category: "hardware",
		type: "number",
		defaultValue: 0,
		required: false,
		description: "FastStringifier operations per second",
		bunVersion: "1.3.6",
	},

	// ==========================================================================
	// AUDIT (56-60)
	// ==========================================================================
	col_56_idle_start: {
		index: 56,
		id: "idle_start",
		displayName: "Idle Start",
		category: "audit",
		type: "number",
		defaultValue: 0,
		required: false,
		description: "Timer idle start value (_idleStart)",
		bunVersion: "1.3.6",
	},

	col_57_timer_state: {
		index: 57,
		id: "timer_state",
		displayName: "Timer State",
		category: "audit",
		type: "enum",
		defaultValue: "real",
		required: true,
		description: "Timer state (real/fake/dilated)",
		bunVersion: "1.3.6",
	},

	col_58_fake_timers_enabled: {
		index: 58,
		id: "fake_timers_enabled",
		displayName: "Fake Timers Enabled",
		category: "audit",
		type: "boolean",
		defaultValue: false,
		required: true,
		description: "Jest fake timers are active",
		bunVersion: "1.3.6",
	},

	col_59_arm64_ccmp: {
		index: 59,
		id: "arm64_ccmp",
		displayName: "ARM64 CCMP",
		category: "audit",
		type: "boolean",
		defaultValue: false,
		required: true,
		description: "ARM64 CCMP optimization enabled",
		bunVersion: "1.3.6",
	},

	col_60_compiler_opt_level: {
		index: 60,
		id: "compiler_opt_level",
		displayName: "Compiler Opt Level",
		category: "audit",
		type: "enum",
		defaultValue: "O2",
		required: true,
		description: "Compiler optimization level (O0/O1/O2/O3/Os/Oz)",
		bunVersion: "1.0.0",
	},

	// ==========================================================================
	// ENVIRONMENT (61-70) — Bun-specific environment variables
	// ==========================================================================
	col_61_transpiler_cache_path: {
		index: 61,
		id: "transpiler_cache_path",
		displayName: "Transpiler Cache Path",
		category: "environment",
		type: "string",
		defaultValue: "$PLATFORM_CACHE_DIR",
		required: false,
		description:
			"BUN_RUNTIME_TRANSPILER_CACHE_PATH: Cache dir for transpiled output of files >50KB (.pile). Default: platform cache dir. Set to '' or '0' to disable. Content-addressable, safe to delete anytime",
		bunVersion: "1.0.0",
	},

	col_62_verbose_fetch: {
		index: 62,
		id: "verbose_fetch",
		displayName: "Verbose Fetch",
		category: "environment",
		type: "enum",
		defaultValue: "off",
		required: true,
		description:
			"BUN_CONFIG_VERBOSE_FETCH: Fetch request logging. Default: off. Values: off | 1 (basic) | curl (full headers). Also works with node:http",
		bunVersion: "1.0.0",
	},

	col_63_max_http_requests: {
		index: 63,
		id: "max_http_requests",
		displayName: "Max HTTP Requests",
		category: "environment",
		type: "number",
		defaultValue: 256,
		required: true,
		description:
			"BUN_CONFIG_MAX_HTTP_REQUESTS: Max concurrent HTTP requests for fetch and bun install. Default: 256. Lower to fix rate limits",
		bunVersion: "1.0.0",
		validate: (v) => typeof v === "number" && v > 0,
	},

	col_64_no_clear_on_reload: {
		index: 64,
		id: "no_clear_on_reload",
		displayName: "No Clear on Reload",
		category: "environment",
		type: "boolean",
		defaultValue: false,
		required: true,
		description:
			"BUN_CONFIG_NO_CLEAR_TERMINAL_ON_RELOAD: Prevent bun --watch from clearing console on reload. Default: false (console clears on reload)",
		bunVersion: "1.0.0",
	},

	col_65_bun_options: {
		index: 65,
		id: "bun_options",
		displayName: "Bun Options",
		category: "environment",
		type: "string",
		defaultValue: "",
		required: false,
		description:
			'BUN_OPTIONS: Prepended CLI arguments to any Bun execution. Default: "" (none). Example: "--hot" makes bun run dev behave like bun --hot run dev',
		bunVersion: "1.0.0",
	},

	col_66_tls_reject_unauthorized: {
		index: 66,
		id: "tls_reject_unauthorized",
		displayName: "TLS Reject Unauthorized",
		category: "environment",
		type: "boolean",
		defaultValue: true,
		required: true,
		description:
			"NODE_TLS_REJECT_UNAUTHORIZED: SSL certificate validation. Default: true (validates certs). Set to 0 to skip — testing/debugging only",
		bunVersion: "1.0.0",
	},

	col_67_no_color: {
		index: 67,
		id: "no_color",
		displayName: "No Color",
		category: "environment",
		type: "boolean",
		defaultValue: false,
		required: true,
		description:
			"NO_COLOR: Disable ANSI color output (no-color.org). Default: false (colors enabled). Set NO_COLOR=1 to disable",
		bunVersion: "1.0.0",
	},

	col_68_force_color: {
		index: 68,
		id: "force_color",
		displayName: "Force Color",
		category: "environment",
		type: "boolean",
		defaultValue: false,
		required: true,
		description:
			"FORCE_COLOR: Force ANSI color output even when NO_COLOR is set. Default: false. Set FORCE_COLOR=1 to override NO_COLOR",
		bunVersion: "1.0.0",
	},

	col_69_do_not_track: {
		index: 69,
		id: "do_not_track",
		displayName: "Do Not Track",
		category: "environment",
		type: "boolean",
		defaultValue: false,
		required: true,
		description:
			"DO_NOT_TRACK: Disable crash report uploads and telemetry (do-not-track.dev). Default: false (macOS/Windows auto-upload crash reports). Set DO_NOT_TRACK=1 to opt out",
		bunVersion: "1.0.0",
	},

	col_70_tmpdir: {
		index: 70,
		id: "tmpdir",
		displayName: "Temp Directory",
		category: "environment",
		type: "string",
		defaultValue: "/tmp",
		required: false,
		description:
			"TMPDIR: Temp directory for intermediate bundling assets. Default: /tmp (Linux), /private/tmp (macOS). Override for custom temp location",
		bunVersion: "1.0.0",
	},

	// ==========================================================================
	// DATABASE (71-75) — SQL tagged template helper features
	// ==========================================================================
	col_71_sql_undefined_filter: {
		index: 71,
		id: "sql_undefined_filter",
		displayName: "SQL Undefined Filter",
		category: "database",
		type: "boolean",
		defaultValue: true,
		required: true,
		description:
			"sql() tagged template filters undefined values from INSERT instead of converting to NULL. Columns with undefined are omitted entirely, letting database DEFAULT apply. e.g. sql({ foo: undefined, id: uuid }) generates INSERT (id) VALUES ($1)",
		bunVersion: "1.3.6",
	},

	// ==========================================================================
	// TIMING (72-75) — High-resolution timing APIs
	// ==========================================================================
	col_76_nanoseconds: {
		index: 76,
		id: "nanoseconds",
		displayName: "Nanoseconds Timer",
		category: "compute",
		type: "number",
		defaultValue: 0,
		required: false,
		description:
			"Bun.nanoseconds(): High-resolution monotonic timer for benchmarking. Returns elapsed time since process start in nanoseconds. See: https://bun.sh/reference/bun/nanoseconds",
		bunVersion: "1.0.0",
	},

	col_72_sql_heterogeneous_insert: {
		index: 72,
		id: "sql_heterogeneous_insert",
		displayName: "SQL Heterogeneous Insert",
		category: "database",
		type: "boolean",
		defaultValue: true,
		required: true,
		description:
			"sql() batch insert supports heterogeneous objects. Missing keys across objects are included as columns. e.g. sql([{ foo: 'a' }, { foo: 'b', bar: 'c' }]) correctly includes 'bar' column for both rows",
		bunVersion: "1.3.6",
	},

	// ==========================================================================
	// SERIALIZATION (73-75) — JSON FastStringifier SIMD (v1.3.6)
	// ==========================================================================

	col_73_response_json_fast_path: {
		index: 73,
		id: "response_json_fast_path",
		displayName: "Response.json() Fast Path",
		category: "serialization",
		type: "boolean",
		defaultValue: true,
		required: true,
		description:
			"Response.json() uses JSC SIMD-optimized FastStringifier. 3.5x faster — now equivalent to manual JSON.stringify() + new Response(). Eliminates previous slow path that bypassed SIMD codegen",
		bunVersion: "1.3.6",
	},

	col_74_console_json_fast_path: {
		index: 74,
		id: "console_json_fast_path",
		displayName: "Console JSON Fast Path",
		category: "serialization",
		type: "boolean",
		defaultValue: true,
		required: true,
		description:
			"console.log %j format and Jest %j/%o specifiers use JSC SIMD-optimized FastStringifier. ~3x faster debugging and test output for JSON-formatted values",
		bunVersion: "1.3.6",
	},

	col_75_sql_json_fast_path: {
		index: 75,
		id: "sql_json_fast_path",
		displayName: "SQL JSON Fast Path",
		category: "serialization",
		type: "boolean",
		defaultValue: true,
		required: true,
		description:
			"PostgreSQL JSON/JSONB and MySQL JSON types use JSC SIMD-optimized FastStringifier. ~3x faster serialization for database JSON column operations",
		bunVersion: "1.3.6",
	},

	// ==========================================================================
	// SHELL (76-78) — Bun Shell API ($)
	// ==========================================================================

	col_76_shell_error_class: {
		index: 76,
		id: "shell_error_class",
		displayName: "Shell Error Class",
		category: "shell",
		type: "boolean",
		defaultValue: true,
		required: true,
		description:
			"$.ShellError extends Error with exitCode, stdout, stderr properties. Thrown on non-zero exit codes from Bun Shell ($). Supports body methods: .text(), .json(), .bytes(), .blob(), .arrayBuffer()",
		bunVersion: "1.0.0",
	},

	col_77_shell_nothrow: {
		index: 77,
		id: "shell_nothrow",
		displayName: "Shell Nothrow",
		category: "shell",
		type: "boolean",
		defaultValue: true,
		required: true,
		description:
			"$`cmd`.nothrow() suppresses ShellError on non-zero exit. Returns result with exitCode instead of throwing. Use for commands where failure is expected (grep no match, test -f, etc.)",
		bunVersion: "1.0.0",
	},

	col_78_shell_quiet: {
		index: 78,
		id: "shell_quiet",
		displayName: "Shell Quiet Mode",
		category: "shell",
		type: "boolean",
		defaultValue: true,
		required: true,
		description:
			"$`cmd`.quiet() suppresses stdout/stderr output to terminal. Combined with .nothrow() for silent error-safe execution: $`cmd`.quiet().nothrow()",
		bunVersion: "1.0.0",
	},

	col_79_test_grep: {
		index: 79,
		id: "test_grep",
		displayName: "Test Grep",
		category: "testing",
		type: "string",
		defaultValue: "",
		required: false,
		description:
			"bun test --grep/-t: Filter tests by name pattern. Equivalent to --test-name-pattern. All three forms work: --grep, --test-name-pattern, -t",
		bunVersion: "1.3.7",
	},

	col_80_audit_exit_codes: {
		index: 80,
		id: "audit_exit_codes",
		displayName: "Audit Exit Codes",
		category: "audit",
		type: "enum",
		defaultValue: "0",
		required: true,
		description:
			"bun pm audit exit codes: 0=no vulnerabilities, 1=vulnerabilities found. Use --json for programmatic handling. See: https://bun.com/docs/pm/cli/audit#exit-code",
		bunVersion: "1.0.0",
	},

	// ======================================================================
	// HARDWARE ACCELERATION v1.3.6 (81-88)
	// ======================================================================

	col_81_archive_sealing: {
		index: 81,
		id: "archive_sealing",
		displayName: "Archive Sealing",
		category: "hardware",
		type: "boolean",
		defaultValue: true,
		required: false,
		description:
			"Bun.Archive: Zero-copy native tar/tar.gz creation and extraction. Replaces tar/archiver/node-tar dependencies. Supports gzip compression with configurable level (1-9)",
		bunVersion: "1.3.6",
	},

	col_82_jsonc_parsing: {
		index: 82,
		id: "jsonc_parsing",
		displayName: "JSONC Parsing",
		category: "hardware",
		type: "boolean",
		defaultValue: true,
		required: false,
		description:
			"Bun.JSONC.parse(): Native JSON with Comments parsing. Supports //, /* */, trailing commas. Replaces strip-json-comments and jsonc-parser dependencies",
		bunVersion: "1.3.6",
	},

	col_83_build_metafile: {
		index: 83,
		id: "build_metafile",
		displayName: "Build Metafile",
		category: "hardware",
		type: "boolean",
		defaultValue: true,
		required: false,
		description:
			"Bun.build metafile + virtual files: metafile:true returns input/output byte stats. files:{} option injects virtual modules at build time for secret injection and air-gapped builds",
		bunVersion: "1.3.6",
	},

	col_84_promise_race_fast: {
		index: 84,
		id: "promise_race_fast",
		displayName: "Promise.race Fast",
		category: "hardware",
		type: "boolean",
		defaultValue: true,
		required: false,
		description:
			"Promise.race 30% faster in v1.3.6. Optimized internal settlement tracking for concurrent health checks and timeout patterns across multiple endpoints",
		bunVersion: "1.3.6",
	},

	col_85_buffer_indexof_simd: {
		index: 85,
		id: "buffer_indexof_simd",
		displayName: "Buffer indexOf SIMD",
		category: "hardware",
		type: "boolean",
		defaultValue: true,
		required: false,
		description:
			"Buffer.indexOf SIMD 2x faster: Hardware-accelerated needle search using SSE4.2/AVX2 (x86_64) or NEON (ARM64) for binary protocol parsing and delimiter detection",
		bunVersion: "1.3.6",
	},

	col_86_crc32_hw_accel: {
		index: 86,
		id: "crc32_hw_accel",
		displayName: "CRC32 HW Accel",
		category: "hardware",
		type: "boolean",
		defaultValue: true,
		required: false,
		description:
			"Bun.hash.crc32() hardware-accelerated: Uses PCLMULQDQ (x86_64) or ARMv8 CRC32 instructions. ~20x faster than software. Supports incremental checksums via second seed argument",
		bunVersion: "1.3.6",
	},

	col_87_websocket_proxy: {
		index: 87,
		id: "websocket_proxy",
		displayName: "WebSocket Proxy",
		category: "hardware",
		type: "boolean",
		defaultValue: true,
		required: false,
		description:
			"WebSocket proxy support: new WebSocket(url, { proxy }) enables connections through corporate HTTP/HTTPS proxies. Uses HTTPS_PROXY/HTTP_PROXY environment variables",
		bunVersion: "1.3.6",
	},

	col_88_s3_requester_pays: {
		index: 88,
		id: "s3_requester_pays",
		displayName: "S3 Requester Pays",
		category: "hardware",
		type: "boolean",
		defaultValue: false,
		required: false,
		description:
			"S3 requestPayer option: s3.file(key, { requestPayer: true }) enables requester-pays bucket access where the caller pays egress instead of the bucket owner",
		bunVersion: "1.3.6",
	},

	// ==========================================================================
	// SKILLS COMPLIANCE (89-95)
	// ==========================================================================

	col_89_no_markdown_tables: {
		index: 89,
		id: "no_markdown_tables",
		displayName: "No Markdown Tables",
		category: "skills",
		type: "boolean",
		defaultValue: true,
		required: true,
		description:
			"Skills files must not contain markdown tables outside code blocks — use Bun.inspect.table() instead",
		bunVersion: "1.3.6",
	},

	col_90_bun_test_it_convention: {
		index: 90,
		id: "bun_test_it_convention",
		displayName: "bun:test it() Convention",
		category: "skills",
		type: "boolean",
		defaultValue: true,
		required: true,
		description: "bun:test code examples must use it() not test() for test definitions",
		bunVersion: "1.3.6",
	},

	col_91_deep_equals_params: {
		index: 91,
		id: "deep_equals_params",
		displayName: "Bun.deepEquals Params",
		category: "skills",
		type: "boolean",
		defaultValue: true,
		required: true,
		description:
			"Bun.deepEquals() calls must have at least 2 parameters for meaningful comparison",
		bunVersion: "1.3.6",
	},

	col_92_hmr_decline_parens: {
		index: 92,
		id: "hmr_decline_parens",
		displayName: "HMR decline() Parens",
		category: "skills",
		type: "boolean",
		defaultValue: true,
		required: true,
		description:
			"import.meta.hot.decline() must include parentheses for proper function invocation",
		bunVersion: "1.3.6",
	},

	col_93_balanced_braces: {
		index: 93,
		id: "balanced_braces",
		displayName: "Balanced Braces",
		category: "skills",
		type: "boolean",
		defaultValue: true,
		required: true,
		description:
			"Code blocks in skill files must have balanced braces, brackets, and parentheses",
		bunVersion: "1.3.6",
	},

	col_94_response_json_pattern: {
		index: 94,
		id: "response_json_pattern",
		displayName: "Response.json() Pattern",
		category: "skills",
		type: "boolean",
		defaultValue: true,
		required: true,
		description:
			"Must use Response.json() instead of new Response(JSON.stringify()) for JSON responses",
		bunVersion: "1.3.6",
	},

	col_95_skills_compliance_score: {
		index: 95,
		id: "skills_compliance_score",
		displayName: "Skills Compliance Score",
		category: "skills",
		type: "number",
		defaultValue: 100,
		required: true,
		description:
			"Aggregate skills compliance score (0-100): pass rate across all 6 boolean skill checks (col_89-94)",
		bunVersion: "1.3.6",
	},
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get column by index (1-95)
 */
export function getColumnByIndex(index: number): BaseColumn | undefined {
	return Object.values(COLUMN_STANDARDS).find((col) => col.index === index);
}

/**
 * Get column by ID
 */
export function getColumnById(id: string): BaseColumn | undefined {
	return (
		COLUMN_STANDARDS[`col_${id.padStart(2, "0")}_${id}`] ||
		Object.values(COLUMN_STANDARDS).find((col) => col.id === id)
	);
}

/**
 * Get all columns in a category
 */
export function getColumnsByCategory(category: ColumnCategory): BaseColumn[] {
	return Object.values(COLUMN_STANDARDS).filter((col) => col.category === category);
}

/**
 * Validate a column value against its standard
 */
export function validateColumnValue(
	columnId: string,
	value: unknown,
): {
	valid: boolean;
	error?: string;
} {
	const col = getColumnById(columnId);
	if (!col) {
		return { valid: false, error: `Unknown column: ${columnId}` };
	}

	if (col.validate) {
		const valid = col.validate(value);
		if (!valid) {
			return { valid: false, error: `Validation failed for ${columnId}` };
		}
	}

	// Type checking
	const actualType = typeof value;
	const expectedType =
		col.type === "timestamp" ? "bigint" : col.type === "hex" ? "string" : col.type;

	if (actualType !== expectedType && col.type !== "enum" && col.type !== "json") {
		return {
			valid: false,
			error: `Type mismatch for ${columnId}: expected ${expectedType}, got ${actualType}`,
		};
	}

	return { valid: true };
}

/**
 * Create empty column context
 */
export function createColumnContext(meta: MatrixMeta): ColumnContext {
	const now = BigInt(Date.now());

	const columns: Record<string, ColumnValue> = {};

	for (const [_key, standard] of Object.entries(COLUMN_STANDARDS)) {
		columns[standard.id] = {
			value: standard.defaultValue,
			setAt: now,
			source: "inherited",
			valid: true,
		};
	}

	return {
		version: "1380.OMEGA.0",
		timestamp: now,
		bunVersion: Bun.version,
		columns,
		meta,
	};
}

/**
 * Set a column value with validation
 */
export function setColumnValue(
	ctx: ColumnContext,
	columnId: string,
	value: unknown,
	source: ValueSource = "manual",
): ColumnContext {
	const col = getColumnById(columnId);
	if (!col) {
		throw new Error(`Unknown column: ${columnId}`);
	}

	const validation = validateColumnValue(columnId, value);

	return {
		...ctx,
		columns: {
			...ctx.columns,
			[columnId]: {
				value,
				setAt: BigInt(Date.now()),
				source,
				valid: validation.valid,
				error: validation.error,
			},
		},
	};
}

/**
 * Export context to JSON (for serialization)
 */
export function exportContext(ctx: ColumnContext): string {
	return JSON.stringify(
		ctx,
		(_key, value) => {
			if (typeof value === "bigint") {
				return value.toString();
			}
			return value;
		},
		2,
	);
}

/**
 * Import context from JSON
 */
export function importContext(json: string): ColumnContext {
	return JSON.parse(json, (key, value) => {
		// Convert timestamp strings back to bigint
		if (key === "timestamp" || key === "setAt") {
			return BigInt(value);
		}
		return value;
	});
}

// ============================================================================
// CLI
// ============================================================================

if (import.meta.main) {
	const command = Bun.argv[2];

	switch (command) {
		case "list": {
			console.log("Tier-1380 OMEGA Column Standards\n");
			console.log(
				"Index | ID                    | Category  | Type      | Required | Description",
			);
			console.log(
				"------|-----------------------|-----------|-----------|----------|-------------",
			);

			const sorted = Object.values(COLUMN_STANDARDS).sort((a, b) => a.index - b.index);

			for (const col of sorted) {
				const idx = col.index.toString().padStart(2, "0");
				const id = col.id.padEnd(21, " ");
				const cat = col.category.padEnd(9, " ");
				const type = col.type.padEnd(9, " ");
				const req = (col.required ? "yes" : "no").padEnd(8, " ");
				console.log(
					`  ${idx}  | ${id} | ${cat} | ${type} | ${req} | ${col.description}`,
				);
			}

			console.log(`\nTotal: ${sorted.length} columns defined`);
			break;
		}

		case "categories": {
			console.log("Column Categories:\n");
			const categories: ColumnCategory[] = [
				"core",
				"security",
				"storage",
				"compute",
				"protocol",
				"hardware",
				"audit",
				"environment",
				"database",
				"serialization",
				"shell",
				"testing",
				"skills",
			];

			for (const cat of categories) {
				const cols = getColumnsByCategory(cat);
				console.log(`${cat.padEnd(10)}: ${cols.length} columns`);
				for (const col of cols) {
					console.log(`  - ${col.id}`);
				}
				console.log();
			}
			break;
		}

		case "validate": {
			const colId = Bun.argv[3];
			const valueStr = Bun.argv[4];

			if (!colId || !valueStr) {
				console.log("Usage: bun run column-standards.ts validate <column-id> <value>");
				process.exit(1);
			}

			const col = getColumnById(colId);
			if (!col) {
				console.error(`Unknown column: ${colId}`);
				process.exit(1);
			}

			let value: unknown = valueStr;
			if (col.type === "number") value = Number(valueStr);
			if (col.type === "bigint") value = BigInt(valueStr);
			if (col.type === "boolean") value = valueStr === "true";

			const result = validateColumnValue(colId, value);
			console.log(`Validation: ${result.valid ? "✅ PASS" : "❌ FAIL"}`);
			if (result.error) {
				console.log(`Error: ${result.error}`);
			}
			break;
		}

		case "create-ctx": {
			const ctx = createColumnContext({
				runId: Bun.randomUUIDv7(),
				environment: "test",
				commit: "unknown",
				platform: process.platform,
				arch: process.arch,
			});

			console.log("Empty Column Context Created:\n");
			console.log(exportContext(ctx));
			break;
		}

		default: {
			console.log("Tier-1380 OMEGA Column Standards\n");
			console.log("Commands:");
			console.log("  list          List all column definitions");
			console.log("  categories    Show columns by category");
			console.log("  validate      Validate a column value");
			console.log("  create-ctx    Create empty context");
		}
	}
}
