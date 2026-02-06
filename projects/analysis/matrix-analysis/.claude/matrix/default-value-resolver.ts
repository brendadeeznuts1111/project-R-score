/**
 * Tier-1380 OMEGA: DEFAULT Value Resolver
 *
 * Runtime fallback logic for matrix columns using DEFAULT column (0)
 * as baseline when zone-specific values are undefined/null
 *
 * @module default-value-resolver
 * @tier 1380-OMEGA
 */

/**
 * DEFAULT value mappings by zone and type
 */
export const DEFAULT_VALUES = {
	tension: {
		number: 0.0,
		string: "0%",
		description: "No anomaly (tension-anomaly-score baseline)",
	},
	validation: {
		number: 0,
		string: "0%",
		description: "No drift (baseline-delta-percent baseline)",
	},
	security: {
		number: 30,
		string: "MEDIUM",
		description: "Bot score threshold / security level",
	},
	integrity: {
		number: 100,
		string: "STABLE",
		description: "Default status for integrity checks",
	},
	core: {
		number: 0,
		string: "ACTIVE",
		description: "Default lifecycle status",
	},
	platform: {
		number: 0,
		string: "OK",
		description: "Default platform status",
	},
	infra: {
		number: 0,
		string: "HEALTHY",
		description: "Default infrastructure status",
	},
	cloudflare: {
		number: 0,
		string: "OK",
		description: "Default Cloudflare status",
	},
	extensibility: {
		number: 0,
		string: "EXTENSIBLE",
		description: "Default extensibility status",
	},
} as const;

/**
 * Get DEFAULT value for a specific zone and type
 */
export function getDefaultValue(
	zone: keyof typeof DEFAULT_VALUES,
	type: "number" | "string" = "number",
): number | string {
	const defaults = DEFAULT_VALUES[zone];
	if (!defaults) {
		return type === "number" ? 0 : "UNKNOWN";
	}
	return defaults[type];
}

/**
 * Resolve a value with DEFAULT fallback
 * If value is undefined/null, returns zone-appropriate default
 */
export function resolveWithDefault<T extends number | string>(
	value: T | undefined | null,
	zone: keyof typeof DEFAULT_VALUES,
	type: T extends number ? "number" : "string",
): T {
	if (value === undefined || value === null) {
		return getDefaultValue(zone, type as "number" | "string") as T;
	}
	return value;
}

/**
 * Resolve tension value (returns 0.0 if undefined)
 */
export function resolveTension(value: number | undefined): number {
	return resolveWithDefault(value, "tension", "number");
}

/**
 * Resolve validation delta (returns "0%" if undefined)
 */
export function resolveValidation(value: string | undefined): string {
	return resolveWithDefault(value, "validation", "string");
}

/**
 * Resolve security threshold (returns 30 if undefined)
 */
export function resolveSecurity(value: number | undefined): number {
	return resolveWithDefault(value, "security", "number");
}

/**
 * Resolve integrity status (returns "STABLE" if undefined)
 */
export function resolveIntegrity(value: string | undefined): string {
	return resolveWithDefault(value, "integrity", "string");
}

/**
 * Batch resolve multiple values with defaults
 */
export function resolveBatch(
	values: Record<string, number | string | undefined>,
	zone: keyof typeof DEFAULT_VALUES,
): Record<string, number | string> {
	const result: Record<string, number | string> = {};

	for (const [key, value] of Object.entries(values)) {
		if (
			typeof value === "number" ||
			(typeof value === "undefined" && key.includes("score"))
		) {
			result[key] = resolveWithDefault(value, zone, "number");
		} else {
			result[key] = resolveWithDefault(value, zone, "string");
		}
	}

	return result;
}

// CLI
if (import.meta.main) {
	console.log("🔥 Tier-1380 OMEGA: DEFAULT Value Resolver\n");

	console.log("Default Values by Zone:\n");
	for (const [zone, defs] of Object.entries(DEFAULT_VALUES)) {
		console.log(`  ${zone.padEnd(15)} number: ${defs.number}, string: "${defs.string}"`);
		console.log(`                 ${defs.description}`);
		console.log();
	}

	console.log("\nExamples:");
	console.log(`  resolveTension(undefined)        → ${resolveTension(undefined)}`);
	console.log(`  resolveValidation(undefined)     → "${resolveValidation(undefined)}"`);
	console.log(`  resolveSecurity(undefined)       → ${resolveSecurity(undefined)}`);
	console.log(`  resolveIntegrity(undefined)      → "${resolveIntegrity(undefined)}"`);
	console.log(`  resolveTension(0.75)             → ${resolveTension(0.75)}`);
}
