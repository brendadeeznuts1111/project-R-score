#!/usr/bin/env bun
// dev-hq - Production-ready CLI with perfect Bun syntax

import { DevHQActions, DevHQAutomation } from "../dev-hq/core/automation.js";

interface CommandConfig {
  json?: boolean;
  table?: boolean;
  watch?: boolean;
  metrics?: boolean;
  timeout?: number;
  cwd?: string;
  env?: Record<string, string>;
}

class DevHQCLI {
  private automation = new DevHQAutomation();
  private startTime = Date.now();
  private metrics = {
    commands: 0,
    totalDuration: 0,
    errors: 0,
  };

  async run(argv: string[]) {
    const [command, ...args] = argv;
    const config = this.parseConfig(args);

    try {
      this.metrics.commands++;
      const startTime = Date.now();

      let result;
      switch (command) {
        case "run":
          result = await this.runCommand(args, config);
          break;
        case "git":
          result = await this.gitInsights(config);
          break;
        case "cloc":
          result = await this.codeAnalysis(config);
          break;
        case "test":
          result = await this.runTests(config);
          break;
        case "docker":
          result = await this.dockerInsights(config);
          break;
        case "health":
          result = await this.healthCheck(config);
          break;
        case "metrics":
          result = await this.getMetrics(config);
          break;
        case "server":
          result = await this.startServer(config);
          break;
        default:
          this.showHelp();
          return 1;
      }

      const duration = Date.now() - startTime;
      this.metrics.totalDuration += duration;

      if (config.metrics) {
        this.logMetrics(command, duration);
      }

      return this.handleOutput(result, config);
    } catch (error) {
      this.metrics.errors++;
      this.handleError(error, config);
      return 1;
    }
  }

  private parseConfig(args: string[]): CommandConfig {
    const config: CommandConfig = {};

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      switch (arg) {
        case "--json":
          config.json = true;
          break;
        case "--table":
          config.table = true;
          break;
        case "--watch":
          config.watch = true;
          break;
        case "--metrics":
          config.metrics = true;
          break;
        case "--timeout":
          config.timeout = parseInt(args[++i]) || 30000;
          break;
        case "--cwd":
          config.cwd = args[++i];
          break;
        case "--env":
          const envPair = args[++i];
          if (envPair.includes("=")) {
            const [key, value] = envPair.split("=");
            config.env = { ...config.env, [key]: value };
          }
          break;
        default:
          // Not a config flag, continue processing
          break;
      }
    }

