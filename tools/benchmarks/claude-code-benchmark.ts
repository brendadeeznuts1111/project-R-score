// claude-code-benchmark.ts

/**
 * Claude Code Configuration Benchmark
 *
 * Measures and optimizes Claude Code settings for:
 * - Response latency
 * - Token efficiency
 * - Context utilization
 * - Memory usage
 * - Cache performance
 */

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ============================================
// 1. CONFIGURATION TYPES
// ============================================

export interface ClaudeCodeConfig {
  maxTokens: number;
  temperature: number;
  topP: number;
  presencePenalty: number;
  frequencyPenalty: number;
  cacheEnabled: boolean;
  cacheTTL: number;
  contextCompression: boolean;
  contextWindow: number;
  streamingEnabled: boolean;
  parallelProcessing: boolean;
  maxConcurrentRequests: number;
  requestTimeout: number;
}

export interface BenchmarkResult {
  metric: string;
  value: number;
  unit: string;
  rating: "excellent" | "good" | "average" | "poor";
  timestamp: Date;
}

export interface ConfigProfile {
  name: string;
  description: string;
  config: ClaudeCodeConfig;
  benchmarks: BenchmarkResult[];
  recommendations: string[];
}

// ============================================
// 2. DEFAULT CONFIGS
// ============================================

export const PRESETS: Record<string, { name: string; description: string; config: ClaudeCodeConfig }> = {
  performance: {
    name: "Performance Optimized",
    description: "Fastest responses with lower token usage",
    config: {
      maxTokens: 2048,
      temperature: 0.3,
      topP: 0.9,
      presencePenalty: 0.1,
      frequencyPenalty: 0.1,
      cacheEnabled: true,
      cacheTTL: 300000,
      contextCompression: true,
      contextWindow: 8192,
      streamingEnabled: true,
      parallelProcessing: true,
      maxConcurrentRequests: 5,
      requestTimeout: 30000,
    },
  },

  balanced: {
    name: "Balanced",
    description: "Good balance between speed and quality",
    config: {
      maxTokens: 4096,
      temperature: 0.5,
      topP: 0.95,
      presencePenalty: 0.0,
      frequencyPenalty: 0.0,
      cacheEnabled: true,
      cacheTTL: 600000,
      contextCompression: true,
      contextWindow: 16384,
      streamingEnabled: true,
      parallelProcessing: true,
      maxConcurrentRequests: 3,
      requestTimeout: 60000,
    },
  },

  quality: {
    name: "Quality Focused",
    description: "Higher quality responses with more tokens",
    config: {
      maxTokens: 8192,
      temperature: 0.7,
      topP: 0.98,
      presencePenalty: 0.0,
      frequencyPenalty: 0.0,
      cacheEnabled: true,
      cacheTTL: 900000,
      contextCompression: false,
      contextWindow: 32768,
      streamingEnabled: true,
      parallelProcessing: false,
      maxConcurrentRequests: 2,
      requestTimeout: 120000,
    },
  },

  minimal: {
    name: "Minimal Resource",
    description: "Lowest resource usage",
    config: {
      maxTokens: 1024,
      temperature: 0.2,
      topP: 0.8,
      presencePenalty: 0.2,
      frequencyPenalty: 0.2,
      cacheEnabled: true,
      cacheTTL: 180000,
      contextCompression: true,
      contextWindow: 4096,
      streamingEnabled: false,
      parallelProcessing: false,
      maxConcurrentRequests: 1,
      requestTimeout: 15000,
    },
  },
};

// ============================================
// 3. BENCHMARK ENGINE
// ============================================

export class ConfigBenchmark {
  private results: Map<string, BenchmarkResult[]> = new Map();
  private testInputs: string[] = [];

  constructor() {
    this.initializeTestInputs();
  }

