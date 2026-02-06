/**
 * Tier-1380 OMEGA: Extended Column Standards (61-90)
 *
 * 95-column matrix expansion with tension, validation, extensibility, and skills zones
 *
 * @module column-standards-extended
 * @tier 1380-OMEGA-90COL
 */

import type { BaseColumn, ColumnCategory, ColumnType } from "./column-standards";

// New categories for 90-column expansion
export type ExtendedColumnCategory =
	| ColumnCategory
	| "tension" // Tension-field & anomaly detection (31-45, expanded)
	| "validation" // Validation density & baseline deltas (61-75)
	| "extensibility" // Future extensibility (76-88)
	| "skills"; // Skills compliance (89-95)

/**
 * Extended column standards for 90-column matrix (columns 61-90)
 * Columns 31-45 are tension-field extensions
 * Columns 61-75 are validation & baseline
 * Columns 76-88 are future extensibility
 * Columns 89-95 are skills compliance (managed in column-standards.ts)
 */
export const EXTENDED_COLUMN_STANDARDS: Record<string, BaseColumn> = {
	// ============================================================================
	// VALIDATION & BASELINE (61-75)
	// ============================================================================
	col_61_header_parse_ms: {
		index: 61,
		id: "header_parse_ms",
		displayName: "Header Parse Time (ms)",
		category: "validation" as ColumnCategory,
		type: "number" as ColumnType,
		defaultValue: 0,
		required: false,
		description: "HTTP header parsing time in milliseconds",
		bunVersion: "1.3.7",
		validate: (v) => typeof v === "number" && v >= 0,
	},

	col_62_invariant_check_count: {
		index: 62,
		id: "invariant_check_count",
		displayName: "Invariant Check Count",
		category: "validation" as ColumnCategory,
		type: "number" as ColumnType,
		defaultValue: 0,
		required: false,
		description: "Number of omega:validate invariant checks performed",
		bunVersion: "1.3.7",
		validate: (v) => typeof v === "number" && v >= 0,
	},

	col_63_baseline_delta_pct: {
		index: 63,
		id: "baseline_delta_pct",
		displayName: "Baseline Delta (%)",
		category: "validation" as ColumnCategory,
		type: "number" as ColumnType,
		defaultValue: 0,
		required: false,
		description: "Percentage deviation from established baseline",
		bunVersion: "1.3.7",
		validate: (v) => typeof v === "number",
	},

	col_64_drift_flag: {
		index: 64,
		id: "drift_flag",
		displayName: "Drift Flag",
		category: "validation" as ColumnCategory,
		type: "boolean" as ColumnType,
		defaultValue: false,
		required: true,
		description: "Baseline drift detected flag",
		bunVersion: "1.3.7",
	},

	col_65_validation_density: {
		index: 65,
		id: "validation_density",
		displayName: "Validation Density",
		category: "validation" as ColumnCategory,
		type: "number" as ColumnType,
		defaultValue: 0,
		required: false,
		description: "Ratio of validated fields to total fields (0-1)",
		bunVersion: "1.3.7",
		validate: (v) => typeof v === "number" && v >= 0 && v <= 1,
	},

	col_66_schema_version: {
		index: 66,
		id: "schema_version",
		displayName: "Schema Version",
		category: "validation" as ColumnCategory,
		type: "string" as ColumnType,
		defaultValue: "1.0.0",
		required: true,
		description: "Current schema validation version",
		bunVersion: "1.3.7",
	},

	col_67_checksum_integrity: {
		index: 67,
		id: "checksum_integrity",
		displayName: "Checksum Integrity",
		category: "validation" as ColumnCategory,
		type: "hex" as ColumnType,
		defaultValue: "0x0",
		required: true,
		description: "SHA-256 checksum of critical data",
		bunVersion: "1.3.7",
	},

	col_68_audit_trail_length: {
		index: 68,
		id: "audit_trail_length",
		displayName: "Audit Trail Length",
		category: "validation" as ColumnCategory,
		type: "number" as ColumnType,
		defaultValue: 0,
		required: false,
		description: "Number of entries in audit trail",
		bunVersion: "1.3.7",
	},

	col_69_compliance_score: {
		index: 69,
		id: "compliance_score",
		displayName: "Compliance Score",
		category: "validation" as ColumnCategory,
		type: "number" as ColumnType,
		defaultValue: 100,
		required: false,
		description: "Compliance percentage score (0-100)",
		bunVersion: "1.3.7",
		validate: (v) => typeof v === "number" && v >= 0 && v <= 100,
	},

	col_70_regression_status: {
		index: 70,
		id: "regression_status",
		displayName: "Regression Status",
		category: "validation" as ColumnCategory,
		type: "enum" as ColumnType,
		defaultValue: "clean",
		required: true,
		description: "Regression test status (clean/detected/investigating)",
		bunVersion: "1.3.7",
	},

	col_71_parser_cache_hit_pct: {
		index: 71,
		id: "parser_cache_hit_pct",
		displayName: "Parser Cache Hit (%)",
		category: "validation" as ColumnCategory,
		type: "number" as ColumnType,
		defaultValue: 0,
		required: false,
		description: "Parser cache hit percentage",
		bunVersion: "1.3.7",
	},

	col_72_validation_errors: {
		index: 72,
		id: "validation_errors",
		displayName: "Validation Errors",
		category: "validation" as ColumnCategory,
		type: "number" as ColumnType,
		defaultValue: 0,
		required: false,
		description: "Count of validation errors in current run",
		bunVersion: "1.3.7",
	},

	col_73_baseline_timestamp: {
		index: 73,
		id: "baseline_timestamp",
		displayName: "Baseline Timestamp",
		category: "validation" as ColumnCategory,
		type: "timestamp" as ColumnType,
		defaultValue: 0n,
		required: false,
		description: "Timestamp of last baseline update",
		bunVersion: "1.3.7",
	},

	col_74_field_coverage_pct: {
		index: 74,
		id: "field_coverage_pct",
		displayName: "Field Coverage (%)",
		category: "validation" as ColumnCategory,
		type: "number" as ColumnType,
		defaultValue: 0,
		required: false,
		description: "Percentage of matrix fields populated",
		bunVersion: "1.3.7",
	},

	col_75_schema_hash: {
		index: 75,
		id: "schema_hash",
		displayName: "Schema Hash",
		category: "validation" as ColumnCategory,
		type: "hex" as ColumnType,
		defaultValue: "0x0",
		required: true,
		description: "Hash of current schema definition",
		bunVersion: "1.3.7",
	},

	// ============================================================================
	// FUTURE EXTENSIBILITY (76-90)
	// ============================================================================
	col_76_profile_link: {
		index: 76,
		id: "profile_link",
		displayName: "Profile Link",
		category: "extensibility" as ColumnCategory,
		type: "string" as ColumnType,
		defaultValue: "",
		required: false,
		description: "URL to CPU profile (--cpu-prof-md output)",
		bunVersion: "1.3.7",
	},

	col_77_cpu_self_time_pct: {
		index: 77,
		id: "cpu_self_time_pct",
		displayName: "CPU Self Time (%)",
		category: "extensibility" as ColumnCategory,
		type: "number" as ColumnType,
		defaultValue: 0,
		required: false,
		description: "CPU self-time percentage from profile",
		bunVersion: "1.3.7",
	},

	col_78_heap_retained_mb: {
		index: 78,
		id: "heap_retained_mb",
		displayName: "Heap Retained (MB)",
		category: "extensibility" as ColumnCategory,
		type: "number" as ColumnType,
		defaultValue: 0,
		required: false,
		description: "Retained heap size in megabytes",
		bunVersion: "1.3.7",
	},

	col_79_wss_latency_ms: {
		index: 79,
		id: "wss_latency_ms",
		displayName: "WSS Latency (ms)",
		category: "extensibility" as ColumnCategory,
		type: "number" as ColumnType,
		defaultValue: 0,
		required: false,
		description: "WebSocket secure latency in milliseconds",
		bunVersion: "1.3.7",
	},

	col_80_gc_pressure_score: {
		index: 80,
		id: "gc_pressure_score",
		displayName: "GC Pressure Score",
		category: "extensibility" as ColumnCategory,
		type: "number" as ColumnType,
		defaultValue: 0,
		required: false,
		description: "Garbage collection pressure indicator (0-100)",
		bunVersion: "1.3.7",
	},

	// Reserved slots for future use
	col_81_reserved_01: {
		index: 81,
		id: "reserved_01",
		displayName: "Reserved Slot 01",
		category: "extensibility" as ColumnCategory,
		type: "string" as ColumnType,
		defaultValue: "",
		required: false,
		description: "Reserved for future expansion (AI-generated rules)",
		bunVersion: "1.3.7",
	},

	col_82_reserved_02: {
		index: 82,
		id: "reserved_02",
		displayName: "Reserved Slot 02",
		category: "extensibility" as ColumnCategory,
		type: "string" as ColumnType,
		defaultValue: "",
		required: false,
		description: "Reserved for future expansion (quantum tension)",
		bunVersion: "1.3.7",
	},

	col_83_reserved_03: {
		index: 83,
		id: "reserved_03",
		displayName: "Reserved Slot 03",
		category: "extensibility" as ColumnCategory,
		type: "string" as ColumnType,
		defaultValue: "",
		required: false,
		description: "Reserved for future expansion",
		bunVersion: "1.3.7",
	},

	col_84_reserved_04: {
		index: 84,
		id: "reserved_04",
		displayName: "Reserved Slot 04",
		category: "extensibility" as ColumnCategory,
		type: "string" as ColumnType,
		defaultValue: "",
		required: false,
		description: "Reserved for future expansion",
		bunVersion: "1.3.7",
	},

	col_85_reserved_05: {
		index: 85,
		id: "reserved_05",
		displayName: "Reserved Slot 05",
		category: "extensibility" as ColumnCategory,
		type: "string" as ColumnType,
		defaultValue: "",
		required: false,
		description: "Reserved for future expansion",
		bunVersion: "1.3.7",
	},

	col_86_reserved_06: {
		index: 86,
		id: "reserved_06",
		displayName: "Reserved Slot 06",
		category: "extensibility" as ColumnCategory,
		type: "string" as ColumnType,
		defaultValue: "",
		required: false,
		description: "Reserved for future expansion",
		bunVersion: "1.3.7",
	},

	col_87_reserved_07: {
		index: 87,
		id: "reserved_07",
		displayName: "Reserved Slot 07",
		category: "extensibility" as ColumnCategory,
		type: "string" as ColumnType,
		defaultValue: "",
		required: false,
		description: "Reserved for future expansion",
		bunVersion: "1.3.7",
	},

	col_88_reserved_08: {
		index: 88,
		id: "reserved_08",
		displayName: "Reserved Slot 08",
		category: "extensibility" as ColumnCategory,
		type: "string" as ColumnType,
		defaultValue: "",
		required: false,
		description: "Reserved for future expansion",
		bunVersion: "1.3.7",
	},

	// Columns 89-95: claimed by "skills" category (see column-standards.ts)

	// ============================================================================
	// SOVEREIGN CHROME PROFILE COLUMNS (96-98) - v1.3.7 Browser Orchestration
	// ============================================================================
	col_96_chrome_dir: {
		index: 96,
		id: "chrome_dir",
		displayName: "Chrome User Data Directory",
		category: "extensibility" as ColumnCategory,
		type: "string" as ColumnType,
		defaultValue: "",
		required: false,
		description:
			"Ephemeral user data directory for sovereign Chrome profile (Matrix Col 57)",
		bunVersion: "1.3.7",
		validate: (v) => typeof v === "string",
	},

	col_97_chrome_status: {
		index: 97,
		id: "chrome_status",
		displayName: "Chrome Session Status",
		category: "extensibility" as ColumnCategory,
		type: "string" as ColumnType,
		defaultValue: "INACTIVE",
		required: false,
		description:
			"Chrome browser session status: INACTIVE | ACTIVE | CLOSED (Matrix Col 58)",
		bunVersion: "1.3.7",
		validate: (v) => ["INACTIVE", "ACTIVE", "CLOSED"].includes(v as string),
	},

	col_98_osc8_chrome: {
		index: 98,
		id: "osc8_chrome",
		displayName: "OSC 8 Chrome Deep Link",
		category: "extensibility" as ColumnCategory,
		type: "string" as ColumnType,
		defaultValue: "",
		required: false,
		description: "OSC 8 hyperlink for terminal-to-Chrome handover (Matrix Col 59)",
		bunVersion: "1.3.7",
		validate: (v) => typeof v === "string" && (v as string).startsWith("file://"),
	},
};

