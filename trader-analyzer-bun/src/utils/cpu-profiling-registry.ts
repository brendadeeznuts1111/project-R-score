/**
 * @fileoverview CPU Profiling Registry
 * @description Centralized profile storage and version management for CPU profiling system
 *
 * @module utils/cpu-profiling-registry
 * @version 1.0.0
 */

import { $ } from "bun";
import { mkdir } from "node:fs/promises";
import { join, basename } from "path";
import {
	performStatisticalAnalysis,
	type StatisticalAnalysis as StatsAnalysis,
	DEFAULT_STATISTICAL_CONFIG,
} from "./cpu-profiling-statistics";

// ═══════════════════════════════════════════════════════════════
// CPU Profiling Namespace - All types are namespaced to avoid conflicts
// ═══════════════════════════════════════════════════════════════

/**
 * CPU Profiling namespace for all types and constants
 * Prevents naming conflicts with other modules
 */
export namespace CPUProfiling {
	/**
	 * Profile metrics extracted from CPU profile file
	 */
	export interface ProfileMetrics {
		totalTime: number;
		functionCalls: number;
		memoryAllocations?: number;
		hotFunctions?: Array<{
			name: string;
			time: number;
			percentage: number;
		}>;
		/** Raw sample data for statistical analysis (6.7.1A.0.0.0.0) */
		rawSamples?: {
			/** Individual execution time samples (in microseconds) */
			executionTimes: number[];
			/** Individual function call counts per sample */
			functionCallCounts?: number[];
		};
	}

	/**
	 * Profile entry in the registry
	 */
	export interface ProfileEntry {
		id: string;
		version: string;
		filename: string;
		filepath: string;
		createdAt: string;
		gitHash: string;
		metrics: ProfileMetrics;
	}

	/**
	 * Baseline profile entry with freeze status
	 */
	export interface BaselineEntry {
		version: string;
		frozen: boolean;
		frozenAt: string | null;
		profileId: string;
	}

	/**
	 * Registry data structure
	 */
	export interface RegistryData {
		version: string;
		baseline: BaselineEntry | null;
		profiles: ProfileEntry[];
	}

	/**
	 * Regression severity levels
	 */
	export enum RegressionSeverity {
		CRITICAL = "CRITICAL",
		WARNING = "WARNING",
		INFO = "INFO",
		IMPROVEMENT = "IMPROVEMENT",
	}

	/**
	 * Statistical analysis result (6.7.1A.0.0.0.0)
	 */
	export interface StatisticalAnalysisResult {
		meanDifference: {
			test: {
				pValue: number;
				isSignificant: boolean;
				testStatistic: number;
				degreesOfFreedom?: number;
			};
			meanDiff: number;
			confidenceInterval: {
				lower: number;
				upper: number;
				level: number;
			};
			effectSize: {
				value: number;
				magnitude: "negligible" | "small" | "medium" | "large" | "very large";
			};
		};
		varianceComparison: {
			test: {
				pValue: number;
				isSignificant: boolean;
				testStatistic: number;
			};
			varianceRatio: number;
		};
		distributionComparison: {
			test: {
				pValue: number;
				isSignificant: boolean;
				testStatistic: number;
			};
			maxDifference: number;
		};
		sampleInfo: {
			baselineSize: number;
			currentSize: number;
			warning?: string;
		};
	}

	/**
	 * Regression comparison result
	 */
	export interface RegressionResult {
		severity: RegressionSeverity;
		currentVersion: string;
		baselineVersion: string;
		metrics: {
			executionTimeDelta: number;
			executionTimeDeltaPercent: number;
			functionCallsDelta: number;
			functionCallsDeltaPercent: number;
			memoryAllocationsDelta?: number;
			memoryAllocationsDeltaPercent?: number;
		};
		hotFunctionShifts?: Array<{
			name: string;
			timeDelta: number;
			timeDeltaPercent: number;
		}>;
		message: string;
		/** Statistical analysis (6.7.1A.0.0.0.0) - available if raw samples exist */
		statisticalAnalysis?: StatisticalAnalysisResult;
	}

	/**
	 * Regression status response
	 */
	export interface RegressionStatus {
		hasBaseline: boolean;
		hasProfiles: boolean;
		latestProfile: ProfileEntry | null;
		baseline: ProfileEntry | null;
		regression: RegressionResult | null;
	}

	/**
	 * Profile filter options
	 */
	export interface ProfileFilter {
		version?: string;
		gitHash?: string;
		limit?: number;
	}