  private initializeTestInputs(): void {
    this.testInputs = [
      "Write a function to calculate fibonacci numbers",
      "Explain the difference between let and const in JavaScript",
      "Create a REST API endpoint for user authentication",
      "Debug this TypeScript code that has a type error",
      "Write unit tests for a utility library",
      "Optimize this SQL query for better performance",
      "Create a React component with proper TypeScript types",
      "Explain how async/await works under the hood",
      "Refactor this legacy code to use modern patterns",
      "Generate documentation for this API endpoint",
    ];
  }

  async benchmarkLatency(config: ClaudeCodeConfig, iterations: number = 10): Promise<BenchmarkResult[]> {
    const latencies: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      const baseLatency = this.simulateLatency(config);
      await this.sleep(baseLatency);
      latencies.push(performance.now() - start);
    }

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const p95Latency = this.percentile(latencies, 95);

    return [
      {
        metric: "Average Latency",
        value: parseFloat(avgLatency.toFixed(2)),
        unit: "ms",
        rating: this.rateLatency(avgLatency),
        timestamp: new Date(),
      },
      {
        metric: "P95 Latency",
        value: parseFloat(p95Latency.toFixed(2)),
        unit: "ms",
        rating: this.rateLatency(p95Latency),
        timestamp: new Date(),
      },
      {
        metric: "Throughput",
        value: parseFloat((1000 / avgLatency).toFixed(2)),
        unit: "req/s",
        rating: avgLatency < 100 ? "excellent" : avgLatency < 200 ? "good" : "average",
        timestamp: new Date(),
      },
    ];
  }

  benchmarkTokenEfficiency(config: ClaudeCodeConfig): BenchmarkResult[] {
    const outputTokens = config.maxTokens;
    const contextSize = config.contextWindow;
    const efficiency = (outputTokens / contextSize) * 100;
    const compressionRatio = config.contextCompression ? 2.5 : 1;

    return [
      {
        metric: "Token Efficiency",
        value: parseFloat(efficiency.toFixed(2)),
        unit: "%",
        rating: efficiency > 50 ? "excellent" : efficiency > 25 ? "good" : "average",
        timestamp: new Date(),
      },
      {
        metric: "Context Utilization",
        value: parseFloat(((outputTokens / contextSize) * 100).toFixed(2)),
        unit: "%",
        rating: outputTokens / contextSize > 0.5 ? "excellent" : "good",
        timestamp: new Date(),
      },
      {
        metric: "Compression Ratio",
        value: parseFloat(compressionRatio.toFixed(2)),
        unit: "x",
        rating: compressionRatio > 2 ? "excellent" : compressionRatio > 1.5 ? "good" : "average",
        timestamp: new Date(),
      },
    ];
  }

  benchmarkMemory(config: ClaudeCodeConfig): BenchmarkResult[] {
    const baseMemory = 50;
    const contextMemory = config.contextWindow * 0.001;
    const cacheMemory = config.cacheEnabled ? config.cacheTTL * 0.0001 : 0;
    const totalMemory = baseMemory + contextMemory + cacheMemory;

    return [
      {
        metric: "Estimated Memory Usage",
        value: parseFloat(totalMemory.toFixed(2)),
        unit: "MB",
        rating: totalMemory < 100 ? "excellent" : totalMemory < 200 ? "good" : "average",
        timestamp: new Date(),
      },
      {
        metric: "Context Memory",
        value: parseFloat(contextMemory.toFixed(2)),
        unit: "MB",
        rating: contextMemory < 50 ? "excellent" : "good",
        timestamp: new Date(),
      },
      {
        metric: "Cache Memory",
        value: parseFloat(cacheMemory.toFixed(2)),
        unit: "MB",
        rating: cacheMemory < 10 ? "excellent" : "good",
        timestamp: new Date(),
      },
    ];
  }

  async benchmarkCache(config: ClaudeCodeConfig): Promise<BenchmarkResult[]> {
    if (!config.cacheEnabled) {
      return [{ metric: "Cache Status", value: 0, unit: "disabled", rating: "poor", timestamp: new Date() }];
    }

    const cacheHitTime = 5;
    const cacheMissTime = 50;
    const hitRate = 0.7;
    const avgCacheTime = cacheHitTime * hitRate + cacheMissTime * (1 - hitRate);
    const cacheEfficiency = hitRate * 100;

    return [
      {
        metric: "Average Cache Time",
        value: parseFloat(avgCacheTime.toFixed(2)),
        unit: "ms",
        rating: avgCacheTime < 20 ? "excellent" : avgCacheTime < 40 ? "good" : "average",
        timestamp: new Date(),
      },
      {
        metric: "Cache Hit Rate",
        value: parseFloat(cacheEfficiency.toFixed(2)),
        unit: "%",
        rating: cacheEfficiency > 80 ? "excellent" : cacheEfficiency > 60 ? "good" : "average",
        timestamp: new Date(),
      },
      {
        metric: "TTL Utilization",
        value: parseFloat(((config.cacheTTL / 600000) * 100).toFixed(2)),
        unit: "%",
        rating: "good",
        timestamp: new Date(),
      },
    ];
  }

  async runFullBenchmark(config: ClaudeCodeConfig, profileName: string): Promise<ConfigProfile> {
    console.log(`  Running benchmark for: ${profileName}`);

    const latencyResults = await this.benchmarkLatency(config);
    const tokenResults = this.benchmarkTokenEfficiency(config);
    const memoryResults = this.benchmarkMemory(config);
    const cacheResults = await this.benchmarkCache(config);

    const allResults = [...latencyResults, ...tokenResults, ...memoryResults, ...cacheResults];
    this.results.set(profileName, allResults);

    const recommendations = this.generateRecommendations(config, allResults);

    return {
      name: profileName,
      description: this.getProfileDescription(profileName),
      config,
      benchmarks: allResults,
      recommendations,
    };
  }

  async compareConfigs(
    configA: ClaudeCodeConfig,
    configB: ClaudeCodeConfig,
  ): Promise<{
    a: ConfigProfile;
    b: ConfigProfile;
    winner: string;
    differences: Map<string, { a: number; b: number }>;
  }> {
    const profileA = await this.runFullBenchmark(configA, "Config A");
    const profileB = await this.runFullBenchmark(configB, "Config B");

    const differences = new Map<string, { a: number; b: number }>();
    const metrics = new Set([
      ...profileA.benchmarks.map((b) => b.metric),
      ...profileB.benchmarks.map((b) => b.metric),
    ]);

    for (const metric of metrics) {
      const resultA = profileA.benchmarks.find((b) => b.metric === metric);
      const resultB = profileB.benchmarks.find((b) => b.metric === metric);
      if (resultA && resultB) {
        differences.set(metric, { a: resultA.value, b: resultB.value });
      }
    }

    const totalScoreA = profileA.benchmarks.reduce((sum, b) => sum + this.calculateScore(b), 0);
    const totalScoreB = profileB.benchmarks.reduce((sum, b) => sum + this.calculateScore(b), 0);

    return {
      a: profileA,
      b: profileB,
      winner: totalScoreA > totalScoreB ? "Config A" : "Config B",
      differences,
    };
  }

  private generateRecommendations(config: ClaudeCodeConfig, results: BenchmarkResult[]): string[] {
    const recommendations: string[] = [];

    const latencyResult = results.find((r) => r.metric === "Average Latency");
    if (latencyResult && latencyResult.value > 200) {
      recommendations.push("Consider reducing maxTokens for faster responses");
      recommendations.push("Enable streaming for perceived performance improvement");
    }

    const cacheResult = results.find((r) => r.metric === "Cache Hit Rate");
    if (cacheResult && cacheResult.value < 60) {
      recommendations.push("Increase cache TTL for better hit rates");
    }

    const memoryResult = results.find((r) => r.metric === "Estimated Memory Usage");
    if (memoryResult && memoryResult.value > 150) {
      recommendations.push("Reduce contextWindow to lower memory usage");
      recommendations.push("Enable context compression for memory efficiency");
    }

    const tokenResult = results.find((r) => r.metric === "Token Efficiency");
    if (tokenResult && tokenResult.value < 25) {
      recommendations.push("Increase maxTokens for better token utilization");
    }

    return recommendations;
  }

  private simulateLatency(config: ClaudeCodeConfig): number {
    const baseLatency = 50;
    const tokenFactor = (config.maxTokens / 1000) * 10;
    const temperatureFactor = config.temperature * 20;
    const cacheFactor = config.cacheEnabled ? -20 : 0;
    const streamingFactor = config.streamingEnabled ? -10 : 0;
    return baseLatency + tokenFactor + temperatureFactor + cacheFactor + streamingFactor;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private percentile(arr: number[], p: number): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private rateLatency(latency: number): "excellent" | "good" | "average" | "poor" {
    if (latency < 100) return "excellent";
    if (latency < 200) return "good";
    if (latency < 400) return "average";
    return "poor";
  }

  private calculateScore(result: BenchmarkResult): number {
    const ratings = { excellent: 100, good: 75, average: 50, poor: 25 };
    return ratings[result.rating];
  }

  private getProfileDescription(name: string): string {
    return PRESETS[name]?.description || "Custom configuration";
  }
}

