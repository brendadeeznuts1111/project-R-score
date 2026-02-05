/**
 * @fileoverview 9.1.5.18.0.0.0: Main Audit Orchestrator
 * @description Orchestrates hybrid audit using both Workers and Spawn
 * @module audit/main-audit-orchestrator
 *
 * Cross-Reference Hub:
 * - @see 9.1.5.11.0.0.0 → RealTimeProcessManager (spawn-based)
 * - @see 9.1.5.14.0.0.0 → WorkerAuditManager (workers-based)
 * - @see 9.1.5.7.0.0.0 → Orphan Detector
 */

import { RealTimeProcessManager } from "./real-time-process-manager";
import { WorkerAuditManager } from "./worker-audit-manager";
import { OrphanDetector } from "./orphan-detector";

/**
 * 9.1.5.18.0.0.0: Main Audit Orchestrator
 *
 * Orchestrates hybrid audit system using both Workers API and Spawn processes.
 * Automatically selects the best approach based on task requirements.
 */
export class MainAuditOrchestrator {
	private processManager = new RealTimeProcessManager();
	private workerManager = new WorkerAuditManager();
	private orphanDetector = new OrphanDetector();

	/**
	 * 9.1.5.18.1.0.0: Hybrid audit execution
	 *
	 * Uses Workers for CPU-intensive tasks and Spawn for I/O-heavy operations.
	 *
	 * @param options - Audit configuration
	 * @returns Hybrid audit result
	 */
	async hybridAudit(options: HybridAuditOptions): Promise<HybridAuditResult> {
		const startTime = Date.now();
		const useWorkers =
			options.useWorkers ?? process.env.AUDIT_USE_WORKERS === "true";

		// Use Workers for pattern scanning (CPU-intensive)
		const patternResults = useWorkers
			? await this.workerManager.executeParallelPatternScan(options.patterns, [
					options.directory,
				])
			: await this.processManager.executeParallelPatternScan(options.patterns, [
					options.directory,
				]);

		// Use Orphan Detector for documentation analysis (I/O-intensive)
		const orphanedDocs = await this.orphanDetector.findOrphanedDocs();
		const undocumentedCode = await this.orphanDetector.findUndocumentedCode();
		const crossRefIntegrity =
			await this.orphanDetector.checkCrossReferenceIntegrity();

		const duration = Date.now() - startTime;

		return {
			duration,
			mode: useWorkers ? "workers" : "spawn",
			totalMatches: patternResults.reduce((sum, r) => sum + r.matches, 0),
			totalOrphans: orphanedDocs.length,
			totalUndocumented: undocumentedCode.length,
			patternResults,
			orphanedDocs,
			undocumentedCode,
			crossRefIntegrity,
			workerResults: useWorkers
				? {
						totalFiles: patternResults.length,
						workersUsed: 4,
					}
				: undefined,
		};
	}

	/**
	 * 9.1.5.18.2.0.0: Quick audit for CI/CD
	 *
	 * Fast audit optimized for CI/CD pipelines.
	 *
	 * @param options - Quick audit options
	 * @returns Quick audit result
	 */
	async quickAudit(options: QuickAuditOptions = {}): Promise<QuickAuditResult> {
		const startTime = Date.now();

		// Fast synchronous validation
		const validation = this.processManager.validateDocumentationSync();

		// Quick orphan check (limited scope)
		const orphanedDocs = await this.orphanDetector.findOrphanedDocs();
		const topOrphans = orphanedDocs.slice(0, options.maxOrphans || 10);

		const duration = Date.now() - startTime;

		return {
			duration,
			validation,
			orphanedDocs: topOrphans,
			success: validation.status === "valid" && topOrphans.length === 0,
		};
	}

	/**
	 * 9.1.5.18.3.0.0: Shutdown all managers
	 *
	 * Gracefully shuts down all audit managers.
	 */
	async shutdown(): Promise<void> {
		await Promise.all([
			this.processManager.shutdown(),
			this.workerManager.shutdown(),
		]);
	}
}

// ============ Type Definitions ============

/**
 * Hybrid audit options
 */
export interface HybridAuditOptions {
	directory: string;
	patterns: string[];
	timeout?: number;
	maxWorkers?: number;
	useWorkers?: boolean;
	quick?: boolean;
}

/**
 * Hybrid audit result
 */
export interface HybridAuditResult {
	duration: number;
	mode: "workers" | "spawn";
	totalMatches: number;
	totalOrphans: number;
	totalUndocumented: number;
	patternResults: Array<{
		pattern: string;
		directory: string;
		matches: number;
		details: any[];
	}>;
	orphanedDocs: string[];
	undocumentedCode: Array<{
		type: string;
		file: string;
		line: number;
		code: string;
		pattern: string;
	}>;
	crossRefIntegrity: {
		status: "healthy" | "warning" | "critical";
		issues: string[];
		totalReferences: number;
		invalidReferences: number;
	};
	workerResults?: {
		totalFiles: number;
		workersUsed: number;
	};
}

/**
 * Quick audit options
 */
export interface QuickAuditOptions {
	maxOrphans?: number;
}

/**
 * Quick audit result
 */
export interface QuickAuditResult {
	duration: number;
	validation: {
		status: "valid" | "invalid";
		issues: string[];
		timestamp: string;
	};
	orphanedDocs: string[];
	success: boolean;
}
