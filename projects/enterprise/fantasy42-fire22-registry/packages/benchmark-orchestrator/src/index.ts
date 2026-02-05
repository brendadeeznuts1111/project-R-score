/**
 * 🚀 @fire22/benchmark-orchestrator - Enterprise Benchmark Orchestrator
 *
 * Dedicated package orchestrating comprehensive benchmarking ensuring EVERY package
 * meets enterprise security, performance, testing, and quality standards.
 *
 * NEVER COMPROMISE: Security + Performance + Quality = Enterprise Excellence
 */

export { PackageBenchmarkOrchestrator } from './orchestrator';
export { EnterpriseStandards, type BenchmarkResult } from './standards';
export type { PackageBenchmark, BenchmarkOptions, EnterpriseMetrics } from './types';

// Re-export for convenience
export { runEnterpriseBenchmark } from './cli';