    return config;
  }

  private async runCommand(args: string[], config: CommandConfig) {
    const cmd = args.filter((arg) => !arg.startsWith("--"));
    if (cmd.length === 0) throw new Error("No command specified");

    console.log(`▶️  Running: ${cmd.join(" ")}`);

    if (config.watch) {
      return this.watchCommand(cmd, config);
    }

    const result = await this.automation.runCommand("cli-cmd", cmd, {
      cwd: config.cwd,
      env: config.env,
      timeout: config.timeout,
    });

    if (result && "stdout" in result) {
      return {
        command: cmd.join(" "),
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        duration: Date.now() - this.startTime,
      };
    }

    return result;
  }

  private async watchCommand(cmd: string[], config: CommandConfig) {
    console.log(`👀 Watching command: ${cmd.join(" ")}`);

    const watcher = Bun.spawn(["bun", "--watch", "run", ...cmd], {
      cwd: config.cwd,
      env: { ...process.env, ...config.env },
      stdout: "inherit",
      stderr: "inherit",
    });

    // Handle cleanup on exit
    process.on("SIGINT", () => {
      watcher.kill();
      process.exit(0);
    });

    return await watcher.exited;
  }

  private async gitInsights(config: CommandConfig) {
    console.log("📊 Analyzing Git repository...");

    const insights = await DevHQActions.gitInsights();

    if (config.json) {
      return insights;
    }

    if (config.table) {
      return this.formatTable(insights, "Git Insights");
    }

    return insights;
  }

  private async codeAnalysis(config: CommandConfig) {
    console.log("🔍 Analyzing code...");

    const cloc = await DevHQActions.analyzeWithCLOC();

    if (config.json) {
      return cloc;
    }

    if (config.table) {
      return this.formatTable(cloc, "Code Analysis");
    }

    return cloc;
  }

  private async runTests(config: CommandConfig) {
    console.log("🧪 Running tests...");

    const testProc = await DevHQActions.runTests(true);

    if (config.watch) {
      console.log("👀 Watching tests for changes...");
      return testProc;
    }

    return { status: "tests initiated", process: testProc };
  }

  private async dockerInsights(config: CommandConfig) {
    console.log("🐳 Analyzing Docker containers...");

    const insights = await DevHQActions.dockerInsights();

    if (config.json) {
      return insights;
    }

    if (config.table) {
      return this.formatTable(insights, "Docker Insights");
    }

    return insights;
  }

  private async healthCheck(config: CommandConfig) {
    console.log("🏥 Performing health check...");

    const health = {
      status: "healthy" as "healthy" | "unhealthy",
      timestamp: new Date().toISOString(),
      checks: {
        bun: typeof Bun !== "undefined",
        automation: true,
        git: await this.checkGit(),
        docker: await this.checkDocker(),
        nodeModules: await this.checkNodeModules(),
      },
      metrics: this.metrics,
      uptime: Date.now() - this.startTime,
    };

    // Determine overall health
    const failedChecks = Object.values(health.checks).filter(
      (check) => !check
    ).length;
    if (failedChecks > 0) {
      health.status = "unhealthy";
    }

    if (config.json) {
      return health;
    }

    console.log(`Status: ${health.status.toUpperCase()}`);
    console.log(
      `Checks passed: ${Object.values(health.checks).filter(Boolean).length}/${
        Object.keys(health.checks).length
      }`
    );
    console.log(`Uptime: ${health.uptime}ms`);

    return health;
  }

  private async getMetrics(config: CommandConfig) {
    const resourceUsage = await this.automation.getResourceUsage();

    const metrics = {
      cli: this.metrics,
      resources: resourceUsage,
      system: {
        uptime: Date.now() - this.startTime,
        memory: process.memoryUsage(),
        platform: process.platform,
        nodeVersion: process.version,
        bunVersion: typeof Bun !== "undefined" ? Bun.version : "N/A",
      },
    };

    if (config.json) {
      return metrics;
    }

    if (config.table) {
      return this.formatTable(metrics, "Dev HQ Metrics");
    }

    return metrics;
  }

  private async startServer(config: CommandConfig) {
    console.log("🚀 Starting Dev HQ Automation Server...");

    // Import and start the server
    await import("../dev-hq/spawn-server.js");

    return {
      status: "server started",
      message: "Dev HQ Automation Server is running",
    };
  }

  private formatTable(data: any, title: string): string {
    // Simple table formatting using Bun.inspect
    console.log(`\\n📊 ${title}:`);
    console.log(Bun.inspect(data, { colors: true, compact: false }));
    return data;
  }

  private handleOutput(result: any, config: CommandConfig): number {
    if (config.json) {
      console.log(JSON.stringify(result, null, 2));
    } else if (config.table) {
      // Already handled in formatTable
    } else if (typeof result === "object" && result !== null) {
      console.log(Bun.inspect(result, { colors: true, compact: true }));
    } else if (result !== undefined) {
      console.log(result);
    }

    // Return appropriate exit code
    if (result && typeof result === "object" && "exitCode" in result) {
      return result.exitCode || 0;
    }

    return 0;
  }

  private handleError(error: Error, config: CommandConfig) {
    if (config.json) {
      console.log(
        JSON.stringify(
          {
            error: true,
            message: error.message,
            stack: error.stack,
          },
          null,
          2
        )
      );
    } else {
      console.error(`❌ Error: ${error.message}`);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
    }
  }

  private logMetrics(command: string, duration: number) {
    console.log(`📊 Metrics: ${command} completed in ${duration}ms`);
  }

  private async checkGit(): boolean {
    try {
      await this.automation.runCommand("git-check", [
        "git",
        "rev-parse",
        "--git-dir",
      ]);
      return true;
    } catch {
      return false;
    }
  }

  private async checkDocker(): boolean {
    try {
      await this.automation.runCommand("docker-check", ["docker", "--version"]);
      return true;
    } catch {
      return false;
    }
  }

  private async checkNodeModules(): boolean {
    try {
      await Bun.file("node_modules").text();
      return true;
    } catch {
      return false;
    }
  }

  private showHelp() {
    console.log(`
🎯 Dev HQ - Production-ready Automation CLI

Perfect Bun Syntax:
  bun [bun-flags] dev-hq [command] [command-flags]

Commands:
  run <cmd>           Execute any command
  git                 Git repository insights
  cloc                Code analysis
  test                Run tests with coverage
  docker              Docker container insights
  health              System health check
  metrics             Performance metrics
  server              Start automation server

Global Flags:
  --json              Output JSON format
  --table             Beautiful table format
  --watch             Watch mode with auto-reload
  --metrics           Show performance metrics
  --timeout <ms>      Command timeout
  --cwd <path>        Working directory
  --env <key=value>   Environment variable

Package.json Integration:
  "scripts": {
    "dev": "dev-hq run dev-server",
    "test": "dev-hq test --coverage",
    "build": "dev-hq run build --metrics"
  }

Examples:
  bun dev-hq run "ls -la" --json
  bun dev-hq git --table
  bun dev-hq test --watch --metrics
  bun dev-hq health --json
  bun --define NODE_ENV=prod dev-hq run build

Exit Codes:
  0 = Success, 1 = Error (CI/CD ready)

Global Installation:
  npm i -g dev-hq-automate
  dev-hq --help
    `);
  }

  async cleanup() {
    await this.automation.cleanup();
  }
}

// CLI Entry Point
if (import.meta.main) {
  const cli = new DevHQCLI();

  // Handle cleanup on exit
  process.on("SIGINT", async () => {
    console.log("\\n🧹 Cleaning up...");
    await cli.cleanup();
    process.exit(0);
  });

  // Run CLI
  cli.run(process.argv.slice(2)).then((code) => {
    process.exit(code);
  });
}

export { DevHQCLI };
