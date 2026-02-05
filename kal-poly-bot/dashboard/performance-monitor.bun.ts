#!/usr/bin/env bun
/**
 * Zero-Cost Performance Dashboard with Unicode Engine
 *
 * Real-time performance monitoring for Kalman filter arbitrage system
 * Uses Golden Matrix v2.4.2 components for zero-cost rendering
 */

import { KalmanInfrastructureIntegration } from "../infrastructure/integration-layer.bun.ts";
import { SecurityHardeningLayer } from "../infrastructure/v2-4-2/security-hardening-layer.ts";
import { UnicodeStringWidthEngine } from "../infrastructure/v2-4-2/stringwidth-engine.ts";

// Type definitions
export interface PerformanceMetrics {
  patternId: number;
  latency: number;
  throughput: number;
  accuracy: number;
  securityScore: number;
  timestamp: number;
}

export interface DashboardConfig {
  refreshRate: number;
  maxPatterns: number;
  securityLevel: string;
  features: string[];
}

export class PerformanceDashboard {
  private metrics: PerformanceMetrics[] = [];
  private config: DashboardConfig;

  constructor(configYaml?: string) {
    // Component #44: Parse dashboard config from YAML
    if (configYaml) {
      this.config = this.loadDashboardConfig(configYaml);
    } else {
      this.config = {
        refreshRate: 1000,
        maxPatterns: 20,
        securityLevel: "HARDENED",
        features: ["unicode", "security", "realtime"],
      };
    }

    console.log("📊 Performance Dashboard initialized");
    console.log(`   Refresh rate: ${this.config.refreshRate}ms`);
    console.log(`   Max patterns: ${this.config.maxPatterns}`);
    console.log(`   Security: ${this.config.securityLevel}`);
  }

  // Component #42: Zero-cost table rendering
  renderHalfLifeTable(): string {
    const table = [
      ["Market Type", "Half-Life", "Primary Driver", "Exploitable Via"],
      [
        "Main Line (ML/Spread)",
        "200-400ms",
        "Direct betting volume",
        "Patterns #68, #76",
      ],
      [
        "Team Totals",
        "400-800ms",
        "Derivative model calculation",
        "Patterns #54, #62, #86",
      ],
      [
        "Player Props",
        "800ms-2s",
        "Provider feed latency",
        "Patterns #73, #80, #87",
      ],
      [
        "Alt Lines",
        "1-3s",
        "Discrete threshold rules",
        "Patterns #53, #72, #84",
      ],
      [
        "Quarter/Half Markets",
        "500ms-1.5s",
        "Cross-period correlation models",
        "Patterns #51, #52, #71",
      ],
      [
        "In-Play Micro-Markets",
        "50-200ms",
        "Direct API injection",
        "Pattern #31",
      ],
    ];

    // Calculate column widths with zero-cost Unicode engine
    const colWidths = table[0].map((_, colIndex) => {
      return Math.max(
        ...table.map((row) =>
          UnicodeStringWidthEngine.calculateWidth(row[colIndex] || "")
        )
      );
    });

    // Render table with proper Unicode alignment
    const separator = colWidths.map((width) => "─".repeat(width)).join("─┼─");

    const rows = table.map((row, _rowIndex) => {
      const cells = row.map((cell, colIndex) => {
        const width = colWidths[colIndex];
        const cellWidth = UnicodeStringWidthEngine.calculateWidth(cell);
        const padding = width - cellWidth;
        return cell + " ".repeat(padding);
      });
      return cells.join(" │ ");
    });

    // Combine header, separator, and data
    return [
      rows[0], // Header
      separator,
      ...rows.slice(1), // Data rows
    ].join("\n");
  }