	/**
	 * Statistical analysis configuration (6.7.1A.0.0.0.0)
	 */
	export interface StatisticalConfig {
		/** Significance level (alpha) for p-value comparisons */
		significanceLevel: number;
		/** Confidence level for confidence intervals (e.g., 0.95 for 95%) */
		confidenceLevel: number;
		/** Minimum sample size to perform statistical tests */
		minSampleSize: number;
	}

	/**
	 * Registry configuration
	 */
	export interface RegistryConfig {
		registryDir?: string;
		baselineDir?: string;
		versionsDir?: string;
		tempDir?: string;
		regressionThresholds?: {
			critical: number;
			warning: number;
			improvement: number;
		};
		/** Statistical analysis configuration (6.7.1A.0.0.0.0) */
		statisticalConfig?: StatisticalConfig;
	}

	/**
	 * Registry directory paths
	 */
	export const DIRECTORIES = {
		REGISTRY: "profiles",
		BASELINE: "profiles/baseline",
		VERSIONS: "profiles/versions",
		TEMP: "profiles/temp",
	} as const;

	/**
	 * Default regression thresholds
	 */
	export const REGRESSION_THRESHOLDS = {
		CRITICAL: 0.2, // >20% degradation
		WARNING: 0.1, // >10% degradation
		IMPROVEMENT: 0.1, // >10% improvement
	} as const;
}

// ═══════════════════════════════════════════════════════════════
// CPU Profiling Registry Class
// ═══════════════════════════════════════════════════════════════

/**
 * CPU Profiling Registry Manager
 *
 * Manages CPU profile storage, versioning, baseline tracking, and regression detection.
 * Uses a class-based API to prevent naming conflicts and enable better extensibility.
 *
 * @example
 * ```typescript
 * const registry = new CPUProfilingRegistry();
 * const entry = await registry.registerProfile("/path/to/profile.cpuprofile");
 * const baseline = await registry.getBaseline();
 * const comparison = await registry.compareProfiles(entry, baseline);
 * ```
 */
export class CPUProfilingRegistry {
	private readonly config: CPUProfiling.RegistryConfig;
	private readonly registryDir: string;
	private readonly registryFile: string;
	private readonly baselineDir: string;
	private readonly versionsDir: string;
	private readonly tempDir: string;
	private readonly thresholds: {
		critical: number;
		warning: number;
		improvement: number;
	};
	private readonly statisticalConfig: CPUProfiling.StatisticalConfig;

	constructor(config: CPUProfiling.RegistryConfig = {}) {
		this.config = config;
		const baseDir =
			config.registryDir ||
			join(process.cwd(), CPUProfiling.DIRECTORIES.REGISTRY);

		this.registryDir = baseDir;
		this.registryFile = join(baseDir, "registry.json");
		this.baselineDir = config.baselineDir || join(baseDir, "baseline");
		this.versionsDir = config.versionsDir || join(baseDir, "versions");
		this.tempDir = config.tempDir || join(baseDir, "temp");

		this.thresholds = config.regressionThresholds || {
			critical: CPUProfiling.REGRESSION_THRESHOLDS.CRITICAL,
			warning: CPUProfiling.REGRESSION_THRESHOLDS.WARNING,
			improvement: CPUProfiling.REGRESSION_THRESHOLDS.IMPROVEMENT,
		};

		// Statistical analysis configuration (6.7.1A.0.0.0.0)
		this.statisticalConfig = config.statisticalConfig || {
			significanceLevel: 0.05,
			confidenceLevel: 0.95,
			minSampleSize: 10,
		};

		// Directories will be created lazily when needed
	}

	/**
	 * Initialize registry directory structure (async)
	 */
	private async ensureDirectories(): Promise<void> {
		for (const dir of [
			this.registryDir,
			this.baselineDir,
			this.versionsDir,
			this.tempDir,
		]) {
			const dirFile = Bun.file(dir);
			if (!(await dirFile.exists())) {
				await mkdir(dir, { recursive: true });
			}
		}
	}

	/**
	 * Load registry data from disk
	 */
	private async loadRegistry(): Promise<CPUProfiling.RegistryData> {
		await this.ensureDirectories();

		const registryFile = Bun.file(this.registryFile);
		if (!(await registryFile.exists())) {
			return {
				version: "1.0.0",
				baseline: null,
				profiles: [],
			};
		}

		try {
			return (await registryFile.json()) as CPUProfiling.RegistryData;
		} catch (error) {
			console.error("[CPUProfilingRegistry] Failed to load registry:", error);
			return {
				version: "1.0.0",
				baseline: null,
				profiles: [],
			};
		}
	}

