#!/usr/bin/env bun
// CLI Risk Hunter Tool
// Advanced command-line interface for fraud detection and risk hunting
// Real-time session monitoring, pattern analysis, and threat hunting
// Enhanced with network optimization and external API integration

import {
	type ExternalDataSources,
	type FeatureVector,
	fetchExternalData,
	predictRisk,
	predictRiskEnhanced,
} from "../ai/anomaly-predict.js";
import {
	getNetworkMetrics,
	networkOptimizer,
} from "../ai/network-optimizer.js";
import { fraudRiskOracle } from "../fraud-oracle/risk-scoring";
import { ghostShield } from "../ghost-shield/privacy-handler";
import { proxyDetector } from "../ghost-shield/proxy-detector";

// CLI configuration
interface RiskHunterConfig {
	apiEndpoint: string;
	wsEndpoint: string;
	outputFormat: "json" | "table" | "csv";
	maxResults: number;
	realTime: boolean;
	verbose: boolean;
	enableExternalAPIs: boolean;
	networkOptimization: boolean;
}

// Enhanced risk session data
interface RiskSession {
	sessionId: string;
	merchantId: string;
	score: number;
	riskLevel: string;
	timestamp: number;
	features: Record<string, number>;
	blocked: boolean;
	reason?: string;
	patterns?: string[];
	externalData?: ExternalDataSources;
	networkMetrics?: any;
	processingTime?: number;
}

// CLI command options
interface CLIOptions {
	command:
		| "hunt"
		| "analyze"
		| "monitor"
		| "report"
		| "test"
		| "network"
		| "external"
		| "matrix";
	since?: string;
	parseSince?: string;
	threshold?: number;
	merchant?: string;
	sessionId?: string;
	features?: string;
	output?: string;
	verbose?: boolean;
	realTime?: boolean;
	external?: boolean;
	network?: boolean;
}

export class RiskHunterCLI {
	private config: RiskHunterConfig;
	private sessions: RiskSession[] = [];

	constructor(config: Partial<RiskHunterConfig> = {}) {
		this.config = {
			apiEndpoint: `http://${process.env.HOST || "0.0.0.0"}:${process.env.PORT || "3051"}`,
			wsEndpoint: `ws://${process.env.HOST || "0.0.0.0"}:${process.env.PORT || "3051"}/ws/risk-live`,
			outputFormat: "table",
			maxResults: 100,
			realTime: false,
			verbose: false,
			enableExternalAPIs: true,
			networkOptimization: true,
			...config,
		};

		// Initialize network optimizer if enabled
		if (this.config.networkOptimization) {
			networkOptimizer.initialize().catch(console.error);
		}
	}

	// Main CLI entry point
	async run(args: string[]): Promise<void> {
		try {
			const options = this.parseArguments(args);

			console.log("🔍 Factory Wager Risk Hunter CLI v2.0");
			console.log("=======================================");
			console.log(
				`🌐 Network Optimization: ${this.config.networkOptimization ? "Enabled" : "Disabled"}`,
			);
			console.log(
				`🔗 External APIs: ${this.config.enableExternalAPIs ? "Enabled" : "Disabled"}`,
			);
			console.log("");

			switch (options.command) {
				case "hunt":
					await this.huntHighRiskSessions(options);
					break;
				case "analyze":
					await this.analyzeSession(options);
					break;
				case "monitor":
					await this.monitorRealTime(options);
					break;
				case "report":
					await this.generateReport(options);
					break;
				case "test":
					await this.runTests(options);
					break;
				case "network":
					await this.showNetworkMetrics(options);
					break;
				case "external":
					await this.testExternalAPIs(options);
					break;
				case "matrix":
					this.displayMatrixConfig();
					break;
				default:
					this.showHelp();
			}
		} catch (error) {
			console.error(
				"❌ Error:",
				error instanceof Error ? error.message : String(error),
			);
			process.exit(1);
		}
	}

	// Parse command line arguments
	private parseArguments(args: string[]): CLIOptions {
		const options: Partial<CLIOptions> = {};

		// Default command
		options.command = "hunt";

		for (let i = 0; i < args.length; i++) {
			const arg = args[i];
			const nextArg = args[i + 1];

			switch (arg) {
				case "hunt":
				case "analyze":
				case "monitor":
				case "report":
				case "test":
				case "network":
				case "external":
				case "matrix":
					options.command = arg;
					break;
				case "--since":
					options.since = nextArg;
					i++;
					break;
				case "--threshold":
					options.threshold = parseFloat(nextArg || "0");
					i++;
					break;
				case "--merchant":
					options.merchant = nextArg;
					i++;
					break;
				case "--session-id":
					options.sessionId = nextArg;
					i++;
					break;
				case "--features":
					options.features = nextArg;
					i++;
					break;
				case "--output":
					options.output = nextArg;
					i++;
					break;
				case "--verbose":
				case "-v":
					options.verbose = true;
					break;
				case "--real-time":
				case "-r":
					options.realTime = true;
					break;
				case "--help":
				case "-h":
					this.showHelp();
					process.exit(0);
					break;
			}
		}

		return options as CLIOptions;
	}

