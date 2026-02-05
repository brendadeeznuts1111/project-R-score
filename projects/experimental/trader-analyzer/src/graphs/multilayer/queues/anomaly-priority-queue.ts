/**
 * @fileoverview Anomaly Detection Priority Queue
 * @description Priority queue for managing detected anomalies
 * @module graphs/multilayer/queues/anomaly-priority-queue
 * @version 1.1.1.1.4.2.6
 */

import type { DetectedAnomaly } from '../interfaces';

interface QueueStatistics {
  totalQueued: number;
  queueSize: number;
  avgPriorityScore: number;
  priorityDistribution: Record<string, number>;
  oldestAnomalyAge: number;
  estimatedProcessingTime: number;
}

/**
 * Header 1.1.1.1.4.2.6: Anomaly Detection Priority Queue
 */
export class AnomalyDetectionPriorityQueue {
  private queue: DetectedAnomaly[] = [];
  private anomalyRegistry = new Map<string, DetectedAnomaly>();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  addAnomaly(anomaly: DetectedAnomaly): void {
    // Calculate priority score
    const priorityScore = this.calculatePriorityScore(anomaly);
    anomaly.priorityScore = priorityScore;
    anomaly.queuedAt = Date.now();

    // Add to registry
    this.anomalyRegistry.set(anomaly.id, anomaly);

    // Add to priority queue
    if (this.queue.length >= this.maxSize) {
      // Remove lowest priority anomaly if at capacity
      const lowestPriority = this.queue[0];
      if (this.compareAnomalies(anomaly, lowestPriority) < 0) {
        const removed = this.queue.shift();
        if (removed) {
          this.anomalyRegistry.delete(removed.id);
        }
        this.insertAnomaly(anomaly);
      }
    } else {
      this.insertAnomaly(anomaly);
    }

    // Emit event for real-time monitoring
    this.emitAnomalyQueued(anomaly);
  }

