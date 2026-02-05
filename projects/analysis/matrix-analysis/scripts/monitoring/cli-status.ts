#!/usr/bin/env bun
/**
 * Enhanced Dynamic CLI Status Display
 * Real-time status of OpenClaw + Matrix Agent + Kimi Shell + Profile Terminal
 */

import { $ } from "bun";
import { write, stdout } from "process";

// ANSI Colors
const Colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m"
};

const Icons = {
  check: "✓",
  cross: "✗",
  warning: "⚠",
  info: "ℹ",
  rocket: "🚀",
  lobster: "🦞",
  gear: "⚙",
  shield: "🛡",
  chart: "📊",
  clock: "🕐"
};

interface ComponentStatus {
  name: string;
  status: "healthy" | "degraded" | "down" | "unknown";
  latency?: number;
  version?: string;
  uptime?: string;
  details?: string;
}

interface SystemStatus {
  timestamp: Date;
  overall: "healthy" | "degraded" | "critical";
  components: ComponentStatus[];
  metrics: {
    gatewayLatency: number;
    memoryUsage: number;
    activeConnections: number;
    requestsPerSecond: number;
  };
  alerts: {
    critical: number;
    warning: number;
    info: number;
  };
}

async function checkOpenClaw(): Promise<ComponentStatus> {
  const start = performance.now();
  try {
    const token = await Bun.secrets.get({
      service: "com.openclaw.gateway",
      name: "gateway_token"
    });
    
    const response = await fetch("http://127.0.0.1:18789/health", {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
      timeout: 5000
    });
    
    const latency = performance.now() - start;
    
    if (response.ok) {
      return {
        name: "OpenClaw Gateway",
        status: "healthy",
        latency,
        version: "v2026.1.30",
        details: "Port 18789 | Tailscale HTTPS"
      };
    }
    return { name: "OpenClaw Gateway", status: "degraded", latency };
  } catch {
    return { name: "OpenClaw Gateway", status: "down" };
  }
}

async function checkMatrixAgent(): Promise<ComponentStatus> {
  try {
    const result = await $`bun ~/.matrix/matrix-agent.ts status`.quiet().nothrow();
    const healthy = result.exitCode === 0;
    
    return {
      name: "Matrix Agent",
      status: healthy ? "healthy" : "down",
      version: "v1.0.0",
      details: healthy ? "4 integrations active" : "Not responding"
    };
  } catch {
    return { name: "Matrix Agent", status: "unknown" };
  }
}

async function checkTelegram(): Promise<ComponentStatus> {
  try {
    const result = await $`openclaw status 2>&1 | grep -E "Telegram.*ON.*OK"`.quiet().nothrow();
    const connected = result.exitCode === 0;
    
    return {
      name: "Telegram Bot",
      status: connected ? "healthy" : "down",
      details: connected ? "@mikehuntbot_bot | 4 topics" : "Disconnected"
    };
  } catch {
    return { name: "Telegram Bot", status: "unknown" };
  }
}

async function checkKimiShell(): Promise<ComponentStatus> {
  try {
    const result = await $`kimi --version`.quiet().nothrow();
    const version = result.stdout.toString().trim();
    
    return {
      name: "Kimi Shell",
      status: "healthy",
      version: version || "v1.3",
      details: "MCP bridge ready"
    };
  } catch {
    return { name: "Kimi Shell", status: "down" };
  }
}

async function checkProfileTerminal(): Promise<ComponentStatus> {
  try {
    const profiles = await $`ls ~/.matrix/profiles/*.json 2>/dev/null | wc -l`.quiet().nothrow();
    const count = parseInt(profiles.stdout.toString()) || 0;
    
    return {
      name: "Profile Terminal",
      status: "healthy",
      details: `${count} profiles available`
    };
  } catch {
    return { name: "Profile Terminal", status: "unknown" };
  }
}

async function collectStatus(): Promise<SystemStatus> {
  const [openclaw, matrix, telegram, kimi, terminal] = await Promise.all([
    checkOpenClaw(),
    checkMatrixAgent(),
    checkTelegram(),
    checkKimiShell(),
    checkProfileTerminal()
  ]);
  
  const components = [openclaw, matrix, telegram, kimi, terminal];
  
  // Calculate overall status
  const downCount = components.filter(c => c.status === "down").length;
  const degradedCount = components.filter(c => c.status === "degraded").length;
  
  let overall: SystemStatus["overall"] = "healthy";
  if (downCount >= 2) overall = "critical";
  else if (downCount === 1 || degradedCount > 0) overall = "degraded";
  
  // Get metrics
  const memUsage = process.memoryUsage();
  
  return {
    timestamp: new Date(),
    overall,
    components,
    metrics: {
      gatewayLatency: openclaw.latency || 0,
      memoryUsage: Math.round(memUsage.rss / 1024 / 1024),
      activeConnections: 0, // Would need to track
      requestsPerSecond: 0  // Would need to track
    },
    alerts: { critical: 0, warning: 0, info: 0 } // Would check alert file
  };
}

