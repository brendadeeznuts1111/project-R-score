// HFT Freeze Predictor - Types

export interface Config {
  velocityThreshold: number;    // default: 80
  latencyThreshold: number;     // default: 100 (ms)
  sharpeThreshold: number;      // default: 0.5
}

export interface FreezeEvent {
  id: string;
  timestamp: number;
  velocity: number;
  latency: number;
  sharpeRatio: number;
  frozen: boolean;
}

export interface Prediction {
  id: string;
  eventId: string;
  probability: number;
  confidence: number;
  predictedAt: number;
}

export interface MetricsSnapshot {
  velocity: number;
  latency: number;
  sharpeRatio: number;
  timestamp: number;
}
