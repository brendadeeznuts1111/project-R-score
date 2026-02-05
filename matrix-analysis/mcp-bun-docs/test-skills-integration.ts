/**
 * Test script for Skills Registry + Matrix Integration
 *
 * Demonstrates secure credential management integration
 * with the Bun v1.3.7 feature matrix.
 */

import { secureMatrixMonitor } from "./skills-matrix-integration";

async function runIntegrationDemo() {
	console.log("🚀 Starting Skills Registry + Matrix Integration Demo\n");

	// 1. Authenticate with Skills Registry (simulated)
	console.log("1️⃣ Authenticating with Skills Registry...");
	const authenticated = await secureMatrixMonitor.authenticate({
		username: "matrix-admin",
		password: "secure-password-123", // In real app, this would be properly handled
	});

	if (authenticated) {
		console.log("✅ Authentication successful\n");
	} else {
		console.log("⚠️  Running in demo mode without authentication\n");
	}

	// 2. Display security-enhanced matrix
	console.log("2️⃣ Generating Security-Enhanced Matrix View...");
	const secureMatrix = await secureMatrixMonitor.monitorMatrixWithSecurity();
	console.log(secureMatrix);
	console.log("\n");

	// 3. Run security audit
	console.log("3️⃣ Running Security Audit...");
	await secureMatrixMonitor.runSecurityAudit();
	console.log("\n");

	// 4. Profile with security metrics
	console.log("4️⃣ Profiling with Security Metrics...");
	await secureMatrixMonitor.profileWithSecurityMetrics("./lib.ts");
	console.log("\n");

	// 5. Get detailed security classifications
	console.log("5️⃣ Security Classifications Summary:");
	const classifications = await secureMatrixMonitor.getSecurityClassifications();

	const summary = {
		total: classifications.length,
		critical: classifications.filter((c) => c.securityLevel === "critical").length,
		high: classifications.filter((c) => c.securityLevel === "high").length,
		medium: classifications.filter((c) => c.securityLevel === "medium").length,
		low: classifications.filter((c) => c.securityLevel === "low").length,
		authRequired: classifications.filter((c) => c.requiresAuth).length,
		auditRequired: classifications.filter((c) => c.auditRequired).length,
	};

	console.table(summary);

	// Show critical entries
	console.log("\n🚨 Critical Security Features:");
	classifications
		.filter((c) => c.securityLevel === "critical")
		.forEach((c) => console.log(`  • ${c.term}: ${c.complianceNotes}`));
}

// MCP Server integration for Skills Registry
export class SkillsMCPServer {
	async listSecurityTools(): Promise<
		Array<{ name: string; description: string; securityLevel: string }>
	> {
		return [
			{
				name: "secureMatrixMonitor",
				description: "Monitor matrix features with security context",
				securityLevel: "medium",
			},
			{
				name: "runSecurityAudit",
				description: "Run comprehensive security audit on matrix features",
				securityLevel: "high",
			},
			{
				name: "profileWithSecurityMetrics",
				description: "Profile performance with security metrics included",
				securityLevel: "medium",
			},
		];
	}

	async getSecurityReport(): Promise<string> {
		const classifications = await secureMatrixMonitor.getSecurityClassifications();
		const report = {
			timestamp: new Date().toISOString(),
			totalFeatures: classifications.length,
			criticalFeatures: classifications
				.filter((c) => c.securityLevel === "critical")
				.map((c) => c.term),
			recommendations: [
				"Enable authentication for all network-related features",
				"Audit profiling features before production deployment",
				"Monitor S3 operations for compliance",
				"Implement rate limiting for high-security features",
			],
		};

		return JSON.stringify(report, null, 2);
	}
}

// Export for MCP integration
export const skillsMCPServer = new SkillsMCPServer();

// Run demo if executed directly
if (import.meta.main) {
	runIntegrationDemo().catch(console.error);
}
