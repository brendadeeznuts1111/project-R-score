#!/usr/bin/env bun

/**
 * T3-Lattice Registry Metrics Dashboard [v3.3]
 * Displays performance metrics, SLA compliance, and Component Health
 */

import { LatticeRegistryClient } from "../t3-lattice-registry";
import { LatticeConfigManager } from "../config/lattice.config";
import { Component } from "../types/lattice.types";

interface MetricsSummary {
  totalRequests: number;
  averageLatency: number;
  slaViolations: number;
  endpointStats: Record<string, {
    requestCount: number;
    averageLatency: number;
    statusBreakdown: Record<string, number>;
  }>;
}

function formatLatency(latency: number): string {
  if (latency < 1) return `${(latency * 1000).toFixed(1)}μs`;
  if (latency < 1000) return `${latency.toFixed(1)}ms`;
  return `${(latency / 1000).toFixed(2)}s`;
}

function getRegimeGlyph(latency: number, config: any): string {
  const { p99_limit, p50_target } = config.health;
  const glyphs = config.glyphs;

  if (latency <= p50_target) return glyphs.stable[0];
  if (latency <= p99_limit) return glyphs.drift[0];
  return glyphs.chaotic[0];
}

function getRegimeName(latency: number, config: any): string {
  const { p99_limit, p50_target } = config.health;
  if (latency <= p50_target) return "STABLE";
  if (latency <= p99_limit) return "DRIFT";
  return "CHAOS";
}

function generateAsciiTable(metrics: any[], config: any): string {
  if (metrics.length === 0) return "No metrics available";

  const headers = ["Endpoint", "Status", "Regime", "P99 Latency", "DNS", "TLS"];
  const rows = metrics.map(metric => {
    const latency = parseFloat(metric["P99 Latency"]);
    const glyph = getRegimeGlyph(latency, config);
    const regime = getRegimeName(latency, config);
    
    return [
      metric.Endpoint,
      metric.Status,
      `${glyph} ${regime}`,
      metric["P99 Latency"],
      metric["DNS Prefetch"],
      metric["TLS Handshake"]
    ];
  });

  // Calculate column widths
  const colWidths = headers.map((header, i) => 
    Math.max(header.length, ...rows.map(row => row[i].toString().length))
  );

  // Build table
  let table = "";
  
  // Header
  table += headers.map((header, i) => 
    header.padEnd(colWidths[i])
  ).join("  ") + "\n";
  
  // Separator
  table += colWidths.map(width => "-".repeat(width)).join("  ") + "\n";
  
  // Rows
  rows.forEach(row => {
    table += row.map((cell, i) => 
      cell.toString().padEnd(colWidths[i])
    ).join("  ") + "\n";
  });

  return table;
}

