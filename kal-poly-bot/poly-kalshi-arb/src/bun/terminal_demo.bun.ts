/**
 * Terminal Demo - Comprehensive PTY Integration Example
 *
 * Demonstrates advanced usage of Bun Terminal API with the Kalman Filter
 * trading system, including real-time monitoring, debugging, and automation.
 */

import { TickGenerator } from "./generate_ticks.bun.ts";
import { KalmanTerminalClient } from "./terminal_client.bun.ts";
import {
  KalmanTerminalServer,
  createTerminalServer,
} from "./terminal_server.bun.ts";

interface DemoConfig {
  duration: number;
  patterns: number[];
  enableMonitoring: boolean;
  enableAutomation: boolean;
}

export class KalmanTerminalDemo {
  private terminalServer: KalmanTerminalServer;
  private httpServer: ReturnType<typeof createTerminalServer>;
  private config: DemoConfig;

  constructor(_config: Partial<DemoConfig> = {}) {
    this.config = {
      duration: 300, // 5 minutes
      patterns: [51, 56, 68, 75],
      enableMonitoring: true,
      enableAutomation: true,
      ..._config,
    };

    this.terminalServer = new KalmanTerminalServer({
      maxSessions: 5,
      timeout: 60 * 60 * 1000, // 1 hour
    });

    this.httpServer = createTerminalServer(this.terminalServer);
  }

  /**
   * Run comprehensive terminal demo
   */
  async runDemo(): Promise<void> {
    console.log("🎯 Kalman Filter Terminal Demo Starting...");
    console.log("==========================================");

    // Create demo session
    const session = await this.terminalServer.createSession("demo-user");
    console.log(`📡 Created terminal session: ${session.id}`);

    // Connect client
    const client = new KalmanTerminalClient();
    await client.connect();

    // Run demo scenarios
    await this.runBasicCommands(client);
    await this.runMonitoringDemo(client);
    await this.runAutomationDemo(client);
    await this.runDebuggingDemo(client);

    // Cleanup
    await this.terminalServer.closeSession(session.id);
    client.disconnect();

    console.log("✅ Demo completed successfully!");
  }

