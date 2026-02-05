export interface ChaosScenario {
  name: string;
  execute: () => Promise<void>;
}

export interface QualityGate {
  name: string;
  check: () => Promise<boolean>;
  message: string;
}

export interface QualityGateResult {
  name: string;
  success: boolean;
  message: string;
}

export interface Anomaly {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metric: string;
  threshold: number;
  actual: number;
  recommendation: string;
}

export interface ResilienceScore {
  score: number;
  recoveryTime: number;
  recommendations: string[];
}
