#!/usr/bin/env bun

// bunmark-cli.ts - Complete CLI for Bunmark Dashboard System
import { spawn } from "bun";

const CLI_VERSION = "1.3.7";
const AVAILABLE_DASHBOARDS: Record<string, { file: string; port: number; description: string }> = {
  basic: { file: "dashboard.tsx", port: 3137, description: "Basic performance dashboard" },
  enterprise: { file: "enterprise-dashboard.tsx", port: 3138, description: "Enterprise proxy dashboard" },
  spectrum: { file: "bunmark-dashboard.tsx", port: 3137, description: "125W animated spectrum matrix" },
  features: { file: "v1.3.7-features.tsx", port: 3137, description: "v1.3.7 features live demo" }
};

function showHelp() {
  console.info(`
🚀 BUNMARK CLI v${CLI_VERSION} - Dashboard System Controller

USAGE:
  bun run bunmark-cli.ts [COMMAND] [OPTIONS]

COMMANDS:
  start <dashboard>     Start a specific dashboard
  list                  List all available dashboards
  status               Show running dashboards
  stop <port>          Stop dashboard on port
  test <dashboard>     Test dashboard endpoints
  dev                  Development mode with hot reload

DASHBOARDS:
  basic                Basic performance dashboard (port 3137)
  enterprise           Enterprise proxy dashboard (port 3138)
  spectrum             125W animated spectrum (port 3137)
  features             v1.3.7 features demo (port 3137)

OPTIONS:
  --proxy <url>        Use HTTPS_PROXY for corporate networks
  --profile            Enable CPU profiling
  --smol               Use optimized binary
  --port <number>      Override default port
  --verbose            Show detailed output

EXAMPLES:
  bun run bunmark-cli.ts start basic
  bun run bunmark-cli.ts start enterprise --proxy https://proxy.company:8080
  bun run bunmark-cli.ts start spectrum --profile --smol
  bun run bunmark-cli.ts test features
  bun run bunmark-cli.ts status

ENVIRONMENT:
  HTTPS_PROXY          Corporate proxy URL
  AWS_KEY             AWS access key for S3
  AWS_SECRET          AWS secret key for S3

🏆 BUNMARK - Performance Dashboards for Bun
`);
}

function listDashboards() {
  console.info("\n📊 Available Dashboards:");
  console.info("─".repeat(60));
  
  Object.entries(AVAILABLE_DASHBOARDS).forEach(([key, info]) => {
    console.info(`  ${key.padEnd(12)} │ Port ${info.port} │ ${info.description}`);
  });
  
  console.info("\n🚀 Quick Start:");
  console.info("  bun run bunmark-cli.ts start <dashboard>");
  console.info("  bun run bunmark-cli.ts dev    # Development mode");
}

async function startDashboard(name: string, options: any = {}) {
  const dashboard = AVAILABLE_DASHBOARDS[name];
  if (!dashboard) {
    console.error(`❌ Unknown dashboard: ${name}`);
    console.info("Run 'bun run bunmark-cli.ts list' to see available dashboards");
    process.exit(1);
  }

  const port = options.port || dashboard.port;
  const args = ["--hot"];
  
  if (options.profile) args.push("--cpu-prof-md");
  if (options.smol) args.push("--smol");
  if (options.verbose) console.info(`🔧 Starting ${name} dashboard...`);
  
  const env = { ...process.env };
  if (options.proxy) {
    env.HTTPS_PROXY = options.proxy;
    env.HTTP_PROXY = options.proxy;
    if (options.verbose) console.info(`🔒 Using proxy: ${options.proxy}`);
  }
  
  console.info(`🚀 Starting ${name} dashboard on port ${port}...`);
  console.info(`📁 File: ${dashboard.file}`);
  console.info(`🌐 URL: http://localhost:${port}`);
  console.info("─".repeat(50));
  
  const proc = spawn({
    cmd: ["bun", ...args, dashboard.file],
    cwd: process.cwd(),
    env,
    stdout: "inherit",
    stderr: "inherit"
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.info("\n🛑 Stopping dashboard...");
    proc.kill();
    process.exit(0);
  });
  
  await proc.exited;
}

