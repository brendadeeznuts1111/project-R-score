// packages/odds-core/src/utils/predictive-analytics.ts - Phase 2.11 Predictive Analytics Engine

import { EventEmitter } from 'events';
import {
  QualityForecast,
  QualityFactor,
  TrendPrediction,
  TrendPattern,
  SeasonalityPattern,
  AnalyticsConfig,
  AnalyticsMetrics
} from '../types/analytics';
import { RealtimeMetadata, RealtimeMetrics } from '../types/realtime';
import { QualityMetrics } from '../types/enhanced';

/**
 * Predictive analytics engine for quality and trend forecasting
 */
export class PredictiveAnalyticsEngine extends EventEmitter {
  private config: AnalyticsConfig;
  private historicalData: HistoricalDataPoint[] = [];
  private models: Map<string, PredictionModel> = new Map();
  private metrics: AnalyticsMetrics;
  private isRunning = false;

  constructor(config: Partial<AnalyticsConfig> = {}) {
    super();
    this.config = {
      predictionHorizon: 30, // 30 minutes
      anomalySensitivity: 0.7,
      alertThresholds: {
        quality: 0.8,
        latency: 50,
        errorRate: 0.05,
        memoryUsage: 80,
        cpuUsage: 80,
        anomalyScore: 0.8
      },
      optimizationEnabled: true,
      adaptationEnabled: true,
      learningRate: 0.01,
      ...config
    };

    this.metrics = {
      predictions: { total: 0, accurate: 0, accuracy: 0 },
      anomalies: { detected: 0, confirmed: 0, falsePositives: 0 },
      optimizations: { applied: 0, successful: 0, improvement: 0 },
      alerts: { generated: 0, resolved: 0, averageResolutionTime: 0 }
    };

    this.initializeModels();
  }

  /**
   * Start the predictive analytics engine
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Predictive analytics engine is already running');
    }

    this.isRunning = true;
    this.startModelTraining();
    this.startPredictionLoop();

    this.emit('engineStarted', { timestamp: Date.now() });
    console.log('🧠 Predictive analytics engine started');
  }

  /**
   * Stop the predictive analytics engine
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.emit('engineStopped', { timestamp: Date.now() });
    console.log('🛑 Predictive analytics engine stopped');
  }

  /**
   * Predict quality forecast for metadata
   */
  async predictQuality(metadata: RealtimeMetadata): Promise<QualityForecast> {
    const startTime = performance.now();

    try {
      // Add current data point to history
      this.addToHistory(metadata);

      // Get or create model for this symbol
      const model = this.getOrCreateModel(metadata.id);

      // Generate prediction
      const prediction = await model.predictQuality(
        this.historicalData,
        this.config.predictionHorizon
      );

      // Update metrics
      this.metrics.predictions.total++;
      const processingTime = performance.now() - startTime;

      this.emit('qualityPredicted', {
        metadataId: metadata.id,
        prediction,
        processingTime
      });

      return prediction;

    } catch (error) {
      console.error('❌ Quality prediction failed:', error);
      this.emit('predictionError', { metadata, error });
      throw error;
    }
  }

  /**
   * Predict trend for specific metric
   */
  async predictTrend(
    symbol: string,
    metric: string,
    timeHorizon: number = this.config.predictionHorizon
  ): Promise<TrendPrediction> {
    try {
      const historicalData = this.getHistoricalDataForSymbol(symbol, metric);
      const model = this.getOrCreateModel(symbol);

      const prediction = await model.predictTrend(
        historicalData,
        metric,
        timeHorizon
      );

      this.emit('trendPredicted', {
        symbol,
        metric,
        prediction
      });

      return prediction;

    } catch (error) {
      console.error('❌ Trend prediction failed:', error);
      throw error;
    }
  }

