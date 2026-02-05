/**
 * Adaptive Kalman Filter - High-Performance Bun Implementation
 *
 * Optimized for sub-10ms micro-structural pattern detection
 * Uses mathjs for efficient matrix operations with Bun's JIT optimization
 */

import {
  Matrix,
  add,
  identity,
  inv,
  matrix,
  multiply,
  subtract,
  transpose,
} from "mathjs";

export type Regime = "quiet" | "steam" | "suspended";

export interface FilterState {
  x: number[];
  P: number[][];
  regime: Regime;
  velocityWindow: number[];
}

export class AdaptiveKalmanFilter {
  public x: Matrix;
  public P: Matrix;
  public velocityWindow: number[];
  public currentRegime: Regime;
  public velocityThreshold: number = 0.3;
  public regimeWindowSize: number = 10;

  constructor(
    public dt: number,
    public stateDim: number,
    public obsDim: number,
    public F: Matrix,
    public H: Matrix,
    public Q_quiet: Matrix,
    public Q_steam: Matrix,
    public R: Matrix
  ) {
    // Initialize state vector with zeros
    this.x = matrix(Array(stateDim).fill(0));

    // Initialize covariance matrix with high uncertainty
    this.P = multiply(identity(stateDim), 100);

    this.velocityWindow = [];
    this.currentRegime = "quiet";
  }

  /**
   * Predict step using regime-specific process noise
   */
  predict(): void {
    // x = F * x
    this.x = multiply(this.F, this.x);

    // P = F * P * F^T + Q
    const Q = this.currentRegime === "steam" ? this.Q_steam : this.Q_quiet;
    const F_P = multiply(this.F, this.P);
    const F_P_Ft = multiply(F_P, transpose(this.F));
    this.P = add(F_P_Ft, Q);
  }

  /**
   * Update step with Joseph form for numerical stability
   */
  update(z: Matrix): void {
    // Innovation: y = z - H * x
    const y = subtract(z, multiply(this.H, this.x));

    // Innovation covariance: S = H * P * H^T + R
    const H_P = multiply(this.H, this.P);
    const H_P_Ht = multiply(H_P, transpose(this.H));
    const S = add(H_P_Ht, this.R);

    // Kalman gain: K = P * H^T * S^-1
    // Optimized inverse for small matrices (common in our patterns)
    const P_Ht = multiply(this.P, transpose(this.H));
    const K = multiply(P_Ht, inv(S));

    // State update: x = x + K * y
    this.x = add(this.x, multiply(K, y));

    // Joseph form for numerical stability
    const I = identity(this.stateDim);
    const K_H = multiply(K, this.H);
    const I_minus_KH = subtract(I, K_H);

    // P = (I - K*H) * P * (I - K*H)^T + K * R * K^T
    const I_KH_P = multiply(I_minus_KH, this.P);
    const I_KH_P_I_KH_T = multiply(I_KH_P, transpose(I_minus_KH));
    const K_R = multiply(K, this.R);
    const K_R_K_T = multiply(K_R, transpose(K));

    this.P = add(I_KH_P_I_KH_T, K_R_K_T);
  }

  /**
   * Detect regime based on velocity thresholds
   */
  detectRegime(observedVelocity: number): void {
    this.velocityWindow.push(Math.abs(observedVelocity));
    if (this.velocityWindow.length > this.regimeWindowSize) {
      this.velocityWindow.shift();
    }

    if (this.velocityWindow.length >= this.regimeWindowSize) {
      const avgVel =
        this.velocityWindow.reduce((a, b) => a + b, 0) /
        this.velocityWindow.length;
      this.currentRegime = avgVel > this.velocityThreshold ? "steam" : "quiet";
    }
  }

  /**
   * Get current state as plain object for serialization
   */
  getState(): FilterState {
    return {
      x: this.x.toArray() as number[],
      P: this.P.toArray() as number[][],
      regime: this.currentRegime,
      velocityWindow: [...this.velocityWindow],
    };
  }

  /**
   * Restore state from serialized object
   */
  setState(state: FilterState): void {
    this.x = matrix(state.x);
    this.P = matrix(state.P);
    this.currentRegime = state.regime;
    this.velocityWindow = [...state.velocityWindow];
  }

  /**
   * Get current velocity (state[1] if available)
   */
  getVelocity(): number {
    return (this.x.get([1]) as number) || 0;
  }

  /**
   * Get current position (state[0])
   */
  getPosition(): number {
    return this.x.get([0]) as number;
  }

  /**
   * Get position uncertainty (covariance[0,0])
   */
  getPositionUncertainty(): number {
    return this.P.get([0, 0]) as number;
  }

  /**
   * Get total uncertainty (trace of covariance matrix)
   */
  getTotalUncertainty(): number {
    const size = this.P.size();
    let trace = 0;
    for (let i = 0; i < size[0]; i++) {
      trace += this.P.get([i, i]) as number;
    }
    return trace;
  }

  /**
   * Create standard 2D Kalman filter for position/velocity tracking
   */
  static createPositionVelocity(
    dt: number,
    processNoise: number,
    obsNoise: number
  ): AdaptiveKalmanFilter {
    const F = matrix([
      [1, dt],
      [0, 1],
    ]);

    const H = matrix([[1, 0]]);

    const Q = matrix([
      [(processNoise * dt * dt) / 4, (processNoise * dt) / 2],
      [(processNoise * dt) / 2, processNoise],
    ]);

    const R = matrix([[obsNoise]]);

    return new AdaptiveKalmanFilter(dt, 2, 1, F, H, Q, Q, R);
  }

  /**
   * Create 3D Kalman filter for position/velocity/acceleration tracking
   */
  static createPositionVelocityAcceleration(
    dt: number,
    processNoise: number,
    obsNoise: number
  ): AdaptiveKalmanFilter {
    const F = matrix([
      [1, dt, 0.5 * dt * dt],
      [0, 1, dt],
      [0, 0, 1],
    ]);

    const H = matrix([[1, 0, 0]]);

    const Q = matrix([
      [
        (processNoise * dt * dt * dt * dt) / 36,
        (processNoise * dt * dt * dt) / 6,
        (processNoise * dt * dt) / 4,
      ],
      [
        (processNoise * dt * dt * dt) / 6,
        (processNoise * dt * dt) / 4,
        (processNoise * dt) / 2,
      ],
      [(processNoise * dt * dt) / 4, (processNoise * dt) / 2, processNoise],
    ]);

    const R = matrix([[obsNoise]]);

    return new AdaptiveKalmanFilter(dt, 3, 1, F, H, Q, Q, R);
  }
}

export default AdaptiveKalmanFilter;
