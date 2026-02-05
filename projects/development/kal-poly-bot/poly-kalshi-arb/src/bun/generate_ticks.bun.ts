/**
 * Tick Data Generator - Bun Implementation
 *
 * Generates realistic market tick data for testing and backtesting
 * Simulates various market conditions and pattern scenarios
 */

import {
  MicrostructuralTickProcessor,
  type MarketTick,
} from "./tick_processor.bun.ts";

interface TickGeneratorConfig {
  duration: number; // seconds
  frequency: number; // ticks per second
  patterns: number[];
  volatility: number;
  trend: number;
  noise: number;
}

interface GeneratedTick extends MarketTick {
  synthetic: true;
  scenario: string;
}

export class TickGenerator {
  private config: TickGeneratorConfig;
  private currentTime: number = 0;
  private basePrice: number = 220.5;
  private books: string[] = ["pinnacle", "draftkings", "betfair", "fan_duel"];

  constructor(config: Partial<TickGeneratorConfig> = {}) {
    this.config = {
      duration: 600, // 10 minutes
      frequency: 10, // 10 ticks per second
      patterns: [51, 75, 56, 68],
      volatility: 0.5,
      trend: 0.1,
      noise: 0.2,
      ...config,
    };
  }

  /**
   * Generate tick sequence for pattern testing
   */
  async *generateTicks(): AsyncGenerator<GeneratedTick> {
    const totalTicks = this.config.duration * this.config.frequency;
    const tickInterval = 1000 / this.config.frequency;

    for (let i = 0; i < totalTicks; i++) {
      this.currentTime = Date.now();

      // Generate different pattern scenarios
      if (i % 100 === 0) {
        // Pattern 75 scenario: Late game acceleration
        yield* this.generatePattern75Scenario(i);
      } else if (i % 200 === 50) {
        // Pattern 56 scenario: Micro-suspension
        yield* this.generatePattern56Scenario(i);
      } else if (i % 150 === 25) {
        // Pattern 51 scenario: HT → FT lag
        yield* this.generatePattern51Scenario(i);
      } else {
        // Normal market ticks
        yield this.generateNormalTick(i);
      }

      // Wait for next tick interval
      await new Promise((resolve) => setTimeout(resolve, tickInterval));
    }
  }

  /**
   * Generate Pattern #75: Late-game acceleration scenario
   */
  private async *generatePattern75Scenario(
    startTick: number
  ): AsyncGenerator<GeneratedTick> {
    console.log(`Generating Pattern 75 scenario at tick ${startTick}`);

    // Simulate last 5 minutes of game
    for (let t = 0; t < 300; t += 5) {
      // 5-second intervals
      const timeRemaining = 300 - t;
      const acceleration = (0.5 * (300 - timeRemaining)) / 300; // Increasing acceleration
      const velocity = this.config.trend + acceleration * t;
      const price =
        this.basePrice +
        velocity * t +
        (Math.random() - 0.5) * this.config.noise;

      yield {
        timestamp: this.currentTime + t * 1000,
        bookId:
          this.books[Math.floor(Math.random() * this.books.length)] ||
          "unknown",
        price,
        timeRemaining,
        synthetic: true,
        scenario: "pattern_75_late_game",
      };
    }
  }

  /**
   * Generate Pattern #56: Micro-suspension scenario
   */
  private async *generatePattern56Scenario(
    startTick: number
  ): AsyncGenerator<GeneratedTick> {
    console.log(`Generating Pattern 56 scenario at tick ${startTick}`);

    // Simulate suspension across books
    const suspensionOrder = ["betfair", "draftkings", "pinnacle", "fan_duel"];

    for (let i = 0; i < suspensionOrder.length; i++) {
      const bookId = suspensionOrder[i];

      // Pre-suspension ticks
      for (let j = 0; j < 3; j++) {
        yield {
          timestamp: this.currentTime + i * 1000 + j * 100,
          bookId: bookId || "unknown",
          price: this.basePrice + (Math.random() - 0.5) * 0.5,
          status: "suspending",
          synthetic: true,
          scenario: "pattern_56_suspension",
        };
      }

      // Suspension tick
      yield {
        timestamp: this.currentTime + i * 1000 + 300,
        bookId: bookId || "unknown",
        price: this.basePrice,
        status: "suspended",
        synthetic: true,
        scenario: "pattern_56_suspension",
      };
    }
  }

  /**
   * Generate Pattern #51: HT → FT lag scenario
   */
  private async *generatePattern51Scenario(
    startTick: number
  ): AsyncGenerator<GeneratedTick> {
    console.log(`Generating Pattern 51 scenario at tick ${startTick}`);

    // Simulate half-time line movement
    const htDelta = (Math.random() - 0.5) * 2.0; // ±1 point HT move
    const propagationDelay = Math.random() * 5 + 2; // 2-7 second propagation delay

    // HT line change
    yield {
      timestamp: this.currentTime,
      bookId: "pinnacle",
      price: this.basePrice,
      ht_delta: htDelta,
      synthetic: true,
      scenario: "pattern_51_ht_move",
    };

    // Wait for propagation
    await new Promise((resolve) =>
      setTimeout(resolve, propagationDelay * 1000)
    );

    // FT line responds
    const ftResponse = htDelta * 0.7; // 70% propagation
    yield {
      timestamp: this.currentTime + propagationDelay * 1000,
      bookId: "draftkings",
      price: this.basePrice + ftResponse,
      ft_delta: ftResponse,
      synthetic: true,
      scenario: "pattern_51_ft_response",
    };
  }

