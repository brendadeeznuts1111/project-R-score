// utils/toml-hot-reload.ts
// Advanced hot-reload system with intelligent file watching and debouncing
import { readFileSync, watch } from "node:fs";
import { basename, extname, join } from "node:path";
import { ConfigValidator } from "../types/toml-config";
import { debounce, generateId } from "./common";
import { defaultTOMLCache } from "./toml-cache";
import {
	expandEnvVars,
	parseTomlString,
	validateRequiredEnvVars,
} from "./toml-utils";

export interface HotReloadOptions {
	debounceMs?: number;
	validateOnReload?: boolean;
	expandEnvVars?: boolean;
	cacheResults?: boolean;
	schema?: "modal" | "secrets" | "auto";
	ignorePatterns?: string[];
	includeSubdirectories?: boolean;
	maxFileSize?: number;
	enableLogging?: boolean;
	onReload?: (event: ReloadEvent) => void;
	onError?: (error: ReloadError) => void;
	onSuccess?: (result: ReloadResult) => void;
}

export interface ReloadEvent {
	type: "change" | "add" | "unlink";
	path: string;
	timestamp: number;
	size?: number;
}

export interface ReloadError {
	path: string;
	error: Error;
	timestamp: number;
	eventType: string;
}

export interface ReloadResult {
	path: string;
	config: any;
	metadata: ReloadMetadata;
	timestamp: number;
}

export interface ReloadMetadata {
	validationTime: number;
	parseTime: number;
	cacheHit: boolean;
	fileSize: number;
	schemaType: string;
	envVarsExpanded: boolean;
	validationPassed: boolean;
}

export interface WatcherHandle {
	id: string;
	path: string;
	stop: () => void;
	isWatching: boolean;
	stats: WatcherStats;
}

export interface WatcherStats {
	filesWatched: number;
	reloadsTriggered: number;
	errorsEncountered: number;
	lastReload: number;
	averageReloadTime: number;
}

class TomlHotReload {
	private watchers = new Map<string, WatcherHandle>();
	private options: Required<HotReloadOptions>;
	private globalStats: WatcherStats = {
		filesWatched: 0,
		reloadsTriggered: 0,
		errorsEncountered: 0,
		lastReload: 0,
		averageReloadTime: 0,
	};

	constructor(options: HotReloadOptions = {}) {
		this.options = {
			debounceMs: options.debounceMs || 300,
			validateOnReload: options.validateOnReload !== false,
			expandEnvVars: options.expandEnvVars || false,
			cacheResults: options.cacheResults !== false,
			schema: options.schema || "auto",
			ignorePatterns: options.ignorePatterns || [
				"*.tmp",
				"*.swp",
				"*.bak",
				"*~",
				".git/*",
				"node_modules/*",
				".DS_Store",
			],
			includeSubdirectories: options.includeSubdirectories || true,
			maxFileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB
			enableLogging: options.enableLogging || false,
			onReload: options.onReload || (() => {}),
			onError: options.onError || (() => {}),
			onSuccess: options.onSuccess || (() => {}),
		};
	}

	/**
	 * Start watching a TOML file or directory
	 */
	watchPath(path: string, options?: Partial<HotReloadOptions>): WatcherHandle {
		const watcherId = generateId("watcher");
		const mergedOptions = { ...this.options, ...options };

		let isWatching = true;
		let reloadTimes: number[] = [];

		const stats: WatcherStats = {
			filesWatched: 0,
			reloadsTriggered: 0,
			errorsEncountered: 0,
			lastReload: 0,
			averageReloadTime: 0,
		};

		// Create debounced reload handler
		const debouncedReload = debounce(
			async (eventType: string, filePath: string) => {
				if (!isWatching) return;

				const startTime = Date.now();

				try {
					await this.handleFileChange(filePath, eventType, mergedOptions);

					const reloadTime = Date.now() - startTime;
					reloadTimes.push(reloadTime);

					// Keep only last 10 reload times for average
					if (reloadTimes.length > 10) {
						reloadTimes = reloadTimes.slice(-10);
					}

					stats.reloadsTriggered++;
					stats.lastReload = Date.now();
					stats.averageReloadTime =
						reloadTimes.reduce((a, b) => a + b, 0) / reloadTimes.length;

					this.globalStats.reloadsTriggered++;
					this.globalStats.lastReload = Date.now();

					if (mergedOptions.enableLogging) {
						console.log(
							`🔄 Reloaded ${filePath} (${eventType}) in ${reloadTime}ms`,
						);
					}
				} catch (error) {
					stats.errorsEncountered++;
					this.globalStats.errorsEncountered++;

					mergedOptions.onError({
						path: filePath,
						error: error as Error,
						timestamp: Date.now(),
						eventType,
					});

					if (mergedOptions.enableLogging) {
						console.error(`❌ Failed to reload ${filePath}:`, error);
					}
				}
			},
			mergedOptions.debounceMs,
		);

		// Set up file watcher
		const watcher = watch(
			path,
			{
				recursive: mergedOptions.includeSubdirectories,
			},
			(eventType, filename) => {
				if (!filename || !isWatching) return;

				const fullPath = join(path, filename);

				// Check ignore patterns
				if (this.shouldIgnore(fullPath, mergedOptions.ignorePatterns)) {
					return;
				}

				// Check file extension
				if (extname(filename) !== ".toml") {
					return;
				}

				// Trigger reload
				debouncedReload(eventType || "change", fullPath);
			},
		);

		const handle: WatcherHandle = {
			id: watcherId,
			path,
			stop: () => {
				isWatching = false;
				watcher.close();
				this.watchers.delete(watcherId);
				this.globalStats.filesWatched--;
			},
			isWatching,
			stats,
		};

		this.watchers.set(watcherId, handle);
		this.globalStats.filesWatched++;

		// Count initial files
		if (mergedOptions.includeSubdirectories) {
			// This would require a recursive directory scan
			stats.filesWatched = 1; // Simplified for now
		} else {
			stats.filesWatched = 1;
		}

		if (mergedOptions.enableLogging) {
			console.log(`👁️  Started watching: ${path}`);
		}

		return handle;
	}