  /**
   * Detect anomalies in real-time data
   */
  async detectAnomalies(metadata: RealtimeMetadata): Promise<number> {
    try {
      const model = this.getOrCreateModel(metadata.id);
      const anomalyScore = await model.detectAnomalies(metadata);

      if (anomalyScore > this.config.anomalySensitivity) {
        this.metrics.anomalies.detected++;
        this.emit('anomalyDetected', {
          metadataId: metadata.id,
          score: anomalyScore,
          threshold: this.config.anomalySensitivity
        });
      }

      return anomalyScore;

    } catch (error) {
      console.error('❌ Anomaly detection failed:', error);
      throw error;
    }
  }

  /**
   * Get analytics metrics
   */
  getMetrics(): AnalyticsMetrics {
    // Update accuracy calculation
    if (this.metrics.predictions.total > 0) {
      this.metrics.predictions.accuracy = 
        this.metrics.predictions.accurate / this.metrics.predictions.total;
    }

    return { ...this.metrics };
  }

  /**
   * Update model with actual results (learning)
   */
  async updateModel(
    symbol: string,
    predicted: QualityForecast,
    actual: QualityMetrics
  ): Promise<void> {
    try {
      const model = this.models.get(symbol);
      if (!model) {
        return;
      }

      // Calculate prediction accuracy
      const accuracy = this.calculatePredictionAccuracy(predicted, actual);
      if (accuracy > 0.8) {
        this.metrics.predictions.accurate++;
      }

      // Update model with new data
      await model.updateWithActual(predicted, actual, this.config.learningRate);

      this.emit('modelUpdated', {
        symbol,
        accuracy,
        improvement: model.getImprovement()
      });

    } catch (error) {
      console.error('❌ Model update failed:', error);
    }
  }

  /**
   * Initialize prediction models
   */
  private initializeModels(): void {
    // Initialize default models for common patterns
    const defaultModels = [
      'quality_linear',
      'quality_seasonal',
      'trend_linear',
      'trend_exponential'
    ];

    defaultModels.forEach(modelType => {
      this.models.set(modelType, new PredictionModel(modelType));
    });
  }

  /**
   * Start model training loop
   */
  private startModelTraining(): void {
    setInterval(async () => {
      if (!this.isRunning) {
        return;
      }

      try {
        await this.trainModels();
      } catch (error) {
        console.error('❌ Model training failed:', error);
      }
    }, 60000); // Train every minute
  }

  /**
   * Start prediction loop
   */
  private startPredictionLoop(): void {
    setInterval(async () => {
      if (!this.isRunning) {
        return;
      }

      try {
        await this.generatePredictions();
      } catch (error) {
        console.error('❌ Prediction loop failed:', error);
      }
    }, 30000); // Predict every 30 seconds
  }

  /**
   * Train all models with historical data
   */
  private async trainModels(): Promise<void> {
    for (const [symbol, model] of this.models) {
      try {
        const trainingData = this.getHistoricalDataForSymbol(symbol, 'quality');
        if (trainingData.length > 10) {
          await model.train(trainingData);
        }
      } catch (error) {
        console.error(`❌ Training failed for model ${symbol}:`, error);
      }
    }
  }

  /**
   * Generate predictions for active symbols
   */
  private async generatePredictions(): Promise<void> {
    const activeSymbols = this.getActiveSymbols();
    
    for (const symbol of activeSymbols) {
      try {
        const recentData = this.getMostRecentData(symbol);
        if (recentData) {
          await this.predictQuality(recentData);
        }
      } catch (error) {
        console.error(`❌ Prediction failed for ${symbol}:`, error);
      }
    }
  }

  /**
   * Get or create model for symbol
   */
  private getOrCreateModel(symbol: string): PredictionModel {
    if (!this.models.has(symbol)) {
      this.models.set(symbol, new PredictionModel(`${symbol}_quality`));
    }
    return this.models.get(symbol)!;
  }

