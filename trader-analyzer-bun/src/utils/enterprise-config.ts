/**
 * @fileoverview Enterprise Configuration
 * @description Centralized configuration for enterprise-grade features
 * @module utils/enterprise-config
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-ENTERPRISE-CONFIG@0.1.0;instance-id=ENTERPRISE-CONFIG-001;version=0.1.0}]
 * [PROPERTIES:{config={value:"enterprise-config";@root:"ROOT-CONFIG";@chain:["BP-CONFIG","BP-ENTERPRISE"];@version:"0.1.0"}}]
 * [CLASS:EnterpriseConfig][#REF:v-0.1.0.BP.ENTERPRISE.CONFIG.1.0.A.1.1.CONFIG.1.1]]
 */

/**
 * Enterprise configuration with defaults
 */
export const ENTERPRISE_CONFIG = {
	// Retry configuration
	retry: {
		maxAttempts: 3,
		initialDelayMs: 100,
		maxDelayMs: 5000,
		backoffMultiplier: 2,
		retryableStatusCodes: [408, 429, 500, 502, 503, 504],
	},

	// Rate limiting
	rateLimit: {
		requestsPerSecond: 10,
		burstSize: 20,
		windowMs: 1000,
	},

	// Timeout configuration
	timeout: {
		httpRequest: 5000,
		shellCommand: 10000,
		healthCheck: 3000,
		metricsCollection: 2000,
	},

	// Caching configuration
	cache: {
		ttlMs: 30000, // 30 seconds
		maxSize: 1000,
		cleanupIntervalMs: 60000, // 1 minute
	},

	// Circuit breaker
	circuitBreaker: {
		failureThreshold: 5,
		resetTimeoutMs: 60000, // 1 minute
		halfOpenMaxAttempts: 3,
	},

	// Monitoring thresholds
	thresholds: {
		responseTimeWarning: 1000, // 1 second
		responseTimeError: 5000, // 5 seconds
		cpuWarning: 80, // 80%
		cpuError: 95, // 95%
		memoryWarning: 80, // 80%
		memoryError: 95, // 95%
		errorRateWarning: 0.05, // 5%
		errorRateError: 0.1, // 10%
	},

	// Logging
	logging: {
		level: process.env.LOG_LEVEL || "info",
		enableRequestLogging: true,
		enableResponseLogging: true,
		enableErrorStackTraces: process.env.NODE_ENV !== "production",
	},

	// Health check
	healthCheck: {
		intervalMs: 5000,
		timeoutMs: 3000,
		endpoints: ["/health", "/metrics"],
	},
} as const;

/**
 * Get configuration value with environment variable override
 */
export function getConfig<T>(key: string, defaultValue: T): T {
	const envKey = key.toUpperCase().replace(/\./g, "_");
	const envValue = process.env[envKey];
	if (envValue !== undefined) {
		// Try to parse as number/boolean if applicable
		if (typeof defaultValue === "number") {
			return (parseInt(envValue, 10) || defaultValue) as T;
		}
		if (typeof defaultValue === "boolean") {
			return (envValue === "true" || envValue === "1") as T;
		}
		return envValue as T;
	}
	return defaultValue;
}
