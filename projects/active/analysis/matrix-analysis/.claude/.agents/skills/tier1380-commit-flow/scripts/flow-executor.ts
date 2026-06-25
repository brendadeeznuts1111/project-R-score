#!/usr/bin/env bun
/**
 * Tier-1380 OMEGA Flow Executor
 * Executes commit workflow steps
 */

import { $ } from "bun";

type FlowStep = "lint" | "test" | "type-check" | "commit-msg" | "full";

interface FlowConfig {
	step: FlowStep;
	autoFix: boolean;
	push: boolean;
}

async function executeFlow(config: FlowConfig): Promise<boolean> {
	console.info("╔════════════════════════════════════════════════════════╗");
	console.info("║     Tier-1380 OMEGA Flow Executor                      ║");
	console.info(`║     Step: ${config.step.padEnd(43)} ║`);
	console.info("╚════════════════════════════════════════════════════════╝");
	console.info();

	switch (config.step) {
		case "lint":
			return await runLint(config.autoFix);
		case "test":
			return await runTests();
		case "type-check":
			return await runTypeCheck();
		case "commit-msg":
			return await generateCommitMessage();
		case "full":
			return await runFullFlow(config);
		default:
			console.error(`Unknown step: ${config.step}`);
			return false;
	}
}

async function runLint(autoFix: boolean): Promise<boolean> {
	console.info("🔍 Running Biome lint...");
	try {
		if (autoFix) {
			await $`bunx @biomejs/biome check --write --staged`;
		} else {
			await $`bunx @biomejs/biome check --staged`;
		}
		console.info("✅ Lint passed");
		return true;
	} catch {
		console.info("❌ Lint failed");
		console.info("   Run with --fix to auto-fix issues");
		return false;
	}
}

async function runTests(): Promise<boolean> {
	console.info("🧪 Running tests...");
	try {
		await $`bun test`;
		console.info("✅ Tests passed");
		return true;
	} catch {
		console.info("❌ Tests failed");
		return false;
	}
}

async function runTypeCheck(): Promise<boolean> {
	console.info("📐 Running TypeScript type check...");
	try {
		await $`bun tsc --noEmit`;
		console.info("✅ Type check passed");
		return true;
	} catch {
		console.info("❌ Type check failed");
		return false;
	}
}

async function generateCommitMessage(): Promise<boolean> {
	console.info("📝 Generating commit message...");
	try {
		await $`bun .agents/skills/tier1380-commit-flow/scripts/generate-message.ts`;
		return true;
	} catch {
		console.info("❌ Failed to generate message");
		return false;
	}
}

async function runFullFlow(config: FlowConfig): Promise<boolean> {
	const steps = [
		{ name: "Stage changes", fn: stageChanges },
		{ name: "Lint", fn: () => runLint(config.autoFix) },
		{ name: "Type check", fn: runTypeCheck },
		{ name: "Tests", fn: runTests },
		{ name: "Generate message", fn: generateCommitMessage },
	];

	for (const step of steps) {
		console.info(`\n▶️  ${step.name}...`);
		const success = await step.fn();
		if (!success) {
			console.info(`\n❌ Flow failed at: ${step.name}`);
			return false;
		}
	}

	console.info("\n✨ Full flow completed!");
	console.info("\nNext steps:");
	console.info("  1. Review the generated commit message");
	console.info('  2. Run: git commit -m "[message]"');
	if (config.push) {
		console.info("  3. Run: git push origin main");
	}

	return true;
}

async function stageChanges(): Promise<boolean> {
	try {
		await $`git add -A`;
		console.info("✅ Changes staged");
		return true;
	} catch {
		console.info("❌ Failed to stage changes");
		return false;
	}
}

// Main
if (import.meta.main) {
	const step = (Bun.argv[2] as FlowStep) || "full";
	const autoFix = Bun.argv.includes("--fix");
	const push = Bun.argv.includes("--push");

	const config: FlowConfig = {
		step,
		autoFix,
		push,
	};

	const success = await executeFlow(config);
	process.exit(success ? 0 : 1);
}

export { executeFlow, type FlowStep, type FlowConfig };