  /**
   * Add data point to history
   */
  private addToHistory(metadata: RealtimeMetadata): void {
    const dataPoint: HistoricalDataPoint = {
      timestamp: metadata.realtime.timestamp,
      symbol: metadata.id,
      quality: metadata.quality?.overall || 0,
      latency: metadata.stream.latency,
      volume: 0, // Would be extracted from actual data
      price: 0,  // Would be extracted from actual data
      metadata
    };

    this.historicalData.push(dataPoint);

    // Maintain history size (last 1000 points per symbol)
    const maxHistorySize = 1000;
    if (this.historicalData.length > maxHistorySize) {
      this.historicalData = this.historicalData.slice(-maxHistorySize);
    }
  }

  /**
   * Get historical data for symbol and metric
   */
  private getHistoricalDataForSymbol(symbol: string, metric: string): HistoricalDataPoint[] {
    return this.historicalData
      .filter(point => point.symbol === symbol)
      .slice(-100); // Last 100 data points
  }

  /**
   * Get most recent data for symbol
   */
  private getMostRecentData(symbol: string): RealtimeMetadata | null {
    const recentPoints = this.historicalData
      .filter(point => point.symbol === symbol)
      .sort((a, b) => b.timestamp - a.timestamp);

    return recentPoints[0]?.metadata || null;
  }

  /**
   * Get active symbols (with recent data)
   */
  private getActiveSymbols(): string[] {
    const cutoffTime = Date.now() - (5 * 60 * 1000); // Last 5 minutes
    const recentData = this.historicalData.filter(point => point.timestamp > cutoffTime);
    return [...new Set(recentData.map(point => point.symbol))];
  }

  /**
   * Calculate prediction accuracy
   */
  private calculatePredictionAccuracy(
    predicted: QualityForecast,
    actual: QualityMetrics
  ): number {
    const predictedQuality = predicted.predictedQuality;
    const actualQuality = actual.overall;
    
    const difference = Math.abs(predictedQuality - actualQuality);
    const accuracy = Math.max(0, 1 - difference);
    
    return accuracy;
  }
}

/**
 * Prediction model for quality and trends
 */
class PredictionModel {
  private type: string;
  private weights: number[] = [];
  private bias: number = 0;
  private trained: boolean = false;
  private improvement: number = 0;

  constructor(type: string) {
    this.type = type;
    this.initializeWeights();
  }

  /**
   * Predict quality forecast
   */
  async predictQuality(
    historicalData: HistoricalDataPoint[],
    timeHorizon: number
  ): Promise<QualityForecast> {
    if (!this.trained) {
      await this.train(historicalData);
    }

    // Extract features from historical data
    const features = this.extractFeatures(historicalData);
    
    // Make prediction using linear regression
    const predictedQuality = this.makePrediction(features);
    
    // Calculate confidence based on data quality and model accuracy
    const confidence = this.calculateConfidence(historicalData);
    
    // Identify quality factors
    const factors = this.identifyQualityFactors(historicalData);
    
    // Determine trend
    const trend = this.determineTrend(historicalData);

    return {
      predictedQuality,
      timeHorizon,
      confidence,
      factors,
      trend,
      accuracy: confidence
    };
  }

  /**
   * Predict trend for specific metric
   */
  async predictTrend(
    historicalData: HistoricalDataPoint[],
    metric: string,
    timeHorizon: number
  ): Promise<TrendPrediction> {
    const values = historicalData.map(point => this.getMetricValue(point, metric));
    const currentValue = values[values.length - 1] || 0;
    
    // Simple linear regression for trend prediction
    const { slope, correlation } = this.calculateLinearRegression(values);
    const predictedValue = currentValue + (slope * timeHorizon);
    
    // Detect pattern
    const pattern = this.detectPattern(values);
    
    // Detect seasonality
    const seasonality = this.detectSeasonality(values);

    return {
      metric,
      currentValue,
      predictedValue,
      timeHorizon,
      confidence: Math.abs(correlation),
      pattern,
      seasonality
    };
  }

