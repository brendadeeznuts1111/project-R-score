#!/usr/bin/env bun

// HMR Debugging and Monitoring Toolkit - Pro Tips & Utilities
import { CustomProxyServer } from "./hmr-event-tracker";

// Enhanced debugging utilities for HMR development
class HMRDebugToolkit {
  // 1. INSTANT SERVER STATUS (PRO TIP: Use for quick debugging)
  static instantServerStatus(servers: CustomProxyServer[]) {
    console.log("⚡ Instant Server Status:");
    const statusTable = servers.map((s) => ({
      Name: s.name,
      Connections: s.connections,
      Load: `${Math.round((s.connections / s.config.maxConnections) * 100)}%`,
      HMR: s.hmrEvents.length,
      Health: this.getQuickHealth(s),
      Region: s.region,
    }));
    console.table(statusTable);
  }

  // 2. QUICK HMR EVENT SNIFF (One-liner with filter)
  static quickHMRSniff(
    server: CustomProxyServer,
    timeWindowMs: number = 60000
  ) {
    const recentEvents = server.hmrEvents.filter(
      (e) => e.timestamp.getTime() > Date.now() - timeWindowMs
    );

    if (recentEvents.length === 0) {
      console.log(
        `🔥 HMR Flow: No recent activity (last ${timeWindowMs / 1000}s)`
      );
      return;
    }

    const eventFlow = recentEvents
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .map((e) => {
        const icon = this.getEventIcon(e.name);
        const module = e.module ? `(${e.module})` : "";
        const duration = e.duration ? `[${e.duration}ms]` : "";
        return `${icon}${e.name}${module}${duration}`;
      })
      .join(" → ");

    console.log(`🔥 HMR Flow (${timeWindowMs / 1000}s window): ${eventFlow}`);

    // Add quick stats
    const errorCount = recentEvents.filter((e) => e.name === "error").length;
    if (errorCount > 0) {
      console.log(`⚠️  ${errorCount} error(s) in recent activity`);
    }
  }

  // 3. LIVE CONNECTION TREND (Single line dashboard)
  static startLiveConnectionTrend(
    servers: CustomProxyServer[],
    intervalMs: number = 5000
  ) {
    console.log(
      `📈 Starting live connection trend (updates every ${intervalMs / 1000}s)`
    );
    console.log("Press Ctrl+C to stop monitoring\n");

    const trendInterval = setInterval(() => {
      const timestamp = new Date().toLocaleTimeString();
      const serverStatuses = servers
        .map((s) => {
          const trend = this.getConnectionTrend(s);
          const load = Math.round(
            (s.connections / s.config.maxConnections) * 100
          );
          return `${s.name}: ${s.connections}${trend} (${load}%)`;
        })
        .join(" | ");

      console.log(`📈 ${timestamp} | ${serverStatuses}`);
    }, intervalMs);

    // Handle cleanup
    process.on("SIGINT", () => {
      clearInterval(trendInterval);
      console.log("\n🛑 Connection trend monitoring stopped");
    });

    return trendInterval;
  }

  // 4. JSON DIAGNOSTICS PIPE (Debug export)
  static jsonDiagnosticsPipe(
    servers: CustomProxyServer[],
    options: {
      includeEvents?: boolean;
      includeConfig?: boolean;
      compact?: boolean;
    } = {}
  ) {
    const {
      includeEvents = false,
      includeConfig = false,
      compact = false,
    } = options;

    const diagnostics = servers.map((s) => {
      const base: any = {
        n: s.name,
        c: s.connections,
        h: s.hmrEvents.length,
        r: s.region,
        l: Math.round((s.connections / s.config.maxConnections) * 100),
        e: s.eventCounts["error"] || 0,
      };

      if (includeEvents && s.hmrEvents.length > 0) {
        base.events = s.hmrEvents.slice(-3).map((e) => ({
          t: e.name,
          m: e.module,
          d: e.duration,
          ts: e.timestamp.getTime(),
        }));
      }

      if (includeConfig) {
        base.cfg = {
          p: s.config.protocol,
          max: s.config.maxConnections,
          hmr: s.config.hmrEnabled,
          to: s.config.timeout,
        };
      }

      return base;
    });

    const jsonString = JSON.stringify(diagnostics, null, compact ? 0 : 2);
    console.log(compact ? jsonString : `\n🔍 JSON Diagnostics:\n${jsonString}`);

    return diagnostics;
  }

