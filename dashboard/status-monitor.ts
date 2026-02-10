import type { ComponentStatus, HealthScore } from "./types";

type RawComponentRow = {
  id: string;
  file: string;
  status: "stable" | "beta";
  owner: string;
  lastCommit: string;
  coverage: number;
  performance: number;
  dependencies: string[];
  securityQuarter: string;
  documentation: string;
  production: string;
};

const RAW_COMPONENTS: RawComponentRow[] = [
  { id: "cpu-profiling", file: "batch-profiler.ts", status: "stable", owner: "@nolarose", lastCommit: "2f573c69", coverage: 94, performance: 98, dependencies: ["Bun.FFI"], securityQuarter: "Q1-2026", documentation: "./docs/profiler.md", production: "5 regions" },
  { id: "esm-bytecode", file: "esm-bytecode/compile.ts", status: "stable", owner: "@nolarose", lastCommit: "2f573c69", coverage: 89, performance: 95, dependencies: ["Bun.build"], securityQuarter: "Q1-2026", documentation: "./docs/bytecode.md", production: "5 regions" },
  { id: "arm-stability", file: "runtime/arm-dispatch.ts", status: "stable", owner: "@nolarose", lastCommit: "2f573c69", coverage: 100, performance: 100, dependencies: ["mimalloc"], securityQuarter: "Q1-2026", documentation: "./docs/arm.md", production: "5 regions" },
  { id: "markdown-simd", file: "docs/pipeline.ts", status: "stable", owner: "@nolarose", lastCommit: "2f573c69", coverage: 87, performance: 93, dependencies: ["Bun.Markdown"], securityQuarter: "Q1-2026", documentation: "./docs/markdown.md", production: "5 regions" },
  { id: "react-markdown", file: "dashboard/ssr.ts", status: "stable", owner: "@nolarose", lastCommit: "2f573c69", coverage: 91, performance: 94, dependencies: ["Bun.markdown.react"], securityQuarter: "Q1-2026", documentation: "./docs/react-md.md", production: "5 regions" },
  { id: "abort-optimize", file: "fetch/client.ts", status: "stable", owner: "@nolarose", lastCommit: "2f573c69", coverage: 93, performance: 96, dependencies: ["AbortController"], securityQuarter: "Q1-2026", documentation: "./docs/abort.md", production: "5 regions" },
  { id: "parallel-scripts", file: "parallel-runner/core.ts", status: "stable", owner: "@nolarose", lastCommit: "2f573c69", coverage: 96, performance: 97, dependencies: ["Bun.spawn"], securityQuarter: "Q1-2026", documentation: "./docs/parallel.md", production: "5 regions" },
  { id: "symbol-dispose", file: "mock-dispose/client.ts", status: "stable", owner: "@nolarose", lastCommit: "2f573c69", coverage: 98, performance: 100, dependencies: ["bun:test"], securityQuarter: "Q1-2026", documentation: "./docs/mocks.md", production: "5 regions" },
  { id: "http2-upgrade", file: "http-upgrade/orchestrator.ts", status: "stable", owner: "@nolarose", lastCommit: "2f573c69", coverage: 88, performance: 92, dependencies: ["node:http2"], securityQuarter: "Q1-2026", documentation: "./docs/http2.md", production: "5 regions" },
  { id: "no-proxy-fix", file: "secure-fetch/index.ts", status: "stable", owner: "@nolarose", lastCommit: "2f573c69", coverage: 92, performance: 95, dependencies: ["fetch"], securityQuarter: "Q1-2026", documentation: "./docs/noproxy.md", production: "5 regions" },
  { id: "protocol-resilience", file: "protocols/resilience-chain.ts", status: "stable", owner: "@nolarose", lastCommit: "2f573c69", coverage: 90, performance: 93, dependencies: ["Bun.fetch"], securityQuarter: "Q1-2026", documentation: "./docs/resilience.md", production: "5 regions" },
  { id: "mini-dashboard", file: "micro-polish.js", status: "stable", owner: "@nolarose", lastCommit: "2f573c69", coverage: 85, performance: 92, dependencies: ["Bun.serve"], securityQuarter: "Q1-2026", documentation: "./docs/mini-dash.md", production: "5 regions" },
  { id: "websocket-gateway", file: "ws-gateway.ts", status: "beta", owner: "@nolarose", lastCommit: "HEAD", coverage: 78, performance: 99, dependencies: ["Bun.serve"], securityQuarter: "Q2-2026", documentation: "./docs/ws.md", production: "staging" },
  { id: "predictive-cache", file: "caching/predictive.ts", status: "beta", owner: "@nolarose", lastCommit: "HEAD", coverage: 72, performance: 90, dependencies: ["Bun.FFI"], securityQuarter: "Q2-2026", documentation: "./docs/predictive.md", production: "staging" },
];

class ProjectStatusMonitor {
  private components: Map<string, ComponentStatus> = new Map();
  private readonly healthThresholds = {
    coverage: 80,
    performance: 95,
    security: "Q1-2026",
    production: 3,
  };

  constructor() {
    this.loadComponentData();
  }