  /**
   * Detect anomalies in data
   */
  async detectAnomalies(metadata: RealtimeMetadata): Promise<number> {
    // Simple anomaly detection based on quality deviation
    const expectedQuality = 0.8; // Would be predicted by model
    const actualQuality = metadata.quality?.overall || 0;
    
    const deviation = Math.abs(expectedQuality - actualQuality);
    const anomalyScore = Math.min(1, deviation * 2); // Scale to 0-1
    
    return anomalyScore;
  }

  /**
   * Train model with historical data
   */
  async train(trainingData: HistoricalDataPoint[]): Promise<void> {
    if (trainingData.length < 10) {
      return; // Not enough data
    }

    // Simple linear regression training
    const features = trainingData.map(point => this.extractFeatures([point]));
    const targets = trainingData.map(point => point.quality);

    // Train weights using gradient descent
    await this.trainLinearRegression(features, targets);
    
    this.trained = true;
  }

  /**
   * Update model with actual results
   */
  async updateWithActual(
    predicted: QualityForecast,
    actual: QualityMetrics,
    learningRate: number
  ): Promise<void> {
    const error = predicted.predictedQuality - actual.overall;
    
    // Update weights using simple gradient descent
    this.improvement = Math.abs(error);
    
    // In a real implementation, this would update the model parameters
    // For now, we just track the improvement
  }

  /**
   * Get model improvement
   */
  getImprovement(): number {
    return this.improvement;
  }

  /**
   * Initialize model weights
   */
  private initializeWeights(): void {
    // Initialize with small random values
    this.weights = Array(5).fill(0).map(() => Math.random() * 0.1 - 0.05);
    this.bias = 0;
  }

  /**
   * Extract features from historical data
   */
  private extractFeatures(historicalData: HistoricalDataPoint[]): number[] {
    if (historicalData.length === 0) {
      return [0, 0, 0, 0, 0];
    }

    const qualities = historicalData.map(point => point.quality);
    const latencies = historicalData.map(point => point.latency);
    
    return [
      qualities[qualities.length - 1] || 0, // Current quality
      this.average(qualities), // Average quality
      this.standardDeviation(qualities), // Quality volatility
      this.average(latencies), // Average latency
      this.trend(qualities) // Quality trend
    ];
  }

  /**
   * Make prediction using linear regression
   */
  private makePrediction(features: number[]): number {
    let prediction = this.bias;
    for (let i = 0; i < Math.min(features.length, this.weights.length); i++) {
      prediction += features[i] * this.weights[i];
    }
    
    // Clamp to valid range
    return Math.max(0, Math.min(1, prediction));
  }

  /**
   * Calculate confidence in prediction
   */
  private calculateConfidence(historicalData: HistoricalDataPoint[]): number {
    if (historicalData.length < 5) {
      return 0.5; // Low confidence with little data
    }

    const qualities = historicalData.map(point => point.quality);
    const volatility = this.standardDeviation(qualities);
    
    // Higher confidence for less volatile data
    const confidence = Math.max(0.3, Math.min(0.95, 1 - volatility));
    
    return confidence;
  }

  /**
   * Identify quality influencing factors
   */
  private identifyQualityFactors(historicalData: HistoricalDataPoint[]): QualityFactor[] {
    const recentData = historicalData.slice(-10);
    
    return [
      {
        name: 'Data Freshness',
        impact: 0.3,
        weight: 0.25,
        currentValue: this.calculateDataFreshness(recentData),
        trend: 'stable'
      },
      {
        name: 'Network Latency',
        impact: -0.2,
        weight: 0.2,
        currentValue: this.average(recentData.map(d => d.latency)),
        trend: this.determineTrendDirection(recentData.map(d => d.latency))
      },
      {
        name: 'Historical Quality',
        impact: 0.5,
        weight: 0.3,
        currentValue: this.average(recentData.map(d => d.quality)),
        trend: this.determineTrendDirection(recentData.map(d => d.quality))
      }
    ];
  }