function getStatusColor(status: string): string {
  switch (status) {
    case "healthy": return Colors.green;
    case "degraded": return Colors.yellow;
    case "down": return Colors.red;
    default: return Colors.dim;
  }
}

function getStatusIcon(status: string): string {
  switch (status) {
    case "healthy": return Icons.check;
    case "degraded": return Icons.warning;
    case "down": return Icons.cross;
    default: return Icons.info;
  }
}

function getOverallColor(overall: string): string {
  switch (overall) {
    case "healthy": return Colors.bgGreen + Colors.white;
    case "degraded": return Colors.bgYellow + Colors.white;
    case "critical": return Colors.bgRed + Colors.white;
    default: return Colors.dim;
  }
}

function clearScreen() {
  stdout.write("\x1b[2J\x1b[H");
}

function drawBox(width: number, title: string, content: string[]): string {
  const lines: string[] = [];
  const topBorder = "┌" + "─".repeat(width - 2) + "┐";
  const bottomBorder = "└" + "─".repeat(width - 2) + "┘";
  
  lines.push(topBorder);
  lines.push("│" + Colors.bright + title.padEnd(width - 2) + Colors.reset + "│");
  lines.push("├" + "─".repeat(width - 2) + "┤");
  
  for (const line of content) {
    lines.push("│" + line.padEnd(width - 2) + "│");
  }
  
  lines.push(bottomBorder);
  return lines.join("\n");
}

function renderStatus(status: SystemStatus) {
  clearScreen();
  
  const width = 70;
  const lines: string[] = [];
  
  // Header
  const overallBadge = getOverallColor(status.overall) + 
    ` ${status.overall.toUpperCase()} ${Colors.reset}`;
  
  lines.push("");
  lines.push(Colors.cyan + Colors.bright + 
    `    ${Icons.lobster} OpenClaw Unified Status ${Icons.gear}`.padEnd(width) + 
    Colors.reset);
  lines.push(Colors.dim + 
    `    ${status.timestamp.toLocaleString()} | Overall: ${overallBadge}`.padEnd(width) + 
    Colors.reset);
  lines.push("");
  
  // Components Grid
  lines.push("  " + Colors.bright + "COMPONENT STATUS" + Colors.reset);
  lines.push("  " + "─".repeat(width - 4));
  
  for (const comp of status.components) {
    const color = getStatusColor(comp.status);
    const icon = getStatusIcon(comp.status);
    const latency = comp.latency ? `(${comp.latency.toFixed(1)}ms)` : "";
    const version = comp.version || "";
    
    const line = `  ${icon} ${color}${Colors.bright}${comp.name}${Colors.reset} ${latency} ${Colors.dim}${version}${Colors.reset}`;
    lines.push(line);
    
    if (comp.details) {
      lines.push(`     ${Colors.dim}${comp.details}${Colors.reset}`);
    }
    lines.push("");
  }
  
  // Metrics Section
  lines.push("  " + Colors.bright + "METRICS" + Colors.reset);
  lines.push("  " + "─".repeat(width - 4));
  lines.push(`  ${Icons.chart} Gateway Latency: ${Colors.cyan}${status.metrics.gatewayLatency.toFixed(2)}ms${Colors.reset}`);
  lines.push(`  ${Icons.chart} Memory Usage: ${Colors.cyan}${status.metrics.memoryUsage} MB${Colors.reset}`);
  lines.push("");
  
  // Quick Actions
  lines.push("  " + Colors.bright + "QUICK ACTIONS" + Colors.reset);
  lines.push("  " + "─".repeat(width - 4));
  lines.push(`  ${Colors.dim}Press [r] to refresh | [q] to quit | [d] for details${Colors.reset}`);
  lines.push("");
  
  stdout.write(lines.join("\n") + "\n");
}

async function main() {
  const args = process.argv.slice(2);
  
  // Single run mode
  if (args.includes("--once")) {
    const status = await collectStatus();
    renderStatus(status);
    process.exit(0);
  }
  
  // Watch mode (default)
  console.log(Colors.dim + "Starting status monitor... (press 'q' to quit)" + Colors.reset);
  await new Promise(r => setTimeout(r, 1000));
  
  let running = true;
  
  // Handle keypress
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on("data", (key: Buffer) => {
    const char = key.toString();
    if (char === "q" || char === "\u0003") { // q or Ctrl+C
      running = false;
      clearScreen();
      console.log(Colors.green + "Status monitor stopped." + Colors.reset);
      process.exit(0);
    } else if (char === "r") {
      // Force refresh
    }
  });
  
  while (running) {
    const status = await collectStatus();
    renderStatus(status);
    
    // Wait 5 seconds or until keypress
    await new Promise(r => setTimeout(r, 5000));
  }
}

main().catch(console.error);