	/**
	 * Save registry data to disk
	 */
	private async saveRegistry(data: CPUProfiling.RegistryData): Promise<void> {
		await this.ensureDirectories();
		await Bun.write(this.registryFile, JSON.stringify(data, null, 2));
	}

	/**
	 * Get git commit hash (short)
	 */
	private async getGitHash(): Promise<string> {
		try {
			const hash = await $`git rev-parse HEAD`.text();
			return hash.trim().substring(0, 7);
		} catch {
			return "unknown";
		}
	}

	/**
	 * Generate version string: v{major}.{minor}.{patch}-{timestamp}-{git-hash}
	 */
	private async generateVersion(
		major = 1,
		minor = 0,
		patch = 0,
	): Promise<string> {
		const timestamp = new Date()
			.toISOString()
			.replace(/[:.]/g, "-")
			.split("T")[0];
		const gitHash = await this.getGitHash();
		return `v${major}.${minor}.${patch}-${timestamp}-${gitHash}`;
	}

	/**
	 * Parse CPU profile file and extract metrics
	 * Includes raw sample data for statistical analysis (6.7.1A.0.0.0.0)
	 */
	private async parseProfileMetrics(
		filepath: string,
	): Promise<CPUProfiling.ProfileMetrics> {
		try {
			const file = Bun.file(filepath);
			const content = await file.json();

			// Chrome DevTools CPU profile format
			const nodes = content.nodes || [];
			const samples = content.samples || [];
			const timeDeltas = content.timeDeltas || [];

			const totalTime = timeDeltas.reduce(
				(sum: number, delta: number) => sum + delta,
				0,
			);
			const functionCalls = nodes.length;

			// Extract raw execution time samples (6.7.1A.0.0.0.0)
			// Convert microseconds to milliseconds for consistency
			const executionTimes = timeDeltas.map((delta: number) => delta / 1000);

			// Calculate hot functions (top 5 by self time)
			const nodeTimes = new Map<number, number>();
			samples.forEach((sample: number, index: number) => {
				const delta = timeDeltas[index] || 0;
				if (!nodeTimes.has(sample)) {
					nodeTimes.set(sample, 0);
				}
				nodeTimes.set(sample, nodeTimes.get(sample)! + delta);
			});

			const hotFunctions = Array.from(nodeTimes.entries())
				.map(([nodeId, time]) => {
					const node = nodes.find((n: any) => n.id === nodeId);
					return {
						name: node?.callFrame?.functionName || "unknown",
						time,
						percentage: (time / totalTime) * 100,
					};
				})
				.sort((a, b) => b.time - a.time)
				.slice(0, 5);

			return {
				totalTime,
				functionCalls,
				hotFunctions,
				rawSamples: {
					executionTimes,
					functionCallCounts: samples.map(() => nodes.length), // Approximate per-sample
				},
			};
		} catch (error) {
			console.error(
				"[CPUProfilingRegistry] Failed to parse profile metrics:",
				error,
			);
			return {
				totalTime: 0,
				functionCalls: 0,
			};
		}
	}

	/**
	 * Register a new profile in the registry
	 */
	async registerProfile(
		profilePath: string,
		metadata?: Partial<CPUProfiling.ProfileEntry>,
	): Promise<CPUProfiling.ProfileEntry> {
		await this.ensureDirectories();

		const registry = await this.loadRegistry();
		const gitHash = await this.getGitHash();
		const version = metadata?.version || (await this.generateVersion());
		const filename = basename(profilePath);
		const metrics = await this.parseProfileMetrics(profilePath);

		const entry: CPUProfiling.ProfileEntry = {
			id: metadata?.id || crypto.randomUUID(),
			version,
			filename,
			filepath: profilePath,
			createdAt: metadata?.createdAt || new Date().toISOString(),
			gitHash,
			metrics,
		};

		registry.profiles.push(entry);
		await this.saveRegistry(registry);

		return entry;
	}

	/**
	 * Get baseline profile entry
	 */
	async getBaseline(): Promise<CPUProfiling.ProfileEntry | null> {
		const registry = await this.loadRegistry();
		if (!registry.baseline) {
			return null;
		}

		return (
			registry.profiles.find((p) => p.id === registry.baseline!.profileId) ||
			null
		);
	}

