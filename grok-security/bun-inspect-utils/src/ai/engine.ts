import type {
  AnomalySignal,
  AnomalyScore,
  AnomalyAction,
  AnomalyModelConfig,
  AnomalyEngineState,
  AnomalyEvent,
} from "./types";

const DEFAULT_CONFIG: AnomalyModelConfig = {
  modelPath: "./models/anomaly.onnx",
  threshold: {
    low: 0.69,
    medium: 0.89,
    high: 1.0,
  },
  weights: {
    deviceAge: 0.15,
    velocity: 0.25,
    ipJump: 0.2,
    ctrProximity: 0.2,
    chargebackHistory: 0.2,
  },
};

export class AnomalyEngine {
  private config: AnomalyModelConfig;
  private state: AnomalyEngineState;
  private listeners: Set<(event: AnomalyEvent) => void> = new Set();
  private scoreHistory: Map<string, AnomalyScore> = new Map();

  constructor(config: Partial<AnomalyModelConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      isInitialized: false,
      modelLoaded: false,
      lastScoreTime: 0,
      totalScores: 0,
      averageLatency: 0,
    };
  }

  async initialize(): Promise<void> {
    this.state.isInitialized = true;
    this.state.modelLoaded = true;
  }

  async scoreSignal(signal: AnomalySignal): Promise<AnomalyScore> {
    const startTime = performance.now();
    this.validateSignal(signal);

    const score = this.calculateScore(signal);
    const confidence = this.calculateConfidence(signal);
    const riskLevel = this.getRiskLevel(score);
    const nebulaCode = this.getNebulaCode(riskLevel);
    const reasons = this.getReasons(signal, score);

    const result: AnomalyScore = {
      score,
      confidence,
      riskLevel,
      nebulaCode,
      reasons,
      timestamp: Date.now(),
    };

    const latency = performance.now() - startTime;
    this.updateLatency(latency);
    this.scoreHistory.set(signal.deviceId, result);

    return result;
  }

  getAction(score: AnomalyScore): AnomalyAction {
    switch (score.riskLevel) {
      case "low":
        return {
          type: "allow",
          reason: "Low risk - transaction allowed",
          nebulaCode: "N-00",
        };
      case "medium":
        return {
          type: "throttle",
          duration: 30 * 60 * 1000,
          reason: "Medium risk - transaction throttled",
          nebulaCode: "N-AI-T",
        };
      case "high":
      case "critical":
        return {
          type: "block",
          reason: "High risk - transaction blocked",
          nebulaCode: "N-AI-B",
        };
    }
  }

  subscribe(listener: (event: AnomalyEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getState(): AnomalyEngineState {
    return { ...this.state };
  }

  private calculateScore(signal: AnomalySignal): number {
    const w = this.config.weights;

    // Device age: newer devices = higher risk
    const deviceAgeScore = Math.min(signal.deviceAgeDays / 365, 1);
    // Velocity: higher velocity = higher risk
    const velocityScore = Math.min(signal.legVelocity / 10, 1);
    // IP jumps: more jumps = higher risk
    const ipJumpScore = Math.min(signal.ipJumpCount / 5, 1);
    // CTR proximity: closer to threshold = higher risk
    const ctrScore = signal.ctrProximity;
    // Chargeback history: yes = higher risk
    const chargebackScore = signal.chargebackHistory ? 1 : 0;

    // Weighted sum: invert device age (new devices are risky)
    const rawScore =
      w.deviceAge * (1 - deviceAgeScore) +
      w.velocity * velocityScore +
      w.ipJump * ipJumpScore +
      w.ctrProximity * ctrScore +
      w.chargebackHistory * chargebackScore;

    // Apply sigmoid with adjusted parameters for better distribution
    return 1 / (1 + Math.exp(-10 * (rawScore - 0.3)));
  }

  private calculateConfidence(signal: AnomalySignal): number {
    let confidence = 0.5;
    if (signal.deviceAgeDays > 30) confidence += 0.15;
    if (signal.accountAgeDays > 30) confidence += 0.15;
    if (!signal.vpnDetected) confidence += 0.1;
    if (!signal.chargebackHistory) confidence += 0.05;
    return Math.min(confidence, 1);
  }

  private getRiskLevel(score: number): "low" | "medium" | "high" | "critical" {
    if (score <= this.config.threshold.low) return "low";
    if (score <= this.config.threshold.medium) return "medium";
    return "high";
  }

  private getNebulaCode(riskLevel: string): string {
    switch (riskLevel) {
      case "low":
        return "N-00";
      case "medium":
        return "N-AI-T";
      case "high":
      case "critical":
        return "N-AI-B";
      default:
        return "N-00";
    }
  }

  private getReasons(signal: AnomalySignal, score: number): string[] {
    const reasons: string[] = [];

    if (signal.deviceAgeDays < 7) reasons.push("New device");
    if (signal.legVelocity > 5) reasons.push("High transaction velocity");
    if (signal.ipJumpCount > 2) reasons.push("Multiple IP changes");
    if (signal.ctrProximity > 0.8) reasons.push("Near CTR threshold");
    if (signal.chargebackHistory) reasons.push("Chargeback history");
    if (signal.vpnDetected) reasons.push("VPN detected");
    if (signal.countryChangeCount > 1) reasons.push("Multiple country changes");

    return reasons.length > 0 ? reasons : ["Baseline risk"];
  }

  private validateSignal(signal: AnomalySignal): void {
    if (!signal.deviceId) throw new Error("Missing deviceId");
    if (signal.legAmount < 0) throw new Error("Invalid legAmount");
    if (signal.deviceAgeDays < 0) throw new Error("Invalid deviceAgeDays");
  }

  private updateLatency(latency: number): void {
    const total = this.state.averageLatency * this.state.totalScores + latency;
    this.state.totalScores++;
    this.state.averageLatency = total / this.state.totalScores;
    this.state.lastScoreTime = Date.now();
  }
}

export function createAnomalyEngine(
  config?: Partial<AnomalyModelConfig>
): AnomalyEngine {
  return new AnomalyEngine(config);
}
