/**
 * Model Training System - Continuous Learning and Model Updating
 * Implements online learning, model versioning, and performance tracking
 */

import { BehaviorPredictionModel } from './prediction-model';
import { PatternAnalyzer } from './pattern-analyzer';
import { BehaviorTracker } from './behavior-tracker';

export interface TrainingConfig {
  enabled: boolean;
  batchSize: number;
  learningRate: number;
  updateInterval: number;
  minTrainingData: number;
  validationSplit: number;
  earlyStoppingPatience: number;
  modelVersioning: boolean;
  performanceTracking: boolean;
  adaptiveLearningRate: boolean;
}

export interface ModelVersion {
  id: string;
  algorithm: string;
  version: string;
  createdAt: number;
  trainedOn: number; // number of samples
  performance: ModelPerformance;
  config: any;
  isActive: boolean;
}

export interface ModelPerformance {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc?: number;
  trainingTime: number;
  lastUpdated: number;
}

export interface TrainingMetrics {
  totalSamples: number;
  trainingSessions: number;
  averageTrainingTime: number;
  modelVersions: number;
  lastTrainingDate: number;
  performanceTrend: 'improving' | 'stable' | 'degrading';
}

export class ModelTrainingSystem {
  private predictionModel: BehaviorPredictionModel;
  private patternAnalyzer: PatternAnalyzer;
  private behaviorTracker: BehaviorTracker;

  private config: TrainingConfig;
  private isTraining: boolean = false;
  private trainingInterval?: NodeJS.Timeout;

  private modelVersions: Map<string, ModelVersion[]> = new Map();
  private currentVersions: Map<string, string> = new Map(); // algorithm -> versionId
  private trainingHistory: TrainingSession[] = [];
  private performanceHistory: Map<string, ModelPerformance[]> = new Map();

  private dataBuffer: any[] = [];
  private maxBufferSize: number = 1000;

  constructor(
    predictionModel: BehaviorPredictionModel,
    patternAnalyzer: PatternAnalyzer,
    behaviorTracker: BehaviorTracker,
    config: Partial<TrainingConfig> = {}
  ) {
    this.predictionModel = predictionModel;
    this.patternAnalyzer = patternAnalyzer;
    this.behaviorTracker = behaviorTracker;

    this.config = {
      enabled: true,
      batchSize: 100,
      learningRate: 0.01,
      updateInterval: 3600000, // 1 hour
      minTrainingData: 500,
      validationSplit: 0.2,
      earlyStoppingPatience: 5,
      modelVersioning: true,
      performanceTracking: true,
      adaptiveLearningRate: true,
      ...config
    };
  }

  /**
   * Start continuous model training
   */
  startContinuousTraining(userId: string): void {
    if (this.isTraining) {
      console.warn('Continuous training is already active');
      return;
    }

    console.log('🚀 Starting continuous model training for user:', userId);

    this.isTraining = true;

    // Start training loop
    this.trainingInterval = setInterval(() => {
      this.performTrainingCycle(userId);
    }, this.config.updateInterval);

    // Set up data collection
    this.setupDataCollection(userId);

    this.logTrainingEvent('trainingStarted', { userId, timestamp: Date.now() });
  }

  /**
   * Stop continuous model training
   */
  stopContinuousTraining(): void {
    if (!this.isTraining) return;

    console.log('⏹️ Stopping continuous model training');

    if (this.trainingInterval) {
      clearInterval(this.trainingInterval);
      this.trainingInterval = undefined;
    }

    this.isTraining = false;
    this.logTrainingEvent('trainingStopped', { timestamp: Date.now() });
  }

