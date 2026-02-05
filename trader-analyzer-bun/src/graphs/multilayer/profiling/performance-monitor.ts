/**
 * @fileoverview Performance Monitor for Multi-Layer Graph System
 * @description Tracks CPU-intensive operations and performance metrics
 * @module graphs/multilayer/profiling/performance-monitor
 * @version 1.1.1.1.5.0.0
 */

export interface ProfileResult {
  sessionName: string;
  duration: number;
  startTime: number;
  endTime: number;
  memoryUsage: number;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface PerformanceAnomaly {
  operation: string;
  duration: number;
  timestamp: number;
  memoryUsage: number;
  layer: string;
  threshold?: number;
}

/**
 * Performance Monitor for tracking CPU-intensive operations
 */
export class PerformanceMonitor {
  private sessions = new Map<string, { startTime: number; startMemory: number }>();
  private metrics: PerformanceMetric[] = [];
  private anomalies: PerformanceAnomaly[] = [];

  /**
   * Mark the start of a profiling session
   */
  markStart(sessionName: string): void {
    this.sessions.set(sessionName, {
      startTime: performance.now(),
      startMemory: process.memoryUsage().heapUsed,
    });
  }

  /**
   * Mark the end of a profiling session and return results
   */
  markEnd(sessionName: string): ProfileResult {
    const session = this.sessions.get(sessionName);
    if (!session) {
      throw new Error(`Session ${sessionName} not found`);
    }

    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed;
    const duration = endTime - session.startTime;

    const result: ProfileResult = {
      sessionName,
      duration,
      startTime: session.startTime,
      endTime,
      memoryUsage: endMemory - session.startMemory,
    };

    this.sessions.delete(sessionName);

    // Check for performance anomalies
    if (duration > 1000) {
      // Threshold: 1 second
      this.anomalies.push({
        operation: sessionName,
        duration,
        timestamp: Date.now(),
        memoryUsage: result.memoryUsage,
        layer: this.extractLayerFromSession(sessionName),
        threshold: 1000,
      });
    }

    return result;
  }

  /**
   * Record a performance metric
   */
  recordMetric(name: string, value: number, metadata?: Record<string, unknown>): void {
    this.metrics.push({
      name,
      value,
      timestamp: Date.now(),
      metadata,
    });
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get performance anomalies
   */
  getAnomalies(): PerformanceAnomaly[] {
    return [...this.anomalies];
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Clear all metrics and anomalies
   */
  clear(): void {
    this.metrics = [];
    this.anomalies = [];
    this.sessions.clear();
  }

  /**
   * Extract layer number from session name
   */
  private extractLayerFromSession(sessionName: string): string {
    const match = sessionName.match(/layer[1-4]/i);
    return match ? match[0] : 'system';
  }
}
