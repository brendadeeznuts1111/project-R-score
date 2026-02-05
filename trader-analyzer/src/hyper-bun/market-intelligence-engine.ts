/**
 * Hyper-Bun Market Intelligence Example
 *
 * This example demonstrates how to use the Hyper-Bun API integration classes
 * for comprehensive market analysis and intelligence gathering.
 *
 * The example shows:
 * 1. Setting up the Hyper-Bun services
 * 2. Performing market probing and analysis
 * 3. Monitoring performance and detecting anomalies
 * 4. Secure authentication and API interactions
 */

import { MarketProbeService } from "./market-probe-service";
import { PerformanceMonitor } from "./performance-monitor";
import { SecureAuthService } from "./secure-auth-service";
import { SubMarketShadowGraphBuilder } from "./shadow-graph-builder";
import { marketLogger, configureGlobalConsole } from "./console-enhancement";

/**
 * Main Hyper-Bun Market Intelligence Engine
 */
export class HyperBunMarketIntelligence {
	private probeService!: MarketProbeService;
	private performanceMonitor!: PerformanceMonitor;
	private authService!: SecureAuthService;
	private shadowBuilder!: SubMarketShadowGraphBuilder;

	constructor(dbPath: string = "markets.db") {
		// Initialize services
		this.initializeServices(dbPath);
	}

	private async initializeServices(dbPath: string): Promise<void> {
		// Initialize secure authentication
		this.authService = new SecureAuthService(process.env.ENCRYPTION_KEY, true);

		// Initialize performance monitoring
		this.performanceMonitor = new PerformanceMonitor();

		// Initialize market probe service with rate limiting
		this.probeService = new MarketProbeService(this.authService);

		// Initialize shadow graph builder for market analysis
		this.shadowBuilder = new SubMarketShadowGraphBuilder(dbPath);

		marketLogger.success("Hyper-Bun Market Intelligence Engine initialized");
	}

	/**
	 * Comprehensive market analysis for a specific market node
	 */
	async analyzeMarketNode(
		nodeId: string,
		bookmaker: string,
	): Promise<MarketAnalysisResult> {
		return this.performanceMonitor.trackOperation(
			`market-analysis-${nodeId}`,
			async () => {
				marketLogger.info(`Analyzing market node: ${nodeId} on ${bookmaker}`);

				// Step 1: Probe the market for accessibility
				const probeResult = await this.probeService.simulateMicroBetAttempt({
					id: nodeId,
					bookmaker,
					marketType: "moneyline",
				});

				if (!probeResult.accessible) {
					return {
						nodeId,
						accessible: false,
						rejectionReason: probeResult.rejectionReason,
						analysis: null,
					};
				}

				// Step 2: Build shadow graph from historical data
				const shadowGraph = await this.shadowBuilder.buildShadowGraph(nodeId);

				// Step 3: Perform comprehensive probe
				const bookmakerProbe =
					await this.probeService.executeBookmakerApiProbe(bookmaker);

				// Step 4: Analyze market health
				const marketHealth = this.analyzeMarketHealth(
					shadowGraph,
					bookmakerProbe,
				);

				return {
					nodeId,
					accessible: true,
					rejectionReason: null,
					analysis: {
						shadowGraph,
						bookmakerHealth: bookmakerProbe,
						marketHealth,
						recommendations: this.generateRecommendations(
							shadowGraph,
							marketHealth,
						),
					},
				};
			},
		);
	}

	/**
	 * Analyze market health based on shadow graph and bookmaker status
	 */
	private analyzeMarketHealth(
		shadowGraph: any,
		bookmakerProbe: any,
	): MarketHealthAnalysis {
		const successfulProbes = bookmakerProbe.endpoints.filter(
			(e: any) => e.success,
		).length;
		const probeSuccessRate = successfulProbes / bookmakerProbe.endpoints.length;

		const anomalyScore = shadowGraph.hiddenMomentum.anomalies.length;
		const volatilityScore =
			shadowGraph.hiddenMomentum.volatilityProfile.average;

		// Calculate overall health score (0-100)
		let healthScore = 100;

		// Deduct for probe failures
		healthScore -= (1 - probeSuccessRate) * 30;

		// Deduct for anomalies
		healthScore -= Math.min(anomalyScore * 5, 20);

		// Deduct for high volatility
		if (volatilityScore > 0.1) {
			healthScore -= 10;
		}

		// Deduct for unstable trends
		if (shadowGraph.trendAnalysis.confidence < 0.5) {
			healthScore -= 15;
		}

		return {
			overallScore: Math.max(0, Math.min(100, healthScore)),
			probeSuccessRate,
			anomalyCount: anomalyScore,
			volatilityLevel: volatilityScore,
			trendStability: shadowGraph.trendAnalysis.confidence,
			riskLevel: this.calculateRiskLevel(healthScore),
		};
	}

	/**
	 * Calculate risk level based on health score
	 */
	private calculateRiskLevel(
		healthScore: number,
	): "low" | "medium" | "high" | "critical" {
		if (healthScore >= 80) return "low";
		if (healthScore >= 60) return "medium";
		if (healthScore >= 40) return "high";
		return "critical";
	}