  /**
   * Perform a complete training cycle
   */
  private async performTrainingCycle(userId: string): Promise<void> {
    const startTime = Date.now();

    try {
      this.logTrainingEvent('trainingCycleStarted', { userId, timestamp: startTime });

      // Check if we have enough data
      if (this.dataBuffer.length < this.config.minTrainingData) {
        this.logTrainingEvent('insufficientData', {
          userId,
          bufferSize: this.dataBuffer.length,
          required: this.config.minTrainingData
        });
        return;
      }

      // Prepare training data
      const trainingData = this.prepareTrainingData();

      // Train models
      await this.trainModels(userId, trainingData);

      // Evaluate and compare models
      await this.evaluateModels(userId, trainingData);

      // Update model versions
      this.updateModelVersions(userId);

      // Clean up old data
      this.cleanupTrainingData();

      const duration = Date.now() - startTime;
      this.logTrainingEvent('trainingCycleCompleted', {
        userId,
        duration,
        samplesProcessed: trainingData.length,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Error in training cycle:', error);
      this.logTrainingEvent('trainingError', {
        userId,
        error: error.message,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Prepare training data from buffer
   */
  private prepareTrainingData(): any[] {
    // Take a batch of data for training
    const batchSize = Math.min(this.config.batchSize, this.dataBuffer.length);
    const trainingData = this.dataBuffer.slice(-batchSize);

    // Split into training and validation
    const validationSize = Math.floor(trainingData.length * this.config.validationSplit);
    const validationData = trainingData.slice(-validationSize);
    const finalTrainingData = trainingData.slice(0, -validationSize);

    return finalTrainingData;
  }

  /**
   * Train all available models
   */
  private async trainModels(userId: string, trainingData: any[]): Promise<void> {
    const availableModels = this.predictionModel.getAvailableModels();

    for (const algorithm of availableModels) {
      try {
        const trainingStart = Date.now();

        // Configure model for this algorithm
        const modelConfig = this.getModelConfig(algorithm);

        // Train the model
        await this.predictionModel.trainModel(userId, trainingData, {
          algorithm: algorithm as any,
          ...modelConfig
        });

        const trainingTime = Date.now() - trainingStart;

        // Create model version
        if (this.config.modelVersioning) {
          this.createModelVersion(userId, algorithm, trainingData.length, trainingTime);
        }

        this.logTrainingEvent('modelTrained', {
          userId,
          algorithm,
          trainingTime,
          sampleCount: trainingData.length,
          timestamp: Date.now()
        });

      } catch (error) {
        console.error(`Error training ${algorithm} model:`, error);
        this.logTrainingEvent('modelTrainingError', {
          userId,
          algorithm,
          error: error.message,
          timestamp: Date.now()
        });
      }
    }
  }

  /**
   * Evaluate trained models
   */
  private async evaluateModels(userId: string, trainingData: any[]): Promise<void> {
    const availableModels = this.predictionModel.getAvailableModels();

    for (const algorithm of availableModels) {
      try {
        const performance = this.predictionModel.getModelPerformance(userId);

        if (performance) {
          // Store performance history
          if (!this.performanceHistory.has(algorithm)) {
            this.performanceHistory.set(algorithm, []);
          }

          this.performanceHistory.get(algorithm)!.push({
            ...performance,
            trainingTime: performance.validationTimestamp - performance.validationTimestamp + 1000, // Estimate
            lastUpdated: Date.now()
          });

          // Keep only recent performance history
          const history = this.performanceHistory.get(algorithm)!;
          if (history.length > 10) {
            history.shift();
          }

          this.logTrainingEvent('modelEvaluated', {
            userId,
            algorithm,
            performance,
            timestamp: Date.now()
          });
        }

      } catch (error) {
        console.error(`Error evaluating ${algorithm} model:`, error);
      }
    }
  }

  /**
   * Create a new model version
   */
  private createModelVersion(
    userId: string,
    algorithm: string,
    trainedOn: number,
    trainingTime: number
  ): void {
    const performance = this.predictionModel.getModelPerformance(userId);
    if (!performance) return;

    const version: ModelVersion = {
      id: `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      algorithm,
      version: this.generateVersionNumber(algorithm),
      createdAt: Date.now(),
      trainedOn,
      performance: {
        ...performance,
        trainingTime,
        lastUpdated: Date.now()
      },
      config: this.getModelConfig(algorithm),
      isActive: false
    };

    // Store version
    if (!this.modelVersions.has(algorithm)) {
      this.modelVersions.set(algorithm, []);
    }

    this.modelVersions.get(algorithm)!.push(version);

    // Keep only recent versions
    const versions = this.modelVersions.get(algorithm)!;
    if (versions.length > 5) {
      versions.shift();
    }

    this.logTrainingEvent('modelVersionCreated', {
      userId,
      algorithm,
      versionId: version.id,
      version: version.version,
      timestamp: Date.now()
    });
  }

  /**
   * Update model versions (activate best performing)
   */
  private updateModelVersions(userId: string): void {
    const availableModels = this.predictionModel.getAvailableModels();

    for (const algorithm of availableModels) {
      const versions = this.modelVersions.get(algorithm) || [];
      if (versions.length === 0) continue;

      // Find best performing version
      const bestVersion = versions.reduce((best, current) =>
        current.performance.accuracy > best.performance.accuracy ? current : best
      );

      // Deactivate all versions
      versions.forEach(v => v.isActive = false);

      // Activate best version
      bestVersion.isActive = true;
      this.currentVersions.set(algorithm, bestVersion.id);

      this.logTrainingEvent('modelVersionActivated', {
        userId,
        algorithm,
        versionId: bestVersion.id,
        accuracy: bestVersion.performance.accuracy,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Set up data collection for training
   */
  private setupDataCollection(userId: string): void {
    // Listen for new actions to add to training buffer
    this.behaviorTracker.on('actionTracked', (action) => {
      this.addToTrainingBuffer(action);
    });

    // Listen for pattern discoveries
    this.patternAnalyzer.on('patternDiscovered', (pattern) => {
      this.addPatternToTrainingBuffer(pattern);
    });
  }

  /**
   * Add action to training buffer
   */
  private addToTrainingBuffer(action: any): void {
    this.dataBuffer.push({
      type: 'action',
      data: action,
      timestamp: Date.now()
    });

    // Keep buffer size manageable
    if (this.dataBuffer.length > this.maxBufferSize) {
      this.dataBuffer.shift();
    }
  }

  /**
   * Add pattern to training buffer
   */
  private addPatternToTrainingBuffer(pattern: any): void {
    this.dataBuffer.push({
      type: 'pattern',
      data: pattern,
      timestamp: Date.now()
    });

    // Keep buffer size manageable
    if (this.dataBuffer.length > this.maxBufferSize) {
      this.dataBuffer.shift();
    }
  }

  /**
   * Get model configuration for algorithm
   */
  private getModelConfig(algorithm: string): any {
    const configs: Record<string, any> = {
      markov_chain: {
        order: 2,
        smoothing: 'laplace'
      },
      neural_network: {
        hiddenLayers: [64, 32],
        activation: 'relu',
        dropout: 0.2,
        epochs: 50
      },
      decision_tree: {
        maxDepth: 10,
        minSamplesSplit: 2,
        criterion: 'gini'
      },
      collaborative_filtering: {
        similarity: 'cosine',
        k: 10
      }
    };

    return configs[algorithm] || {};
  }

  /**
   * Generate version number for model
   */
  private generateVersionNumber(algorithm: string): string {
    const versions = this.modelVersions.get(algorithm) || [];
    const nextVersion = versions.length + 1;
    return `1.0.${nextVersion}`;
  }

  /**
   * Clean up old training data
   */
  private cleanupTrainingData(): void {
    // Keep only recent data in buffer
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    this.dataBuffer = this.dataBuffer.filter(item => item.timestamp > cutoffTime);

    // Clean up old training sessions
    const sessionCutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    this.trainingHistory = this.trainingHistory.filter(session => session.timestamp > sessionCutoff);
  }

  /**
   * Get training statistics
   */
  getTrainingStats(): TrainingMetrics {
    const totalSamples = this.dataBuffer.length;
    const trainingSessions = this.trainingHistory.length;

    const trainingTimes = this.trainingHistory.map(s => s.duration);
    const averageTrainingTime = trainingTimes.length > 0
      ? trainingTimes.reduce((a, b) => a + b, 0) / trainingTimes.length
      : 0;

    const totalVersions = Array.from(this.modelVersions.values())
      .reduce((sum, versions) => sum + versions.length, 0);

    const lastTrainingDate = this.trainingHistory.length > 0
      ? Math.max(...this.trainingHistory.map(s => s.timestamp))
      : 0;

    const performanceTrend = this.calculatePerformanceTrend();

    return {
      totalSamples,
      trainingSessions,
      averageTrainingTime,
      modelVersions: totalVersions,
      lastTrainingDate,
      performanceTrend
    };
  }

  /**
   * Calculate performance trend across all models
   */
  private calculatePerformanceTrend(): 'improving' | 'stable' | 'degrading' {
    const recentPerformances: number[] = [];

    for (const performances of this.performanceHistory.values()) {
      if (performances.length >= 2) {
        const recent = performances.slice(-2);
        const improvement = recent[1].accuracy - recent[0].accuracy;
        recentPerformances.push(improvement);
      }
    }

    if (recentPerformances.length === 0) return 'stable';

    const avgImprovement = recentPerformances.reduce((a, b) => a + b, 0) / recentPerformances.length;

    if (avgImprovement > 0.02) return 'improving';
    if (avgImprovement < -0.02) return 'degrading';
    return 'stable';
  }

  /**
   * Get model versions for algorithm
   */
  getModelVersions(algorithm: string): ModelVersion[] {
    return this.modelVersions.get(algorithm) || [];
  }

  /**
   * Get current active version for algorithm
   */
  getCurrentVersion(algorithm: string): ModelVersion | null {
    const versionId = this.currentVersions.get(algorithm);
    if (!versionId) return null;

    const versions = this.modelVersions.get(algorithm) || [];
    return versions.find(v => v.id === versionId) || null;
  }

  /**
   * Get performance history for algorithm
   */
  getPerformanceHistory(algorithm: string): ModelPerformance[] {
    return this.performanceHistory.get(algorithm) || [];
  }

  /**
   * Manually trigger model training
   */
  async triggerTraining(userId: string): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('Training is disabled');
    }

    await this.performTrainingCycle(userId);
  }

  /**
   * Update training configuration
   */
  updateConfig(newConfig: Partial<TrainingConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Restart training if interval changed
    if (this.isTraining && newConfig.updateInterval) {
      this.stopContinuousTraining();
      // Note: Would need userId to restart, this is a simplified version
    }
  }

  /**
   * Reset training system
   */
  reset(): void {
    this.dataBuffer = [];
    this.modelVersions.clear();
    this.currentVersions.clear();
    this.trainingHistory = [];
    this.performanceHistory.clear();

    this.logTrainingEvent('trainingReset', { timestamp: Date.now() });
  }

  /**
   * Export training data and models
   */
  exportTrainingData(): {
    buffer: any[];
    versions: Record<string, ModelVersion[]>;
    history: TrainingSession[];
    performance: Record<string, ModelPerformance[]>;
    config: TrainingConfig;
  } {
    return {
      buffer: this.dataBuffer,
      versions: Object.fromEntries(this.modelVersions),
      history: this.trainingHistory,
      performance: Object.fromEntries(this.performanceHistory),
      config: this.config
    };
  }

  /**
   * Log training event
   */
  private logTrainingEvent(event: string, data: any): void {
    console.log(`🎓 Training Event: ${event}`, data);

    // Store in training history
    this.trainingHistory.push({
      event,
      data,
      timestamp: Date.now(),
      duration: 0 // Will be set by caller if applicable
    });

    // Keep history manageable
    if (this.trainingHistory.length > 100) {
      this.trainingHistory.shift();
    }
  }

  /**
   * Check if early stopping should be triggered
   */
  private shouldEarlyStop(algorithm: string): boolean {
    const performances = this.performanceHistory.get(algorithm) || [];
    if (performances.length < this.config.earlyStoppingPatience) return false;

    const recent = performances.slice(-this.config.earlyStoppingPatience);
    const bestPerformance = Math.max(...recent.map(p => p.accuracy));
    const currentPerformance = recent[recent.length - 1].accuracy;

    // Stop if performance hasn't improved for patience number of iterations
    return currentPerformance < bestPerformance * 0.99; // 1% threshold
  }

  /**
   * Adapt learning rate based on performance
   */
  private adaptLearningRate(algorithm: string): number {
    if (!this.config.adaptiveLearningRate) return this.config.learningRate;

    const performances = this.performanceHistory.get(algorithm) || [];
    if (performances.length < 2) return this.config.learningRate;

    const recent = performances.slice(-2);
    const improvement = recent[1].accuracy - recent[0].accuracy;

    // Increase learning rate if improving, decrease if not
    const adaptationFactor = improvement > 0 ? 1.05 : 0.95;
    const newRate = this.config.learningRate * adaptationFactor;

    // Keep within bounds
    return Math.max(0.001, Math.min(0.1, newRate));
  }
}

// Additional interfaces
interface TrainingSession {
  event: string;
  data: any;
  timestamp: number;
  duration: number;
}

// Extend existing classes with event emission capabilities
declare module './behavior-tracker' {
  interface BehaviorTracker {
    on(event: string, callback: Function): void;
  }
}

declare module './pattern-analyzer' {
  interface PatternAnalyzer {
    on(event: string, callback: Function): void;
  }
}