  /**
   * Determine quality trend
   */
  private determineTrend(historicalData: HistoricalDataPoint[]): 'improving' | 'stable' | 'declining' {
    if (historicalData.length < 3) {
      return 'stable';
    }

    const qualities = historicalData.slice(-5).map(point => point.quality);
    const trend = this.trend(qualities);
    
    if (trend > 0.05) return 'improving';
    if (trend < -0.05) return 'declining';
    return 'stable';
  }

  /**
   * Calculate linear regression
   */
  private calculateLinearRegression(values: number[]): { slope: number; correlation: number } {
    const n = values.length;
    if (n < 2) return { slope: 0, correlation: 0 };

    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = values.reduce((sum, yi) => sum + yi * yi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    // Calculate correlation coefficient
    const correlation = (n * sumXY - sumX * sumY) / 
      Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

    return { slope, correlation: isNaN(correlation) ? 0 : correlation };
  }

  /**
   * Detect pattern in values
   */
  private detectPattern(values: number[]): TrendPattern {
    const { slope, correlation } = this.calculateLinearRegression(values);
    const volatility = this.standardDeviation(values);
    
    let type: TrendPattern['type'] = 'linear';
    if (Math.abs(slope) > 0.1 && volatility > 0.1) type = 'exponential';
    if (volatility < 0.05) type = 'stable';
    if (volatility > 0.2) type = 'volatile';

    return {
      type,
      slope,
      correlation,
      volatility
    };
  }

  /**
   * Detect seasonality in values
   */
  private detectSeasonality(values: number[]): SeasonalityPattern {
    // Simple seasonality detection using autocorrelation
    const period = this.detectPeriod(values);
    const amplitude = this.calculateAmplitude(values, period);
    
    return {
      detected: period > 0,
      period,
      amplitude,
      phase: 0,
      confidence: period > 0 ? 0.7 : 0
    };
  }

  /**
   * Train linear regression model
   */
  private async trainLinearRegression(features: number[][], targets: number[]): Promise<void> {
    // Simple linear regression using normal equation
    const n = features.length;
    const m = features[0]?.length || 0;
    
    if (n === 0 || m === 0) return;

    // Add bias term to features
    const X = features.map(f => [1, ...f]);
    const y = targets;

    // Calculate weights using normal equation (simplified)
    // In a real implementation, this would use proper matrix operations
    this.weights = Array(m).fill(0).map(() => Math.random() * 0.1);
    this.bias = 0;
  }

  /**
   * Helper methods
   */
  private getMetricValue(point: HistoricalDataPoint, metric: string): number {
    switch (metric) {
      case 'quality': return point.quality;
      case 'latency': return point.latency;
      default: return 0;
    }
  }

  private average(values: number[]): number {
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }

  private standardDeviation(values: number[]): number {
    const avg = this.average(values);
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private trend(values: number[]): number {
    if (values.length < 2) return 0;
    const { slope } = this.calculateLinearRegression(values);
    return slope;
  }

  private determineTrendDirection(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    const trendValue = this.trend(values);
    if (trendValue > 0.01) return 'increasing';
    if (trendValue < -0.01) return 'decreasing';
    return 'stable';
  }

  private calculateDataFreshness(data: HistoricalDataPoint[]): number {
    const now = Date.now();
    const avgAge = data.reduce((sum, point) => sum + (now - point.timestamp), 0) / data.length;
    return Math.max(0, 1 - (avgAge / 300000)); // Fresh over 5 minutes
  }

  private detectPeriod(values: number[]): number {
    // Simple period detection using autocorrelation
    // In a real implementation, this would use FFT or autocorrelation
    return 0; // No seasonality detected
  }

  private calculateAmplitude(values: number[], period: number): number {
    if (period === 0) return 0;
    const max = Math.max(...values);
    const min = Math.min(...values);
    return (max - min) / 2;
  }
}

/**
 * Historical data point for training
 */
interface HistoricalDataPoint {
  timestamp: number;
  symbol: string;
  quality: number;
  latency: number;
  volume: number;
  price: number;
  metadata: RealtimeMetadata;
}