	/**
	 * Stop watching all paths
	 */
	stopAll(): void {
		for (const [_id, handle] of this.watchers) {
			handle.stop();
		}
		this.watchers.clear();
		this.globalStats = {
			filesWatched: 0,
			reloadsTriggered: 0,
			errorsEncountered: 0,
			lastReload: 0,
			averageReloadTime: 0,
		};
	}

	/**
	 * Get global statistics
	 */
	getGlobalStats(): WatcherStats {
		return { ...this.globalStats };
	}

	/**
	 * Get all watcher handles
	 */
	getWatchers(): WatcherHandle[] {
		return Array.from(this.watchers.values());
	}

	/**
	 * Get watcher by path
	 */
	getWatcher(path: string): WatcherHandle | undefined {
		for (const handle of this.watchers.values()) {
			if (handle.path === path) {
				return handle;
			}
		}
		return undefined;
	}

	/**
	 * Handle file change event
	 */
	private async handleFileChange(
		filePath: string,
		eventType: string,
		options: Required<HotReloadOptions>,
	): Promise<void> {
		const startTime = Date.now();

		// Trigger reload event
		options.onReload({
			type: eventType as any,
			path: filePath,
			timestamp: startTime,
		});

		// Check file size
		const stats = await this.getFileStats(filePath);
		if (stats.size > options.maxFileSize) {
			throw new Error(
				`File too large: ${stats.size} bytes (max: ${options.maxFileSize})`,
			);
		}

		// Read file content
		const content = readFileSync(filePath, "utf-8");
		const parseStartTime = Date.now();

		// Parse TOML
		let config;
		try {
			config = parseTomlString(content);
		} catch (error) {
			throw new Error(`TOML parse error: ${error}`);
		}

		const parseTime = Date.now() - parseStartTime;

		// Expand environment variables if requested
		let processedConfig = config;
		let envVarsExpanded = false;

		if (options.expandEnvVars) {
			processedConfig = expandEnvVars(config);
			envVarsExpanded = true;

			// Validate required environment variables
			const envValidation = validateRequiredEnvVars(config);
			if (!envValidation.valid) {
				throw new Error(
					`Missing environment variables: ${envValidation.missing.join(", ")}`,
				);
			}
		}

		// Validate configuration if requested
		let validationPassed = true;
		let validationTime = 0;
		let schemaType = "unknown";

		if (options.validateOnReload) {
			const validationStartTime = Date.now();

			try {
				if (options.schema === "auto") {
					// Auto-detect schema
					if (processedConfig.database && processedConfig.api) {
						schemaType = "secrets";
						const result = ConfigValidator.safeValidateSecrets(processedConfig);
						validationPassed = result.success;
					} else if (processedConfig.ui && processedConfig.features) {
						schemaType = "modal";
						const result = ConfigValidator.safeValidateModal(processedConfig);
						validationPassed = result.success;
					}
				} else {
					schemaType = options.schema;
					const result =
						schemaType === "secrets"
							? ConfigValidator.safeValidateSecrets(processedConfig)
							: ConfigValidator.safeValidateModal(processedConfig);
					validationPassed = result.success;
				}
			} catch (_error) {
				validationPassed = false;
			}

			validationTime = Date.now() - validationStartTime;

			if (!validationPassed) {
				throw new Error(
					`Configuration validation failed for schema: ${schemaType}`,
				);
			}
		}

		// Cache result if requested
		if (options.cacheResults && validationPassed) {
			defaultTOMLCache.set(`file:${filePath}`, processedConfig, 15 * 60 * 1000);
		}

		// Create result
		const result: ReloadResult = {
			path: filePath,
			config: processedConfig,
			metadata: {
				validationTime,
				parseTime,
				cacheHit: false,
				fileSize: stats.size,
				schemaType,
				envVarsExpanded,
				validationPassed,
			},
			timestamp: Date.now(),
		};

		// Trigger success callback
		options.onSuccess(result);
	}

	/**
	 * Check if path should be ignored
	 */
	private shouldIgnore(path: string, ignorePatterns: string[]): boolean {
		const filename = basename(path);

		for (const pattern of ignorePatterns) {
			if (pattern.includes("*")) {
				const regex = new RegExp(pattern.replace(/\*/g, ".*"));
				if (regex.test(filename) || regex.test(path)) {
					return true;
				}
			} else if (filename === pattern || path.includes(pattern)) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Get file statistics
	 */
	private async getFileStats(
		path: string,
	): Promise<{ size: number; mtime: number }> {
		try {
			const file = Bun.file(path);
			return {
				size: file.size,
				mtime: file.lastModified,
			};
		} catch {
			// Fallback for systems where Bun.file might not work
			return { size: 0, mtime: Date.now() };
		}
	}
}

// Global hot-reload instance
export const globalTOMLHotReload = new TomlHotReload({
	debounceMs: 300,
	validateOnReload: true,
	expandEnvVars: false,
	enableLogging: true,
});

// Convenience functions
export const watchTOMLFile = (
	path: string,
	options?: Partial<HotReloadOptions>,
) => globalTOMLHotReload.watchPath(path, options);

export const stopAllTOMLWatchers = () => globalTOMLHotReload.stopAll();

export const getTOMLWatcherStats = () => globalTOMLHotReload.getGlobalStats();

// Export main class for advanced usage
export { TomlHotReload };
