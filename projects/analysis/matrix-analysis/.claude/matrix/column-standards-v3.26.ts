/**
 * 🔥 Tier-1380 OMEGA v3.26: 90-Column Matrix with Hyperlink Citadel
 *
 * Standardized 90-column matrix with URLPatternInit-powered hyperlinks
 * Every column includes optional uriPattern for executable navigation
 *
 * @module column-standards-v3.26
 * @tier 1380-OMEGA-v3.26
 * @protocol TIER-1380-OMEGA-v3.26
 */

// ============================================================================
// URI Pattern Types (URLPatternInit compatible)
// ============================================================================

export interface URIPattern {
	/** Protocol (https, http, bun, file) */
	protocol?: string;
	/** Hostname */
	hostname?: string;
	/** Port */
	port?: string;
	/** Pathname with :params */
	pathname: string;
	/** Search params */
	search?: string;
	/** Hash fragment */
	hash?: string;
	/** Base URL for relative patterns */
	baseURL?: string;
}

// ============================================================================
// Enhanced Column Definition with URI Patterns
// ============================================================================

export interface HyperlinkColumn {
	/** Column index (0-89) - DEFAULT at 0 */
	index: number;

	/** Machine-readable identifier (snake_case) */
	id: string;

	/** Human-readable display name */
	displayName: string;

	/** Column category/group */
	category: ColumnCategory;

	/** Value type for type safety */
	type: ColumnType;

	/** Visual indicator emoji */
	color: string;

	/** Default value if not set */
	defaultValue: unknown;

	/** Whether this column is required */
	required: boolean;

	/** Description of what this column tracks */
	description: string;

	/** Related Bun version that introduced this capability */
	bunVersion: string;

	/** URI pattern for hyperlink generation (v3.26) */
	uriPattern?: URIPattern;

	/** Link template with :param placeholders */
	linkTemplate?: string;

	/** Owner team */
	owner: string;

	/** Validation function */
	validate?: (value: unknown) => boolean;
}

// ============================================================================
// Column Categories (Extended for 90 columns)
// ============================================================================

export type ColumnCategory =
	| "default" // Universal fallback (col 0)
	| "core" // Core runtime (1-10)
	| "security" // Security & secrets (11-20)
	| "cloudflare" // Cloudflare integration (21-30)
	| "tension" // Tension anomaly zone (31-45)
	| "protocol" // Protocol & transport (46-55)
	| "audit" // Audit & compliance (56-60)
	| "telemetry" // System telemetry (61-70)
	| "chrome" // Chrome State Bridge (71-80)
	| "release" // Release pipeline (81-85)
	| "mapping"; // URI mapping & hyperlinks (86-89)

export type ColumnType =
	| "string"
	| "number"
	| "bigint"
	| "boolean"
	| "timestamp"
	| "hex"
	| "uuid"
	| "json"
	| "url"
	| "float"
	| "integer"
	| "enum";

// ============================================================================
// 90-Column Matrix Definition with URI Patterns
// ============================================================================