	/**
	 * Set baseline profile
	 */
	async setBaseline(profileId: string, freeze = false): Promise<void> {
		const registry = await this.loadRegistry();
		const profile = registry.profiles.find((p) => p.id === profileId);

		if (!profile) {
			throw new Error(`[CPUProfilingRegistry] Profile ${profileId} not found`);
		}

		registry.baseline = {
			version: profile.version,
			frozen: freeze,
			frozenAt: freeze ? new Date().toISOString() : null,
			profileId: profile.id,
		};

		await this.saveRegistry(registry);
	}

	/**
	 * Freeze baseline version to prevent overwrites
	 */
	async freezeBaseline(version?: string): Promise<void> {
		const registry = await this.loadRegistry();

		if (!registry.baseline) {
			throw new Error("[CPUProfilingRegistry] No baseline set");
		}

		if (registry.baseline.frozen) {
			throw new Error("[CPUProfilingRegistry] Baseline is already frozen");
		}

		if (version && registry.baseline.version !== version) {
			throw new Error(
				`[CPUProfilingRegistry] Version mismatch: expected ${registry.baseline.version}, got ${version}`,
			);
		}

		registry.baseline.frozen = true;
		registry.baseline.frozenAt = new Date().toISOString();

		await this.saveRegistry(registry);
	}

	/**
	 * List all profiles with optional filter
	 */
	async listProfiles(
		filter?: CPUProfiling.ProfileFilter,
	): Promise<CPUProfiling.ProfileEntry[]> {
		const registry = await this.loadRegistry();
		let profiles = [...registry.profiles];

		if (filter?.version) {
			profiles = profiles.filter((p) => p.version === filter.version);
		}

		if (filter?.gitHash) {
			profiles = profiles.filter((p) => p.gitHash === filter.gitHash);
		}

		profiles.sort(
			(a, b) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		);

		if (filter?.limit) {
			profiles = profiles.slice(0, filter.limit);
		}

		return profiles;
	}

