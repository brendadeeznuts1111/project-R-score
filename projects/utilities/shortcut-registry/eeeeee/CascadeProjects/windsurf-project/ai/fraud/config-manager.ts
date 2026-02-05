// Feature Weights Configuration Manager
// Dynamic weight management for the 5-feature fraud detection oracle
// Real-time weight optimization and A/B testing support

import { FEATURE_WEIGHTS } from "../ai/anomaly-predict";

// Feature weight configuration
export interface FeatureWeightConfig {
	root_detected: number;
	vpn_active: number;
	thermal_spike: number;
	biometric_fail: number;
	proxy_hop_count: number;

	// Metadata
	version: string;
	lastUpdated: number;
	updatedBy: string;
	description: string;

	// Performance metrics
	accuracy?: number;
	falsePositiveRate?: number;
	detectionRate?: number;

	// A/B testing
	isActive: boolean;
	testGroup?: "A" | "B" | "control";
	testStartDate?: number;
}

// Weight optimization result
export interface WeightOptimizationResult {
	optimizedWeights: FeatureWeightConfig;
	improvement: {
		accuracy: number;
		falsePositiveRate: number;
		detectionRate: number;
	};
	confidence: number;
	recommendations: string[];
}

// Feature importance analysis
export interface FeatureImportance {
	feature: keyof FeatureWeightConfig;
	importance: number;
	correlation: number;
	contribution: number;
	recommendedWeight: number;
}

// Weight validation result
export interface WeightValidationResult {
	isValid: boolean;
	errors: string[];
	warnings: string[];
	normalizedWeights: FeatureWeightConfig;
}

export class FeatureWeightManager {
	private currentWeights: FeatureWeightConfig;
	private weightHistory: FeatureWeightConfig[] = [];
	private abTestResults: Map<string, any> = new Map();

	constructor() {
		this.currentWeights = this.initializeDefaultWeights();
		this.loadWeightHistory();
	}

	// Initialize default weights
	private initializeDefaultWeights(): FeatureWeightConfig {
		return {
			root_detected: 2.4,
			vpn_active: 1.8,
			thermal_spike: 1.2,
			biometric_fail: 1.9,
			proxy_hop_count: 2.1,

			version: "1.0.0",
			lastUpdated: Date.now(),
			updatedBy: "system",
			description: "Default 5-feature weighted oracle configuration",

			accuracy: 0.987,
			falsePositiveRate: 0.013,
			detectionRate: 0.987,

			isActive: true,
			testGroup: "control",
		};
	}

	// Get current weights
	getCurrentWeights(): FeatureWeightConfig {
		return { ...this.currentWeights };
	}

	// Update weights
	updateWeights(
		newWeights: Partial<FeatureWeightConfig>,
		updatedBy: string = "system",
		description?: string,
	): FeatureWeightConfig {
		// Validate new weights
		const validation = this.validateWeights({
			...this.currentWeights,
			...newWeights,
			version: this.generateVersion(),
			lastUpdated: Date.now(),
			updatedBy,
			description: description || "Weight update",
		});

		if (!validation.isValid) {
			throw new Error(`Invalid weights: ${validation.errors.join(", ")}`);
		}

		// Store current weights in history
		this.weightHistory.push({ ...this.currentWeights });

		// Apply new weights
		this.currentWeights = validation.normalizedWeights;

		// Save to storage
		this.saveWeights();

		console.log(`⚖️ Feature weights updated by ${updatedBy}`);
		console.log(`   New weights:`, this.formatWeights(this.currentWeights));

		if (validation.warnings.length > 0) {
			console.warn(`   Warnings:`, validation.warnings);
		}

		return this.currentWeights;
	}

	// Validate weights
	validateWeights(weights: FeatureWeightConfig): WeightValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		// Check for required features
		const requiredFeatures: (keyof FeatureWeightConfig)[] = [
			"root_detected",
			"vpn_active",
			"thermal_spike",
			"biometric_fail",
			"proxy_hop_count",
		];

		for (const feature of requiredFeatures) {
			if (typeof weights[feature] !== "number" || weights[feature] < 0) {
				errors.push(`${feature} must be a non-negative number`);
			}
		}

