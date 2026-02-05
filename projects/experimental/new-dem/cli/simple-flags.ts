#!/usr/bin/env bun

// Simplified T3-Lattice CLI with Flags
// Focus on core functionality with flag support

import {
  COMPONENTS,
  VIEWS,
  getComponentById,
  getViewComponents,
  renderGraphASCII,
  matchVersion,
  generateDashboardHTML,
  startDashboard
} from "../src/core.ts";

// CLI Options
interface CLIOptions {
  verbose: boolean;
  quiet: boolean;
  json: boolean;
  watch: boolean;
  interval: number;
  dryRun: boolean;
  port: number;
  host: string;
  logLevel: 'info' | 'error';
  headers: Record<string, string>;
  timeout: number;
}

// Parse CLI flags (simplified)
function parseFlags(args: string[]): { command: string; options: CLIOptions; args: string[] } {
  const options: CLIOptions = {
    verbose: false,
    quiet: false,
    json: false,
    watch: false,
    interval: 5000,
    dryRun: false,
    port: 8080,
    host: 'localhost',
    logLevel: 'info',
    headers: {},
    timeout: 30000
  };

  const remainingArgs: string[] = [];
  let command = '';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '-v':
      case '--verbose':
        options.verbose = true;
        break;
      case '-q':
      case '--quiet':
        options.quiet = true;
        break;
      case '--json':
        options.json = true;
        break;
      case '-w':
      case '--watch':
        options.watch = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--port':
      case '-p':
        options.port = parseInt(args[++i]) || 8080;
        break;
      case '--host':
      case '-H':
        options.host = args[++i] || 'localhost';
        break;
      case '--header':
      case '-h':
        const headerStr = args[++i];
        if (headerStr) {
          const [key, ...valueParts] = headerStr.split(':');
          if (key && valueParts.length > 0) {
            options.headers[key.trim()] = valueParts.join(':').trim();
          }
        }
        break;
      case '--timeout':
      case '-t':
        options.timeout = parseInt(args[++i]) || 30000;
        break;
      default:
        if (!arg.startsWith('-') && !command) {
          command = arg;
        } else {
          remainingArgs.push(arg);
        }
        break;
    }
  }

  return { command, options, args: remainingArgs };
}

// Logging
function log(level: keyof CLIOptions, message: string, options: CLIOptions) {
  if (level === 'error' || (options.verbose && level === 'info')) {
    if (!options.quiet) console.log(`[${level.toUpperCase()}] ${message}`);
  }
}

function output(data: any, options: CLIOptions) {
  if (options.json) {
    console.log(JSON.stringify(data, null, 2));
  } else if (!options.quiet) {
    console.log(data);
  }
}

// Commands
function showStats(options: CLIOptions) {
  log('info', "📊 T3-Lattice Registry Statistics", options);

  const stats = {
    "Total Components": COMPONENTS.length,
    "Categories": new Set(COMPONENTS.map(c => c.category)).size,
    "Stable": COMPONENTS.filter(c => c.status === 'stable').length,
    "Beta": COMPONENTS.filter(c => c.status === 'beta').length,
    "Experimental": COMPONENTS.filter(c => c.status === 'experimental').length,
    "Views": Object.keys(VIEWS).length
  };

  output(stats, options);
  if (!options.json && !options.quiet) {
    Object.entries(stats).forEach(([label, value]) => {
      console.log(`${label.padEnd(16)}: ${value}`);
    });
    console.log("═".repeat(60));
  }
}

async function showHealth(options: CLIOptions) {
  log('info', "🏥 System Health Check", options);

  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    components: COMPONENTS.length,
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    uptime: Math.round(process.uptime())
  };

  // Test component loading
  try {
    const testComponent = getComponentById(1);
    if (options.verbose) log('info', "Registry Test: ✅ Component lookup working", options);
  } catch (error) {
    health.status = "degraded";
    log('error', `Registry Test: ❌ Component lookup failed`, options);
  }

  if (options.watch) {
    log('info', "Entering watch mode... (Ctrl+C to exit)", options);
    setInterval(() => showHealth(options), options.interval);
  } else {
    output(health, options);
    if (!options.json && !options.quiet) {
      console.log("═".repeat(60));
      console.log(`Status: ✅ ${health.status.toUpperCase()}`);
      console.log(`Components: ${health.components} loaded`);
      console.log(`Memory: ${health.memory}MB used`);
      console.log(`Uptime: ${health.uptime}s`);
      console.log("═".repeat(60));
    }
  }
}

