// scores/ScoreDashboard.ts

import { GeometricMeanCalculator } from './GeometricMeanCalculator';

export interface Config13Byte {
  version: number;
  registryHash: number;
  featureFlags: number;
  terminalMode: number;
  rows: number;
  cols: number;
  reserved: number;
  lastCalculatedScore?: number;
  scoreCalculationCount?: number;
}

export class ScoreDashboard {
  private scores = new Map<string, number>();
  private config: Config13Byte;
  private updateCallbacks: Array<(score: number) => void> = [];

  constructor(initialConfig: Config13Byte) {
    this.config = initialConfig;
  }

  /**
   * Add or update a metric score
   */
  addMetric(name: string, value: number): void {
    this.scores.set(name, value);
    this.updateOverallScore();
  }

  /**
   * Remove a metric score
   */
  removeMetric(name: string): void {
    this.scores.delete(name);
    this.updateOverallScore();
  }

  /**
   * Get current metric scores
   */
  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.scores);
  }

  /**
   * Get current overall score
   */
  getOverallScore(): number {
    return this.config.lastCalculatedScore || 0;
  }

  /**
   * Register callback for score updates
   */
  onScoreUpdate(callback: (score: number) => void): void {
    this.updateCallbacks.push(callback);
  }

  /**
   * Update overall score and notify callbacks
   */
  private updateOverallScore(): void {
    if (this.scores.size === 0) {
      return;
    }

    try {
      const { score, metadata } = GeometricMeanCalculator.calculateWithMetadata(
        Object.fromEntries(this.scores)
      );

      // Update config
      this.config.lastCalculatedScore = score;
      this.config.scoreCalculationCount = (this.config.scoreCalculationCount || 0) + 1;

      // Display in Bun dashboard
      this.displayScore(score, metadata);

      // Notify callbacks
      this.updateCallbacks.forEach(callback => callback(score));

    } catch (error) {
      console.error(`❌ Score calculation failed: ${error}`);
    }
  }

  /**
   * Display score in a formatted table
   */
  private displayScore(score: number, metadata: any): void {
    console.info(
      Bun.inspect.table([{
        Metric: 'Overall Score',
        Value: score.toFixed(3),
        CalcTime: `${metadata.calculationTimeNs}ns`,
        Metrics: this.scores.size,
        Updates: this.config.scoreCalculationCount || 0
      }])
    );
  }

  /**
   * Display all current metrics
   */
  displayMetrics(): void {
    if (this.scores.size === 0) {
      console.info('📊 No metrics available');
      return;
    }

    const metricsTable = Array.from(this.scores.entries()).map(([name, value]) => ({
      Metric: name,
      Value: value.toFixed(4),
      Status: this.getMetricStatus(value)
    }));

    console.info('📊 Current Metrics:');
    console.info(Bun.inspect.table(metricsTable));
    console.info(`🎯 Overall Score: ${this.getOverallScore().toFixed(3)}`);
  }

  /**
   * Get status indicator for metric value
   */
  private getMetricStatus(value: number): string {
    if (value >= 0.9) return '🟢 Excellent';
    if (value >= 0.7) return '🟡 Good';
    if (value >= 0.5) return '🟠 Fair';
    return '🔴 Poor';
  }

  /**
   * Get updated config with score
   */
  getConfig(): Config13Byte {
    return { ...this.config };
  }

  /**
   * Update config with new score
   */
  updateConfig(newConfig: Partial<Config13Byte>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Reset all metrics and scores
   */
  reset(): void {
    this.scores.clear();
    delete this.config.lastCalculatedScore;
    delete this.config.scoreCalculationCount;
    console.info('📊 Score dashboard reset');
  }

  /**
   * Export metrics data for persistence
   */
  export(): {
    metrics: Record<string, number>;
    config: Config13Byte;
    timestamp: string;
  } {
    return {
      metrics: this.getMetrics(),
      config: this.getConfig(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Import metrics data
   */
  import(data: {
    metrics: Record<string, number>;
    config: Config13Byte;
  }): void {
    this.scores.clear();
    Object.entries(data.metrics).forEach(([name, value]) => {
      this.scores.set(name, value);
    });
    this.config = data.config;
    this.updateOverallScore();
    console.info('📊 Score dashboard imported');
  }
}

// Usage example for integration with 13-byte config system
export function updateConfigWithScore(
  config: Config13Byte, 
  metrics: Record<string, number>
): Config13Byte {
  const dashboard = new ScoreDashboard(config);
  
  // Add all metrics
  Object.entries(metrics).forEach(([name, value]) => {
    dashboard.addMetric(name, value);
  });

  return dashboard.getConfig();
}