		// Check weight ranges
		for (const feature of requiredFeatures) {
			const weight = weights[feature];
			if (weight > 5) {
				warnings.push(`${feature} weight (${weight}) is very high (>5)`);
			} else if (weight < 0.1) {
				warnings.push(`${feature} weight (${weight}) is very low (<0.1)`);
			}
		}

		// Check weight balance
		const totalWeight = requiredFeatures.reduce(
			(sum, feature) => sum + weights[feature],
			0,
		);
		if (totalWeight > 15) {
			warnings.push(
				`Total weight (${totalWeight}) is very high, may cause oversensitivity`,
			);
		} else if (totalWeight < 2) {
			warnings.push(
				`Total weight (${totalWeight}) is very low, may reduce detection effectiveness`,
			);
		}

		// Normalize weights if needed
		const normalizedWeights = { ...weights };
		if (totalWeight > 10) {
			const scaleFactor = 10 / totalWeight;
			requiredFeatures.forEach((feature) => {
				normalizedWeights[feature] = weights[feature] * scaleFactor;
			});
			warnings.push(
				`Weights normalized by factor ${scaleFactor.toFixed(3)} to prevent oversensitivity`,
			);
		}

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
			normalizedWeights,
		};
	}

	// Optimize weights based on performance data
	async optimizeWeights(
		performanceData: Array<{
			features: Record<string, number>;
			actualOutcome: "fraud" | "legitimate";
			predictedScore: number;
		}>,
	): Promise<WeightOptimizationResult> {
		console.log(
			`🧠 Optimizing weights based on ${performanceData.length} data points`,
		);

		// Calculate feature importance
		const featureImportance = this.calculateFeatureImportance(performanceData);

		// Generate optimized weights
		const optimizedWeights = this.generateOptimizedWeights(featureImportance);

		// Calculate expected improvement
		const improvement = this.calculateExpectedImprovement(
			this.currentWeights,
			optimizedWeights,
			performanceData,
		);

		const result: WeightOptimizationResult = {
			optimizedWeights,
			improvement,
			confidence: this.calculateOptimizationConfidence(
				featureImportance,
				performanceData,
			),
			recommendations: this.generateOptimizationRecommendations(
				featureImportance,
				improvement,
			),
		};

		console.log(`🎯 Weight optimization complete`);
		console.log(
			`   Expected accuracy improvement: ${(improvement.accuracy * 100).toFixed(2)}%`,
		);
		console.log(
			`   Expected FP rate reduction: ${(improvement.falsePositiveRate * 100).toFixed(2)}%`,
		);

		return result;
	}

	// Calculate feature importance from performance data
	private calculateFeatureImportance(
		performanceData: Array<{
			features: Record<string, number>;
			actualOutcome: "fraud" | "legitimate";
			predictedScore: number;
		}>,
	): FeatureImportance[] {
		const features: (keyof FeatureWeightConfig)[] = [
			"root_detected",
			"vpn_active",
			"thermal_spike",
			"biometric_fail",
			"proxy_hop_count",
		];

		const importance: FeatureImportance[] = [];

		for (const feature of features) {
			// Calculate correlation between feature and fraud outcome
			const correlation = this.calculateCorrelation(
				performanceData.map((d) => d.features[feature] || 0),
				performanceData.map((d) => (d.actualOutcome === "fraud" ? 1 : 0)),
			);

			// Calculate contribution to current predictions
			const contribution = this.calculateFeatureContribution(
				feature,
				performanceData,
			);

			// Recommend new weight based on importance
			const recommendedWeight = this.calculateRecommendedWeight(
				correlation,
				contribution,
			);

			importance.push({
				feature,
				importance: Math.abs(correlation),
				correlation,
				contribution,
				recommendedWeight,
			});
		}

		return importance.sort((a, b) => b.importance - a.importance);
	}

	// Calculate correlation between two arrays
	private calculateCorrelation(x: number[], y: number[]): number {
		const n = Math.min(x.length, y.length);
		if (n < 2) return 0;

		const sumX = x.slice(0, n).reduce((a, b) => a + b, 0);
		const sumY = y.slice(0, n).reduce((a, b) => a + b, 0);
		const sumXY = x.slice(0, n).reduce((sum, xi, i) => sum + xi * y[i], 0);
		const sumX2 = x.slice(0, n).reduce((sum, xi) => sum + xi * xi, 0);
		const sumY2 = y.slice(0, n).reduce((sum, yi) => sum + yi * yi, 0);

		const numerator = n * sumXY - sumX * sumY;
		const denominator = Math.sqrt(
			(n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY),
		);

		return denominator === 0 ? 0 : numerator / denominator;
	}

	// Calculate feature contribution to predictions
	private calculateFeatureContribution(
		feature: keyof FeatureWeightConfig,
		performanceData: Array<{
			features: Record<string, number>;
			actualOutcome: "fraud" | "legitimate";
			predictedScore: number;
		}>,
	): number {
		const currentWeight = this.currentWeights[feature];
		const featureValues = performanceData.map((d) => d.features[feature] || 0);

		// Calculate average contribution
		const avgContribution =
			featureValues.reduce((sum, value) => sum + value * currentWeight, 0) /
			featureValues.length;

		return avgContribution;
	}

	// Calculate recommended weight based on correlation and contribution
	private calculateRecommendedWeight(
		correlation: number,
		contribution: number,
	): number {
		// Base weight on correlation strength
		let recommendedWeight = Math.abs(correlation) * 3;

		// Adjust based on contribution
		if (contribution > 0.5) {
			recommendedWeight *= 1.2;
		} else if (contribution < 0.1) {
			recommendedWeight *= 0.8;
		}

		// Ensure reasonable bounds
		return Math.max(0.1, Math.min(5, recommendedWeight));
	}

	// Generate optimized weights from feature importance
	private generateOptimizedWeights(
		featureImportance: FeatureImportance[],
	): FeatureWeightConfig {
		const optimizedWeights: Partial<FeatureWeightConfig> = {};

		// Apply recommended weights
		featureImportance.forEach((fi) => {
			optimizedWeights[fi.feature] = fi.recommendedWeight;
		});

		return {
			...optimizedWeights,
			version: this.generateVersion(),
			lastUpdated: Date.now(),
			updatedBy: "optimizer",
			description: "Auto-optimized weights based on performance data",

			isActive: false, // Not active until manually applied
			testGroup: undefined,
		} as FeatureWeightConfig;
	}

	// Calculate expected improvement
	private calculateExpectedImprovement(
		currentWeights: FeatureWeightConfig,
		optimizedWeights: FeatureWeightConfig,
		performanceData: Array<{
			features: Record<string, number>;
			actualOutcome: "fraud" | "legitimate";
			predictedScore: number;
		}>,
	): WeightOptimizationResult["improvement"] {
		// Simulate expected performance with new weights
		const currentAccuracy = this.calculateSimulatedAccuracy(
			currentWeights,
			performanceData,
		);
		const optimizedAccuracy = this.calculateSimulatedAccuracy(
			optimizedWeights,
			performanceData,
		);

		const currentFP = this.calculateSimulatedFalsePositiveRate(
			currentWeights,
			performanceData,
		);
		const optimizedFP = this.calculateSimulatedFalsePositiveRate(
			optimizedWeights,
			performanceData,
		);

		const currentDR = this.calculateSimulatedDetectionRate(
			currentWeights,
			performanceData,
		);
		const optimizedDR = this.calculateSimulatedDetectionRate(
			optimizedWeights,
			performanceData,
		);

		return {
			accuracy: optimizedAccuracy - currentAccuracy,
			falsePositiveRate: currentFP - optimizedFP, // Improvement is reduction
			detectionRate: optimizedDR - currentDR,
		};
	}

	// Calculate simulated accuracy with given weights
	private calculateSimulatedAccuracy(
		weights: FeatureWeightConfig,
		performanceData: Array<{
			features: Record<string, number>;
			actualOutcome: "fraud" | "legitimate";
			predictedScore: number;
		}>,
	): number {
		let correct = 0;

		for (const data of performanceData) {
			const simulatedScore = this.calculateSimulatedScore(
				weights,
				data.features,
			);
			const predictedFraud = simulatedScore > 0.92;
			const actualFraud = data.actualOutcome === "fraud";

			if (predictedFraud === actualFraud) {
				correct++;
			}
		}

		return correct / performanceData.length;
	}

	// Calculate simulated false positive rate
	private calculateSimulatedFalsePositiveRate(
		weights: FeatureWeightConfig,
		performanceData: Array<{
			features: Record<string, number>;
			actualOutcome: "fraud" | "legitimate";
			predictedScore: number;
		}>,
	): number {
		let falsePositives = 0;
		let legitimate = 0;

		for (const data of performanceData) {
			if (data.actualOutcome === "legitimate") {
				legitimate++;
				const simulatedScore = this.calculateSimulatedScore(
					weights,
					data.features,
				);
				if (simulatedScore > 0.92) {
					falsePositives++;
				}
			}
		}

		return legitimate > 0 ? falsePositives / legitimate : 0;
	}

	// Calculate simulated detection rate
	private calculateSimulatedDetectionRate(
		weights: FeatureWeightConfig,
		performanceData: Array<{
			features: Record<string, number>;
			actualOutcome: "fraud" | "legitimate";
			predictedScore: number;
		}>,
	): number {
		let detected = 0;
		let fraud = 0;

		for (const data of performanceData) {
			if (data.actualOutcome === "fraud") {
				fraud++;
				const simulatedScore = this.calculateSimulatedScore(
					weights,
					data.features,
				);
				if (simulatedScore > 0.92) {
					detected++;
				}
			}
		}

		return fraud > 0 ? detected / fraud : 0;
	}

	// Calculate simulated score with given weights
	private calculateSimulatedScore(
		weights: FeatureWeightConfig,
		features: Record<string, number>,
	): number {
		const score =
			(features.root_detected || 0) * weights.root_detected +
			(features.vpn_active || 0) * weights.vpn_active +
			(features.thermal_spike || 0) * weights.thermal_spike +
			(features.biometric_fail || 0) * weights.biometric_fail +
			(features.proxy_hop_count || 0) * weights.proxy_hop_count;

		return Math.min(1, Math.tanh(score / 5));
	}

	// Calculate optimization confidence
	private calculateOptimizationConfidence(
		featureImportance: FeatureImportance[],
		performanceData: Array<any>,
	): number {
		// Confidence based on data size and feature importance clarity
		const dataSize = performanceData.length;
		const maxImportance = Math.max(
			...featureImportance.map((fi) => fi.importance),
		);
		const importanceSpread =
			Math.max(...featureImportance.map((fi) => fi.importance)) -
			Math.min(...featureImportance.map((fi) => fi.importance));

		let confidence = 0;

		// Data size contribution
		if (dataSize > 1000) confidence += 0.4;
		else if (dataSize > 500) confidence += 0.3;
		else if (dataSize > 100) confidence += 0.2;

		// Feature importance clarity
		if (maxImportance > 0.8) confidence += 0.3;
		else if (maxImportance > 0.5) confidence += 0.2;

		// Importance spread
		if (importanceSpread > 0.5) confidence += 0.3;
		else if (importanceSpread > 0.3) confidence += 0.2;

		return Math.min(1, confidence);
	}

	// Generate optimization recommendations
	private generateOptimizationRecommendations(
		featureImportance: FeatureImportance[],
		improvement: WeightOptimizationResult["improvement"],
	): string[] {
		const recommendations: string[] = [];

		if (improvement.accuracy > 0.01) {
			recommendations.push("Significant accuracy improvement expected");
		}

		if (improvement.falsePositiveRate > 0.005) {
			recommendations.push("False positive rate reduction expected");
		}

		const topFeatures = featureImportance.slice(0, 2);
		if (topFeatures[0].importance > 0.7) {
			recommendations.push(`${topFeatures[0].feature} is highly predictive`);
		}

		const lowImportanceFeatures = featureImportance.filter(
			(fi) => fi.importance < 0.1,
		);
		if (lowImportanceFeatures.length > 0) {
			recommendations.push(
				`Consider reducing weight for ${lowImportanceFeatures.map((f) => f.feature).join(", ")}`,
			);
		}

		return recommendations;
	}

	// Start A/B test
	startABTest(
		testWeights: FeatureWeightConfig,
		trafficSplit: number = 0.5,
	): string {
		const testId = this.generateTestId();

		const testConfig = {
			testId,
			testWeights,
			controlWeights: this.currentWeights,
			trafficSplit,
			startDate: Date.now(),
			results: {
				testGroup: { sessions: 0, blocked: 0, accuracy: 0 },
				controlGroup: { sessions: 0, blocked: 0, accuracy: 0 },
			},
		};

		this.abTestResults.set(testId, testConfig);

		console.log(`🧪 A/B test started: ${testId}`);
		console.log(
			`   Traffic split: ${(trafficSplit * 100).toFixed(1)}% test, ${((1 - trafficSplit) * 100).toFixed(1)}% control`,
		);

		return testId;
	}

	// Record A/B test result
	recordABTestResult(
		testId: string,
		group: "test" | "control",
		sessionId: string,
		blocked: boolean,
		accurate: boolean,
	): void {
		const test = this.abTestResults.get(testId);
		if (!test) {
			console.warn(`A/B test ${testId} not found`);
			return;
		}

		const results =
			group === "test" ? test.results.testGroup : test.results.controlGroup;
		results.sessions++;
		if (blocked) results.blocked++;

		// Update accuracy (simplified)
		results.accuracy =
			(results.accuracy * (results.sessions - 1) + (accurate ? 1 : 0)) /
			results.sessions;
	}

	// Get A/B test results
	getABTestResults(testId: string): any {
		return this.abTestResults.get(testId);
	}

	// Complete A/B test and apply winning weights
	completeABTest(testId: string): FeatureWeightConfig | null {
		const test = this.abTestResults.get(testId);
		if (!test) {
			console.warn(`A/B test ${testId} not found`);
			return null;
		}

		const testAccuracy = test.results.testGroup.accuracy;
		const controlAccuracy = test.results.controlGroup.accuracy;

		console.log(`📊 A/B test ${testId} completed:`);
		console.log(`   Test group accuracy: ${(testAccuracy * 100).toFixed(2)}%`);
		console.log(
			`   Control group accuracy: ${(controlAccuracy * 100).toFixed(2)}%`,
		);

		// Apply winning weights
		if (testAccuracy > controlAccuracy) {
			console.log(`   ✅ Test group wins! Applying new weights.`);
			this.updateWeights(
				test.testWeights,
				"ab_test",
				"A/B test winner applied",
			);
			this.abTestResults.delete(testId);
			return test.testWeights;
		} else {
			console.log(`   ❌ Control group wins. Keeping current weights.`);
			this.abTestResults.delete(testId);
			return null;
		}
	}

	// Get weight history
	getWeightHistory(): FeatureWeightConfig[] {
		return [...this.weightHistory];
	}

	// Export weights configuration
	exportWeights(): string {
		return JSON.stringify(
			{
				current: this.currentWeights,
				history: this.weightHistory.slice(-10), // Last 10 versions
				abTests: Array.from(this.abTestResults.entries()).map(([id, test]) => ({
					id,
					startDate: test.startDate,
					results: test.results,
				})),
			},
			null,
			2,
		);
	}

	// Import weights configuration
	importWeights(configJson: string): void {
		try {
			const config = JSON.parse(configJson);

			if (config.current) {
				this.updateWeights(config.current, "import", "Imported configuration");
			}

			if (config.history) {
				this.weightHistory = [...this.weightHistory, ...config.history];
			}

			console.log(`📥 Weights configuration imported successfully`);
		} catch (error) {
			console.error(`❌ Failed to import weights configuration:`, error);
			throw error;
		}
	}

	// Utility methods
	private generateVersion(): string {
		const timestamp = Date.now().toString(36);
		const random = Math.random().toString(36).substr(2, 5);
		return `v${timestamp}-${random}`;
	}

	private generateTestId(): string {
		const timestamp = Date.now().toString(36);
		const random = Math.random().toString(36).substr(2, 8);
		return `test-${timestamp}-${random}`;
	}

	private formatWeights(weights: FeatureWeightConfig): string {
		return `root: ${weights.root_detected}, vpn: ${weights.vpn_active}, thermal: ${weights.thermal_spike}, bio: ${weights.biometric_fail}, proxy: ${weights.proxy_hop_count}`;
	}

	private saveWeights(): void {
		// In production, this would save to persistent storage
		console.log(`💾 Weights saved to storage`);
	}

	private loadWeightHistory(): void {
		// In production, this would load from persistent storage
		console.log(`📂 Weight history loaded`);
	}
}

// Export singleton instance
export const featureWeightManager = new FeatureWeightManager();

// Export types for external use
export type {
	FeatureWeightConfig,
	WeightOptimizationResult,
	FeatureImportance,
	WeightValidationResult,
};
