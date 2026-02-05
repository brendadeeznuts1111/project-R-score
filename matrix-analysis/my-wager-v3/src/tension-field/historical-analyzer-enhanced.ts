#!/usr/bin/env bun
// Enhanced Historical Analyzer with Advanced Features
// [TENSION-ANALYTICS-001] [TENSION-ML-002] [TENSION-PREDICT-003]
// [TENSION-VOLUME-001] [TENSION-LINK-002] [TENSION-PROFILE-003]
// [GOV-SECURITY-001] [GOV-COMPLIANCE-002]

import { Database } from 'bun:sqlite';
import { write } from 'bun';
import { TensionGraphPropagator } from './propagate';

interface HistoricalPoint {
  timestamp: number;
  gameId: string;
  tensions: Record<string, number>;
  anomalies: string[];
  metadata: {
    decayRate: number;
    inertiaFactor: number;
    convergenceThreshold: number;
  };
}

interface EnhancedMetrics {
  volatilityIndex: number;
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  momentumScore: number;
  correlationMatrix: Record<string, Record<string, number>>;
  seasonalPattern: number[];
  riskScore: number;
  confidenceInterval: [number, number];
}

interface PredictionModel {
  modelType: 'linear' | 'polynomial' | 'neural';
  accuracy: number;
  nextPrediction: number;
  uncertainty: number;
}

class EnhancedHistoricalAnalyzer {
  private db: Database;
  private propagator: TensionGraphPropagator;
  private mlCache: Map<string, any>;

  constructor(dbPath: string = './tension-history-enhanced.db') {
    this.db = new Database(dbPath);
    this.propagator = new TensionGraphPropagator();
    this.mlCache = new Map();
    this.initializeDatabase();
  }

  private initializeDatabase() {
    // Create enhanced tables
    this.db.run(`
      CREATE TABLE IF NOT EXISTS historical_points (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        game_id TEXT NOT NULL,
        tensions TEXT NOT NULL,
        anomalies TEXT,
        decay_rate REAL,
        inertia_factor REAL,
        convergence_threshold REAL,
        volatility_index REAL,
        trend_direction TEXT,
        momentum_score REAL,
        risk_score REAL
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS predictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        model_type TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        target_timestamp INTEGER NOT NULL,
        predicted_value REAL NOT NULL,
        confidence REAL NOT NULL,
        actual_value REAL,
        accuracy REAL
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS correlations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        node_a TEXT NOT NULL,
        node_b TEXT NOT NULL,
        correlation_coefficient REAL NOT NULL,
        calculated_at INTEGER NOT NULL,
        UNIQUE(node_a, node_b)
      )
    `);
  }

  // [TENSION-ML-001] Advanced volatility calculation
  calculateVolatility(points: HistoricalPoint[], windowSize: number = 10): number[] {
    const volatilities: number[] = [];

    for (let i = windowSize; i < points.length; i++) {
      const window = points.slice(i - windowSize, i);
      const tensions = window.map(p => Object.values(p.tensions).reduce((a, b) => a + b, 0));

      const mean = tensions.reduce((a, b) => a + b, 0) / tensions.length;
      const variance = tensions.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / tensions.length;
      const volatility = Math.sqrt(variance);

      volatilities.push(volatility);
    }

    return volatilities;
  }

  // [TENSION-PREDICT-001] LSTM-like prediction using sliding window
  async predictNextTension(nodeId: string, historySize: number = 50): Promise<PredictionModel> {
    const cacheKey = `predict_${nodeId}_${historySize}`;

    if (this.mlCache.has(cacheKey)) {
      return this.mlCache.get(cacheKey);
    }

    const points = this.getRecentPoints(historySize);
    const tensions = points.map(p => p.tensions[nodeId] || 0);

    // Simple neural network approximation using weighted moving average
    const weights = this.calculateWeights(tensions.length);
    const prediction = tensions.reduce((sum, val, idx) => sum + val * weights[idx], 0);

    // Calculate uncertainty based on recent volatility
    const recentVolatility = this.calculateVolatility(points.slice(-10), 5);
    const uncertainty = recentVolatility.reduce((a, b) => a + b, 0) / recentVolatility.length;

    const model: PredictionModel = {
      modelType: 'neural',
      accuracy: Math.max(0.5, 1 - uncertainty / prediction),
      nextPrediction: prediction,
      uncertainty
    };

    this.mlCache.set(cacheKey, model);

    // Save prediction to database
    this.db.run(`
      INSERT INTO predictions (model_type, created_at, target_timestamp, predicted_value, confidence)
      VALUES (?, ?, ?, ?, ?)
    `, [
      model.modelType,
      Date.now(),
      Date.now() + 3600000, // 1 hour ahead
      model.nextPrediction,
      model.accuracy || 0.5 // Default confidence if null
    ]);

    return model;
  }