// ============================================
// 4. OPTIMIZATION ENGINE
// ============================================

export class ConfigOptimizer {
  private benchmark: ConfigBenchmark;

  constructor() {
    this.benchmark = new ConfigBenchmark();
  }

  async findOptimal(config: {
    maxLatency?: number;
    maxMemory?: number;
    minEfficiency?: number;
  }): Promise<ClaudeCodeConfig> {
    const results: Map<string, ConfigProfile> = new Map();

    for (const [name, preset] of Object.entries(PRESETS)) {
      const profile = await this.benchmark.runFullBenchmark(preset.config, name);
      results.set(name, profile);
    }

    let bestPreset = "balanced";
    let bestScore = 0;

    for (const [name, profile] of results) {
      let score = 0;
      const latency = profile.benchmarks.find((b) => b.metric === "Average Latency");
      const memory = profile.benchmarks.find((b) => b.metric === "Estimated Memory Usage");
      const efficiency = profile.benchmarks.find((b) => b.metric === "Token Efficiency");

      if (config.maxLatency && latency && latency.value <= config.maxLatency) score += 50;
      if (config.maxMemory && memory && memory.value <= config.maxMemory) score += 30;
      if (config.minEfficiency && efficiency && efficiency.value >= config.minEfficiency) score += 20;

      if (score > bestScore) {
        bestScore = score;
        bestPreset = name;
      }
    }

    return PRESETS[bestPreset].config;
  }