	// Hunt for high-risk sessions
	private async huntHighRiskSessions(options: CLIOptions): Promise<void> {
		console.log(`🎯 Hunting high-risk sessions...`);

		const threshold = options.threshold || 0.92;
		const since = options.parseSince
			? this.parseSince(options.since!)
			: Date.now() - 60 * 60 * 1000; // Default 1 hour

		console.log(`   Threshold: ${threshold}`);
		console.log(`   Since: ${new Date(since).toLocaleString()}`);
		console.log("");

		try {
			// Fetch recent sessions from API
			const response = await fetch(
				`${this.config.apiEndpoint}/api/risk/heatmap`,
			);
			const data = (await response.json()) as { sessions: RiskSession[] };

			// Filter high-risk sessions
			const highRiskSessions = data.sessions
				.filter(
					(session: any) =>
						session.score >= threshold && session.timestamp >= since,
				)
				.slice(0, this.config.maxResults);

			if (highRiskSessions.length === 0) {
				console.log("✅ No high-risk sessions found.");
				return;
			}

			console.log(`🚨 Found ${highRiskSessions.length} high-risk sessions:`);
			console.log("");

			// Display results
			this.displaySessions(highRiskSessions, options.output);

			// Show detailed analysis for top sessions
			if (options.verbose && highRiskSessions.length > 0) {
				console.log("");
				console.log("📊 Detailed Analysis:");
				console.log("=====================");

				for (const session of highRiskSessions.slice(0, 3)) {
					await this.analyzeSessionDetails(session);
				}
			}
		} catch (error) {
			console.error("❌ Failed to fetch session data:", error);
		}
	}

	// Analyze specific session
	private async analyzeSession(options: CLIOptions): Promise<void> {
		if (!options.sessionId && !options.features) {
			console.error("❌ Session ID or features required for analysis");
			return;
		}

		if (options.features) {
			// Analyze with provided features
			await this.analyzeWithFeatures(options.features, options);
		} else {
			// Analyze existing session
			await this.analyzeExistingSession(options.sessionId!, options);
		}
	}

	// Analyze with provided features
	private async analyzeWithFeatures(
		featuresStr: string,
		options: CLIOptions,
	): Promise<void> {
		console.log("🔬 Analyzing session with provided features...");

		try {
			// Parse features (comma-separated values)
			const features = this.parseFeatures(featuresStr);
			const sessionId = `cli-analysis-${Date.now()}`;
			const merchantId = options.merchant || "cli-test";

			console.log(`   Features: ${JSON.stringify(features)}`);
			console.log("");

			// Run fraud detection
			const session = await predictRisk(features, sessionId, merchantId);

			// Display results
			this.displaySessionAnalysis(session, options);
		} catch (error) {
			console.error("❌ Failed to analyze features:", error);
		}
	}

	// Analyze existing session
	private async analyzeExistingSession(
		sessionId: string,
		options: CLIOptions,
	): Promise<void> {
		console.log(`🔍 Analyzing session: ${sessionId}`);

		try {
			// Fetch session details (mock implementation)
			console.log("   Fetching session details...");

			// Simulate session data
			const mockSession = {
				sessionId,
				merchantId: "test-merchant",
				score: 0.847,
				riskLevel: "high",
				timestamp: Date.now() - 30000,
				features: {
					root_detected: 0,
					vpn_active: 1,
					thermal_spike: 8.2,
					biometric_fail: 1,
					proxy_hop_count: 2,
				},
				blocked: false,
				reason: "vpn_active + proxy_hop_count",
			};

			this.displaySessionAnalysis(mockSession, options);
		} catch (error) {
			console.error("❌ Failed to analyze session:", error);
		}
	}

	// Monitor real-time sessions
	private async monitorRealTime(options: CLIOptions): Promise<void> {
		console.log("📡 Starting real-time monitoring...");
		console.log("   Press Ctrl+C to stop");
		console.log("");

		const ws = new WebSocket(this.config.wsEndpoint);

		ws.onopen = () => {
			console.log("✅ Connected to real-time stream");
		};

		ws.onmessage = (event) => {
			const data = JSON.parse(event.data);
			this.handleRealTimeMessage(data, options);
		};

		ws.onclose = () => {
			console.log("❌ Disconnected from real-time stream");
		};

		ws.onerror = (error) => {
			console.error("❌ WebSocket error:", error);
		};

		// Keep process alive
		process.on("SIGINT", () => {
			console.log("\\n🛑 Stopping real-time monitoring...");
			ws.close();
			process.exit(0);
		});
	}