  private parseProduction(raw: string): { deployed: boolean; regions: number; label: string } {
    const label = String(raw || "staging");
    const match = label.match(/(\d+)\s+regions?/i);
    const regions = match ? Number.parseInt(match[1], 10) : 0;
    return {
      deployed: regions > 0,
      regions,
      label,
    };
  }

  private loadComponentData() {
    for (const row of RAW_COMPONENTS) {
      const production = this.parseProduction(row.production);
      this.components.set(row.id, {
        id: row.id,
        file: row.file,
        status: row.status,
        owner: row.owner,
        lastCommit: row.lastCommit,
        coverage: row.coverage,
        performance: row.performance,
        dependencies: row.dependencies,
        security: {
          reviewed: row.securityQuarter <= this.healthThresholds.security,
          quarter: row.securityQuarter,
        },
        documentation: row.documentation,
        production,
      });
    }
  }

  calculateHealthScore(): HealthScore {
    let total = 0;
    let max = 0;

    for (const component of this.components.values()) {
      const score = this.scoreComponent(component);
      total += score;
      max += 100;
    }

    return {
      overall: max === 0 ? 0 : Math.round((total / max) * 100),
      stable: this.countByStatus("stable"),
      beta: this.countByStatus("beta"),
      productionReady: this.countProductionReady(),
      averageCoverage: this.calculateAverageCoverage(),
    };
  }

  private scoreComponent(component: ComponentStatus): number {
    let score = 0;

    score += component.status === "stable" ? 30 : 15;
    score += Math.min(25, (component.coverage / 100) * 25);
    score += component.production.deployed ? 20 : 0;
    score += Math.min(5, (component.production.regions / 5) * 5);
    score += component.security.reviewed ? 15 : 0;
    score += component.documentation ? 10 : 5;

    return score;
  }

  private countByStatus(status: "stable" | "beta"): number {
    let count = 0;
    for (const c of this.components.values()) {
      if (c.status === status) count++;
    }
    return count;
  }

  private countProductionReady(): number {
    let count = 0;
    for (const c of this.components.values()) {
      if (c.production.deployed && c.production.regions >= this.healthThresholds.production) {
        count++;
      }
    }
    return count;
  }

  private calculateAverageCoverage(): number {
    const list = Array.from(this.components.values());
    if (list.length === 0) return 0;
    const total = list.reduce((sum, item) => sum + item.coverage, 0);
    return Math.round((total / list.length) * 10) / 10;
  }

  private getTopPerformers(limit: number): ComponentStatus[] {
    return Array.from(this.components.values())
      .sort((a, b) => {
        if (b.coverage !== a.coverage) return b.coverage - a.coverage;
        return b.production.regions - a.production.regions;
      })
      .slice(0, limit);
  }

  private getNeedsAttention(): ComponentStatus[] {
    return Array.from(this.components.values())
      .filter((c) => c.coverage < this.healthThresholds.coverage || c.status !== "stable")
      .sort((a, b) => a.coverage - b.coverage);
  }

  private generateRecommendations(): string {
    const items: string[] = [];
    const attention = this.getNeedsAttention();
    const betaCount = this.countByStatus("beta");

    if (betaCount > 0) {
      items.push(`- Reduce beta footprint (${betaCount}) by promoting mature components to stable.`);
    }
    if (attention.some((c) => c.coverage < this.healthThresholds.coverage)) {
      items.push(`- Lift low-coverage components to >=${this.healthThresholds.coverage}% first.`);
    }
    if (attention.some((c) => !c.production.deployed)) {
      items.push(`- Move staging-only components through security review and production rollout.`);
    }
    if (items.length === 0) {
      items.push("- Maintain current quality gates and continue monthly snapshot reviews.");
    }
    return items.join("\n");
  }

  generateReport(): string {
    const health = this.calculateHealthScore();
    const total = this.components.size || 14;
    const badge = health.overall >= 90 ? "OK" : health.overall >= 75 ? "WARN" : "FAIL";

    return `
# BUN v1.3.9 PROJECT STATUS REPORT
Generated: ${new Date().toISOString()}

## HEALTH SCORE: ${health.overall}/100 ${badge}

### COMPONENT BREAKDOWN
- Stable Components: ${health.stable}/${total} (${Math.round((health.stable / total) * 100)}%)
- Beta Components: ${health.beta}/${total}
- Production Ready: ${health.productionReady}/${total}
- Average Test Coverage: ${health.averageCoverage}%

### TOP PERFORMERS
${this.getTopPerformers(3).map((c) => `- ${c.id}: ${c.coverage}% coverage, ${c.production.regions} regions`).join("\n")}

### REQUIRES ATTENTION
${this.getNeedsAttention().map((c) => `- ${c.id}: ${c.coverage}% coverage, status=${c.status}`).join("\n") || "- none"}

### RECOMMENDATIONS
${this.generateRecommendations()}
`.trim();
  }
}

export function buildProjectStatusReport(): string {
  const monitor = new ProjectStatusMonitor();
  return monitor.generateReport();
}

if (import.meta.main) {
  console.log(buildProjectStatusReport());
}