export const MATRIX_COLUMNS_V3_26: Record<number, HyperlinkColumn> = {
	// =========================================================================
	// COL 0: DEFAULT - Universal fallback anchor
	// =========================================================================
	0: {
		index: 0,
		id: "default_value",
		displayName: "DEFAULT",
		category: "default",
		type: "string",
		color: "⚪",
		defaultValue: null,
		required: false,
		description: "Universal fallback / baseline value for all contexts",
		bunVersion: "1.0.0",
		owner: "infra",
		uriPattern: { pathname: "/matrix/default/:context" },
		linkTemplate: "/matrix/default/:profileId",
	},

	// =========================================================================
	// CORE ZONE: 1-10 - Runtime fundamentals
	// =========================================================================
	1: {
		index: 1,
		id: "bun_version",
		displayName: "Bun Version",
		category: "core",
		type: "string",
		color: "🔵",
		defaultValue: "1.3.7",
		required: true,
		description: "Bun runtime version",
		bunVersion: "1.0.0",
		owner: "runtime",
		uriPattern: {
			protocol: "https",
			hostname: "bun.sh",
			pathname: "/docs/:version",
		},
	},
	2: {
		index: 2,
		id: "protocol_version",
		displayName: "Protocol",
		category: "core",
		type: "string",
		color: "🔵",
		defaultValue: "TIER-1380-OMEGA-v3.26",
		required: true,
		description: "OMEGA protocol version",
		bunVersion: "1.3.7",
		owner: "infra",
	},
	3: {
		index: 3,
		id: "matrix_timestamp",
		displayName: "Timestamp",
		category: "core",
		type: "timestamp",
		color: "🔵",
		defaultValue: 0n,
		required: true,
		description: "Matrix generation timestamp (nanoseconds)",
		bunVersion: "1.0.0",
		owner: "infra",
	},
	4: {
		index: 4,
		id: "profile_id",
		displayName: "Profile ID",
		category: "core",
		type: "uuid",
		color: "🔵",
		defaultValue: null,
		required: true,
		description: "Unique profile identifier",
		bunVersion: "1.0.0",
		owner: "infra",
		uriPattern: { pathname: "/profiles/:profileId" },
		linkTemplate: "/profiles/:profileId",
	},
	5: {
		index: 5,
		id: "execution_mode",
		displayName: "Mode",
		category: "core",
		type: "enum",
		color: "🔵",
		defaultValue: "production",
		required: true,
		description: "Execution mode (development, staging, production)",
		bunVersion: "1.0.0",
		owner: "runtime",
	},
	6: {
		index: 6,
		id: "team_identity",
		displayName: "Team",
		category: "core",
		type: "string",
		color: "🔵",
		defaultValue: "runtime",
		required: true,
		description: "Active team identity",
		bunVersion: "1.0.0",
		owner: "platform",
	},
	7: {
		index: 7,
		id: "tier_level",
		displayName: "Tier",
		category: "core",
		type: "integer",
		color: "🔵",
		defaultValue: 1380,
		required: true,
		description: "Storage-sovereign tier level",
		bunVersion: "1.3.7",
		owner: "infra",
	},
	8: {
		index: 8,
		id: "workspace_root",
		displayName: "Workspace",
		category: "core",
		type: "string",
		color: "🔵",
		defaultValue: ".",
		required: true,
		description: "Bun.workspaces root path",
		bunVersion: "1.1.0",
		owner: "runtime",
	},
	9: {
		index: 9,
		id: "main_entrypoint",
		displayName: "Main",
		category: "core",
		type: "string",
		color: "🔵",
		defaultValue: null,
		required: false,
		description: "Bun.main entry point",
		bunVersion: "1.1.0",
		owner: "runtime",
	},
	10: {
		index: 10,
		id: "gc_pressure",
		displayName: "GC Pressure",
		category: "core",
		type: "float",
		color: "🔵",
		defaultValue: 0.0,
		required: false,
		description: "Garbage collection pressure indicator",
		bunVersion: "1.3.0",
		owner: "runtime",
	},

	// =========================================================================
	// SECURITY ZONE: 11-20 - Security & secrets
	// =========================================================================
	11: {
		index: 11,
		id: "secrets_valid",
		displayName: "Secrets OK",
		category: "security",
		type: "boolean",
		color: "🔴",
		defaultValue: false,
		required: true,
		description: "All required secrets validated",
		bunVersion: "1.2.0",
		owner: "security",
	},
	12: {
		index: 12,
		id: "credential_count",
		displayName: "Credentials",
		category: "security",
		type: "integer",
		color: "🔴",
		defaultValue: 0,
		required: true,
		description: "Number of stored credentials",
		bunVersion: "1.2.0",
		owner: "security",
	},
	13: {
		index: 13,
		id: "keychain_status",
		displayName: "Keychain",
		category: "security",
		type: "enum",
		color: "🔴",
		defaultValue: "unlocked",
		required: true,
		description: "OS keychain status",
		bunVersion: "1.2.0",
		owner: "security",
	},
	14: {
		index: 14,
		id: "encryption_at_rest",
		displayName: "Encrypted",
		category: "security",
		type: "boolean",
		color: "🔴",
		defaultValue: true,
		required: true,
		description: "Data encryption at rest enabled",
		bunVersion: "1.0.0",
		owner: "security",
	},
	15: {
		index: 15,
		id: "audit_trail_active",
		displayName: "Audit",
		category: "security",
		type: "boolean",
		color: "🔴",
		defaultValue: true,
		required: true,
		description: "Audit trail recording active",
		bunVersion: "1.0.0",
		owner: "security",
		uriPattern: { pathname: "/audits/:profileId/:timestamp" },
	},

	// =========================================================================
	// CLOUDFLARE ZONE: 21-30 - Edge integration
	// =========================================================================
	21: {
		index: 21,
		id: "cf_zone_id",
		displayName: "CF Zone",
		category: "cloudflare",
		type: "string",
		color: "🟣",
		defaultValue: null,
		required: false,
		description: "Cloudflare zone identifier",
		bunVersion: "1.0.0",
		owner: "platform",
		uriPattern: {
			protocol: "https",
			hostname: "dash.cloudflare.com",
			pathname: "/:accountId/:zoneId",
		},
		linkTemplate: "https://dash.cloudflare.com/:accountId/:zoneId",
	},
	22: {
		index: 22,
		id: "cf_r2_bucket_count",
		displayName: "R2 Buckets",
		category: "cloudflare",
		type: "integer",
		color: "🟣",
		defaultValue: 0,
		required: false,
		description: "Number of R2 buckets configured",
		bunVersion: "1.1.0",
		owner: "platform",
	},
	23: {
		index: 23,
		id: "cf_waf_blocked_requests",
		displayName: "WAF Blocks",
		category: "cloudflare",
		type: "integer",
		color: "🔴",
		defaultValue: 0,
		required: false,
		description: "Cloudflare WAF blocked requests (threshold: 150)",
		bunVersion: "1.1.0",
		owner: "security",
		uriPattern: { pathname: "/cloudflare/waf/blocks/:zoneId/:date" },
		linkTemplate: "/cloudflare/waf/blocks/:zoneId/:date",
	},
	24: {
		index: 24,
		id: "cf_kv_namespace",
		displayName: "KV Namespace",
		category: "cloudflare",
		type: "string",
		color: "🟣",
		defaultValue: null,
		required: false,
		description: "Cloudflare KV namespace",
		bunVersion: "1.1.0",
		owner: "platform",
	},
	25: {
		index: 25,
		id: "cf_durable_object_id",
		displayName: "DO ID",
		category: "cloudflare",
		type: "string",
		color: "🟣",
		defaultValue: null,
		required: false,
		description: "Durable Object identifier",
		bunVersion: "1.2.0",
		owner: "platform",
	},
	26: {
		index: 26,
		id: "cf_worker_deployment",
		displayName: "Workers",
		category: "cloudflare",
		type: "string",
		color: "🟣",
		defaultValue: null,
		required: false,
		description: "Worker deployment status",
		bunVersion: "1.2.0",
		owner: "platform",
	},
	27: {
		index: 27,
		id: "cf_pages_domain",
		displayName: "Pages",
		category: "cloudflare",
		type: "url",
		color: "🟣",
		defaultValue: null,
		required: false,
		description: "Cloudflare Pages domain",
		bunVersion: "1.2.0",
		owner: "platform",
	},
	28: {
		index: 28,
		id: "cf_email_routing",
		displayName: "Email",
		category: "cloudflare",
		type: "boolean",
		color: "🟣",
		defaultValue: false,
		required: false,
		description: "Email routing enabled",
		bunVersion: "1.2.0",
		owner: "platform",
	},
	29: {
		index: 29,
		id: "cf_tunnel_status",
		displayName: "Tunnel",
		category: "cloudflare",
		type: "enum",
		color: "🟣",
		defaultValue: "inactive",
		required: false,
		description: "Cloudflare Tunnel status",
		bunVersion: "1.2.0",
		owner: "platform",
	},
	30: {
		index: 30,
		id: "cf_edge_cache_hit_ratio",
		displayName: "Cache Hit",
		category: "cloudflare",
		type: "float",
		color: "🟣",
		defaultValue: 0.0,
		required: false,
		description: "Edge cache hit ratio (0-1)",
		bunVersion: "1.3.0",
		owner: "platform",
	},

	// =========================================================================
	// TENSION ZONE: 31-45 - Anomaly detection (CRITICAL)
	// =========================================================================
	31: {
		index: 31,
		id: "tension_anomaly_score",
		displayName: "Anomaly",
		category: "tension",
		type: "float",
		color: "🟠",
		defaultValue: 0.0,
		required: false,
		description: "Tension anomaly score (threshold: 0.90)",
		bunVersion: "1.3.7",
		owner: "tension",
		uriPattern: { pathname: "/tension/anomaly/:gameId/:timestamp" },
		linkTemplate: "/tension/anomaly/:gameId/:timestamp",
	},
	32: {
		index: 32,
		id: "tension_game_count",
		displayName: "Games",
		category: "tension",
		type: "integer",
		color: "🟠",
		defaultValue: 0,
		required: false,
		description: "Number of games in tension field",
		bunVersion: "1.3.7",
		owner: "tension",
	},
	33: {
		index: 33,
		id: "tension_field_type",
		displayName: "Field Type",
		category: "tension",
		type: "enum",
		color: "🟠",
		defaultValue: "standard",
		required: false,
		description: "Tension field configuration type",
		bunVersion: "1.3.7",
		owner: "tension",
	},
	34: {
		index: 34,
		id: "tension_q1_baseline",
		displayName: "Q1 Baseline",
		category: "tension",
		type: "float",
		color: "🟠",
		defaultValue: 0.0,
		required: false,
		description: "Q1 baseline metric",
		bunVersion: "1.3.7",
		owner: "tension",
	},
	35: {
		index: 35,
		id: "overreact_flag_q3",
		displayName: "Q3 Overreact",
		category: "tension",
		type: "boolean",
		color: "🟠",
		defaultValue: false,
		required: false,
		description: "Q3 overreaction flag (threshold: 0.75)",
		bunVersion: "1.3.7",
		owner: "tension",
		uriPattern: { pathname: "/tension/overreact/q3/:gameId" },
		linkTemplate: "/tension/overreact/q3/:gameId",
	},
	36: {
		index: 36,
		id: "tension_median",
		displayName: "Median",
		category: "tension",
		type: "float",
		color: "🟠",
		defaultValue: 0.0,
		required: false,
		description: "Tension median value",
		bunVersion: "1.3.7",
		owner: "tension",
	},
	37: {
		index: 37,
		id: "tension_std_dev",
		displayName: "Std Dev",
		category: "tension",
		type: "float",
		color: "🟠",
		defaultValue: 0.0,
		required: false,
		description: "Standard deviation of tension",
		bunVersion: "1.3.7",
		owner: "tension",
	},
	38: {
		index: 38,
		id: "tension_outlier_count",
		displayName: "Outliers",
		category: "tension",
		type: "integer",
		color: "🟠",
		defaultValue: 0,
		required: false,
		description: "Number of statistical outliers",
		bunVersion: "1.3.7",
		owner: "tension",
	},
	39: {
		index: 39,
		id: "tension_correlation_id",
		displayName: "Correlation",
		category: "tension",
		type: "uuid",
		color: "🟠",
		defaultValue: null,
		required: false,
		description: "Cross-system correlation ID",
		bunVersion: "1.3.7",
		owner: "tension",
	},
	40: {
		index: 40,
		id: "tension_propagation_depth",
		displayName: "Depth",
		category: "tension",
		type: "integer",
		color: "🟠",
		defaultValue: 0,
		required: false,
		description: "Propagation depth in tension field",
		bunVersion: "1.3.7",
		owner: "tension",
	},
	41: {
		index: 41,
		id: "tension_field_pressure",
		displayName: "Pressure",
		category: "tension",
		type: "float",
		color: "🟠",
		defaultValue: 0.0,
		required: false,
		description: "Overall field pressure",
		bunVersion: "1.3.7",
		owner: "tension",
	},
	42: {
		index: 42,
		id: "tension_heat_map_data",
		displayName: "Heat Map",
		category: "tension",
		type: "json",
		color: "🟠",
		defaultValue: null,
		required: false,
		description: "Heat map visualization data",
		bunVersion: "1.3.7",
		owner: "tension",
	},
	43: {
		index: 43,
		id: "tension_severity_index",
		displayName: "Severity",
		category: "tension",
		type: "float",
		color: "🟠",
		defaultValue: 0.0,
		required: false,
		description: "Combined severity index (threshold: 0.95)",
		bunVersion: "1.3.7",
		owner: "tension",
		uriPattern: { pathname: "/tension/severity/:gameId" },
	},
	44: {
		index: 44,
		id: "tension_alert_triggered",
		displayName: "Alert",
		category: "tension",
		type: "boolean",
		color: "🟠",
		defaultValue: false,
		required: false,
		description: "Alert triggered flag",
		bunVersion: "1.3.7",
		owner: "tension",
	},
	45: {
		index: 45,
		id: "tension_profile_link",
		displayName: "Profile URL",
		category: "tension",
		type: "url",
		color: "🟠",
		defaultValue: null,
		required: false,
		description: "Link to tension profile document",
		bunVersion: "1.3.7",
		owner: "tension",
		uriPattern: {
			protocol: "https",
			hostname: "profiles.factory-wager.com",
			pathname: "/tension/:tier/:env/tension-md-:timestamp.md",
		},
		linkTemplate:
			"https://profiles.factory-wager.com/tension/:tier/:env/tension-md-:timestamp.md",
	},

	// =========================================================================
	// PROTOCOL ZONE: 46-55 - Transport & networking
	// =========================================================================
	46: {
		index: 46,
		id: "http_version",
		displayName: "HTTP",
		category: "protocol",
		type: "enum",
		color: "🟢",
		defaultValue: "2",
		required: false,
		description: "HTTP protocol version",
		bunVersion: "1.0.0",
		owner: "runtime",
	},
	47: {
		index: 47,
		id: "tls_version",
		displayName: "TLS",
		category: "protocol",
		type: "enum",
		color: "🟢",
		defaultValue: "1.3",
		required: false,
		description: "TLS version",
		bunVersion: "1.0.0",
		owner: "security",
	},
	48: {
		index: 48,
		id: "websocket_connections",
		displayName: "WebSockets",
		category: "protocol",
		type: "integer",
		color: "🟢",
		defaultValue: 0,
		required: false,
		description: "Active WebSocket connections",
		bunVersion: "1.1.0",
		owner: "runtime",
	},
	49: {
		index: 49,
		id: "tcp_keepalive",
		displayName: "Keepalive",
		category: "protocol",
		type: "boolean",
		color: "🟢",
		defaultValue: true,
		required: false,
		description: "TCP keepalive enabled",
		bunVersion: "1.1.0",
		owner: "runtime",
	},
	50: {
		index: 50,
		id: "dns_resolution_time",
		displayName: "DNS Time",
		category: "protocol",
		type: "integer",
		color: "🟢",
		defaultValue: 0,
		required: false,
		description: "DNS resolution time (ms)",
		bunVersion: "1.1.0",
		owner: "runtime",
	},

	// =========================================================================
	// AUDIT ZONE: 56-60 - Compliance & attestation
	// =========================================================================
	56: {
		index: 56,
		id: "audit_exit_code",
		displayName: "Audit Exit",
		category: "audit",
		type: "integer",
		color: "🟡",
		defaultValue: 0,
		required: false,
		description: "Last audit exit code",
		bunVersion: "1.2.0",
		owner: "security",
		uriPattern: { pathname: "/audits/:profileId/:timestamp/exit" },
	},
	57: {
		index: 57,
		id: "compliance_score",
		displayName: "Compliance",
		category: "audit",
		type: "float",
		color: "🟡",
		defaultValue: 1.0,
		required: false,
		description: "Compliance score (0-1)",
		bunVersion: "1.2.0",
		owner: "security",
	},
	58: {
		index: 58,
		id: "vulnerabilities_found",
		displayName: "Vulns",
		category: "audit",
		type: "integer",
		color: "🟡",
		defaultValue: 0,
		required: false,
		description: "CVE vulnerabilities found",
		bunVersion: "1.2.0",
		owner: "security",
	},
	59: {
		index: 59,
		id: "attestation_hash",
		displayName: "Attestation",
		category: "audit",
		type: "hex",
		color: "🟡",
		defaultValue: null,
		required: false,
		description: "Compliance attestation hash",
		bunVersion: "1.2.0",
		owner: "security",
	},
	60: {
		index: 60,
		id: "last_audit_timestamp",
		displayName: "Last Audit",
		category: "audit",
		type: "timestamp",
		color: "🟡",
		defaultValue: 0n,
		required: false,
		description: "Last audit run timestamp",
		bunVersion: "1.2.0",
		owner: "security",
	},

	// =========================================================================
	// TELEMETRY ZONE: 61-70 - System metrics
	// =========================================================================
	61: {
		index: 61,
		id: "cpu_usage_percent",
		displayName: "CPU %",
		category: "telemetry",
		type: "float",
		color: "⚪",
		defaultValue: 0.0,
		required: false,
		description: "CPU usage percentage",
		bunVersion: "1.0.0",
		owner: "runtime",
	},
	62: {
		index: 62,
		id: "memory_usage_bytes",
		displayName: "Memory",
		category: "telemetry",
		type: "bigint",
		color: "⚪",
		defaultValue: 0n,
		required: false,
		description: "Memory usage in bytes",
		bunVersion: "1.0.0",
		owner: "runtime",
	},
	63: {
		index: 63,
		id: "disk_io_read_ops",
		displayName: "Disk Read",
		category: "telemetry",
		type: "integer",
		color: "⚪",
		defaultValue: 0,
		required: false,
		description: "Disk read operations",
		bunVersion: "1.0.0",
		owner: "runtime",
	},
	64: {
		index: 64,
		id: "disk_io_write_ops",
		displayName: "Disk Write",
		category: "telemetry",
		type: "integer",
		color: "⚪",
		defaultValue: 0,
		required: false,
		description: "Disk write operations",
		bunVersion: "1.0.0",
		owner: "runtime",
	},
	65: {
		index: 65,
		id: "network_bytes_in",
		displayName: "Net In",
		category: "telemetry",
		type: "bigint",
		color: "⚪",
		defaultValue: 0n,
		required: false,
		description: "Network bytes received",
		bunVersion: "1.0.0",
		owner: "runtime",
	},
	66: {
		index: 66,
		id: "network_bytes_out",
		displayName: "Net Out",
		category: "telemetry",
		type: "bigint",
		color: "⚪",
		defaultValue: 0n,
		required: false,
		description: "Network bytes transmitted",
		bunVersion: "1.0.0",
		owner: "runtime",
	},
	67: {
		index: 67,
		id: "goroutine_count",
		displayName: "Goroutines",
		category: "telemetry",
		type: "integer",
		color: "⚪",
		defaultValue: 0,
		required: false,
		description: "Active goroutine count",
		bunVersion: "1.0.0",
		owner: "runtime",
	},
	68: {
		index: 68,
		id: "file_descriptors_open",
		displayName: "FD Open",
		category: "telemetry",
		type: "integer",
		color: "⚪",
		defaultValue: 0,
		required: false,
		description: "Open file descriptors",
		bunVersion: "1.0.0",
		owner: "runtime",
	},
	69: {
		index: 69,
		id: "uptime_seconds",
		displayName: "Uptime",
		category: "telemetry",
		type: "integer",
		color: "⚪",
		defaultValue: 0,
		required: false,
		description: "Process uptime in seconds",
		bunVersion: "1.0.0",
		owner: "runtime",
	},
	70: {
		index: 70,
		id: "gc_collection_count",
		displayName: "GC Count",
		category: "telemetry",
		type: "integer",
		color: "⚪",
		defaultValue: 0,
		required: false,
		description: "Garbage collection cycles",
		bunVersion: "1.0.0",
		owner: "runtime",
	},

	// =========================================================================
	// CHROME STATE ZONE: 71-80 - Cookie & auth telemetry
	// =========================================================================
	71: {
		index: 71,
		id: "cookie_expiry_analysis",
		displayName: "Cookie Expiry",
		category: "chrome",
		type: "json",
		color: "⚪",
		defaultValue: null,
		required: false,
		description: "Cookie expiration analysis",
		bunVersion: "1.3.7",
		owner: "infra",
		uriPattern: { pathname: "/chrome/cookies/expiry/:profileId" },
	},
	72: {
		index: 72,
		id: "partition_key_count",
		displayName: "Partitions",
		category: "chrome",
		type: "integer",
		color: "⚪",
		defaultValue: 0,
		required: false,
		description: "CHIPS partition key count",
		bunVersion: "1.3.7",
		owner: "infra",
	},
	73: {
		index: 73,
		id: "third_party_cookie_count",
		displayName: "3P Cookies",
		category: "chrome",
		type: "integer",
		color: "⚪",
		defaultValue: 0,
		required: false,
		description: "Third-party cookie count",
		bunVersion: "1.3.7",
		owner: "infra",
	},
	74: {
		index: 74,
		id: "secure_cookie_ratio",
		displayName: "Secure %",
		category: "chrome",
		type: "float",
		color: "⚪",
		defaultValue: 0.0,
		required: false,
		description: "Ratio of secure cookies",
		bunVersion: "1.3.7",
		owner: "infra",
	},
	75: {
		index: 75,
		id: "auth_domains_with_cookies",
		displayName: "Auth Domains",
		category: "chrome",
		type: "integer",
		color: "🟣",
		defaultValue: 0,
		required: false,
		description: "Auth domains with credentials",
		bunVersion: "1.3.7",
		owner: "platform",
		uriPattern: { pathname: "/chrome/auth-domains/:profileId" },
		linkTemplate: "/chrome/auth-domains/:profileId",
	},
	76: {
		index: 76,
		id: "chrome_state_seal_hash",
		displayName: "Seal Hash",
		category: "chrome",
		type: "hex",
		color: "⚪",
		defaultValue: null,
		required: false,
		description: "CRC32 seal hash",
		bunVersion: "1.3.7",
		owner: "infra",
	},
	77: {
		index: 77,
		id: "rss_feed_generated",
		displayName: "RSS Ready",
		category: "chrome",
		type: "boolean",
		color: "⚪",
		defaultValue: false,
		required: false,
		description: "RSS feed generated flag",
		bunVersion: "1.3.7",
		owner: "infra",
	},
	78: {
		index: 78,
		id: "chrome_profile_version",
		displayName: "Chrome Ver",
		category: "chrome",
		type: "string",
		color: "⚪",
		defaultValue: null,
		required: false,
		description: "Chrome profile format version",
		bunVersion: "1.3.7",
		owner: "infra",
	},
	79: {
		index: 79,
		id: "matrix_sync_timestamp",
		displayName: "Matrix Sync",
		category: "chrome",
		type: "timestamp",
		color: "⚪",
		defaultValue: 0n,
		required: false,
		description: "Last matrix sync timestamp",
		bunVersion: "1.3.7",
		owner: "infra",
	},
	80: {
		index: 80,
		id: "chrome_server_port",
		displayName: "Server Port",
		category: "chrome",
		type: "integer",
		color: "⚪",
		defaultValue: 3457,
		required: false,
		description: "Chrome state server port",
		bunVersion: "1.3.7",
		owner: "infra",
		uriPattern: {
			protocol: "http",
			hostname: "localhost",
			pathname: "/",
			port: ":port",
		},
	},

	// =========================================================================
	// RELEASE ZONE: 81-85 - Release pipeline
	// =========================================================================
	81: {
		index: 81,
		id: "version_bump_type",
		displayName: "Bump Type",
		category: "release",
		type: "enum",
		color: "🔴",
		defaultValue: "patch",
		required: false,
		description: "Semantic version bump type",
		bunVersion: "1.3.7",
		owner: "platform",
	},
	82: {
		index: 82,
		id: "git_tag_created",
		displayName: "Tag Created",
		category: "release",
		type: "boolean",
		color: "🔴",
		defaultValue: false,
		required: false,
		description: "Git tag created flag",
		bunVersion: "1.3.7",
		owner: "platform",
	},
	83: {
		index: 83,
		id: "template_number",
		displayName: "Template #",
		category: "release",
		type: "integer",
		color: "🔴",
		defaultValue: 0,
		required: false,
		description: "Build template number",
		bunVersion: "1.3.7",
		owner: "platform",
	},
	84: {
		index: 84,
		id: "release_profile_uploaded",
		displayName: "Profile Uploaded",
		category: "release",
		type: "boolean",
		color: "🔴",
		defaultValue: false,
		required: false,
		description: "Profile uploaded to R2",
		bunVersion: "1.3.7",
		owner: "platform",
	},
	85: {
		index: 85,
		id: "hot_reload_active",
		displayName: "Hot Reload",
		category: "release",
		type: "boolean",
		color: "🔴",
		defaultValue: false,
		required: false,
		description: "Hot reload server active",
		bunVersion: "1.3.7",
		owner: "platform",
	},

	// =========================================================================
	// MAPPING ZONE: 86-89 - URI mapping & hyperlinks
	// =========================================================================
	86: {
		index: 86,
		id: "hyperlink_count",
		displayName: "Links",
		category: "mapping",
		type: "integer",
		color: "🟢",
		defaultValue: 0,
		required: false,
		description: "Number of hyperlinks in matrix",
		bunVersion: "1.3.7",
		owner: "infra",
	},
	87: {
		index: 87,
		id: "url_pattern_valid",
		displayName: "Patterns OK",
		category: "mapping",
		type: "boolean",
		color: "🟢",
		defaultValue: true,
		required: false,
		description: "All URLPatternInit valid",
		bunVersion: "1.3.7",
		owner: "infra",
	},
	88: {
		index: 88,
		id: "osc8_sequences",
		displayName: "OSC8",
		category: "mapping",
		type: "integer",
		color: "🟢",
		defaultValue: 0,
		required: false,
		description: "OSC 8 hyperlink sequences rendered",
		bunVersion: "1.3.7",
		owner: "infra",
	},
	89: {
		index: 89,
		id: "mapping_version",
		displayName: "Map Version",
		category: "mapping",
		type: "string",
		color: "🟢",
		defaultValue: "v3.26",
		required: false,
		description: "Hyperlink mapping schema version",
		bunVersion: "1.3.7",
		owner: "infra",
	},
} as const;