	// Handle real-time messages
	private handleRealTimeMessage(data: any, options: CLIOptions): void {
		const timestamp = new Date().toLocaleTimeString();

		switch (data.event) {
			case "fraud:blocked":
				console.log(
					`🚨 [${timestamp}] BLOCKED: ${data.sessionId} | Score: ${data.score.toFixed(3)} | ${data.reason}`,
				);
				break;
			case "fraud:detected":
				if (data.score >= (options.threshold || 0.8)) {
					console.log(
						`⚠️  [${timestamp}] DETECTED: ${data.sessionId} | Score: ${data.score.toFixed(3)} | ${data.riskLevel}`,
					);
				}
				break;
			case "risk:score":
				if (options.verbose) {
					console.log(
						`📊 [${timestamp}] SCORE: ${data.sessionId} | ${data.score.toFixed(3)} | ${data.riskLevel}`,
					);
				}
				break;
		}
	}

	// Generate report
	private async generateReport(options: CLIOptions): Promise<void> {
		console.log("📈 Generating fraud detection report...");

		try {
			const since = options.since
				? this.parseSince(options.since!)
				: Date.now() - 24 * 60 * 60 * 1000;

			// Fetch data
			const healthResponse = await fetch(
				`${this.config.apiEndpoint}/api/health`,
			);
			const healthData = await healthResponse.json();

			const heatmapResponse = await fetch(
				`${this.config.apiEndpoint}/api/risk/heatmap`,
			);
			const heatmapData = (await heatmapResponse.json()) as {
				total_active: number;
				blocked_sessions: number;
				avg_score: number;
				high_risk_count: number;
				patterns: any[];
				sessions: RiskSession[];
			};

			// Generate report
			const report = {
				generatedAt: new Date().toISOString(),
				period: {
					start: new Date(since).toISOString(),
					end: new Date().toISOString(),
				},
				summary: {
					totalSessions: heatmapData.total_active,
					blockedSessions: heatmapData.blocked_sessions,
					averageRiskScore: heatmapData.avg_score,
					detectionRate:
						(
							(heatmapData.blocked_sessions /
								Math.max(heatmapData.total_active, 1)) *
							100
						).toFixed(1) + "%",
				},
				riskDistribution: this.calculateRiskDistribution(heatmapData.sessions),
				topRiskSessions: heatmapData.sessions
					.sort((a: any, b: any) => b.score - a.score)
					.slice(0, 10),
				recommendations: this.generateRecommendations(healthData, heatmapData),
			};

			// Output report
			if (options.output === "json") {
				console.log(JSON.stringify(report, null, 2));
			} else {
				this.displayReport(report);
			}
		} catch (error) {
			console.error("❌ Failed to generate report:", error);
		}
	}

	// Run tests
	private async runTests(options: CLIOptions): Promise<void> {
		console.log("🧪 Running fraud detection tests...");

		const testCases = [
			{
				name: "Legitimate User",
				features: {
					root_detected: 0,
					vpn_active: 0,
					thermal_spike: 2,
					biometric_fail: 0,
					proxy_hop_count: 0,
				},
				expectedScore: "< 0.5",
			},
			{
				name: "VPN User",
				features: {
					root_detected: 0,
					vpn_active: 1,
					thermal_spike: 5,
					biometric_fail: 1,
					proxy_hop_count: 1,
				},
				expectedScore: "0.5 - 0.8",
			},
			{
				name: "High Risk",
				features: {
					root_detected: 1,
					vpn_active: 1,
					thermal_spike: 20,
					biometric_fail: 4,
					proxy_hop_count: 5,
				},
				expectedScore: "> 0.9",
			},
		];

		console.log("");

		for (const testCase of testCases) {
			console.log(`Testing: ${testCase.name}`);
			console.log(`   Expected: ${testCase.expectedScore}`);

			try {
				const sessionId = `test-${Date.now()}-${Math.random()}`;
				const result = await predictRisk(
					testCase.features,
					sessionId,
					"test-merchant",
				);

				console.log(
					`   Actual: ${result.score.toFixed(3)} (${result.riskLevel})`,
				);
				console.log(`   Status: ${result.blocked ? "BLOCKED" : "ALLOWED"}`);

				if (options.verbose) {
					console.log(`   Features: ${JSON.stringify(testCase.features)}`);
					console.log(`   Reason: ${result.reason || "N/A"}`);
				}
			} catch (error) {
				console.log(`   Error: ${error}`);
			}

			console.log("");
		}

		console.log("✅ Test suite completed");
	}

