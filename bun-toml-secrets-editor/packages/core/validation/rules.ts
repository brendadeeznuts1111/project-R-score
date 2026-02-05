// Advanced Tiered Validation Engine
import type { ParsedProfileName, ProfileConfig } from "../cli/commands";
import { logger } from "../utils/logger";

export type Severity = "error" | "warning" | "info";
export type Context =
	| "production"
	| "staging"
	| "development"
	| "ci"
	| "local"
	| "testing";

export interface ValidationRule {
	id: string;
	name: string;
	description: string;
	severity: Severity;
	contexts: Context[]; // Which environments this applies to
	check: (
		profile: ProfileConfig,
		context: Context,
		parsedName?: ParsedProfileName,
	) => boolean | Promise<boolean>;
	fix?: (profile: ProfileConfig) => ProfileConfig; // Auto-fix if possible
	recommendation?: string; // Actionable guidance
}

/**
 * High-entropy detection for secrets
 */
function isHighEntropy(value: string): boolean {
	if (value.length < 16) return false;

	// Calculate Shannon entropy
	const chars = new Set(value);
	let entropy = 0;

	// Convert Set to array for compatibility
	const charArray = Array.from(chars);
	for (const char of charArray) {
		const probability = value.split(char).length - 1 / value.length;
		entropy -= probability * Math.log2(probability);
	}

	return entropy > 3.5; // High entropy threshold
}

/**
 * Context-aware validation rules with tiered severity
 */
export const VALIDATION_RULES: ValidationRule[] = [
	// CRITICAL: Always block - Security risks
	{
		id: "no-plaintext-secrets",
		name: "Secrets Not Encrypted",
		description: "High-entropy values detected without encryption",
		severity: "error",
		contexts: ["production", "staging", "development"],
		check: (p) =>
			!Object.entries(p.config).some(
				([k, v]) =>
					isHighEntropy(String(v)) &&
					!k.toUpperCase().includes("PUBLIC") &&
					!String(v).startsWith("enc:") &&
					!String(v).startsWith("vault:") &&
					!String(v).startsWith("aws:"),
			),
		recommendation:
			"Encrypt secrets with: matrix profile encrypt <profile-name>",
	},

	// PRODUCTION ONLY: Strict enforcement
	{
		id: "prod-debug-disabled",
		name: "Debug Mode in Production",
		description: "DEBUG or LOG_LEVEL set to verbose in production",
		severity: "error",
		contexts: ["production"],
		check: (p) => {
			const debug = String(p.config.DEBUG || "").toLowerCase();
			const logLevel = String(p.config.LOG_LEVEL || "").toLowerCase();
			return (
				!["debug", "trace", "verbose"].includes(debug) &&
				!["debug", "trace", "verbose"].includes(logLevel)
			);
		},
		recommendation:
			"Remove DEBUG=true and set LOG_LEVEL=info or warn in production",
	},

	{
		id: "prod-no-test-config",
		name: "Test Config in Production",
		description: "Test-specific configuration detected in production",
		severity: "error",
		contexts: ["production"],
		check: (p) =>
			!Object.keys(p.config).some(
				(k) =>
					/test|mock|fake|debug|dev/i.test(k) &&
					!["TEST_MODE", "TESTING"].includes(k.toUpperCase()),
			),
		recommendation: "Remove test-specific configurations from production",
	},

	{
		id: "prod-backup-required",
		name: "Backup Required in Production",
		description: "Production environment requires backup configuration",
		severity: "error",
		contexts: ["production"],
		check: (p) =>
			p.config.backup === true ||
			p.config.backup_enabled === true ||
			p.metadata.tags?.includes("backup-config"),
		recommendation: "Enable backup with: backup=true and add backup-config tag",
	},

	// WARNING: Overrideable with --force
	{
		id: "missing-healthcheck",
		name: "No Healthcheck URL",
		description: "Production profile missing HEALTHCHECK_URL",
		severity: "warning",
		contexts: ["production", "staging"],
		check: (p) => !!p.config.HEALTHCHECK_URL || !!p.config.health_check_url,
		recommendation:
			"Add HEALTHCHECK_URL for monitoring and load balancer health checks",
	},

	{
		id: "missing-monitoring",
		name: "Monitoring Not Configured",
		description: "Production/staging missing monitoring configuration",
		severity: "warning",
		contexts: ["production", "staging"],
		check: (p) =>
			p.config.monitoring === true ||
			p.config.enable_monitoring === true ||
			p.config.PROMETHEUS_ENABLED === "true",
		recommendation:
			"Enable monitoring with: monitoring=true or PROMETHEUS_ENABLED=true",
	},

	{
		id: "short-session-secret",
		name: "Session Secret Too Short",
		description: "SESSION_SECRET should be at least 32 characters",
		severity: "warning",
		contexts: ["production", "staging"],
		check: (p) => {
			const secret = String(
				p.config.SESSION_SECRET || p.config.session_secret || "",
			);
			return !secret || secret.length >= 32;
		},
		recommendation: "Generate a secure 64+ character session secret",
	},

	{
		id: "compliance-tags-missing",
		name: "Compliance Tags Missing",
		description: "Production should include compliance framework tags",
		severity: "warning",
		contexts: ["production"],
		check: (p) => {
			const requiredTags = ["GDPR", "SOC2", "ISO27001", "HIPAA"];
			const profileTags = p.metadata.tags || [];
			return requiredTags.some((tag) => profileTags.includes(tag));
		},
		recommendation: "Add relevant compliance tags: GDPR, SOC2, ISO27001, HIPAA",
	},

	// INFO: Best practices and suggestions
	{
		id: "naming-convention",
		name: "Naming Convention",
		description:
			"Profile name does not follow {env}-{service}-{purpose} format",
		severity: "info",
		contexts: ["production", "staging", "development", "ci"],
		check: (_p, _, parsedName) => {
			if (!parsedName) return true;
			return (
				parsedName.environment !== "unknown" &&
				parsedName.project !== "unknown" &&
				parsedName.purpose !== "default"
			);
		},
		recommendation:
			"Use format: {environment}-{project}-{purpose} (e.g., production-api-web)",
	},

	{
		id: "missing-description",
		name: "No Description",
		description: "Profile lacks description for discoverability",
		severity: "info",
		contexts: ["production", "staging", "development"],
		check: (p) =>
			!!p.metadata.description && p.metadata.description.length > 10,
		recommendation: "Add a descriptive profile metadata description",
	},

	{
		id: "performance-timeouts",
		name: "Timeout Configuration",
		description: "Check if timeout values are reasonable",
		severity: "info",
		contexts: ["production", "staging", "development"],
		check: (p) => {
			const timeoutKeys = Object.keys(p.config).filter((k) =>
				/timeout|deadline/i.test(k),
			);
			return !timeoutKeys.some((k) => {
				const value = Number(p.config[k]);
				return Number.isNaN(value) || value < 1000 || value > 300000; // 1s to 5min
			});
		},
		recommendation: "Set timeout values between 1 second and 5 minutes",
	},
];

