// Fraud Oracle Risk Scoring Engine
// Advanced risk calculation with 5-feature weighted GNN oracle
// Real-time scoring with sub-millisecond performance

import { FEATURE_WEIGHTS, RISK_THRESHOLDS } from "../ai/anomaly-predict";

// Risk scoring configuration
export interface RiskScoreConfig {
	enableGhostDeWeighting: boolean;
	enableTemporalDecay: boolean;
	enableGeolocationRisk: boolean;
	enableDeviceFingerprinting: boolean;
	customWeights?: Partial<typeof FEATURE_WEIGHTS>;
}

// Extended feature set for enhanced scoring
export interface ExtendedFeatureVector {
	// Core 5 features (weighted oracle)
	root_detected: number;
	vpn_active: number;
	thermal_spike: number;
	biometric_fail: number;
	proxy_hop_count: number;

	// Extended features for enhanced accuracy
	device_age_hours: number;
	location_velocity: number;
	battery_drain_rate: number;
	network_latency: number;
	app_install_count: number;

	// Behavioral features
	login_frequency: number;
	transaction_amount_std: number;
	time_since_last_activity: number;
	failed_login_attempts: number;

	// Device fingerprint
	device_hash: string;
	browser_fingerprint: string;
	screen_resolution: string;
	timezone: string;
	language: string;
}

// Risk score result with detailed breakdown
export interface RiskScoreResult {
	score: number;
	riskLevel: "low" | "medium" | "high" | "critical";
	confidence: number;
	blocked: boolean;

	// Feature contributions
	featureContributions: Record<string, number>;
	weightedScore: number;

	// Risk factors
	primaryRiskFactors: string[];
	secondaryRiskFactors: string[];

	// Metadata
	processingTime: number;
	timestamp: number;
	sessionId: string;
	merchantId: string;

	// Recommendations
	recommendedActions: string[];
	requiresAdditionalVerification: boolean;
}

// Temporal decay factors for risk scoring
const TEMPORAL_DECAY = {
	device_age: {
		new_device: 0.5, // < 24 hours
		recent_device: 0.3, // < 1 week
		established_device: 0.1, // > 1 month
	},
	account_age: {
		new_account: 0.4, // < 1 hour
		recent_account: 0.2, // < 24 hours
		established_account: 0.05, // > 1 week
	},
} as const;

// Geographic risk scoring
const GEOGRAPHIC_RISK = {
	high_risk_countries: ["CN", "RU", "IR", "KP", "SY"],
	suspicious_regions: ["Unknown", "Proxy", "VPN"],
	impossible_velocity_threshold: 800, // km/h
} as const;

// Device fingerprinting risk patterns
const DEVICE_RISK_PATTERNS = {
	emulator_signatures: ["emulator", "genymotion", "bluestacks"],
	root_indicators: ["root", "jailbreak", "su", "cydia"],
	vpn_signatures: ["vpn", "proxy", "tor", "anonymous"],
	suspicious_user_agents: ["bot", "crawler", "scraper", "automated"],
} as const;

export class FraudRiskOracle {
	private config: RiskScoreConfig;
	private riskHistory: Map<string, number[]> = new Map();

	constructor(
		config: RiskScoreConfig = {
			enableGhostDeWeighting: true,
			enableTemporalDecay: true,
			enableGeolocationRisk: true,
			enableDeviceFingerprinting: true,
		},
	) {
		this.config = config;
	}

