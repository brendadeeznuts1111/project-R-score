#!/usr/bin/env bun
/**
 * OpenClaw Prometheus Metrics Exporter
 * Exposes health metrics for Prometheus scraping
 */

import { $ } from "bun";

const PORT = 9090;
const METRICS_PATH = "/metrics";

interface SystemMetrics {
  gatewayUp: number;
  gatewayLatency: number;
  gatewayRequestsTotal: number;
  gatewayErrorsTotal: number;
  telegramConnected: number;
  matrixAgentUp: number;
  memoryUsage: number;
  cpuUsage: number;
  timestamp: number;
}

async function collectMetrics(): Promise<SystemMetrics> {
  const start = performance.now();
  
  // Check OpenClaw gateway
  let gatewayUp = 0;
  let gatewayLatency = 0;
  try {
    const token = await Bun.secrets.get({
      service: "com.openclaw.gateway",
      name: "gateway_token"
    });
    const response = await fetch("http://127.0.0.1:18789/health", {
      headers: token ? { "Authorization": `Bearer ${token}` } : {}
    });
    gatewayUp = response.ok ? 1 : 0;
    gatewayLatency = performance.now() - start;
  } catch {
    gatewayUp = 0;
  }
  
  // Check Matrix Agent
  let matrixAgentUp = 0;
  try {
    const result = await $`bun ~/.matrix/matrix-agent.ts status`.quiet().nothrow();
    matrixAgentUp = result.exitCode === 0 ? 1 : 0;
  } catch {
    matrixAgentUp = 0;
  }
  
  // Check Telegram (via OpenClaw status)
  let telegramConnected = 0;
  try {
    const status = await $`openclaw status 2>&1 | grep -q "Telegram.*OK"`.quiet().nothrow();
    telegramConnected = status.exitCode === 0 ? 1 : 0;
  } catch {
    telegramConnected = 0;
  }
  
  // Process metrics
  const memUsage = process.memoryUsage();
  
  return {
    gatewayUp,
    gatewayLatency,
    gatewayRequestsTotal: 0, // Would need actual counter
    gatewayErrorsTotal: gatewayUp === 0 ? 1 : 0,
    telegramConnected,
    matrixAgentUp,
    memoryUsage: Math.round(memUsage.rss / 1024 / 1024), // MB
    cpuUsage: 0, // Would need process.cpuUsage()
    timestamp: Date.now()
  };
}

function formatMetrics(m: SystemMetrics): string {
  return `# OpenClaw Metrics
# HELP openclaw_gateway_up Gateway is responding
# TYPE openclaw_gateway_up gauge
openclaw_gateway_up ${m.gatewayUp}

# HELP openclaw_gateway_latency_ms Gateway response latency
# TYPE openclaw_gateway_latency_ms gauge
openclaw_gateway_latency_ms ${m.gatewayLatency.toFixed(2)}

# HELP openclaw_gateway_errors_total Total gateway errors
# TYPE openclaw_gateway_errors_total counter
openclaw_gateway_errors_total ${m.gatewayErrorsTotal}

# HELP openclaw_telegram_connected Telegram bot connected
# TYPE openclaw_telegram_connected gauge
openclaw_telegram_connected ${m.telegramConnected}

# HELP openclaw_matrix_agent_up Matrix Agent running
# TYPE openclaw_matrix_agent_up gauge
openclaw_matrix_agent_up ${m.matrixAgentUp}

# HELP openclaw_memory_usage_mb Memory usage in MB
# TYPE openclaw_memory_usage_mb gauge
openclaw_memory_usage_mb ${m.memoryUsage}

# HELP openclaw_collection_timestamp Metrics collection timestamp
# TYPE openclaw_collection_timestamp gauge
openclaw_collection_timestamp ${m.timestamp}
`;
}

// HTTP Server
const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    
    if (url.pathname === METRICS_PATH) {
      const metrics = await collectMetrics();
      return new Response(formatMetrics(metrics), {
        headers: { "Content-Type": "text/plain" }
      });
    }
    
    if (url.pathname === "/health") {
      return Response.json({ status: "ok", timestamp: Date.now() });
    }
    
    return new Response("Not Found", { status: 404 });
  }
});

console.log(`📊 Prometheus metrics server running on http://localhost:${PORT}${METRICS_PATH}`);
console.log(`   Health check: http://localhost:${PORT}/health`);
