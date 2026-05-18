#!/usr/bin/env bun
/**
 * Circuit Breaker Implementation for Fire22 Dashboard Worker
 * Enhanced error handling with exponential backoff and health monitoring
 */

import { logger } from '../../scripts/enhanced-logging-system';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringWindow: number;
  expectedErrors?: string[];
  healthCheckInterval?: number;
  maxConcurrentRequests?: number;
}

export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
  nextAttempt: number;
  totalRequests: number;
  windowStart: number;
}

export interface CircuitBreakerMetrics {
  totalRequests: number;
  totalFailures: number;
  successRate: number;
  averageResponseTime: number;
  currentState: string;
  lastStateChange: number;
  concurrentRequests: number;
}

export class CircuitBreaker {
  private config: Required<CircuitBreakerConfig>;
  private state: CircuitBreakerState;
  private responseTimes: number[] = [];
  private concurrentRequests = 0;
  private healthCheckTimer?: Timer;
  private stateChangeListeners: Array<(state: CircuitBreakerState) => void> = [];

  constructor(
    private name: string,
    config: CircuitBreakerConfig
  ) {
    this.config = {
      failureThreshold: config.failureThreshold || 5,
      resetTimeout: config.resetTimeout || 30000, // 30 seconds
      monitoringWindow: config.monitoringWindow || 60000, // 1 minute
      expectedErrors: config.expectedErrors || [],
      healthCheckInterval: config.healthCheckInterval || 5000, // 5 seconds
      maxConcurrentRequests: config.maxConcurrentRequests || 100,
    };

    this.state = {
      state: 'CLOSED',
      failureCount: 0,
      successCount: 0,
      lastFailureTime: 0,
      nextAttempt: 0,
      totalRequests: 0,
      windowStart: Date.now(),
    };

    this.startHealthMonitoring();
    logger.info('CIRCUIT_BREAKER', '1.0.0', `Circuit breaker '${name}' initialized`);
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    // Check concurrent request limits
    if (this.concurrentRequests >= this.config.maxConcurrentRequests) {
      const error = new Error(
        `Circuit breaker '${this.name}': Max concurrent requests exceeded (${this.config.maxConcurrentRequests})`
      );
      logger.warning('CIRCUIT_BREAKER', '1.0.0', error.message, 'CB001');
      throw error;
    }

    // Check if circuit is open
    if (this.state.state === 'OPEN') {
      if (Date.now() < this.state.nextAttempt) {
        const error = new Error(
          `Circuit breaker '${this.name}' is OPEN. Next attempt in ${Math.ceil((this.state.nextAttempt - Date.now()) / 1000)}s`
        );
        logger.warning('CIRCUIT_BREAKER', '1.0.0', error.message, 'CB002');

        if (fallback) {
          logger.info('CIRCUIT_BREAKER', '1.0.0', `Using fallback for '${this.name}'`);
          return await fallback();
        }
        throw error;
      } else {
        // Transition to HALF_OPEN
        this.state.state = 'HALF_OPEN';
        this.notifyStateChange();
        logger.info(
          'CIRCUIT_BREAKER',
          '1.0.0',
          `Circuit breaker '${this.name}' transitioned to HALF_OPEN`
        );
      }
    }

    const startTime = Date.now();
    this.concurrentRequests++;
    this.state.totalRequests++;

    try {
      const result = await this.executeWithTimeout(operation);
      this.onSuccess(Date.now() - startTime);
      return result;
    } catch (error) {
      await this.onFailure(error as Error, Date.now() - startTime);

      if (fallback && this.state.state === 'OPEN') {
        logger.info('CIRCUIT_BREAKER', '1.0.0', `Using fallback for '${this.name}' after failure`);
        return await fallback();
      }

      throw error;
    } finally {
      this.concurrentRequests--;
    }
  }

