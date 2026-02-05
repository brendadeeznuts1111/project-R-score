// Fraud Pattern Detection Engine
// Advanced pattern recognition for sophisticated fraud detection
// Real-time behavioral analysis and anomaly clustering

import type { ExtendedFeatureVector, RiskScoreResult } from "./risk-scoring";

// Pattern detection configuration
export interface PatternDetectionConfig {
	enableBehavioralAnalysis: boolean;
	enableClusteringAnalysis: boolean;
	enableSequenceAnalysis: boolean;
	enableNetworkAnalysis: boolean;
	anomalyThreshold: number;
	patternWindowSize: number;
}

// Fraud pattern types
export enum FraudPatternType {
	SYNTHETIC_IDENTITY = "synthetic_identity",
	ACCOUNT_TAKEOVER = "account_takeover",
	COORDINATED_ATTACK = "coordinated_attack",
	CARD_TESTING = "card_testing",
	FRIEND_FRAUD = "friend_fraud",
	LOCATION_ANOMALY = "location_anomaly",
	DEVICE_ANOMALY = "device_anomaly",
	VELOCITY_ANOMALY = "velocity_anomaly",
	BEHAVIORAL_ANOMALY = "behavioral_anomaly",
}

// Detected fraud pattern
export interface FraudPattern {
	type: FraudPatternType;
	confidence: number;
	severity: "low" | "medium" | "high" | "critical";
	description: string;

	// Pattern evidence
	indicators: string[];
	affectedSessions: string[];
	timeframe: {
		start: number;
		end: number;
	};

	// Pattern metrics
	frequency: number;
	riskScore: number;
	falsePositiveProbability: number;

	// Recommended actions
	recommendedActions: string[];
	requiresImmediateAction: boolean;
}

// Behavioral pattern
export interface BehavioralPattern {
	sessionId: string;
	userId: string;
	pattern: string;
	confidence: number;
	deviationScore: number;
	timestamp: number;
	features: ExtendedFeatureVector;
}

// Network analysis result
export interface NetworkAnalysisResult {
	suspiciousConnections: Array<{
		sessionId: string;
		connectedSessions: string[];
		riskScore: number;
		connectionType: string;
	}>;

	clusterAnalysis: {
		clusters: Array<{
			id: string;
			size: number;
			avgRiskScore: number;
			patternType: FraudPatternType;
		}>;

		suspiciousClusters: string[];
	};

	networkRiskScore: number;
	recommendations: string[];
}

// Sequence pattern for temporal analysis
export interface SequencePattern {
	sequence: string[];
	frequency: number;
	riskScore: number;
	isAnomalous: boolean;
	confidence: number;
}

export class FraudPatternDetector {
	private config: PatternDetectionConfig;
	private behavioralHistory: Map<string, BehavioralPattern[]> = new Map();
	private detectedPatterns: FraudPattern[] = [];
	private sequencePatterns: Map<string, SequencePattern[]> = new Map();

	constructor(
		config: PatternDetectionConfig = {
			enableBehavioralAnalysis: true,
			enableClusteringAnalysis: true,
			enableSequenceAnalysis: true,
			enableNetworkAnalysis: true,
			anomalyThreshold: 0.8,
			patternWindowSize: 100,
		},
	) {
		this.config = config;
	}

	// Main pattern detection function
	async detectPatterns(
		features: ExtendedFeatureVector,
		riskResult: RiskScoreResult,
		sessionId: string,
		userId?: string,
	): Promise<FraudPattern[]> {
		const detectedPatterns: FraudPattern[] = [];

		// Behavioral analysis
		if (this.config.enableBehavioralAnalysis && userId) {
			const behavioralPatterns = await this.analyzeBehavioralPatterns(
				features,
				riskResult,
				sessionId,
				userId,
			);
			detectedPatterns.push(...behavioralPatterns);
		}

		// Synthetic identity detection
		const syntheticPatterns = this.detectSyntheticIdentityPatterns(
			features,
			riskResult,
			sessionId,
		);
		detectedPatterns.push(...syntheticPatterns);

		// Account takeover detection
		const takeoverPatterns = this.detectAccountTakeoverPatterns(
			features,
			riskResult,
			sessionId,
		);
		detectedPatterns.push(...takeoverPatterns);

		// Location anomaly detection
		const locationPatterns = this.detectLocationAnomalies(
			features,
			riskResult,
			sessionId,
		);
		detectedPatterns.push(...locationPatterns);

		// Device anomaly detection
		const devicePatterns = this.detectDeviceAnomalies(
			features,
			riskResult,
			sessionId,
		);
		detectedPatterns.push(...devicePatterns);

		// Velocity anomaly detection
		const velocityPatterns = this.detectVelocityAnomalies(
			features,
			riskResult,
			sessionId,
		);
		detectedPatterns.push(...velocityPatterns);

		// Store detected patterns
		this.detectedPatterns.push(...detectedPatterns);

		// Keep pattern history bounded
		if (this.detectedPatterns.length > 1000) {
			this.detectedPatterns.splice(0, 500);
		}

		console.log(
			`🔍 Pattern Detection: Found ${detectedPatterns.length} patterns for session ${sessionId}`,
		);

		return detectedPatterns;
	}

