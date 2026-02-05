#!/usr/bin/env bun

// T3-Lattice Market Microstructure Analysis
// Advanced VPIN, order flow, whale tracking, and dark pool intelligence
// Institutional-grade market analysis for edge detection

// Internal Types for Microstructure Analysis
type TradeSide = 'buy' | 'sell' | 'neutral';

interface VolumeClassifierResult {
  buyVolume: number;
  sellVolume: number;
  totalVolume: number;
}

interface MicrostructureConfig {
  bucketSize?: number;
  windowSize?: number;
  imbalanceThreshold?: number;
}

// Helper function for volume classification with state-aware tick test
function classifyVolume(
  prices: number[],
  volumes?: number[]
): VolumeClassifierResult {
  const n = prices.length;
  const volumeData = volumes || prices.map((_, i) =>
    i > 0 ? Math.abs(prices[i] - prices[i-1]) * 100 : 100
  );

  let buyVolume = 0;
  let sellVolume = 0;
  let lastSide: TradeSide = 'neutral';

  for (let i = 1; i < n; i++) {
    const priceChange = prices[i] - prices[i-1];
    const volume = volumeData[i];

    // State-aware tick test: handle zero-change ticks using previous side
    if (priceChange > 0) {
      buyVolume += volume;
      lastSide = 'buy';
    } else if (priceChange < 0) {
      sellVolume += volume;
      lastSide = 'sell';
    } else {
      // Zero-change tick: use previous side if available
      if (lastSide === 'buy') {
        buyVolume += volume;
      } else if (lastSide === 'sell') {
        sellVolume += volume;
      }
      // If lastSide is 'neutral', skip this tick (no volume assigned)
    }
  }

  return {
    buyVolume,
    sellVolume,
    totalVolume: buyVolume + sellVolume
  };
}

// VPIN (Volume-Synchronized Probability of Informed Trading) Calculator
export function calculateVPIN(prices: number[], volumes?: number[]): number {
  const n = prices.length;
  if (n < 10) return 0.5; // Default neutral VPIN

  const { buyVolume, sellVolume, totalVolume } = classifyVolume(prices, volumes);

  if (totalVolume === 0) return 0.5;
  return Math.abs(buyVolume - sellVolume) / totalVolume;
}

// Price Impact Analysis
function calculatePriceImpact(prices: number[], volumes?: number[]): number {
  if (prices.length < 10) return 0;

  const volumeData = volumes || prices.map(() => 1);
  let totalImpact = 0;
  let totalVolume = 0;

  for (let i = 1; i < prices.length; i++) {
    const return_ = Math.abs(prices[i] - prices[i-1]) / prices[i-1];
    const volume = volumeData[i];

    totalImpact += return_ * volume;
    totalVolume += volume;
  }

  return totalVolume > 0 ? totalImpact / totalVolume : 0;
}

// Bid-Ask Spread Estimation
function estimateSpread(prices: number[]): number {
  if (prices.length < 5) return 0.01; // Default 1% spread

  // Estimate spread using price volatility
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push(Math.abs(prices[i] - prices[i-1]) / prices[i-1]);
  }

  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const volatility = Math.sqrt(
    returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length
  );

  // Spread typically correlates with volatility
  return Math.max(0.001, Math.min(0.05, volatility * 0.1));
}

// Order Flow Imbalance Analysis with adaptive thresholds
function calculateOrderImbalance(prices: number[], windowSize = 20): number {
  if (prices.length < windowSize) return 0.5;

  let buyOrders = 0;
  let sellOrders = 0;

  // Use estimated spread for adaptive thresholds
  const spread = estimateSpread(prices);
  const buyThreshold = 1 + (spread * 0.5); // Adaptive upward threshold
  const sellThreshold = 1 - (spread * 0.5); // Adaptive downward threshold

  // Analyze price movements for order flow
  for (let i = windowSize; i < prices.length; i++) {
    const recentPrices = prices.slice(i - windowSize, i);
    const currentPrice = prices[i];
    const avgPrice = recentPrices.reduce((a, b) => a + b, 0) / windowSize;

    if (currentPrice > avgPrice * buyThreshold) { // Adaptive upward movement
      buyOrders++;
    } else if (currentPrice < avgPrice * sellThreshold) { // Adaptive downward movement
      sellOrders++;
    }
  }

  const totalOrders = buyOrders + sellOrders;
  if (totalOrders === 0) return 0.5;

  return buyOrders / totalOrders;
}

// Volume Ratio Analysis (Buy vs Sell Volume)
function calculateVolumeRatio(prices: number[]): number {
  if (prices.length < 10) return 1.0;

  // Use the shared volume classification helper
  const { buyVolume, sellVolume } = classifyVolume(prices);

  if (sellVolume === 0) return buyVolume > 0 ? 2.0 : 1.0;
  return buyVolume / sellVolume;
}

// Liquidity Analysis
function calculateLiquidity(prices: number[]): number {
  if (prices.length < 20) return 0.5;

  // Liquidity proxy: inverse of price volatility and spread
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push(Math.abs(prices[i] - prices[i-1]) / prices[i-1]);
  }

  const volatility = returns.reduce((a, b) => a + b, 0) / returns.length;
  const spread = estimateSpread(prices);

  // Higher liquidity = lower volatility and spread
  const liquidityScore = Math.max(0, 1 - (volatility * 10 + spread * 20));
  return Math.max(0, Math.min(1, liquidityScore));
}

