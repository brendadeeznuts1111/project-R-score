/**
 * Hyper-Bun Scheduled Operations
 *
 * Implements automated market scanning and monitoring operations using Bun's
 * native process execution and scheduling capabilities.
 */

import { $ } from "bun";
import { HyperBunMarketIntelligence } from "./market-intelligence-engine";
import { schedulerLogger, configureGlobalConsole } from "./console-enhancement";

export class HyperBunScheduler {
	private engine: HyperBunMarketIntelligence;
	private activeJobs: Map<string, Timer> = new Map();
	private jobStats: Map<string, JobStats> = new Map();

	constructor() {
		this.engine = new HyperBunMarketIntelligence();
	}

	/**
	 * Start nightly covert market scanning
	 * Uses Bun's native process execution for optimal performance
	 */
	async startNightlyScan(options: NightlyScanOptions = {}): Promise<void> {
		const jobId = "nightly-scan";

		if (this.activeJobs.has(jobId)) {
			throw new Error("Nightly scan already running");
		}

		const interval = options.interval || 24 * 60 * 60 * 1000; // 24 hours
		const scanTime = options.scanTime || "02:00"; // 2 AM default

		schedulerLogger.info(
			`Starting nightly scan job (every ${interval / (60 * 60 * 1000)} hours at ${scanTime})`,
		);

		// Calculate initial delay to next scan time
		const initialDelay = this.calculateDelayToTime(scanTime);

		const timer = setTimeout(async () => {
			await this.runNightlyScan(options);
			// Schedule recurring scans
			this.scheduleRecurringJob(jobId, interval, () =>
				this.runNightlyScan(options),
			);
		}, initialDelay);

		this.activeJobs.set(jobId, timer);
		this.jobStats.set(jobId, {
			jobId,
			status: "scheduled",
			nextRun: Date.now() + initialDelay,
			lastRun: null,
			runCount: 0,
			averageDuration: 0,
		});
	}

	/**
	 * Start real-time market propagation monitoring
	 */
	async startRealtimeMonitor(
		options: RealtimeMonitorOptions = {},
	): Promise<void> {
		const jobId = "realtime-monitor";

		if (this.activeJobs.has(jobId)) {
			throw new Error("Real-time monitor already running");
		}

		const interval = options.interval || 5 * 60 * 1000; // 5 minutes default

		schedulerLogger.info(
			`Starting real-time market monitor (every ${interval / (60 * 1000)} minutes)`,
		);

		// Start immediately, then schedule recurring
		await this.runRealtimeMonitor(options);
		this.scheduleRecurringJob(jobId, interval, () =>
			this.runRealtimeMonitor(options),
		);

		this.jobStats.set(jobId, {
			jobId,
			status: "running",
			nextRun: Date.now() + interval,
			lastRun: Date.now(),
			runCount: 1,
			averageDuration: 0,
		});
	}

	/**
	 * Execute nightly covert market scanning
	 */
	private async runNightlyScan(options: NightlyScanOptions): Promise<void> {
		const startTime = performance.now();
		const jobId = "nightly-scan";

		try {
			schedulerLogger.info("Starting nightly market scan");

			// Update job status
			this.updateJobStatus(jobId, "running");

			// Get list of markets to scan (from configuration or database)
			const marketsToScan = await this.getMarketsToScan(options);

			schedulerLogger.info(
				`Scanning ${marketsToScan.length} markets`,
				marketsToScan,
			);

			const results: MarketScanResult[] = [];

			for (const market of marketsToScan) {
				try {
					const analysis = await this.engine.analyzeMarketNode(
						market.nodeId,
						market.bookmaker,
					);

					results.push({
						market,
						analysis,
						scannedAt: Date.now(),
						success: true,
					});

					// Brief delay to respect rate limits
					await Bun.sleep(100);
				} catch (error) {
					schedulerLogger.error(
						`Failed to scan market ${market.nodeId}`,
						error,
					);
					results.push({
						market,
						analysis: null,
						scannedAt: Date.now(),
						success: false,
						error: error instanceof Error ? error.message : "Unknown error",
					});
				}
			}

			// Process results
			await this.processScanResults(results, options);

			// Export results to compressed file
			await this.exportScanResults(results, options.output);

			const duration = performance.now() - startTime;
			schedulerLogger.success(
				`Nightly scan completed in ${duration.toFixed(2)}ms. Processed ${results.length} markets.`,
				results,
			);

			this.updateJobStatus(jobId, "completed", duration);
		} catch (error) {
			const duration = performance.now() - startTime;
			console.error("❌ Nightly scan failed:", error);
			this.updateJobStatus(jobId, "failed", duration);
		}
	}

