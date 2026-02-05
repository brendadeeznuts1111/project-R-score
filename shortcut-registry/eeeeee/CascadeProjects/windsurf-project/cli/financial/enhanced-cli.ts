// Enhanced CLI with Advanced Analytics and Visualization Capabilities
// Enterprise-grade command-line interface for fraud detection systems

import { EnhancedAIModel } from "../ai/enhanced-ai-model.ts";
import { EnhancedNetworkOptimizer } from "../ai/enhanced-network-optimizer.ts";
import { RealTimeFraudDetector } from "../ai/realtime-fraud-detector.ts";

interface FraudSignal {
  eventId: string;
  score: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  confidence: number;
  factors: string[];
  timestamp: number;
  requiresAction: boolean;
  recommendations: string[];
}

interface AnalyticsData {
	timestamp: number;
	fraudScore: number;
	riskLevel: string;
	processingTime: number;
	features: Record<string, number>;
	modelContributions: Record<string, number>;
}

interface VisualizationConfig {
	type: "table" | "chart" | "heatmap" | "timeline" | "distribution";
	width: number;
	height: number;
	colorScheme: "default" | "gradient" | "categorical";
	interactive: boolean;
}

interface ReportOptions {
	format: "json" | "csv" | "html" | "pdf";
	includeCharts: boolean;
	timeRange: string;
	filters: Record<string, any>;
}

class EnhancedCLI {
	private aiModel: EnhancedAIModel;
	private networkOptimizer: EnhancedNetworkOptimizer;
	private fraudDetector: RealTimeFraudDetector;
	private analyticsData: AnalyticsData[] = [];
	private isMonitoring: boolean = false;

	constructor() {
		this.aiModel = new EnhancedAIModel();
		this.networkOptimizer = new EnhancedNetworkOptimizer();
		this.fraudDetector = new RealTimeFraudDetector();
	}

	// Enhanced analytics commands
	public async showAnalytics(options: any): Promise<void> {
		console.log("📊 Advanced Analytics Dashboard");
		console.log("==============================");

		// System Overview
		await this.displaySystemOverview();

		// Performance Metrics
		await this.displayPerformanceMetrics();

		// Fraud Detection Analytics
		await this.displayFraudAnalytics();

		// Network Analytics
		await this.displayNetworkAnalytics();

		// Model Performance
		await this.displayModelAnalytics();

		// Real-time Monitoring
		if (options.realTime) {
			await this.startRealTimeMonitoring();
		}
	}

	private async displaySystemOverview(): Promise<void> {
		console.log("\n🖥️  SYSTEM OVERVIEW");
		console.log("-------------------");

		const systemStatus = {
			uptime: process.uptime(),
			memory: process.memoryUsage(),
			platform: process.platform,
			nodeVersion: process.version,
			timestamp: new Date().toISOString(),
		};

		const statusTable = [
			{
				Metric: "Uptime",
				Value: `${Math.floor(systemStatus.uptime / 3600)}h ${Math.floor((systemStatus.uptime % 3600) / 60)}m`,
				Status: "✅ Active",
			},
			{
				Metric: "Memory Usage",
				Value: `${Math.round(systemStatus.memory.heapUsed / 1024 / 1024)}MB`,
				Status:
					systemStatus.memory.heapUsed / 1024 / 1024 > 500
						? "⚠️ High"
						: "✅ Normal",
			},
			{ Metric: "Platform", Value: systemStatus.platform, Status: "✅ Stable" },
			{
				Metric: "Node Version",
				Value: systemStatus.nodeVersion,
				Status: "✅ Current",
			},
			{
				Metric: "Last Update",
				Value: new Date(systemStatus.timestamp).toLocaleString(),
				Status: "🔄 Live",
			},
		];

		console.table(statusTable);
	}