  private calculateWeights(size: number): number[] {
    // Exponential decay weights for recent data
    const weights: number[] = [];
    const alpha = 0.1;

    for (let i = 0; i < size; i++) {
      weights.push(Math.exp(-alpha * (size - i - 1)));
    }

    // Normalize weights
    const sum = weights.reduce((a, b) => a + b, 0);
    return weights.map(w => w / sum);
  }

  // [TENSION-CORRELATION-001] Dynamic correlation analysis
  calculateCorrelations(points: HistoricalPoint[]): Record<string, Record<string, number>> {
    const correlations: Record<string, Record<string, number>> = {};
    const nodes = new Set<string>();

    // Collect all node IDs
    points.forEach(p => Object.keys(p.tensions).forEach(node => nodes.add(node)));

    const nodeList = Array.from(nodes);

    // Calculate pairwise correlations
    for (let i = 0; i < nodeList.length; i++) {
      correlations[nodeList[i]] = {};

      for (let j = i + 1; j < nodeList.length; j++) {
        const nodeA = nodeList[i];
        const nodeB = nodeList[j];

        const tensionsA = points.map(p => p.tensions[nodeA] || 0);
        const tensionsB = points.map(p => p.tensions[nodeB] || 0);

        const correlation = this.pearsonCorrelation(tensionsA, tensionsB);

        correlations[nodeA][nodeB] = correlation;
        correlations[nodeB] = correlations[nodeB] || {};
        correlations[nodeB][nodeA] = correlation;

        // Store in database
        this.db.run(`
          INSERT OR REPLACE INTO correlations (node_a, node_b, correlation_coefficient, calculated_at)
          VALUES (?, ?, ?, ?)
        `, [nodeA, nodeB, correlation, Date.now()]);
      }
    }

    return correlations;
  }

