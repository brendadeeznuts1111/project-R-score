#!/usr/bin/env bun
// Advanced Tension Anomaly Detection Engine
import { setTimeout } from 'node:timers/promises';

interface AnomalyPattern {
  type: 'SPIKE' | 'DRIFT' | 'OSCILLATION' | 'CORRELATION_BREAK' | 'THRESHOLD_BREACH';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  description: string;
}

interface TensionVector {
  volume: number;
  link: number;
  profile: number;
  security: number;
  compliance: number;
  timestamp: number;
}

interface AnomalyDetectionResult {
  gameId: string;
  anomalies: AnomalyPattern[];
  riskScore: number;
  recommendations: string[];
  nextPrediction: TensionVector;
}

export class AdvancedAnomalyDetector {
  private history: TensionVector[] = [];
  private readonly MAX_HISTORY = 100;
  private readonly THRESHOLDS = {
    CRITICAL: 95,
    HIGH: 80,
    MEDIUM: 60,
    LOW: 40
  };

  addVector(vector: TensionVector): void {
    this.history.push(vector);
    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift();
    }
  }

  detectAnomalies(gameId: string, currentVector: TensionVector): AnomalyDetectionResult {
    this.addVector(currentVector);
    const anomalies: AnomalyPattern[] = [];

    // 1. Threshold breach detection
    anomalies.push(...this.detectThresholdBreaches(currentVector));

    // 2. Spike detection
    anomalies.push(...this.detectSpikes(currentVector));

    // 3. Drift detection
    anomalies.push(...this.detectDrift(currentVector));

    // 4. Oscillation detection
    anomalies.push(...this.detectOscillation());

    // 5. Correlation break detection
    anomalies.push(...this.detectCorrelationBreaks(currentVector));

    const riskScore = this.calculateRiskScore(anomalies);
    const recommendations = this.generateRecommendations(anomalies);
    const nextPrediction = this.predictNextVector(currentVector);

    return {
      gameId,
      anomalies,
      riskScore,
      recommendations,
      nextPrediction
    };
  }

  private detectThresholdBreaches(vector: TensionVector): AnomalyPattern[] {
    const anomalies: AnomalyPattern[] = [];

    const fields = [
      { name: 'volume', value: vector.volume },
      { name: 'link', value: vector.link },
      { name: 'profile', value: vector.profile },
      { name: 'security', value: vector.security },
      { name: 'compliance', value: vector.compliance }
    ];

    fields.forEach(field => {
      if (field.value >= this.THRESHOLDS.CRITICAL) {
        anomalies.push({
          type: 'THRESHOLD_BREACH',
          severity: 'CRITICAL',
          confidence: 0.95,
          description: `CRITICAL: ${field.name} field at ${field.value.toFixed(2)}%`
        });
      } else if (field.value >= this.THRESHOLDS.HIGH) {
        anomalies.push({
          type: 'THRESHOLD_BREACH',
          severity: 'HIGH',
          confidence: 0.85,
          description: `HIGH: ${field.name} field at ${field.value.toFixed(2)}%`
        });
      }
    });

    return anomalies;
  }

  private detectSpikes(vector: TensionVector): AnomalyPattern[] {
    if (this.history.length < 3) return [];

    const anomalies: AnomalyPattern[] = [];
    const recent = this.history.slice(-3);

    const fields = ['volume', 'link', 'profile', 'security', 'compliance'] as const;

    fields.forEach(field => {
      const values = recent.map(v => v[field]);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const current = vector[field];
      const spikeRatio = current / avg;

      if (spikeRatio > 2.0) {
        anomalies.push({
          type: 'SPIKE',
          severity: 'HIGH',
          confidence: Math.min(0.9, spikeRatio / 3),
          description: `SPIKE: ${field} jumped ${spikeRatio.toFixed(1)}x from average`
        });
      }
    });

    return anomalies;
  }

  private detectDrift(vector: TensionVector): AnomalyPattern[] {
    if (this.history.length < 10) return [];

    const anomalies: AnomalyPattern[] = [];
    const old = this.history.slice(-10, -5);
    const recent = this.history.slice(-5);

    const fields = ['volume', 'link', 'profile', 'security', 'compliance'] as const;

    fields.forEach(field => {
      const oldAvg = old.reduce((sum, v) => sum + v[field], 0) / old.length;
      const recentAvg = recent.reduce((sum, v) => sum + v[field], 0) / recent.length;
      const drift = Math.abs(recentAvg - oldAvg);

      if (drift > 30) {
        anomalies.push({
          type: 'DRIFT',
          severity: 'MEDIUM',
          confidence: Math.min(0.8, drift / 50),
          description: `DRIFT: ${field} drifted ${drift.toFixed(1)}% from baseline`
        });
      }
    });

    return anomalies;
  }

  private detectOscillation(): AnomalyPattern[] {
    if (this.history.length < 6) return [];

    const anomalies: AnomalyPattern[] = [];
    const recent = this.history.slice(-6);

    const fields = ['volume', 'link', 'profile', 'security', 'compliance'] as const;

    fields.forEach(field => {
      const values = recent.map(v => v[field]);
      const oscillations = this.countOscillations(values);

      if (oscillations >= 3) {
        anomalies.push({
          type: 'OSCILLATION',
          severity: 'MEDIUM',
          confidence: 0.7,
          description: `OSCILLATION: ${field} oscillating ${oscillations} times in recent history`
        });
      }
    });

    return anomalies;
  }

  private detectCorrelationBreaks(vector: TensionVector): AnomalyPattern[] {
    if (this.history.length < 5) return [];

    const anomalies: AnomalyPattern[] = [];

    // Normal correlation: volume and profile should be correlated
    const recent = this.history.slice(-5);
    const volumeProfileCorr = this.calculateCorrelation(
      recent.map(v => v.volume),
      recent.map(v => v.profile)
    );

    if (Math.abs(volumeProfileCorr) < 0.3) {
      anomalies.push({
        type: 'CORRELATION_BREAK',
        severity: 'LOW',
        confidence: 0.6,
        description: `CORRELATION_BREAK: Volume-Profile correlation broken (${volumeProfileCorr.toFixed(2)})`
      });
    }

    return anomalies;
  }

  private countOscillations(values: number[]): number {
    let oscillations = 0;
    for (let i = 2; i < values.length; i++) {
      if ((values[i] > values[i-1] && values[i-1] < values[i-2]) ||
          (values[i] < values[i-1] && values[i-1] > values[i-2])) {
        oscillations++;
      }
    }
    return oscillations;
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateRiskScore(anomalies: AnomalyPattern[]): number {
    const severityWeights = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    const totalScore = anomalies.reduce((sum, anomaly) => {
      return sum + (severityWeights[anomaly.severity] * anomaly.confidence);
    }, 0);

    return Math.min(100, totalScore * 10);
  }

  private generateRecommendations(anomalies: AnomalyPattern[]): string[] {
    const recommendations: string[] = [];

    const criticalAnomalies = anomalies.filter(a => a.severity === 'CRITICAL');
    const highAnomalies = anomalies.filter(a => a.severity === 'HIGH');

    if (criticalAnomalies.length > 0) {
      recommendations.push('🚨 IMMEDIATE ACTION REQUIRED: Critical tension levels detected');
      recommendations.push('Consider throttling traffic or activating emergency protocols');
    }

    if (highAnomalies.length > 0) {
      recommendations.push('⚠️ HIGH RISK: Monitor closely and prepare mitigation strategies');
    }

    const spikeAnomalies = anomalies.filter(a => a.type === 'SPIKE');
    if (spikeAnomalies.length > 0) {
      recommendations.push('📈 SPIKE DETECTED: Check for unusual traffic patterns or load bursts');
    }

    const driftAnomalies = anomalies.filter(a => a.type === 'DRIFT');
    if (driftAnomalies.length > 0) {
      recommendations.push('📊 DRIFT DETECTED: Review system configuration and baseline settings');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ System operating within normal parameters');
    }

    return recommendations;
  }

  private predictNextVector(current: TensionVector): TensionVector {
    // Simple linear prediction based on recent trend
    if (this.history.length < 3) return current;

    const recent = this.history.slice(-3);
    const trend = {
      volume: this.calculateTrend(recent.map(v => v.volume)),
      link: this.calculateTrend(recent.map(v => v.link)),
      profile: this.calculateTrend(recent.map(v => v.profile)),
      security: this.calculateTrend(recent.map(v => v.security)),
      compliance: this.calculateTrend(recent.map(v => v.compliance))
    };

    return {
      volume: Math.max(0, Math.min(100, current.volume + trend.volume)),
      link: Math.max(0, Math.min(100, current.link + trend.link)),
      profile: Math.max(0, Math.min(100, current.profile + trend.profile)),
      security: Math.max(0, Math.min(100, current.security + trend.security)),
      compliance: Math.max(0, Math.min(100, current.compliance + trend.compliance)),
      timestamp: Date.now() + 60000 // 1 minute ahead
    };
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    return (values[values.length - 1] - values[0]) / values.length;
  }
}

// CLI interface
if (import.meta.main) {
  const detector = new AdvancedAnomalyDetector();
  const gameId = process.argv[2] || 'enhanced-game';

  // Simulate some history
  for (let i = 0; i < 10; i++) {
    detector.addVector({
      volume: 30 + Math.random() * 20,
      link: 25 + Math.random() * 15,
      profile: 40 + Math.random() * 20,
      security: 20 + Math.random() * 10,
      compliance: 35 + Math.random() * 25,
      timestamp: Date.now() - (10 - i) * 60000
    });
  }

  // Current vector with some anomalies
  const currentVector: TensionVector = {
    volume: 85, // High
    link: 45,
    profile: 30,
    security: 95, // Critical
    compliance: 70,
    timestamp: Date.now()
  };

  const result = detector.detectAnomalies(gameId, currentVector);
  console.log(JSON.stringify(result, null, 2));
}
// [TENSION-VOLUME-001]
// [TENSION-LINK-002]
// [TENSION-PROFILE-003]
// [GOV-SECURITY-001]
// [GOV-COMPLIANCE-002]