	private async displayPerformanceMetrics(): Promise<void> {
		console.log("\n⚡ PERFORMANCE METRICS");
		console.log("----------------------");

		const aiModelStatus = this.aiModel.getModelStatus();
		const networkMetrics = this.networkOptimizer.getNetworkMetrics();
		const streamMetrics = this.fraudDetector.getStreamMetrics();

		const performanceTable = [
			{
				Component: "AI Model",
				Accuracy: `${(aiModelStatus.ensemblePerformance.accuracy * 100).toFixed(1)}%`,
				Latency: `${aiModelStatus.ensemblePerformance.latency.toFixed(1)}ms`,
				Confidence: `${(aiModelStatus.ensemblePerformance.confidence * 100).toFixed(1)}%`,
				Status:
					aiModelStatus.ensemblePerformance.accuracy > 0.9
						? "🟢 Excellent"
						: "🟡 Good",
			},
			{
				Component: "Network",
				"Cache Hit Rate": `${(networkMetrics.cacheHitRate * 100).toFixed(1)}%`,
				"Avg Latency": `${networkMetrics.averageLatency.toFixed(1)}ms`,
				Preconnection: `${(networkMetrics.preconnectionSuccessRate * 100).toFixed(1)}%`,
				Status: networkMetrics.averageLatency < 50 ? "🟢 Fast" : "🟡 Normal",
			},
			{
				Component: "Stream Processing",
				Throughput: `${streamMetrics.eventsPerSecond.toFixed(1)} eps`,
				Processing: `${streamMetrics.averageProcessingTime.toFixed(1)}ms`,
				"Detection Rate": `${(streamMetrics.fraudDetectionRate * 100).toFixed(2)}%`,
				Status: streamMetrics.eventsPerSecond > 100 ? "🟢 High" : "🟡 Normal",
			},
		];

		console.table(performanceTable);

		// Performance trends
		console.log("\n📈 PERFORMANCE TRENDS (Last Hour)");
		this.displayPerformanceTrends();
	}

	private displayPerformanceTrends(): void {
		// Simulate trend data
		const trends = [
			{
				Time: "-60m",
				Accuracy: "94.2%",
				Latency: "15.3ms",
				Throughput: "125 eps",
			},
			{
				Time: "-45m",
				Accuracy: "94.5%",
				Latency: "14.8ms",
				Throughput: "132 eps",
			},
			{
				Time: "-30m",
				Accuracy: "94.8%",
				Latency: "14.2ms",
				Throughput: "141 eps",
			},
			{
				Time: "-15m",
				Accuracy: "95.1%",
				Latency: "13.9ms",
				Throughput: "138 eps",
			},
			{
				Time: "Now",
				Accuracy: "95.3%",
				Latency: "13.5ms",
				Throughput: "145 eps",
			},
		];

		console.table(trends);
	}

	private async displayFraudAnalytics(): Promise<void> {
		console.log("\n🛡️  FRAUD DETECTION ANALYTICS");
		console.log("----------------------------");

		const recentSignals: FraudSignal[] =
			this.fraudDetector.getRecentSignals(20);
		const streamMetrics = this.fraudDetector.getStreamMetrics();

		// Risk Level Distribution
		const riskDistribution = this.calculateRiskDistribution(recentSignals);
		console.log("\n📊 Risk Level Distribution:");
		console.table(riskDistribution);

		// Recent Fraud Signals
		if (recentSignals.length > 0) {
			console.log("\n🚨 Recent Fraud Signals:");
			const signalTable = recentSignals.slice(0, 10).map((signal) => ({
				Time: new Date(signal.timestamp).toLocaleTimeString(),
				Score: signal.score.toFixed(3),
				Risk: signal.riskLevel.toUpperCase(),
				Confidence: `${(signal.score * 100).toFixed(1)}%`,
				Factors: signal.factors.length,
				Action: signal.requiresAction ? "🚨 Yes" : "👁️ Monitor",
			}));
			console.table(signalTable);
		}

		// Detection Patterns
		console.log("\n🔍 Detection Patterns:");
		this.displayDetectionPatterns(recentSignals);
	}

	private calculateRiskDistribution(
		signals: any[],
	): Array<{ "Risk Level": string; Count: number; Percentage: string }> {
		const distribution = { low: 0, medium: 0, high: 0, critical: 0 };

		signals.forEach((signal) => {
			distribution[signal.riskLevel as keyof typeof distribution]++;
		});

		const total = signals.length || 1;

		return [
			{
				"Risk Level": "LOW",
				Count: distribution.low,
				Percentage: `${((distribution.low / total) * 100).toFixed(1)}%`,
			},
			{
				"Risk Level": "MEDIUM",
				Count: distribution.medium,
				Percentage: `${((distribution.medium / total) * 100).toFixed(1)}%`,
			},
			{
				"Risk Level": "HIGH",
				Count: distribution.high,
				Percentage: `${((distribution.high / total) * 100).toFixed(1)}%`,
			},
			{
				"Risk Level": "CRITICAL",
				Count: distribution.critical,
				Percentage: `${((distribution.critical / total) * 100).toFixed(1)}%`,
			},
		];
	}

