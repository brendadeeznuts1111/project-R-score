#!/usr/bin/env bun

/**
 * Team-specific package publishing script
 * Validates team lead ownership before publishing
 * 
 * Usage: bun run scripts/team-publish.ts @graph/layer4 --tag=beta
 */

import { $ } from "bun";
import { readFileSync } from "fs";
import { join } from "path";

interface Maintainer {
	name: string;
	email: string;
	role: "team-lead" | "contributor" | "viewer";
	scope: "full-access" | "read-write" | "read-only";
}

interface PackageJson {
	name: string;
	version: string;
	maintainers?: Maintainer[];
	publishConfig?: {
		registry?: string;
		access?: string;
		tag?: string;
	};
}

/**
 * Get team lead for a package
 */
async function getTeamLead(packageName: string): Promise<Maintainer> {
	const packagePath = join(process.cwd(), "packages", packageName, "package.json");

	if (!Bun.file(packagePath).exists()) {
		throw new Error(`Package not found: ${packageName}`);
	}

	const packageJson: PackageJson = JSON.parse(
		readFileSync(packagePath, "utf-8"),
	);

	const lead = packageJson.maintainers?.find((m) => m.role === "team-lead");

	if (!lead) {
		throw new Error(`No team lead found for ${packageName}`);
	}

	return lead;
}

/**
 * Get current user from git config or environment
 */
async function getCurrentUser(): Promise<{ name: string; email: string }> {
	try {
		const name = await $`git config user.name`.text();
		const email = await $`git config user.email`.text();
		return {
			name: name.trim(),
			email: email.trim(),
		};
	} catch {
		// Fallback to environment variables
		return {
			name: process.env.USER || process.env.USERNAME || "Unknown",
			email: process.env.EMAIL || process.env.GIT_AUTHOR_EMAIL || "unknown@company.com",
		};
	}
}

/**
 * Main publishing function
 */
async function publishPackage() {
	const packageName = process.argv[2];
	const tagArg = process.argv.find((arg) => arg.startsWith("--tag="));
	const tag = tagArg?.split("=")[1] || "latest";

	if (!packageName) {
		console.error("Usage: bun run scripts/team-publish.ts <package-name> [--tag=<tag>]");
		console.error("Example: bun run scripts/team-publish.ts @graph/layer4 --tag=beta");
		process.exit(1);
	}

	try {
		// Validate: Only team lead can publish this package
		const lead = await getTeamLead(packageName);
		const currentUser = await getCurrentUser();

		console.log(`🔍 Checking ownership for ${packageName}...`);
		console.log(`   Team Lead: ${lead.name} (${lead.email})`);
		console.log(`   Current User: ${currentUser.name} (${currentUser.email})`);

		if (lead.email.toLowerCase() !== currentUser.email.toLowerCase()) {
			console.error(
				`❌ Only ${lead.name} (${lead.email}) can publish ${packageName}`,
			);
			console.error(`   Current user: ${currentUser.email}`);
			process.exit(1);
		}

		console.log(`✅ Ownership verified`);

		// Run benchmarks
		console.log(`\n📊 Running benchmarks for ${packageName}...`);
		try {
			await $`cd packages/${packageName} && bun run bench`.quiet();
			console.log(`✅ Benchmarks passed`);
		} catch (error) {
			console.warn(`⚠️ Benchmarks failed or not configured, continuing...`);
		}

		// Run tests
		console.log(`\n🧪 Running tests...`);
		try {
			await $`cd packages/${packageName} && bun test`.quiet();
			console.log(`✅ Tests passed`);
		} catch (error) {
			console.warn(`⚠️ Tests failed or not configured, continuing...`);
		}

		// Publish
		console.log(`\n📦 Publishing ${packageName}@${tag}...`);
		const registry = "https://npm.internal.yourcompany.com";
		await $`cd packages/${packageName} && bun publish --registry ${registry} --tag ${tag}`;

		console.log(`\n✅ Published ${packageName}@${tag} by ${lead.name}`);

		// Optional: Send notification
		if (process.env.SLACK_WEBHOOK_URL) {
			try {
				await fetch(process.env.SLACK_WEBHOOK_URL, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						text: `${lead.name} published ${packageName}@${tag}`,
					}),
				});
			} catch {
				// Ignore notification errors
			}
		}
	} catch (error: any) {
		console.error(`❌ Error: ${error.message}`);
		process.exit(1);
	}
}

// Run if executed directly
if (import.meta.main) {
	publishPackage();
}