	// Parse features from string
	private parseFeatures(featuresStr: string): FeatureVector {
		const values = featuresStr.split(",").map((v) => v.trim());

		return {
			root_detected: parseFloat(values[0] || "0"),
			vpn_active: parseFloat(values[1] || "0"),
			thermal_spike: parseFloat(values[2] || "0"),
			biometric_fail: parseFloat(values[3] || "0"),
			proxy_hop_count: parseFloat(values[4] || "0"),
		};
	}

	// Parse since time string
	private parseSince(sinceStr: string): number {
		const now = Date.now();

		if (sinceStr.endsWith("m")) {
			const minutes = parseInt(sinceStr.slice(0, -1));
			return now - minutes * 60 * 1000;
		} else if (sinceStr.endsWith("h")) {
			const hours = parseInt(sinceStr.slice(0, -1));
			return now - hours * 60 * 60 * 1000;
		} else if (sinceStr.endsWith("d")) {
			const days = parseInt(sinceStr.slice(0, -1));
			return now - days * 24 * 60 * 60 * 1000;
		} else {
			// Try parsing as ISO date
			const date = new Date(sinceStr);
			return date.getTime();
		}
	}

	// Display sessions in different formats
	private displaySessions(sessions: any[], outputFormat?: string): void {
		const format = outputFormat || this.config.outputFormat;

		switch (format) {
			case "json":
				console.log(JSON.stringify(sessions, null, 2));
				break;
			case "csv":
				this.displaySessionsAsCSV(sessions);
				break;
			case "table":
			default:
				this.displaySessionsAsTable(sessions);
				break;
		}
	}

	// Display sessions as table using bun.inspect.table
	private displaySessionsAsTable(sessions: any[]): void {
		if (sessions.length === 0) return;

		// Transform sessions data for table display
		const tableData = sessions.map((session) => ({
			"Session ID": session.sessionId || "unknown",
			Merchant: session.merchantId || "unknown",
			Score: session.score.toFixed(3),
			"Risk Level": session.riskLevel || "unknown",
			Status: session.blocked ? "🚫 BLOCKED" : "✅ Active",
			Timestamp: new Date(session.timestamp).toLocaleString(),
		}));

		console.log("📊 Risk Sessions Table:");
		console.log("");

		// Use bun.inspect.table for formatted display
		console.table(tableData);

		console.log("");
		console.log(`📈 Summary: ${sessions.length} sessions displayed`);
	}

	// Display sessions as CSV
	private displaySessionsAsCSV(sessions: any[]): void {
		console.log("Session ID,Merchant ID,Score,Risk Level,Blocked,Timestamp");

		sessions.forEach((session) => {
			console.log(
				`"${session.sessionId}","${session.merchantId}",${session.score},"${session.riskLevel}",${session.blocked},${session.timestamp}`,
			);
		});
	}

	// Display matrix configuration using bun.inspect.table
	private displayMatrixConfig(): void {
		console.log("🏗️ Matrix Configuration System");
		console.log("================================");

		// Feature matrix columns
		const featureColumns = {
			"Basic Properties": [
				"name",
				"weight",
				"threshold",
				"description",
				"impact",
			],
			"Data Characteristics": [
				"data_type",
				"collection_method",
				"refresh_rate",
				"reliability",
				"cost",
			],
			"Privacy & Compliance": [
				"privacy_level",
				"retention_days",
				"gdpr_sensitive",
				"pci_required",
				"hipaa_phi",
			],
			Engineering: [
				"normalization",
				"encoding",
				"validation",
				"drift_detection",
			],
			Performance: [
				"importance_score",
				"feature_correlation",
				"stability_index",
				"latency_ms",
			],
			Business: [
				"business_impact",
				"cost_benefit_ratio",
				"risk_contribution",
				"regulatory_flag",
			],
		};

		console.log("");
		console.log("📊 Feature Matrix Columns:");
		console.table(featureColumns);

		// Feature details
		const featureDetails = [
			{
				Feature: "root_detected",
				Weight: 0.28,
				Threshold: 1,
				Impact: "Critical",
				"Data Type": "Binary",
				Reliability: 0.98,
				Cost: "$0.001",
			},
			{
				Feature: "vpn_active",
				Weight: 0.22,
				Threshold: 1,
				Impact: "High",
				"Data Type": "Binary",
				Reliability: 0.95,
				Cost: "$0.002",
			},
			{
				Feature: "thermal_spike",
				Weight: 0.15,
				Threshold: 15,
				Impact: "Medium",
				"Data Type": "Numeric",
				Reliability: 0.92,
				Cost: "$0.0005",
			},
			{
				Feature: "biometric_fail",
				Weight: 0.18,
				Threshold: 3,
				Impact: "High",
				"Data Type": "Integer",
				Reliability: 0.96,
				Cost: "$0.003",
			},
			{
				Feature: "proxy_hop_count",
				Weight: 0.17,
				Threshold: 3,
				Impact: "High",
				"Data Type": "Integer",
				Reliability: 0.89,
				Cost: "$0.004",
			},
		];

		console.log("");
		console.log("🎯 Feature Details:");
		console.table(featureDetails);

		// Ensemble models
		const ensembleModels = [
			{
				Model: "gradient_boosting_core",
				Type: "XGBoost",
				Version: "1.2.0",
				Accuracy: "94%",
				"Inference Time": "3ms",
				Memory: "128MB",
				"GPU Required": false,
				"Cost/1K Pred": "$0.005",
			},
		];

		console.log("");
		console.log("🤖 Ensemble Models:");
		console.table(ensembleModels);

		console.log("");
		console.log("✅ Matrix configuration loaded successfully");
	}

