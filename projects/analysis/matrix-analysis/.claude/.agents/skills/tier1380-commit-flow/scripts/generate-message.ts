#!/usr/bin/env bun
/**
 * Generate Tier-1380 OMEGA Commit Message
 * Based on staged changes with smart domain/component detection
 */

import { $ } from "bun";

interface ChangeAnalysis {
	files: string[];
	domains: string[];
	components: string[];
	types: string[];
	tier: string;
	description: string;
}

// Domain detection patterns
const DOMAIN_PATTERNS: Record<string, RegExp[]> = {
	RUNTIME: [/src\//, /runtime/, /bun\./, /tools\/.*registry/, /examples\//],
	PLATFORM: [/tools\//, /skills\//, /\.matrix\//, /\.claude\//, /config\//],
	SECURITY: [/security/, /auth/, /crypt/, /secret/, /password/],
	API: [/api\//, /endpoint/, /route/, /handler/],
	UI: [/ui\//, /dashboard/, /component/, /\.svelte/, /\.tsx/],
	DOCS: [/docs\//, /README/, /\.md$/],
	TEST: [/test/, /\.test\./, /\.spec\./, /__tests__/],
	BENCH: [/benchmark/, /perf/, /speed/],
	CONFIG: [/config\//, /\.json$/, /\.toml$/, /\.yaml$/],
	INFRA: [/\.github\//, /docker/, /deploy/, /infra/],
	OPENCLAW: [/openclaw/, /claw/, /gateway/],
};

// Component detection patterns
const COMPONENT_PATTERNS: Record<string, RegExp[]> = {
	CHROME: [/chrome/, /col_7[0-5]/, /entropy/, /state/],
	MATRIX: [/matrix/, /col_/, /column/, /tier.?1380/],
	BLAST: [/blast/, /omega.?blast/, /benchmark/],
	TELEMETRY: [/telemetry/, /wss/, /websocket/, /live/],
	SKILLS: [/skill/, /\.kimi\/skills/],
	KIMI: [/kimi/, /cli/],
	BUILD: [/build/, /compile/, /bundle/],
	DEPLOY: [/deploy/, /release/, /publish/],
	COLOR: [/color/, /palette/, /wcag/, /contrast/],
	ACCESSIBILITY: [/a11y/, /accessibility/, /aria/, /screen.?reader/],
	R2: [/r2/, /s3/, /storage/, /bucket/],
	REGISTRY: [/registry/, /Bun\.s3/, /upload/, /download/],
	CLI: [/cli/, /command/, /arg/, /flag/],
	AGENT: [/agent/, /matrix.?agent/, /clawdbot/],
	TELEGRAM: [/telegram/, /bot/, /tg/, /message/],
	GATEWAY: [/gateway/, /server/, /listen/, /serve/],
	MONITORING: [/monitor/, /health/, /status/, /metric/],
	MCP: [/mcp/, /model.?context/, /protocol/],
	SSE: [/sse/, /event.?stream/, /alert/],
	VALIDATION: [/valid/, /schema/, /check/, /enforce/],
};

// Type detection patterns
const TYPE_PATTERNS: Record<string, RegExp[]> = {
	FIX: [/fix/, /bug/, /error/, /broken/, /crash/],
	FEAT: [/add/, /new/, /implement/, /feature/],
	REFACTOR: [/refactor/, /restructure/, /clean/, /simplify/],
	PERF: [/perf/, /speed/, /fast/, /optim/, /cache/],
	DOCS: [/doc/, /comment/, /readme/, /guide/],
	TEST: [/test/, /spec/, /coverage/, /mock/],
	CHORE: [/chore/, /update/, /bump/, /maintain/],
	STYLE: [/style/, /format/, /lint/, /biome/],
};

async function analyzeChanges(): Promise<ChangeAnalysis> {
	// Get staged files
	const output = await $`git diff --cached --name-only`.text().catch(() => "");
	const files = output.trim().split("\n").filter(Boolean);

	if (files.length === 0) {
		return {
			files: [],
			domains: [],
			components: [],
			types: [],
			tier: "1380",
			description: "No changes",
		};
	}

	// Determine characteristics from files
	const domains = determineMatches(files, DOMAIN_PATTERNS);
	const components = determineMatches(files, COMPONENT_PATTERNS);
	const types = determineMatches(files, TYPE_PATTERNS);
	const tier = "1380";
	const description = generateDescription(files, types);

	return { files, domains, components, types, tier, description };
}

function determineMatches(
	files: string[],
	patterns: Record<string, RegExp[]>,
): string[] {
	const matches = new Map<string, number>();

	for (const file of files) {
		for (const [name, regexes] of Object.entries(patterns)) {
			for (const regex of regexes) {
				if (regex.test(file)) {
					matches.set(name, (matches.get(name) || 0) + 1);
					break;
				}
			}
		}
	}

	// Sort by frequency
	return Array.from(matches.entries())
		.sort((a, b) => b[1] - a[1])
		.map(([name]) => name);
}

function generateDescription(files: string[], types: string[]): string {
	const type = types[0] || "Update";
	const extensions = new Map<string, number>();

	for (const file of files) {
		const ext = file.split(".").pop() || "";
		extensions.set(ext, (extensions.get(ext) || 0) + 1);
	}

	const mainExt = Array.from(extensions.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];

	if (files.length === 1) {
		const filename =
			files[0]
				?.split("/")
				.pop()
				?.replace(/\.(ts|js|json|md)$/, "") || "file";
		return `${type} ${filename}`;
	}

	if (files.length <= 3) {
		return `${type} ${files.length} files`;
	}

	if (mainExt) {
		return `${type} ${mainExt} files (${files.length} files)`;
	}

	return `${type} ${files.length} files`;
}

function generateSuggestions(analysis: ChangeAnalysis): string[] {
	const domain = analysis.domains[0] || "PLATFORM";
	const component = analysis.components[0] || "MATRIX";
	const type = analysis.types[0] || "FEAT";
	const tier = analysis.tier;
	const desc = analysis.description;

	const suggestions: string[] = [];

	// Standard format
	suggestions.push(`[${domain}][COMPONENT:${component}][TIER:${tier}] ${desc}`);

	// With type
	if (type !== "FEAT") {
		suggestions.push(
			`[${domain}][COMPONENT:${component}][TIER:${tier}] ${type} ${desc.toLowerCase().replace(`${type} `, "")}`,
		);
	}

	// Extended format
	suggestions.push(
		`[${domain}][${component}][${type}][META:{TIER:${tier}}] ${desc} [BUN-NATIVE]`,
	);

	return suggestions;
}

// Main
if (import.meta.main) {
	console.log("🔍 Analyzing staged changes...\n");

	const analysis = await analyzeChanges();

	if (analysis.files.length === 0) {
		console.log("❌ No staged changes found.");
		console.log();
		console.log("Stage files first:");
		console.log("  git add <files>");
		process.exit(1);
	}

	console.log("Files changed:");
	for (const file of analysis.files.slice(0, 10)) {
		console.log(`  • ${file}`);
	}
	if (analysis.files.length > 10) {
		console.log(`  ... and ${analysis.files.length - 10} more`);
	}

	console.log();
	console.log("Analysis:");
	console.log(`  Domain:     ${analysis.domains.join(", ") || "PLATFORM (default)"}`);
	console.log(`  Component:  ${analysis.components.join(", ") || "MATRIX (default)"}`);
	console.log(`  Types:      ${analysis.types.join(", ") || "Update"}`);
	console.log(`  Tier:       ${analysis.tier}`);
	console.log();

	// Generate suggestions
	const suggestions = generateSuggestions(analysis);

	console.log("Suggested commit messages:");
	console.log();
	for (let i = 0; i < suggestions.length; i++) {
		console.log(`  ${i + 1}. ${suggestions[i]}`);
	}

	console.log();
	console.log("Use with:");
	console.log(`  git commit -m "${suggestions[0]}"`);
	console.log();
	console.log("Or with the helper:");
	console.log(
		`  bun ~/.kimi/skills/tier1380-commit-flow/scripts/git-commit.ts "${suggestions[0]}"`,
	);
}

export { analyzeChanges, generateDescription, generateSuggestions, type ChangeAnalysis };
