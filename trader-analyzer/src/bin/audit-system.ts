#!/usr/bin/env bun
/**
 * @fileoverview Advanced Audit System Initialization
 * @description Initialize and run the enhanced audit system
 * @module bin/audit-system
 */

import { MainAuditOrchestrator } from "../audit/enhanced/orchestrator";

/**
 * Initialize advanced audit system
 */
async function initializeAdvancedAuditSystem() {
	const orchestrator = new MainAuditOrchestrator();

	// 1. Initialize with configuration
	await orchestrator.initialize({
		mode: "hybrid",
		strategies: ["documentation", "security", "performance"],
		realTime: true,
		persistence: {
			type: "sqlite",
			connection: process.env.DATABASE_URL || "./data/audit.db",
		},
	});

	// 2. Execute comprehensive audit
	const results = await orchestrator.executeAuditChain({
		directory: "src/",
		patterns: [
			"1\\.\\d+\\.\\d+\\.\\d+\\.\\d+\\.\\d+\\.\\d+",
			"7\\.\\d+\\.\\d+\\.\\d+\\.\\d+\\.\\d+\\.\\d+",
			"9\\.\\d+\\.\\d+\\.\\d+\\.\\d+\\.\\d+\\.\\d+",
		],
		depth: 10,
		concurrency: 8,
		timeout: 60000,
	});

	console.log("📊 Audit Results:", {
		phases: results.phases.length,
		totalExecutionTime: results.totalExecutionTime,
		success: results.success,
	});

	// 3. Generate reports
	console.log("📄 Generating reports...");
	// await orchestrator.generateReport(results, {
	//   format: 'html',
	//   includeVisualizations: true,
	//   sendNotifications: true
	// });

	// 4. Start real-time monitoring
	console.log("👀 Starting real-time monitoring...");
	// const cleanup = await orchestrator.startRealTimeMonitoring({
	//   webhookUrl: process.env.WEBHOOK_URL,
	//   webSocketPort: 8080,
	//   alertRules: {
	//     highSeverity: true,
	//     orphanDetection: true,
	//     patternAnomalies: true
	//   }
	// });

	// 5. System health monitoring
	setInterval(async () => {
		const metrics = orchestrator.getMetrics();
		console.log("💚 System Health:", {
			totalScans: metrics.totalScans,
			totalMatches: metrics.totalMatches,
			averageScanTime: metrics.averageScanTime,
		});
	}, 30000);

	return orchestrator;
}

// Run if executed directly
if (import.meta.main) {
	initializeAdvancedAuditSystem()
		.then(() => {
			console.log("✅ Audit system initialized successfully");
		})
		.catch((error) => {
			console.error("❌ Failed to initialize audit system:", error);
			process.exit(1);
		});
}
