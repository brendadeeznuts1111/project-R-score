/**
 * @bench/core - Core Benchmarking Utilities
 * 
 * Provides foundational benchmarking infrastructure for the NEXUS monorepo.
 * Used by all benchmark suites (@bench/layer4, @bench/graph, etc.)
 */

export interface PropertyConfig {
	name: string;
	values: number[];
	current: number;
	description?: string;
}

export interface BenchmarkConfig {
	package: string;
	version: string;
	properties: PropertyConfig[];
	thresholds: PerformanceThresholds;
	metadata?: Record<string, unknown>;
}

export interface PerformanceThresholds {
	performance: number; // milliseconds
	memory: number; // MB
	regression: number; // percentage (0.05 = 5%)
}

export interface ValueResult {
	value: number;
	duration: number;
	memory?: number;
	cpu?: number;
	anomalyCount?: number;
	avgConfidence?: number;
	[key: string]: unknown;
}

export interface PropertyResult {
	property: string;
	bestValue: number;
	results: ValueResult[];
	recommendation: string;
	baseline?: ValueResult;
	regression?: boolean;
}

export interface BenchmarkResult {
	package: string;
	version: string;
	timestamp: number;
	results: PropertyResult[];
	metadata: BenchmarkMetadata;
	environment: EnvironmentInfo;
}

export interface BenchmarkMetadata {
	environment: string;
	nodeVersion: string;
	bunVersion: string;
	os: string;
	arch: string;
	[key: string]: unknown;
}

export interface EnvironmentInfo {
	NODE_ENV: string;
	nodeVersion: string;
	bunVersion: string;
	os: string;
	arch: string;
}

/**
 * Iterate over a single property's values and measure performance
 */
export async function iterateProperty(
	property: PropertyConfig,
	benchmarkFn: (value: number) => Promise<ValueResult>,
): Promise<PropertyResult> {
	const results: ValueResult[] = [];

	for (const value of property.values) {
		const result = await benchmarkFn(value);
		results.push({ ...result, value });
	}

	// Find best value (lowest duration)
	const bestResult = results.reduce((best, r) =>
		r.duration < best.duration ? r : best,
	);

	return {
		property: property.name,
		bestValue: bestResult.value,
		results,
		recommendation: `Recommended value: ${bestResult.value} (${bestResult.duration.toFixed(2)}ms)`,
	};
}

/**
 * Run benchmarks for all properties
 */
export async function runPropertyBenchmark(
	config: BenchmarkConfig,
	benchmarkFn: (property: string, value: number) => Promise<ValueResult>,
): Promise<BenchmarkResult> {
	const results: PropertyResult[] = [];

	for (const property of config.properties) {
		const result = await iterateProperty(property, (value) =>
			benchmarkFn(property.name, value),
		);
		results.push(result);
	}

	return {
		package: config.package,
		version: config.version,
		timestamp: Date.now(),
		results,
		metadata: {
			environment: process.env.NODE_ENV || "development",
			nodeVersion: process.version,
			bunVersion: Bun.version,
			os: process.platform,
			arch: process.arch,
			...config.metadata,
		},
		environment: {
			NODE_ENV: process.env.NODE_ENV || "development",
			nodeVersion: process.version,
			bunVersion: Bun.version,
			os: process.platform,
			arch: process.arch,
		},
	};
}

/**
 * Check for performance regressions
 */
export function checkRegressions(
	current: BenchmarkResult,
	baseline: BenchmarkResult,
	thresholds: PerformanceThresholds,
): PropertyResult[] {
	const regressions: PropertyResult[] = [];

	for (const currentResult of current.results) {
		const baselineResult = baseline.results.find(
			(r) => r.property === currentResult.property,
		);

		if (!baselineResult) continue;

		const currentBest = currentResult.results.find(
			(r) => r.value === currentResult.bestValue,
		);
		const baselineBest = baselineResult.results.find(
			(r) => r.value === baselineResult.bestValue,
		);

		if (!currentBest || !baselineBest) continue;

		const regression = (currentBest.duration - baselineBest.duration) / baselineBest.duration;

		if (regression > thresholds.regression) {
			regressions.push({
				...currentResult,
				baseline: baselineBest,
				regression: true,
				recommendation: `⚠️ Regression detected: ${(regression * 100).toFixed(2)}% slower than baseline`,
			});
		}
	}

	return regressions;
}

/**
 * Save benchmark results to private registry
 */
export async function saveBenchmarkResults(
	result: BenchmarkResult,
	registryUrl: string = "https://npm.internal.yourcompany.com",
	token?: string,
): Promise<void> {
	const authToken = token || process.env.GRAPH_NPM_TOKEN;

	if (!authToken) {
		throw new Error("GRAPH_NPM_TOKEN environment variable is required");
	}

	const response = await fetch(`${registryUrl}/api/v1/benchmarks`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${authToken}`,
		},
		body: JSON.stringify(result),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to save benchmark results: ${error}`);
	}
}

/**
 * Get baseline benchmark results from registry
 */
export async function getBaselineBenchmark(
	packageName: string,
	version: string,
	registryUrl: string = "https://npm.internal.yourcompany.com",
	token?: string,
): Promise<BenchmarkResult | null> {
	const authToken = token || process.env.GRAPH_NPM_TOKEN;

	if (!authToken) {
		throw new Error("GRAPH_NPM_TOKEN environment variable is required");
	}

	const response = await fetch(
		`${registryUrl}/api/v1/packages/${packageName}/benchmarks?version=${version}`,
		{
			headers: {
				Authorization: `Bearer ${authToken}`,
			},
		},
	);

	if (!response.ok) {
		if (response.status === 404) {
			return null; // No baseline found
		}
		const error = await response.text();
		throw new Error(`Failed to get baseline benchmark: ${error}`);
	}

	return response.json();
}