// Whale Activity Detection
function detectWhaleActivity(prices: number[], threshold = 100000): WhaleActivity[] {
  const activities: WhaleActivity[] = [];
  const minOrderSize = prices[0] * 0.01; // 1% of current price

  for (let i = 1; i < prices.length; i++) {
    const priceChange = Math.abs(prices[i] - prices[i-1]);
    const estimatedVolume = priceChange * 10000; // Volume estimation

    if (estimatedVolume > threshold) {
      activities.push({
        timestamp: Date.now() - (prices.length - i) * 1000,
        price: prices[i],
        volume: estimatedVolume,
        type: priceChange > 0 ? 'buy' : 'sell',
        impact: priceChange / prices[i-1]
      });
    }
  }

  return activities;
}

// Dark Pool Detection
function detectDarkPoolActivity(prices: number[]): DarkPoolSignal[] {
  const signals: DarkPoolSignal[] = [];

  if (prices.length < 50) return signals;

  // Look for unusual price movements without corresponding volume
  for (let i = 10; i < prices.length; i++) {
    const window = prices.slice(i - 10, i);
    const currentPrice = prices[i];
    const avgPrice = window.reduce((a, b) => a + b, 0) / window.length;
    const deviation = Math.abs(currentPrice - avgPrice) / avgPrice;

    if (deviation > 0.02) { // 2% deviation
      signals.push({
        timestamp: Date.now() - (prices.length - i) * 1000,
        price: currentPrice,
        deviation: deviation,
        confidence: Math.min(1.0, deviation * 10)
      });
    }
  }

  return signals;
}

// Market Quality Score
function calculateMarketQuality(prices: number[]): number {
  if (prices.length < 20) return 0.5;

  const volatility = calculatePriceImpact(prices);
  const liquidity = calculateLiquidity(prices);
  const spread = estimateSpread(prices);

  // Market quality = liquidity - volatility - spread
  const qualityScore = liquidity - (volatility * 2) - (spread * 10);
  return Math.max(0, Math.min(1, (qualityScore + 1) / 2));
}

// Slippage Prediction
function predictSlippage(prices: number[], orderSize: number): number {
  if (prices.length < 10) return 0;

  const volatility = calculatePriceImpact(prices);
  const liquidity = calculateLiquidity(prices);

  // Slippage increases with order size and decreases with liquidity
  const baseSlippage = volatility * 0.1;
  const sizeImpact = Math.min(0.1, orderSize / 1000000); // Assume 1M is large
  const liquidityAdjustment = (1 - liquidity) * 0.05;

  return baseSlippage + sizeImpact + liquidityAdjustment;
}

// Main Market Microstructure Analysis Function
export function analyzeMarketMicrostructure(prices: number[]): MarketMicrostructureAnalysis {
  const latestPrice = prices[prices.length - 1];

  return {
    timestamp: Date.now(),
    latestPrice,
    vpin: calculateVPIN(prices),
    orderImbalance: calculateOrderImbalance(prices),
    priceImpact: calculatePriceImpact(prices),
    spread: estimateSpread(prices),
    volumeRatio: calculateVolumeRatio(prices),
    liquidity: calculateLiquidity(prices),
    marketQuality: calculateMarketQuality(prices),
    slippage: predictSlippage(prices, 10000), // Default order size
    whaleActivity: detectWhaleActivity(prices),
    darkPoolSignals: detectDarkPoolActivity(prices)
  };
}

// Interfaces
export interface MarketMicrostructureAnalysis {
  timestamp: number;
  latestPrice: number;
  vpin: number; // Volume-synchronized PIN
  orderImbalance: number; // Buy vs sell pressure
  priceImpact: number; // Price movement per volume unit
  spread: number; // Bid-ask spread estimate
  volumeRatio: number; // Buy volume / sell volume
  liquidity: number; // Market liquidity score (0-1)
  marketQuality: number; // Overall market quality (0-1)
  slippage: number; // Expected slippage for orders
  whaleActivity: WhaleActivity[];
  darkPoolSignals: DarkPoolSignal[];
}

export interface WhaleActivity {
  timestamp: number;
  price: number;
  volume: number;
  type: 'buy' | 'sell';
  impact: number;
}

export interface DarkPoolSignal {
  timestamp: number;
  price: number;
  deviation: number;
  confidence: number;
}

// Utility functions for advanced analysis
export function getMicrostructureRegime(analysis: MarketMicrostructureAnalysis): string {
  const { vpin, orderImbalance, liquidity, marketQuality } = analysis;

  if (vpin > 0.8 && liquidity < 0.3) return 'high_informed_trading';
  if (orderImbalance > 0.7) return 'strong_buy_pressure';
  if (orderImbalance < 0.3) return 'strong_sell_pressure';
  if (marketQuality > 0.8) return 'high_quality_liquid';
  if (marketQuality < 0.3) return 'low_quality_illiquid';

  return 'balanced_market';
}

export function calculateEdgeProbability(analysis: MarketMicrostructureAnalysis, fd: number, hurst: number): number {
  // Combine microstructure signals with fractal analysis
  let edgeScore = 0;

  // VPIN contribution (lower VPIN = less informed trading = better edge)
  edgeScore += (1 - analysis.vpin) * 0.3;

  // Order imbalance contribution (balanced = better edge)
  const imbalanceBalance = 1 - Math.abs(analysis.orderImbalance - 0.5) * 2;
  edgeScore += imbalanceBalance * 0.2;

  // Liquidity contribution (higher liquidity = better edge)
  edgeScore += analysis.liquidity * 0.2;

  // Market quality contribution
  edgeScore += analysis.marketQuality * 0.15;

  // Fractal regime contribution
  const fractalScore = (fd >= 1.4 && fd <= 1.6 && hurst >= 0.45 && hurst <= 0.55) ? 1 : 0.5;
  edgeScore += fractalScore * 0.15;

  return Math.max(0, Math.min(1, edgeScore));
}
