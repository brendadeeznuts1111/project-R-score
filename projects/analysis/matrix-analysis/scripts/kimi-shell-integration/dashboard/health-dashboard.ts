#!/usr/bin/env bun
/**
 * Health Monitoring Dashboard
 * 
 * Real-time web dashboard for unified shell bridge monitoring
 * Serves at http://localhost:18790 by default
 */

import { serve, type Server } from "bun";
import { getHealthStatus, telemetry, signalState } from "../unified-shell-bridge";

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  port: 18790,
  host: "127.0.0.1",
  refreshIntervalMs: 1000,
  maxHistoryPoints: 100,
};

// ============================================================================
// State Management
// ============================================================================

interface MetricsHistory {
  timestamps: number[];
  commandsPerSecond: number[];
  errorRate: number[];
  memoryUsage: number[];
}

const history: MetricsHistory = {
  timestamps: [],
  commandsPerSecond: [],
  errorRate: [],
  memoryUsage: [],
};

let lastCommandCount = 0;
let lastErrorCount = 0;

// ============================================================================
// Metrics Collection
// ============================================================================

function collectMetrics(): void {
  const now = Date.now();
  
  // Calculate rates
  const commandsDelta = telemetry.commandsExecuted - lastCommandCount;
  const errorsDelta = telemetry.errors - lastErrorCount;
  
  lastCommandCount = telemetry.commandsExecuted;
  lastErrorCount = telemetry.errors;
  
  // Add to history
  history.timestamps.push(now);
  history.commandsPerSecond.push(commandsDelta);
  history.errorRate.push(errorsDelta);
  history.memoryUsage.push(process.memoryUsage.rss() / 1024 / 1024); // MB
  
  // Trim history
  if (history.timestamps.length > CONFIG.maxHistoryPoints) {
    history.timestamps.shift();
    history.commandsPerSecond.shift();
    history.errorRate.shift();
    history.memoryUsage.shift();
  }
}

// ============================================================================
// HTML Dashboard
// ============================================================================

function generateDashboardHtml(): string {
  const health = getHealthStatus() as any;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kimi Shell Bridge - Health Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      padding: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding: 20px;
      background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
      border-radius: 12px;
      border: 1px solid #334155;
    }
    .header h1 {
      font-size: 2rem;
      margin-bottom: 10px;
      background: linear-gradient(90deg, #60a5fa, #a78bfa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .card {
      background: #1e293b;
      border-radius: 12px;
      padding: 20px;
      border: 1px solid #334155;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    }
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 15px;
    }
    .card-title {
      font-size: 0.875rem;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .card-value {
      font-size: 2rem;
      font-weight: 700;
      color: #f8fafc;
    }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 500;
    }
    .status-healthy {
      background: rgba(34, 197, 94, 0.2);
      color: #22c55e;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .signal-list {
      list-style: none;
    }
    .signal-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px;
      background: #0f172a;
      border-radius: 6px;
      margin-bottom: 8px;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #64748b;
      font-size: 0.875rem;
    }
  </style>
  <meta http-equiv="refresh" content="2">
</head>
<body>
  <div class="header">
    <h1>🔮 Kimi Shell Bridge</h1>
    <p>Unified MCP Server Health Dashboard</p>
    <div style="margin-top: 15px;">
      <span class="status ${health.status === 'healthy' ? 'status-healthy' : 'status-warning'}">
        <span class="status-dot" style="background: ${health.status === 'healthy' ? '#22c55e' : '#eab308'};"></span>
        ${health.status.toUpperCase()}
      </span>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-header">
        <span class="card-title">⏱️ Uptime</span>
      </div>
      <div class="card-value">${formatDuration(health.uptime)}</div>
      <div style="color: #64748b; font-size: 0.875rem; margin-top: 5px;">PID: ${health.pid}</div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">⚡ Commands Executed</span>
      </div>
      <div class="card-value">${health.telemetry?.commandsExecuted?.toLocaleString() || 0}</div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">❌ Errors</span>
      </div>
      <div class="card-value" style="color: ${(health.telemetry?.errors || 0) > 10 ? '#ef4444' : '#22c55e'};">
        ${health.telemetry?.errors?.toLocaleString() || 0}
      </div>
      <div style="color: #64748b; font-size: 0.875rem; margin-top: 5px;">Error Rate: ${calculateErrorRate()}%</div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">💾 Memory</span>
      </div>
      <div class="card-value">${Math.round(process.memoryUsage.rss() / 1024 / 1024)}MB</div>
      <div style="color: #64748b; font-size: 0.875rem; margin-top: 5px;">Heap: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB</div>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-header">
        <span class="card-title">📡 Signal History</span>
      </div>
      <ul class="signal-list">
        ${health.signals?.length > 0 
          ? health.signals.map((s: string) => `
            <li class="signal-item">
              <span>${getSignalEmoji(s)}</span>
              <span>${s}</span>
            </li>
          `).join('')
          : '<li class="signal-item"><span>✅</span><span>No signals received</span></li>'
        }
      </ul>
    </div>
  </div>

  <div class="footer">
    <p>Kimi Shell Bridge v2.0.0 | Bun ${Bun.version}</p>
  </div>
</body>
</html>`;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function calculateErrorRate(): string {
  const total = telemetry.commandsExecuted;
  const errors = telemetry.errors;
  if (total === 0) return "0.00";
  return ((errors / total) * 100).toFixed(2);
}

function getSignalEmoji(signal: string): string {
  const emojis: Record<string, string> = {
    "SIGINT": "⚡",
    "SIGTERM": "🛑",
    "SIGHUP": "📞",
  };
  return emojis[signal] || "📡";
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  console.log("🔮 Kimi Shell Bridge - Health Dashboard");
  console.log("=======================================\n");
  
  // Start metrics collection
  setInterval(collectMetrics, CONFIG.refreshIntervalMs);
  
  // Start server
  const server = serve({
    port: CONFIG.port,
    hostname: CONFIG.host,
    fetch(req) {
      const url = new URL(req.url);
      
      if (url.pathname === "/api/health") {
        return Response.json(getHealthStatus());
      }
      
      if (url.pathname === "/" || url.pathname === "/dashboard") {
        return new Response(generateDashboardHtml(), {
          headers: { "Content-Type": "text/html" },
        });
      }
      
      return new Response("Not Found", { status: 404 });
    },
  });
  
  console.log(`🚀 Dashboard: http://${CONFIG.host}:${CONFIG.port}/dashboard`);
  console.log(`🔌 API: http://${CONFIG.host}:${CONFIG.port}/api/health`);
}

if (import.meta.main) {
  main().catch(console.error);
}
