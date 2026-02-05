// utils/toml-analytics.ts
// Analytics and monitoring system for TOML configurations
import { readFileSync } from "node:fs";
import { defaultTOMLCache } from "./toml-cache";
import { parseTomlString } from "./toml-utils";

export interface AnalyticsMetrics {
	totalConfigs: number;
	totalSize: number;
	averageSize: number;
	schemaDistribution: Record<string, number>;
	environmentVariableUsage: number;
	encryptionUsage: number;
	validationErrors: number;
	cacheHitRate: number;
	mostAccessedConfigs: Array<{ path: string; accesses: number }>;
	performanceMetrics: {
		averageParseTime: number;
		averageValidationTime: number;
		averageLoadTime: number;
	};
}

export interface ConfigHealthScore {
	overall: number;
	structure: number;
	security: number;
	performance: number;
	maintainability: number;
	recommendations: string[];
}

class TomlAnalytics {
	private metrics: AnalyticsMetrics = {
		totalConfigs: 0,
		totalSize: 0,
		averageSize: 0,
		schemaDistribution: {},
		environmentVariableUsage: 0,
		encryptionUsage: 0,
		validationErrors: 0,
		cacheHitRate: 0,
		mostAccessedConfigs: [],
		performanceMetrics: {
			averageParseTime: 0,
			averageValidationTime: 0,
			averageLoadTime: 0,
		},
	};

	/**
	 * Analyze TOML configuration file
	 */
	analyzeConfig(filePath: string): {
		metrics: AnalyticsMetrics;
		healthScore: ConfigHealthScore;
		insights: string[];
	} {
		try {
			const content = readFileSync(filePath, "utf-8");
			const config = parseTomlString(content);

			const analysis = {
				metrics: this.calculateMetrics(config, content),
				healthScore: this.calculateHealthScore(config, content),
				insights: this.generateInsights(config, content),
			};

			return analysis;
		} catch (error) {
			throw new Error(`Failed to analyze ${filePath}: ${error}`);
		}
	}

	/**
	 * Get current analytics metrics
	 */
	getMetrics(): AnalyticsMetrics {
		const cacheStats = defaultTOMLCache.getStats();

		return {
			...this.metrics,
			cacheHitRate:
				cacheStats.hits / (cacheStats.hits + cacheStats.misses) || 0,
		};
	}

	/**
	 * Calculate configuration metrics
	 */
	private calculateMetrics(config: any, content: string): AnalyticsMetrics {
		const size = content.length;
		const schemaType = this.detectSchemaType(config);

		// Count environment variables
		const envVarMatches = content.match(/\$\{[^}]+\}/g) || [];
		const envVarCount = envVarMatches.length;

		// Check for encryption
		const hasEncryption =
			content.includes("_encryption") || content.includes("encrypted");

		return {
			totalConfigs: 1,
			totalSize: size,
			averageSize: size,
			schemaDistribution: schemaType ? { [schemaType]: 1 } : {},
			environmentVariableUsage: envVarCount,
			encryptionUsage: hasEncryption ? 1 : 0,
			validationErrors: 0,
			cacheHitRate: 0,
			mostAccessedConfigs: [],
			performanceMetrics: {
				averageParseTime: 0,
				averageValidationTime: 0,
				averageLoadTime: 0,
			},
		};
	}

	/**
	 * Calculate health score
	 */
	private calculateHealthScore(
		config: any,
		content: string,
	): ConfigHealthScore {
		const recommendations: string[] = [];

		// Structure score
		let structureScore = 100;
		if (Object.keys(config).length === 0) {
			structureScore = 0;
			recommendations.push("Configuration is empty");
		}

		// Security score
		let securityScore = 100;
		if (!content.includes("password") && !content.includes("secret")) {
			securityScore -= 20;
			recommendations.push("Consider adding password encryption");
		}
		if (!content.includes("${")) {
			securityScore -= 10;
			recommendations.push("Consider using environment variables");
		}

		// Performance score
		let performanceScore = 100;
		if (content.length > 10000) {
			performanceScore -= 20;
			recommendations.push("Consider splitting large configuration");
		}

		// Maintainability score
		let maintainabilityScore = 100;
		if (!content.includes("#")) {
			maintainabilityScore -= 15;
			recommendations.push("Add comments for better maintainability");
		}

		const overall = Math.round(
			(structureScore +
				securityScore +
				performanceScore +
				maintainabilityScore) /
				4,
		);

		return {
			overall,
			structure: structureScore,
			security: securityScore,
			performance: performanceScore,
			maintainability: maintainabilityScore,
			recommendations,
		};
	}

	/**
	 * Generate insights
	 */
	private generateInsights(config: any, content: string): string[] {
		const insights: string[] = [];

		// Size insights
		if (content.length < 500) {
			insights.push("Configuration is lightweight and efficient");
		} else if (content.length > 5000) {
			insights.push("Consider optimizing configuration size");
		}

		// Schema insights
		const schemaType = this.detectSchemaType(config);
		if (schemaType) {
			insights.push(`Detected ${schemaType} schema configuration`);
		}

		// Environment variable insights
		const envVarMatches = content.match(/\$\{[^}]+\}/g) || [];
		if (envVarMatches.length > 5) {
			insights.push(
				"Heavy use of environment variables - good for flexibility",
			);
		} else if (envVarMatches.length === 0) {
			insights.push("No environment variables detected - consider using them");
		}

		return insights;
	}

	/**
	 * Detect schema type
	 */
	private detectSchemaType(config: any): string | undefined {
		if (config.database && config.api) return "secrets";
		if (config.ui && config.features) return "modal";
		return undefined;
	}
}

// Global analytics instance
export const globalTOMLAnalytics = new TomlAnalytics();

// Convenience functions
export const analyzeTOMLConfig = (filePath: string) =>
	globalTOMLAnalytics.analyzeConfig(filePath);

export const getTOMLMetrics = () => globalTOMLAnalytics.getMetrics();
