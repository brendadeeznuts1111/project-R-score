#!/usr/bin/env bun
/**
 * @fileoverview Interactive Developer Workspace Demo
 * @description Interactive demo showing how to use the developer workspace system
 * @module examples/devworkspace-interactive
 *
 * @see {@link ../src/workspace/devworkspace.ts DevWorkspaceManager}
 * @see {@link ../docs/WORKSPACE-DEVELOPER-ONBOARDING.md Developer Workspace Documentation}
 * @see {@link ../src/api/registry.ts getTeamDepartmentsRegistry} Team & API Credentials Integration
 */

import { DevWorkspaceManager } from "../src/workspace/devworkspace";
import { getTeamDepartmentsRegistry } from "../src/api/registry";

// ═══════════════════════════════════════════════════════════════
// Interactive Demo
// ═══════════════════════════════════════════════════════════════

async function interactiveDemo() {
	console.log("🎯 Developer Workspace Interactive Demo\n");
	console.log("=".repeat(60));
	console.log("\nThis demo shows how to create and manage API keys for:");
	console.log("  • New developer onboarding");
	console.log("  • Interview candidates");
	console.log("  • Trial access\n");

	const manager = new DevWorkspaceManager();

	// Example 1: Create interview key
	console.log("📋 Example 1: Create Interview API Key");
	console.log("-".repeat(60));

	const interviewKey = await manager.createKey({
		email: "candidate@example.com",
		purpose: "interview",
		expirationHours: 24,
		metadata: {
			interviewId: "INT-2025-001",
			position: "Senior Backend Engineer",
			interviewer: "tech-lead@company.com",
		},
	});

	console.log("\n✅ Interview key created!");
	console.log(`   Use this key: ${interviewKey.apiKey}`);
	console.log(`   Valid for: 24 hours`);
	console.log(`   Rate limit: ${interviewKey.rateLimitPerHour} requests/hour`);

	// Example 2: Create onboarding key with team assignment
	console.log("\n\n📋 Example 2: Create Onboarding API Key (Team-Assigned)");
	console.log("-".repeat(60));

	// Get team departments to show team structure
	const teamRegistry = await getTeamDepartmentsRegistry();
	const departments = teamRegistry.departments;
	
	if (departments.length > 0) {
		console.log("\n📊 Available Teams:");
		departments.forEach((dept, idx) => {
			console.log(`   ${idx + 1}. ${dept.name} (${dept.id})`);
			console.log(`      Lead: ${dept.lead}`);
			console.log(`      Members with API keys: ${dept.members.filter(m => m.hasApiKey).length}/${dept.members.length}`);
		});
	}

	const onboardingKey = await manager.createKey({
		email: "newdev@company.com",
		purpose: "onboarding",
		expirationHours: 168, // 7 days
		rateLimitPerHour: 1000,
		metadata: {
			employeeId: "EMP-2025-042",
			startDate: "2025-01-20",
			team: "Platform Engineering",
			department: "registry-mcp-tools", // Department ID from team registry
		},
	});

	console.log("\n✅ Onboarding key created!");
	console.log(`   Use this key: ${onboardingKey.apiKey}`);
	console.log(`   Valid for: 7 days`);
	console.log(`   Rate limit: ${onboardingKey.rateLimitPerHour} requests/hour`);

	// Example 3: Validate key
	console.log("\n\n📋 Example 3: Validate API Key");
	console.log("-".repeat(60));

	const validation = await manager.validateKey(interviewKey.apiKey);
	if (validation.valid) {
		console.log("✅ Key is valid!");
		console.log(`   Remaining requests: ${validation.remainingRequests}`);
		if (validation.resetAt) {
			console.log(`   Rate limit resets: ${new Date(validation.resetAt).toISOString()}`);
		}
	} else {
		console.log(`❌ Key validation failed: ${validation.reason}`);
	}

	// Example 4: Get key statistics
	console.log("\n\n📋 Example 4: Get Key Statistics");
	console.log("-".repeat(60));

	const stats = await manager.getKeyStats(interviewKey.id);
	if (stats) {
		console.log("📊 Key Statistics:");
		console.log(`   Total Requests: ${stats.totalRequests}`);
		console.log(`   Requests (Last Hour): ${stats.requestsLastHour}`);
		console.log(`   Requests (Today): ${stats.requestsToday}`);
		console.log(`   Time Remaining: ${Math.floor(stats.timeRemaining / 1000 / 60)} minutes`);
		console.log(`   Status: ${stats.isExpired ? "❌ Expired" : stats.isRateLimited ? "⚠️ Rate Limited" : "✅ Active"}`);
	}

	// Example 5: Usage example
	console.log("\n\n📋 Example 5: Using the API Key");
	console.log("-".repeat(60));

	console.log(`
💡 How to use the API key in requests:

1. Include in header:
   curl -H "X-API-Key: ${interviewKey.apiKey}" \\
        http://localhost:3001/api/v1/health

2. Or as Bearer token:
   curl -H "Authorization: Bearer ${interviewKey.apiKey}" \\
        http://localhost:3001/api/v1/health

3. Rate limit headers are included in responses:
   X-RateLimit-Remaining: 99
   X-RateLimit-Reset: 2025-01-16T12:00:00Z
	`);

	// Example 6: Performance benchmarking
	console.log("\n\n📋 Example 6: Performance Benchmarking");
	console.log("-".repeat(60));

	console.log(`
💡 Performance benchmarking tools available:

1. Create a benchmark:
   bun run scripts/benchmarks/create-benchmark.ts \\
     --profile=profiles/my-profile.cpuprofile \\
     --name="Feature Baseline" \\
     --tags="production,feature-name"

2. Compare benchmarks:
   bun run scripts/benchmarks/compare.ts \\
     --baseline=baseline-id \\
     --current=optimized-id \\
     --threshold=5

3. View benchmarks:
   See benchmarks/README.md for full documentation

4. Performance analysis:
   See docs/BUN-V1.51-IMPACT-ANALYSIS.md for optimization guide
	`);

	// Example 7: Team & API Credentials Integration
	console.log("\n\n📋 Example 7: Team & API Credentials Integration");
	console.log("-".repeat(60));

	console.log("\n🔗 View team structure with API credentials:");
	console.log(`   GET /api/registry/team-departments`);
	console.log("\n📊 Team Registry Statistics:");
	console.log(`   Total Departments: ${teamRegistry.total}`);
	console.log(`   Members with API Keys: ${teamRegistry.withApiKeys}`);
	console.log(`   Members without API Keys: ${teamRegistry.withoutApiKeys}`);
	
	if (departments.length > 0) {
		console.log("\n👥 Department Breakdown:");
		departments.slice(0, 3).forEach((dept) => {
			const membersWithKeys = dept.members.filter(m => m.hasApiKey).length;
			console.log(`   • ${dept.name}: ${membersWithKeys}/${dept.members.length} members have API keys`);
		});
	}

	console.log("\n💡 Integration Tips:");
	console.log("   1. Associate API keys with team members via email");
	console.log("   2. Use department IDs in metadata for team assignment");
	console.log("   3. View team structure: GET /api/registry/team-departments");
	console.log("   4. Check team member API key status in registry response");

	console.log("\n" + "=".repeat(60));
	console.log("✨ Demo complete!");
	console.log("\n📚 See docs/WORKSPACE-DEVELOPER-ONBOARDING.md for full documentation");
	console.log("📊 See benchmarks/README.md for performance benchmarking");
	console.log("⚡ See docs/BUN-V1.51-IMPACT-ANALYSIS.md for optimization guide");
	console.log("👥 See docs/BUN-RSS-INTEGRATION.md for team & API credentials integration");
}

// Run if executed directly
if (import.meta.main) {
	interactiveDemo().catch(console.error);
}

export { interactiveDemo };
