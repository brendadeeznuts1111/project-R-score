#!/usr/bin/env bun

// Enhanced Edge Detection Engine - T3-Lattice v3.4
// VPIN-Integrated edge detection with quantum-resilient operations
// Combines fractal dimension, Hurst analysis, and VPIN for superior edge detection

import { FD_THRESHOLDS, PERSONA_CONFIG } from "../persona-config.ts";
import { computeFractalDimension } from "./fractal-dimension.ts";
import { computeHurstExponent } from "./hurst-exponent.ts";

export interface MarketFeed {
  marketId: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  oddsTrajectory: Float64Array;
  volumeProfile: Float64Array;
  publicBettingPercent: number;
  timestamp: number;
  oddsTicks: OddsTick[]; // Real-time tick data for VPIN analysis
}

export interface LatticeEdge {
  id: string;
  market: string;
  fd: number;
  hurst: number;
  glyph: string;
  edge: string;
  confidence: number;
  requiresReview: boolean;
  quantumLogId: string;
  timestamp: number;
  computationMs: number;
  vpinAnalysis?: VPINAnalysis; // VPIN integration
  enhancedConfidence: number; // VPIN-enhanced confidence score
  marketQualityScore: number; // Overall market quality (0-100)
  executionRecommendation: "execute" | "wait" | "abort";
}

// Enhanced Edge Detection with VPIN Integration
export async function detectHiddenEdge(
  feed: MarketFeed,
  historicalContext?: Float64Array
): Promise<LatticeEdge | null> {
  const start = performance.now();
  const microstructureAnalyzer = new MarketMicrostructureAnalyzer();

  try {
    // Parallel computation of FD, Hurst, and VPIN for performance
    const [fdResult, hurstResult, vpinAnalysis] = await Promise.all([
      computeFractalDimension(feed.oddsTrajectory, {
        method: "box_counting",
        resolution: 1000,
      }),
      computeHurstExponent(feed.oddsTrajectory),
      // VPIN analysis if tick data is available
      feed.oddsTicks.length > 0
        ? Promise.resolve(
            microstructureAnalyzer.analyzeMarket(feed.oddsTicks, feed.marketId)
          )
        : Promise.resolve(createDefaultVPINAnalysis()),
    ]);

    // Black swan detection and alerting (FD > 2.3 triggers)
    if (fdResult.value > FD_THRESHOLDS.blackSwan) {
      await triggerBlackSwanAlert(feed, fdResult);
    }

    // Calculate VPIN-enhanced edge confidence
    const edgeConfidence = calculateEnhancedEdgeConfidence(
      fdResult,
      hurstResult,
      vpinAnalysis,
      feed.publicBettingPercent
    );

    // Only return edges above confidence threshold (97.8/100 grade target)
    if (edgeConfidence < PERSONA_CONFIG.benchmarks.edgeDetectionAccuracy) {
      return null;
    }

    // Extract the specific edge recommendation with VPIN insights
    const edge = extractEnhancedEdgeRecommendation(
      fdResult,
      hurstResult,
      vpinAnalysis,
      feed
    );

    // Calculate market quality score
    const marketQualityScore = calculateMarketQualityScore(
      fdResult,
      hurstResult,
      vpinAnalysis
    );

    // Determine execution recommendation based on VPIN regime
    const executionRecommendation = determineExecutionRecommendation(
      vpinAnalysis,
      edgeConfidence
    );

    // Create quantum audit trail
    const quantumLogId = await createQuantumAuditLog({
      type: "VPIN_ENHANCED_EDGE_DETECTED",
      market: feed.marketId,
      fd: fdResult.value,
      hurst: hurstResult.value,
      vpin: vpinAnalysis.vpin,
      glyph: fdResult.glyph,
      confidence: edgeConfidence,
      marketQuality: marketQualityScore,
      timestamp: Date.now(),
    });

    const computationMs = performance.now() - start;

    return {
      id: Bun.randomUUIDv7(),
      market: feed.marketId,
      fd: fdResult.value,
      hurst: hurstResult.value,
      glyph: fdResult.glyph,
      edge: edge,
      confidence: edgeConfidence,
      requiresReview:
        fdResult.value > FD_THRESHOLDS.blackSwan || vpinAnalysis.vpin > 0.5,
      quantumLogId,
      timestamp: Date.now(),
      computationMs,
      vpinAnalysis,
      enhancedConfidence: edgeConfidence,
      marketQualityScore,
      executionRecommendation,
    };
  } catch (error) {
    console.error(
      `VPIN-enhanced edge detection failed for market ${feed.marketId}:`,
      error
    );
    return null;
  }
}