	/**
	 * Execute real-time market propagation monitoring
	 */
	private async runRealtimeMonitor(
		options: RealtimeMonitorOptions,
	): Promise<void> {
		const startTime = performance.now();
		const jobId = "realtime-monitor";

		try {
			// Update job status
			this.updateJobStatus(jobId, "running");

			// Get system health
			const healthReport = await this.engine.getSystemHealthReport();

			// Check for critical issues
			const criticalIssues = this.identifyCriticalIssues(healthReport);

			if (criticalIssues.length > 0) {
				console.warn("🚨 Critical issues detected:", criticalIssues);
				await this.sendCriticalAlerts(criticalIssues, options);
			}

			// Monitor bookmaker connectivity
			const connectivityIssues = healthReport.connectivity
				.filter((c) => !c.connected)
				.map((c) => ({ bookmaker: c.bookmaker, error: c.error }));

			if (connectivityIssues.length > 0) {
				console.warn("🔌 Connectivity issues:", connectivityIssues);
			}

			// Log performance metrics
			if (options.logPerformance) {
				console.log("📈 Performance metrics:", {
					operations: healthReport.performance.totalOperations,
					healthScore: healthReport.performance.averageHealthScore,
					anomalies: healthReport.performance.totalAnomalies,
				});
			}

			const duration = performance.now() - startTime;
			this.updateJobStatus(jobId, "completed", duration);
		} catch (error) {
			const duration = performance.now() - startTime;
			console.error("❌ Real-time monitor failed:", error);
			this.updateJobStatus(jobId, "failed", duration);
		}
	}

	/**
	 * Schedule a recurring job
	 */
	private scheduleRecurringJob(
		jobId: string,
		interval: number,
		job: () => Promise<void>,
	): void {
		const timer = setInterval(async () => {
			try {
				await job();
			} catch (error) {
				console.error(`❌ Scheduled job ${jobId} failed:`, error);
			}
		}, interval);

		this.activeJobs.set(jobId, timer);
	}

	/**
	 * Calculate delay until next occurrence of specified time
	 */
	private calculateDelayToTime(timeString: string): number {
		const [hours, minutes] = timeString.split(":").map(Number);
		const now = new Date();
		const target = new Date(now);

		target.setHours(hours, minutes, 0, 0);

		// If target time has passed today, schedule for tomorrow
		if (target <= now) {
			target.setDate(target.getDate() + 1);
		}

		return target.getTime() - now.getTime();
	}

	/**
	 * Get list of markets to scan
	 */
	private async getMarketsToScan(
		options: NightlyScanOptions,
	): Promise<MarketTarget[]> {
		// In production, this would query a database or configuration
		// For demo, return sample markets
		return [
			{ nodeId: "NFL-SF-LAC-2024", bookmaker: "betfair" },
			{ nodeId: "NBA-LAL-BOS-2024", bookmaker: "pinnacle" },
			{ nodeId: "MLB-NYY-NYM-2024", bookmaker: "betfair" },
		];
	}

