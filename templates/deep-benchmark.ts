// templates/deep-benchmark.ts — Template for benchmarks with deep inspection
// Run: bun templates/deep-benchmark.ts
// Pipe: bun templates/deep-benchmark.ts | jq .summary

export interface DeepBenchmarkConfig {
  name: string;
  iterations: number;
  depth: number;
  generateNestedData: boolean;
  inspectionLevel: 'minimal' | 'detailed' | 'verbose';
}

export interface IterationResult {
  iteration: number;
  durationNs: number;
  data: NestedObject | LeafObject;
  timestamp: string;
}

export interface LeafObject {
  value: number;
}

export interface NestedObject {
  level: number;
  id: string;
  nested: NestedObject | LeafObject;
  metadata: {
    created: string;
    depth: number;
    children: { id: number; value: number; subvalue: { x: number; y: number } }[];
  };
}

export interface StructureAnalysis {
  type: 'object' | 'array' | string;
  keys?: string[];
  keyCount?: number;
  valueTypes?: Record<string, number>;
  length?: number;
  sample?: unknown[];
  itemTypes?: string[];
  value?: unknown;
}

export interface DeepBenchmarkResults {
  metadata: {
    benchmarkName: string;
    timestamp: string;
    iterations: number;
    totalTimeNs: number;
    averageNs: number;
    consoleDepth: number;
  };
  data: {
    benchmark: string;
    iterations: number;
    results: IterationResult[];
    analysis: {
      byDuration: IterationResult[];
      statistical: {
        mean: number;
        stdDev: number;
        percentiles: Record<string, number>;
      };
      nestedInsights: { durationNs: number; dataStructure: StructureAnalysis }[];
    };
  };
  rawResults: IterationResult[];
  summary: {
    fastestNs: number;
    slowestNs: number;
    averageNs: number;
    nestedLevels: number;
  };
}

export class DeepBenchmark {
  constructor(private config: DeepBenchmarkConfig) {}

  async run(): Promise<DeepBenchmarkResults> {
    console.log(`Starting benchmark: ${this.config.name}`);
    console.log(`  Depth: ${this.config.depth}`);
    console.log(`  Inspection: ${this.config.inspectionLevel}`);

    const t0 = Bun.nanoseconds();
    const results: IterationResult[] = [];

    for (let i = 0; i < this.config.iterations; i++) {
      const iterResult = await this.runIteration(i);
      results.push(iterResult);

      if (this.config.inspectionLevel === 'verbose') {
        console.log(`Iteration ${i}:`, Bun.inspect(iterResult, { depth: this.config.depth }));
      }
    }

    const totalTimeNs = Bun.nanoseconds() - t0;
    const durations = results.map((r) => r.durationNs);
    const nestedData = this.createNestedResults(results);

    const benchmarkResults: DeepBenchmarkResults = {
      metadata: {
        benchmarkName: this.config.name,
        timestamp: new Date().toISOString(),
        iterations: this.config.iterations,
        totalTimeNs,
        averageNs: totalTimeNs / this.config.iterations,
        consoleDepth: this.config.depth,
      },
      data: nestedData,
      rawResults: results,
      summary: {
        fastestNs: Math.min(...durations),
        slowestNs: Math.max(...durations),
        averageNs: durations.reduce((a, b) => a + b, 0) / durations.length,
        nestedLevels: this.countNestedLevels(nestedData),
      },
    };

    console.log('\nBENCHMARK COMPLETE');
    console.log('='.repeat(50));
    console.log('Summary:', Bun.inspect(benchmarkResults.summary, { depth: this.config.depth }));
    console.log('Metadata:', Bun.inspect(benchmarkResults.metadata, { depth: this.config.depth }));

    if (this.config.inspectionLevel === 'detailed') {
      console.log('\nFull Results:');
      console.log(Bun.inspect(benchmarkResults.data, { depth: this.config.depth }));
    }

    return benchmarkResults;
  }

  private async runIteration(iteration: number): Promise<IterationResult> {
    const t0 = Bun.nanoseconds();

    // Simulate work
    await Bun.sleep(Math.random() * 10);

    const durationNs = Bun.nanoseconds() - t0;

    return {
      iteration,
      durationNs,
      data: this.generateData(iteration),
      timestamp: new Date().toISOString(),
    };
  }

  private generateData(iteration: number): NestedObject | LeafObject {
    if (!this.config.generateNestedData) {
      return { value: iteration * Math.random() };
    }
    return this.createDeepObject(this.config.depth, iteration);
  }

  private createDeepObject(depth: number, seed: number): NestedObject | LeafObject {
    if (depth <= 0) {
      return { value: seed };
    }

    return {
      level: depth,
      id: Bun.randomUUIDv7(),
      nested: this.createDeepObject(depth - 1, seed),
      metadata: {
        created: new Date().toISOString(),
        depth,
        children: Array.from({ length: 3 }, (_, i) => ({
          id: i,
          value: seed * i,
          subvalue: { x: i, y: seed },
        })),
      },
    };
  }

  private createNestedResults(results: IterationResult[]): DeepBenchmarkResults['data'] {
    const durations = results.map((r) => r.durationNs);
    return {
      benchmark: this.config.name,
      iterations: results.length,
      results,
      analysis: {
        byDuration: [...results].sort((a, b) => a.durationNs - b.durationNs),
        statistical: {
          mean: durations.reduce((a, b) => a + b, 0) / durations.length,
          stdDev: stdDev(durations),
          percentiles: percentiles(durations),
        },
        nestedInsights: results.map((r) => ({
          durationNs: r.durationNs,
          dataStructure: analyzeStructure(r.data),
        })),
      },
    };
  }

  private countNestedLevels(obj: unknown, current = 0): number {
    if (!obj || typeof obj !== 'object') return current;
    let max = current;
    for (const value of Object.values(obj as Record<string, unknown>)) {
      if (value && typeof value === 'object') {
        max = Math.max(max, this.countNestedLevels(value, current + 1));
      }
    }
    return max;
  }
}

// ---------------------------------------------------------------------------
// Stats helpers
// ---------------------------------------------------------------------------

function stdDev(nums: number[]): number {
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length;
  return Math.sqrt(variance);
}

function percentiles(nums: number[]): Record<string, number> {
  const sorted = [...nums].sort((a, b) => a - b);
  const at = (p: number) => sorted[Math.floor(sorted.length * p)] ?? sorted[sorted.length - 1];
  return { p50: at(0.5), p90: at(0.9), p95: at(0.95), p99: at(0.99) };
}

function analyzeStructure(obj: unknown): StructureAnalysis {
  if (!obj || typeof obj !== 'object') {
    return { type: typeof obj, value: obj };
  }

  if (Array.isArray(obj)) {
    return {
      type: 'array',
      length: obj.length,
      sample: obj.slice(0, 3),
      itemTypes: [...new Set(obj.map((item) => typeof item))],
    };
  }

  const entries = Object.entries(obj as Record<string, unknown>);
  const valueTypes: Record<string, number> = {};
  for (const [, val] of entries) {
    const t = typeof val;
    valueTypes[t] = (valueTypes[t] ?? 0) + 1;
  }

  return {
    type: 'object',
    keys: entries.map(([k]) => k),
    keyCount: entries.length,
    valueTypes,
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

if (import.meta.main) {
  const benchmark = new DeepBenchmark({
    name: 'Deep Object Performance Test',
    iterations: 10,
    depth: 4,
    generateNestedData: true,
    inspectionLevel: 'detailed',
  });

  const results = await benchmark.run();

  console.log('\nFINAL RESULTS (JSON):');
  console.log(JSON.stringify(results.summary, null, 2));
}