  /**
   * Demonstrate basic terminal commands
   */
  private async runBasicCommands(client: KalmanTerminalClient): Promise<void> {
    console.log("\n🔧 Testing Basic Commands...");

    const commands = [
      'echo "Testing terminal functionality"',
      "pwd",
      "ls -la",
      "date",
      "whoami",
    ];

    for (const cmd of commands) {
      console.log(`> ${cmd}`);
      client.sendInput(cmd);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  /**
   * Demonstrate real-time monitoring capabilities
   */
  private async runMonitoringDemo(client: KalmanTerminalClient): Promise<void> {
    console.log("\n📊 Running Monitoring Demo...");

    // Start monitoring
    client.sendInput("kalman-monitor\n");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Simulate market activity
    const tickGenerator = new TickGenerator({
      duration: 30,
      frequency: 10,
      patterns: [75],
    });

    console.log("📈 Simulating market activity...");

    // Start tick generation in background
    const tickPromise = (async () => {
      for await (const tick of tickGenerator.generateTicks()) {
        if (tick.scenario === "pattern_75_late_game") {
          client.sendInput(
            `echo "🎯 Pattern #75 detected: Price ${tick.price}, Time: ${tick.timeRemaining}s"\n`
          );
        }
      }
    })();

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Stop monitoring
    client.sendInput("\u0003"); // Ctrl+C
    await tickPromise;
  }

  /**
   * Demonstrate automation capabilities
   */
  private async runAutomationDemo(client: KalmanTerminalClient): Promise<void> {
    console.log("\n🤖 Running Automation Demo...");

    // Create automation script
    const automationScript = `
# Kalman Filter Automation Script
echo "🚀 Starting automated trading analysis..."

# Check system status
kalman-status

# Run pattern detection test
kalman-test

# Monitor for opportunities
echo "🔍 Scanning for arbitrage opportunities..."
for i in {1..5}; do
  echo "Scan $i: Checking patterns..."
  sleep 1
done

echo "✅ Automation complete"
`;

    // Send script to terminal
    client.sendInput(automationScript);
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }

  /**
   * Demonstrate debugging capabilities
   */
  private async runDebuggingDemo(client: KalmanTerminalClient): Promise<void> {
    console.log("\n🐛 Running Debugging Demo...");

    // Show configuration
    const config = await client.executeKalmanCommand("kalman-config");
    console.log("Configuration:", config);

    // Run performance test
    const testResults = await client.executeKalmanCommand("kalman-test");
    console.log("Test Results:", testResults);

    // Debug individual patterns
    for (const pattern of [51, 56, 68, 75]) {
      const debugCmd = `echo "🔍 Debugging Pattern #${pattern}"`;
      client.sendInput(debugCmd + "\n");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  /**
   * Advanced PTY automation with multiple sessions
   */
  async runMultiSessionDemo(): Promise<void> {
    console.log("\n🎭 Running Multi-Session Demo...");

    // Create multiple sessions for different tasks
    const sessions = {
      monitoring: await this.terminalServer.createSession("monitor"),
      trading: await this.terminalServer.createSession("trader"),
      analysis: await this.terminalServer.createSession("analyst"),
    };

    const clients = {
      monitoring: new KalmanTerminalClient(),
      trading: new KalmanTerminalClient(),
      analysis: new KalmanTerminalClient(),
    };

    // Connect all clients
    for (const [name, client] of Object.entries(clients)) {
      await client.connect();
      console.log(`✅ Connected ${name} session`);
    }

    // Assign different tasks
    clients.monitoring.sendInput("kalman-monitor\n");
    clients.trading.sendInput('echo "📈 Trading bot active"\n');
    clients.analysis.sendInput("kalman-status\n");

    // Let them run
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Cleanup
    for (const [name, sessionId] of Object.entries(sessions)) {
      await this.terminalServer.closeSession(sessionId.id);
      clients[name as keyof typeof clients].disconnect();
      console.log(`🧹 Cleaned up ${name} session`);
    }
  }

  /**
   * Performance benchmarking with PTY
   */
  async runPerformanceBenchmark(): Promise<void> {
    console.log("\n⚡ Running Performance Benchmark...");

    const session = await this.terminalServer.createSession("benchmark");
    const client = new KalmanTerminalClient();
    await client.connect();

    // Benchmark commands
    const benchmarks = [
      { name: "Kalman Status", cmd: "kalman-status" },
      { name: "Pattern Test", cmd: "kalman-test" },
      { name: "Config Load", cmd: "kalman-config" },
    ];

    for (const benchmark of benchmarks) {
      console.log(`🏃 Benchmarking: ${benchmark.name}`);
      const start = performance.now();

      await client.executeKalmanCommand(benchmark.cmd);

      const duration = performance.now() - start;
      console.log(`⏱️  ${benchmark.name}: ${duration.toFixed(2)}ms`);
    }

    await this.terminalServer.closeSession(session.id);
    client.disconnect();
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    console.log("\n🧹 Cleaning up demo resources...");

    // Close all sessions
    for (const session of this.terminalServer.listSessions()) {
      await this.terminalServer.closeSession(session.id);
    }

    // Stop HTTP server
    this.httpServer.stop();

    console.log("✅ Cleanup complete");
  }
}

/**
 * Interactive terminal playground
 */
async function runInteractivePlayground(): Promise<void> {
  console.log("🎮 Kalman Terminal Playground");
  console.log("===============================");
  console.log("Available commands:");
  console.log("  demo         - Run full demo");
  console.log("  monitor      - Start monitoring mode");
  console.log("  debug        - Debug patterns");
  console.log("  benchmark    - Performance test");
  console.log("  help         - Show help");
  console.log("  exit         - Exit playground");
  console.log();

  const demo = new KalmanTerminalDemo();

  // Simple REPL
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");

  process.stdin.on("data", async (key: string) => {
    if (key === "\u0003") {
      // Ctrl+C
      await demo.cleanup();
      process.exit(0);
    }

    const command = key.trim().toLowerCase();

    switch (command) {
      case "demo":
        await demo.runDemo();
        break;
      case "monitor":
        console.log("🔍 Starting monitoring mode...");
        // Start monitoring logic
        break;
      case "debug":
        console.log("🐛 Starting debug mode...");
        // Start debugging logic
        break;
      case "benchmark":
        await demo.runPerformanceBenchmark();
        break;
      case "help":
        console.log("📚 Help - Available commands listed above");
        break;
      case "exit":
        await demo.cleanup();
        process.exit(0);
      default:
        if (command) {
          console.log(`❓ Unknown command: ${command}`);
        }
    }

    console.log("\n🎮 Ready for next command...");
  });
}

/**
 * Production deployment example
 */
export function deployProductionTerminal(): void {
  console.log("🚀 Deploying Kalman Terminal to Production...");

  const terminalServer = new KalmanTerminalServer({
    maxSessions: 50,
    timeout: 2 * 60 * 60 * 1000, // 2 hours
    cols: 140,
    rows: 50,
  });

  const server = createTerminalServer(terminalServer);

  // Production monitoring
  setInterval(() => {
    const sessions = terminalServer.listSessions();
    console.log(`📊 Active sessions: ${sessions.length}`);

    // Log performance metrics
    sessions.forEach((session) => {
      const uptime = Date.now() - session.createdAt;
      console.log(
        `  Session ${session.id.slice(0, 8)}: ${Math.round(uptime / 1000)}s`
      );
    });
  }, 30000); // Every 30 seconds

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    console.log("🛑 SIGTERM received, shutting down gracefully...");

    for (const session of terminalServer.listSessions()) {
      await terminalServer.closeSession(session.id);
    }

    server.stop();
    process.exit(0);
  });

  console.log("✅ Production terminal deployed successfully!");
}

// CLI interface
if (import.meta.main) {
  const command = process.argv[2];

  switch (command) {
    case "demo":
      const demo = new KalmanTerminalDemo();
      demo.runDemo().catch(console.error);
      break;
    case "playground":
      runInteractivePlayground().catch(console.error);
      break;
    case "production":
      deployProductionTerminal();
      break;
    default:
      console.log(
        "Usage: bun terminal_demo.bun.ts [demo|playground|production]"
      );
      console.log("  demo       - Run comprehensive demo");
      console.log("  playground - Interactive playground");
      console.log("  production - Deploy to production");
  }
}

export default KalmanTerminalDemo;