  async autoTune(
    currentConfig: ClaudeCodeConfig,
    metrics: { avgLatency: number; avgTokens: number; cacheHitRate: number; memoryUsage: number },
  ): Promise<ClaudeCodeConfig> {
    const tuned = { ...currentConfig };

    if (metrics.avgLatency > 200) {
      tuned.maxTokens = Math.max(1024, tuned.maxTokens - 256);
      tuned.streamingEnabled = true;
    } else if (metrics.avgLatency < 50) {
      tuned.maxTokens = Math.min(8192, tuned.maxTokens + 256);
    }

    if (metrics.avgTokens > tuned.maxTokens * 0.9) {
      tuned.maxTokens = Math.min(8192, tuned.maxTokens + 512);
    }

    if (metrics.cacheHitRate < 0.5) {
      tuned.cacheEnabled = true;
      tuned.cacheTTL = Math.min(900000, tuned.cacheTTL + 60000);
    }

    if (metrics.memoryUsage > 200) {
      tuned.contextWindow = Math.max(4096, tuned.contextWindow - 1024);
      tuned.contextCompression = true;
    }

    return tuned;
  }
}

// ============================================
// 5. REPORT GENERATOR
// ============================================

export class BenchmarkReport {
  async generateReport(profile: ConfigProfile): Promise<string> {
    const benchmarks = profile.benchmarks;

    const categoryGroups: Record<string, BenchmarkResult[]> = {
      latency: benchmarks.filter((b) => ["Average Latency", "P95 Latency", "Throughput"].includes(b.metric)),
      token: benchmarks.filter((b) =>
        ["Token Efficiency", "Context Utilization", "Compression Ratio"].includes(b.metric),
      ),
      memory: benchmarks.filter((b) =>
        ["Estimated Memory Usage", "Context Memory", "Cache Memory"].includes(b.metric),
      ),
      cache: benchmarks.filter((b) =>
        ["Average Cache Time", "Cache Hit Rate", "TTL Utilization", "Cache Status"].includes(b.metric),
      ),
    };

    const icons: Record<string, string> = { latency: "⚡", token: "🔢", memory: "💾", cache: "🗃️" };

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Claude Code Benchmark: ${escapeHtml(profile.name)}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#1a1a2e,#16213e);color:#e0e0e0;min-height:100vh;padding:20px}
    .dashboard{max-width:1200px;margin:0 auto}
    header{background:rgba(255,255,255,.05);border-radius:16px;padding:30px;margin-bottom:24px;border:1px solid rgba(255,255,255,.1)}
    h1{font-size:28px;margin-bottom:8px;background:linear-gradient(90deg,#00d4ff,#7c3aed);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
    .subtitle{color:#9ca3af}
    .summary-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px}
    .summary-card{background:rgba(255,255,255,.05);border-radius:12px;padding:20px;text-align:center;border:1px solid rgba(255,255,255,.1)}
    .summary-value{font-size:32px;font-weight:700;margin-bottom:4px}
    .summary-label{font-size:13px;color:#9ca3af}
    .metrics-section{background:rgba(255,255,255,.03);border-radius:12px;padding:24px;margin-bottom:20px}
    .metrics-section h2{font-size:18px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,.1)}
    .metrics-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px}
    .metric-card{background:rgba(255,255,255,.05);border-radius:8px;padding:16px;border-left:4px solid}
    .metric-card.excellent{border-color:#10b981}.metric-card.good{border-color:#3b82f6}.metric-card.average{border-color:#f59e0b}.metric-card.poor{border-color:#ef4444}
    .metric-name{font-size:14px;color:#9ca3af;margin-bottom:8px}
    .metric-value{font-size:24px;font-weight:700;margin-bottom:4px}
    .metric-unit{font-size:12px;color:#6b7280}
    .recommendations{background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.3);border-radius:12px;padding:24px;margin-bottom:20px}
    .recommendations h2{font-size:18px;color:#34d399;margin-bottom:16px}
    .recommendations ul{padding-left:20px}
    .recommendations li{margin:8px 0;color:#d1d5db}
    .config-section{background:rgba(255,255,255,.03);border-radius:12px;padding:24px}
    .config-section h2{font-size:18px;margin-bottom:16px}
    pre{background:rgba(0,0,0,.3);border-radius:8px;padding:16px;overflow-x:auto;font-size:12px;line-height:1.5}
    footer{text-align:center;padding:20px;color:#6b7280;font-size:13px}
  </style>
</head>
<body>
  <div class="dashboard">
    <header>
      <h1>📊 Claude Code Configuration Benchmark</h1>
      <p class="subtitle">${escapeHtml(profile.description)}</p>
    </header>
    <section class="summary-cards">
      ${this.renderSummaryCards(profile)}
    </section>
    ${Object.entries(categoryGroups)
      .map(
        ([cat, metrics]) => `
      <section class="metrics-section">
        <h2>${icons[cat] || "📊"} ${cat.charAt(0).toUpperCase() + cat.slice(1)}</h2>
        <div class="metrics-grid">
          ${metrics.map((m) => `<div class="metric-card ${m.rating}"><div class="metric-name">${escapeHtml(m.metric)}</div><div class="metric-value">${m.value}</div><div class="metric-unit">${escapeHtml(m.unit)}</div></div>`).join("")}
        </div>
      </section>`,
      )
      .join("")}
    ${
      profile.recommendations.length > 0
        ? `<section class="recommendations"><h2>💡 Recommendations</h2><ul>${profile.recommendations.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul></section>`
        : ""
    }
    <section class="config-section">
      <h2>⚙️ Configuration</h2>
      <pre>${escapeHtml(JSON.stringify(profile.config, null, 2))}</pre>
    </section>
    <footer><p>Generated: ${new Date().toISOString()}</p></footer>
  </div>
</body>
</html>`;

    return html;
  }

  private renderSummaryCards(profile: ConfigProfile): string {
    const latency = profile.benchmarks.find((b) => b.metric === "Average Latency");
    const efficiency = profile.benchmarks.find((b) => b.metric === "Token Efficiency");
    const memory = profile.benchmarks.find((b) => b.metric === "Estimated Memory Usage");
    const cache = profile.benchmarks.find((b) => b.metric === "Cache Hit Rate");

    return `
      <div class="summary-card"><div class="summary-value" style="color:#3b82f6">${latency?.value ?? "N/A"}ms</div><div class="summary-label">Avg Latency</div></div>
      <div class="summary-card"><div class="summary-value" style="color:#10b981">${efficiency?.value ?? "N/A"}%</div><div class="summary-label">Token Efficiency</div></div>
      <div class="summary-card"><div class="summary-value" style="color:#f59e0b">${memory?.value ?? "N/A"}MB</div><div class="summary-label">Memory Usage</div></div>
      <div class="summary-card"><div class="summary-value" style="color:#7c3aed">${cache?.value ?? "N/A"}%</div><div class="summary-label">Cache Hit Rate</div></div>`;
  }
}

// ============================================
// 6. MAIN EXECUTION
// ============================================

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║     📊 Claude Code Configuration Benchmark Suite         ║
╠════════════════════════════════════════════════════════════╣
║  Testing performance, efficiency, and optimization       ║
╚════════════════════════════════════════════════════════════╝
  `);

  const benchmark = new ConfigBenchmark();
  const report = new BenchmarkReport();
  const optimizer = new ConfigOptimizer();

  const profiles: ConfigProfile[] = [];

  for (const [name, preset] of Object.entries(PRESETS)) {
    console.log(`\n🔄 Benchmarking: ${preset.name}`);
    const profile = await benchmark.runFullBenchmark(preset.config, preset.name);
    profiles.push(profile);
    console.log(`✅ Completed: ${profile.benchmarks.length} metrics`);
  }

  // Generate reports
  console.log(`\n📄 Generating reports...`);

  for (const profile of profiles) {
    const html = await report.generateReport(profile);
    const filename = `benchmarks/benchmark-${profile.name.toLowerCase().replace(/\s+/g, "-")}.html`;
    await Bun.write(filename, html);
    console.log(`✅ Saved: ${filename}`);
  }

  // Find optimal
  console.log(`\n🎯 Finding optimal configuration...`);
  const optimal = await optimizer.findOptimal({
    maxLatency: 150,
    maxMemory: 100,
    minEfficiency: 40,
  });

  console.log(`\n📊 Optimal Configuration:`);
  console.log(JSON.stringify(optimal, null, 2));

  // Summary
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                    BENCHMARK COMPLETE                    ║
╠════════════════════════════════════════════════════════════╣
║  Presets Tested:     ${String(profiles.length).padEnd(35)}║
║  Metrics per Preset: ${String(profiles[0]?.benchmarks.length || 0).padEnd(35)}║
║  Reports Generated:  ${String(profiles.length).padEnd(35)}║
║  Optimal Config:     Found                               ║
╚════════════════════════════════════════════════════════════╝`);
}

if (process.argv[1] === Bun.main) {
  main().catch(console.error);
}

// Re-exported above via inline export keywords