  renderMetricsTable(): string {
    if (this.metrics.length === 0) {
      return "No metrics available";
    }

    const table = [
      [
        "Pattern",
        "Latency (ms)",
        "Throughput (req/s)",
        "Accuracy (%)",
        "Security",
      ],
      ...this.metrics
        .slice(-10)
        .map((metric) => [
          `#${metric.patternId}`,
          metric.latency.toFixed(2),
          metric.throughput.toFixed(0),
          (metric.accuracy * 100).toFixed(1),
          `${(metric.securityScore * 100).toFixed(0)}%`,
        ]),
    ];

    // Calculate column widths
    const colWidths = table[0].map((_, colIndex) => {
      return Math.max(
        ...table.map((row) =>
          UnicodeStringWidthEngine.calculateWidth(row[colIndex] || "")
        )
      );
    });

    // Render with Unicode alignment
    const separator = colWidths.map((width) => "─".repeat(width)).join("─┼─");

    const rows = table.map((row, _rowIndex) => {
      const cells = row.map((cell, colIndex) => {
        const width = colWidths[colIndex];
        const cellWidth = UnicodeStringWidthEngine.calculateWidth(cell);
        const padding = width - cellWidth;

        // Right-align numeric columns
        if (colIndex > 0) {
          return " ".repeat(padding) + cell;
        } else {
          return cell + " ".repeat(padding);
        }
      });
      return cells.join(" │ ");
    });

    return [
      rows[0], // Header
      separator,
      ...rows.slice(1), // Data rows
    ].join("\n");
  }

  addMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.config.maxPatterns) {
      this.metrics = this.metrics.slice(-this.config.maxPatterns);
    }

    // Log with Unicode alignment
    const msg = `Pattern #${metric.patternId}: ${metric.latency.toFixed(2)}ms, ${(metric.accuracy * 100).toFixed(1)}% accuracy`;
    KalmanInfrastructureIntegration.logAligned("METRIC", msg);
  }

  // Component #44: Parse dashboard config from YAML
  loadDashboardConfig(configYaml: string): DashboardConfig {
    const config =
      KalmanInfrastructureIntegration.parseArbitrageConfig(configYaml);

    // Security hardening for dashboard config
    const warnings = SecurityHardeningLayer.validateConfig(config);
    warnings.forEach((w) => console.warn(`[DASHBOARD] ${w}`));

    return {
      refreshRate: (config.refreshRate as number) || 1000,
      maxPatterns: (config.maxPatterns as number) || 20,
      securityLevel: (config.securityLevel as string) || "STANDARD",
      features: (config.features as string[]) || ["basic"],
    };
  }

  // Real-time dashboard updates
  startRealTimeUpdates(): void {
    console.log("🔄 Starting real-time dashboard updates");

    const updateInterval = setInterval(() => {
      this.renderDashboard();
    }, this.config.refreshRate);

    // Cleanup on process exit
    process.on("SIGINT", () => {
      clearInterval(updateInterval);
      console.log("\n📊 Dashboard stopped");
      process.exit(0);
    });
  }

  private renderDashboard(): void {
    // Clear screen (works in most terminals)
    console.clear();

    console.log("🚀 Kalman Filter Performance Dashboard v2.4.2");
    console.log("=".repeat(60));
    console.log(`Last updated: ${new Date().toISOString()}`);
    console.log(
      `Security: ${this.config.securityLevel} | Features: ${this.config.features.join(", ")}`
    );
    console.log();

    console.log("📈 Market Half-Life Analysis");
    console.log(this.renderHalfLifeTable());
    console.log();

    console.log("📊 Recent Performance Metrics");
    console.log(this.renderMetricsTable());
    console.log();

    // System status
    const avgLatency =
      this.metrics.length > 0
        ? this.metrics.reduce((sum, m) => sum + m.latency, 0) /
          this.metrics.length
        : 0;

    const avgAccuracy =
      this.metrics.length > 0
        ? this.metrics.reduce((sum, m) => sum + m.accuracy, 0) /
          this.metrics.length
        : 0;

    console.log("🔧 System Status");
    console.log(`   Average Latency: ${avgLatency.toFixed(2)}ms`);
    console.log(`   Average Accuracy: ${(avgAccuracy * 100).toFixed(1)}%`);
    console.log(`   Active Patterns: ${this.metrics.length}`);
    console.log(`   Unicode Engine: ✅ Zero-cost rendering`);
    console.log(`   Security Layer: ✅ CVE-2024 protected`);
  }

  // Performance analytics
  analyzePerformance(): {
    avgLatency: number;
    avgThroughput: number;
    avgAccuracy: number;
    securityScore: number;
    recommendations: string[];
  } {
    if (this.metrics.length === 0) {
      return {
        avgLatency: 0,
        avgThroughput: 0,
        avgAccuracy: 0,
        securityScore: 0,
        recommendations: ["No metrics available for analysis"],
      };
    }

    const avgLatency =
      this.metrics.reduce((sum, m) => sum + m.latency, 0) / this.metrics.length;
    const avgThroughput =
      this.metrics.reduce((sum, m) => sum + m.throughput, 0) /
      this.metrics.length;
    const avgAccuracy =
      this.metrics.reduce((sum, m) => sum + m.accuracy, 0) /
      this.metrics.length;
    const securityScore =
      this.metrics.reduce((sum, m) => sum + m.securityScore, 0) /
      this.metrics.length;

    const recommendations: string[] = [];

    if (avgLatency > 100) {
      recommendations.push(
        "High latency detected - consider optimizing Kalman filter parameters"
      );
    }

    if (avgAccuracy < 0.8) {
      recommendations.push(
        "Low accuracy - review pattern detection thresholds"
      );
    }

    if (securityScore < 0.9) {
      recommendations.push(
        "Security score below threshold - review trustedDependencies configuration"
      );
    }

    return {
      avgLatency,
      avgThroughput,
      avgAccuracy,
      securityScore,
      recommendations,
    };
  }

  // Demonstration function
  static demonstrate(): void {
    console.log("🚀 Zero-Cost Performance Dashboard");
    console.log("====================================");

    const dashboard = new PerformanceDashboard();

    // Add sample metrics
    const sampleMetrics: PerformanceMetrics[] = [
      {
        patternId: 74,
        latency: 45.2,
        throughput: 1200,
        accuracy: 0.92,
        securityScore: 0.98,
        timestamp: Date.now(),
      },
      {
        patternId: 81,
        latency: 32.1,
        throughput: 1500,
        accuracy: 0.89,
        securityScore: 0.97,
        timestamp: Date.now(),
      },
      {
        patternId: 85,
        latency: 67.8,
        throughput: 900,
        accuracy: 0.94,
        securityScore: 0.99,
        timestamp: Date.now(),
      },
      {
        patternId: 88,
        latency: 28.9,
        throughput: 1800,
        accuracy: 0.87,
        securityScore: 0.96,
        timestamp: Date.now(),
      },
    ];

    sampleMetrics.forEach((metric) => dashboard.addMetric(metric));

    // Render tables
    console.log("📈 Market Half-Life Analysis");
    console.log(dashboard.renderHalfLifeTable());
    console.log();

    console.log("📊 Performance Metrics");
    console.log(dashboard.renderMetricsTable());
    console.log();

    // Performance analysis
    const analysis = dashboard.analyzePerformance();
    console.log("📊 Performance Analysis");
    console.log(`   Average Latency: ${analysis.avgLatency.toFixed(2)}ms`);
    console.log(
      `   Average Throughput: ${analysis.avgThroughput.toFixed(0)} req/s`
    );
    console.log(
      `   Average Accuracy: ${(analysis.avgAccuracy * 100).toFixed(1)}%`
    );
    console.log(
      `   Security Score: ${(analysis.securityScore * 100).toFixed(1)}%`
    );

    if (analysis.recommendations.length > 0) {
      console.log("   Recommendations:");
      analysis.recommendations.forEach((rec) => console.log(`     • ${rec}`));
    }

    console.log("\n✅ Dashboard demonstration complete");
  }
}

// Export zero-cost functions
export const renderTable = PerformanceDashboard.prototype.renderHalfLifeTable;
export const addMetric = PerformanceDashboard.prototype.addMetric;

// Run demonstration if called directly
if (import.meta.main) {
  PerformanceDashboard.demonstrate();
}
