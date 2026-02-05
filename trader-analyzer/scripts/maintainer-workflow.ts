#!/usr/bin/env bun
/**
 * @fileoverview Maintainer Workflow Automation
 * @description Automated workflow for package maintainers to iterate on properties, run benchmarks, and publish
 * @module scripts/maintainer-workflow
 * 
 * Usage:
 *   bun run scripts/maintainer-workflow.ts --package=@graph/layer4 --property=threshold --values=0.7,0.75,0.8,0.85
 *   bun run scripts/maintainer-workflow.ts --package=@graph/layer4 --workflow=full
 * 
 * @see {@link ../docs/TEAM-ORGANIZATION-PACKAGE-OWNERSHIP.md|Team Organization Documentation}
 */

import { $ } from "bun";
import { existsSync } from "fs";
import { join } from "path";

interface WorkflowOptions {
	package: string;
	property?: string;
	values?: string;
	workflow?: "property" | "full" | "publish";
	skipTests?: boolean;
	skipBenchmark?: boolean;
	autoCommit?: boolean;
	reviewer?: string;
	registry?: string;
}

// Package to benchmark mapping
const PACKAGE_BENCHMARKS: Record<string, string> = {
	"@graph/layer4": "@bench/layer4",
	"@graph/layer3": "@bench/layer3",
	"@graph/layer2": "@bench/layer2",
	"@graph/layer1": "@bench/layer1",
	"@graph/algorithms": "@bench/algorithms",
	"@graph/storage": "@bench/storage",
	"@graph/streaming": "@bench/streaming",
};

// Team lead reviewers
const TEAM_REVIEWERS: Record<string, string> = {
	"@graph/layer4": "alex.chen",
	"@graph/layer3": "alex.chen",
	"@graph/layer2": "sarah.kumar",
	"@graph/layer1": "sarah.kumar",
	"@graph/algorithms": "mike.rodriguez",
	"@graph/storage": "mike.rodriguez",
	"@graph/streaming": "mike.rodriguez",
	"@graph/utils": "mike.rodriguez",
	"@bench/layer4": "mike.rodriguez",
	"@bench/layer3": "mike.rodriguez",
	"@bench/layer2": "mike.rodriguez",
	"@bench/layer1": "mike.rodriguez",
	"@bench/property": "mike.rodriguez",
	"@bench/stress": "mike.rodriguez",
};

async function runCommand(command: string, description: string): Promise<void> {
	console.log(`\n📌 ${description}`);
	console.log(`   Running: ${command}`);
	try {
		await $`${command}`.quiet();
		console.log(`   ✅ Complete`);
	} catch (error) {
		console.error(`   ❌ Failed: ${error}`);
		throw error;
	}
}

async function step1PullLatest(): Promise<void> {
	await runCommand("git pull origin main", "Step 1: Pull latest changes");
}

async function step2StartDevelopment(pkg: string): Promise<void> {
	const pkgPath = join("packages", pkg);
	if (!existsSync(pkgPath)) {
		throw new Error(`Package directory not found: ${pkgPath}`);
	}
	console.log(`\n📌 Step 2: Start development`);
	console.log(`   Package: ${pkg}`);
	console.log(`   Directory: ${pkgPath}`);
	console.log(`   💡 Run 'cd ${pkgPath} && bun run dev' to start development server`);
}

async function step3ModifyProperty(pkg: string, property: string, values: string[]): Promise<void> {
	console.log(`\n📌 Step 3: Modify property in src/config.ts`);
	console.log(`   Package: ${pkg}`);
	console.log(`   Property: ${property}`);
	console.log(`   Values to test: ${values.join(", ")}`);
	console.log(`   💡 Edit packages/${pkg}/src/config.ts`);
	console.log(`   💡 Example: ${property}: ${values[values.length - 1]}`);
}

async function step4RunPropertyBenchmark(pkg: string, property: string, values: string[]): Promise<void> {
	const benchPkg = PACKAGE_BENCHMARKS[pkg];
	if (!benchPkg) {
		throw new Error(`No benchmark package found for ${pkg}`);
	}

	const valuesStr = values.join(",");
	console.log(`\n📌 Step 4: Run benchmark for property`);
	console.log(`   Benchmark: ${benchPkg}`);
	console.log(`   Property: ${property}`);
	console.log(`   Values: ${valuesStr}`);

	await runCommand(
		`bun run ${benchPkg} --property=${property} --values=${valuesStr}`,
		`Running property benchmark`
	);
}

