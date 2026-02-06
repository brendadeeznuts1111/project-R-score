/**
 * Tier-1380 OMEGA: Core Column Standards (1-10)
 *
 * Core / Runtime / Header invariants
 *
 * @module column-standards-core
 * @tier 1380-OMEGA
 */

export const CORE_COLUMNS = {
	1: {
		name: "scope",
		type: "enum",
		owner: "runtime",
		color: "🔵",
		values: ["GOV", "SEC", "OPS", "ALERT", "PLATFORM", "TENSION", "VALIDATION"],
		description: "Matrix scope classification",
		required: true,
	},
	2: {
		name: "type",
		type: "enum",
		owner: "runtime",
		color: "🔵",
		values: ["RULES", "STATS", "SUMMARY", "FULL", "ANOMALY", "PROFILE"],
		description: "Entry type classification",
		required: true,
	},
	3: {
		name: "status",
		type: "enum",
		owner: "runtime",
		color: "🔵",
		values: ["ACTIVE", "DRAFT", "DEPRECATED", "STABLE"],
		description: "Lifecycle status",
		required: true,
	},
	4: {
		name: "version",
		type: "semver",
		owner: "runtime",
		color: "🔵",
		description: "Semantic version",
		example: "1.3.7",
		required: true,
	},
	5: {
		name: "crc32-seal",
		type: "hex",
		owner: "infra",
		color: "🟢",
		description: "CRC32 integrity seal",
		format: "0xXXXXXXXX",
		required: true,
	},
	6: {
		name: "required-flag",
		type: "boolean",
		owner: "runtime",
		color: "🔵",
		description: "Required field indicator",
		required: true,
	},
	7: {
		name: "timestamp",
		type: "timestamp",
		owner: "runtime",
		color: "🔵",
		description: "Unix timestamp (milliseconds)",
		required: true,
	},
	8: {
		name: "environment",
		type: "enum",
		owner: "runtime",
		color: "🔵",
		values: ["prod", "staging", "dev", "test"],
		description: "Deployment environment",
		required: true,
	},
	9: {
		name: "tier-level",
		type: "enum",
		owner: "runtime",
		color: "🔵",
		values: ["950", "1320", "1370", "1380"],
		description: "OMEGA tier classification",
		required: true,
	},
	10: {
		name: "checksum-header",
		type: "hex",
		owner: "runtime",
		color: "🔵",
		description: "Header checksum validation",
		format: "0xXXXXXXXX",
		required: false,
	},
} as const;

export type CoreColumnIndex = keyof typeof CORE_COLUMNS;
export type CoreColumnName = (typeof CORE_COLUMNS)[CoreColumnIndex]["name"];