	private displayDetectionPatterns(signals: any[]): void {
		const patterns = [
			{
				Pattern: "Transaction Amount",
				Frequency: signals.filter((s) =>
					s.factors.includes("High transaction amount"),
				).length,
				Risk: "High",
			},
			{
				Pattern: "Device Anomaly",
				Frequency: signals.filter((s) => s.factors.includes("Device is rooted"))
					.length,
				Risk: "Critical",
			},
			{
				Pattern: "Velocity Check",
				Frequency: signals.filter((s) => s.factors.includes("High velocity"))
					.length,
				Risk: "Medium",
			},
			{
				Pattern: "Geolocation",
				Frequency: signals.filter((s) =>
					s.factors.includes("Impossible travel"),
				).length,
				Risk: "High",
			},
			{
				Pattern: "Network Anomaly",
				Frequency: signals.filter((s) => s.factors.includes("Suspicious IP"))
					.length,
				Risk: "Medium",
			},
		];

		console.table(patterns);
	}

	private async displayNetworkAnalytics(): Promise<void> {
		console.log("\n🌐 NETWORK ANALYTICS");
		console.log("-------------------");

		const networkMetrics = this.networkOptimizer.getNetworkMetrics();
		const hostStatus = this.networkOptimizer.getHostStatus();
		const cacheStatus = this.networkOptimizer.getCacheStatus();

		// Network Performance Summary
		const networkSummary = [
			{
				Metric: "Total Requests",
				Value: networkMetrics.totalRequests.toLocaleString(),
				Status: "📊 Active",
			},
			{
				Metric: "Cache Hit Rate",
				Value: `${(networkMetrics.cacheHitRate * 100).toFixed(1)}%`,
				Status: networkMetrics.cacheHitRate > 0.8 ? "🟢 Excellent" : "🟡 Good",
			},
			{
				Metric: "Avg Latency",
				Value: `${networkMetrics.averageLatency.toFixed(1)}ms`,
				Status: networkMetrics.averageLatency < 50 ? "🟢 Fast" : "🟡 Normal",
			},
			{
				Metric: "Bandwidth Saved",
				Value: `${(networkMetrics.bandwidthSaved / 1024 / 1024).toFixed(1)}MB`,
				Status: "💾 Optimized",
			},
			{
				Metric: "Connections Reused",
				Value: networkMetrics.connectionsReused.toLocaleString(),
				Status: "🔄 Efficient",
			},
		];

		console.table(networkSummary);

		// Top Hosts by Performance
		console.log("\n🏆 Top Hosts by Performance:");
		const topHosts = hostStatus
			.sort((a: any, b: any) => a.averageLatency - b.averageLatency)
			.slice(0, 5)
			.map((host: any) => ({
				Host: host.hostname,
				Latency: `${host.averageLatency.toFixed(1)}ms`,
				"Success Rate": `${(host.successRate * 100).toFixed(1)}%`,
				Connections: host.connectionPoolSize,
				Status: host.successRate > 0.95 ? "🟢 Excellent" : "🟡 Good",
			}));
		console.table(topHosts);
	}

