/**
 * Pattern #75: In-Play Velocity Convexity - High-Performance Bun Implementation
 *
 * Late-game acceleration: velocity increases non-linearly with time remaining
 * Optimized for sub-5ms pattern detection in critical trading windows
 */

import { matrix } from "mathjs";
import { AdaptiveKalmanFilter } from "./adaptive_kalman.bun.ts";

export interface LateGameOpportunity {
  predictedPrice: number;
  edge: number;
  confidence: number;
  timeRemaining: number;
  windowDuration: number;
}

export class VelocityConvexityKF extends AdaptiveKalmanFilter {
  private accelCoefficient: number = 0.5; // NBA empirical: 0.5 pt/s² in last minute

  constructor(dt: number = 0.01) {
    // State: [position, velocity, acceleration, time_remaining]
    const F = matrix([
      [1, dt, 0.5 * dt * dt, 0],
      [0, 1, dt, 0],
      [0, 0, 1, -0.5 * dt], // Will be updated dynamically
      [0, 0, 0, 1],
    ]);

    const H = matrix([[1, 0, 0, 0]]);

    // Process noise matrices
    const Q_quiet = matrix([
      [0.001, 0, 0, 0],
      [0, 0.01, 0, 0],
      [0, 0, 0.1, 0],
      [0, 0, 0, 0.0001],
    ]);

    const Q_steam = matrix([
      [0.01, 0, 0, 0],
      [0, 0.1, 0, 0],
      [0, 0, 1.0, 0], // High process noise for acceleration (volatile)
      [0, 0, 0, 0.001],
    ]);

    const R = matrix([[0.05]]); // Observation noise

    super(dt, 4, 1, F, H, Q_quiet, Q_steam, R);
  }

  /**
   * Predict with time remaining injection for dynamic acceleration
   */
  override predict(timeRemaining?: number): void {
    // Set time remaining in state if provided
    if (timeRemaining !== undefined) {
      this.x.set([3], timeRemaining);

      // Update acceleration based on time remaining
      if (timeRemaining > 0) {
        // a(t) = k / t_remaining affects the transition matrix
        this.F.set([2, 3], -this.accelCoefficient / timeRemaining);
      }
    }

    super.predict();
  }

  /**
   * Detect late-game opportunity with 5-second prediction
   */
  detectLateGameOpportunity(observedPrice: number): LateGameOpportunity | null {
    const timeRemaining = this.x.get([3]) as number;

    // Only check in last 5 minutes
    if (timeRemaining < 300 && timeRemaining > 0) {
      // Predict 5s ahead using current kinematic state
      const dtForward = 5.0;
      const pos = this.x.get([0]) as number;
      const vel = this.x.get([1]) as number;
      const accel = this.x.get([2]) as number;

      // s(t+Δt) = s(t) + v(t)Δt + 0.5a(t)Δt²
      const predPos =
        pos + vel * dtForward + 0.5 * accel * dtForward * dtForward;

      // Check if prediction variance is low enough for trading
      const predVar = this.P.get([0, 0]) as number;
      if (predVar < 0.01) {
        const edge = Math.abs(predPos - observedPrice);
        const confidence = this.calculateConfidence(edge, predVar);

        return {
          predictedPrice: predPos,
          edge,
          confidence,
          timeRemaining,
          windowDuration: 5.0, // 5-second trading window
        };
      }
    }

    return null;
  }

  /**
   * Get convexity metrics for analysis
   */
  getConvexityMetrics(): {
    position: number;
    velocity: number;
    acceleration: number;
    timeRemaining: number;
  } {
    return {
      position: this.x.get([0]) as number,
      velocity: this.x.get([1]) as number,
      acceleration: this.x.get([2]) as number,
      timeRemaining: this.x.get([3]) as number,
    };
  }

  /**
   * Calculate confidence based on edge and uncertainty
   */
  private calculateConfidence(edge: number, variance: number): number {
    if (variance <= 0) return 0.5;

    const signalToNoise = edge / Math.sqrt(variance);
    return Math.min(0.95, Math.max(0.05, signalToNoise / (1 + signalToNoise)));
  }

  /**
   * Check if we're in optimal trading window (last 2 minutes with high convexity)
   */
  isOptimalTradingWindow(): boolean {
    const timeRemaining = this.x.get([3]) as number;
    const acceleration = this.x.get([2]) as number;

    // Last 2 minutes with significant acceleration
    return timeRemaining < 120 && Math.abs(acceleration) > 0.1;
  }

  /**
   * Get estimated edge decay over time
   */
  getEdgeDecay(secondsAhead: number): { edge: number; probability: number } {
    const currentEdge = Math.abs(this.x.get([2]) as number); // Use acceleration as edge proxy
    const uncertainty = this.P.get([0, 0]) as number;

    // Edge decays as time passes due to market efficiency
    const decayFactor = Math.exp(-secondsAhead / 30); // 30-second half-life
    const futureEdge = currentEdge * decayFactor;

    // Probability decreases with uncertainty and time
    const probability = Math.max(0.1, 1 - (uncertainty * secondsAhead) / 10);

    return {
      edge: futureEdge,
      probability,
    };
  }

  /**
   * Create optimized instance for NBA basketball
   */
  static createNBAInstance(): VelocityConvexityKF {
    const kf = new VelocityConvexityKF(0.01); // 10ms updates for basketball
    kf.accelCoefficient = 0.5; // NBA-specific acceleration
    kf.velocityThreshold = 0.2; // Lower threshold for basketball
    return kf;
  }

  /**
   * Create optimized instance for soccer
   */
  static createSoccerInstance(): VelocityConvexityKF {
    const kf = new VelocityConvexityKF(0.02); // 20ms updates for soccer
    kf.accelCoefficient = 0.3; // Lower acceleration for soccer
    kf.velocityThreshold = 0.15; // Lower threshold for soccer
    return kf;
  }
}

export default VelocityConvexityKF;
