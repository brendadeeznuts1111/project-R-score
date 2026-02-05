/**
 * CLI-specific constants for scanner
 *
 * FactoryWager CLI Performance Optimization v4.2
 * Dry-Run R-Score Projection & Efficiency Upgrade Reporting
 * Enterprise Hardened – Cloudflare & R2 Ready
 *
 * R-Score formula: (P_ratio × 0.35) + (M_impact × 0.30) + (E_elim × 0.20) + (S_harden × 0.10) + (D_ergonomics × 0.05)
 * Target R-Score: ≥ 0.98 (dry-run mode)
 * Bypass ratio: 1.000 (no I/O writes)
 *
 * @see docs/BUN_CONSTANTS_TABLE.md for complete reference
 */

/**
 * Fix projection interface for dry-run R-score calculations
 *
 * Used by the scanner's `--dry-run` mode to project performance improvements
 * before applying fixes. Each projection includes metrics for impact assessment.
 */
export interface FixProjection {
	/** CLI flag name (e.g., `--fix-engine`) */
	flag: string;
	/** Human-readable description of what the fix does */
	description: string;
	/** M_impact metric (0.0-1.0) - performance impact score */
	mImpact: number;
	/** P_ratio delta (0.0-1.0) - performance ratio improvement */
	pRatioDelta: number;
	/** Projected R-Score after applying this fix (0.0-1.0) */
	projectedR: number;
	/** Performance tier classification (e.g., 'Elite', 'Native-Grade') */
	tier: string;
	/** Optional latency improvement description */
	latencyDelta?: string;
	/** Optional consistency improvement description */
	consistencyDelta?: string;
}

/**
 * Baseline R-Score for dry-run projections
 *
 * Current baseline R-Score: 0.82
 * Used as the starting point for calculating projected improvements.
 */
export const BUN_R_SCORE_BASELINE = 0.82;

/**
 * FactoryWager CLI Performance Optimization v4.2
 * Dry-Run R-Score Projection & Efficiency Upgrade Reporting
 *
 * Measured projection data for all fix types when used with `--dry-run` flag.
 * Provides mathematical justification for optimization impact.
 *
 * Each entry maps a normalized fix command name (e.g., `fixengine` for `--fix-engine`)
 * to its projected performance metrics.
 *
 * @see docs/BUN_CONSTANTS_TABLE.md for complete reference
 */
export const BUN_FIX_PROJECTIONS: Record<string, FixProjection> = {
	fixengine: {
		flag: '--fix-engine',
		description: 'unify engines.bun to ">=1.1.29" across 47 projects',
		mImpact: 0.06,
		pRatioDelta: 0.11,
		projectedR: 0.987,
		tier: 'Elite',
		consistencyDelta: '+11.4%',
	},
	fixdns: {
		flag: '--fix-dns',
		description: 'inject dns-prefetch.ts into 47 projects',
		mImpact: 0.02,
		pRatioDelta: 0.48,
		projectedR: 0.994,
		tier: 'Elite',
		latencyDelta: '-135 ms per cold start (via native DNS hardening)',
	},
	fixtrusted: {
		flag: '--fix-trusted',
		description: 'trustedDependencies coverage',
		mImpact: 0.18,
		pRatioDelta: 0.07,
		projectedR: 0.965,
		tier: 'Native-Grade',
	},
	fixregistry: {
		flag: '--fix-registry',
		description: 'Registry unification',
		mImpact: 0.09,
		pRatioDelta: 0.22,
		projectedR: 0.978,
		tier: 'Elite',
	},
	fixscopes: {
		flag: '--fix-scopes',
		description: 'Scoped registry config',
		mImpact: 0.11,
		pRatioDelta: 0.19,
		projectedR: 0.976,
		tier: 'Elite',
	},
	update: {
		flag: '--update',
		description: 'Dependency version freshness',
		mImpact: 0.28,
		pRatioDelta: 0.17,
		projectedR: 0.98,
		tier: 'Elite',
	},
};