async function step5ViewResults(pkg: string): Promise<void> {
	const benchPkg = PACKAGE_BENCHMARKS[pkg];
	if (!benchPkg) {
		throw new Error(`No benchmark package found for ${pkg}`);
	}

	console.log(`\n📌 Step 5: View results (auto-saved to registry)`);
	console.log(`   💡 Results are automatically saved to registry`);
	console.log(`   💡 Run 'bun run meta:${pkg.replace("@graph/", "")}' to view metadata`);
	
	// Try to run meta command if it exists
	try {
		const metaCmd = `meta:${pkg.replace("@graph/", "").replace("@bench/", "")}`;
		await $`bun run ${metaCmd}`.quiet();
	} catch {
		console.log(`   ⚠️  Meta command not found, skipping`);
	}
}

async function step6RunFullBenchmark(pkg: string): Promise<void> {
	const benchPkg = PACKAGE_BENCHMARKS[pkg];
	if (!benchPkg) {
		throw new Error(`No benchmark package found for ${pkg}`);
	}

	console.log(`\n📌 Step 6: Run full benchmark suite`);
	await runCommand(`bun run bench:${pkg.replace("@graph/", "")}`, `Running full benchmark suite`);
}

async function step7TestIntegration(pkg: string, repeats: number = 5): Promise<void> {
	console.log(`\n📌 Step 7: Test integration`);
	await runCommand(`bun test --repeats=${repeats}`, `Running tests with ${repeats} repeats`);
}

async function step8CommitWithResults(
	pkg: string,
	property: string,
	newValue: string,
	results?: { detectionTime?: string; anomalyCount?: string; confidence?: string }
): Promise<void> {
	console.log(`\n📌 Step 8: Commit with benchmark results`);

	let commitMessage = `perf(${pkg.replace("@graph/", "")}): update ${property} to ${newValue}\n\n`;
	
	if (results) {
		commitMessage += "Benchmark results:\n";
		if (results.detectionTime) {
			commitMessage += `- detection time: ${results.detectionTime}\n`;
		}
		if (results.anomalyCount) {
			commitMessage += `- anomaly count: ${results.anomalyCount}\n`;
		}
		if (results.confidence) {
			commitMessage += `- confidence: ${results.confidence}\n`;
		}
	} else {
		commitMessage += "Benchmark results: See benchmark output above\n";
	}

	console.log(`   Commit message:\n${commitMessage}`);

	await runCommand("git add .", "Staging changes");
	await runCommand(`git commit -m "${commitMessage.replace(/\n/g, "\\n")}"`, "Committing changes");
}

async function step9CreatePR(pkg: string, reviewer?: string, title?: string, body?: string): Promise<void> {
	const defaultReviewer = reviewer || TEAM_REVIEWERS[pkg] || "team-lead";
	const defaultTitle = title || `perf(${pkg.replace("@graph/", "")}): optimize properties`;
	const defaultBody = body || `Benchmark results show performance improvements. See commit message for details.`;

	console.log(`\n📌 Step 9: Create PR`);
	console.log(`   Reviewer: ${defaultReviewer}`);
	console.log(`   Title: ${defaultTitle}`);

	await runCommand(
		`gh pr create --title "${defaultTitle}" --body "${defaultBody}" --reviewer ${defaultReviewer}`,
		"Creating pull request"
	);
}

async function step10Publish(pkg: string, registry?: string): Promise<void> {
	const registryUrl = registry || "https://npm.internal.yourcompany.com";
	
	console.log(`\n📌 Step 10: Publish to registry`);
	console.log(`   Package: ${pkg}`);
	console.log(`   Registry: ${registryUrl}`);

	const pkgPath = join("packages", pkg);
	if (!existsSync(pkgPath)) {
		throw new Error(`Package directory not found: ${pkgPath}`);
	}

	await runCommand(`cd ${pkgPath} && bun version patch`, "Bumping version");
	await runCommand(`cd ${pkgPath} && bun publish --registry ${registryUrl}`, "Publishing to registry");
}