// ============================================================================
// Helper Types & Exports
// ============================================================================

export type MatrixColumnIndex = keyof typeof MATRIX_COLUMNS_V3_26;
export type MatrixColumn = (typeof MATRIX_COLUMNS_V3_26)[MatrixColumnIndex];

/** Get column by index */
export function getColumn(index: number): HyperlinkColumn | undefined {
	return MATRIX_COLUMNS_V3_26[index];
}

/** Get all columns in a category */
export function getColumnsByCategory(category: ColumnCategory): HyperlinkColumn[] {
	return Object.values(MATRIX_COLUMNS_V3_26).filter((col) => col.category === category);
}

/** Get columns with URI patterns */
export function getLinkedColumns(): HyperlinkColumn[] {
	return Object.values(MATRIX_COLUMNS_V3_26).filter(
		(col) => col.uriPattern || col.linkTemplate,
	);
}

/** Total column count */
export const TOTAL_COLUMNS = Object.keys(MATRIX_COLUMNS_V3_26).length;

/** Default column (col 0) */
export const DEFAULT_COLUMN = MATRIX_COLUMNS_V3_26[0];

/** Column count summary by category */
export const COLUMN_COUNTS = {
	default: 1,
	core: 10,
	security: 5,
	cloudflare: 10,
	tension: 15,
	protocol: 5,
	audit: 5,
	telemetry: 10,
	chrome: 10,
	release: 5,
	mapping: 4,
	total: 90,
} as const;