// VPIN-Enhanced Edge Confidence Calculation
function calculateEnhancedEdgeConfidence(
  fd: { value: number; confidence: number },
  hurst: { value: number; confidence: number },
  vpin: VPINAnalysis,
  publicBettingPercent: number
): number {
  // Base confidence from FD analysis
  const fdConfidence =
    fd.value < FD_THRESHOLDS.persistent
      ? 1 - Math.abs(fd.value - FD_THRESHOLDS.persistent) / 2
      : 0.7;

  // Hurst adjustment for trend persistence
  const hurstAdjustment = Math.abs(hurst.value - 0.6) < 0.2 ? 0.1 : -0.1;

  // VPIN enhancement (lower VPIN = less informed trading = better edge)
  const vpinEnhancement =
    vpin.vpin < 0.3 ? 0.15 : vpin.vpin < 0.4 ? 0.05 : -0.1;

  // Market quality boost
  const marketQualityBoost = vpin.marketQualityScore > 70 ? 0.1 : 0;

  // Public betting contrarian edge
  const publicEdge =
    publicBettingPercent > 0.75 || publicBettingPercent < 0.25 ? 0.08 : 0;

  // Data quality adjustment
  const qualityMultiplier =
    (fd.confidence + hurst.confidence + vpin.confidence) / 3;

  const rawConfidence = Math.min(
    1.0,
    fdConfidence +
      hurstAdjustment +
      vpinEnhancement +
      marketQualityBoost +
      publicEdge
  );

  return rawConfidence * qualityMultiplier;
}

// Enhanced Edge Recommendation with VPIN Insights
function extractEnhancedEdgeRecommendation(
  fd: { glyph: string; value: number },
  hurst: { value: number },
  vpin: VPINAnalysis,
  feed: MarketFeed
): string {
  const patterns: Record<
    string,
    (feed: MarketFeed, vpin: VPINAnalysis) => string
  > = {
    "▵⟂⥂": (feed, vpin) =>
      `Fade public on ${feed.awayTeam} +4.5 - VPIN: ${vpin.vpin.toFixed(3)} (${
        vpin.regime
      }) - structural drift detected`,
    "⥂⟂(▵⟜⟳)": (feed, vpin) =>
      `Back over total in chaotic market - VPIN: ${vpin.vpin.toFixed(
        3
      )} - volatility spike opportunity`,
    "⟳⟲⟜(▵⊗⥂)": (feed, vpin) =>
      `Black swan reversal detected - VPIN: ${vpin.vpin.toFixed(
        3
      )} - fade sharp money on ${feed.homeTeam}`,
    "(▵⊗⥂)⟂⟳": (feed, vpin) =>
      `Arbitrage opportunity: line movement imminent - VPIN: ${vpin.vpin.toFixed(
        3
      )} on ${feed.marketId}`,
    "⊟": (feed, vpin) =>
      `Mean reversion entry - VPIN: ${vpin.vpin.toFixed(
        3
      )} - expect bounce back to ${feed.sport} average`,
  };

  const patternFn = patterns[fd.glyph as keyof typeof patterns];
  if (patternFn) {
    return patternFn(feed, vpin);
  }

  // VPIN-aware fallback analysis
  if (vpin.vpin > 0.4) {
    return `High VPIN (${vpin.vpin.toFixed(3)}) - avoid ${
      feed.marketId
    } due to informed trading activity`;
  } else if (
    vpin.vpin < 0.3 &&
    fd.value > FD_THRESHOLDS.persistent &&
    hurst.value > 0.6
  ) {
    return `Strong trending market with low VPIN (${vpin.vpin.toFixed(
      3
    )}) - follow momentum on ${feed.homeTeam}`;
  } else if (
    vpin.vpin < 0.3 &&
    fd.value < FD_THRESHOLDS.meanReversion &&
    hurst.value < 0.4
  ) {
    return `Anti-persistent market with low VPIN (${vpin.vpin.toFixed(
      3
    )}) - expect reversals on ${feed.awayTeam}`;
  } else {
    return `VPIN-enhanced analysis required for ${
      feed.marketId
    } - VPIN: ${vpin.vpin.toFixed(3)}`;
  }
}

