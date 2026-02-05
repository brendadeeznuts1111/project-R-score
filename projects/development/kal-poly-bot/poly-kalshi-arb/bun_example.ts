#!/usr/bin/env bun
/**
 * Bun Script Example: Half-Time Inference Kalman Filter
 *
 * This script demonstrates how to use the Half-TimeInferenceKF in a Bun environment
 * for real-time Pattern #51: Half-Time Line Inference Lag detection.
 */

import {
  HalfTimeInferenceKF,
  type FTTickData,
  type HTTickData,
} from "./src/half_time_inference_kf.ts";

interface MarketTick {
  timestamp: number;
  ht_delta?: number;
  ft_price: number;
  book: string;
}

/**
 * Simulate real-time market data processing
 */
async function processMarketTicks(): Promise<void> {
  console.log("🚀 Starting real-time market tick processing...\n");

  // Initialize the filter
  const kf = new HalfTimeInferenceKF(0.05); // 50ms time step

  console.log("📊 Filter initialized:");
  console.log(`   Regime: ${kf.getState().regime}`);
  console.log(
    `   State: [${kf
      .getStateVector()
      .map((v) => v.toFixed(3))
      .join(", ")}]`
  );
  console.log();

  // Simulate market ticks (in real scenario, this would come from WebSocket/API)
  const mockTicks: MarketTick[] = [
    { timestamp: Date.now(), ht_delta: 0.2, ft_price: 220.5, book: "pinnacle" },
    {
      timestamp: Date.now() + 50,
      ht_delta: 0.3,
      ft_price: 220.8,
      book: "pinnacle",
    },
    {
      timestamp: Date.now() + 100,
      ht_delta: 0.5,
      ft_price: 221.2,
      book: "pinnacle",
    },
    {
      timestamp: Date.now() + 150,
      ht_delta: 0.8,
      ft_price: 221.5,
      book: "pinnacle",
    },
    {
      timestamp: Date.now() + 200,
      ht_delta: 1.2,
      ft_price: 222.0,
      book: "pinnacle",
    },
    {
      timestamp: Date.now() + 250,
      ht_delta: 1.5,
      ft_price: 222.8,
      book: "pinnacle",
    },
  ];

  let tradeCount = 0;
  let totalPnL = 0;

  for (const tick of mockTicks) {
    console.log(
      `⏰ Processing tick at ${new Date(tick.timestamp).toISOString().split("T")[1].split(".")[0]}`
    );

    if (tick.ht_delta !== undefined) {
      // Create tick data structures
      const htTick: HTTickData = { price_delta: tick.ht_delta };
      const ftTick: FTTickData = { price: tick.ft_price };

      // Update filter
      kf.updateWithBothMarkets(htTick, ftTick);

      // Get prediction
      const predictedFT = kf.predictFTTotal();
      const edge = Math.abs(predictedFT - tick.ft_price);

      // Evaluate trigger
      const trigger = kf.evaluateTrigger(tick.ft_price, 0.5);

      console.log(
        `   HT Delta: ${tick.ht_delta.toFixed(2)}, FT Price: ${tick.ft_price.toFixed(1)}`
      );
      console.log(
        `   Predicted FT: ${predictedFT.toFixed(2)}, Edge: ${edge.toFixed(2)}`
      );
      console.log(
        `   Regime: ${trigger.regime}, Confidence: ${(trigger.confidence * 100).toFixed(1)}%`
      );

      // Trading logic
      if (trigger.triggered) {
        tradeCount++;
        const positionSize = calculatePositionSize(
          trigger.confidence,
          trigger.expected_edge
        );
        const simulatedPnL = simulateTrade(
          trigger.target_price,
          tick.ft_price,
          positionSize
        );
        totalPnL += simulatedPnL;

        console.log(
          `   🎯 TRADE SIGNAL: Bet FT ${trigger.target_price.toFixed(2)}`
        );
        console.log(
          `   💰 Position size: $${positionSize.toFixed(2)}, Simulated P&L: $${simulatedPnL.toFixed(2)}`
        );
      } else if (edge > 0.3) {
        console.log(
          `   ⚠️  WATCHING: Edge ${edge.toFixed(2)} approaching threshold`
        );
      } else {
        console.log(`   ❌ NO SIGNAL: Edge ${edge.toFixed(2)} below threshold`);
      }

      console.log(
        `   📈 Velocity: ${kf.getVelocity().toFixed(3)} pt/s, HT Influence: ${kf.getRegimeInfo().htInfluence.toFixed(3)}`
      );
    }

    console.log();

    // Simulate real-time processing delay
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Summary
  console.log("📊 Processing Summary:");
  console.log(`   Total trades executed: ${tradeCount}`);
  console.log(`   Total simulated P&L: $${totalPnL.toFixed(2)}`);
  console.log(
    `   Average P&L per trade: $${tradeCount > 0 ? (totalPnL / tradeCount).toFixed(2) : "0.00"}`
  );
  console.log(`   Final regime: ${kf.getState().regime}`);
  console.log(
    `   Final uncertainty: ${kf.getPositionUncertainty().toFixed(6)}`
  );
}

/**
 * Calculate position size based on confidence and edge
 */
function calculatePositionSize(confidence: number, edge: number): number {
  // Kelly criterion approximation
  const winRate = confidence;
  const kellyFraction = (winRate * 2 - 1) * 0.5; // Half-Kelly
  const baseCapital = 10000;
  return Math.max(10, Math.min(1000, baseCapital * kellyFraction * edge));
}

/**
 * Simulate trade execution with realistic outcomes
 */
function simulateTrade(
  targetPrice: number,
  entryPrice: number,
  size: number
): number {
  // Simulate market movement and slippage
  const actualMove = (targetPrice - entryPrice) * (0.7 + Math.random() * 0.3); // 70-100% capture
  const slippage = (Math.random() - 0.5) * 0.02 * entryPrice; // ±1% slippage
  const transactionCost = size * 0.001; // 0.1% transaction cost

  return actualMove * size - Math.abs(slippage) - transactionCost;
}

/**
 * Performance benchmark for the filter
 */
function benchmarkFilter(): void {
  console.log("⚡ Performance Benchmark:");

  const iterations = 10000;
  const kf = new HalfTimeInferenceKF(0.01);

  const startTime = performance.now();

  for (let i = 0; i < iterations; i++) {
    const htTick: HTTickData = { price_delta: Math.random() * 2 - 1 };
    const ftTick: FTTickData = { price: 220 + Math.random() * 10 };

    kf.updateWithBothMarkets(htTick, ftTick);
    kf.predictFTTotal();
    kf.evaluateTrigger(ftTick.price);
  }

  const endTime = performance.now();
  const avgTime = (endTime - startTime) / iterations;

  console.log(`   Processed ${iterations} iterations`);
  console.log(`   Average time per update: ${avgTime.toFixed(3)}ms`);
  console.log(`   Updates per second: ${(1000 / avgTime).toFixed(0)}`);
  console.log(
    `   Latency budget status: ${avgTime < 6 ? "✅ PASS" : "❌ FAIL"} (< 6ms required)`
  );
  console.log();
}

/**
 * Demonstrate regime detection dynamics
 */
function demonstrateRegimeDetection(): void {
  console.log("🔄 Regime Detection Demonstration:");

  const kf = new HalfTimeInferenceKF(0.05);

  // Quiet regime phase
  console.log("   Phase 1: Quiet regime (low volatility)");
  for (let i = 0; i < 15; i++) {
    const htTick: HTTickData = { price_delta: (Math.random() - 0.5) * 0.2 };
    const ftTick: FTTickData = { price: 220 + (Math.random() - 0.5) * 0.5 };

    kf.updateWithBothMarkets(htTick, ftTick);
  }
  console.log(
    `   Regime: ${kf.getState().regime}, Velocity: ${kf.getVelocity().toFixed(3)} pt/s`
  );

  // Transition to steam regime
  console.log("   Phase 2: Transition to steam regime (high volatility)");
  for (let i = 0; i < 15; i++) {
    const htTick: HTTickData = { price_delta: (Math.random() - 0.5) * 2.0 };
    const ftTick: FTTickData = { price: 220 + (Math.random() - 0.5) * 3.0 };

    kf.updateWithBothMarkets(htTick, ftTick);
  }
  console.log(
    `   Regime: ${kf.getState().regime}, Velocity: ${kf.getVelocity().toFixed(3)} pt/s`
  );

  // Back to quiet
  console.log("   Phase 3: Return to quiet regime");
  for (let i = 0; i < 15; i++) {
    const htTick: HTTickData = { price_delta: (Math.random() - 0.5) * 0.1 };
    const ftTick: FTTickData = { price: 220 + (Math.random() - 0.5) * 0.2 };

    kf.updateWithBothMarkets(htTick, ftTick);
  }
  console.log(
    `   Regime: ${kf.getState().regime}, Velocity: ${kf.getVelocity().toFixed(3)} pt/s`
  );
  console.log();
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  console.log("🎯 Half-Time Inference Kalman Filter - Bun Implementation");
  console.log("=".repeat(60));
  console.log();

  try {
    // Run demonstrations
    await processMarketTicks();
    benchmarkFilter();
    demonstrateRegimeDetection();

    console.log("✅ All demonstrations completed successfully!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

// Run the main function
if (import.meta.main) {
  main();
}