  /**
   * Generate normal market tick
   */
  private generateNormalTick(tickNumber: number): GeneratedTick {
    // Random walk with trend
    const randomWalk = (Math.random() - 0.5) * this.config.volatility;
    const trendComponent =
      this.config.trend * (tickNumber / this.config.frequency);
    const noiseComponent = (Math.random() - 0.5) * this.config.noise;

    const price = this.basePrice + trendComponent + randomWalk + noiseComponent;
    const bookId =
      this.books[Math.floor(Math.random() * this.books.length)] || "unknown";

    return {
      timestamp: this.currentTime,
      bookId,
      price,
      size: Math.floor(Math.random() * 1000) + 100,
      synthetic: true,
      scenario: "normal_market",
    };
  }

  /**
   * Generate stress test scenario with high frequency
   */
  async *generateStressTest(): AsyncGenerator<GeneratedTick> {
    console.log("Generating stress test scenario (1000 ticks/second)");

    for (let i = 0; i < 10000; i++) {
      // 10 seconds at 1000 ticks/sec
      const price = this.basePrice + (Math.random() - 0.5) * 2.0;
      const bookId = this.books[i % this.books.length] || "unknown";

      yield {
        timestamp: Date.now() + i,
        bookId: bookId,
        price,
        size: Math.floor(Math.random() * 2000) + 500,
        synthetic: true,
        scenario: "stress_test",
      };

      // 1ms interval for stress test
      if (i % 100 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1));
      }
    }
  }

  /**
   * Generate binary tick data for WebSocket testing
   */
  generateBinaryTick(tick: GeneratedTick): ArrayBuffer {
    const buffer = new ArrayBuffer(24); // Base size
    const view = new DataView(buffer);

    // Timestamp (8 bytes)
    view.setFloat64(0, tick.timestamp, true);

    // Book ID (4 bytes, ASCII)
    const bookIdBytes = new TextEncoder().encode(tick.bookId.padEnd(4, "\0"));
    for (let i = 0; i < 4; i++) {
      view.setUint8(8 + i, bookIdBytes[i] || 0);
    }

    // Price (4 bytes)
    view.setFloat32(12, tick.price, true);

    // Time remaining (2 bytes)
    view.setUint16(16, tick.timeRemaining || 0, true);

    // Size (2 bytes)
    view.setUint16(18, tick.size || 0, true);

    // Flags (2 bytes)
    let flags = 0;
    if (tick.ht_delta !== undefined) flags |= 0x01;
    if (tick.ft_delta !== undefined) flags |= 0x02;
    if (tick.status === "suspending") flags |= 0x04;
    if (tick.status === "suspended") flags |= 0x08;
    view.setUint16(20, flags, true);

    return buffer;
  }

  /**
   * Run backtest with tick processor
   */
  async runBacktest(): Promise<{
    totalTicks: number;
    totalSignals: number;
    processingTime: number;
    avgLatency: number;
    patternCounts: Record<number, number>;
  }> {
    console.log("Starting backtest with generated ticks...");

    const tickProcessor = new MicrostructuralTickProcessor();
    const startTime = performance.now();

    let totalTicks = 0;
    let totalSignals = 0;
    const patternCounts: Record<number, number> = {};
    const latencies: number[] = [];

    for await (const tick of this.generateTicks()) {
      const tickStart = performance.now();

      await tickProcessor.processTick(tick);

      const latency = performance.now() - tickStart;
      latencies.push(latency);

      totalTicks++;

      // Count pattern scenarios
      if (tick.scenario && tick.scenario.includes("pattern_")) {
        const patternId = parseInt(tick.scenario.split("_")[1] || "0");
        patternCounts[patternId] = (patternCounts[patternId] || 0) + 1;

        if (latency < 10) {
          // Successful processing
          totalSignals++;
        }
      }

      // Progress reporting
      if (totalTicks % 100 === 0) {
        const avgLatency =
          latencies.reduce((a, b) => a + b, 0) / latencies.length;
        console.log(
          `Processed ${totalTicks} ticks, avg latency: ${avgLatency.toFixed(2)}ms`
        );
      }
    }

    const processingTime = performance.now() - startTime;
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

    await tickProcessor.cleanup();

    return {
      totalTicks,
      totalSignals,
      processingTime,
      avgLatency,
      patternCounts,
    };
  }
}

// CLI interface for running the generator
if (import.meta.main) {
  const generator = new TickGenerator({
    duration: 60, // 1 minute test
    frequency: 20, // 20 ticks per second
    patterns: [51, 75, 56, 68],
  });

  console.log("🚀 Starting tick generation and backtest...");

  const results = await generator.runBacktest();

  console.log("\n📊 Backtest Results:");
  console.log(`   Total ticks: ${results.totalTicks}`);
  console.log(`   Total signals: ${results.totalSignals}`);
  console.log(`   Processing time: ${results.processingTime.toFixed(2)}ms`);
  console.log(`   Average latency: ${results.avgLatency.toFixed(2)}ms`);
  console.log(
    `   Throughput: ${(results.totalTicks / (results.processingTime / 1000)).toFixed(1)} ticks/sec`
  );
  console.log("   Pattern counts:", results.patternCounts);

  console.log("\n✅ Backtest completed!");
}

export default TickGenerator;
