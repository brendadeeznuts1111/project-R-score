// High-Frequency Sports Trading Configuration
// Extends the 13-byte config system for trading-specific needs

import { getConfig, updateConfig, setByte, toggleFeature } from '../core/config/manager.js';

// Trading-specific field mappings (reusing 13-byte structure)
export const TRADING_CONFIG = {
  // Reuse existing fields for trading purposes
  version: 0,           // Trading algorithm version
  registryHash: 1,      // Exchange connection ID  
  featureFlags: 2,      // Trading modes and risk limits
  terminalMode: 3,      // Market data feed type
  rows: 4,              // Max position size
  cols: 5               // Risk limit percentage
} as const;

// Trading feature flags (reusing feature flags bitmask)
export const TRADING_FEATURES = {
  ENABLE_AUTO_TRADING: 0x00000001,    // Automated trading enabled
  ENABLE_RISK_MANAGEMENT: 0x00000002, // Risk management active
  ENABLE_MARKET_MAKING: 0x00000004,   // Market making mode
  ENABLE_ARBITRAGE: 0x00000008,       // Arbitrage detection
  ENABLE_HEDGING: 0x00000010,         // Position hedging
  ENABLE_LIQUIDITY_MINING: 0x00000020 // Liquidity provision
} as const;

// Market data feed types (reusing terminal modes)
export const MARKET_DATA_FEEDS = {
  REAL_TIME: 0,        // Real-time market data
  DELAYED: 1,          // Delayed data (15s)
  SIMULATED: 2         // Simulation mode
} as const;

// Trading configuration interface
export interface TradingConfig {
  algorithmVersion: number;
  exchangeId: number;
  tradingFlags: number;
  marketDataFeed: number;
  maxPositionSize: number;
  riskLimitPercent: number;
}

// Get current trading configuration
export async function getTradingConfig(): Promise<TradingConfig> {
  const config = await getConfig();
  return {
    algorithmVersion: config.version,
    exchangeId: config.registryHash,
    tradingFlags: config.featureFlags,
    marketDataFeed: config.terminalMode,
    maxPositionSize: config.rows,
    riskLimitPercent: config.cols
  };
}

// Update trading configuration with validation
export async function updateTradingConfig(tradingConfig: Partial<TradingConfig>): Promise<void> {
  const updates: any = {};
  
  if (tradingConfig.algorithmVersion !== undefined) {
    if (tradingConfig.algorithmVersion < 0 || tradingConfig.algorithmVersion > 1) {
      throw new Error('Algorithm version must be 0 or 1');
    }
    updates.version = tradingConfig.algorithmVersion;
  }
  
  if (tradingConfig.exchangeId !== undefined) {
    if (tradingConfig.exchangeId < 0 || tradingConfig.exchangeId > 0xFFFFFFFF) {
      throw new Error('Exchange ID out of range');
    }
    updates.registryHash = tradingConfig.exchangeId;
  }
  
  if (tradingConfig.tradingFlags !== undefined) {
    if (tradingConfig.tradingFlags < 0 || tradingConfig.tradingFlags > 0x3F) {
      throw new Error('Trading flags out of range');
    }
    updates.featureFlags = tradingConfig.tradingFlags;
  }
  
  if (tradingConfig.marketDataFeed !== undefined) {
    if (tradingConfig.marketDataFeed < 0 || tradingConfig.marketDataFeed > 2) {
      throw new Error('Market data feed must be 0, 1, or 2');
    }
    updates.terminalMode = tradingConfig.marketDataFeed;
  }
  
  if (tradingConfig.maxPositionSize !== undefined) {
    if (tradingConfig.maxPositionSize < 1 || tradingConfig.maxPositionSize > 60) {
      throw new Error('Max position size must be between 1 and 60');
    }
    updates.rows = tradingConfig.maxPositionSize;
  }
  
  if (tradingConfig.riskLimitPercent !== undefined) {
    if (tradingConfig.riskLimitPercent < 1 || tradingConfig.riskLimitPercent > 120) {
      throw new Error('Risk limit must be between 1% and 120%');
    }
    updates.cols = tradingConfig.riskLimitPercent;
  }
  
  await updateConfig(updates);
}

// Enable/disable trading features using existing config system
export async function setTradingFeature(feature: keyof typeof TRADING_FEATURES, enabled: boolean): Promise<void> {
  const flagValue = TRADING_FEATURES[feature];
  
  // Get current config
  const config = await getConfig();
  let newFlags = config.featureFlags;
  
  if (enabled) {
    newFlags |= flagValue; // Set the bit
  } else {
    newFlags &= ~flagValue; // Clear the bit
  }
  
  // Update with new flags
  await updateConfig({ featureFlags: newFlags });
}

// Check if trading feature is enabled
export async function isTradingFeatureEnabled(feature: keyof typeof TRADING_FEATURES): Promise<boolean> {
  const config = await getConfig();
  return (config.featureFlags & TRADING_FEATURES[feature]) !== 0;
}

// Get risk management settings
export async function getRiskSettings(): Promise<{ maxPosition: number; riskPercent: number }> {
  const config = await getTradingConfig();
  return {
    maxPosition: config.maxPositionSize,
    riskPercent: config.riskLimitPercent
  };
}

// Initialize trading configuration with defaults
export async function initializeTradingConfig(): Promise<void> {
  await updateTradingConfig({
    algorithmVersion: 1,
    exchangeId: 0x12345678,
    tradingFlags: TRADING_FEATURES.ENABLE_AUTO_TRADING | TRADING_FEATURES.ENABLE_RISK_MANAGEMENT,
    marketDataFeed: MARKET_DATA_FEEDS.REAL_TIME,
    maxPositionSize: 10,
    riskLimitPercent: 5
  });
}

// Performance metrics for trading operations
export interface TradingMetrics {
  configUpdateTime: number;  // ns
  featureCheckTime: number;  // ns
  riskCheckTime: number;     // ns
}

// Measure trading configuration performance
export async function measureTradingPerformance(): Promise<TradingMetrics> {
  const iterations = 1000;
  
  // Measure config update time
  const updateStart = Bun.nanoseconds();
  for (let i = 0; i < iterations; i++) {
    await setByte('rows', i % 60 + 1);
  }
  const updateTime = (Bun.nanoseconds() - updateStart) / iterations;
  
  // Measure feature check time
  const featureStart = Bun.nanoseconds();
  for (let i = 0; i < iterations; i++) {
    await isTradingFeatureEnabled('ENABLE_AUTO_TRADING');
  }
  const featureTime = (Bun.nanoseconds() - featureStart) / iterations;
  
  // Measure risk check time
  const riskStart = Bun.nanoseconds();
  for (let i = 0; i < iterations; i++) {
    await getRiskSettings();
  }
  const riskTime = (Bun.nanoseconds() - riskStart) / iterations;
  
  return {
    configUpdateTime: Math.round(updateTime),
    featureCheckTime: Math.round(featureTime),
    riskCheckTime: Math.round(riskTime)
  };
}