	// Behavioral pattern analysis
	private async analyzeBehavioralPatterns(
		features: ExtendedFeatureVector,
		riskResult: RiskScoreResult,
		sessionId: string,
		userId: string,
	): Promise<FraudPattern[]> {
		const patterns: FraudPattern[] = [];

		// Get user's behavioral history
		const userHistory = this.behavioralHistory.get(userId) || [];

		// Analyze current behavior against historical patterns
		const currentPattern: BehavioralPattern = {
			sessionId,
			userId,
			pattern: this.extractBehavioralPattern(features),
			confidence: riskResult.confidence,
			deviationScore: this.calculateBehavioralDeviation(features, userHistory),
			timestamp: Date.now(),
			features,
		};

		// Store in history
		userHistory.push(currentPattern);
		if (userHistory.length > this.config.patternWindowSize) {
			userHistory.splice(0, this.config.patternWindowSize / 2);
		}
		this.behavioralHistory.set(userId, userHistory);

		// Detect anomalies in behavior
		if (currentPattern.deviationScore > this.config.anomalyThreshold) {
			patterns.push({
				type: FraudPatternType.BEHAVIORAL_ANOMALY,
				confidence: currentPattern.deviationScore,
				severity: currentPattern.deviationScore > 0.9 ? "critical" : "high",
				description: `Unusual behavioral pattern detected for user ${userId}`,
				indicators: [
					`Deviation score: ${currentPattern.deviationScore.toFixed(3)}`,
					`Pattern: ${currentPattern.pattern}`,
					`Confidence: ${currentPattern.confidence.toFixed(3)}`,
				],
				affectedSessions: [sessionId],
				timeframe: {
					start: currentPattern.timestamp,
					end: currentPattern.timestamp,
				},
				frequency: 1,
				riskScore: riskResult.score,
				falsePositiveProbability: 0.1,
				recommendedActions: [
					"REQUIRE_ADDITIONAL_VERIFICATION",
					"ENABLE_BEHAVIORAL_MONITORING",
				],
				requiresImmediateAction: currentPattern.deviationScore > 0.95,
			});
		}

		return patterns;
	}

	// Extract behavioral pattern from features
	private extractBehavioralPattern(features: ExtendedFeatureVector): string {
		const patternElements: string[] = [];

		if (features.root_detected) patternElements.push("ROOT");
		if (features.vpn_active) patternElements.push("VPN");
		if (features.thermal_spike > 10) patternElements.push("THERMAL");
		if (features.biometric_fail > 0) patternElements.push("BIO_FAIL");
		if (features.proxy_hop_count > 0) patternElements.push("PROXY");
		if (features.failed_login_attempts > 0) patternElements.push("LOGIN_FAIL");
		if (features.device_age_hours < 24) patternElements.push("NEW_DEVICE");
		if (features.location_velocity > 500) patternElements.push("FAST_TRAVEL");

		return patternElements.length > 0 ? patternElements.join("-") : "NORMAL";
	}

	// Calculate behavioral deviation score
	private calculateBehavioralDeviation(
		features: ExtendedFeatureVector,
		history: BehavioralPattern[],
	): number {
		if (history.length < 3) return 0.5; // Insufficient history

		const currentPattern = this.extractBehavioralPattern(features);
		const patternCounts = new Map<string, number>();

		// Count pattern frequencies in history
		history.forEach((h) => {
			patternCounts.set(h.pattern, (patternCounts.get(h.pattern) || 0) + 1);
		});

		// Calculate how unusual current pattern is
		const currentCount = patternCounts.get(currentPattern) || 0;
		const totalCount = history.length;
		const patternFrequency = currentCount / totalCount;

		// Lower frequency = higher deviation
		return 1 - patternFrequency;
	}