  /**
   * Execute operation with timeout protection
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeout: number = 30000
  ): Promise<T> {
    return await Promise.race([
      operation(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Operation timed out after ${timeout}ms`)), timeout)
      ),
    ]);
  }

  /**
   * Handle successful operation
   */
  private onSuccess(responseTime: number): void {
    this.responseTimes.push(responseTime);
    this.trimResponseTimes();

    if (this.state.state === 'HALF_OPEN') {
      // Reset circuit breaker
      this.state.state = 'CLOSED';
      this.state.failureCount = 0;
      this.state.successCount = 0;
      this.notifyStateChange();
      logger.success('CIRCUIT_BREAKER', '1.0.0', `Circuit breaker '${this.name}' reset to CLOSED`);
    } else {
      this.state.successCount++;
    }

    this.resetWindowIfNeeded();
  }

  /**
   * Handle failed operation
   */
  private async onFailure(error: Error, responseTime: number): Promise<void> {
    this.responseTimes.push(responseTime);
    this.trimResponseTimes();
    this.state.failureCount++;
    this.state.lastFailureTime = Date.now();

    // Check if error is expected and should not trigger circuit breaker
    const isExpectedError = this.config.expectedErrors.some(
      expectedError => error.message.includes(expectedError) || error.name.includes(expectedError)
    );

    if (isExpectedError) {
      logger.info('CIRCUIT_BREAKER', '1.0.0', `Expected error in '${this.name}': ${error.message}`);
      return;
    }

    logger.error(
      'CIRCUIT_BREAKER',
      '1.0.0',
      `Failure in '${this.name}': ${error.message}`,
      'CB003'
    );

    // Check if we should open the circuit
    if (this.state.failureCount >= this.config.failureThreshold) {
      this.state.state = 'OPEN';
      this.state.nextAttempt = Date.now() + this.config.resetTimeout;
      this.notifyStateChange();
      logger.warning(
        'CIRCUIT_BREAKER',
        '1.0.0',
        `Circuit breaker '${this.name}' opened after ${this.state.failureCount} failures`,
        'CB004'
      );
    }

    this.resetWindowIfNeeded();
  }

  /**
   * Get current metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    const successRate =
      this.state.totalRequests > 0
        ? ((this.state.totalRequests - this.state.failureCount) / this.state.totalRequests) * 100
        : 100;

    const averageResponseTime =
      this.responseTimes.length > 0
        ? this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length
        : 0;

    return {
      totalRequests: this.state.totalRequests,
      totalFailures: this.state.failureCount,
      successRate: Math.round(successRate * 100) / 100,
      averageResponseTime: Math.round(averageResponseTime),
      currentState: this.state.state,
      lastStateChange: this.state.lastFailureTime,
      concurrentRequests: this.concurrentRequests,
    };
  }

  /**
   * Force reset circuit breaker
   */
  reset(): void {
    this.state.state = 'CLOSED';
    this.state.failureCount = 0;
    this.state.successCount = 0;
    this.state.lastFailureTime = 0;
    this.state.nextAttempt = 0;
    this.state.windowStart = Date.now();
    this.responseTimes = [];
    this.notifyStateChange();
    logger.info('CIRCUIT_BREAKER', '1.0.0', `Circuit breaker '${this.name}' manually reset`);
  }

  /**
   * Add state change listener
   */
  onStateChange(listener: (state: CircuitBreakerState) => void): void {
    this.stateChangeListeners.push(listener);
  }

  /**
   * Check if circuit breaker is healthy
   */
  isHealthy(): boolean {
    const metrics = this.getMetrics();
    return metrics.successRate > 50 && this.state.state !== 'OPEN';
  }

  /**
   * Get detailed health report
   */
  getHealthReport(): {
    name: string;
    healthy: boolean;
    state: string;
    metrics: CircuitBreakerMetrics;
    recommendations: string[];
  } {
    const metrics = this.getMetrics();
    const healthy = this.isHealthy();
    const recommendations: string[] = [];

    if (!healthy) {
      if (this.state.state === 'OPEN') {
        recommendations.push('Circuit is open - check downstream dependencies');
        recommendations.push(
          `Will retry in ${Math.ceil((this.state.nextAttempt - Date.now()) / 1000)}s`
        );
      }
      if (metrics.successRate < 50) {
        recommendations.push('Low success rate - investigate error patterns');
      }
      if (metrics.averageResponseTime > 5000) {
        recommendations.push('High response times - check for bottlenecks');
      }
      if (metrics.concurrentRequests > this.config.maxConcurrentRequests * 0.8) {
        recommendations.push('High concurrent request load - consider scaling');
      }
    }

    return {
      name: this.name,
      healthy,
      state: this.state.state,
      metrics,
      recommendations,
    };
  }