	// Main risk scoring function
	async calculateRiskScore(
		features: ExtendedFeatureVector,
		sessionId: string,
		merchantId: string,
	): Promise<RiskScoreResult> {
		const startTime = performance.now();

		// Calculate base weighted score using 5-feature oracle
		const baseScore = this.calculateBaseWeightedScore(features);

		// Apply temporal decay if enabled
		const temporalAdjustedScore = this.config.enableTemporalDecay
			? this.applyTemporalDecay(baseScore, features)
			: baseScore;

		// Apply geolocation risk if enabled
		const geoAdjustedScore = this.config.enableGeolocationRisk
			? this.applyGeographicRisk(temporalAdjustedScore, features)
			: temporalAdjustedScore;

		// Apply device fingerprinting risk if enabled
		const finalScore = this.config.enableDeviceFingerprinting
			? this.applyDeviceFingerprintingRisk(geoAdjustedScore, features)
			: geoAdjustedScore;

		// Calculate risk level and actions
		const riskLevel = this.determineRiskLevel(finalScore);
		const blocked = finalScore >= RISK_THRESHOLDS.CRITICAL_BLOCK;
		const confidence = this.calculateConfidence(features, finalScore);

		// Analyze feature contributions
		const featureContributions = this.analyzeFeatureContributions(features);
		const riskFactors = this.identifyRiskFactors(features, finalScore);

		// Generate recommendations
		const recommendations = this.generateRecommendations(
			finalScore,
			riskFactors.primary,
		);

		const processingTime = performance.now() - startTime;

		// Store in risk history
		this.storeRiskHistory(sessionId, finalScore);

		const result: RiskScoreResult = {
			score: finalScore,
			riskLevel,
			confidence,
			blocked,
			featureContributions,
			weightedScore: baseScore,
			primaryRiskFactors: riskFactors.primary,
			secondaryRiskFactors: riskFactors.secondary,
			processingTime,
			timestamp: Date.now(),
			sessionId,
			merchantId,
			recommendedActions: recommendations,
			requiresAdditionalVerification:
				finalScore >= RISK_THRESHOLDS.HIGH_RISK && !blocked,
		};

		console.log(
			`🎯 Fraud Oracle Score: ${finalScore.toFixed(3)} | ${riskLevel.toUpperCase()} | ${processingTime.toFixed(2)}ms`,
		);

		return result;
	}

	// Calculate base weighted score using 5-feature oracle
	private calculateBaseWeightedScore(features: ExtendedFeatureVector): number {
		const weights = { ...FEATURE_WEIGHTS, ...this.config.customWeights };

		const weightedFeatures = [
			features.root_detected * weights.root_detected,
			features.vpn_active * weights.vpn_active,
			features.thermal_spike * weights.thermal_spike,
			features.biometric_fail * weights.biometric_fail,
			features.proxy_hop_count * weights.proxy_hop_count,
		];

		// Apply non-linear transformation for better separation
		const score = weightedFeatures.reduce((sum, weight) => sum + weight, 0);
		const normalizedScore = Math.tanh(score / 5); // Normalize to 0-1 range

		return Math.max(0, Math.min(1, normalizedScore));
	}

	// Apply temporal decay based on device and account age
	private applyTemporalDecay(
		baseScore: number,
		features: ExtendedFeatureVector,
	): number {
		let decayFactor = 1.0;

		// Device age decay
		if (features.device_age_hours < 24) {
			decayFactor *= 1 + TEMPORAL_DECAY.device_age.new_device;
		} else if (features.device_age_hours < 168) {
			// 1 week
			decayFactor *= 1 + TEMPORAL_DECAY.device_age.recent_device;
		} else {
			decayFactor *= 1 + TEMPORAL_DECAY.device_age.established_device;
		}

		// Account age decay (using time since last activity as proxy)
		if (features.time_since_last_activity < 3600) {
			// 1 hour
			decayFactor *= 1 + TEMPORAL_DECAY.account_age.new_account;
		} else if (features.time_since_last_activity < 86400) {
			// 24 hours
			decayFactor *= 1 + TEMPORAL_DECAY.account_age.recent_account;
		} else {
			decayFactor *= 1 + TEMPORAL_DECAY.account_age.established_account;
		}

		return Math.min(1, baseScore * decayFactor);
	}

