// Profile Name Parser Demo
import { MatrixCLICommands } from "../../src/cli/commands";

async function demonstrateProfileNameParser() {
	console.log("🔍 Enhanced Profile Name Parser Demo");
	console.log("=".repeat(50));

	const commands = new MatrixCLICommands();

	// Test various profile names
	const testProfiles = [
		"production-api-web",
		"staging-auth-service",
		"development-worker-queue",
		"prod-payment-v2",
		"stage-user-testing",
		"dev-cache-redis",
		"testing-analytics-pipeline",
		"local-frontend-react",
		"my-app",
		"production",
		"dev-john-workspace",
		"staging-feature-xyz-api",
		"unknown-env-project-purpose",
		"PRODUCTION-API-WEB", // uppercase test
		"production_api_web", // underscore test
	];

	console.log("🎯 Individual Profile Analysis:");
	console.log("");

	for (const profileName of testProfiles) {
		console.log(`🔸 Analyzing: ${profileName}`);
		commands.analyzeProfileName(profileName);
		console.log(`\n${"-".repeat(60)}\n`);
	}

	// Create some demo profile files for listing
	console.log("📁 Creating demo profile files for listing test...");

	const { writeFileSync, mkdirSync } = await import("node:fs");

	try {
		mkdirSync("./profiles", { recursive: true });

		// Create well-structured profiles
		const goodProfiles = [
			"production-api-web",
			"staging-auth-service",
			"development-worker-queue",
			"testing-analytics-pipeline",
		];

		// Create profiles that need improvement
		const needsImprovement = ["my-app", "production", "test-profile"];

		// Create demo profile files
		[...goodProfiles, ...needsImprovement].forEach((profileName) => {
			const profileContent = {
				name: profileName,
				environment: profileName.split("-")[0],
				config: {
					NODE_ENV: "production",
					PORT: 3000,
				},
				metadata: {
					version: "1.0.0",
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					author: "demo-user",
					tags: ["demo"],
				},
			};

			writeFileSync(
				`./profiles/${profileName}.json`,
				JSON.stringify(profileContent, null, 2),
			);
		});

		console.log("✅ Demo profile files created");

		// Test the list functionality
		console.log("\n📋 Profile List Analysis:");
		await commands.listProfiles();
	} catch (error) {
		console.error(
			"❌ Failed to create demo profiles:",
			error instanceof Error ? error.message : String(error),
		);
	}

	console.log("\n🎯 Profile Name Best Practices:");
	console.log("");
	console.log("✅ Recommended Format: <environment>-<project>-<purpose>");
	console.log("");
	console.log("📝 Examples:");
	console.log("   • production-api-web");
	console.log("   • staging-auth-service");
	console.log("   • development-worker-queue");
	console.log("   • testing-analytics-pipeline");
	console.log("   • local-frontend-react");
	console.log("");
	console.log(
		"🌍 Environments: production, prod, staging, stage, development, dev, testing, local",
	);
	console.log(
		"🏷️  Projects: descriptive project names (api, auth, payment, user, etc.)",
	);
	console.log(
		"🎯 Purposes: web, service, worker, queue, pipeline, react, etc.",
	);
	console.log("");
	console.log("⚠️  Avoid:");
	console.log("   • Uppercase letters: PRODUCTION-API-WEB ❌");
	console.log("   • Underscores: production_api_web ❌");
	console.log("   • Generic names: my-app, production ❌");
	console.log(
		"   • Missing components: dev-auth ❌ (should be dev-auth-service)",
	);

	console.log("\n✅ Profile Name Parser Demo Completed!");
	console.log("\n🎯 Available Commands:");
	console.log("   bun run matrix:profile:analyze <profile-name>");
	console.log("   bun run matrix:profile:list");
	console.log("   bun run matrix:profile:use <profile-name> --validate-rules");
}

// Run the demo
demonstrateProfileNameParser().catch((error) => {
	console.error(
		"❌ Demo failed:",
		error instanceof Error ? error.message : String(error),
	);
	process.exit(1);
});