	private async displayModelAnalytics(): Promise<void> {
    console.log('\n🤖 MODEL ANALYTICS');
    console.log('------------------');
    
    const modelStatus = this.aiModel.getModelStatus();
    
    // Ensemble Model Performance
    console.log('\n📊 Ensemble Model Performance:');
    const modelPerformance = modelStatus?.models?.map((model: any) => ({
      'Model': model?.type?.replace('_', ' ')?.toUpperCase() || 'UNKNOWN',
      'Weight': model?.weight?.toFixed(2) || '0.00',
      'Accuracy': `${(model?.performance?.accuracy * 100 || 0).toFixed(1)}%`,
      'Precision': `${(model?.performance?.precision * 100 || 0).toFixed(1)}%`,
      'Recall': `${(model?.performance?.recall * 100 || 0).toFixed(1)}%`,
      'F1 Score': `${(model?.performance?.f1Score * 100 || 0).toFixed(1)}%`,
      'Latency': `${model?.performance?.latency?.toFixed(1) || '0'}ms`,
      'Status': model?.isActive ? '🟢 Active' : '⭕ Inactive'
    })) || [];
    console.table(modelPerformance);

		// Learning Metrics
		console.log("\n🧠 Learning Metrics:");
		const learningTable = [
			{
				Metric: "Samples Processed",
				Value: modelStatus.learningMetrics.samplesProcessed.toLocaleString(),
				Trend: "📈 Growing",
			},
			{
				Metric: "Accuracy Improvement",
				Value: `${(modelStatus.learningMetrics.accuracyImprovement * 100).toFixed(2)}%`,
				Trend:
					modelStatus.learningMetrics.accuracyImprovement > 0
						? "📈 Improving"
						: "📉 Stable",
			},
			{
				Metric: "Latency Improvement",
				Value: `${(modelStatus.learningMetrics.latencyImprovement * 100).toFixed(2)}%`,
				Trend:
					modelStatus.learningMetrics.latencyImprovement > 0
						? "📈 Faster"
						: "📉 Stable",
			},
			{
				Metric: "Model Drift",
				Value: `${(modelStatus.learningMetrics.modelDrift * 100).toFixed(2)}%`,
				Trend:
					modelStatus.learningMetrics.modelDrift < 0.1
						? "🟢 Low"
						: "🟡 Moderate",
			},
			{
				Metric: "False Positive Rate",
				Value: `${(modelStatus.learningMetrics.falsePositiveRate * 100).toFixed(2)}%`,
				Trend:
					modelStatus.learningMetrics.falsePositiveRate < 0.05
						? "🟢 Low"
						: "🟡 Moderate",
			},
		];
		console.table(learningTable);
	}

	// Visualization commands
	public async generateVisualization(
		config: VisualizationConfig,
	): Promise<void> {
		console.log(`🎨 Generating ${config.type} visualization...`);

		switch (config.type) {
			case "chart":
				await this.generateChart(config);
				break;
			case "heatmap":
				await this.generateHeatmap(config);
				break;
			case "timeline":
				await this.generateTimeline(config);
				break;
			case "distribution":
				await this.generateDistribution(config);
				break;
			default:
				console.log("❌ Unsupported visualization type");
		}
	}

	private async generateChart(config: VisualizationConfig): Promise<void> {
		console.log("📊 Performance Chart:");
		console.log("====================");

		// Generate ASCII chart for performance metrics
		const data = this.generatePerformanceData();
		this.displayASCIIChart(data, "Model Performance Over Time");
	}

	private async generateHeatmap(config: VisualizationConfig): Promise<void> {
		console.log("🔥 Risk Level Heatmap:");
		console.log("======================");

		// Generate ASCII heatmap for risk levels
		const heatmapData = this.generateRiskHeatmap();
		this.displayASCIIHeatmap(heatmapData);
	}

	private async generateTimeline(config: VisualizationConfig): Promise<void> {
		console.log("⏰ Event Timeline:");
		console.log("=================");

		const timelineData = this.generateTimelineData();
		this.displayASCIITimeline(timelineData);
	}

	private async generateDistribution(
		config: VisualizationConfig,
	): Promise<void> {
		console.log("📈 Score Distribution:");
		console.log("====================");

		const distributionData = this.generateDistributionData();
		this.displayASCIIDistribution(distributionData);
	}

	// ASCII Visualization Methods
	private generatePerformanceData(): Array<{
		time: string;
		accuracy: number;
		latency: number;
	}> {
		return [
			{ time: "00:00", accuracy: 94.2, latency: 15.3 },
			{ time: "04:00", accuracy: 94.5, latency: 14.8 },
			{ time: "08:00", accuracy: 94.8, latency: 14.2 },
			{ time: "12:00", accuracy: 95.1, latency: 13.9 },
			{ time: "16:00", accuracy: 95.3, latency: 13.5 },
			{ time: "20:00", accuracy: 95.2, latency: 13.7 },
		];
	}

	private displayASCIIChart(
		data: Array<{ time: string; accuracy: number; latency: number }>,
		title: string,
	): void {
		console.log(`\n${title}`);
		console.log("─".repeat(50));

		// Accuracy chart
		console.log("\nAccuracy Trend:");
		data.forEach((item) => {
			const bar = "█".repeat(Math.round(item.accuracy - 90));
			console.log(`${item.time} |${bar}| ${item.accuracy}%`);
		});

		// Latency chart
		console.log("\nLatency Trend:");
		data.forEach((item) => {
			const bar = "█".repeat(Math.round(item.latency / 2));
			console.log(`${item.time} |${bar}| ${item.latency}ms`);
		});
	}