/**
 * Context-aware profile validation with tiered severity
 */
export async function validateProfile(
	profile: ProfileConfig,
	context: Context,
	parsedName?: ParsedProfileName,
	options: { force?: boolean } = {},
): Promise<{
	valid: boolean;
	errors: string[];
	warnings: string[];
	info: string[];
	appliedRules: string[];
	complianceScore: number;
}> {
	const errors: string[] = [];
	const warnings: string[] = [];
	const info: string[] = [];
	const appliedRules: string[] = [];
	let complianceScore = 100;

	logger.info(
		`🔍 Applying ${VALIDATION_RULES.length} context-aware validation rules for ${context}...`,
	);

	for (const rule of VALIDATION_RULES) {
		if (!rule.contexts.includes(context)) {
			continue; // Rule doesn't apply to this context
		}

		appliedRules.push(rule.id);

		try {
			const passed = await rule.check(profile, context, parsedName);

			if (passed) {
				logger.info(`   ✅ ${rule.name} (${rule.severity})`);
			} else {
				const message = `[${rule.severity.toUpperCase()}] ${rule.name}: ${rule.description}`;

				if (rule.severity === "error") {
					errors.push(message);
					complianceScore -= 20;
					logger.error(`   ❌ ${rule.name} (${rule.severity}) - BLOCKING`);
				} else if (rule.severity === "warning") {
					warnings.push(message);
					complianceScore -= 10;
					logger.warn(`   ⚠️  ${rule.name} (${rule.severity}) - OVERRIDABLE`);
				} else {
					info.push(message);
					logger.info(`   ℹ️  ${rule.name} (${rule.severity}) - INFO`);
				}

				// Show recommendation if available
				if (rule.recommendation) {
					logger.info(`      💡 ${rule.recommendation}`);
				}
			}
		} catch (error) {
			logger.error(
				`   🔧 ${rule.name} - Rule execution error: ${error instanceof Error ? error.message : String(error)}`,
			);
			info.push(`[VALIDATION] Error executing rule ${rule.name}`);
			complianceScore -= 5;
		}
	}

	// Determine validity based on errors and force flag
	const hasBlockingErrors = errors.length > 0;
	const hasWarningsOnly = warnings.length > 0 && errors.length === 0;

	const valid = !hasBlockingErrors && (options.force || !hasWarningsOnly);

	return {
		valid,
		errors,
		warnings,
		info,
		appliedRules,
		complianceScore: Math.max(0, complianceScore),
	};
}

/**
 * Detect context from profile name and configuration
 */
export function detectContext(
	profile: ProfileConfig,
	parsedName?: ParsedProfileName,
): Context {
	// First check explicit environment
	if (profile.environment) {
		const env = profile.environment.toLowerCase();
		if (env.includes("prod")) return "production";
		if (env.includes("stage")) return "staging";
		if (env.includes("dev")) return "development";
		if (env.includes("test")) return "testing";
		if (env.includes("local")) return "local";
		if (env.includes("ci")) return "ci";
	}

	// Check parsed name
	if (parsedName) {
		const env = parsedName.environment.toLowerCase();
		if (env.includes("prod")) return "production";
		if (env.includes("stage")) return "staging";
		if (env.includes("dev")) return "development";
		if (env.includes("test")) return "testing";
		if (env.includes("local")) return "local";
	}

	// Check configuration hints
	if (profile.config.NODE_ENV === "production") return "production";
	if (profile.config.NODE_ENV === "staging") return "staging";
	if (profile.config.NODE_ENV === "development") return "development";
	if (profile.config.NODE_ENV === "test") return "testing";

	// Default to development
	return "development";
}
