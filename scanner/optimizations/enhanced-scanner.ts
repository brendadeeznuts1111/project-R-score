/**
 * Enhanced Scanner - Bun v1.3.7 API Integration
 *
 * Integrates all six Bun v1.3.7 native APIs into the scanner workflow:
 * - Bun.which() for toolchain validation
 * - Bun.randomUUIDv7() for sortable scan IDs
 * - Bun.peek() for optimized promise handling
 * - Bun.openInEditor() for report viewing
 * - Bun.deepEquals() for config comparison
 * - Bun.escapeHTML() for safe report generation
 *
 * Combined R-Score: 0.9491 (Native-Grade ≥ 0.95)
 *
 * @module enhanced-scanner
 */

import {
	ExecutableResolver,
	MonotonicIDGenerator,
	PromiseOptimizer,
	EditorIntegration,
	EqualityChecker,
	HTMLEscaper,
	calculateCombinedRScore,
	which,
	generateId,
} from './bun-v137-apis';
import {calculateRScore, type RScoreParams} from './bun-optimizations';

// ============================================================================
// Types
// ============================================================================

/**
 * Enhanced scan result with Bun v1.3.7 optimizations
 */
export interface EnhancedScanResult {
	/** Monotonic UUID v7 scan ID */
	id: string;
	/** Scan timestamp */
	timestamp: Date;
	/** Scan duration in milliseconds */
	durationMs: number;
	/** Toolchain validation results */
	toolchain: {
		available: string[];
		missing: string[];
		allPresent: boolean;
	};
	/** Configuration comparison results */
	configComparison?: {
		hasChanged: boolean;
		diffPaths: string[];
	};
	/** Scan results (escaped for HTML safety) */
	results: ScanEntry[];
	/** R-Score metrics */
	rScore: {
		combined: number;
		components: Record<string, number>;
		tier: 'Critical' | 'Sub-Optimal' | 'Native-Grade' | 'Elite';
	};
}

/**
 * Individual scan entry
 */
export interface ScanEntry {
	id: string;
	type: 'file' | 'directory' | 'package' | 'config';
	path: string;
	status: 'ok' | 'warning' | 'error' | 'info';
	message?: string;
	details?: Record<string, unknown>;
}

/**
 * Scanner configuration
 */
export interface EnhancedScannerConfig {
	/** Tools to validate on startup */
	requiredTools?: string[];
	/** Auto-open reports in editor */
	autoOpenReports?: boolean;
	/** Enable promise optimization */
	optimizePromises?: boolean;
	/** Enable HTML escaping for reports */
	escapeHtmlOutput?: boolean;
	/** Compare configs for changes */
	trackConfigChanges?: boolean;
}

// ============================================================================
// Enhanced Scanner Class
// ============================================================================

/**
 * Enhanced security scanner with Bun v1.3.7 native API integration
 *
 * @example
 * ```ts
 * const scanner = new EnhancedScanner({
 *   requiredTools: ['bun', 'git', 'node'],
 *   autoOpenReports: true,
 * });
 *
 * const result = await scanner.scan('/path/to/project');
 * console.log(`Scan ${result.id} completed in ${result.durationMs}ms`);
 * console.log(`R-Score: ${result.rScore.combined}`);
 * ```
 */
export class EnhancedScanner {
	private resolver: ExecutableResolver;
	private idGen: MonotonicIDGenerator;
	private config: Required<EnhancedScannerConfig>;
	private previousConfig: unknown = null;

	/**
	 * Default configuration
	 */
	static readonly DEFAULT_CONFIG: Required<EnhancedScannerConfig> = {
		requiredTools: ['bun', 'git'],
		autoOpenReports: false,
		optimizePromises: true,
		escapeHtmlOutput: true,
		trackConfigChanges: true,
	};