// Market Quality Score Calculation
function calculateMarketQualityScore(
  fd: { value: number },
  hurst: { value: number },
  vpin: VPINAnalysis
): number {
  // Base score from VPIN (lower is better)
  let score = (1 - vpin.vpin) * 40;

  // FD stability bonus
  if (fd.value >= 1.4 && fd.value <= 1.6) {
    score += 20; // Stable fractal dimension
  }

  // Hurst exponent bonus
  if (hurst.value >= 0.45 && hurst.value <= 0.55) {
    score += 15; // Balanced persistence
  }

  // Order flow balance bonus
  const orderFlowBalance = 1 - Math.abs(vpin.orderFlowImbalance);
  score += orderFlowBalance * 15;

  // Volume consistency bonus
  score += vpin.confidence * 10;

  return Math.max(0, Math.min(100, score));
}

// Execution Recommendation based on VPIN and Edge Confidence
function determineExecutionRecommendation(
  vpin: VPINAnalysis,
  edgeConfidence: number
): "execute" | "wait" | "abort" {
  // Trust VPIN's execution recommendation first
  if (vpin.executionRecommendation === "abort") {
    return "abort";
  } else if (vpin.executionRecommendation === "wait") {
    // But override with high confidence
    if (edgeConfidence > 0.95) {
      return "execute";
    }
    return "wait";
  } else {
    // VPIN says execute, but check edge confidence
    return edgeConfidence > 0.85 ? "execute" : "wait";
  }
}

// Default VPIN Analysis for fallback
function createDefaultVPINAnalysis(): VPINAnalysis {
  return {
    vpin: 0.3, // Default low VPIN
    informedProbability: 0.3,
    orderFlowImbalance: 0,
    bucketAnalysis: [],
    regime: "low_informed",
    confidence: 0.5,
    executionRecommendation: "execute",
    whaleAlert: false,
    computationTimeNs: 0,
  };
}

function calculateEdgeConfidence(
  fd: { value: number; confidence: number },
  hurst: { value: number; confidence: number },
  publicBettingPercent: number
): number {
  // Base confidence from FD analysis
  const fdConfidence =
    fd.value < FD_THRESHOLDS.persistent
      ? 1 - Math.abs(fd.value - FD_THRESHOLDS.persistent) / 2
      : 0.7;

  // Hurst adjustment for trend persistence
  const hurstAdjustment = Math.abs(hurst.value - 0.6) < 0.2 ? 0.1 : -0.1;

  // Public betting contrarian edge
  // Extreme public positioning often indicates edge opportunities
  const publicEdge =
    publicBettingPercent > 0.75 || publicBettingPercent < 0.25 ? 0.08 : 0;

  // Data quality adjustment
  const qualityMultiplier = (fd.confidence + hurst.confidence) / 2;

  const rawConfidence = Math.min(
    1.0,
    fdConfidence + hurstAdjustment + publicEdge
  );
  return rawConfidence * qualityMultiplier;
}

function extractEdgeRecommendation(
  fd: { glyph: string; value: number },
  hurst: { value: number },
  feed: MarketFeed
): string {
  const patterns: Record<string, (feed: MarketFeed) => string> = {
    "▵⟂⥂": (feed) =>
      `Fade public on ${feed.awayTeam} +4.5 - structural drift detected`,
    "⥂⟂(▵⟜⟳)": (feed) =>
      `Back over total in chaotic market - volatility spike opportunity`,
    "⟳⟲⟜(▵⊗⥂)": (feed) =>
      `Black swan reversal detected - fade sharp money on ${feed.homeTeam}`,
    "(▵⊗⥂)⟂⟳": (feed) =>
      `Arbitrage opportunity: line movement imminent on ${feed.marketId}`,
    "⊟": (feed) =>
      `Mean reversion entry - expect bounce back to ${feed.sport} average`,
  };

  const patternFn = patterns[fd.glyph as keyof typeof patterns];
  if (patternFn) {
    return patternFn(feed);
  }

  // Fallback analysis based on FD and Hurst values
  if (fd.value > FD_THRESHOLDS.persistent && hurst.value > 0.6) {
    return `Strong trending market - follow momentum on ${feed.homeTeam}`;
  } else if (fd.value < FD_THRESHOLDS.meanReversion && hurst.value < 0.4) {
    return `Anti-persistent market - expect reversals on ${feed.awayTeam}`;
  } else {
    return `Custom edge analysis required for ${feed.marketId}`;
  }
}

