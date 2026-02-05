/**
 * @fileoverview 1.1.1.1.1.1.3.2-3: Shadow-Graph Constants
 * @description Constants for shadow-graph detection thresholds
 * @module arbitrage/shadow-graph/constants
 */

/**
 * 1.1.1.1.1.1.3.2: Lag-Threshold Constant (30 seconds)
 * Maximum acceptable lag between UI and API visibility
 */
export const LAG_THRESHOLD_SECONDS = 30;

/**
 * 1.1.1.1.1.1.3.3: Deviation-Threshold Constant (0.3)
 * Maximum acceptable deviation from expected correlation
 */
export const DEVIATION_THRESHOLD = 0.3;

/**
 * Minimum arbitrage profit percentage to consider
 */
export const MIN_ARB_PROFIT = 0.01; // 1%

/**
 * Minimum liquidity capacity required (in base currency)
 */
export const MIN_LIQUIDITY_CAPACITY = 100;

/**
 * Maximum arbitrage window duration (ms)
 */
export const MAX_ARB_WINDOW_MS = 60000; // 60 seconds

/**
 * Micro-bet probe amount (smallest test bet size)
 */
export const MICRO_BET_AMOUNT = 1;

/**
 * Correlation significance threshold (p-value)
 */
export const CORRELATION_SIGNIFICANCE_THRESHOLD = 0.05;