	/**
	 * Create a new enhanced scanner
	 *
	 * @param config - Scanner configuration
	 */
	constructor(config: EnhancedScannerConfig = {}) {
		this.config = {...EnhancedScanner.DEFAULT_CONFIG, ...config};
		this.resolver = new ExecutableResolver();
		this.idGen = new MonotonicIDGenerator();
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Core Scan Method
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Execute a complete scan with all Bun v1.3.7 optimizations
	 *
	 * @param projectPath - Path to project to scan
	 * @returns Enhanced scan result
	 */
	async scan(projectPath: string): Promise<EnhancedScanResult> {
		const startTime = performance.now();

		// 1. Generate monotonic scan ID (Bun.randomUUIDv7)
		const scanId = this.idGen.generateSortable('scan');

		// 2. Validate toolchain (Bun.which)
		const toolchain = this.validateToolchain();

		// 3. Load and check configs (Bun.deepEquals)
		const configComparison = await this.compareConfigurations(projectPath);

		// 4. Execute scan tasks with optimized promises (Bun.peek)
		const results = await this.executeScanTasks(projectPath);

		// 5. Calculate R-Score
		const rScoreMetrics = calculateCombinedRScore();
		const tier = this.getPerformanceTier(rScoreMetrics.combined);

		const durationMs = Math.round(performance.now() - startTime);

		const result: EnhancedScanResult = {
			id: scanId,
			timestamp: new Date(),
			durationMs,
			toolchain,
			configComparison,
			results,
			rScore: {
				combined: rScoreMetrics.combined,
				components: rScoreMetrics.components,
				tier,
			},
		};

		// 6. Generate and optionally open report (Bun.openInEditor, Bun.escapeHTML)
		await this.generateReport(result);

		return result;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// 1. Toolchain Validation (Bun.which)
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Validate required toolchain executables
	 *
	 * Uses Bun.which() for ~50x faster PATH lookups than npm `which`.
	 *
	 * @returns Toolchain validation results
	 *
	 * @r-score-impact +0.05 P_ratio
	 */
	private validateToolchain(): EnhancedScanResult['toolchain'] {
		const {available, missing} = this.resolver.validateToolchain(this.config.requiredTools);

		return {
			available,
			missing,
			allPresent: missing.length === 0,
		};
	}

	// ─────────────────────────────────────────────────────────────────────────
	// 2. Configuration Comparison (Bun.deepEquals)
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Compare current configuration with previous
	 *
	 * Uses Bun.deepEquals() for 10x faster deep comparison than lodash.
	 *
	 * @param projectPath - Project path to load config from
	 * @returns Configuration comparison results
	 *
	 * @r-score-impact +0.06 P_ratio
	 */
	private async compareConfigurations(projectPath: string): Promise<EnhancedScanResult['configComparison']> {
		if (!this.config.trackConfigChanges) {
			return undefined;
		}

		try {
			const configPath = `${projectPath}/package.json`;
			const configFile = Bun.file(configPath);

			if (!(await configFile.exists())) {
				return undefined;
			}

			const currentConfig = await configFile.json();
			const hasChanged = EqualityChecker.configChanged(this.previousConfig, currentConfig);
			const diffPaths =
				this.previousConfig !== null ? EqualityChecker.diffPaths(this.previousConfig, currentConfig) : [];

			this.previousConfig = currentConfig;

			return {
				hasChanged,
				diffPaths,
			};
		} catch {
			return undefined;
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// 3. Optimized Promise Execution (Bun.peek)
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Execute scan tasks with optimized Promise handling
	 *
	 * Uses Bun.peek() for zero microticks on already-resolved promises.
	 *
	 * @param projectPath - Project path to scan
	 * @returns Scan results
	 *
	 * @r-score-impact +0.08 P_ratio
	 */
	private async executeScanTasks(projectPath: string): Promise<ScanEntry[]> {
		const tasks: Promise<ScanEntry>[] = [
			this.checkPackageJson(projectPath),
			this.checkTypeScriptConfig(projectPath),
			this.checkSecurityConfig(projectPath),
			this.checkDependencies(projectPath),
		];

		if (this.config.optimizePromises) {
			// Use Bun.peek() optimized Promise.all
			const optimized = PromiseOptimizer.optimizedAll(tasks);
			if (optimized instanceof Promise) {
				return await optimized;
			}
			return optimized;
		}

		return Promise.all(tasks);
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Individual Scan Tasks
	// ─────────────────────────────────────────────────────────────────────────

	private async checkPackageJson(projectPath: string): Promise<ScanEntry> {
		const id = this.idGen.generateSortable('pkg');
		const pkgPath = `${projectPath}/package.json`;

		try {
			const file = Bun.file(pkgPath);
			if (await file.exists()) {
				const pkg = await file.json();
				return {
					id,
					type: 'package',
					path: pkgPath,
					status: 'ok',
					message: `Found package: ${pkg.name ?? 'unnamed'}`,
					details: {name: pkg.name, version: pkg.version},
				};
			}
			return {
				id,
				type: 'package',
				path: pkgPath,
				status: 'warning',
				message: 'package.json not found',
			};
		} catch (error) {
			return {
				id,
				type: 'package',
				path: pkgPath,
				status: 'error',
				message: `Error reading package.json: ${error}`,
			};
		}
	}

	private async checkTypeScriptConfig(projectPath: string): Promise<ScanEntry> {
		const id = this.idGen.generateSortable('ts');
		const tsConfigPath = `${projectPath}/tsconfig.json`;

		try {
			const file = Bun.file(tsConfigPath);
			if (await file.exists()) {
				return {
					id,
					type: 'config',
					path: tsConfigPath,
					status: 'ok',
					message: 'TypeScript configuration found',
				};
			}
			return {
				id,
				type: 'config',
				path: tsConfigPath,
				status: 'info',
				message: 'No TypeScript configuration',
			};
		} catch (error) {
			return {
				id,
				type: 'config',
				path: tsConfigPath,
				status: 'error',
				message: `Error reading tsconfig.json: ${error}`,
			};
		}
	}

	private async checkSecurityConfig(projectPath: string): Promise<ScanEntry> {
		const id = this.idGen.generateSortable('sec');
		const auditPath = `${projectPath}/.audit`;

		try {
			const file = Bun.file(auditPath);
			const exists = await file.exists();
			return {
				id,
				type: 'directory',
				path: auditPath,
				status: exists ? 'ok' : 'info',
				message: exists ? 'Security audit directory exists' : 'No security audit directory',
			};
		} catch {
			return {
				id,
				type: 'directory',
				path: auditPath,
				status: 'info',
				message: 'Security audit check skipped',
			};
		}
	}

	private async checkDependencies(projectPath: string): Promise<ScanEntry> {
		const id = this.idGen.generateSortable('deps');
		const nodeModulesPath = `${projectPath}/node_modules`;

		try {
			const file = Bun.file(nodeModulesPath);
			const exists = await file.exists();
			return {
				id,
				type: 'directory',
				path: nodeModulesPath,
				status: exists ? 'ok' : 'warning',
				message: exists ? 'Dependencies installed' : 'Dependencies not installed',
			};
		} catch {
			return {
				id,
				type: 'directory',
				path: nodeModulesPath,
				status: 'info',
				message: 'Dependency check skipped',
			};
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// 4. Report Generation (Bun.openInEditor, Bun.escapeHTML)
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Generate and optionally open scan report
	 *
	 * Uses Bun.escapeHTML() for SIMD-optimized HTML escaping (480 MB/s - 20 GB/s).
	 * Uses Bun.openInEditor() for native editor integration.
	 *
	 * @param result - Scan result to report
	 *
	 * @r-score-impact +0.04 P_ratio (editor), +0.07 P_ratio (HTML escape)
	 */
	private async generateReport(result: EnhancedScanResult): Promise<void> {
		const reportPath = `.audit/scan-${result.id}.html`;

		// Generate HTML report with escaped content
		const html = this.renderHTMLReport(result);

		// Ensure .audit directory exists
		await Bun.write(reportPath, html);

		// Optionally open in editor
		if (this.config.autoOpenReports) {
			EditorIntegration.openScanReport(reportPath);
		}
	}

	/**
	 * Render HTML report with escaped content
	 */
	private renderHTMLReport(result: EnhancedScanResult): string {
		const title = HTMLEscaper.escape(`Scan Report: ${result.id}`);
		const scanId = HTMLEscaper.escape(result.id);
		const duration = HTMLEscaper.escape(`${result.durationMs}ms`);
		const tier = HTMLEscaper.escape(result.rScore.tier);
		const rScore = result.rScore.combined.toFixed(4);

		// Escape result entries
		const escapedResults = result.results.map(
			r =>
				`<tr>
          <td>${HTMLEscaper.escape(r.id)}</td>
          <td>${HTMLEscaper.escape(r.type)}</td>
          <td>${HTMLEscaper.escape(r.path)}</td>
          <td class="${r.status}">${HTMLEscaper.escape(r.status)}</td>
          <td>${HTMLEscaper.escape(r.message ?? '')}</td>
        </tr>`,
		);

		return HTMLEscaper.html`<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; }
    .meta { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    .rscore { font-size: 24px; font-weight: bold; color: ${result.rScore.combined >= 0.95 ? '#22c55e' : '#eab308'}; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 12px; border-bottom: 1px solid #ddd; }
    th { background: #f9fafb; font-weight: 600; }
    .ok { color: #22c55e; }
    .warning { color: #eab308; }
    .error { color: #ef4444; }
    .info { color: #3b82f6; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">
    <p><strong>Scan ID:</strong> ${scanId}</p>
    <p><strong>Duration:</strong> ${duration}</p>
    <p><strong>Timestamp:</strong> ${result.timestamp.toISOString()}</p>
    <p class="rscore"><strong>R-Score:</strong> ${rScore} (${tier})</p>
  </div>
  <h2>Toolchain Status</h2>
  <p>Available: ${HTMLEscaper.escape(result.toolchain.available.join(', ') || 'none')}</p>
  ${result.toolchain.missing.length > 0 ? HTMLEscaper.html`<p class="error">Missing: ${result.toolchain.missing.join(', ')}</p>` : ''}
  <h2>Results</h2>
  <table>
    <thead>
      <tr><th>ID</th><th>Type</th><th>Path</th><th>Status</th><th>Message</th></tr>
    </thead>
    <tbody>
      ${escapedResults.join('')}
    </tbody>
  </table>
</body>
</html>`;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Utilities
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Get performance tier from R-Score
	 */
	private getPerformanceTier(rScore: number): 'Critical' | 'Sub-Optimal' | 'Native-Grade' | 'Elite' {
		if (rScore >= 0.95) return 'Elite';
		if (rScore >= 0.9) return 'Native-Grade';
		if (rScore >= 0.7) return 'Sub-Optimal';
		return 'Critical';
	}

	/**
	 * Quick scan - validate toolchain only
	 */
	quickValidate(): {ok: boolean; missing: string[]} {
		const {missing} = this.resolver.validateToolchain(this.config.requiredTools);
		return {
			ok: missing.length === 0,
			missing,
		};
	}

	/**
	 * Get scanner R-Score metrics
	 */
	getMetrics(): {combined: number; components: Record<string, number>} {
		return calculateCombinedRScore();
	}
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Quick scan function - single project
 *
 * @param projectPath - Path to project
 * @param config - Optional scanner config
 * @returns Scan result
 */
export async function quickScan(projectPath: string, config?: EnhancedScannerConfig): Promise<EnhancedScanResult> {
	const scanner = new EnhancedScanner(config);
	return scanner.scan(projectPath);
}

/**
 * Validate toolchain only
 *
 * @param tools - Tools to check
 * @returns Validation results
 */
export function validateToolchain(tools: string[]): {
	available: string[];
	missing: string[];
	allPresent: boolean;
} {
	const resolver = new ExecutableResolver();
	const {available, missing} = resolver.validateToolchain(tools);
	return {
		available,
		missing,
		allPresent: missing.length === 0,
	};
}

/**
 * Generate a sortable scan ID
 *
 * @returns UUID v7 scan ID
 */
export function generateScanId(): string {
	return generateId('scan');
}

/**
 * Check if running with all optimizations available
 *
 * @returns Optimization status
 */
export function checkOptimizationStatus(): {
	bunVersion: string;
	apis: Record<string, boolean>;
	allAvailable: boolean;
} {
	const bunVersion = process.versions.bun ?? 'unknown';

	const apis = {
		which: typeof Bun.which === 'function',
		randomUUIDv7: typeof Bun.randomUUIDv7 === 'function',
		peek: typeof Bun.peek === 'function',
		openInEditor: typeof Bun.openInEditor === 'function',
		deepEquals: typeof Bun.deepEquals === 'function',
		escapeHTML: typeof Bun.escapeHTML === 'function',
	};

	return {
		bunVersion,
		apis,
		allAvailable: Object.values(apis).every(Boolean),
	};
}

// ============================================================================
// Re-exports for convenience
// ============================================================================

export {
	ExecutableResolver,
	MonotonicIDGenerator,
	PromiseOptimizer,
	EditorIntegration,
	EqualityChecker,
	HTMLEscaper,
	calculateCombinedRScore,
	which,
	generateId,
};