  /**
   * Private helper methods
   */
  private trimResponseTimes(): void {
    if (this.responseTimes.length > 100) {
      this.responseTimes = this.responseTimes.slice(-50);
    }
  }

  private resetWindowIfNeeded(): void {
    if (Date.now() - this.state.windowStart > this.config.monitoringWindow) {
      this.state.windowStart = Date.now();
      this.state.successCount = 0;
      // Keep some failure history for trend analysis
      this.state.failureCount = Math.floor(this.state.failureCount / 2);
    }
  }

  private notifyStateChange(): void {
    this.stateChangeListeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        logger.error('CIRCUIT_BREAKER', '1.0.0', `State change listener error: ${error}`, 'CB005');
      }
    });
  }

  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(() => {
      const report = this.getHealthReport();
      if (!report.healthy) {
        logger.warning(
          'CIRCUIT_BREAKER',
          '1.0.0',
          `Circuit breaker '${this.name}' health check failed: ${report.recommendations.join(', ')}`,
          'CB006'
        );
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    this.stateChangeListeners = [];
    logger.info('CIRCUIT_BREAKER', '1.0.0', `Circuit breaker '${this.name}' destroyed`);
  }
}

/**
 * Circuit Breaker Manager for handling multiple circuit breakers
 */
export class CircuitBreakerManager {
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private globalMetrics = {
    totalRequests: 0,
    totalFailures: 0,
    activeCircuitBreakers: 0,
    openCircuitBreakers: 0,
  };

  constructor() {
    logger.info('CIRCUIT_BREAKER_MANAGER', '1.0.0', 'Circuit Breaker Manager initialized');
  }

  /**
   * Create or get circuit breaker
   */
  getCircuitBreaker(name: string, config?: CircuitBreakerConfig): CircuitBreaker {
    if (!this.circuitBreakers.has(name)) {
      const circuitBreaker = new CircuitBreaker(
        name,
        config || {
          failureThreshold: 5,
          resetTimeout: 30000,
          monitoringWindow: 60000,
        }
      );

      // Add state change listener for global metrics
      circuitBreaker.onStateChange(state => {
        this.updateGlobalMetrics();
      });

      this.circuitBreakers.set(name, circuitBreaker);
      this.updateGlobalMetrics();
    }

    return this.circuitBreakers.get(name)!;
  }

  /**
   * Get all circuit breaker health reports
   */
  getAllHealthReports(): Array<ReturnType<CircuitBreaker['getHealthReport']>> {
    return Array.from(this.circuitBreakers.values()).map(cb => cb.getHealthReport());
  }

  /**
   * Get global metrics
   */
  getGlobalMetrics() {
    this.updateGlobalMetrics();
    return { ...this.globalMetrics };
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    this.circuitBreakers.forEach(cb => cb.reset());
    logger.info('CIRCUIT_BREAKER_MANAGER', '1.0.0', 'All circuit breakers reset');
  }

  /**
   * Destroy all circuit breakers
   */
  destroyAll(): void {
    this.circuitBreakers.forEach(cb => cb.destroy());
    this.circuitBreakers.clear();
    logger.info('CIRCUIT_BREAKER_MANAGER', '1.0.0', 'All circuit breakers destroyed');
  }

  private updateGlobalMetrics(): void {
    const reports = this.getAllHealthReports();
    this.globalMetrics.activeCircuitBreakers = reports.length;
    this.globalMetrics.openCircuitBreakers = reports.filter(r => r.state === 'OPEN').length;
    this.globalMetrics.totalRequests = reports.reduce((sum, r) => sum + r.metrics.totalRequests, 0);
    this.globalMetrics.totalFailures = reports.reduce((sum, r) => sum + r.metrics.totalFailures, 0);
  }
}

// Global circuit breaker manager instance
export const circuitBreakerManager = new CircuitBreakerManager();
