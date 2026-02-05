/**
 * Edge Worker Functions - Cloudflare Workers Compatible
 *
 * Ultra-low latency pattern detection for edge deployment
 * Sub-5ms total processing with KV storage and queue integration
 */

import type {
  Env,
  ExecutionContext,
  Message,
  ScheduledEvent,
} from "./types.d.ts";

export interface TickRequest {
  pattern: number;
  marketId: string;
  bookId: string;
  price: number;
  timestamp: number;
  timeRemaining?: number;
  ht_delta?: number;
  ft_delta?: number;
  flags?: number;
}

export interface FilterState {
  x: number[];
  P: number[][];
  regime: string;
  velocityWindow: number[];
  lastUpdate: number;
}

export interface TriggerSignal {
  pattern: number;
  bookId: string;
  targetPrice: number;
  edge: number;
  confidence: number;
  timestamp: number;
  windowDuration: number;
  size: number;
  marketId: string;
}

/**
 * Main edge worker handler - optimized for <5ms execution
 */
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const startTime = performance.now();

    try {
      // Parse request
      if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
      }

      const tick: TickRequest = await request.json();

      // Validate request
      if (!tick.pattern || !tick.marketId || !tick.bookId || !tick.price) {
        return new Response("Invalid request parameters", { status: 400 });
      }

      // Process pattern detection
      const result = await processPatternTick(tick, env);

      // Calculate total latency
      const totalLatency = performance.now() - startTime;

      // Return response with latency header
      return new Response(JSON.stringify(result), {
        headers: {
          "Content-Type": "application/json",
          "X-Latency": `${totalLatency.toFixed(2)}ms`,
          "X-Pattern": tick.pattern.toString(),
          "X-Regime": result.regime || "unknown",
        },
      });
    } catch (error) {
      console.error(`Edge worker error: ${error}`);
      return new Response(JSON.stringify({ error: "Processing failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};

/**
 * Process tick through pattern-specific filter
 */
async function processPatternTick(tick: TickRequest, env: Env): Promise<any> {
  const stateKey = `kf:${tick.pattern}:${tick.marketId}`;

  // Load filter state from KV (edge-optimized)
  const stateJson = await env.KV.get(stateKey);
  let state: FilterState | null = null;

  if (stateJson) {
    try {
      state = JSON.parse(stateJson);
    } catch (error) {
      console.warn(`Failed to parse state for ${stateKey}: ${error}`);
    }
  }

  // Process based on pattern type
  let result: any = { processed: false, trigger: null };

  switch (tick.pattern) {
    case 51:
      result = await processPattern51(tick, state);
      break;
    case 75:
      result = await processPattern75(tick, state);
      break;
    case 56:
      result = await processPattern56(tick, state);
      break;
    case 68:
      result = await processPattern68(tick, state);
      break;
    default:
      console.warn(`Unknown pattern: ${tick.pattern}`);
  }

  // Save state asynchronously (fire-and-forget)
  if (result.newState) {
    ctx.waitUntil(
      env.KV.put(stateKey, JSON.stringify(result.newState), {
        expirationTtl: 3600, // 1 hour TTL
      })
    );
  }

  // Queue bet if trigger detected
  if (result.trigger) {
    ctx.waitUntil(
      env.QUEUE.send({
        ...result.trigger,
        timestamp: tick.timestamp,
        edgeLatency: performance.now(),
      })
    );
  }

  return result;
}

/**
 * Pattern #51: Half-Time Line Inference
 */
async function processPattern51(
  tick: TickRequest,
  state: FilterState | null
): Promise<any> {
  if (!tick.ht_delta || !tick.ft_delta) {
    return { processed: false, regime: "insufficient_data" };
  }

  // Initialize or restore filter state
  const x = state ? state.x : [tick.price, 0, 0]; // [ft_position, velocity, ht_influence]
  const P = state
    ? state.P
    : [
        [100, 0, 0],
        [0, 100, 0],
        [0, 0, 100],
      ];

  // Update with HT influence
  const propagationCoef = 0.7;
  x[2] = tick.ht_delta * propagationCoef;

  // Simple Kalman update (simplified for edge)
  const predictedFT = x[0] + x[2];
  const edge = Math.abs(predictedFT - tick.price);

  // Update state
  x[0] = tick.price;
  x[1] = (tick.price - (state?.x[0] || tick.price)) / 0.05; // Simple velocity

  const regime = Math.abs(x[1]) > 0.3 ? "steam" : "quiet";
  let trigger: TriggerSignal | null = null;

  if (edge > 0.5 && regime === "steam") {
    trigger = {
      pattern: 51,
      bookId: tick.bookId,
      targetPrice: predictedFT,
      edge,
      confidence: Math.min(0.9, edge / 2),
      timestamp: tick.timestamp,
      windowDuration: 30,
      size: calculatePositionSize(edge, 0.7),
      marketId: tick.marketId,
    };
  }

  return {
    processed: true,
    regime,
    trigger,
    newState: {
      x,
      P,
      regime,
      velocityWindow: [...(state?.velocityWindow || []), Math.abs(x[1])].slice(
        -10
      ),
      lastUpdate: tick.timestamp,
    },
  };
}

/**
 * Pattern #75: In-Play Velocity Convexity
 */
async function processPattern75(
  tick: TickRequest,
  state: FilterState | null
): Promise<any> {
  if (!tick.timeRemaining || tick.timeRemaining > 300) {
    return { processed: false, regime: "not_in_window" };
  }

  // Initialize or restore filter state
  const x = state ? state.x : [tick.price, 0, 0, tick.timeRemaining];
  const P = state
    ? state.P
    : [
        [100, 0, 0, 0],
        [0, 100, 0, 0],
        [0, 0, 100, 0],
        [0, 0, 0, 100],
      ];

  // Update time remaining
  x[3] = tick.timeRemaining;

  // Simple acceleration model
  const dt = 0.01;
  const accelCoef = 0.5;

  // Predict 5 seconds ahead
  const futurePos = x[0] + x[1] * 5 + 0.5 * x[2] * 25;

  const edge = Math.abs(futurePos - tick.price);
  const uncertainty = P[0][0];
  const confidence =
    uncertainty > 0 ? Math.min(0.95, edge / Math.sqrt(uncertainty)) : 0.5;

  // Update state
  x[0] = tick.price;
  x[1] = (tick.price - (state?.x[0] || tick.price)) / dt;
  x[2] = (x[1] - (state?.x[1] || 0)) / dt; // Simple acceleration

  const regime = Math.abs(x[1]) > 0.3 ? "steam" : "quiet";
  let trigger: TriggerSignal | null = null;

  if (edge > 0.5 && confidence > 0.6 && tick.timeRemaining < 120) {
    trigger = {
      pattern: 75,
      bookId: tick.bookId,
      targetPrice: futurePos,
      edge,
      confidence,
      timestamp: tick.timestamp,
      windowDuration: 5,
      size: calculatePositionSize(edge, confidence),
      marketId: tick.marketId,
    };
  }

  return {
    processed: true,
    regime,
    trigger,
    newState: {
      x,
      P,
      regime,
      velocityWindow: [...(state?.velocityWindow || []), Math.abs(x[1])].slice(
        -10
      ),
      lastUpdate: tick.timestamp,
    },
  };
}

/**
 * Pattern #56: Micro-Suspension Window
 */
async function processPattern56(
  tick: TickRequest,
  state: FilterState | null
): Promise<any> {
  // Check if this is a suspension signal
  const flags = tick.flags || 0;
  const isSuspending = (flags & 0x04) !== 0;
  const isSuspended = (flags & 0x08) !== 0;

  if (!isSuspending && !isSuspended) {
    return { processed: false, regime: "active" };
  }

  // Immediate arbitrage trigger for suspension
  const trigger: TriggerSignal = {
    pattern: 56,
    bookId: tick.bookId,
    targetPrice: tick.price,
    edge: 0.8,
    confidence: 0.9,
    timestamp: tick.timestamp,
    windowDuration: 1,
    size: 1000, // Max size for time-critical arb
    marketId: tick.marketId,
  };

  return {
    processed: true,
    regime: isSuspended ? "suspended" : "suspending",
    trigger,
    newState: state || {
      x: [tick.price, 0, 0, 0],
      P: [
        [100, 0, 0, 0],
        [0, 100, 0, 0],
        [0, 0, 100, 0],
        [0, 0, 0, 100],
      ],
      regime: "suspending",
      velocityWindow: [],
      lastUpdate: tick.timestamp,
    },
  };
}

/**
 * Pattern #68: Steam Propagation
 */
async function processPattern68(
  tick: TickRequest,
  state: FilterState | null
): Promise<any> {
  // Simplified steam propagation detection
  const x = state ? state.x : [tick.price, 0, 0, 0];
  const dt = 0.02;

  // Update velocity
  x[1] = (tick.price - (state?.x[0] || tick.price)) / dt;

  const regime = Math.abs(x[1]) > 0.3 ? "steam" : "quiet";
  let trigger: TriggerSignal | null = null;

  // Simple edge detection
  const edge = Math.abs(x[1]) * dt;
  if (edge > 0.5 && regime === "steam") {
    trigger = {
      pattern: 68,
      bookId: tick.bookId,
      targetPrice: tick.price + x[1] * 5, // 5-second prediction
      edge,
      confidence: Math.min(0.8, Math.abs(x[1])),
      timestamp: tick.timestamp,
      windowDuration: 3,
      size: calculatePositionSize(edge, 0.7),
      marketId: tick.marketId,
    };
  }

  return {
    processed: true,
    regime,
    trigger,
    newState: {
      x: [tick.price, x[1], 0, 0],
      P: [
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1],
      ],
      regime,
      velocityWindow: [...(state?.velocityWindow || []), Math.abs(x[1])].slice(
        -10
      ),
      lastUpdate: tick.timestamp,
    },
  };
}

/**
 * Calculate position size using Kelly criterion
 */
function calculatePositionSize(edge: number, confidence: number): number {
  const winRate = confidence;
  const kellyFraction = (winRate * 2 - 1) * 0.5; // Half-Kelly
  const baseCapital = 10000;

  const size = Math.max(10, Math.min(1000, baseCapital * kellyFraction * edge));
  return Math.round(size);
}

/**
 * Queue handler for bet execution
 */
export async function queue(batch: Message[], env: Env): Promise<void> {
  for (const message of batch) {
    const trigger: TriggerSignal = message.body as any;

    console.log(
      `Queue: Processing trigger for pattern ${trigger.pattern} on ${trigger.bookId}`
    );

    // Here you would integrate with your execution system
    // For now, just log the trigger
    console.log(`Bet signal:`, {
      pattern: trigger.pattern,
      book: trigger.bookId,
      target: trigger.targetPrice,
      edge: trigger.edge,
      confidence: trigger.confidence,
      size: trigger.size,
    });

    message.ack();
  }
}

/**
 * Scheduled cleanup of old states
 */
export async function scheduled(
  event: ScheduledEvent,
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  console.log("Running scheduled cleanup of old filter states");

  // In a real implementation, you would clean up old KV entries
  // For now, just log the cleanup
  console.log("Cleanup completed");
}