	/**
	 * Compare current profile against baseline
	 * Enhanced with statistical analysis (6.7.1A.0.0.0.0)
	 */
	async compareProfiles(
		current: CPUProfiling.ProfileEntry,
		baseline: CPUProfiling.ProfileEntry,
	): Promise<CPUProfiling.RegressionResult> {
		const timeDelta = current.metrics.totalTime - baseline.metrics.totalTime;
		const timeDeltaPercent = (timeDelta / baseline.metrics.totalTime) * 100;

		const callsDelta =
			current.metrics.functionCalls - baseline.metrics.functionCalls;
		const callsDeltaPercent =
			baseline.metrics.functionCalls > 0
				? (callsDelta / baseline.metrics.functionCalls) * 100
				: 0;

		// Determine severity based on thresholds (will be enhanced by statistical analysis if available)
		let severity = CPUProfiling.RegressionSeverity.INFO;
		if (timeDeltaPercent > this.thresholds.critical * 100) {
			severity = CPUProfiling.RegressionSeverity.CRITICAL;
		} else if (timeDeltaPercent > this.thresholds.warning * 100) {
			severity = CPUProfiling.RegressionSeverity.WARNING;
		} else if (timeDeltaPercent < -this.thresholds.improvement * 100) {
			severity = CPUProfiling.RegressionSeverity.IMPROVEMENT;
		}

		// Perform statistical analysis if raw samples are available (6.7.1A.0.0.0.0)
		let statisticalAnalysis: CPUProfiling.StatisticalAnalysisResult | undefined;
		const currentSamples = current.metrics.rawSamples?.executionTimes;
		const baselineSamples = baseline.metrics.rawSamples?.executionTimes;
		if (
			currentSamples &&
			baselineSamples &&
			currentSamples.length >= this.statisticalConfig.minSampleSize &&
			baselineSamples.length >= this.statisticalConfig.minSampleSize
		) {
			try {
				const statsResult = performStatisticalAnalysis(
					baselineSamples,
					currentSamples,
					this.statisticalConfig,
				);

				// Convert StatisticalAnalysis to StatisticalAnalysisResult format
				statisticalAnalysis = {
					meanDifference: {
						test: {
							pValue: statsResult.meanDifference.test.pValue,
							isSignificant: statsResult.meanDifference.test.isSignificant,
							testStatistic: statsResult.meanDifference.test.testStatistic,
							degreesOfFreedom:
								statsResult.meanDifference.test.degreesOfFreedom,
						},
						meanDiff: statsResult.meanDifference.meanDiff,
						confidenceInterval: {
							lower: statsResult.meanDifference.confidenceInterval.lower,
							upper: statsResult.meanDifference.confidenceInterval.upper,
							level: statsResult.meanDifference.confidenceInterval.level,
						},
						effectSize: {
							value: statsResult.meanDifference.effectSize.value,
							magnitude: statsResult.meanDifference.effectSize.magnitude,
						},
					},
					varianceComparison: {
						test: {
							pValue: statsResult.varianceComparison.test.pValue,
							isSignificant: statsResult.varianceComparison.test.isSignificant,
							testStatistic: statsResult.varianceComparison.test.testStatistic,
						},
						varianceRatio: statsResult.varianceComparison.varianceRatio,
					},
					distributionComparison: {
						test: {
							pValue: statsResult.distributionComparison.test.pValue,
							isSignificant:
								statsResult.distributionComparison.test.isSignificant,
							testStatistic:
								statsResult.distributionComparison.test.testStatistic,
						},
						maxDifference: statsResult.distributionComparison.maxDifference,
					},
					sampleInfo: {
						baselineSize: statsResult.sampleInfo.baselineSize,
						currentSize: statsResult.sampleInfo.currentSize,
						warning: statsResult.sampleInfo.warning,
					},
				};
			} catch (error) {
				console.error(
					"[CPUProfilingRegistry] Statistical analysis failed:",
					error,
				);
				// Continue without statistical analysis
			}
		}

		// Calculate hot function shifts
		const hotFunctionShifts: CPUProfiling.RegressionResult["hotFunctionShifts"] =
			[];
		if (current.metrics.hotFunctions && baseline.metrics.hotFunctions) {
			const baselineMap = new Map(
				baseline.metrics.hotFunctions.map((f) => [f.name, f]),
			);

			current.metrics.hotFunctions.forEach((currentFunc) => {
				const baselineFunc = baselineMap.get(currentFunc.name);
				if (baselineFunc) {
					const timeDelta = currentFunc.time - baselineFunc.time;
					const timeDeltaPercent =
						baselineFunc.time > 0 ? (timeDelta / baselineFunc.time) * 100 : 0;

					if (Math.abs(timeDeltaPercent) > 10) {
						hotFunctionShifts.push({
							name: currentFunc.name,
							timeDelta,
							timeDeltaPercent,
						});
					}
				}
			});
		}

		// Build message with statistical context if available
		let message: string;
		if (statisticalAnalysis?.meanDifference.test.isSignificant) {
			const effectSize = statisticalAnalysis.meanDifference.effectSize;
			message =
				severity === CPUProfiling.RegressionSeverity.CRITICAL
					? `Critical regression: ${timeDeltaPercent.toFixed(2)}% slower (statistically significant, ${effectSize.magnitude} effect)`
					: severity === CPUProfiling.RegressionSeverity.WARNING
						? `Warning: ${timeDeltaPercent.toFixed(2)}% slower (statistically significant, ${effectSize.magnitude} effect)`
						: severity === CPUProfiling.RegressionSeverity.IMPROVEMENT
							? `Improvement: ${Math.abs(timeDeltaPercent).toFixed(2)}% faster (statistically significant, ${effectSize.magnitude} effect)`
							: `No significant change: ${timeDeltaPercent.toFixed(2)}% variation`;
		} else {
			message =
				severity === CPUProfiling.RegressionSeverity.CRITICAL
					? `Critical regression: ${timeDeltaPercent.toFixed(2)}% slower`
					: severity === CPUProfiling.RegressionSeverity.WARNING
						? `Warning: ${timeDeltaPercent.toFixed(2)}% slower`
						: severity === CPUProfiling.RegressionSeverity.IMPROVEMENT
							? `Improvement: ${Math.abs(timeDeltaPercent).toFixed(2)}% faster`
							: `No significant change: ${timeDeltaPercent.toFixed(2)}% variation`;
		}

		return {
			severity,
			currentVersion: current.version,
			baselineVersion: baseline.version,
			metrics: {
				executionTimeDelta: timeDelta,
				executionTimeDeltaPercent: timeDeltaPercent,
				functionCallsDelta: callsDelta,
				functionCallsDeltaPercent: callsDeltaPercent,
			},
			hotFunctionShifts:
				hotFunctionShifts.length > 0 ? hotFunctionShifts : undefined,
			message,
			statisticalAnalysis,
		};
	}