	// Detect synthetic identity patterns
	private detectSyntheticIdentityPatterns(
		features: ExtendedFeatureVector,
		riskResult: RiskScoreResult,
		sessionId: string,
	): FraudPattern[] {
		const patterns: FraudPattern[] = [];

		// Synthetic identity indicators
		const syntheticIndicators: string[] = [];
		let syntheticScore = 0;

		if (features.device_age_hours < 1) {
			syntheticIndicators.push("Brand new device");
			syntheticScore += 0.3;
		}

		if (features.time_since_last_activity < 300) {
			// 5 minutes
			syntheticIndicators.push("Immediate activity after creation");
			syntheticScore += 0.2;
		}

		if (features.login_frequency > 10) {
			syntheticIndicators.push("Unusual login frequency");
			syntheticScore += 0.2;
		}

		if (features.app_install_count < 5) {
			syntheticIndicators.push("Minimal app installation");
			syntheticScore += 0.15;
		}

		if (features.failed_login_attempts === 0 && features.biometric_fail === 0) {
			syntheticIndicators.push("Perfect authentication record");
			syntheticScore += 0.15;
		}

		if (syntheticScore > 0.7) {
			patterns.push({
				type: FraudPatternType.SYNTHETIC_IDENTITY,
				confidence: syntheticScore,
				severity: syntheticScore > 0.85 ? "critical" : "high",
				description: "Synthetic identity pattern detected",
				indicators: syntheticIndicators,
				affectedSessions: [sessionId],
				timeframe: {
					start: Date.now() - 3600000, // 1 hour ago
					end: Date.now(),
				},
				frequency: 1,
				riskScore: riskResult.score,
				falsePositiveProbability: 0.05,
				recommendedActions: [
					"BLOCK_SESSION",
					"TRIGGER_IDENTITY_VERIFICATION",
					"ENHANCED_MONITORING",
				],
				requiresImmediateAction: syntheticScore > 0.85,
			});
		}

		return patterns;
	}

	// Detect account takeover patterns
	private detectAccountTakeoverPatterns(
		features: ExtendedFeatureVector,
		riskResult: RiskScoreResult,
		sessionId: string,
	): FraudPattern[] {
		const patterns: FraudPattern[] = [];

		const takeoverIndicators: string[] = [];
		let takeoverScore = 0;

		if (features.location_velocity > 800) {
			takeoverIndicators.push("Impossible travel velocity");
			takeoverScore += 0.4;
		}

		if (features.failed_login_attempts > 3) {
			takeoverIndicators.push("Multiple failed login attempts");
			takeoverScore += 0.3;
		}

		if (
			features.device_age_hours > 8760 &&
			features.time_since_last_activity < 3600
		) {
			takeoverIndicators.push("Long-dormant account suddenly active");
			takeoverScore += 0.2;
		}

		if (features.vpn_active && features.proxy_hop_count > 2) {
			takeoverIndicators.push("VPN + multi-hop proxy combination");
			takeoverScore += 0.1;
		}

		if (takeoverScore > 0.6) {
			patterns.push({
				type: FraudPatternType.ACCOUNT_TAKEOVER,
				confidence: takeoverScore,
				severity: takeoverScore > 0.8 ? "critical" : "high",
				description: "Account takeover pattern detected",
				indicators: takeoverIndicators,
				affectedSessions: [sessionId],
				timeframe: {
					start: Date.now() - 7200000, // 2 hours ago
					end: Date.now(),
				},
				frequency: 1,
				riskScore: riskResult.score,
				falsePositiveProbability: 0.08,
				recommendedActions: [
					"BLOCK_SESSION",
					"NOTIFY_ACCOUNT_OWNER",
					"FORCE_PASSWORD_RESET",
				],
				requiresImmediateAction: takeoverScore > 0.8,
			});
		}

		return patterns;
	}

