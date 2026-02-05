// HFT Freeze Predictor - Prediction Logic
//
// Flow:
// 1. Receive MetricsSnapshot
// 2. Compare against Config thresholds
// 3. Calculate freeze probability
// 4. Return Prediction

import type { Config, MetricsSnapshot, Prediction } from "./types";

export const DEFAULT_CONFIG: Config = {
  velocityThreshold: 80,
  latencyThreshold: 100,
  sharpeThreshold: 0.5,
};

export function predict(metrics: MetricsSnapshot, config: Config): Prediction {
  const [velocityExceeded, latencyExceeded, sharpeBelow] = evaluateThresholds(metrics, config);

  // Calculate probability based on threshold breaches
  let probability = 0;
  let breachCount = 0;

  if (velocityExceeded) {
    const excess = (metrics.velocity - config.velocityThreshold) / config.velocityThreshold;
    probability += Math.min(0.4, excess * 0.4);
    breachCount++;
  }

  if (latencyExceeded) {
    const excess = (metrics.latency - config.latencyThreshold) / config.latencyThreshold;
    probability += Math.min(0.4, excess * 0.4);
    breachCount++;
  }

  if (sharpeBelow) {
    const deficit = (config.sharpeThreshold - metrics.sharpeRatio) / config.sharpeThreshold;
    probability += Math.min(0.4, deficit * 0.4);
    breachCount++;
  }

  // Cap probability at 1.0
  probability = Math.min(1.0, probability);

  // Confidence based on how many thresholds are breached
  const confidence = breachCount > 0 ? 0.5 + (breachCount * 0.15) : 0.3;

  return {
    id: crypto.randomUUID(),
    eventId: `event-${metrics.timestamp}`,
    probability: Math.round(probability * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    predictedAt: Date.now(),
  };
}

export function evaluateThresholds(metrics: MetricsSnapshot, config: Config): [boolean, boolean, boolean] {
  const velocityExceeded = metrics.velocity > config.velocityThreshold;
  const latencyExceeded = metrics.latency > config.latencyThreshold;
  const sharpeBelow = metrics.sharpeRatio < config.sharpeThreshold;

  return [velocityExceeded, latencyExceeded, sharpeBelow];
}