async function showStatus() {
  console.info("\n📊 Dashboard Status:");
  console.info("─".repeat(60));
  
  const ports = [3137, 3138];
  
  for (const port of ports) {
    try {
      const response = await fetch(`http://localhost:${port}/`);
      if (response.ok) {
        const title = await response.text();
        const titleMatch = title.match(/<title>(.*?)<\/title>/);
        const dashboardName = titleMatch ? titleMatch[1] : "Unknown";
        console.info(`  ✅ Port ${port}: ${dashboardName}`);
      }
    } catch {
      console.info(`  ❌ Port ${port}: Not running`);
    }
  }
}

async function testDashboard(name: string) {
  const dashboard = AVAILABLE_DASHBOARDS[name];
  if (!dashboard) {
    console.error(`❌ Unknown dashboard: ${name}`);
    process.exit(1);
  }

  console.info(`\n🧪 Testing ${name} dashboard...`);
  console.info("─".repeat(50));
  
  const baseUrl = `http://localhost:${dashboard.port}`;
  
  // Test basic endpoints
  const endpoints = [
    { path: "/", description: "Main dashboard" },
    { path: "/metrics", description: "Metrics API" }
  ];
  
  // Add feature-specific endpoints
  if (name === "features") {
    endpoints.push(
      { path: "/headers", description: "Header casing test" },
      { path: "/json5", description: "JSON5 parsing" },
      { path: "/jsonl", description: "JSONL streaming" },
      { path: "/profile", description: "Profiler info" },
      { path: "/s3", description: "S3 presign" },
      { path: "/wrapansi", description: "ANSI wrapping" },
      { path: "/status", description: "Feature status" }
    );
  } else if (name === "enterprise") {
    endpoints.push(
      { path: "/proxy-status", description: "Proxy configuration" },
      { path: "/fetch-debug", description: "Fetch capabilities" },
      { path: "/source", description: "Source code" },
      { path: "/docs", description: "Documentation" }
    );
  }
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint.path}`);
      const status = response.ok ? "✅" : "❌";
      const time = response.headers.get("x-response-time") || "N/A";
      console.info(`  ${status} ${endpoint.path.padEnd(15)} │ ${endpoint.description.padEnd(20)} │ ${time}`);
    } catch (error) {
      console.info(`  ❌ ${endpoint.path.padEnd(15)} │ ${endpoint.description.padEnd(20)} │ Connection failed`);
    }
  }
  
  console.info(`\n🌐 Full dashboard: ${baseUrl}`);
}

async function devMode() {
  console.info("🔧 Development Mode");
  console.info("─".repeat(50));
  console.info("Starting all dashboards with hot reload...");
  
  // Start spectrum dashboard (most feature-rich)
  await startDashboard("spectrum", { profile: true, smol: true, verbose: true });
}

// Main CLI logic
const args = process.argv.slice(2);
const command = args[0];

if (!command || command === "--help" || command === "-h") {
  showHelp();
  process.exit(0);
}

// Parse options
const options: any = {};
const cleanArgs = [];

for (let i = 1; i < args.length; i++) {
  const arg = args[i];
  if (arg.startsWith("--")) {
    const [key, value] = arg.slice(2).split("=");
    if (value !== undefined) {
      options[key] = value;
    } else {
      options[key] = true;
    }
  } else {
    cleanArgs.push(arg);
  }
}

switch (command) {
  case "start":
    if (!cleanArgs[0]) {
      console.error("❌ Please specify a dashboard to start");
      console.info("Run 'bun run bunmark-cli.ts list' to see available dashboards");
      process.exit(1);
    }
    startDashboard(cleanArgs[0], options);
    break;
    
  case "list":
    listDashboards();
    break;
    
  case "status":
    showStatus();
    break;
    
  case "test":
    if (!cleanArgs[0]) {
      console.error("❌ Please specify a dashboard to test");
      process.exit(1);
    }
    testDashboard(cleanArgs[0]);
    break;
    
  case "stop":
    const port = cleanArgs[0] || options.port;
    if (!port) {
      console.error("❌ Please specify a port to stop");
      process.exit(1);
    }
    console.info(`🛑 Stopping dashboard on port ${port}...`);
    spawn({ cmd: ["pkill", "-f", `port ${port}`] });
    break;
    
  case "dev":
    devMode();
    break;
    
  default:
    console.error(`❌ Unknown command: ${command}`);
    showHelp();
    process.exit(1);
}
