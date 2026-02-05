/**
 * Anomaly Detection Service
 * 
 * ML-based threat detection for session security
 * Monitors device behavior and flags suspicious patterns
 */

export interface AnomalyFeatures {
  root_detected: 0 | 1;           // Device rooted/jailbroken
  vpn_active: 0 | 1;              // VPN connection active
  thermal_spike: number;           // Temperature delta (°C)
  biometric_fail: number;          // Failed biometric attempts
  proxy_hop_count: number;         // Number of proxy hops
  location_change?: number;        // Distance from last known location (km)
  time_anomaly?: number;           // Unusual access time (0-1)
  device_fingerprint_mismatch?: 0 | 1;
  unusual_transaction_pattern?: 0 | 1;
  rapid_api_calls?: number;        // Requests per minute
}

export interface AnomalyScore {
  score: number;                   // 0-1 risk score
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: AnomalyFactor[];
  recommendation: string;
  blockSession: boolean;
}

export interface AnomalyFactor {
  name: string;
  weight: number;                  // 0-1
  contribution: number;            // Contribution to final score
  threshold: number;
  actual: number;
}

export class AnomalyDetector {
  // Feature weights (trained model coefficients)
  private readonly FEATURE_WEIGHTS = {
    root_detected: 0.25,
    vpn_active: 0.15,
    thermal_spike: 0.12,
    biometric_fail: 0.18,
    proxy_hop_count: 0.20,
    location_change: 0.10,
    time_anomaly: 0.08,
    device_fingerprint_mismatch: 0.22,
    unusual_transaction_pattern: 0.16,
    rapid_api_calls: 0.14,
  };

  // Risk thresholds
  private readonly THRESHOLDS = {
    thermal_spike: 15,              // °C
    biometric_fail: 3,              // attempts
    proxy_hop_count: 2,             // hops
    location_change: 500,           // km
    rapid_api_calls: 100,           // req/min
  };

  // Session risk scores
  private sessionRisks = new Map<string, number>();
  private sessionFeatures = new Map<string, AnomalyFeatures>();

  /**
   * Predict anomaly risk score for a session
   */
  async predict(features: AnomalyFeatures): Promise<AnomalyScore> {
    const factors: AnomalyFactor[] = [];
    let weightedSum = 0;
    let totalWeight = 0;

    // Process each feature
    const featureEntries = Object.entries(features) as [keyof AnomalyFeatures, any][];
    
    for (const [key, value] of featureEntries) {
      if (value === undefined || value === null) continue;

      const weight = this.FEATURE_WEIGHTS[key] || 0;
      const threshold = this.THRESHOLDS[key as keyof typeof this.THRESHOLDS] || 1;
      
      // Normalize feature to 0-1 range
      let normalized = 0;
      if (typeof value === 'number') {
        normalized = Math.min(1, Math.max(0, value / threshold));
      } else if (typeof value === 'boolean' || (value === 0 || value === 1)) {
        normalized = value ? 1 : 0;
      }

      const contribution = normalized * weight;
      weightedSum += contribution;
      totalWeight += weight;

      factors.push({
        name: key,
        weight,
        contribution,
        threshold,
        actual: value,
      });
    }

    // Calculate final score (0-1)
    const score = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // Determine risk level
    let level: 'low' | 'medium' | 'high' | 'critical';
    if (score < 0.3) level = 'low';
    else if (score < 0.6) level = 'medium';
    else if (score < 0.85) level = 'high';
    else level = 'critical';

    // Generate recommendation
    const recommendation = this.generateRecommendation(score, factors);
    const blockSession = score > 0.92;

    return {
      score,
      level,
      factors: factors.sort((a, b) => b.contribution - a.contribution),
      recommendation,
      blockSession,
    };
  }

  /**
   * Track session risk over time
   */
  trackSession(sessionId: string, features: AnomalyFeatures): void {
    this.sessionFeatures.set(sessionId, features);
    
    // Calculate cumulative risk
    const currentRisk = this.sessionRisks.get(sessionId) || 0;
    const newRisk = Object.values(features).reduce((sum, val) => {
      if (typeof val === 'number') return sum + val;
      return sum + (val ? 1 : 0);
    }, 0) / Object.keys(features).length;

    // Exponential moving average (EMA)
    const ema = currentRisk * 0.7 + newRisk * 0.3;
    this.sessionRisks.set(sessionId, ema);
  }

  /**
   * Get session risk history
   */
  getSessionRisk(sessionId: string): number {
    return this.sessionRisks.get(sessionId) || 0;
  }

  /**
   * Clear session data
   */
  clearSession(sessionId: string): void {
    this.sessionRisks.delete(sessionId);
    this.sessionFeatures.delete(sessionId);
  }

  /**
   * Generate human-readable recommendation
   */
  private generateRecommendation(score: number, factors: AnomalyFactor[]): string {
    if (score > 0.92) {
      return 'BLOCK: Critical anomaly detected - session terminated';
    }
    if (score > 0.85) {
      return 'CHALLENGE: Require additional verification (2FA, biometric)';
    }
    if (score > 0.6) {
      return 'MONITOR: Increased logging and rate limiting applied';
    }
    if (score > 0.3) {
      return 'CAUTION: Unusual activity detected - monitor closely';
    }
    return 'ALLOW: Normal session behavior';
  }

  /**
   * Batch predict for multiple sessions
   */
  async predictBatch(sessions: Array<{ id: string; features: AnomalyFeatures }>): Promise<Map<string, AnomalyScore>> {
    const results = new Map<string, AnomalyScore>();
    
    for (const { id, features } of sessions) {
      const score = await this.predict(features);
      results.set(id, score);
    }

    return results;
  }
}

export const anomalyDetector = new AnomalyDetector();

