#!/usr/bin/env bun
/**
 * Tier-1380 OMEGA Governance Check
 * Validates code against governance standards
 */

import { $ } from "bun";

interface CheckResult {
	name: string;
	passed: boolean;
	details?: string;
}

async function runGovernanceChecks(scope: string): Promise<CheckResult[]> {
	const results: CheckResult[] = [];

	// Biome lint check
	results.push(await checkBiomeLint(scope));

	// TypeScript check
	results.push(await checkTypeScript(scope));

	// Test check
	results.push(await checkTests(scope));

	// Skills compliance (if skills changed)
	if (scope === "all" || scope === "skills") {
		results.push(await checkSkillsCompliance());
	}

	// Matrix validation (if matrix changed)
	if (scope === "all" || scope === "matrix") {
		results.push(await checkMatrixColumns());
	}

	return results;
}

async function checkBiomeLint(_scope: string): Promise<CheckResult> {
	try {
		await $`bunx @biomejs/biome check --staged`.quiet();
		return { name: "Biome Lint", passed: true };
	} catch {
		return {
			name: "Biome Lint",
			passed: false,
			details: "Run: bunx @biomejs/biome check --write",
		};
	}
}

async function checkTypeScript(_scope: string): Promise<CheckResult> {
	try {
		await $`bun tsc --noEmit`.quiet();
		return { name: "TypeScript", passed: true };
	} catch {
		return {
			name: "TypeScript",
			passed: false,
			details: "Fix type errors before committing",
		};
	}
}

async function checkTests(scope: string): Promise<CheckResult> {
	try {
		// Run only relevant tests based on scope
		if (scope === "matrix") {
			await $`bun test tests/skills-standards.test.ts`.quiet();
		} else if (scope === "chrome") {
			await $`bun test tests/chrome-state/phase39-apex.test.ts`.quiet();
		} else {
			await $`bun test`.quiet();
		}
		return { name: "Tests", passed: true };
	} catch {
		return {
			name: "Tests",
			passed: false,
			details: "Fix failing tests before committing",
		};
	}
}

async function checkSkillsCompliance(): Promise<CheckResult> {
	try {
		const _result = await $`bun test tests/skills-standards.test.ts`.quiet();
		return { name: "Skills Compliance (Col 89-95)", passed: true };
	} catch {
		return {
			name: "Skills Compliance (Col 89-95)",
			passed: false,
			details: "Skills compliance must be 100/100",
		};
	}
}

async function checkMatrixColumns(): Promise<CheckResult> {
	try {
		await $`bun matrix/column-standards-all.ts validate`.quiet();
		return { name: "Matrix Columns", passed: true };
	} catch {
		return {
			name: "Matrix Columns",
			passed: false,
			details: "Validate matrix column definitions",
		};
	}
}

// Main
if (import.meta.main) {
	const scope = Bun.argv[2] || "staged";

	console.info("╔════════════════════════════════════════════════════════╗");
	console.info("║     Tier-1380 OMEGA Governance Check                   ║");
	console.info(`║     Scope: ${scope.padEnd(45)} ║`);
	console.info("╚════════════════════════════════════════════════════════╝");
	console.info();

	const results = await runGovernanceChecks(scope);

	let passed = 0;
	let failed = 0;

	for (const result of results) {
		if (result.passed) {
			console.info(`✅ ${result.name}`);
			passed++;
		} else {
			console.info(`❌ ${result.name}`);
			if (result.details) {
				console.info(`   ${result.details}`);
			}
			failed++;
		}
	}

	console.info();
	console.info(`Results: ${passed} passed, ${failed} failed`);
	console.info();

	if (failed === 0) {
		console.info("✨ All governance checks passed!");
	} else {
		console.info("⚠️  Fix failing checks before committing");
	}

	process.exit(failed === 0 ? 0 : 1);
}

export { runGovernanceChecks };
