// Profile Name Parser Demo
import { MatrixCLICommands } from "../../src/cli/commands";

async function demonstrateProfileNameParser() {
	console.info("🔍 Enhanced Profile Name Parser Demo");
	console.info("=".repeat(50));

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

	console.info("🎯 Individual Profile Analysis:");
	console.info("");

	for (const profileName of testProfiles) {
		console.info(`🔸 Analyzing: ${profileName}`);
		commands.analyzeProfileName(profileName);
		console.info(`\n${"-".repeat(60)}\n`);
	}

	// Create some demo profile files for listing
	console.info("📁 Creating demo profile files for listing test...");

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

		console.info("✅ Demo profile files created");

		// Test the list functionality
		console.info("\n📋 Profile List Analysis:");
		await commands.listProfiles();
	} catch (error) {
		console.error(
			"❌ Failed to create demo profiles:",
			error instanceof Error ? error.message : String(error),
		);
	}

	console.info("\n🎯 Profile Name Best Practices:");
	console.info("");
	console.info("✅ Recommended Format: <environment>-<project>-<purpose>");
	console.info("");
	console.info("📝 Examples:");
	console.info("   • production-api-web");
	console.info("   • staging-auth-service");
	console.info("   • development-worker-queue");
	console.info("   • testing-analytics-pipeline");
	console.info("   • local-frontend-react");
	console.info("");
	console.info(
		"🌍 Environments: production, prod, staging, stage, development, dev, testing, local",
	);
	console.info(
		"🏷️  Projects: descriptive project names (api, auth, payment, user, etc.)",
	);
	console.info(
		"🎯 Purposes: web, service, worker, queue, pipeline, react, etc.",
	);
	console.info("");
	console.info("⚠️  Avoid:");
	console.info("   • Uppercase letters: PRODUCTION-API-WEB ❌");
	console.info("   • Underscores: production_api_web ❌");
	console.info("   • Generic names: my-app, production ❌");
	console.info(
		"   • Missing components: dev-auth ❌ (should be dev-auth-service)",
	);

	console.info("\n✅ Profile Name Parser Demo Completed!");
	console.info("\n🎯 Available Commands:");
	console.info("   bun run matrix:profile:analyze <profile-name>");
	console.info("   bun run matrix:profile:list");
	console.info("   bun run matrix:profile:use <profile-name> --validate-rules");
}

// Run the demo
demonstrateProfileNameParser().catch((error) => {
	console.error(
		"❌ Demo failed:",
		error instanceof Error ? error.message : String(error),
	);
	process.exit(1);
});