	/**
	 * Generate trading recommendations based on analysis
	 */
	private generateRecommendations(
		shadowGraph: any,
		marketHealth: MarketHealthAnalysis,
	): TradingRecommendation[] {
		const recommendations: TradingRecommendation[] = [];

		// Trend-based recommendations
		if (
			shadowGraph.trendAnalysis.trend === "upward" &&
			shadowGraph.trendAnalysis.confidence > 0.7
		) {
			recommendations.push({
				type: "trend_following",
				action: "consider_long",
				confidence: shadowGraph.trendAnalysis.confidence,
				reasoning: "Strong upward trend detected with high confidence",
			});
		}

		// Health-based recommendations
		if (marketHealth.riskLevel === "critical") {
			recommendations.push({
				type: "risk_management",
				action: "avoid_trading",
				confidence: 0.9,
				reasoning: "Critical market health issues detected",
			});
		} else if (marketHealth.riskLevel === "high") {
			recommendations.push({
				type: "risk_management",
				action: "reduce_position_size",
				confidence: 0.7,
				reasoning: "High risk conditions - reduce exposure",
			});
		}

		// Anomaly-based recommendations
		if (marketHealth.anomalyCount > 2) {
			recommendations.push({
				type: "anomaly_alert",
				action: "monitor_closely",
				confidence: 0.8,
				reasoning:
					"Multiple anomalies detected - increased monitoring required",
			});
		}

		return recommendations;
	}

	/**
	 * Get comprehensive system health report
	 */
	async getSystemHealthReport(): Promise<SystemHealthReport> {
		const performanceSummary = this.performanceMonitor.getSystemSummary();

		// Get bookmaker connectivity status
		const bookmakerStatus = await this.checkBookmakerConnectivity();

		return {
			timestamp: Date.now(),
			performance: performanceSummary,
			connectivity: bookmakerStatus,
			overallStatus: this.determineOverallStatus(
				performanceSummary,
				bookmakerStatus,
			),
		};
	}

	/**
	 * Check connectivity to all configured bookmakers
	 */
	private async checkBookmakerConnectivity(): Promise<BookmakerConnectivity[]> {
		const bookmakers = this.authService.getConfiguredBookmakers();
		const connectivityChecks: BookmakerConnectivity[] = [];

		for (const bookmaker of bookmakers) {
			try {
				const isValid = await this.authService.validateCredentials(bookmaker);
				connectivityChecks.push({
					bookmaker,
					connected: isValid,
					lastChecked: Date.now(),
				});
			} catch (error) {
				connectivityChecks.push({
					bookmaker,
					connected: false,
					lastChecked: Date.now(),
					error: error instanceof Error ? error.message : "Unknown error",
				});
			}
		}

		return connectivityChecks;
	}

	/**
	 * Determine overall system status
	 */
	private determineOverallStatus(
		performance: any,
		connectivity: BookmakerConnectivity[],
	): "healthy" | "degraded" | "critical" {
		const avgHealthScore = performance.averageHealthScore;
		const connectedBookmakers = connectivity.filter((c) => c.connected).length;
		const totalBookmakers = connectivity.length;

		const connectivityRate = connectedBookmakers / totalBookmakers;

		if (avgHealthScore >= 80 && connectivityRate >= 0.8) {
			return "healthy";
		} else if (avgHealthScore >= 60 && connectivityRate >= 0.5) {
			return "degraded";
		} else {
			return "critical";
		}
	}

	/**
	 * Clean up resources
	 */
	async shutdown(): Promise<void> {
		marketLogger.info("Shutting down Hyper-Bun Market Intelligence Engine");

		if (this.shadowBuilder) {
			this.shadowBuilder.close();
		}

		// Export final performance data
		const exportData = this.performanceMonitor.exportData();
		marketLogger.info(
			`Exported ${exportData.operations.length} operation metrics`,
			exportData,
		);
	}
}

// Type definitions
export interface MarketAnalysisResult {
	nodeId: string;
	accessible: boolean;
	rejectionReason: string | null;
	analysis: MarketAnalysis | null;
}

export interface MarketAnalysis {
	shadowGraph: any;
	bookmakerHealth: any;
	marketHealth: MarketHealthAnalysis;
	recommendations: TradingRecommendation[];
}

export interface MarketHealthAnalysis {
	overallScore: number;
	probeSuccessRate: number;
	anomalyCount: number;
	volatilityLevel: number;
	trendStability: number;
	riskLevel: "low" | "medium" | "high" | "critical";
}

export interface TradingRecommendation {
	type: "trend_following" | "risk_management" | "anomaly_alert";
	action: string;
	confidence: number;
	reasoning: string;
}

export interface SystemHealthReport {
	timestamp: number;
	performance: any;
	connectivity: BookmakerConnectivity[];
	overallStatus: "healthy" | "degraded" | "critical";
}

export interface BookmakerConnectivity {
	bookmaker: string;
	connected: boolean;
	lastChecked: number;
	error?: string;
}

/**
 * Example usage function
 */
export async function demonstrateHyperBunUsage(): Promise<void> {
	// Configure enhanced console output
	configureGlobalConsole();

	marketLogger.info("Starting Hyper-Bun Market Intelligence Demonstration");

	// Initialize the engine
	const engine = new HyperBunMarketIntelligence();

	try {
		// Example market analysis
		const analysisResult = await engine.analyzeMarketNode(
			"NFL-SF-LAC-2024",
			"betfair",
		);

		marketLogger.success("Market analysis completed", analysisResult);

		// System health check
		const healthReport = await engine.getSystemHealthReport();
		marketLogger.info("System health report generated", healthReport);
	} catch (error) {
		marketLogger.error("Error during demonstration", error);
	} finally {
		await engine.shutdown();
	}
}

// CLI runner
if (import.meta.main) {
	demonstrateHyperBunUsage().catch(console.error);
}