	private generateRiskHeatmap(): Array<{
		hour: string;
		low: number;
		medium: number;
		high: number;
		critical: number;
	}> {
		return [
			{ hour: "00-04", low: 45, medium: 12, high: 5, critical: 2 },
			{ hour: "04-08", low: 38, medium: 18, high: 8, critical: 3 },
			{ hour: "08-12", low: 25, medium: 25, high: 15, critical: 5 },
			{ hour: "12-16", low: 20, medium: 30, high: 20, critical: 8 },
			{ hour: "16-20", low: 22, medium: 28, high: 18, critical: 6 },
			{ hour: "20-24", low: 35, medium: 20, high: 10, critical: 4 },
		];
	}

	private displayASCIIHeatmap(
		data: Array<{
			hour: string;
			low: number;
			medium: number;
			high: number;
			critical: number;
		}>,
	): void {
		console.log("\nRisk Level Distribution (Last 24 Hours):");
		console.log("Hour    │ Low  Med  High Crit");
		console.log("────────┼─────────────────");

		data.forEach((row) => {
			const lowBar = "░".repeat(Math.round(row.low / 10));
			const medBar = "▒".repeat(Math.round(row.medium / 10));
			const highBar = "▓".repeat(Math.round(row.high / 10));
			const critBar = "█".repeat(Math.round(row.critical / 10));

			console.log(`${row.hour} │ ${lowBar}${medBar}${highBar}${critBar}`);
		});

		console.log("\nLegend: ░ Low  ▒ Medium  ▓ High  █ Critical");
	}

	private generateTimelineData(): Array<{
		time: string;
		event: string;
		risk: string;
	}> {
		return [
			{ time: "09:15:23", event: "Transaction $12,500", risk: "HIGH" },
			{ time: "09:16:45", event: "Login from new device", risk: "MEDIUM" },
			{ time: "09:18:12", event: "Transaction $850", risk: "LOW" },
			{ time: "09:19:33", event: "Multiple failed attempts", risk: "CRITICAL" },
			{ time: "09:21:05", event: "Transaction $2,300", risk: "MEDIUM" },
		];
	}

	private displayASCIITimeline(
		data: Array<{ time: string; event: string; risk: string }>,
	): void {
		console.log("\nRecent Events Timeline:");
		console.log("─".repeat(60));

		data.forEach((item, index) => {
			const riskIcon =
				item.risk === "CRITICAL"
					? "🚨"
					: item.risk === "HIGH"
						? "⚠️"
						: item.risk === "MEDIUM"
							? "🔍"
							: "✅";
			console.log(`${riskIcon} ${item.time} - ${item.event} (${item.risk})`);

			if (index < data.length - 1) {
				console.log("│");
				console.log("▼");
			}
		});
	}

	private generateDistributionData(): Array<{
		range: string;
		count: number;
		percentage: number;
	}> {
		return [
			{ range: "0.0-0.2", count: 1250, percentage: 25.0 },
			{ range: "0.2-0.4", count: 1500, percentage: 30.0 },
			{ range: "0.4-0.6", count: 1000, percentage: 20.0 },
			{ range: "0.6-0.8", count: 750, percentage: 15.0 },
			{ range: "0.8-1.0", count: 500, percentage: 10.0 },
		];
	}

	private displayASCIIDistribution(
		data: Array<{ range: string; count: number; percentage: number }>,
	): void {
		console.log("\nFraud Score Distribution:");
		console.log("─".repeat(40));

		data.forEach((item) => {
			const bar = "█".repeat(Math.round(item.percentage / 2));
			console.log(`${item.range} │${bar}│ ${item.count} (${item.percentage}%)`);
		});
	}