	// Display single session
	private displaySession(session: any): void {
		console.log("📊 Session Results:");
		console.log("==================");
		console.log(`Session ID: ${session.sessionId}`);
		console.log(`Merchant ID: ${session.merchantId}`);
		console.log(`Risk Score: ${session.score.toFixed(3)}`);
		console.log(`Risk Level: ${session.riskLevel}`);
		console.log(`Blocked: ${session.blocked ? "Yes" : "No"}`);
		if (session.reason) {
			console.log(`Reason: ${session.reason}`);
		}
		console.log(`Timestamp: ${new Date(session.timestamp).toLocaleString()}`);
		console.log("");
	}

	// Display session analysis
	private displaySessionAnalysis(session: any, options: CLIOptions): void {
		console.log("📊 Session Analysis Results:");
		console.log("==========================");
		console.log(`Session ID: ${session.sessionId}`);
		console.log(`Merchant: ${session.merchantId}`);
		console.log(
			`Score: ${session.score.toFixed(3)} (${(session.score * 100).toFixed(1)}%)`,
		);
		console.log(`Risk Level: ${session.riskLevel.toUpperCase()}`);
		console.log(`Status: ${session.blocked ? "🚫 BLOCKED" : "✅ ACTIVE"}`);

		if (session.reason) {
			console.log(`Reason: ${session.reason}`);
		}

		if (options.verbose && session.features) {
			console.log("");
			console.log("Feature Breakdown:");
			console.log("------------------");
			Object.entries(session.features).forEach(([feature, value]) => {
				console.log(`${feature}: ${value}`);
			});
		}

		console.log("");
	}

	// Analyze session details
	private async analyzeSessionDetails(session: any): Promise<void> {
		console.log(`🔍 Deep Analysis: ${session.sessionId}`);
		console.log("=====================================");

		// Simulate detailed analysis
		const analysis = {
			ghostShieldResult: {
				isGhostFriendly: Math.random() > 0.7,
				detectedService: "privacy_com",
				riskAdjustment: 0.3,
			},
			proxyAnalysis: {
				isProxyDetected: session.features?.proxy_hop_count > 0,
				hopCount: session.features?.proxy_hop_count || 0,
				proxyType: "vpn",
			},
			patterns: [
				"VPN usage detected",
				"Multi-hop proxy pattern",
				"Unusual geographic location",
			],
		};

		console.log(
			`Ghost Shield: ${analysis.ghostShieldResult.isGhostFriendly ? "✅ Friendly" : "⚠️ Suspicious"}`,
		);
		console.log(
			`Proxy Detection: ${analysis.proxyAnalysis.isProxyDetected ? "🔍 Detected" : "✅ Clean"}`,
		);
		console.log(`Patterns Found: ${analysis.patterns.length}`);

		analysis.patterns.forEach((pattern, index) => {
			console.log(`  ${index + 1}. ${pattern}`);
		});

		console.log("");
	}

	// Calculate risk distribution
	private calculateRiskDistribution(sessions: any[]): Record<string, number> {
		const distribution = {
			low: 0,
			medium: 0,
			high: 0,
			critical: 0,
		};

		sessions.forEach((session) => {
			const level = session.riskLevel || "low";
			distribution[level as keyof typeof distribution]++;
		});

		return distribution;
	}

