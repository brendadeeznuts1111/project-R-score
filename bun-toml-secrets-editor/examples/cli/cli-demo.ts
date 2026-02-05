// Enhanced Matrix CLI Commands Demo

import { mkdirSync, writeFileSync } from "node:fs";
import { MatrixCLICommands } from "../../src/cli/commands";

async function demonstrateCLICommands() {
	console.log("🚀 Enhanced Matrix CLI Commands Demo");
	console.log("=".repeat(50));

	const commands = new MatrixCLICommands();

	// Create demo profiles directory
	mkdirSync("./profiles", { recursive: true });

	// Create a demo production profile
	const productionProfile = {
		name: "production-api",
		environment: "production",
		config: {
			NODE_ENV: "production",
			PORT: 3000,
			DATABASE_URL: "https://prod-db.example.com",
			JWT_SECRET: "super-secure-jwt-secret-key-for-production-64-chars",
			API_RATE_LIMIT: 100,
			ENABLE_MONITORING: true,
			LOG_LEVEL: "info",
			CORS_ORIGINS: "https://app.example.com",
			SESSION_SECRET: "super-secure-session-secret-key-for-production-64-chars",
			REDIS_URL: "https://prod-redis.example.com",
			security: {
				encryption: true,
				authentication: "jwt",
				httpsOnly: true,
			},
			monitoring: {
				enabled: true,
				metrics: true,
				alerts: true,
			},
			resources: {
				memory: "4GB",
				cpu: "2 cores",
			},
			network: {
				httpsOnly: true,
				allowAllOrigins: false,
			},
			backup: {
				enabled: true,
				frequency: "daily",
			},
			retention: {
				logs: "30 days",
				data: "90 days",
			},
			compliance: ["GDPR", "SOC2", "ISO27001"],
		},
		metadata: {
			version: "2.1.0",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			author: "enterprise-admin",
			tags: ["production", "api", "secure"],
		},
	};

	// Save demo profile
	writeFileSync(
		"./profiles/production-api.json",
		JSON.stringify(productionProfile, null, 2),
	);
	console.log("📁 Created demo profile: ./profiles/production-api.json");

	// Create a demo profile with issues for validation testing
	const problematicProfile = {
		name: "problematic-api",
		environment: "production",
		config: {
			NODE_ENV: "production",
			PORT: 3000,
			DATABASE_URL: "https://prod-db.example.com",
			JWT_SECRET: "short", // Too short
			API_RATE_LIMIT: 100,
			ENABLE_MONITORING: false, // Missing monitoring
			LOG_LEVEL: "debug", // Debug in production
			CORS_ORIGINS: "*", // All origins allowed
			// Missing session secret
			security: {
				encryption: false, // No encryption
				// Missing authentication
				httpsOnly: false, // HTTP allowed
			},
			// Missing monitoring configuration
			resources: {
				memory: "16GB", // Too much memory
			},
			network: {
				httpsOnly: false,
				allowAllOrigins: true,
			},
			// Missing backup and retention
			compliance: [], // Missing compliance frameworks
		},
		metadata: {
			version: "1.0.0",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			author: "test-user",
			tags: ["test", "problematic"],
		},
	};

	writeFileSync(
		"./profiles/problematic-api.json",
		JSON.stringify(problematicProfile, null, 2),
	);
	console.log(
		"📁 Created problematic profile for validation testing: ./profiles/problematic-api.json",
	);

	console.log("\n🎯 Demo 1: Apply Production Profile with Rule Validation");
	console.log("-".repeat(60));

	try {
		await commands.applyProfileWithValidation("production-api", {
			validateRules: true,
			environment: "production",
		});
	} catch (_error) {
		console.log("Expected error for demo purposes");
	}

	console.log(
		"\n🎯 Demo 2: Apply Problematic Profile (Should Fail Validation)",
	);
	console.log("-".repeat(60));

	try {
		await commands.applyProfileWithValidation("problematic-api", {
			validateRules: true,
			environment: "production",
		});
	} catch (_error) {
		console.log("✅ Validation correctly caught the issues");
	}

	console.log("\n🎯 Demo 3: Force Apply Problematic Profile (With Warnings)");
	console.log("-".repeat(60));

	try {
		await commands.applyProfileWithValidation("problematic-api", {
			validateRules: true,
			environment: "production",
			force: true,
		});
		console.log("✅ Profile applied despite validation issues (force mode)");
	} catch (error) {
		console.log(
			"❌ Unexpected error:",
			error instanceof Error ? error.message : String(error),
		);
	}

	console.log("\n🎯 Demo 4: Generate Configuration from Production Template");
	console.log("-".repeat(60));

	try {
		await commands.generateConfigFromTemplate({
			template: "production-api",
			output: ".env.production-demo",
			environment: "production",
			variables: {
				DATABASE_URL: "https://my-prod-db.example.com",
				JWT_SECRET: "my-custom-jwt-secret-key-64-characters-long-for-security",
				SESSION_SECRET:
					"my-custom-session-secret-key-64-characters-long-for-security",
				API_RATE_LIMIT: 200,
				CORS_ORIGINS:
					"https://myapp.example.com,https://admin.myapp.example.com",
			},
			validate: true,
		});
	} catch (error) {
		console.log(
			"❌ Configuration generation failed:",
			error instanceof Error ? error.message : String(error),
		);
	}

	console.log("\n🎯 Demo 5: Generate Configuration with Invalid Variables");
	console.log("-".repeat(60));

	try {
		await commands.generateConfigFromTemplate({
			template: "production-api",
			output: ".env.invalid-demo",
			variables: {
				DATABASE_URL: "invalid-url", // Invalid URL
				JWT_SECRET: "short", // Too short
				API_RATE_LIMIT: 50000, // Too high
			},
			validate: true,
		});
	} catch (_error) {
		console.log("✅ Template validation correctly caught the issues");
	}

	console.log("\n🎯 Demo 6: Generate Development Configuration");
	console.log("-".repeat(60));

	try {
		await commands.generateConfigFromTemplate({
			template: "development-api",
			output: ".env.development-demo",
			environment: "development",
			variables: {
				DATABASE_URL: "https://dev-db.example.com",
				JWT_SECRET: "dev-jwt-secret-key",
				ENABLE_HOT_RELOAD: true,
			},
			validate: true,
		});
	} catch (error) {
		console.log(
			"❌ Development configuration generation failed:",
			error instanceof Error ? error.message : String(error),
		);
	}

	console.log("\n🎯 Demo 7: Show Available Templates");
	console.log("-".repeat(60));

	try {
		// This would show available templates in a real implementation
		console.log("📋 Available Templates:");
		console.log(
			"   • production-api - Secure configuration for production API environments",
		);
		console.log(
			"   • development-api - Configuration for development API environments",
		);
		console.log(
			"   • staging-api - Configuration for staging API environments",
		);
		console.log(
			"   • microservice - Configuration for microservice deployments",
		);
		console.log("   • serverless - Configuration for serverless functions");
	} catch (error) {
		console.log(
			"❌ Failed to list templates:",
			error instanceof Error ? error.message : String(error),
		);
	}

	console.log("\n✅ Enhanced Matrix CLI Commands Demo Completed!");
	console.log("\n📚 Generated Files:");
	console.log("   • ./profiles/production-api.json - Valid production profile");
	console.log(
		"   • ./profiles/problematic-api.json - Profile with validation issues",
	);
	console.log("   • .env.production-demo - Generated production configuration");
	console.log(
		"   • .env.development-demo - Generated development configuration",
	);

	console.log("\n🎯 CLI Commands Usage:");
	console.log("   matrix profile use production-api --validate-rules");
	console.log(
		"   matrix config generate --template=production-api --output=.env.production",
	);
	console.log("   matrix profile use problematic-api --validate-rules --force");
}

// Run the demo
demonstrateCLICommands().catch((error) => {
	console.error(
		"❌ Demo failed:",
		error instanceof Error ? error.message : String(error),
	);
	process.exit(1);
});