  // 5. PERFORMANCE QUICK CHECK
  static performanceQuickCheck(server: CustomProxyServer) {
    const events = server.hmrEvents;
    const eventsWithDuration = events.filter((e) => e.duration !== undefined);

    if (eventsWithDuration.length === 0) {
      console.log(`⚡ ${server.name}: No duration data available`);
      return;
    }

    const avgDuration =
      eventsWithDuration.reduce((sum, e) => sum + (e.duration || 0), 0) /
      eventsWithDuration.length;
    const maxDuration = Math.max(
      ...eventsWithDuration.map((e) => e.duration || 0)
    );
    const slowEvents = eventsWithDuration.filter(
      (e) => (e.duration || 0) > avgDuration * 2
    );

    console.log(`⚡ ${server.name} Performance:`);
    console.log(`   Avg Duration: ${Math.round(avgDuration)}ms`);
    console.log(`   Max Duration: ${maxDuration}ms`);
    console.log(`   Slow Events: ${slowEvents.length} (>2x avg)`);

    if (slowEvents.length > 0) {
      console.log(
        `   Slowest: ${slowEvents
          .map((e) => `${e.name}(${e.duration}ms)`)
          .join(", ")}`
      );
    }
  }

  // 6. ERROR PATTERN ANALYSIS
  static errorPatternAnalysis(servers: CustomProxyServer[]) {
    const allErrors: any[] = [];

    servers.forEach((server) => {
      server.hmrEvents
        .filter((e) => e.name === "error")
        .forEach((error) => {
          allErrors.push({
            server: server.name,
            module: error.module,
            details: error.details,
            timestamp: error.timestamp,
            hour: error.timestamp.getHours(),
          });
        });
    });

    if (allErrors.length === 0) {
      console.log("🎉 No errors found across all servers!");
      return;
    }

    console.log(
      `🚨 Error Pattern Analysis (${allErrors.length} total errors):`
    );

    // Group by module
    const errorsByModule: Record<string, number> = {};
    allErrors.forEach((error) => {
      const module = error.module || "Unknown";
      errorsByModule[module] = (errorsByModule[module] || 0) + 1;
    });

    console.log("   By Module:");
    Object.entries(errorsByModule)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .forEach(([module, count]) => {
        console.log(`     ${module}: ${count} errors`);
      });

    // Group by hour
    const errorsByHour: Record<number, number> = {};
    allErrors.forEach((error) => {
      errorsByHour[error.hour] = (errorsByHour[error.hour] || 0) + 1;
    });

    console.log("   By Hour:");
    Object.entries(errorsByHour)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .forEach(([hour, count]) => {
        console.log(`     ${hour}:00 - ${count} errors`);
      });
  }