  private insertAnomaly(anomaly: DetectedAnomaly): void {
    // Insert in priority order (highest first)
    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      if (this.compareAnomalies(anomaly, this.queue[i]) < 0) {
        insertIndex = i;
        break;
      }
    }
    this.queue.splice(insertIndex, 0, anomaly);
  }

  private calculatePriorityScore(anomaly: DetectedAnomaly): number {
    // Multi-factor priority scoring
    const factors = {
      // Risk factors (0-100 scale)
      financialRisk: this.calculateFinancialRisk(anomaly),
      propagationRisk: this.calculatePropagationRisk(anomaly),
      marketIntegrityRisk: this.calculateMarketIntegrityRisk(anomaly),

      // Urgency factors (0-100 scale)
      timeCriticality: this.calculateTimeCriticality(anomaly),
      detectionNovelty: this.calculateDetectionNovelty(anomaly),
      confidenceScore: anomaly.confidenceScore * 100,

      // Business factors (0-100 scale)
      regulatoryPriority: this.calculateRegulatoryPriority(anomaly),
      customerImpact: this.calculateCustomerImpact(anomaly),
      strategicImportance: this.calculateStrategicImportance(anomaly),
    };

    // Weighted scoring
    const weights = {
      financialRisk: 0.25,
      propagationRisk: 0.2,
      marketIntegrityRisk: 0.15,
      timeCriticality: 0.15,
      detectionNovelty: 0.05,
      confidenceScore: 0.1,
      regulatoryPriority: 0.05,
      customerImpact: 0.03,
      strategicImportance: 0.02,
    };

    // Calculate weighted score
    let totalScore = 0;
    let totalWeight = 0;

    for (const [factor, weight] of Object.entries(weights)) {
      totalScore +=
        factors[factor as keyof typeof factors] * weight;
      totalWeight += weight;
    }

    return totalScore / totalWeight;
  }

  private compareAnomalies(
    a: DetectedAnomaly,
    b: DetectedAnomaly,
  ): number {
    // Primary comparison by priority score
    const scoreA = a.priorityScore || 0;
    const scoreB = b.priorityScore || 0;
    if (scoreA !== scoreB) {
      return scoreB - scoreA; // Higher score first
    }

    // Secondary comparison by time criticality
    const timeCriticalityA = this.calculateTimeCriticality(a);
    const timeCriticalityB = this.calculateTimeCriticality(b);
    if (timeCriticalityA !== timeCriticalityB) {
      return timeCriticalityB - timeCriticalityA;
    }

    // Tertiary comparison by detection time (newer first)
    return b.detectedAt - a.detectedAt;
  }

  getNextAnomaly(): DetectedAnomaly | null {
    if (this.queue.length === 0) {
      return null;
    }

    const anomaly = this.queue.shift();
    if (anomaly) {
      this.anomalyRegistry.delete(anomaly.id);
      anomaly.processingStartedAt = Date.now();
      return anomaly;
    }

    return null;
  }

  // Batch processing for efficiency
  getNextBatch(size: number = 10): DetectedAnomaly[] {
    const batch: DetectedAnomaly[] = [];

    for (let i = 0; i < size && this.queue.length > 0; i++) {
      const anomaly = this.getNextAnomaly();
      if (anomaly) {
        batch.push(anomaly);
      }
    }

    return batch;
  }

  // Real-time statistics
  getQueueStats(): QueueStatistics {
    const priorityScores = this.queue.map((a) => a.priorityScore || 0);
    const avgPriority =
      priorityScores.length > 0
        ? priorityScores.reduce((sum, score) => sum + score, 0) /
          priorityScores.length
        : 0;

    return {
      totalQueued: this.anomalyRegistry.size,
      queueSize: this.queue.length,
      avgPriorityScore: avgPriority,
      priorityDistribution: this.calculatePriorityDistribution(),
      oldestAnomalyAge: this.calculateOldestAnomalyAge(),
      estimatedProcessingTime: this.estimateProcessingTime(),
    };
  }

  private calculateFinancialRisk(anomaly: DetectedAnomaly): number {
    // Simplified financial risk calculation
    return anomaly.severity * 20; // Scale severity (0-5) to 0-100
  }

  private calculatePropagationRisk(anomaly: DetectedAnomaly): number {
    // Simplified propagation risk
    return anomaly.layer === 1 ? 90 : anomaly.layer === 2 ? 70 : anomaly.layer === 3 ? 50 : 30;
  }

  private calculateMarketIntegrityRisk(anomaly: DetectedAnomaly): number {
    // Simplified market integrity risk
    return anomaly.confidenceScore * 100;
  }

  private calculateTimeCriticality(anomaly: DetectedAnomaly): number {
    const age = Date.now() - anomaly.detectedAt;
    // Older anomalies are less time-critical
    return Math.max(0, 100 - age / 60000); // Decay over 100 minutes
  }

  private calculateDetectionNovelty(anomaly: DetectedAnomaly): number {
    // Simplified novelty calculation
    return anomaly.type.includes('novel') ? 80 : 40;
  }

  private calculateRegulatoryPriority(anomaly: DetectedAnomaly): number {
    // Simplified regulatory priority
    return anomaly.severity > 4 ? 90 : 30;
  }

  private calculateCustomerImpact(anomaly: DetectedAnomaly): number {
    // Simplified customer impact
    return anomaly.confidenceScore * 60;
  }

  private calculateStrategicImportance(anomaly: DetectedAnomaly): number {
    // Simplified strategic importance
    return 50; // Placeholder
  }

  private calculatePriorityDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const anomaly of this.queue) {
      const score = anomaly.priorityScore || 0;
      if (score > 70) {
        distribution.high++;
      } else if (score > 40) {
        distribution.medium++;
      } else {
        distribution.low++;
      }
    }

    return distribution;
  }

  private calculateOldestAnomalyAge(): number {
    if (this.queue.length === 0) {
      return 0;
    }

    const oldest = Math.min(...this.queue.map((a) => a.detectedAt));
    return Date.now() - oldest;
  }

  private estimateProcessingTime(): number {
    // Simplified processing time estimate
    return this.queue.length * 100; // 100ms per anomaly
  }

  private emitAnomalyQueued(anomaly: DetectedAnomaly): void {
    // Event emission would go here
    // In production, would use event emitter
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  size(): number {
    return this.queue.length;
  }
}