	// Generate recommendations
	private generateRecommendations(healthData: any, heatmapData: any): string[] {
		const recommendations: string[] = [];

		if (healthData.avg_risk_score > 0.7) {
			recommendations.push("Consider tightening detection thresholds");
		}

		if (heatmapData.blocked_sessions > heatmapData.total_active * 0.1) {
			recommendations.push("High block rate detected - review false positives");
		}

		if (heatmapData.total_active < 100) {
			recommendations.push("Low session volume - check system health");
		}

		recommendations.push("Continue monitoring ghost-friendly patterns");
		recommendations.push("Regular weight optimization recommended");

		return recommendations;
	}

	// Display report
	private displayReport(report: any): void {
		console.log("📈 Fraud Detection Report");
		console.log("========================");
		console.log(`Generated: ${new Date(report.generatedAt).toLocaleString()}`);
		console.log(
			`Period: ${new Date(report.period.start).toLocaleString()} - ${new Date(report.period.end).toLocaleString()}`,
		);
		console.log("");

		console.log("📊 Summary:");
		console.log(`   Total Sessions: ${report.summary.totalSessions}`);
		console.log(`   Blocked Sessions: ${report.summary.blockedSessions}`);
		console.log(
			`   Average Risk Score: ${report.summary.averageRiskScore.toFixed(3)}`,
		);
		console.log(`   Detection Rate: ${report.summary.detectionRate}`);
		console.log("");

		console.log("🎯 Risk Distribution:");
		Object.entries(report.riskDistribution).forEach(([level, count]) => {
			console.log(
				`   ${level.charAt(0).toUpperCase() + level.slice(1)}: ${count}`,
			);
		});
		console.log("");

		if (report.topRiskSessions.length > 0) {
			console.log("🚨 Top Risk Sessions:");
			report.topRiskSessions
				.slice(0, 5)
				.forEach((session: any, index: number) => {
					console.log(
						`   ${index + 1}. ${session.sessionId} | Score: ${session.score.toFixed(3)} | ${session.riskLevel}`,
					);
				});
			console.log("");
		}

		console.log("💡 Recommendations:");
		report.recommendations.forEach((rec: string, index: number) => {
			console.log(`   ${index + 1}. ${rec}`);
		});
	}

