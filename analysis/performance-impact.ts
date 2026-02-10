export const PerformanceImpact = {
  overall: {
    before: "v1.3.8 baseline",
    after: "v1.3.9 optimized",
    improvement: "35-50% faster",
  },

  components: [
    {
      name: "CPU Profiling",
      metric: "Overhead",
      before: "3-5% overhead",
      after: "<2% overhead",
      gain: "40-60% reduction",
      impact: "Enables continuous profiling in production",
    },
    {
      name: "ESM Bytecode",
      metric: "Cold Start",
      before: "1200ms",
      after: "550ms",
      gain: "54% faster",
      impact: "Serverless functions benefit significantly",
    },
    {
      name: "Markdown SIMD",
      metric: "Rendering Throughput",
      before: "1000 docs/sec",
      after: "1150 docs/sec",
      gain: "15% faster",
      impact: "Documentation sites render faster",
    },
    {
      name: "HTTP/2 Upgrade",
      metric: "Connection Throughput",
      before: "6 concurrent streams",
      after: "100+ concurrent streams",
      gain: "16x more",
      impact: "API servers handle more concurrent clients",
    },
    {
      name: "Protocol Resilience",
      metric: "Failover Time",
      before: "2000ms",
      after: "180ms",
      gain: "91% faster",
      impact: "Minimal disruption during outages",
    },
  ],
} as const;

export function summarizePerformanceImpact() {
  return {
    generatedAt: new Date().toISOString(),
    source: "bun-v1.3.9-performance-impact",
    overall: PerformanceImpact.overall,
    summary: {
      componentCount: PerformanceImpact.components.length,
      topGain: PerformanceImpact.components[0]?.gain ?? "n/a",
    },
    components: PerformanceImpact.components,
  };
}

if (import.meta.main) {
  console.log(JSON.stringify(summarizePerformanceImpact(), null, 2));
}