  private pearsonCorrelation(x: number[], y: number[]): number {
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

  // [TENSION-ANOMALY-DETECT-001] Advanced anomaly detection
  detectAnomalies(points: HistoricalPoint[]): Array<{point: HistoricalPoint, score: number, type: string}> {
    const anomalies: Array<{point: HistoricalPoint, score: number, type: string}> = [];

    points.forEach((point, index) => {
      if (index < 10) return; // Need history for comparison

      const recentPoints = points.slice(index - 10, index);
      const avgTension = recentPoints.reduce((sum, p) =>
        sum + Object.values(p.tensions).reduce((a, b) => a + b, 0), 0
      ) / recentPoints.length;

      const currentTension = Object.values(point.tensions).reduce((a, b) => a + b, 0);
      const deviation = Math.abs(currentTension - avgTension) / avgTension;

      // Detect different types of anomalies
      if (deviation > 0.5) {
        anomalies.push({
          point,
          score: deviation,
          type: deviation > 1 ? 'SPIKE' : 'GRADUAL'
        });
      }
    });

    return anomalies;
  }

  // [TENSION-SEASONAL-001] Seasonal pattern detection
  detectSeasonalPatterns(points: HistoricalPoint[], period: number = 24): number[] {
    const patterns: number[] = new Array(period).fill(0);
    const counts: number[] = new Array(period).fill(0);

    points.forEach(point => {
      const hour = new Date(point.timestamp).getHours();
      const tension = Object.values(point.tensions).reduce((a, b) => a + b, 0);

      patterns[hour] += tension;
      counts[hour]++;
    });

    // Normalize patterns
    for (let i = 0; i < period; i++) {
      if (counts[i] > 0) {
        patterns[i] /= counts[i];
      }
    }

    return patterns;
  }

  // [TENSION-RISK-001] Comprehensive risk assessment
  async assessRisk(nodeId: string): Promise<{
    currentRisk: number;
    riskFactors: string[];
    mitigation: string[];
  }> {
    const recentPoints = this.getRecentPoints(100);
    const predictions = await this.predictNextTension(nodeId);
    const anomalies = this.detectAnomalies(recentPoints);

    let riskScore = 0;
    const riskFactors: string[] = [];
    const mitigation: string[] = [];

    // Factor 1: Prediction uncertainty
    if (predictions.uncertainty > 0.3) {
      riskScore += 0.3;
      riskFactors.push('High prediction uncertainty');
      mitigation.push('Increase data sampling frequency');
    }

    // Factor 2: Recent anomalies
    const recentAnomalies = anomalies.filter(a =>
      Date.now() - a.point.timestamp < 3600000 // Last hour
    );

    if (recentAnomalies.length > 2) {
      riskScore += 0.4;
      riskFactors.push('Multiple recent anomalies');
      mitigation.push('Implement circuit breaker pattern');
    }

    // Factor 3: Volatility
    const volatilities = this.calculateVolatility(recentPoints);
    const avgVolatility = volatilities.reduce((a, b) => a + b, 0) / volatilities.length;

    if (avgVolatility > 10) {
      riskScore += 0.3;
      riskFactors.push('High volatility detected');
      mitigation.push('Apply smoothing algorithms');
    }

    return {
      currentRisk: Math.min(riskScore, 1),
      riskFactors,
      mitigation
    };
  }

  private getRecentPoints(limit: number): HistoricalPoint[] {
    const stmt = this.db.prepare(`
      SELECT * FROM historical_points
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    const rows = stmt.all(limit) as any[];

    return rows.map((row: any) => ({
      timestamp: row.timestamp,
      gameId: row.game_id,
      tensions: JSON.parse(row.tensions),
      anomalies: JSON.parse(row.anomalies || '[]'),
      metadata: {
        decayRate: row.decay_rate,
        inertiaFactor: row.inertia_factor,
        convergenceThreshold: row.convergence_threshold
      }
    })).reverse();
  }

  // [TENSION-EXPORT-001] Export enhanced analytics
  async exportEnhancedReport(filename: string): Promise<void> {
    const points = this.getRecentPoints(1000);
    const correlations = this.calculateCorrelations(points);
    const seasonalPatterns = this.detectSeasonalPatterns(points);

    const report = {
      timestamp: Date.now(),
      summary: {
        totalPoints: points.length,
        timeRange: {
          start: points[0]?.timestamp,
          end: points[points.length - 1]?.timestamp
        }
      },
      analytics: {
        volatility: this.calculateVolatility(points),
        correlations,
        seasonalPatterns,
        anomalies: this.detectAnomalies(points)
      },
      predictions: {},
      riskAssessment: {}
    };

    // Generate predictions for key nodes
    const keyNodes = Object.keys(correlations).slice(0, 5);
    for (const node of keyNodes) {
      (report.predictions as any)[node] = await this.predictNextTension(node);
      (report.riskAssessment as any)[node] = await this.assessRisk(node);
    }

    await write(filename, JSON.stringify(report, null, 2));
    console.log(`📊 Enhanced report exported to ${filename}`);
  }
}

// CLI Interface
if (import.meta.main) {
  const analyzer = new EnhancedHistoricalAnalyzer();
  const command = process.argv[2];

  switch (command) {
    case 'predict':
      const nodeId = process.argv[3] || 'node-0';
      const prediction = await analyzer.predictNextTension(nodeId);
      console.log(`🔮 Prediction for ${nodeId}:`);
      console.log(`  Next value: ${prediction.nextPrediction.toFixed(4)}`);
      console.log(`  Confidence: ${(prediction.accuracy * 100).toFixed(1)}%`);
      console.log(`  Uncertainty: ${prediction.uncertainty.toFixed(4)}`);
      break;

    case 'risk':
      const riskNode = process.argv[3] || 'node-0';
      const risk = await analyzer.assessRisk(riskNode);
      console.log(`⚠️ Risk assessment for ${riskNode}:`);
      console.log(`  Risk score: ${(risk.currentRisk * 100).toFixed(1)}%`);
      console.log(`  Factors: ${risk.riskFactors.join(', ')}`);
      console.log(`  Mitigation: ${risk.mitigation.join(', ')}`);
      break;

    case 'export':
      const exportFile = process.argv[3] || `tension-enhanced-${Date.now()}.json`;
      await analyzer.exportEnhancedReport(exportFile);
      break;

    default:
      console.log(`
Enhanced Historical Analyzer Commands:
  predict <node>    - Predict next tension value
  risk <node>       - Assess risk for node
  export <file>     - Export enhanced analytics report
      `);
  }
}

export { EnhancedHistoricalAnalyzer };
export type { HistoricalPoint, EnhancedMetrics, PredictionModel };