async function triggerBlackSwanAlert(
  feed: MarketFeed,
  fd: { value: number; glyph: string }
): Promise<void> {
  console.warn(
    `🚨 BLACK SWAN ALERT: Market ${feed.marketId} exceeded FD threshold ${FD_THRESHOLDS.blackSwan}`
  );

  // Send PTY notification (Component #13)
  await sendPTYNotification({
    type: "BLACK_SWAN_DETECTED",
    market: feed.marketId,
    fd: fd.value,
    glyph: fd.glyph,
    threshold: FD_THRESHOLDS.blackSwan,
    timestamp: Date.now(),
    requiresReview: true,
  });

  // Create quantum audit entry (Component #24)
  await createQuantumAuditLog({
    type: "BLACK_SWAN_ALERT",
    market: feed.marketId,
    fd: fd.value,
    glyph: fd.glyph,
    persona: PERSONA_CONFIG.personaId,
    severity: "HIGH",
  });
}

async function sendPTYNotification(
  message: Record<string, unknown>
): Promise<void> {
  // This would integrate with Component #13 (PTY Terminal)
  // For now, simulate the notification
  console.log(`📟 PTY Notification sent: ${JSON.stringify(message, null, 2)}`);
}

async function createQuantumAuditLog(
  data: Record<string, unknown>
): Promise<string> {
  const entryId = `qle_${Bun.randomUUIDv7().replace(/-/g, "").slice(0, 16)}`;

  // This would integrate with Component #24 (Versioning)
  // For now, simulate the audit logging
  console.log(`🔐 Quantum Audit: ${entryId} - ${data.type}`);

  return entryId;
}

// Batch edge detection for multiple markets
export async function detectEdgesBatch(
  feeds: MarketFeed[],
  concurrency: number = 3
): Promise<LatticeEdge[]> {
  const results: LatticeEdge[] = [];
  const semaphore = new Semaphore(concurrency);

  const promises = feeds.map(async (feed) => {
    await semaphore.acquire();
    try {
      const edge = await detectHiddenEdge(feed);
      if (edge) results.push(edge);
    } finally {
      semaphore.release();
    }
  });

  await Promise.allSettled(promises);
  return results.sort((a, b) => b.confidence - a.confidence); // Sort by confidence
}

// Semaphore for concurrency control
class Semaphore {
  private permits: number;
  private waitQueue: (() => void)[] = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  release(): void {
    this.permits++;
    if (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift()!;
      this.permits--;
      resolve();
    }
  }
}

// Performance benchmark for edge detection
export async function benchmarkEdgeDetection(
  iterations: number = 20
): Promise<{ averageMs: number; p99Ms: number; throughput: number }> {
  const testFeed: MarketFeed = {
    marketId: "BENCHMARK@TEST",
    homeTeam: "HOME",
    awayTeam: "AWAY",
    sport: "NBA",
    oddsTrajectory: new Float64Array(1000).map(() => Math.random() * 10 + 100),
    volumeProfile: new Float64Array(100),
    publicBettingPercent: 0.65,
    timestamp: Date.now(),
  };

  const timings: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await detectHiddenEdge(testFeed);
    const duration = performance.now() - start;
    timings.push(duration);
  }

  timings.sort((a, b) => a - b);

  return {
    averageMs: timings.reduce((a, b) => a + b) / timings.length,
    p99Ms: timings[Math.floor(timings.length * 0.99)],
    throughput: 1000 / (timings.reduce((a, b) => a + b) / timings.length),
  };
}