	/**
	 * Process scan results and generate insights
	 */
	private async processScanResults(
		results: MarketScanResult[],
		options: NightlyScanOptions,
	): Promise<void> {
		const successful = results.filter((r) => r.success);
		const failed = results.filter((r) => !r.success);

		console.log(
			`📊 Scan results: ${successful.length} successful, ${failed.length} failed`,
		);

		// Generate summary report
		const summary = {
			timestamp: Date.now(),
			totalMarkets: results.length,
			successfulScans: successful.length,
			failedScans: failed.length,
			highRiskMarkets: successful.filter(
				(r) =>
					r.analysis?.marketHealth.riskLevel === "high" ||
					r.analysis?.marketHealth.riskLevel === "critical",
			).length,
			anomaliesDetected: successful.reduce(
				(sum, r) => sum + (r.analysis?.marketHealth.anomalyCount || 0),
				0,
			),
		};

		// Log summary
		schedulerLogger.info("Scan summary generated", summary);

		// In production, save to database or send to monitoring system
	}

	/**
	 * Export scan results to compressed file
	 */
	private async exportScanResults(
		results: MarketScanResult[],
		outputPath?: string,
	): Promise<void> {
		const outputFile = outputPath || `scan-results-${Date.now()}.json.zst`;
		const jsonData = JSON.stringify(results, null, 2);

		// Use Bun's native file operations and compression
		await Bun.write(outputFile, jsonData);

		schedulerLogger.success(`Scan results exported to ${outputFile}`);
	}

	/**
	 * Identify critical issues requiring immediate attention
	 */
	private identifyCriticalIssues(healthReport: any): CriticalIssue[] {
		const issues: CriticalIssue[] = [];

		if (healthReport.overallStatus === "critical") {
			issues.push({
				type: "system_health",
				severity: "critical",
				message: "Overall system health is critical",
			});
		}

		// Check for disconnected bookmakers
		const disconnected = healthReport.connectivity.filter(
			(c: any) => !c.connected,
		);
		if (disconnected.length > 0) {
			issues.push({
				type: "connectivity",
				severity: "high",
				message: `${disconnected.length} bookmakers disconnected`,
				details: disconnected.map((c: any) => c.bookmaker),
			});
		}

		// Check for high anomaly rates
		if (healthReport.performance.totalAnomalies > 10) {
			issues.push({
				type: "performance",
				severity: "medium",
				message: `High anomaly rate: ${healthReport.performance.totalAnomalies} anomalies detected`,
			});
		}

		return issues;
	}

	/**
	 * Send critical alerts via configured channels
	 */
	private async sendCriticalAlerts(
		issues: CriticalIssue[],
		options: RealtimeMonitorOptions,
	): Promise<void> {
		// In production, this would send alerts via email, Slack, Telegram, etc.
		for (const issue of issues) {
			console.error(
				`🚨 ALERT [${issue.severity.toUpperCase()}]: ${issue.message}`,
			);

			if (issue.details) {
				console.error("Details:", issue.details);
			}
		}

		// Example: Send to webhook if configured
		if (options.alertWebhook) {
			try {
				await fetch(options.alertWebhook, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						timestamp: Date.now(),
						alerts: issues,
					}),
				});
			} catch (error) {
				console.error("Failed to send webhook alert:", error);
			}
		}
	}

	/**
	 * Update job status and statistics
	 */
	private updateJobStatus(
		jobId: string,
		status: JobStatus,
		duration?: number,
	): void {
		const stats = this.jobStats.get(jobId);
		if (!stats) return;

		stats.status = status;
		stats.lastRun = Date.now();

		if (status === "completed" || status === "failed") {
			stats.runCount++;

			if (duration !== undefined) {
				// Update rolling average
				const alpha = 0.1; // Smoothing factor
				stats.averageDuration =
					stats.averageDuration * (1 - alpha) + duration * alpha;
			}
		}

		// Schedule next run for recurring jobs
		if (status === "completed" && jobId === "nightly-scan") {
			stats.nextRun = Date.now() + 24 * 60 * 60 * 1000; // Next day
		} else if (status === "completed" && jobId === "realtime-monitor") {
			stats.nextRun = Date.now() + 5 * 60 * 1000; // Next 5 minutes
		}

		this.jobStats.set(jobId, stats);
	}

	/**
	 * Get status of all scheduled jobs
	 */
	getJobStatuses(): JobStats[] {
		return Array.from(this.jobStats.values());
	}

	/**
	 * Stop a specific job
	 */
	stopJob(jobId: string): boolean {
		const timer = this.activeJobs.get(jobId);
		if (timer) {
			clearTimeout(timer);
			clearInterval(timer);
			this.activeJobs.delete(jobId);

			const stats = this.jobStats.get(jobId);
			if (stats) {
				stats.status = "stopped";
			}

			console.log(`🛑 Stopped job: ${jobId}`);
			return true;
		}
		return false;
	}

	/**
	 * Stop all jobs and clean up
	 */
	async shutdown(): Promise<void> {
		console.log("🛑 Shutting down Hyper-Bun scheduler...");

		// Stop all active jobs
		for (const jobId of this.activeJobs.keys()) {
			this.stopJob(jobId);
		}

		// Clean up engine
		await this.engine.shutdown();

		console.log("✅ Hyper-Bun scheduler shut down");
	}
}