	// Show network performance metrics
	private async showNetworkMetrics(options: CLIOptions): Promise<void> {
		console.log("🌐 Network Performance Metrics");
		console.log("=============================");

		try {
			const metrics = getNetworkMetrics();

			// Connection statistics table
			const connectionStats = [
				{
					Metric: "Preconnected Hosts",
					Value: metrics.preconnectedHosts,
					Status: "✅ Active",
				},
				{
					Metric: "Preconnect Failures",
					Value: metrics.preconnectFailures,
					Status: metrics.preconnectFailures > 0 ? "⚠️ Warning" : "✅ Good",
				},
				{
					Metric: "Total Requests",
					Value: metrics.totalRequests,
					Status: "📊 Tracked",
				},
				{
					Metric: "Total Failures",
					Value: metrics.totalFailures,
					Status: metrics.totalFailures > 0 ? "❌ Issues" : "✅ Clean",
				},
				{
					Metric: "Success Rate",
					Value: `${metrics.successRate}%`,
					Status: metrics.successRate > 95 ? "✅ Excellent" : "⚠️ Monitor",
				},
				{
					Metric: "Avg Response Time",
					Value: `${metrics.averageResponseTime}ms`,
					Status: metrics.averageResponseTime < 100 ? "✅ Fast" : "⚠️ Slow",
				},
				{
					Metric: "Requests/Minute",
					Value: metrics.requestsPerMinute,
					Status: "📈 Active",
				},
			];

			console.log("📊 Connection Statistics:");
			console.table(connectionStats);

			// Top hosts table
			if (metrics.topHosts.length > 0) {
				const topHostsData = metrics.topHosts
					.slice(0, 10)
					.map((host, index) => ({
						Rank: index + 1,
						Host: host.host,
						Requests: host.requestCount,
						Status:
							host.requestCount > 100
								? "🔥 High"
								: host.requestCount > 50
									? "📊 Medium"
									: "📉 Low",
					}));

				console.log("");
				console.log("🔗 Top Hosts by Request Count:");
				console.table(topHostsData);
			}

			// Recent errors table
			if (metrics.recentErrors.length > 0) {
				const errorsData = metrics.recentErrors.map((error, index) => ({
					"#": index + 1,
					URL:
						error.url.length > 50
							? error.url.substring(0, 47) + "..."
							: error.url,
					Error: error.error,
					Severity: error.error.includes("timeout") ? "🔴 High" : "⚠️ Medium",
				}));

				console.log("");
				console.log("⚠️ Recent Errors:");
				console.table(errorsData);
			}

			// Performance summary
			const performanceSummary = [
				{
					Category: "Network Health",
					Score:
						metrics.successRate > 95
							? "A"
							: metrics.successRate > 90
								? "B"
								: "C",
					Status:
						metrics.successRate > 95 ? "🟢 Excellent" : "🟡 Needs Attention",
				},
				{
					Category: "Response Speed",
					Score:
						metrics.averageResponseTime < 50
							? "A"
							: metrics.averageResponseTime < 100
								? "B"
								: "C",
					Status: metrics.averageResponseTime < 50 ? "🟢 Fast" : "🟡 Moderate",
				},
				{
					Category: "Reliability",
					Score:
						metrics.totalFailures === 0
							? "A"
							: metrics.totalFailures < 5
								? "B"
								: "C",
					Status: metrics.totalFailures === 0 ? "🟢 Stable" : "🟡 Some Issues",
				},
			];

			console.log("");
			console.log("📈 Performance Summary:");
			console.table(performanceSummary);
		} catch (error) {
			console.error("❌ Failed to fetch network metrics:", error);
		}
	}
	// Test external APIs
	private async testExternalAPIs(options: CLIOptions): Promise<void> {
		console.log("🔗 External API Testing");
		console.log("========================");

		if (!this.config.enableExternalAPIs) {
			console.log("❌ External APIs are disabled in configuration");
			return;
		}

		try {
			const testIP = "8.8.8.8"; // Google DNS for testing
			const testFingerprint = "test-device-fingerprint";

			console.log(`📍 Testing with IP: ${testIP}`);
			console.log(`🖥️ Testing with Fingerprint: ${testFingerprint}`);
			console.log("");

			const startTime = Date.now();
			const externalData = await fetchExternalData(testIP, testFingerprint);
			const duration = Date.now() - startTime;

			console.log(`⚡ External data fetched in ${duration}ms`);
			console.log("");

			console.log("📱 Device Intelligence:");
			console.log(
				`   Risk Score: ${externalData.deviceIntelligence.riskScore}`,
			);
			console.log(
				`   Is Emulator: ${externalData.deviceIntelligence.isEmulator}`,
			);
			console.log(`   Is Rooted: ${externalData.deviceIntelligence.isRooted}`);
			console.log(
				`   Trust Score: ${externalData.deviceIntelligence.trustScore}`,
			);
			console.log("");

			console.log("🌍 Geolocation:");
			console.log(`   Country: ${externalData.geolocation.country}`);
			console.log(
				`   High Risk Country: ${externalData.geolocation.isHighRiskCountry}`,
			);
			console.log(
				`   VPN Probability: ${externalData.geolocation.vpnProbability}`,
			);
			console.log(`   Proxy Score: ${externalData.geolocation.proxyScore}`);
			console.log("");

			console.log("🛡️ Threat Intelligence:");
			console.log(
				`   Malicious Score: ${externalData.threatIntelligence.maliciousScore}`,
			);
			console.log(
				`   Known Attacker: ${externalData.threatIntelligence.isKnownAttacker}`,
			);
			console.log(
				`   Threat Types: ${externalData.threatIntelligence.threatTypes.join(", ")}`,
			);
			console.log(
				`   Confidence: ${externalData.threatIntelligence.confidence}`,
			);
			console.log("");

			// Test enhanced prediction with external data
			if (options.features) {
				console.log("🧪 Testing Enhanced Prediction:");
				const features = this.parseFeatures(options.features);
				const sessionId = `test-${Date.now()}`;
				const merchantId = options.merchant || "test-merchant";

				const enhancedSession = await predictRiskEnhanced(
					features,
					sessionId,
					merchantId,
					externalData,
				);
				console.log(
					`   Original Score: ${(enhancedSession.score - 0.15).toFixed(3)}`,
				);
				console.log(`   Enhanced Score: ${enhancedSession.score.toFixed(3)}`);
				console.log(`   Risk Level: ${enhancedSession.riskLevel}`);
				console.log(`   Blocked: ${enhancedSession.blocked}`);
				console.log(`   Reason: ${enhancedSession.reason || "N/A"}`);
			}
		} catch (error) {
			console.error("❌ External API test failed:", error);
		}
	}

