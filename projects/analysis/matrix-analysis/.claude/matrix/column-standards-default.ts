/**
 * Tier-1380 OMEGA: DEFAULT Column Standard
 *
 * Universal fallback / baseline / reference value
 * Position: Column 0 (pre-core) or Column 91 (post-extensibility)
 *
 * @module column-standards-default
 * @tier 1380-OMEGA
 */

export const DEFAULT_COLUMN = {
	0: {
		name: "default-value",
		type: "any",
		owner: "infra",
		color: "⚪",
		description: "Fallback / baseline / reference value for this row or context",
		examples: {
			tension: {
				value: 0.0,
				description: "No anomaly (tension-anomaly-score baseline)",
			},
			validation: {
				value: "0%",
				description: "No drift (baseline-delta-percent baseline)",
			},
			security: {
				value: 30,
				description: "Bot score threshold (cf-bot-score-p10 threshold)",
			},
			integrity: {
				value: "STABLE",
				description: "Default status for integrity checks",
			},
			core: {
				value: "ACTIVE",
				description: "Default lifecycle status",
			},
		},
		// Type variants by context
		variants: {
			number: {
				tension: 0.0,
				validation: 0,
				security: 30,
			},
			string: {
				integrity: "STABLE",
				core: "ACTIVE",
				platform: "OK",
			},
			boolean: {
				flags: false,
				checks: true,
			},
		},
		required: false,
		// Grep tag patterns
		grepPatterns: {
			number: "[DEFAULT:{value}]",
			string: '[DEFAULT:"{value}"]',
			boolean: "[DEFAULT:{value}]",
		},
	},
	// Alternative: Column 96 trailing position (after skills zone 89-95)
	91: {
		name: "default-value-trailing",
		type: "any",
		owner: "infra",
		color: "⚪",
		description: "Fallback value (trailing position alternative)",
		alias: 0, // References col 0
		required: false,
	},
	96: {
		name: "default-value-trailing",
		type: "any",
		owner: "infra",
		color: "⚪",
		description: "Fallback value (trailing position, post-skills)",
		alias: 0, // References col 0
		required: false,
	},
} as const;

export type DefaultColumnIndex = 0 | 91 | 96;
export type DefaultColumnName = "default-value";

/**
 * Get default value for a specific zone/context
 */
export function getDefaultValue(
	zone: string,
	type: "number" | "string" | "boolean" = "string",
) {
	const variants = DEFAULT_COLUMN[0].variants;

	switch (type) {
		case "number":
			return variants.number[zone as keyof typeof variants.number] ?? 0;
		case "string":
			return variants.string[zone as keyof typeof variants.string] ?? "UNKNOWN";
		case "boolean":
			return variants.boolean[zone as keyof typeof variants.boolean] ?? false;
		default:
			return null;
	}
}

/**
 * Generate DEFAULT grep tag
 */
export function generateDefaultGrepTag(value: unknown): string {
	const type = typeof value;
	if (type === "string") return `[DEFAULT:"${value}"]`;
	return `[DEFAULT:${value}]`;
}