	// Detect location anomalies
	private detectLocationAnomalies(
		features: ExtendedFeatureVector,
		riskResult: RiskScoreResult,
		sessionId: string,
	): FraudPattern[] {
		const patterns: FraudPattern[] = [];

		if (features.location_velocity > 800) {
			patterns.push({
				type: FraudPatternType.LOCATION_ANOMALY,
				confidence: Math.min(1, features.location_velocity / 2000),
				severity: features.location_velocity > 1500 ? "critical" : "high",
				description: `Impossible travel velocity detected: ${features.location_velocity} km/h`,
				indicators: [`Velocity: ${features.location_velocity} km/h`],
				affectedSessions: [sessionId],
				timeframe: {
					start: Date.now() - 3600000,
					end: Date.now(),
				},
				frequency: 1,
				riskScore: Math.max(riskResult.score, 0.8),
				falsePositiveProbability: 0.02,
				recommendedActions: ["BLOCK_SESSION", "LOCATION_VERIFICATION_REQUIRED"],
				requiresImmediateAction: true,
			});
		}

		return patterns;
	}

	// Detect device anomalies
	private detectDeviceAnomalies(
		features: ExtendedFeatureVector,
		riskResult: RiskScoreResult,
		sessionId: string,
	): FraudPattern[] {
		const patterns: FraudPattern[] = [];

		if (features.root_detected) {
			patterns.push({
				type: FraudPatternType.DEVICE_ANOMALY,
				confidence: 0.95,
				severity: "critical",
				description: "Rooted or jailbroken device detected",
				indicators: ["Root/jailbreak detected"],
				affectedSessions: [sessionId],
				timeframe: {
					start: Date.now(),
					end: Date.now(),
				},
				frequency: 1,
				riskScore: 1.0,
				falsePositiveProbability: 0.01,
				recommendedActions: ["BLOCK_SESSION", "DEVICE_BLACKLIST"],
				requiresImmediateAction: true,
			});
		}

		if (features.thermal_spike > 20) {
			patterns.push({
				type: FraudPatternType.DEVICE_ANOMALY,
				confidence: Math.min(1, features.thermal_spike / 30),
				severity: features.thermal_spike > 30 ? "critical" : "high",
				description: `Unusual device temperature: ${features.thermal_spike}°C spike`,
				indicators: [`Thermal spike: ${features.thermal_spike}°C`],
				affectedSessions: [sessionId],
				timeframe: {
					start: Date.now() - 1800000, // 30 minutes ago
					end: Date.now(),
				},
				frequency: 1,
				riskScore: Math.max(riskResult.score, 0.7),
				falsePositiveProbability: 0.1,
				recommendedActions: ["ENHANCED_MONITORING", "DEVICE_HEALTH_CHECK"],
				requiresImmediateAction: features.thermal_spike > 30,
			});
		}

		return patterns;
	}

	// Detect velocity anomalies
	private detectVelocityAnomalies(
		features: ExtendedFeatureVector,
		riskResult: RiskScoreResult,
		sessionId: string,
	): FraudPattern[] {
		const patterns: FraudPattern[] = [];

		// Transaction velocity anomaly
		if (features.transaction_amount_std > 2000) {
			patterns.push({
				type: FraudPatternType.VELOCITY_ANOMALY,
				confidence: Math.min(1, features.transaction_amount_std / 5000),
				severity: features.transaction_amount_std > 4000 ? "critical" : "high",
				description: `Unusual transaction velocity detected: $${features.transaction_amount_std} std deviation`,
				indicators: [`Transaction std: $${features.transaction_amount_std}`],
				affectedSessions: [sessionId],
				timeframe: {
					start: Date.now() - 3600000,
					end: Date.now(),
				},
				frequency: 1,
				riskScore: Math.max(riskResult.score, 0.8),
				falsePositiveProbability: 0.05,
				recommendedActions: ["TRANSACTION_LIMITS", "MANUAL_REVIEW_REQUIRED"],
				requiresImmediateAction: features.transaction_amount_std > 4000,
			});
		}

		return patterns;
	}

