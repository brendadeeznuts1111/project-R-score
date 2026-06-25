#!/usr/bin/env bun
/**
 * Validate Tier-1380 OMEGA Commit Message Format
 * Supports both legacy and extended formats
 *
 * Usage:
 *   bun validate-message.ts "[RUNTIME][CHROME][TIER:1380] Fix entropy"
 *   bun validate-message.ts "[MARKET][MICROSTRUCTURE:PATTERNS][FEAT][META:{TIER:1380}][MarketAnalyzer][detectSteam][T11][#REF:52][BUN-NATIVE] Hidden Steam T11_v2"
 */

import {
	type ExtendedCommitMessage,
	parseExtendedCommit,
	validateExtendedMessage,
} from "../../tier1380-omega/scripts/factory-wager-manifest";

const VALID_DOMAINS = [
	"RUNTIME",
	"PLATFORM",
	"SECURITY",
	"API",
	"UI",
	"DOCS",
	"CONFIG",
	"TEST",
	"BENCH",
	"STYLE",
	// Extended format domains
	"MARKET",
	"INFRA",
	"SKILLS",
	"MICROSTRUCTURE",
] as const;

const VALID_COMPONENTS = [
	"CHROME",
	"MATRIX",
	"BLAST",
	"TELEMETRY",
	"SKILLS",
	"KIMI",
	"BUILD",
	"DEPLOY",
	"COLOR",
	"PALETTE",
	"ACCESSIBILITY",
	"WEBSOCKET",
	"R2",
	"CLI",
	"AGENT",
] as const;

interface ValidationResult {
	valid: boolean;
	format: "legacy" | "extended" | "invalid";
	errors: string[];
	warnings: string[];
	parsed?: ExtendedCommitMessage;
}

function validateLegacyFormat(message: string): ValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	const pattern = /^\[([A-Z]+)\]\[COMPONENT:([A-Z]+)\]\[TIER:(\d+)\] (.+)$/;
	const match = message.match(pattern);

	if (!match) {
		errors.push("Legacy format: [DOMAIN][COMPONENT:NAME][TIER:XXXX] Description");
		return { valid: false, format: "invalid", errors, warnings };
	}

	const [, domain, component, tier, description] = match;

	if (!VALID_DOMAINS.includes(domain as any)) {
		errors.push(`Invalid domain: ${domain}. Valid: ${VALID_DOMAINS.join(", ")}`);
	}

	if (!VALID_COMPONENTS.includes(component as any)) {
		errors.push(
			`Invalid component: ${component}. Valid: ${VALID_COMPONENTS.join(", ")}`,
		);
	}

	const tierNum = Number(tier);
	if (Number.isNaN(tierNum) || tierNum < 100 || tierNum > 9999) {
		errors.push(`Invalid tier: ${tier}. Must be 100-9999`);
	}

	if (description.length > 72) {
		warnings.push(`Description is ${description.length} chars (recommended: <= 72)`);
	}

	if (description.endsWith(".")) {
		warnings.push("Description should not end with period");
	}

	if (description[0]?.toLowerCase() === description[0]) {
		warnings.push("Description should start with uppercase");
	}

	return {
		valid: errors.length === 0,
		format: "legacy",
		errors,
		warnings,
	};
}

function validateCommitMessage(message: string): ValidationResult {
	// Try extended format first
	const extended = validateExtendedMessage(message);
	if (extended.valid && extended.format === "extended") {
		const parsed = parseExtendedCommit(message);
		return {
			valid: true,
			format: "extended",
			errors: [],
			warnings: [],
			parsed: parsed || undefined,
		};
	}

	// Fall back to legacy
	return validateLegacyFormat(message);
}

// Main
if (import.meta.main) {
	const message = Bun.argv[2];

	if (!message) {
		console.info("╔════════════════════════════════════════════════════════╗");
		console.info("║     Tier-1380 OMEGA Commit Message Validation          ║");
		console.info("╚════════════════════════════════════════════════════════╝");
		console.info();
		console.info("Usage:");
		console.info('  bun validate-message.ts "[RUNTIME][CHROME][TIER:1380] Fix entropy"');
		console.info(
			'  bun validate-message.ts "[MARKET][MICROSTRUCTURE][FEAT][META:{TIER:1380}][Analyzer][detect][T11][#REF:52][BUN-NATIVE] Hidden Steam T11_v2"',
		);
		console.info();
		console.info("Formats:");
		console.info("  Legacy:   [DOMAIN][COMPONENT:NAME][TIER:XXXX] Description");
		console.info(
			"  Extended: [DOMAIN][SCOPE][TYPE][META:{TIER:XXXX}][Class][func][Iface][#REF:N][BUN-NATIVE] Description",
		);
		process.exit(1);
	}

	const result = validateCommitMessage(message);

	console.info("╔════════════════════════════════════════════════════════╗");
	console.info("║     Tier-1380 OMEGA Commit Message Validation          ║");
	console.info("╚════════════════════════════════════════════════════════╝");
	console.info();
	console.info(`Message: ${message.slice(0, 80)}${message.length > 80 ? "..." : ""}`);
	console.info(`Format:  ${result.format.toUpperCase()}`);
	console.info();

	if (result.valid) {
		console.info("✅ Message format is VALID");

		if (result.parsed) {
			console.info("\nParsed Components:");
			console.info(`  Domain:     ${result.parsed.domain}`);
			console.info(`  Scope:      ${result.parsed.scope}`);
			console.info(`  Type:       ${result.parsed.type}`);
			console.info(`  META:       ${JSON.stringify(result.parsed.meta)}`);
			if (result.parsed.className)
				console.info(`  Class:      ${result.parsed.className}`);
			if (result.parsed.functionName)
				console.info(`  Function:   ${result.parsed.functionName}`);
			if (result.parsed.interfaceName)
				console.info(`  Interface:  ${result.parsed.interfaceName}`);
			if (result.parsed.ref) console.info(`  Ref:        ${result.parsed.ref}`);
			if (result.parsed.bunNative) console.info(`  Bun-Native: ✅`);
			console.info(`  Subject:    ${result.parsed.subject.slice(0, 50)}...`);
		}
	} else {
		console.info("❌ Message format is INVALID");
	}

	if (result.errors.length > 0) {
		console.info("\nErrors:");
		for (const error of result.errors) {
			console.info(`  ❌ ${error}`);
		}
	}

	if (result.warnings.length > 0) {
		console.info("\nWarnings:");
		for (const warning of result.warnings) {
			console.info(`  ⚠️  ${warning}`);
		}
	}

	if (result.valid && result.warnings.length === 0) {
		console.info("\n✨ Perfect commit message!");
	}

	console.info();
	process.exit(result.valid ? 0 : 1);
}

export { validateCommitMessage, VALID_DOMAINS, VALID_COMPONENTS };
