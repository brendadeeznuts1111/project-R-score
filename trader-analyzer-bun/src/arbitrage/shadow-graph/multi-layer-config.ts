/**
 * @fileoverview Multi-Layer Correlation Graph Configuration
 * @description Centralized configuration management for correlation detection
 * @module arbitrage/shadow-graph/multi-layer-config
 */

/**
 * Correlation configuration
 */
export interface CorrelationConfig {
	anomalyThresholds: {
		layer1: number;
		layer2: number;
		layer3: number;
		layer4: number;
	};
	propagationFactors: {
		crossSport: number;
		crossEvent: number;
		crossMarket: number;
		direct: number;
	};
	temporalDecay: {
		baseDecayRate: number;
		normalizationHours: number;
	};
	performance: {
		batchSize: number;
		queryTimeout: number;
		circuitBreakerThreshold: number;
	};
	validation: {
		minEventIdLength: number;
		maxEventIdLength: number;
		eventIdPattern: RegExp;
		minConfidence: number;
		maxConfidence: number;
	};
}

/**
 * Default configuration
 */
export const DEFAULT_CORRELATION_CONFIG: CorrelationConfig = {
	anomalyThresholds: {
		layer1: 0.5,
		layer2: 0.6,
		layer3: 0.7,
		layer4: 0.8,
	},
	propagationFactors: {
		crossSport: 0.3,
		crossEvent: 0.4,
		crossMarket: 0.5,
		direct: 0.6,
	},
	temporalDecay: {
		baseDecayRate: 24, // hours
		normalizationHours: 24,
	},
	performance: {
		batchSize: 100,
		queryTimeout: 5000,
		circuitBreakerThreshold: 50,
	},
	validation: {
		minEventIdLength: 10,
		maxEventIdLength: 50,
		eventIdPattern: /^[a-z]+-[\w-]{8,}-[\d]{4}$/,
		minConfidence: 0.0,
		maxConfidence: 1.0,
	},
};

/**
 * Configuration service
 */
export class CorrelationConfigService {
	private config: CorrelationConfig;

	constructor(config?: Partial<CorrelationConfig>) {
		this.config = { ...DEFAULT_CORRELATION_CONFIG, ...config };
	}

	getThreshold(layer: 1 | 2 | 3 | 4): number {
		return this.config.anomalyThresholds[
			`layer${layer}` as keyof typeof this.config.anomalyThresholds
		];
	}

	getPropagationFactor(
		type: "cross_sport" | "cross_event" | "cross_market" | "direct_latency",
	): number {
		const key =
			type === "direct_latency"
				? "direct"
				: (type.replace(
						"cross_",
						"",
					) as keyof typeof this.config.propagationFactors);
		return this.config.propagationFactors[key];
	}

	getTemporalDecay(): { baseDecayRate: number; normalizationHours: number } {
		return this.config.temporalDecay;
	}

	getBatchSize(): number {
		return this.config.performance.batchSize;
	}

	getQueryTimeout(): number {
		return this.config.performance.queryTimeout;
	}

	getCircuitBreakerThreshold(): number {
		return this.config.performance.circuitBreakerThreshold;
	}

	validateEventId(eventId: string): boolean {
		const { minEventIdLength, maxEventIdLength, eventIdPattern } =
			this.config.validation;
		return (
			eventId.length >= minEventIdLength &&
			eventId.length <= maxEventIdLength &&
			eventIdPattern.test(eventId)
		);
	}

	validateConfidence(confidence: number): boolean {
		const { minConfidence, maxConfidence } = this.config.validation;
		return confidence >= minConfidence && confidence <= maxConfidence;
	}

	getConfig(): CorrelationConfig {
		return { ...this.config };
	}
}