	// Network analysis for coordinated attacks
	async analyzeNetwork(
		sessions: Array<{
			sessionId: string;
			features: ExtendedFeatureVector;
			riskScore: number;
			timestamp: number;
		}>,
	): Promise<NetworkAnalysisResult> {
		const suspiciousConnections: NetworkAnalysisResult["suspiciousConnections"] =
			[];
		const clusters: NetworkAnalysisResult["clusterAnalysis"]["clusters"] = [];

		// Simple clustering based on similar features
		const featureGroups = new Map<string, typeof sessions>();

		sessions.forEach((session) => {
			const key = this.generateFeatureGroupKey(session.features);
			if (!featureGroups.has(key)) {
				featureGroups.set(key, []);
			}
			featureGroups.get(key)!.push(session);
		});

		// Analyze each group
		featureGroups.forEach((groupSessions, groupKey) => {
			if (groupSessions.length > 2) {
				// Potential coordinated attack
				const avgRiskScore =
					groupSessions.reduce((sum, s) => sum + s.riskScore, 0) /
					groupSessions.length;

				clusters.push({
					id: groupKey,
					size: groupSessions.length,
					avgRiskScore,
					patternType: this.identifyClusterPattern(groupSessions),
				});

				// Mark as suspicious if high risk
				if (avgRiskScore > 0.7) {
					groupSessions.forEach((session) => {
						suspiciousConnections.push({
							sessionId: session.sessionId,
							connectedSessions: groupSessions
								.filter((s) => s.sessionId !== session.sessionId)
								.map((s) => s.sessionId),
							riskScore: session.riskScore,
							connectionType: "similar_features",
						});
					});
				}
			}
		});

		const suspiciousClusters = clusters
			.filter((c) => c.avgRiskScore > 0.7)
			.map((c) => c.id);

		const networkRiskScore =
			suspiciousConnections.length > 0
				? Math.max(...suspiciousConnections.map((c) => c.riskScore))
				: 0;

		const recommendations =
			networkRiskScore > 0.8
				? [
						"BLOCK_ALL_CONNECTED_SESSIONS",
						"TRIGGER_SECURITY_INVESTIGATION",
						"ENABLE_ENHANCED_MONITORING",
					]
				: [];

		return {
			suspiciousConnections,
			clusterAnalysis: {
				clusters,
				suspiciousClusters,
			},
			networkRiskScore,
			recommendations,
		};
	}

	// Generate feature grouping key for clustering
	private generateFeatureGroupKey(features: ExtendedFeatureVector): string {
		const elements: string[] = [];

		if (features.vpn_active) elements.push("VPN");
		if (features.proxy_hop_count > 0)
			elements.push(`PROXY_${features.proxy_hop_count}`);
		if (features.root_detected) elements.push("ROOT");
		if (features.device_age_hours < 24) elements.push("NEW");
		if (features.timezone) elements.push(features.timezone);

		return elements.join("_") || "NORMAL";
	}

	// Identify pattern type for a cluster
	private identifyClusterPattern(
		sessions: Array<{
			features: ExtendedFeatureVector;
			riskScore: number;
			timestamp: number;
		}>,
	): FraudPatternType {
		const hasVpn = sessions.some((s: any) => s.features.vpn_active);
		const hasProxy = sessions.some((s: any) => s.features.proxy_hop_count > 0);
		const hasRoot = sessions.some((s: any) => s.features.root_detected);
		const isNewDevice = sessions.some(
			(s: any) => s.features.device_age_hours < 24,
		);

		if (hasRoot && hasProxy) return FraudPatternType.COORDINATED_ATTACK;
		if (hasVpn && hasProxy && isNewDevice)
			return FraudPatternType.SYNTHETIC_IDENTITY;
		if (hasVpn || hasProxy) return FraudPatternType.ACCOUNT_TAKEOVER;

		return FraudPatternType.BEHAVIORAL_ANOMALY;
	}

	// Get all detected patterns
	getDetectedPatterns(): FraudPattern[] {
		return [...this.detectedPatterns];
	}

	// Get patterns by type
	getPatternsByType(type: FraudPatternType): FraudPattern[] {
		return this.detectedPatterns.filter((p) => p.type === type);
	}

	// Clear old patterns
	clearOldPatterns(olderThanHours: number = 24): void {
		const cutoff = Date.now() - olderThanHours * 3600000;
		this.detectedPatterns = this.detectedPatterns.filter(
			(p) => p.timeframe.end > cutoff,
		);
	}

	// Update configuration
	updateConfig(newConfig: Partial<PatternDetectionConfig>): void {
		this.config = { ...this.config, ...newConfig };
	}
}

// Export singleton instance
export const fraudPatternDetector = new FraudPatternDetector();