// Zone mappings for visualization
export const COLUMN_ZONES_90 = {
	core: { start: 1, end: 10, color: "\x1b[38;5;75m", emoji: "🔵" },
	security: { start: 11, end: 20, color: "\x1b[38;5;203m", emoji: "🔴" },
	storage: { start: 21, end: 30, color: "\x1b[38;5;141m", emoji: "🟣" },
	tension: { start: 31, end: 45, color: "\x1b[38;5;208m", emoji: "🟠" },
	compute: { start: 31, end: 40, color: "\x1b[38;5;78m", emoji: "🟢" },
	protocol: { start: 41, end: 50, color: "\x1b[38;5;81m", emoji: "🔵" },
	hardware: { start: 51, end: 55, color: "\x1b[38;5;120m", emoji: "🟢" },
	audit: { start: 56, end: 60, color: "\x1b[38;5;183m", emoji: "🟡" },
	validation: { start: 61, end: 75, color: "\x1b[38;5;220m", emoji: "🟡" },
	extensibility: { start: 76, end: 88, color: "\x1b[38;5;250m", emoji: "⚪" },
	skills: { start: 89, end: 95, color: "\x1b[38;5;159m", emoji: "📝" },
};

export function getZoneForColumn(index: number): keyof typeof COLUMN_ZONES_90 | null {
	for (const [zone, range] of Object.entries(COLUMN_ZONES_90)) {
		if (index >= range.start && index <= range.end) {
			return zone as keyof typeof COLUMN_ZONES_90;
		}
	}
	return null;
}