	// Apply geographic risk scoring
	private applyGeographicRisk(
		baseScore: number,
		features: ExtendedFeatureVector,
	): number {
		let geoRiskMultiplier = 1.0;

		// Check for impossible travel velocity
		if (
			features.location_velocity > GEOGRAPHIC_RISK.impossible_velocity_threshold
		) {
			geoRiskMultiplier *= 1.5;
		}

		// Check timezone anomalies (simplified)
		if (features.timezone === "UTC" && features.device_age_hours < 168) {
			geoRiskMultiplier *= 1.2; // Suspicious for new devices
		}

		return Math.min(1, baseScore * geoRiskMultiplier);
	}

	// Apply device fingerprinting risk
	private applyDeviceFingerprintingRisk(
		baseScore: number,
		features: ExtendedFeatureVector,
	): number {
		let deviceRiskMultiplier = 1.0;

		// Check for emulator signatures
		if (
			DEVICE_RISK_PATTERNS.emulator_signatures.some((sig) =>
				features.device_hash.toLowerCase().includes(sig.toLowerCase()),
			)
		) {
			deviceRiskMultiplier *= 1.8;
		}

		// Check for root indicators
		if (
			DEVICE_RISK_PATTERNS.root_indicators.some((sig) =>
				features.browser_fingerprint.toLowerCase().includes(sig.toLowerCase()),
			)
		) {
			deviceRiskMultiplier *= 2.0;
		}

		// Check for VPN signatures
		if (
			DEVICE_RISK_PATTERNS.vpn_signatures.some((sig) =>
				features.device_hash.toLowerCase().includes(sig.toLowerCase()),
			)
		) {
			deviceRiskMultiplier *= 1.3;
		}

		// Check for suspicious user agents
		if (
			DEVICE_RISK_PATTERNS.suspicious_user_agents.some((sig) =>
				features.browser_fingerprint.toLowerCase().includes(sig.toLowerCase()),
			)
		) {
			deviceRiskMultiplier *= 1.5;
		}

		return Math.min(1, baseScore * deviceRiskMultiplier);
	}

	// Determine risk level based on score
	private determineRiskLevel(score: number): RiskScoreResult["riskLevel"] {
		if (score >= RISK_THRESHOLDS.CRITICAL_BLOCK) return "critical";
		if (score >= RISK_THRESHOLDS.HIGH_RISK) return "high";
		if (score >= RISK_THRESHOLDS.MONITORING) return "medium";
		return "low";
	}

	// Calculate confidence score
	private calculateConfidence(
		features: ExtendedFeatureVector,
		score: number,
	): number {
		// Higher confidence for extreme scores
		const scoreConfidence = Math.abs(score - 0.5) * 2;

		// Lower confidence for incomplete data
		const dataCompleteness = this.calculateDataCompleteness(features);

		return Math.min(1, scoreConfidence * 0.7 + dataCompleteness * 0.3);
	}

	// Calculate data completeness
	private calculateDataCompleteness(features: ExtendedFeatureVector): number {
		const totalFields = Object.keys(features).length;
		const nonNullFields = Object.values(features).filter(
			(val) => val !== null && val !== undefined && val !== 0,
		).length;

		return nonNullFields / totalFields;
	}

	// Analyze feature contributions
	private analyzeFeatureContributions(
		features: ExtendedFeatureVector,
	): Record<string, number> {
		const contributions: Record<string, number> = {};
		const weights = { ...FEATURE_WEIGHTS, ...this.config.customWeights };

		// Core 5 features
		contributions.root_detected =
			features.root_detected * weights.root_detected;
		contributions.vpn_active = features.vpn_active * weights.vpn_active;
		contributions.thermal_spike =
			features.thermal_spike * weights.thermal_spike;
		contributions.biometric_fail =
			features.biometric_fail * weights.biometric_fail;
		contributions.proxy_hop_count =
			features.proxy_hop_count * weights.proxy_hop_count;

		// Extended features (lower weight)
		contributions.device_age = Math.min(
			0.1,
			features.device_age_hours < 24 ? 0.1 : 0,
		);
		contributions.location_velocity = Math.min(
			0.1,
			features.location_velocity > 500 ? 0.1 : 0,
		);
		contributions.failed_logins = Math.min(
			0.1,
			features.failed_login_attempts * 0.02,
		);

		return contributions;
	}

