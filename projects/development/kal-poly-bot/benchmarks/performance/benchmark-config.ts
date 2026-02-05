/**
 * Benchmark Configuration
 * Central configuration for all performance benchmarks
 */

export interface BenchmarkConfig {
  name: string;
  description: string;
  category: "performance" | "load" | "scalability" | "security";
  timeout: number;
  iterations: number;
  concurrency: number;
  warmupIterations: number;
  thresholds: {
    maxLatency: number;
    minThroughput?: number;
    maxErrorRate?: number;
  };
}

export const BENCHMARK_CONFIGS: Record<string, BenchmarkConfig> = {
  // Performance Benchmarks
  "threat-detection": {
    name: "Threat Detection Performance",
    description:
      "Measures latency and throughput of threat detection algorithms",
    category: "performance",
    timeout: 60000,
    iterations: 1000,
    concurrency: 100,
    warmupIterations: 50,
    thresholds: {
      maxLatency: 50,
      minThroughput: 500,
      maxErrorRate: 0.01,
    },
  },

  "compliance-enforcement": {
    name: "Compliance Enforcement Performance",
    description: "Validates compliance checking across multiple frameworks",
    category: "performance",
    timeout: 45000,
    iterations: 500,
    concurrency: 50,
    warmupIterations: 25,
    thresholds: {
      maxLatency: 100,
      minThroughput: 200,
      maxErrorRate: 0.01,
    },
  },

  "redis-pubsub": {
    name: "Redis Pub/Sub Performance",
    description: "Tests cross-region threat intelligence replication",
    category: "performance",
    timeout: 30000,
    iterations: 500,
    concurrency: 20,
    warmupIterations: 10,
    thresholds: {
      maxLatency: 20,
      minThroughput: 100,
      maxErrorRate: 0.02,
    },
  },

  "quantum-operations": {
    name: "Quantum Cryptographic Operations",
    description: "Benchmarks ML-DSA signing and quantum-safe operations",
    category: "performance",
    timeout: 30000,
    iterations: 100,
    concurrency: 10,
    warmupIterations: 5,
    thresholds: {
      maxLatency: 500,
      minThroughput: 50,
      maxErrorRate: 0.01,
    },
  },

  "system-integration": {
    name: "End-to-End System Integration",
    description: "Complete workflow performance testing",
    category: "performance",
    timeout: 120000,
    iterations: 50,
    concurrency: 5,
    warmupIterations: 5,
    thresholds: {
      maxLatency: 2000,
      maxErrorRate: 0.05,
    },
  },

  // Load Benchmarks
  "concurrent-threat-detection": {
    name: "Concurrent Threat Detection Load",
    description: "High-load concurrent threat detection testing",
    category: "load",
    timeout: 300000,
    iterations: 10000,
    concurrency: 1000,
    warmupIterations: 100,
    thresholds: {
      maxLatency: 100,
      minThroughput: 1000,
      maxErrorRate: 0.05,
    },
  },

  "redis-cross-region-load": {
    name: "Cross-Region Redis Load Test",
    description: "High-volume cross-region message replication",
    category: "load",
    timeout: 180000,
    iterations: 5000,
    concurrency: 500,
    warmupIterations: 50,
    thresholds: {
      maxLatency: 50,
      minThroughput: 500,
      maxErrorRate: 0.03,
    },
  },

  // Scalability Benchmarks
  "multi-region-scalability": {
    name: "Multi-Region Scalability Test",
    description: "Tests system behavior across increasing region counts",
    category: "scalability",
    timeout: 600000,
    iterations: 1000,
    concurrency: 100,
    warmupIterations: 20,
    thresholds: {
      maxLatency: 200,
      minThroughput: 200,
      maxErrorRate: 0.05,
    },
  },

  "quantum-scalability": {
    name: "Quantum Operations Scalability",
    description: "Scalability testing for quantum cryptographic operations",
    category: "scalability",
    timeout: 120000,
    iterations: 500,
    concurrency: 50,
    warmupIterations: 10,
    thresholds: {
      maxLatency: 1000,
      minThroughput: 100,
      maxErrorRate: 0.02,
    },
  },

  // Security Benchmarks
  "security-overhead": {
    name: "Security Overhead Analysis",
    description: "Measures performance impact of security measures",
    category: "security",
    timeout: 90000,
    iterations: 200,
    concurrency: 20,
    warmupIterations: 10,
    thresholds: {
      maxLatency: 150,
      maxErrorRate: 0.01,
    },
  },

  "quantum-security-performance": {
    name: "Quantum Security Performance",
    description: "Performance testing of quantum-resistant security measures",
    category: "security",
    timeout: 120000,
    iterations: 300,
    concurrency: 30,
    warmupIterations: 15,
    thresholds: {
      maxLatency: 800,
      minThroughput: 80,
      maxErrorRate: 0.02,
    },
  },
};

export interface BenchmarkResult {
  config: BenchmarkConfig;
  stats: {
    count: number;
    average: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
    total: number;
  };
  passed: boolean;
  errors: string[];
  timestamp: string;
}

export interface BenchmarkReport {
  timestamp: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    overallPassRate: number;
  };
  results: Record<string, BenchmarkResult>;
  recommendations: string[];
}