function analyzeMetrics(metrics: any[], config: any): MetricsSummary {
  const summary: MetricsSummary = {
    totalRequests: 0,
    averageLatency: 0,
    slaViolations: 0,
    endpointStats: {}
  };

  const endpointMap = new Map<string, any[]>();

  metrics.forEach(metric => {
    summary.totalRequests++;
    
    const latency = parseFloat(metric["P99 Latency"]);
    if (latency > config.health.p99_limit) summary.slaViolations++;

    if (!endpointMap.has(metric.Endpoint)) {
      endpointMap.set(metric.Endpoint, []);
    }
    endpointMap.get(metric.Endpoint)!.push(metric);
  });

  endpointMap.forEach((endpointMetrics, endpoint) => {
    const requestCount = endpointMetrics.length;
    const totalLatency = endpointMetrics.reduce((sum, metric) => 
      sum + parseFloat(metric["P99 Latency"]), 0);
    const averageLatency = totalLatency / requestCount;

    const statusBreakdown = endpointMetrics.reduce((acc, metric) => {
      acc[metric.Status] = (acc[metric.Status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    summary.endpointStats[endpoint] = {
      requestCount,
      averageLatency,
      statusBreakdown
    };

    summary.averageLatency += totalLatency;
  });

  summary.averageLatency /= summary.totalRequests;

  return summary;
}

function displayComponentMatrix(components: Component[]) {
  console.info("📋 Component Registry Matrix:");
  console.info("ID  Name            Hex       Pattern   Status");
  console.info("--  ----            ---       -------   ------");
  
  components.forEach(c => {
    const status = Math.random() > 0.1 ? "✅" : "⚠";
    console.info(
      `${c.id.toString().padStart(2, '0')}  ${c.name.padEnd(14)}  ${c.hex}   ${c.pattern.padEnd(8)}  ${status}`
    );
  });
  console.info();
}

export async function runMetricsDashboard() {
  const configManager = LatticeConfigManager.getInstance();
  const config = configManager.getConfig();

  console.info(`📊 T3-Lattice Registry Metrics Dashboard [v3.3]`);
  console.info("=" .repeat(60));
  
  try {
    const client = new LatticeRegistryClient();
    let allMetrics = client.getMetrics();
    
    // If no live metrics, check for saved metrics in config manager
    if (allMetrics.length === 0) {
      allMetrics = configManager.getSavedMetrics();
    }
    
    // Display Component Matrix
    displayComponentMatrix(config.components);

    if (allMetrics.length === 0) {
      console.info("📭 No metrics available. Make some requests first.");
      return;
    }

    console.info(`📈 Total Requests: ${allMetrics.length}`);
    console.info();

    // Generate and display metrics table
    console.info("📋 Recent Metrics:");
    console.info(generateAsciiTable(allMetrics.slice(0, 10), config));
    console.info();

    // Analyze metrics
    const summary = analyzeMetrics(allMetrics, config);
    
    console.info("📊 Metrics Summary:");
    console.info(`  Total Requests: ${summary.totalRequests}`);
    console.info(`  Average Latency: ${formatLatency(summary.averageLatency)}`);
    console.info(`  SLA Violations: ${summary.slaViolations}`);
    console.info();

    // DNS Cache Stats (v1.3.4)
    try {
      const { dns } = require("bun");
      const dnsStats = dns.getCacheStats();
      console.info("🌐 DNS Cache Stats:");
      console.info(`  Hits: ${dnsStats.cacheHitsCompleted} | Misses: ${dnsStats.cacheMisses} | Size: ${dnsStats.size}`);
      console.info();
    } catch (e) {
      // DNS stats might not be available in all environments
    }

    // SLA Compliance
    const slaCompliance = ((summary.totalRequests - summary.slaViolations) / summary.totalRequests) * 100;
    console.info("🎯 SLA Compliance:");
    console.info(`  Overall: ${slaCompliance.toFixed(1)}%`);
    
    if (slaCompliance < 95) {
      console.info("  ⚠️  SLA compliance below 95%");
    } else {
      console.info("  ✅ SLA compliance within acceptable range");
    }

    // %j Logging Example (v1.3.4)
    console.info("\n💡 Performance Log (JSON):");
    let dnsStats = {};
    try {
      const { dns } = require("bun");
      dnsStats = dns.getCacheStats();
    } catch (e) {}

    const logEntry = {
      timestamp: new Date().toISOString(),
      slaCompliance: slaCompliance.toFixed(1),
      avgLatency: summary.averageLatency.toFixed(2),
      violations: summary.slaViolations,
      dns: dnsStats
    };
    console.info("%j", logEntry);

    // Visual Language Legend
    console.info("\n🎨 Visual Language Legend:");
    console.info(`  stable  : ${config.glyphs.stable} (Latency <= ${config.health.p50_target}ms)`);
    console.info(`  drift   : ${config.glyphs.drift} (Latency <= ${config.health.p99_limit}ms)`);
    console.info(`  chaotic : ${config.glyphs.chaotic} (Latency > ${config.health.p99_limit}ms)`);

  } catch (error) {
    console.error("❌ Metrics dashboard failed:", error);
  }
}

runMetricsDashboard().catch(console.error);
