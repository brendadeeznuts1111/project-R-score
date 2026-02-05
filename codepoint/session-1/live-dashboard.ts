#!/usr/bin/env bun

// Live HMR Monitoring Dashboard with enhanced features
import {
  CustomProxyServer,
  exportHMRData,
} from "./hmr-event-tracker";

// Enhanced monitoring dashboard with real-time updates
class HMRDashboard {
  private static isRunning = false;
  private static updateInterval?: NodeJS.Timeout;

  static displayLiveStatus(
    servers,
    options = {}
  ) {
    const { showDetails = false, refreshRate = 3000, maxEvents = 50 } = options;

    console.clear();
    console.log("🔄 Live HMR Monitoring Dashboard");
    console.log("=".repeat(80));
    console.log(
      `Last update: ${new Date().toLocaleTimeString()} | Refresh: ${refreshRate}ms\n`
    );

    // Display server overview table
    console.log("📊 Server Overview:");
    const serverTable = CustomProxyServer.formatServerTable(servers, {
      columns: [
        "name",
        "connections",
        "HMR Total",
        "Last HMR",
        "Health",
        "Status",
      ],
      includeComputed: true,
    });
    console.log(Bun.inspect.table(serverTable, { colors: true }));

    // Display detailed server information if requested
    if (showDetails) {
      console.log("\n🔍 Detailed Server Information:");
      servers.forEach((server, index) => {
        console.log(`\n${index + 1}. ${server.name} (${server.region})`);
        console.log(
          `   Connections: ${server.connections.toLocaleString()} / ${server.config.maxConnections.toLocaleString()}`
        );
        console.log(
          `   HMR Enabled: ${server.config.hmrEnabled ? "✅" : "❌"}`
        );
        console.log(`   Protocol: ${server.config.protocol.toUpperCase()}`);
        console.log(
          `   Uptime: ${this.formatUptime(
            Date.now() - server.startedAt.getTime()
          )}`
        );

        // Show recent events with icons
        if (server.hmrEvents.length > 0) {
          console.log(`   Recent Events:`);
          const recent = server.hmrEvents.slice(-3).reverse();
          recent.forEach((event, i) => {
            const icon = this.getEventIcon(event.name);
            const time = event.timestamp.toLocaleTimeString();
            const module = event.module ? ` (${event.module})` : "";
            const duration = event.duration ? ` [${event.duration}ms]` : "";
            console.log(
              `     ${i + 1}. ${icon} ${
                event.name
              }${module}${duration} - ${time}`
            );
          });
        } else {
          console.log(`   Recent Events: No events recorded`);
        }
      });
    }

    // Show aggregated statistics
    console.log("\n📈 Aggregate Statistics:");
    this.displayAggregateStats(servers);

    // Show performance metrics
    console.log("\n⚡ Performance Metrics:");
    this.displayPerformanceMetrics(servers);

    // Show recent errors if any
    const recentErrors = this.getRecentErrors(servers, 5);
    if (recentErrors.length > 0) {
      console.log("\n🚨 Recent Errors:");
      const errorTable = recentErrors.map((error) => ({
        Server: error.serverName,
        Event: error.event.name,
        Module: error.event.module || "N/A",
        Time: error.event.timestamp.toLocaleTimeString(),
        Details: error.event.details
          ? JSON.stringify(error.event.details).slice(0, 50) + "..."
          : "None",
      }));
      console.log(Bun.inspect.table(errorTable, { colors: true }));
    }

    // Show event trends
    console.log("\n📊 Event Trends (Last 10 Events):");
    this.displayEventTrends(servers, maxEvents);
  }

  static startLiveMonitoring(
    servers,
    options = {}
  ) {
    const { interval = 3000, showDetails = false, maxEvents = 50 } = options;

    if (this.isRunning) {
      console.log("🔄 Live monitoring is already running!");
      return;
    }

    this.isRunning = true;
    console.log("🚀 Starting live HMR monitoring...");
    console.log(`   Update interval: ${interval}ms`);
    console.log(`   Detailed view: ${showDetails ? "Enabled" : "Disabled"}`);
    console.log(`   Max events: ${maxEvents}`);
    console.log("   Press Ctrl+C to stop monitoring\n");

    // Initial display
    this.displayLiveStatus(servers, {
      showDetails,
      refreshRate: interval,
      maxEvents,
    });

    // Set up interval updates
    this.updateInterval = setInterval(() => {
      this.displayLiveStatus(servers, {
        showDetails,
        refreshRate: interval,
        maxEvents,
      });
    }, interval);

    // Handle graceful shutdown
    process.on("SIGINT", () => {
      this.stopLiveMonitoring();
    });
  }

