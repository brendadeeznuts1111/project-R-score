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
		console.log("╔════════════════════════════════════════════════════════╗");
		console.log("║     Tier-1380 OMEGA Commit Message Validation          ║");
		console.log("╚════════════════════════════════════════════════════════╝");
		console.log();
		console.log("Usage:");
		console.log('  bun validate-message.ts "[RUNTIME][CHROME][TIER:1380] Fix entropy"');
		console.log(
			'  bun validate-message.ts "[MARKET][MICROSTRUCTURE][FEAT][META:{TIER:1380}][Analyzer][detect][T11][#REF:52][BUN-NATIVE] Hidden Steam T11_v2"',
		);
		console.log();
		console.log("Formats:");
		console.log("  Legacy:   [DOMAIN][COMPONENT:NAME][TIER:XXXX] Description");
		console.log(
			"  Extended: [DOMAIN][SCOPE][TYPE][META:{TIER:XXXX}][Class][func][Iface][#REF:N][BUN-NATIVE] Description",
		);
		process.exit(1);
	}

	const result = validateCommitMessage(message);

	console.log("╔════════════════════════════════════════════════════════╗");
	console.log("║     Tier-1380 OMEGA Commit Message Validation          ║");
	console.log("╚════════════════════════════════════════════════════════╝");
	console.log();
	console.log(`Message: ${message.slice(0, 80)}${message.length > 80 ? "..." : ""}`);
	console.log(`Format:  ${result.format.toUpperCase()}`);
	console.log();

	if (result.valid) {
		console.log("✅ Message format is VALID");

		if (result.parsed) {
			console.log("\nParsed Components:");
			console.log(`  Domain:     ${result.parsed.domain}`);
			console.log(`  Scope:      ${result.parsed.scope}`);
			console.log(`  Type:       ${result.parsed.type}`);
			console.log(`  META:       ${JSON.stringify(result.parsed.meta)}`);
			if (result.parsed.className)
				console.log(`  Class:      ${result.parsed.className}`);
			if (result.parsed.functionName)
				console.log(`  Function:   ${result.parsed.functionName}`);
			if (result.parsed.interfaceName)
				console.log(`  Interface:  ${result.parsed.interfaceName}`);
			if (result.parsed.ref) console.log(`  Ref:        ${result.parsed.ref}`);
			if (result.parsed.bunNative) console.log(`  Bun-Native: ✅`);
			console.log(`  Subject:    ${result.parsed.subject.slice(0, 50)}...`);
		}
	} else {
		console.log("❌ Message format is INVALID");
	}

	if (result.errors.length > 0) {
		console.log("\nErrors:");
		for (const error of result.errors) {
			console.log(`  ❌ ${error}`);
		}
	}

	if (result.warnings.length > 0) {
		console.log("\nWarnings:");
		for (const warning of result.warnings) {
			console.log(`  ⚠️  ${warning}`);
		}
	}

	if (result.valid && result.warnings.length === 0) {
		console.log("\n✨ Perfect commit message!");
	}

	console.log();
	process.exit(result.valid ? 0 : 1);
}

export { validateCommitMessage, VALID_DOMAINS, VALID_COMPONENTS };
