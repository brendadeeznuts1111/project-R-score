/**
 * Tier-1380 OMEGA: Validation Column Standards (61-75)
 *
 * Validation Density & Baseline Deltas
 *
 * @module column-standards-validation
 * @tier 1380-OMEGA
 */

export const VALIDATION_COLUMNS = {
	61: {
		name: "header-parse-ms",
		type: "ms",
		owner: "validation",
		color: "🟡",
		description: "HTTP header parsing time in milliseconds",
		warning: "> 50",
		critical: "> 100",
		required: false,
	},
	62: {
		name: "invariant-check-count",
		type: "integer",
		owner: "validation",
		color: "🟡",
		description: "Number of omega:validate invariant checks performed",
		required: false,
	},
	63: {
		name: "baseline-delta-percent",
		type: "percent",
		owner: "validation",
		color: "🟡",
		description: "Percentage deviation from established baseline",
		warning: "> 5%",
		critical: "> 15%",
		range: [-100, 1000],
		required: true,
	},
	64: {
		name: "validation-drift-flag",
		type: "boolean",
		owner: "validation",
		color: "🟡",
		trigger: "delta > threshold",
		description: "Baseline drift detected flag",
		required: false,
	},
	65: {
		name: "schema-version",
		type: "semver",
		owner: "validation",
		color: "🟡",
		description: "Current schema validation version",
		example: "2.1.0",
		required: true,
	},
	66: {
		name: "field-population-percent",
		type: "percent",
		owner: "validation",
		color: "🟡",
		description: "Percentage of matrix fields populated",
		range: [0, 100],
		required: false,
	},
	67: {
		name: "last-validation-timestamp",
		type: "timestamp",
		owner: "validation",
		color: "🟡",
		description: "Last successful validation timestamp",
		required: false,
	},
	68: {
		name: "validation-errors-count",
		type: "integer",
		owner: "validation",
		color: "🟡",
		description: "Count of validation errors in current run",
		warning: "> 0",
		required: false,
	},
	69: {
		name: "compliance-score",
		type: "percent",
		owner: "validation",
		color: "🟡",
		description: "Compliance percentage score",
		range: [0, 100],
		warning: "< 95%",
		critical: "< 80%",
		required: true,
	},
	70: {
		name: "regression-status",
		type: "enum",
		owner: "validation",
		color: "🟡",
		values: ["CLEAN", "DETECTED", "INVESTIGATING", "RESOLVED"],
		description: "Regression test status",
		required: true,
	},
	71: {
		name: "baseline-timestamp",
		type: "timestamp",
		owner: "validation",
		color: "🟡",
		description: "Timestamp of last baseline update",
		required: false,
	},
	72: {
		name: "validation-cache-hit-percent",
		type: "percent",
		owner: "validation",
		color: "🟡",
		description: "Validation cache hit percentage",
		range: [0, 100],
		required: false,
	},
	73: {
		name: "schema-hash",
		type: "hex",
		owner: "validation",
		color: "🟡",
		description: "SHA-256 hash of current schema definition",
		format: "0x...",
		required: true,
	},
	74: {
		name: "audit-trail-length",
		type: "integer",
		owner: "validation",
		color: "🟡",
		description: "Number of entries in audit trail",
		required: false,
	},
	75: {
		name: "validation-signature",
		type: "hex",
		owner: "validation",
		color: "🟡",
		description: "HMAC signature of validation result",
		format: "0x...",
		required: false,
	},
} as const;

export type ValidationColumnIndex = keyof typeof VALIDATION_COLUMNS;
export type ValidationColumnName =
	(typeof VALIDATION_COLUMNS)[ValidationColumnIndex]["name"];