async function prefetchResources(type: "dns" | "db" | "all", options: CLIOptions) {
  log('info', `🔄 Prefetching resources: ${type}`, options);

  if (options.dryRun) {
    log('info', "DRY RUN: Would prefetch resources", options);
    return;
  }

  if (type === "dns" || type === "all") {
    log('info', "🌐 DNS Prefetching...", options);
    const dnsHosts = ["api.github.com", "registry.npmjs.org", "bun.sh"];

    for (const host of dnsHosts) {
      try {
        await Bun.dns.prefetch(host);
        log('info', `   ✅ ${host}`, options);
      } catch (error) {
        log('error', `   ❌ ${host}`, options);
      }
    }
  }

  if (type === "db" || type === "all") {
    log('info', "💾 Database Prefetching...", options);
    const dbConnections = ["sqlite:main.db", "redis:localhost:6379"];

    for (const conn of dbConnections) {
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        log('info', `   ✅ ${conn} (simulated)`, options);
      } catch (error) {
        log('error', `   ❌ ${conn}`, options);
      }
    }
  }

  log('info', "🎉 Resource prefetching complete!", options);
}

async function startDashboardServer(port: string, options: CLIOptions) {
  const portNum = port ? parseInt(port) : options.port;
  const host = options.host;

  log('info', `🚀 Starting T3-Lattice Dashboard on ${host}:${portNum}...`, options);

  if (options.dryRun) {
    log('info', "DRY RUN: Would start dashboard server", options);
    return;
  }

  startDashboard({
    port: portNum,
    host: host,
    headers: options.headers,
    cors: true, // Enable CORS by default for CLI
    timeout: options.timeout
  });
}

function showHelp(options: CLIOptions) {
  if (!options.quiet) {
    console.log("🚀 T3-Lattice Registry Plugin");
    console.log("═".repeat(60));
    console.log("Unified interface for all T3-Lattice components\n");
  }

  if (!options.quiet) {
    console.log("Available Commands:");
    console.log("  stats         Show registry statistics");
    console.log("  health        System health check");
    console.log("  prefetch <type> Prefetch DNS/database resources");
    console.log("  dashboard [port] Start web dashboard");
    console.log("  help          Show this help message");

    console.log("\nCLI Flags:");
    console.log("  -v, --verbose     Enable verbose output");
    console.log("  -q, --quiet       Suppress output");
    console.log("  --json           JSON output format");
    console.log("  -w, --watch      Watch mode for monitoring");
    console.log("  --interval <ms>  Watch interval (default: 5000)");
    console.log("  --dry-run        Test without execution");
    console.log("  -p, --port <port>     Server port (default: 8080)");
    console.log("  -H, --host <host>     Server host (default: localhost)");
    console.log("  -h, --header <k:v>    Custom header (can be used multiple times)");
    console.log("  -t, --timeout <ms>    Request timeout (default: 30000)");

    console.log("\nExamples:");
    console.log("  t3 stats --json");
    console.log("  t3 health --watch --interval 2000");
    console.log("  t3 dashboard --port 3000 --host 0.0.0.0");
    console.log("  t3 dashboard --header 'Authorization: Bearer token'");
    console.log("  t3 prefetch all --dry-run");
  }
}

// Main CLI logic
async function main() {
  const { command, options, args } = parseFlags(process.argv.slice(2));

  try {
    switch (command) {
      case 'stats':
        showStats(options);
        break;
      case 'health':
        await showHealth(options);
        break;
      case 'prefetch':
        await prefetchResources(args[0] as "dns" | "db" | "all" || "all", options);
        break;
      case 'dashboard':
        await startDashboardServer(args[0], options);
        break;
      case 'help':
      case 'h':
      case '?':
      default:
        showHelp(options);
        break;
    }
  } catch (error) {
    log('error', `Command failed: ${error}`, options);
    process.exit(1);
  }
}

main();