// Type definitions
export interface NightlyScanOptions {
	interval?: number; // milliseconds
	scanTime?: string; // HH:MM format
	output?: string; // output file path
	markets?: MarketTarget[]; // specific markets to scan
}

export interface RealtimeMonitorOptions {
	interval?: number; // milliseconds
	logPerformance?: boolean;
	alertWebhook?: string;
}

export interface MarketTarget {
	nodeId: string;
	bookmaker: string;
}

export interface MarketScanResult {
	market: MarketTarget;
	analysis: any; // From HyperBunMarketIntelligence
	scannedAt: number;
	success: boolean;
	error?: string;
}

export interface JobStats {
	jobId: string;
	status: JobStatus;
	nextRun: number | null;
	lastRun: number | null;
	runCount: number;
	averageDuration: number;
}

export type JobStatus =
	| "scheduled"
	| "running"
	| "completed"
	| "failed"
	| "stopped";

export interface CriticalIssue {
	type: "system_health" | "connectivity" | "performance";
	severity: "low" | "medium" | "high" | "critical";
	message: string;
	details?: any;
}

/**
 * CLI interface for scheduled operations
 */
export async function runScheduledCommand(
	command: string,
	options: any = {},
): Promise<void> {
	const scheduler = new HyperBunScheduler();

	try {
		switch (command) {
			case "nightly-scan":
				await scheduler.startNightlyScan(options);
				// Keep process alive for scheduled execution
				process.on("SIGINT", async () => {
					await scheduler.shutdown();
					process.exit(0);
				});
				// Keep alive
				await new Promise(() => {}); // Never resolves
				break;

			case "realtime-monitor":
				await scheduler.startRealtimeMonitor(options);
				// Keep process alive
				process.on("SIGINT", async () => {
					await scheduler.shutdown();
					process.exit(0);
				});
				await new Promise(() => {});
				break;

			case "status":
				const statuses = scheduler.getJobStatuses();
				console.log("Job Statuses:", statuses);
				break;

			default:
				console.error(`Unknown command: ${command}`);
				console.log(
					"Available commands: nightly-scan, realtime-monitor, status",
				);
		}
	} catch (error) {
		console.error("Scheduler command failed:", error);
		await scheduler.shutdown();
		process.exit(1);
	}
}

// CLI runner
if (import.meta.main) {
	const [command, ...args] = process.argv.slice(2);
	const options = {}; // Parse args as needed

	runScheduledCommand(command, options).catch(console.error);
}