  // 7. HMR HEALTH SCORE
  static calculateHMRHealthScore(server: CustomProxyServer): number {
    const events = server.hmrEvents;
    if (events.length === 0) return 50; // Neutral score for no data

    let score = 100;

    // Error penalty
    const errorRate = (server.eventCounts["error"] || 0) / events.length;
    score -= errorRate * 50; // Up to 50 points penalty for errors

    // Performance bonus/penalty
    const eventsWithDuration = events.filter((e) => e.duration !== undefined);
    if (eventsWithDuration.length > 0) {
      const avgDuration =
        eventsWithDuration.reduce((sum, e) => sum + (e.duration || 0), 0) /
        eventsWithDuration.length;
      if (avgDuration > 200) score -= 20; // Slow performance penalty
      if (avgDuration < 50) score += 10; // Fast performance bonus
    }

    // Activity bonus
    if (events.length > 10) score += 5; // Active server bonus

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  static healthReport(servers: CustomProxyServer[]) {
    console.log("🏥 HMR Health Report:");
    servers.forEach((server) => {
      const score = this.calculateHMRHealthScore(server);
      const grade =
        score >= 90
          ? "🟢 A"
          : score >= 80
          ? "🟡 B"
          : score >= 70
          ? "🟠 C"
          : "🔴 D";
      console.log(`   ${server.name}: ${score}/100 ${grade}`);
    });
  }

  // 8. REAL-TIME EVENT MONITOR (Compact)
  static startCompactEventMonitor(
    server: CustomProxyServer,
    maxEvents: number = 10
  ) {
    console.log(`👁️  Compact Event Monitor for ${server.name}`);
    console.log("   Showing last events in real-time\n");

    let lastEventCount = server.hmrEvents.length;

    const monitorInterval = setInterval(() => {
      const currentEvents = server.hmrEvents;
      const newEvents = currentEvents.slice(lastEventCount);

      if (newEvents.length > 0) {
        newEvents.forEach((event) => {
          const icon = this.getEventIcon(event.name);
          const time = event.timestamp.toLocaleTimeString();
          const module = event.module ? `:${event.module}` : "";
          const duration = event.duration ? ` ${event.duration}ms` : "";
          console.log(`   ${time} ${icon}${event.name}${module}${duration}`);
        });
        lastEventCount = currentEvents.length;
      }
    }, 1000);

    // Handle cleanup
    process.on("SIGINT", () => {
      clearInterval(monitorInterval);
      console.log("\n🛑 Event monitoring stopped");
    });

    return monitorInterval;
  }

  // 9. QUICK BENCHMARK
  static quickBenchmark(
    servers: CustomProxyServer[],
    durationMs: number = 10000
  ) {
    console.log(`🏃 Quick Benchmark (${durationMs / 1000}s)...\n`);

    const startTime = Date.now();
    const startStats = servers.map((s) => ({
      name: s.name,
      events: s.hmrEvents.length,
      connections: s.connections,
    }));

    setTimeout(() => {
      const endTime = Date.now();
      const endStats = servers.map((s) => ({
        name: s.name,
        events: s.hmrEvents.length,
        connections: s.connections,
      }));

      console.log("📊 Benchmark Results:");
      servers.forEach((server, i) => {
        const eventsDelta = endStats[i].events - startStats[i].events;
        const connDelta = endStats[i].connections - startStats[i].connections;
        const eventsPerSec =
          eventsDelta > 0
            ? (eventsDelta / (durationMs / 1000)).toFixed(2)
            : "0.00";

        console.log(
          `   ${server.name}: +${eventsDelta} events (${eventsPerSec}/s), +${connDelta} connections`
        );
      });

      console.log(`⏱️  Duration: ${(endTime - startTime) / 1000}s`);
    }, durationMs);
  }

  // 10. MEMORY USAGE SNAPSHOT
  static memorySnapshot(servers: CustomProxyServer[]) {
    const memUsage = process.memoryUsage();
    const totalEvents = servers.reduce((sum, s) => sum + s.hmrEvents.length, 0);

    console.log("💾 Memory Usage Snapshot:");
    console.log(`   RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB`);
    console.log(
      `   Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`
    );
    console.log(
      `   Heap Total: ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
    );
    console.log(`   Total HMR Events: ${totalEvents}`);
    console.log(
      `   Events per MB: ${
        totalEvents > 0
          ? Math.round(totalEvents / (memUsage.heapUsed / 1024 / 1024))
          : 0
      }`
    );
  }

  // Helper methods
  private static getQuickHealth(server: CustomProxyServer): string {
    const score = this.calculateHMRHealthScore(server);
    if (score >= 90) return "🟢";
    if (score >= 80) return "🟡";
    if (score >= 70) return "🟠";
    return "🔴";
  }

  private static getConnectionTrend(server: CustomProxyServer): string {
    // Simple trend calculation based on recent activity
    const recentEvents = server.hmrEvents.filter(
      (e) => e.timestamp.getTime() > Date.now() - 30000 // Last 30 seconds
    );

    if (recentEvents.length === 0) return "→";
    if (
      recentEvents.filter((e) => e.name.includes("connect")).length >
      recentEvents.filter((e) => e.name.includes("disconnect")).length
    )
      return "↑";
    return "↓";
  }

  private static getEventIcon(eventName: string): string {
    const icons: Record<string, string> = {
      "ws:connect": "🟢",
      "ws:disconnect": "🔴",
      beforeUpdate: "🔄",
      afterUpdate: "✅",
      beforeFullReload: "🔄",
      beforePrune: "🧹",
      invalidate: "⚠️",
      error: "❌",
    };
    return icons[eventName] || "📝";
  }
}

// Demo setup and execution
console.log("🛠️  HMR Debugging Toolkit Demo");
console.log("============================\n");

// Create test servers
const servers = [
  new CustomProxyServer("Prod", 2500, {
    region: "us-east-1",
    maxConnections: 3000,
  }),
  new CustomProxyServer("Staging", 800, {
    region: "eu-west-1",
    maxConnections: 1000,
  }),
  new CustomProxyServer("Dev", 300, {
    region: "us-west-2",
    maxConnections: 500,
  }),
];

// Add some sample events
const prodServer = servers[0];
if (prodServer) {
  prodServer.logHMREvent("ws:connect", { module: "main.js" });
  prodServer.logHMREvent("beforeUpdate", { module: "app.js", duration: 45 });
  prodServer.logHMREvent("afterUpdate", { module: "app.js", duration: 120 });
  prodServer.logHMREvent("error", {
    module: "component.js",
    details: { error: "Compilation failed" },
  });
  prodServer.logHMREvent("ws:connect", { module: "utils.js", duration: 23 });
}

const stagingServer = servers[1];
if (stagingServer) {
  stagingServer.logHMREvent("ws:connect", { module: "api.js" });
  stagingServer.logHMREvent("beforeUpdate", {
    module: "auth.js",
    duration: 67,
  });
  stagingServer.logHMREvent("afterUpdate", { module: "auth.js", duration: 89 });
}

// Demonstrate all debugging tools
console.log("1. INSTANT SERVER STATUS:");
HMRDebugToolkit.instantServerStatus(servers);

console.log("\n2. QUICK HMR EVENT SNIFF:");
HMRDebugToolkit.quickHMRSniff(prodServer!, 60000);

console.log("\n3. JSON DIAGNOSTICS PIPE:");
HMRDebugToolkit.jsonDiagnosticsPipe(servers, {
  includeEvents: true,
  compact: false,
});

console.log("\n4. PERFORMANCE QUICK CHECK:");
HMRDebugToolkit.performanceQuickCheck(prodServer!);

console.log("\n5. ERROR PATTERN ANALYSIS:");
HMRDebugToolkit.errorPatternAnalysis(servers);

console.log("\n6. HMR HEALTH SCORE:");
HMRDebugToolkit.healthReport(servers);

console.log("\n7. MEMORY USAGE SNAPSHOT:");
HMRDebugToolkit.memorySnapshot(servers);

console.log("\n8. QUICK BENCHMARK (5s):");
HMRDebugToolkit.quickBenchmark(servers, 5000);

// Start live monitoring (commented out for demo)
// console.log("\n9. Starting live monitoring (run for demo)...");
// HMRDebugToolkit.startLiveConnectionTrend(servers, 3000);

// console.log("\n10. Starting compact event monitor (run for demo)...");
// HMRDebugToolkit.startCompactEventMonitor(prodServer!, 5);

console.log("\n✨ Debugging Toolkit Demo Complete!");
console.log(
  "💡 Uncomment the live monitoring sections to see real-time updates"
);
