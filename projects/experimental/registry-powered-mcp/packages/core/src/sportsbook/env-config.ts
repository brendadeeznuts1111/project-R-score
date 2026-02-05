/**
 * Exchange Environment Configuration
 * Loads exchange handler settings from environment variables
 *
 * Environment Variables:
 * - EXCHANGE_ENABLED: Enable/disable exchange (default: true)
 * - EXCHANGE_MOCK_MODE: Enable mock data generation (default: true in dev)
 * - EXCHANGE_MOCK_INTERVAL_MS: Mock update interval (default: 100)
 * - EXCHANGE_MOCK_MARKETS_COUNT: Number of mock markets (default: 10)
 * - EXCHANGE_HEARTBEAT_INTERVAL_MS: Heartbeat interval (default: 5000)
 * - EXCHANGE_ENABLE_RISK_ALERTS: Enable risk alerts (default: true)
 * - EXCHANGE_ENABLE_ARBITRAGE_ALERTS: Enable arbitrage alerts (default: true)
 * - EXCHANGE_ENABLE_PROPAGATION: Enable propagation tracking (default: true)
 * - EXCHANGE_ENABLE_PATTERN_ALERTS: Enable pattern detection alerts (default: true)
 */

import { type ExchangeHandlerConfig, DEFAULT_EXCHANGE_CONFIG } from './exchange-handler';

/**
 * Parse boolean from environment variable
 */
function parseEnvBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === '') return defaultValue;
  const lower = value.toLowerCase();
  return lower === 'true' || lower === '1' || lower === 'yes';
}

/**
 * Parse integer from environment variable
 */
function parseEnvInt(value: string | undefined, defaultValue: number): number {
  if (value === undefined || value === '') return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Check if exchange is enabled via environment
 */
export function isExchangeEnabled(): boolean {
  return parseEnvBool(Bun.env.EXCHANGE_ENABLED, true);
}

/**
 * Load exchange configuration from environment variables
 * Falls back to defaults for any unset values
 */
export function loadExchangeConfig(): ExchangeHandlerConfig {
  const isDev = Bun.env.NODE_ENV !== 'production';
  const enabled = isExchangeEnabled();

  return {
    enabled,
    mockMode: parseEnvBool(
      Bun.env.EXCHANGE_MOCK_MODE,
      isDev ? DEFAULT_EXCHANGE_CONFIG.mockMode : false
    ),
    mockIntervalMs: parseEnvInt(
      Bun.env.EXCHANGE_MOCK_INTERVAL_MS,
      DEFAULT_EXCHANGE_CONFIG.mockIntervalMs
    ),
    mockMarketsCount: parseEnvInt(
      Bun.env.EXCHANGE_MOCK_MARKETS_COUNT,
      DEFAULT_EXCHANGE_CONFIG.mockMarketsCount
    ),
    heartbeatIntervalMs: parseEnvInt(
      Bun.env.EXCHANGE_HEARTBEAT_INTERVAL_MS,
      DEFAULT_EXCHANGE_CONFIG.heartbeatIntervalMs
    ),
    enableRiskAlerts: parseEnvBool(
      Bun.env.EXCHANGE_ENABLE_RISK_ALERTS,
      DEFAULT_EXCHANGE_CONFIG.enableRiskAlerts
    ),
    enableArbitrageAlerts: parseEnvBool(
      Bun.env.EXCHANGE_ENABLE_ARBITRAGE_ALERTS,
      DEFAULT_EXCHANGE_CONFIG.enableArbitrageAlerts
    ),
    enablePropagation: parseEnvBool(
      Bun.env.EXCHANGE_ENABLE_PROPAGATION,
      DEFAULT_EXCHANGE_CONFIG.enablePropagation
    ),
    enablePatternAlerts: parseEnvBool(
      Bun.env.EXCHANGE_ENABLE_PATTERN_ALERTS,
      DEFAULT_EXCHANGE_CONFIG.enablePatternAlerts
    ),
  };
}

/**
 * Get exchange config summary for logging
 */
export function getExchangeConfigSummary(): string {
  const config = loadExchangeConfig();
  const enabled = isExchangeEnabled();

  if (!enabled) {
    return 'Exchange: DISABLED';
  }

  const mode = config.mockMode ? 'MOCK' : 'LIVE';
  const features = [
    config.enableRiskAlerts ? 'risk-alerts' : null,
    config.enableArbitrageAlerts ? 'arb-alerts' : null,
    config.enablePropagation ? 'propagation' : null,
    config.enablePatternAlerts ? 'pattern-alerts' : null,
  ].filter(Boolean).join(', ');

  return `Exchange: ${mode} mode, ${config.mockMarketsCount} markets, ${config.heartbeatIntervalMs}ms heartbeat [${features}]`;
}

/**
 * Validate exchange configuration
 * Returns array of warning messages for invalid values
 */
export function validateExchangeConfig(): string[] {
  const warnings: string[] = [];
  const config = loadExchangeConfig();

  if (config.mockIntervalMs < 10) {
    warnings.push(`EXCHANGE_MOCK_INTERVAL_MS=${config.mockIntervalMs} is very low, may cause high CPU usage`);
  }

  if (config.mockIntervalMs > 10000) {
    warnings.push(`EXCHANGE_MOCK_INTERVAL_MS=${config.mockIntervalMs} is very high, updates will be slow`);
  }

  if (config.mockMarketsCount < 1) {
    warnings.push(`EXCHANGE_MOCK_MARKETS_COUNT=${config.mockMarketsCount} is invalid, using minimum of 1`);
  }

  if (config.mockMarketsCount > 100) {
    warnings.push(`EXCHANGE_MOCK_MARKETS_COUNT=${config.mockMarketsCount} is high, may impact performance`);
  }

  if (config.heartbeatIntervalMs < 1000) {
    warnings.push(`EXCHANGE_HEARTBEAT_INTERVAL_MS=${config.heartbeatIntervalMs} is very low, may flood clients`);
  }

  if (!config.mockMode && Bun.env.NODE_ENV !== 'production') {
    warnings.push('EXCHANGE_MOCK_MODE=false in non-production environment - ensure real feed is available');
  }

  return warnings;
}