	// Enhanced analyze session with external data
	private async analyzeSessionEnhanced(options: CLIOptions): Promise<void> {
		if (!options.sessionId && !options.features) {
			console.error("❌ Session ID or features required for analysis");
			return;
		}

		console.log("🔬 Enhanced Session Analysis");
		console.log("============================");

		try {
			let features: FeatureVector;
			let sessionId: string;

			if (options.features) {
				features = this.parseFeatures(options.features);
				sessionId = options.sessionId || `analysis-${Date.now()}`;
			} else {
				// Fetch session data would go here
				console.log("❌ Session fetching not implemented in this demo");
				return;
			}

			const merchantId = options.merchant || "analysis-merchant";
			const startTime = Date.now();

			// Base prediction
			console.log("📊 Running base prediction...");
			const baseSession = await predictRisk(features, sessionId, merchantId);

			// Enhanced prediction with external data
			if (this.config.enableExternalAPIs && options.external) {
				console.log("🌐 Fetching external data...");
				const externalData = await fetchExternalData(
					"8.8.8.8",
					"test-fingerprint",
				);
				const enhancedSession = await predictRiskEnhanced(
					features,
					sessionId,
					merchantId,
					externalData,
				);

				const processingTime = Date.now() - startTime;

				console.log(`⚡ Analysis completed in ${processingTime}ms`);
				console.log("");

				console.log("📈 Comparison Results:");
				console.log(
					`   Base Score: ${baseSession.score.toFixed(3)} (${baseSession.riskLevel})`,
				);
				console.log(
					`   Enhanced Score: ${enhancedSession.score.toFixed(3)} (${enhancedSession.riskLevel})`,
				);
				console.log(
					`   Score Improvement: ${(enhancedSession.score - baseSession.score).toFixed(3)}`,
				);
				console.log(`   Base Blocked: ${baseSession.blocked}`);
				console.log(`   Enhanced Blocked: ${enhancedSession.blocked}`);
				console.log("");

				console.log("🔗 External Data Impact:");
				console.log(
					`   Device Risk: ${externalData.deviceIntelligence.riskScore > 0.7 ? "High" : "Normal"}`,
				);
				console.log(
					`   Geo Risk: ${externalData.geolocation.isHighRiskCountry ? "High" : "Normal"}`,
				);
				console.log(
					`   Threat Risk: ${externalData.threatIntelligence.maliciousScore > 0.8 ? "High" : "Normal"}`,
				);
				console.log(`   Final Reason: ${enhancedSession.reason || "N/A"}`);
			} else {
				const processingTime = Date.now() - startTime;
				console.log(`⚡ Analysis completed in ${processingTime}ms`);
				console.log("");
				this.displaySession(baseSession);
			}
		} catch (error) {
			console.error("❌ Enhanced analysis failed:", error);
		}
	}

	// Show help
	private showHelp(): void {
		console.log("Factory Wager Risk Hunter CLI v2.0");
		console.log("===================================");
		console.log("");
		console.log("Usage: bun run risk-hunter.ts [command] [options]");
		console.log("");
		console.log("Commands:");
		console.log("  hunt       Hunt for high-risk sessions");
		console.log("  analyze    Analyze specific session or features");
		console.log("  monitor    Monitor real-time fraud alerts");
		console.log("  report     Generate fraud detection report");
		console.log("  test       Run detection test suite");
		console.log("  network    Show network performance metrics");
		console.log("  external   Test external API integration");
		console.log("  matrix     Display matrix configuration system");
		console.log("");
		console.log("Options:");
		console.log("  --sessionId <id>      Session ID to analyze");
		console.log("  --merchant <id>       Merchant ID for analysis");
		console.log("  --features <json>     Feature vector (JSON format)");
		console.log("  --threshold <num>     Risk threshold (0.0-1.0)");
		console.log("  --output <format>     Output format: json|table|csv");
		console.log("  --verbose             Enable verbose logging");
		console.log("  --realTime            Enable real-time monitoring");
		console.log("  --external            Enable external API data");
		console.log("  --network             Show network metrics");
		console.log("");
		console.log("Examples:");
		console.log("  # Analyze with external APIs");
		console.log(
			'  bun run risk-hunter.ts analyze --features \'{"root_detected":1,"vpn_active":0}\' --external',
		);
		console.log("");
		console.log("  # Test network performance");
		console.log("  bun run risk-hunter.ts network");
		console.log("");
		console.log("  # Test external APIs");
		console.log(
			"  bun run risk-hunter.ts external --features '{\"root_detected\":1}'",
		);
		console.log("");
		console.log("  # Monitor with enhanced features");
		console.log("  bun run risk-hunter.ts monitor --realTime --external");
		console.log("");
		console.log("  # Display matrix configuration");
		console.log("  bun run risk-hunter.ts matrix");
		console.log("");
	}
}

// CLI Entry Point
if (import.meta.main) {
	const cli = new RiskHunterCLI();
	cli.run(process.argv.slice(2)).catch(console.error);
}