	// Identify primary and secondary risk factors
	private identifyRiskFactors(
		features: ExtendedFeatureVector,
		score: number,
	): {
		primary: string[];
		secondary: string[];
	} {
		const primary: string[] = [];
		const secondary: string[] = [];

		// Primary risk factors (high impact)
		if (features.root_detected) primary.push("Root/jailbreak detected");
		if (features.proxy_hop_count >= 4) primary.push("Multi-hop proxy detected");
		if (features.biometric_fail >= 3)
			primary.push("Multiple biometric failures");
		if (features.thermal_spike > 15) primary.push("Unusual device temperature");
		if (features.location_velocity > 800)
			primary.push("Impossible travel velocity");

		// Secondary risk factors (medium impact)
		if (features.vpn_active) secondary.push("VPN or proxy usage");
		if (features.failed_login_attempts >= 2)
			secondary.push("Failed login attempts");
		if (features.device_age_hours < 24) secondary.push("New device detected");
		if (features.time_since_last_activity > 86400 * 30)
			secondary.push("Inactive account");
		if (features.transaction_amount_std > 1000)
			secondary.push("Unusual transaction pattern");

		return { primary, secondary };
	}

	// Generate action recommendations
	private generateRecommendations(
		score: number,
		primaryRiskFactors: string[],
	): string[] {
		const recommendations: string[] = [];

		if (score >= RISK_THRESHOLDS.CRITICAL_BLOCK) {
			recommendations.push(
				"BLOCK_SESSION",
				"TRIGGER_SECURITY_ALERT",
				"LOG_FRAUD_ATTEMPT",
			);
		} else if (score >= RISK_THRESHOLDS.HIGH_RISK) {
			recommendations.push(
				"REQUIRE_ADDITIONAL_VERIFICATION",
				"ENABLE_STEP_UP_AUTH",
			);
			if (primaryRiskFactors.includes("VPN or proxy usage")) {
				recommendations.push("VERIFY_IDENTITY_DOCUMENTS");
			}
		} else if (score >= RISK_THRESHOLDS.MONITORING) {
			recommendations.push(
				"ENABLE_SHADOW_MONITORING",
				"LOG_BEHAVIORAL_ANALYTICS",
			);
		} else {
			recommendations.push("PROCEED_NORMAL", "UPDATE_RISK_PROFILE");
		}

		return recommendations;
	}

	// Store risk history for pattern analysis
	private storeRiskHistory(sessionId: string, score: number): void {
		if (!this.riskHistory.has(sessionId)) {
			this.riskHistory.set(sessionId, []);
		}

		const history = this.riskHistory.get(sessionId)!;
		history.push(score);

		// Keep only last 100 scores per session
		if (history.length > 100) {
			history.splice(0, 50);
		}
	}

	// Get risk statistics for a session
	getSessionRiskStats(sessionId: string): {
		avgScore: number;
		maxScore: number;
		scoreTrend: "increasing" | "decreasing" | "stable";
		totalScores: number;
	} | null {
		const history = this.riskHistory.get(sessionId);
		if (!history || history.length === 0) return null;

		const avgScore =
			history.reduce((sum, score) => sum + score, 0) / history.length;
		const maxScore = Math.max(...history);

		// Calculate trend
		let scoreTrend: "increasing" | "decreasing" | "stable" = "stable";
		if (history.length >= 3) {
			const recent = history.slice(-3);
			const trend = recent[2] - recent[0];
			if (trend > 0.1) scoreTrend = "increasing";
			else if (trend < -0.1) scoreTrend = "decreasing";
		}

		return {
			avgScore,
			maxScore,
			scoreTrend,
			totalScores: history.length,
		};
	}

	// Update configuration
	updateConfig(newConfig: Partial<RiskScoreConfig>): void {
		this.config = { ...this.config, ...newConfig };
	}
}

// Export singleton instance
export const fraudRiskOracle = new FraudRiskOracle();

// Export types for external use
export type { ExtendedFeatureVector, RiskScoreResult, RiskScoreConfig };
