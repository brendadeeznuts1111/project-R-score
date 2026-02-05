/**
 * Silo Logic Mapping
 * Zero-branch conditional execution based on TIER environment
 * TIER=prod auto-enables high-frequency logic with zero dependencies
 */

import { heapStats } from 'bun:jsc'

// Silo Configuration Types
interface SiloConfig {
  tier: 'dev' | 'staging' | 'prod'
  highFreqEnabled: boolean
  latencyTarget: number
  memoryLimit: number
  concurrentLimit: number
}

// Runtime Silo Detection - No if branches
const SILO_CONFIG: SiloConfig = {
  tier: (process.env.TIER as 'dev' | 'staging' | 'prod') || 'dev',
  highFreqEnabled: process.env.TIER === 'prod', // Auto-enable for prod
  latencyTarget: process.env.TIER === 'prod' ? 25 : 100, // Stricter in prod
  memoryLimit: process.env.TIER === 'prod' ? 400 * 1024 * 1024 : 800 * 1024 * 1024, // 400MB vs 800MB
  concurrentLimit: process.env.TIER === 'prod' ? 1000 : 100 // Higher concurrency in prod
}

// Zero-Dependency Virtual Functions
// Rule: Virtual bunx bun:strip-ansi keeps production artifact slim (<1KB entries)
export const stripAnsi = (text: string): string => {
  // Zero-dependency ANSI stripping - no external packages
  return text.replace(/\x1B\[[0-9;]*[JKmsu]/g, '')
}

// High-Frequency Logic Silo (Prod Only)
export class HighFreqSilo {
  private static enabled = SILO_CONFIG.highFreqEnabled

  /**
   * Execute high-frequency operations only when enabled
   * Zero conditional branches - logic flows based on silo config
   */
  static async execute<T>(operation: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    if (this.enabled) {
      return await operation()
    }
    return fallback ? await fallback() : await operation()
  }

  /**
   * Memory-optimized operations for high-frequency workloads
   */
  static optimizeForHighFreq(data: any): any {
    if (!this.enabled) return data

    // Aggressive memory optimization for prod
    if (typeof data === 'object' && data !== null) {
      // Strip unnecessary fields in high-freq mode
      const { debug, trace, ...optimized } = data
      return optimized
    }

    return data
  }

  /**
   * Concurrent execution with silo-aware limits
   */
  static async concurrentExecute<T>(
    operations: (() => Promise<T>)[],
    options: { maxConcurrent?: number } = {}
  ): Promise<T[]> {
    const maxConcurrent = options.maxConcurrent || SILO_CONFIG.concurrentLimit

    if (!this.enabled) {
      // Standard execution in non-prod silos
      return await Promise.all(operations)
    }

    // High-frequency optimized concurrent execution
    const results: T[] = []
    for (let i = 0; i < operations.length; i += maxConcurrent) {
      const batch = operations.slice(i, i + maxConcurrent)
      const batchResults = await Promise.all(batch.map(op => op()))
      results.push(...batchResults)

      // Memory pressure check in high-freq mode
      if (i % (maxConcurrent * 10) === 0) {
        this.checkMemoryPressure()
      }
    }

    return results
  }

  /**
   * Memory pressure monitoring for high-frequency operations
   */
  private static checkMemoryPressure(): void {
    const stats = heapStats()
    const memoryUsage = stats.heapSize

    if (memoryUsage > SILO_CONFIG.memoryLimit) {
      console.warn(`High memory usage in high-freq silo: ${(memoryUsage / 1024 / 1024).toFixed(2)}MB`)

      // Trigger aggressive GC in high-freq mode
      if (typeof Bun.gc === 'function') {
        Bun.gc(true)
      }
    }
  }
}

// Silo-Aware Error Handling
export class SiloErrorHandler {
  static handle(error: Error, context: string): void {
    const tier = SILO_CONFIG.tier
    const message = stripAnsi(`[${tier.toUpperCase()}] ${context}: ${error.message}`)

    if (tier === 'prod') {
      // Minimal logging in prod high-freq mode
      console.error(message)
    } else {
      // Detailed logging in dev/staging
      console.error(message, {
        stack: error.stack,
        tier,
        timestamp: new Date().toISOString()
      })
    }
  }
}

// Silo Metrics Collection
export class SiloMetrics {
  private static metrics = new Map<string, number[]>()
  private static enabled = SILO_CONFIG.tier === 'prod'

  static record(metric: string, value: number): void {
    if (!this.enabled) return

    if (!this.metrics.has(metric)) {
      this.metrics.set(metric, [])
    }

    const values = this.metrics.get(metric)!
    values.push(value)

    // Keep only recent metrics in high-freq mode
    if (values.length > 1000) {
      values.shift()
    }
  }

  static getStats(metric: string): { avg: number; p95: number; count: number } | null {
    const values = this.metrics.get(metric)
    if (!values || values.length === 0) return null

    const sorted = [...values].sort((a, b) => a - b)
    const avg = values.reduce((a, b) => a + b, 0) / values.length
    const p95 = sorted[Math.floor(sorted.length * 0.95)]

    return { avg, p95, count: values.length }
  }
}

// Export silo configuration for external use
export { SILO_CONFIG }
export type { SiloConfig }