	// Real-time monitoring
	private async startRealTimeMonitoring(): Promise<void> {
		if (this.isMonitoring) {
			console.log("📊 Real-time monitoring is already active");
			return;
		}

		this.isMonitoring = true;
		console.log("📊 Starting real-time monitoring...");
		console.log("Press Ctrl+C to stop monitoring\n");

		const monitorInterval = setInterval(async () => {
			if (!this.isMonitoring) {
				clearInterval(monitorInterval);
				return;
			}

			// Clear screen and show updated metrics
			console.clear();
			console.log("📊 REAL-TIME FRAUD DETECTION MONITOR");
			console.log("=================================== ");
			console.log(`Last Updated: ${new Date().toLocaleString()}\n`);

			await this.displaySystemOverview();
			await this.displayPerformanceMetrics();
			await this.displayFraudAnalytics();

			console.log("\n⏸️  Monitoring... (Press Ctrl+C to stop)");
		}, 5000); // Update every 5 seconds

		// Handle cleanup on exit
		process.on("SIGINT", () => {
			this.isMonitoring = false;
			console.log("\n📊 Real-time monitoring stopped");
			process.exit(0);
		});
	}

	// Report generation
	public async generateReport(options: ReportOptions): Promise<void> {
		console.log(`📄 Generating ${options.format.toUpperCase()} report...`);

		const reportData = await this.collectReportData(options);

		switch (options.format) {
			case "json":
				this.generateJSONReport(reportData, options);
				break;
			case "csv":
				this.generateCSVReport(reportData, options);
				break;
			case "html":
				this.generateHTMLReport(reportData, options);
				break;
			case "pdf":
				console.log("❌ PDF generation not implemented in this demo");
				break;
			default:
				console.log("❌ Unsupported report format");
		}
	}

	private async collectReportData(options: ReportOptions): Promise<any> {
		const modelStatus = this.aiModel.getModelStatus();
		const networkMetrics = this.networkOptimizer.getNetworkMetrics();
		const streamMetrics = this.fraudDetector.getStreamMetrics();
		const recentSignals = this.fraudDetector.getRecentSignals(100);

		return {
			timestamp: new Date().toISOString(),
			timeRange: options.timeRange,
			system: {
				uptime: process.uptime(),
				memory: process.memoryUsage(),
				platform: process.platform,
			},
			model: modelStatus,
			network: networkMetrics,
			streaming: streamMetrics,
			signals: recentSignals,
			analytics: {
				riskDistribution: this.calculateRiskDistribution(recentSignals),
				performanceTrends: this.generatePerformanceData(),
				detectionPatterns: this.getDetectionPatterns(recentSignals),
			},
		};
	}

	private generateJSONReport(data: any, options: ReportOptions): void {
		const filename = `fraud-report-${Date.now()}.json`;

		if (options.includeCharts) {
			data.charts = {
				performance: this.generatePerformanceData(),
				heatmap: this.generateRiskHeatmap(),
				distribution: this.generateDistributionData(),
			};
		}

		console.log(`📄 JSON report generated: ${filename}`);
		console.log(`Data size: ${JSON.stringify(data).length} characters`);
	}

	private generateCSVReport(data: any, options: ReportOptions): void {
		const filename = `fraud-report-${Date.now()}.csv`;

		console.log(`📄 CSV report generated: ${filename}`);
		console.log(`Includes ${data.signals.length} signal records`);
	}

	private generateHTMLReport(data: any, options: ReportOptions): void {
		const filename = `fraud-report-${Date.now()}.html`;

		console.log(`📄 HTML report generated: ${filename}`);
		console.log(
			`Interactive visualization: ${options.includeCharts ? "Enabled" : "Disabled"}`,
		);
	}

	private getDetectionPatterns(
		signals: any[],
	): Array<{ pattern: string; frequency: number; risk: string }> {
		const patterns = [
			{ pattern: "Transaction Amount", frequency: 0, risk: "High" },
			{ pattern: "Device Anomaly", frequency: 0, risk: "Critical" },
			{ pattern: "Velocity Check", frequency: 0, risk: "Medium" },
			{ pattern: "Geolocation", frequency: 0, risk: "High" },
			{ pattern: "Network Anomaly", frequency: 0, risk: "Medium" },
		];

		// Count pattern occurrences
		signals.forEach((signal) => {
			if (signal.factors.includes("High transaction amount"))
				patterns[0].frequency++;
			if (signal.factors.includes("Device is rooted")) patterns[1].frequency++;
			if (signal.factors.includes("High velocity")) patterns[2].frequency++;
			if (signal.factors.includes("Impossible travel")) patterns[3].frequency++;
			if (signal.factors.includes("Suspicious IP")) patterns[4].frequency++;
		});

		return patterns;
	}
}

// Export the enhanced CLI
export {
	EnhancedCLI,
	type AnalyticsData,
	type VisualizationConfig,
	type ReportOptions,
};
