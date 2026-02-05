export interface AnomalySignal {
  deviceId: string;
  sessionId: string;
  timestamp: number;
  deviceAgeDays: number;
  accountAgeDays: number;
  walletAgeDelta: number;
  legAmount: number;
  legVelocity: number;
  dailyVolumeUSD: number;
  ipJumpCount: number;
  countryChangeCount: number;
  vpnDetected: boolean;
  ctrProximity: number;
  chargebackHistory: boolean;
  previousAnomalyScore: number;
  isFirstTransaction: boolean;
  isWeekendTransaction: boolean;
  isOffPeakHour: boolean;
}

export interface AnomalyScore {
  score: number;
  confidence: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  nebulaCode: string;
  reasons: string[];
  timestamp: number;
}

export interface AnomalyAction {
  type: "allow" | "throttle" | "block" | "retire";
  duration?: number;
  reason: string;
  nebulaCode: string;
}

export interface AnomalyModelConfig {
  modelPath: string;
  threshold: {
    low: number;
    medium: number;
    high: number;
  };
  weights: {
    deviceAge: number;
    velocity: number;
    ipJump: number;
    ctrProximity: number;
    chargebackHistory: number;
  };
}

export interface AnomalyEngineState {
  isInitialized: boolean;
  modelLoaded: boolean;
  lastScoreTime: number;
  totalScores: number;
  averageLatency: number;
}

export interface AnomalyEvent {
  type: "score" | "action" | "alert";
  signal: AnomalySignal;
  score: AnomalyScore;
  action?: AnomalyAction;
  timestamp: number;
}
