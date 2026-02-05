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
	console.log("╔════════════════════════════════════════════════════════╗");
	console.log("║     Tier-1380 OMEGA Flow Executor                      ║");
	console.log(`║     Step: ${config.step.padEnd(43)} ║`);
	console.log("╚════════════════════════════════════════════════════════╝");
	console.log();

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
	console.log("🔍 Running Biome lint...");
	try {
		if (autoFix) {
			await $`bunx @biomejs/biome check --write --staged`;
		} else {
			await $`bunx @biomejs/biome check --staged`;
		}
		console.log("✅ Lint passed");
		return true;
	} catch {
		console.log("❌ Lint failed");
		console.log("   Run with --fix to auto-fix issues");
		return false;
	}
}

async function runTests(): Promise<boolean> {
	console.log("🧪 Running tests...");
	try {
		await $`bun test`;
		console.log("✅ Tests passed");
		return true;
	} catch {
		console.log("❌ Tests failed");
		return false;
	}
}

async function runTypeCheck(): Promise<boolean> {
	console.log("📐 Running TypeScript type check...");
	try {
		await $`bun tsc --noEmit`;
		console.log("✅ Type check passed");
		return true;
	} catch {
		console.log("❌ Type check failed");
		return false;
	}
}

async function generateCommitMessage(): Promise<boolean> {
	console.log("📝 Generating commit message...");
	try {
		await $`bun .agents/skills/tier1380-commit-flow/scripts/generate-message.ts`;
		return true;
	} catch {
		console.log("❌ Failed to generate message");
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
		console.log(`\n▶️  ${step.name}...`);
		const success = await step.fn();
		if (!success) {
			console.log(`\n❌ Flow failed at: ${step.name}`);
			return false;
		}
	}

	console.log("\n✨ Full flow completed!");
	console.log("\nNext steps:");
	console.log("  1. Review the generated commit message");
	console.log('  2. Run: git commit -m "[message]"');
	if (config.push) {
		console.log("  3. Run: git push origin main");
	}

	return true;
}

async function stageChanges(): Promise<boolean> {
	try {
		await $`git add -A`;
		console.log("✅ Changes staged");
		return true;
	} catch {
		console.log("❌ Failed to stage changes");
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