	/**
	 * Get regression status comparing latest profile against baseline
	 */
	async getRegressionStatus(): Promise<CPUProfiling.RegressionStatus> {
		const registry = await this.loadRegistry();
		const baseline = await this.getBaseline();
		const profiles = await this.listProfiles({ limit: 1 });
		const latestProfile = profiles[0] || null;

		let regression: CPUProfiling.RegressionResult | null = null;
		if (baseline && latestProfile) {
			regression = await this.compareProfiles(latestProfile, baseline);
		}

		return {
			hasBaseline: baseline !== null,
			hasProfiles: profiles.length > 0,
			latestProfile,
			baseline,
			regression,
		};
	}

	/**
	 * Clean old profiles, keeping only the last N profiles
	 */
	async cleanProfiles(keepLast: number = 10): Promise<number> {
		const registry = await this.loadRegistry();
		const profiles = await this.listProfiles();

		if (profiles.length <= keepLast) {
			return 0;
		}

		const toRemove = profiles.slice(keepLast);
		const toRemoveIds = new Set(toRemove.map((p) => p.id));

		// Don't remove baseline
		if (registry.baseline) {
			toRemoveIds.delete(registry.baseline.profileId);
		}

		registry.profiles = registry.profiles.filter((p) => !toRemoveIds.has(p.id));
		await this.saveRegistry(registry);

		// Delete files
		let deleted = 0;
		for (const profile of toRemove) {
			try {
				const profileFile = Bun.file(profile.filepath);
				if (await profileFile.exists()) {
					await profileFile.delete();
					deleted++;
				}
			} catch (error) {
				console.error(
					`[CPUProfilingRegistry] Failed to delete profile ${profile.filepath}:`,
					error,
				);
			}
		}

		return deleted;
	}

	/**
	 * Get registry directory paths
	 */
	getDirectories() {
		return {
			registry: this.registryDir,
			baseline: this.baselineDir,
			versions: this.versionsDir,
			temp: this.tempDir,
		};
	}
}

// ═══════════════════════════════════════════════════════════════
// Default Instance & Backward Compatibility Exports
// ═══════════════════════════════════════════════════════════════

/**
 * Default registry instance for convenience
 * Use this for simple cases, or create your own instance with custom config
 */
const defaultRegistry = new CPUProfilingRegistry();

/**
 * Backward compatibility exports - use CPUProfilingRegistry class for new code
 * @deprecated Use CPUProfilingRegistry class instance methods instead
 */
export const registerProfile =
	defaultRegistry.registerProfile.bind(defaultRegistry);
export const getBaseline = defaultRegistry.getBaseline.bind(defaultRegistry);
export const setBaseline = defaultRegistry.setBaseline.bind(defaultRegistry);
export const freezeBaseline =
	defaultRegistry.freezeBaseline.bind(defaultRegistry);
export const listProfiles = defaultRegistry.listProfiles.bind(defaultRegistry);
export const compareProfiles =
	defaultRegistry.compareProfiles.bind(defaultRegistry);
export const getRegressionStatus =
	defaultRegistry.getRegressionStatus.bind(defaultRegistry);
export const cleanProfiles =
	defaultRegistry.cleanProfiles.bind(defaultRegistry);

// Export directory paths (backward compatibility)
export const PROFILES_DIR = join(
	process.cwd(),
	CPUProfiling.DIRECTORIES.REGISTRY,
);
export const PROFILES_BASELINE_DIR = join(
	process.cwd(),
	CPUProfiling.DIRECTORIES.BASELINE,
);
export const PROFILES_VERSIONS_DIR = join(
	process.cwd(),
	CPUProfiling.DIRECTORIES.VERSIONS,
);
export const PROFILES_TEMP_DIR = join(
	process.cwd(),
	CPUProfiling.DIRECTORIES.TEMP,
);

// Re-export types for convenience (backward compatibility)
export type ProfileMetrics = CPUProfiling.ProfileMetrics;
export type ProfileEntry = CPUProfiling.ProfileEntry;
export type BaselineEntry = CPUProfiling.BaselineEntry;
export type RegistryData = CPUProfiling.RegistryData;
export type RegressionSeverity = CPUProfiling.RegressionSeverity;
export type RegressionResult = CPUProfiling.RegressionResult;