async function runPropertyWorkflow(options: WorkflowOptions): Promise<void> {
	const { package: pkg, property, values: valuesStr } = options;
	
	if (!property || !valuesStr) {
		throw new Error("Property workflow requires --property and --values");
	}

	const values = valuesStr.split(",").map(v => v.trim());
	const newValue = values[values.length - 1];

	console.log(`\n🚀 Starting Property Iteration Workflow`);
	console.log(`   Package: ${pkg}`);
	console.log(`   Property: ${property}`);
	console.log(`   Values: ${values.join(" → ")}`);
	console.log(`   Target: ${newValue}\n`);

	await step1PullLatest();
	await step2StartDevelopment(pkg);
	await step3ModifyProperty(pkg, property, values);
	await step4RunPropertyBenchmark(pkg, property, values);
	await step5ViewResults(pkg);

	console.log(`\n✅ Property benchmark complete!`);
	console.log(`   💡 Review results above. If improvement, continue with full workflow.`);
}

async function runFullWorkflow(options: WorkflowOptions): Promise<void> {
	const { package: pkg, skipTests, skipBenchmark, autoCommit, reviewer } = options;

	console.log(`\n🚀 Starting Full Workflow`);
	console.log(`   Package: ${pkg}\n`);

	await step1PullLatest();
	await step2StartDevelopment(pkg);

	if (!skipBenchmark) {
		await step6RunFullBenchmark(pkg);
		await step5ViewResults(pkg);
	}

	if (!skipTests) {
		await step7TestIntegration(pkg);
	}

	if (autoCommit) {
		await step8CommitWithResults(pkg, "properties", "optimized");
		await step9CreatePR(pkg, reviewer);
	}

	console.log(`\n✅ Full workflow complete!`);
}

async function runPublishWorkflow(options: WorkflowOptions): Promise<void> {
	const { package: pkg, registry } = options;

	console.log(`\n🚀 Starting Publish Workflow`);
	console.log(`   Package: ${pkg}\n`);

	await step10Publish(pkg, registry);

	console.log(`\n✅ Package published!`);
}

async function main() {
	const args = process.argv.slice(2);
	const options: WorkflowOptions = {
		package: "",
		workflow: "property",
		skipTests: false,
		skipBenchmark: false,
		autoCommit: false,
	};

	// Parse arguments
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg.startsWith("--")) {
			const key = arg.replace("--", "").split("=")[0];
			const value = arg.includes("=") ? arg.split("=")[1] : args[i + 1];

			switch (key) {
				case "package":
					options.package = value;
					break;
				case "property":
					options.property = value;
					break;
				case "values":
					options.values = value;
					break;
				case "workflow":
					options.workflow = value as "property" | "full" | "publish";
					break;
				case "skip-tests":
					options.skipTests = true;
					break;
				case "skip-benchmark":
					options.skipBenchmark = true;
					break;
				case "auto-commit":
					options.autoCommit = true;
					break;
				case "reviewer":
					options.reviewer = value;
					break;
				case "registry":
					options.registry = value;
					break;
			}
		}
	}

	if (!options.package) {
		console.error("❌ Error: --package is required");
		console.log("\nUsage:");
		console.log("  bun run scripts/maintainer-workflow.ts --package=@graph/layer4 --property=threshold --values=0.7,0.75,0.8,0.85");
		console.log("  bun run scripts/maintainer-workflow.ts --package=@graph/layer4 --workflow=full");
		console.log("  bun run scripts/maintainer-workflow.ts --package=@graph/layer4 --workflow=publish --registry=https://npm.internal.yourcompany.com");
		process.exit(1);
	}

	try {
		switch (options.workflow) {
			case "property":
				await runPropertyWorkflow(options);
				break;
			case "full":
				await runFullWorkflow(options);
				break;
			case "publish":
				await runPublishWorkflow(options);
				break;
			default:
				throw new Error(`Unknown workflow: ${options.workflow}`);
		}
	} catch (error) {
		console.error(`\n❌ Workflow failed: ${error}`);
		process.exit(1);
	}
}

if (import.meta.main) {
	main();
}