  static stopLiveMonitoring() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }
    this.isRunning = false;
    console.log("\n🛑 Live monitoring stopped");

    // Show final summary
    console.log("\n📊 Final Summary:");
    console.log("   Total monitoring session completed");
    console.log("   Data exported to logs");
  }

  private static displayAggregateStats(servers) {
    const allEvents = [];
    servers.forEach((server) => {
      allEvents.push(...server.hmrEvents);
    });

    if (allEvents.length === 0) {
      console.log("   No events recorded yet");
      return;
    }

    const eventCounts = {};
    allEvents.forEach((event) => {
      eventCounts[event.name] = (eventCounts[event.name] || 0) + 1;
    });

    // Create enhanced stats table
    const statsTable = Object.entries(eventCounts).map(([name, count]) => ({
      "Event Type": `${this.getEventIcon(name)} ${name}`,
      Count: count,
      Percentage: `${Math.round((count / allEvents.length) * 100)}%`,
    }));

    console.log(Bun.inspect.table(statsTable, { colors: true }));

    // Show summary metrics
    const totalEvents = allEvents.length;
    const totalErrors = eventCounts["error"] || 0;
    const errorRate =
      totalEvents > 0 ? Math.round((totalErrors / totalEvents) * 100) : 0;

    console.log(
      `\n   Total Events: ${totalEvents} | Errors: ${totalErrors} | Error Rate: ${errorRate}%`
    );
  }

  private static displayPerformanceMetrics(servers) {
    const metricsTable = servers.map((server) => {
      const events = server.hmrEvents;
      const eventsWithDuration = events.filter((e) => e.duration !== undefined);
      const avgDuration =
        eventsWithDuration.length > 0
          ? Math.round(
              eventsWithDuration.reduce(
                (sum, e) => sum + (e.duration || 0),
                0
              ) / eventsWithDuration.length
            )
          : "N/A";

      const errorCount = server.eventCounts["error"] || 0;
      const errorRate =
        events.length > 0 ? Math.round((errorCount / events.length) * 100) : 0;

      return {
        Server: server.name,
        "Total Events": events.length,
        "Error Rate": `${errorRate}%`,
        "Avg Duration": avgDuration !== "N/A" ? `${avgDuration}ms` : "N/A",
        Load: `${Math.round(
          (server.connections / server.config.maxConnections) * 100
        )}%`,
      };
    });

    console.log(Bun.inspect.table(metricsTable, { colors: true }));
  }

  private static displayEventTrends(
    servers,
    maxEvents
  ) {
    const allEvents = [];
    servers.forEach((server) => {
      server.hmrEvents.forEach((event) => {
        allEvents.push({ ...event, serverName: server.name });
      });
    });

    // Sort by timestamp and get recent events
    const recentEvents = allEvents
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, maxEvents);

    if (recentEvents.length === 0) {
      console.log("   No recent events");
      return;
    }

    const trendsTable = recentEvents.map((event) => ({
      Time: event.timestamp.toLocaleTimeString(),
      Server: event.serverName,
      Event: `${this.getEventIcon(event.name)} ${event.name}`,
      Module: event.module || "N/A",
      Duration: event.duration ? `${event.duration}ms` : "-",
    }));

    console.log(Bun.inspect.table(trendsTable, { colors: true }));
  }

  private static getRecentErrors(servers, limit) {
    const allErrors = [];
    servers.forEach((server) => {
      server.hmrEvents
        .filter((event) => event.name === "error")
        .forEach((event) => {
          allErrors.push({ serverName: server.name, event });
        });
    });

    return allErrors
      .sort((a, b) => b.event.timestamp.getTime() - a.event.timestamp.getTime())
      .slice(0, limit);
  }

  private static getEventIcon(eventName) {
    const icons = {
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

  private static formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
}

// Simulation and demo setup
console.log("🎯 Live HMR Dashboard Demo");
console.log("========================\n");

// Create servers for monitoring
const servers = [
  new CustomProxyServer("WebSocket Proxy", 1250, {
    hmrEnabled: true,
    region: "eu-west-1",
    maxConnections: 2000,
  }),
  new CustomProxyServer("API Gateway", 4250, {
    hmrEnabled: false,
    region: "us-west-2",
  }),
  new CustomProxyServer("Development Server", 850, {
    hmrEnabled: true,
    region: "us-east-1",
    maxConnections: 1500,
  }),
];

// Add some initial events
const devServer = servers[0];
if (devServer) {
  devServer.logHMREvent("ws:connect", { module: "main.js" });
  devServer.logHMREvent("beforeUpdate", { module: "app.js", duration: 45 });
  devServer.logHMREvent("afterUpdate", { module: "app.js", duration: 120 });
  devServer.logHMREvent("invalidate", { module: "styles.css" });
}

// Start live monitoring with enhanced features
HMRDashboard.startLiveMonitoring(servers, {
  interval: 2000, // Update every 2 seconds
  showDetails: true,
  maxEvents: 20,
});

// Simulate real-time HMR events
const eventTypes = [
  "ws:connect",
  "beforeUpdate",
  "afterUpdate",
  "invalidate",
  "ws:disconnect",
  "error",
];
const simulationInterval = setInterval(() => {
  const randomServer = servers[Math.floor(Math.random() * servers.length)];
  const randomEvent = eventTypes[Math.floor(Math.random() * eventTypes.length)];

  if (randomServer && randomEvent) {
    randomServer.logHMREvent(randomEvent, {
      module: `module-${Math.floor(Math.random() * 10)}.js`,
      duration: Math.floor(Math.random() * 200),
      details:
        randomEvent === "error"
          ? {
              error: "Random simulation error",
              code: 500,
              timestamp: new Date().toISOString(),
            }
          : undefined,
    });
  }
}, 1500);

// Stop simulation after 30 seconds
setTimeout(() => {
  clearInterval(simulationInterval);
  HMRDashboard.stopLiveMonitoring();

  // Export final data
  console.log("\n📤 Exporting final data...");
  if (devServer) {
    console.log("\n📄 Final HMR Data (JSON):");
    console.log(exportHMRData(devServer, "json"));
  }

  process.exit(0);
}, 30000);
