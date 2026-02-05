// types/api.types.ts

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface ScoreMetrics {
  [key: string]: number;
}

export interface ScoreCalculationOptions {
  minValidValue?: number;
  maxValidValue?: number;
  handleInvalid?: 'ignore' | 'clamp' | 'error';
  precision?: number;
}

export interface ScoreResult {
  score: number;
  metadata: {
    inputCount: number;
    calculationTimeNs: number;
    calculationTimeMs: number;
    error?: string;
    timestamp: string;
    bunVersion: string;
    nodeVersion: string;
  };
}
