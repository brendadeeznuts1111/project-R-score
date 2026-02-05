#!/usr/bin/env bun

// T3-Lattice Registry Plugin - Unified Interface
// Runs all system components with comprehensive CLI flags

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
import { dnsCacheManager } from "../src/dns-cache.ts";

// CLI Configuration
interface CLIOptions {
  verbose: boolean;
  quiet: boolean;
  json: boolean;
  watch: boolean;
  interval: number;
  dryRun: boolean;
  force: boolean;
  port: number;
  host: string;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  config: string;
  threshold: number;
}

// Parse CLI flags
function parseFlags(args: string[]): { command: string; options: CLIOptions; args: string[] } {
  const options: CLIOptions = {
    verbose: false,
    quiet: false,
    json: false,
    watch: false,
    interval: 5000,
    dryRun: false,
    force: false,
    port: 8080,
    host: 'localhost',
    logLevel: 'info',
    config: '',
    threshold: 80
  };

  const remainingArgs: string[] = [];
  let command = '';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      // Boolean flags
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
      case '--force':
        options.force = true;
        break;

      // Value flags
      case '--interval':
        options.interval = parseInt(args[++i]) || 5000;
        break;
      case '--port':
      case '-p':
        options.port = parseInt(args[++i]) || 8080;
        break;
      case '--host':
      case '-H':
        options.host = args[++i] || 'localhost';
        break;
      case '--log-level':
        const level = args[++i] as CLIOptions['logLevel'];
        if (['error', 'warn', 'info', 'debug'].includes(level)) {
          options.logLevel = level;
        }
        break;
      case '--config':
      case '-c':
        options.config = args[++i] || '';
        break;
      case '--threshold':
      case '-t':
        options.threshold = parseInt(args[++i]) || 80;
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

// Logging utilities
function log(level: CLIOptions['logLevel'], message: string, options: CLIOptions) {
  const levels = { error: 0, warn: 1, info: 2, debug: 3 };
  if (levels[level] <= levels[options.logLevel] && !options.quiet && !options.json) {
    console.log(`[${level.toUpperCase()}] ${message}`);
  }
}

function output(data: any, options: CLIOptions) {
  // Check if we should output JSON by looking for --json in the process args
  const shouldJson = process.argv.includes('--json');
  if (shouldJson) {
    console.log(JSON.stringify(data, null, 2));
  } else if (!options.quiet) {
    console.log(data);
  }
}

interface PluginCommand {
  name: string;
  description: string;
  aliases?: string[];
  handler: (args: string[], options: CLIOptions) => void | Promise<void>;
}

class T3LatticePlugin {
  private commands: Map<string, PluginCommand> = new Map();

  constructor() {
    this.registerCommands();
  }

  private registerCommands() {
    this.addCommand({
      name: "stats",
      description: "Show registry statistics and metrics",
      handler: (args, options) => this.showStats(options)
    });

    this.addCommand({
      name: "list",
      description: "List all components with filtering",
      aliases: ["ls"],
      handler: (args, options) => this.listComponents(args[0], args[1], options)
    });

    this.addCommand({
      name: "get",
      description: "Get detailed component information",
      handler: (args, options) => this.getComponent(args[0], options)
    });

    this.addCommand({
      name: "views",
      description: "Show available component views",
      handler: (args, options) => this.showViews(options)
    });

    this.addCommand({
      name: "view",
      description: "Display components in specific view",
      handler: (args, options) => this.showView(args[0], options)
    });

    this.addCommand({
      name: "graph",
      description: "Display component dependency graph",
      aliases: ["deps"],
      handler: (args, options) => this.showGraph(options)
    });

    this.addCommand({
      name: "dashboard",
      description: "Start interactive web dashboard",
      aliases: ["web", "server"],
      handler: (args, options) => this.startDashboard(args[0], options)
    });

    this.addCommand({
      name: "html",
      description: "Generate static HTML for views",
      handler: (args, options) => this.generateHTML(args[0], options)
    });

    this.addCommand({
      name: "export",
      description: "Export registry data as JSON",
      handler: (args, options) => this.exportData(args[0], options)
    });

    this.addCommand({
      name: "check",
      description: "Check Bun version compatibility",
      handler: (args, options) => this.checkCompatibility(args[0], options)
    });

    this.addCommand({
      name: "colors",
      description: "Display color palette and usage",
      handler: (args, options) => this.showColors(options)
    });

    this.addCommand({
      name: "patterns",
      description: "Show pattern distribution",
      handler: (args, options) => this.showPatterns(options)
    });

    this.addCommand({
      name: "glyphs",
      description: "Open glyph renderer in browser",
      handler: (args, options) => this.showGlyphs(options)
    });

    this.addCommand({
      name: "health",
      description: "System health check and diagnostics",
      handler: this.showHealth
    });

    this.addCommand({
      name: "prefetch",
      description: "Prefetch DNS and database connections",
      handler: (args, options) => this.prefetchResources(args[0] as "dns" | "db" | "all" || "all", options)
    });

    this.addCommand({
      name: "dns-cache",
      aliases: ["dns"],
      description: "Show DNS cache statistics and management",
      handler: (args, options) => this.showDNSCacheStats(options)
    });

    this.addCommand({
      name: "config",
      description: "Show current configuration and test cookie management",
      handler: (args, options) => this.showConfig(options)
    });

    this.addCommand({
      name: "monitor",
      description: "Monitor system resources and performance",
      aliases: ["watch"],
      handler: (args, options) => this.monitor(options)
    });

    this.addCommand({
      name: "config",
      description: "Show current configuration",
      handler: (args, options) => this.showConfig(options)
    });

    this.addCommand({
      name: "help",
      description: "Show this help message",
      aliases: ["h", "?"],
      handler: (args, options) => this.showHelp(options)
    });
  }

  private addCommand(command: PluginCommand) {
    this.commands.set(command.name, command);
    if (command.aliases) {
      command.aliases.forEach(alias => this.commands.set(alias, command));
    }
  }

  private showStats(options: CLIOptions) {
    log('info', "📊 T3-Lattice Registry Statistics", options);

    const stats = {
      "Total Components": COMPONENTS.length,
      "Categories": new Set(COMPONENTS.map(c => c.category)).size,
      "Stable": COMPONENTS.filter(c => c.status === 'stable').length,
      "Beta": COMPONENTS.filter(c => c.status === 'beta').length,
      "Experimental": COMPONENTS.filter(c => c.status === 'experimental').length,
      "Color Families": new Set(COMPONENTS.map(c => c.hex)).size,
      "Pattern Types": new Set(COMPONENTS.map(c => c.pattern)).size,
      "Views": Object.keys(VIEWS).length,
      "Groups": new Set(COMPONENTS.flatMap(c => c.groups)).size
    };

    output(stats, options);
    if (!options.json && !options.quiet) {
      Object.entries(stats).forEach(([label, value]) => {
        console.log(`${label.padEnd(16)}: ${value}`);
      });
      console.log("═".repeat(60));
    }
  }

  private listComponents(view?: string, group?: string, options?: CLIOptions) {
    let components = COMPONENTS;

    if (view && VIEWS[view as keyof typeof VIEWS]) {
      components = getViewComponents(view as keyof typeof VIEWS);
    }

    if (group) {
      components = components.filter(c => c.groups.includes(group));
    }

    const result = {
      count: components.length,
      components: options?.json ? components : components.map(comp => ({
        id: comp.id,
        name: comp.name,
        category: comp.category,
        status: comp.status,
        color: comp.hex
      }))
    };

    output(result, options || { json: false, quiet: false, verbose: false, watch: false, interval: 5000, dryRun: false, force: false, port: 8080, host: 'localhost', logLevel: 'info', config: '', threshold: 80 });

    if (!options?.json && !options?.quiet) {
      console.log(`📦 Components (${components.length})`);
      console.log("═".repeat(80));

      components.forEach(comp => {
        const status = comp.status?.toUpperCase().padEnd(12) || "UNKNOWN".padEnd(12);
        const category = (comp.category || "N/A").padEnd(12);
        const color = comp.hex || "#000000";
        const name = comp.name.padEnd(20);
        console.log(`${color}● #${comp.id.toString().padStart(2, "0")} ${name} ${category} ${status}`);
      });

      console.log("═".repeat(80));
    }
  }

  private getComponent(id: string, options: CLIOptions) {
    const comp = getComponentById(parseInt(id));
    if (!comp) {
      log('error', `Component #${id} not found`, options);
    } else {
      output(comp, options);
      if (!options.json && !options.quiet) {
        console.log(`\n📦 Component #${comp.id}: ${comp.name}`);
        console.log("═".repeat(60));
        console.log(`Color:      ${comp.hex} (${comp.hsl})`);
        console.log(`Slot:       ${comp.slot}`);
        console.log(`Pattern:    ${comp.pattern}`);
        console.log(`Category:   ${comp.category}`);
        console.log(`Status:     ${comp.status}`);
        console.log(`Bun Ver:    ${comp.bunVersion}`);
        console.log(`Groups:     ${comp.groups?.join(", ") || "none"}`);
        console.log(`Views:      ${comp.views?.join(", ") || "none"}`);
        console.log(`\n${comp.description}`);
        console.log("═".repeat(60) + "\n");
      }
    }
  }

  private showViews(options: CLIOptions) {
    const viewsData = Object.entries(VIEWS).map(([name, view]) => ({
      name,
      icon: view.icon || "●",
      componentCount: view.componentIds.length,
      description: view.description
    }));

    output({ views: viewsData }, options);

    if (!options.json && !options.quiet) {
      console.log("👁️  Available Views");
      console.log("═".repeat(60));

      Object.entries(VIEWS).forEach(([name, view]) => {
        const count = view.componentIds.length;
        const icon = view.icon || "●";
        console.log(`${icon} ${name.padEnd(10)} (${count} components) - ${view.description}`);
      });

      console.log("═".repeat(60));
    }
  }

  private showView(viewName: string) {
    if (!VIEWS[viewName as keyof typeof VIEWS]) {
      console.log(`❌ View '${viewName}' not found. Available: ${Object.keys(VIEWS).join(", ")}`);
      return;
    }

    const components = getViewComponents(viewName as keyof typeof VIEWS);
    console.log(`\n📋 ${VIEWS[viewName as keyof typeof VIEWS].name} View (${components.length} components):`);

    components.forEach(comp => {
      console.log(`   ${comp.hex}● ${comp.name} (${comp.category})`);
    });
    console.log();
  }

  private showGraph() {
    console.log(renderGraphASCII());
  }

  private async startDashboard(port?: string, options?: CLIOptions) {
    const portNum = port ? parseInt(port) : (options?.port || 8080);
    const host = options?.host || 'localhost';

    log('info', `🚀 Starting T3-Lattice Dashboard on ${host}:${portNum}...`, options || { json: false, quiet: false, verbose: false, watch: false, interval: 5000, dryRun: false, force: false, port: 8080, host: 'localhost', logLevel: 'info', config: '', threshold: 80 });

    if (options?.dryRun) {
      log('info', "DRY RUN: Would start dashboard server", options);
      return;
    }

    startDashboard({ port: portNum, host });
  }

  private generateHTML(view?: string) {
    const viewName = (view || "overview") as keyof typeof VIEWS;
    if (!VIEWS[viewName]) {
      console.log(`❌ View '${view}' not found`);
      return;
    }

    const html = generateDashboardHTML(viewName);
    console.log(`📄 Generated HTML for '${viewName}' view (${html.length} characters)`);
    console.log("💡 Use 't3 export html > dashboard.html' to save to file");
    console.log("💡 Use 't3 dashboard' to start interactive server");
  }

  private exportData(format?: string) {
    if (format === "html") {
      const html = generateDashboardHTML("overview");
      console.log(html);
    } else {
      const data = {
        version: "3.3.0",
        components: COMPONENTS,
        views: VIEWS,
        timestamp: new Date().toISOString()
      };
      console.log(JSON.stringify(data, null, 2));
    }
  }

  private checkCompatibility(version: string) {
    const compatible = COMPONENTS.filter(c =>
      c.bunVersion === "any" || matchVersion(c.bunVersion, version)
    );
    const incompatible = COMPONENTS.filter(c =>
      c.bunVersion !== "any" && !matchVersion(c.bunVersion, version)
    );

    console.log(`🔍 Bun ${version} Compatibility Check`);
    console.log("═".repeat(50));
    console.log(`✅ Compatible:   ${compatible.length} components`);
    console.log(`❌ Incompatible: ${incompatible.length} components`);

    if (incompatible.length > 0) {
      console.log("\nIncompatible components:");
      incompatible.forEach(comp => {
        console.log(`  ${comp.hex}● ${comp.name} (requires ${comp.bunVersion})`);
      });
    }

    console.log("═".repeat(50));
  }

  private showColors() {
    console.log("🎨 Color Palette & Usage");
    console.log("═".repeat(60));

    const colorGroups = new Map<string, typeof COMPONENTS>();
    COMPONENTS.forEach(comp => {
      if (!colorGroups.has(comp.hex)) {
        colorGroups.set(comp.hex, []);
      }
      colorGroups.get(comp.hex)!.push(comp);
    });

    for (const [hex, comps] of colorGroups) {
      const hsl = comps[0].hsl;
      const ids = comps.map(c => c.id.toString().padStart(2, "0")).join(" ");
      console.log(`${hex} ${hsl.padEnd(18)} [${ids}] ${comps[0].name}`);
    }

    console.log("═".repeat(60));
  }

  private showPatterns() {
    console.log("🔷 Pattern Distribution");
    console.log("═".repeat(50));

    const patternCounts = new Map<string, number>();
    COMPONENTS.forEach(comp => {
      patternCounts.set(comp.pattern, (patternCounts.get(comp.pattern) || 0) + 1);
    });

    const sortedPatterns = Array.from(patternCounts.entries())
      .sort((a, b) => b[1] - a[1]);

    sortedPatterns.forEach(([pattern, count]) => {
      console.log(`${pattern.padEnd(15)}: ${count} components`);
    });

    console.log("═".repeat(50));
  }

  private showGlyphs() {
    console.log("🎯 Opening glyph renderer...");
    console.log("💡 File: glyph-renderer.html");
    console.log("💡 Run: open glyph-renderer.html");

    // Try to open in browser
    try {
      const { exec } = require("child_process");
      exec("open glyph-renderer.html", (error: any) => {
        if (error) {
          console.log("❌ Could not auto-open browser. Open glyph-renderer.html manually.");
        }
      });
    } catch {
      console.log("❌ Could not auto-open browser. Open glyph-renderer.html manually.");
    }
  }

  private async showHealth(options: CLIOptions) {
    log('info', "🏥 System Health Check", options);

    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      components: COMPONENTS.length,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024)
      },
      uptime: Math.round(process.uptime()),
      platform: `${process.platform} ${process.arch}`,
      bunVersion: Bun.version,
      nodeVersion: process.version
    };

    // Test component loading
    try {
      const testComponent = getComponentById(1);
      health.status = "healthy";
      if (options.verbose) log('debug', "Registry Test: ✅ Component lookup working", options);
    } catch (error) {
      health.status = "degraded";
      log('error', `Registry Test: ❌ Component lookup failed: ${error}`, options);
    }

    // Test view generation
    try {
      const testView = getViewComponents("overview");
      if (options.verbose) log('debug', `View Test: ✅ Generated ${testView.length} components`, options);
    } catch (error) {
      health.status = "degraded";
      log('error', `View Test: ❌ View generation failed: ${error}`, options);
    }

    // Memory threshold check
    const memoryPercent = (health.memory.used / health.memory.total) * 100;
    if (memoryPercent > options.threshold) {
      log('warn', `Memory usage high: ${memoryPercent.toFixed(1)}% (threshold: ${options.threshold}%)`, options);
    }

    if (options.watch) {
      log('info', "Entering watch mode... (Ctrl+C to exit)", options);
      setInterval(() => this.showHealth(options), options.interval);
    } else {
      output(health, options);
      // Only show formatted output if not in JSON mode
      const shouldJson = process.argv.includes('--json');
      if (!options.quiet && !shouldJson) {
        console.log("═".repeat(60));
        console.log(`Status: ${health.status === 'healthy' ? '✅' : '⚠️'} ${health.status.toUpperCase()}`);
        console.log(`Components: ${health.components} loaded`);
        console.log(`Memory: ${health.memory.used}MB used / ${health.memory.total}MB total`);
        console.log(`Uptime: ${health.uptime}s`);
        console.log(`Platform: ${health.platform}`);
        console.log(`Bun Version: ${health.bunVersion}`);
        console.log("═".repeat(60));
      }
    }
  }

  private async prefetchResources(type: "dns" | "db" | "all", options: CLIOptions) {
    log('info', `🔄 Prefetching resources: ${type}`, options);

    if (options.dryRun) {
      log('info', "DRY RUN: Would prefetch resources", options);
      return;
    }

    if (type === "dns" || type === "all") {
      log('info', "🌐 DNS Prefetching with Advanced Caching...", options);

      // DNS prefetch for common registry endpoints
      const dnsHosts = [
        "api.github.com",
        "registry.npmjs.org",
        "bun.sh",
        "api.example.com"
      ];

      if (options.dryRun) {
        log('info', `DRY RUN: Would prefetch DNS for ${dnsHosts.length} hosts`, options);
      } else {
        try {
          // Use advanced DNS cache manager
          await dnsCacheManager.prefetchHosts(dnsHosts);
          log('info', `✅ DNS prefetching completed for ${dnsHosts.length} hosts`, options);

          // Show cache statistics
          const stats = dnsCacheManager.getStats();
          log('debug', `DNS Cache: ${stats.totalEntries} entries, ${stats.totalHits} hits`, options);
        } catch (error) {
          log('error', `DNS prefetch failed: ${error}`, options);
        }
      }
    }

    if (type === "db" || type === "all") {
      log('info', "💾 Database Prefetching...", options);

      // Simulate database connection warmup
      const dbConnections = [
        "sqlite:main.db",
        "redis:localhost:6379",
        "postgres:localhost:5432"
      ];

      for (const conn of dbConnections) {
        try {
          // Simulate connection test (would be real DB connections)
          await new Promise(resolve => setTimeout(resolve, 100));
          log('info', `   ✅ ${conn} (simulated)`, options);
        } catch (error) {
          log('error', `   ❌ ${conn}: ${error}`, options);
        }
      }
    }

    log('info', "🎉 Resource prefetching complete!", options);
  }

  private async monitor(options: CLIOptions) {
    log('info', "📊 Starting system monitoring", options);
    log('info', `Interval: ${options.interval}ms, Threshold: ${options.threshold}%`, options);

    const monitorSystem = async () => {
      const memUsage = process.memoryUsage();
      const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

      if (memPercent > options.threshold) {
        log('warn', `High memory usage: ${memPercent.toFixed(1)}%`, options);
      }

      if (options.verbose) {
        log('debug', `Memory: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB, CPU: ${process.cpuUsage().user}μs`, options);
      }
    };

    if (options.watch) {
      log('info', "Entering continuous monitoring mode... (Ctrl+C to exit)", options);
      setInterval(monitorSystem, options.interval);
      // Keep the process alive
      process.stdin.resume();
    } else {
      await monitorSystem();
    }
  }

  private showConfig(options: CLIOptions) {
    const config = {
      cli: {
        verbose: options.verbose,
        quiet: options.quiet,
        json: options.json,
        watch: options.watch,
        interval: options.interval,
        dryRun: options.dryRun,
        force: options.force,
        logLevel: options.logLevel,
        threshold: options.threshold
      },
      server: {
        port: options.port,
        host: options.host
      },
      system: {
        components: COMPONENTS.length,
        views: Object.keys(VIEWS).length,
        platform: `${process.platform} ${process.arch}`,
        bunVersion: Bun.version
      }
    };

    output(config, options);
  }

  private showHelp(options: CLIOptions) {
    if (!options.quiet) {
      console.log("🚀 T3-Lattice Registry Plugin");
      console.log("═".repeat(60));
      console.log("Unified interface for all T3-Lattice components\n");
    }

    if (!options.quiet) {
      console.log("Available Commands:");
      this.commands.forEach((cmd, name) => {
        if (!cmd.aliases || !cmd.aliases.includes(name)) {
          const aliases = cmd.aliases ? ` (${cmd.aliases.join(", ")})` : "";
          console.log(`  ${name.padEnd(12)}${aliases} - ${cmd.description}`);
        }
      });

      console.log("\nCLI Flags:");
      console.log("  -v, --verbose         Enable verbose output");
      console.log("  -q, --quiet           Suppress output");
      console.log("  --json                JSON output format");
      console.log("  -w, --watch           Watch mode for monitoring");
      console.log("  --interval <ms>       Watch interval (default: 5000)");
      console.log("  --dry-run             Test without execution");
      console.log("  --force               Override safety checks");
      console.log("  -p, --port <port>     Server port (default: 8080)");
      console.log("  -H, --host <host>     Server host (default: localhost)");
      console.log("  --log-level <level>   Log level: error|warn|info|debug");
      console.log("  -t, --threshold <%>   Alert threshold (default: 80)");
      console.log("  -c, --config <file>   Config file path");

      console.log("\nExamples:");
      console.log("  t3 stats --json                    # JSON metrics");
      console.log("  t3 health --watch --interval 2000 # Monitor every 2s");
      console.log("  t3 dashboard --port 3000          # Custom port");
      console.log("  t3 monitor --threshold 90 --verbose # Resource monitoring");
      console.log("  t3 prefetch all --dry-run         # Test prefetching");
      console.log("  t3 config --json                  # Show configuration");
       console.log("\nUse 't3 help --verbose' for detailed help");
   }
   }

   async run(args: string[]) {
    const { command, options, args: cmdArgs } = parseFlags(args);

    if (!command) {
      this.showHelp(options);
      return;
    }

    const cmd = this.commands.get(command);
    if (!cmd) {
      log('error', `Unknown command: ${command}`, options);
      log('info', "Run 't3 help' for available commands", options);
      return;
    }

    try {
      await cmd.handler(cmdArgs, options);
    } catch (error) {
      log('error', `Error running command '${command}': ${error}`, options);
    }
  }

  private showDNSCacheStats(options: CLIOptions) {
    log('info', "🌐 DNS Cache Statistics", options);

    const stats = dnsCacheManager.getStats();

    if (options.json) {
      output(stats, options);
    } else {
      console.log(`Total DNS Entries: ${stats.totalEntries}`);
      console.log(`Total Cache Hits: ${stats.totalHits}`);
      console.log(`Prefetch Queue Size: ${stats.prefetchQueueSize}`);
      console.log(`Average Cache Age: ${stats.averageCacheAge}s`);
      console.log(`Cache Hit Rate: ${stats.cacheHitRate.toFixed(1)}%`);

      // Clear expired entries if requested
      if (options.force) {
        const cleared = dnsCacheManager.clearExpired();
        console.log(`Cleared ${cleared} expired entries`);
      }
    }
  }

  private async showConfig(options: CLIOptions) {
    log('info', "⚙️ Configuration & Cookie Test", options);

    try {
      // Test configuration loading
      const config = await import("../src/config-loader.ts").then(m => m.default.load());

      // Test cookie functionality
      const { LatticeCookieManager } = await import("../web/advanced-dashboard.ts");
      const cookieManager = new LatticeCookieManager();

      // Set test cookies
      const testSession = `test_session_${Date.now()}`;
      const testCsrf = `test_csrf_${Date.now()}`;

      cookieManager.setSessionCookie(testSession, { maxAge: 300 }); // 5 minutes
      cookieManager.setCsrfCookie(testCsrf);

      const configData = {
        bunConfig: config,
        features: {
          enterprise: config.features?.enterprise,
          websocket: config.features?.websocket,
          dns_prefetch: config.features?.dns_prefetch,
          security_audit: config.features?.security_audit,
          metrics_collection: config.features?.metrics_collection
        },
        cookies: {
          session: cookieManager.getCookie('t3_session'),
          csrf: cookieManager.getCookie('t3_csrf'),
          headers: cookieManager.getCookieHeaders()
        },
        dns: dnsCacheManager.getStats()
      };

      if (options.json) {
        output(configData, options);
      } else {
        console.log("📋 Configuration Status:");
        console.log(`  Enterprise Mode: ${config.features?.enterprise ? '✅' : '❌'}`);
        console.log(`  WebSocket Support: ${config.features?.websocket ? '✅' : '❌'}`);
        console.log(`  DNS Prefetch: ${config.features?.dns_prefetch ? '✅' : '❌'}`);
        console.log(`  Security Audit: ${config.features?.security_audit ? '✅' : '❌'}`);
        console.log(`  Metrics: ${config.features?.metrics_collection ? '✅' : '❌'}`);

        console.log("\n🍪 Cookie Test Results:");
        console.log(`  Session Cookie: ${configData.cookies.session ? '✅ Set' : '❌ Not set'}`);
        console.log(`  CSRF Cookie: ${configData.cookies.csrf ? '✅ Set' : '❌ Not set'}`);
        console.log(`  Cookie Headers: ${Object.keys(configData.cookies.headers).length} headers`);

        console.log("\n🌐 DNS Cache Status:");
        console.log(`  Entries: ${configData.dns.totalEntries}`);
        console.log(`  Cache Hits: ${configData.dns.totalHits}`);
        console.log(`  Hit Rate: ${configData.dns.cacheHitRate.toFixed(1)}%`);
      }
    } catch (error) {
      log('error', `Configuration test failed: ${error}`, options);
    }
  }
}

// CLI Entry Point
const plugin = new T3LatticePlugin();
const args = process.argv.slice(2);
plugin.run(args);