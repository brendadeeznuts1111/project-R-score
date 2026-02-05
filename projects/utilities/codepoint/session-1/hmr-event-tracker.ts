// Define the HMR event types
type HMREventNames =
  | "beforeUpdate"
  | "afterUpdate"
  | "beforeFullReload"
  | "beforePrune"
  | "invalidate"
  | "error"
  | "ws:disconnect"
  | "ws:connect";

// Interface for individual HMR events
interface HMREvent {
  name: HMREventNames;
  timestamp: Date;
  module?: string;
  details?: Record<string, any>;
  duration?: number;
}

// Configuration interface
interface ServerConfig {
  protocol?: string;
  maxConnections?: number;
  timeout?: number;
  hmrEnabled?: boolean;
  region?: string;
}

// Enhanced CustomProxyServer with HMR event tracking
class CustomProxyServer {
  name: string;
  connections: number;
  startedAt: Date;
  config: {
    protocol: string;
    maxConnections: number;
    timeout: number;
    hmrEnabled: boolean;
  };
  region: string;
  hmrEvents: HMREvent[];
  eventCounts: Record<string, number>;

  constructor(name: string, connections: number, config: ServerConfig = {}) {
    this.name = name;
    this.connections = connections;
    this.startedAt = new Date();
    this.config = {
      protocol: config.protocol || "wss",
      maxConnections: config.maxConnections || 5000,
      timeout: config.timeout || 30000,
      hmrEnabled: config.hmrEnabled || false,
    };
    this.region = config.region || "us-east-1";
    this.hmrEvents = []; // Array to store HMR events
    this.eventCounts = {};
  }

  // Track an HMR event
  logHMREvent(
    name: HMREventNames,
    options: { module?: string; details?: any; duration?: number } = {}
  ) {
    const event: HMREvent = {
      name,
      timestamp: new Date(),
      module: options.module,
      details: options.details,
      duration: options.duration,
    };

    this.hmrEvents.push(event);

    // Update count
    const currentCount = this.eventCounts[name] || 0;
    this.eventCounts[name] = currentCount + 1;

    return event;
  }

  // Get formatted HMR summary for table display
  get hmrSummary() {
    const totalEvents = this.hmrEvents.length;
    const recentEvent = this.hmrEvents[this.hmrEvents.length - 1];

    return {
      totalEvents,
      lastEvent: recentEvent
        ? `${recentEvent.name} (${this.formatTimeSince(recentEvent.timestamp)})`
        : "None",
      errorCount: this.eventCounts["error"] || 0,
      wsConnections: this.eventCounts["ws:connect"] || 0,
    };
  }

  // Get HMR event statistics as nested object
  get hmrStats() {
    const stats: Record<string, any> = { total: this.hmrEvents.length };

    // Count by event type
    Object.keys(this.eventCounts).forEach((eventName: string) => {
      const count = this.eventCounts[eventName];
      stats[eventName] = count;
    });

    // Add timing info if available
    if (this.hmrEvents.length > 0) {
      const firstEvent = this.hmrEvents[0].timestamp;
      const lastEvent = this.hmrEvents[this.hmrEvents.length - 1].timestamp;
      stats.firstEvent = firstEvent.toISOString().split("T")[0];
      stats.lastEvent = this.formatTimeSince(lastEvent);
    }

    return stats;
  }

  // Helper method
  formatTimeSince(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  }

  // Static method to prepare server data for advanced table display
  static formatServerTable(
    servers: CustomProxyServer[],
    options: {
      columns?: string[];
      sortBy?: string;
      filterEmpty?: boolean;
      includeComputed?: boolean;
    } = {}
  ) {
    const defaultColumns = [
      "name",
      "connections",
      "region",
      "hmrSummary", // Nested object
      "config", // Nested object
      "hmrEvents", // Array of nested objects
    ];

    const columns = options.columns || defaultColumns;
    let formattedData = servers.map((server) => {
      const row: Record<string, any> = {};

      // Handle each column type
      columns.forEach((col) => {
        switch (col) {
          case "hmrSummary":
            // Flatten nested summary object with enhanced formatting
            const summary = server.hmrSummary;
            row["HMR Total"] = summary.totalEvents;
            row["Last HMR"] = summary.lastEvent;
            row["HMR Errors"] = summary.errorCount;
            row["WS Connections"] = summary.wsConnections;
            break;

          case "config":
            // Extract specific config properties with status indicators
            row["Protocol"] = server.config.protocol.toUpperCase();
            row["Max Conn"] = server.config.maxConnections.toLocaleString();
            row["HMR Enabled"] = server.config.hmrEnabled
              ? "✅ Enabled"
              : "❌ Disabled";
            row["Timeout"] = `${server.config.timeout / 1000}s`;
            break;

          case "hmrEvents":
            // Create enhanced summary string for the events array
            if (server.hmrEvents.length === 0) {
              row["HMR Events"] = "No events recorded";
            } else {
              const recent = server.hmrEvents.slice(-3).reverse();
              const eventSummary = recent
                .map((e) => {
                  const icon = this.getEventIcon(e.name);
                  const module = e.module ? `:${e.module}` : "";
                  const duration = e.duration ? ` (${e.duration}ms)` : "";
                  return `${icon}${e.name}${module}${duration}`;
                })
                .join(", ");
              row["HMR Events"] = eventSummary;
            }
            break;

          case "uptime":
            // Add server uptime calculation
            const uptime = Date.now() - server.startedAt.getTime();
            row["Uptime"] = this.formatDuration(uptime);
            break;

          default:
            // Direct property access with formatting
            if (col in server) {
              const value = (server as any)[col];
              row[col] =
                typeof value === "number" ? value.toLocaleString() : value;
            }
        }
      });

      // Add computed columns if requested
      if (options.includeComputed !== false) {
        const loadPercentage = Math.round(
          (server.connections / server.config.maxConnections) * 100
        );
        row["Load %"] = `${loadPercentage}%`;
        row["Status"] = this.getServerStatus(
          server.connections,
          server.config.maxConnections
        );
        row["Health"] = this.getHealthStatus(server);
      }

      return row;
    });

    // Apply filtering if requested
    if (options.filterEmpty) {
      formattedData = formattedData.filter((row) =>
        Object.values(row).some(
          (value) => value !== null && value !== undefined && value !== ""
        )
      );
    }

    // Apply sorting if requested
    if (options.sortBy && formattedData.length > 0) {
      formattedData.sort((a, b) => {
        const aVal = a[options.sortBy!];
        const bVal = b[options.sortBy!];

        if (typeof aVal === "string" && typeof bVal === "string") {
          return aVal.localeCompare(bVal);
        }

        if (typeof aVal === "number" && typeof bVal === "number") {
          return bVal - aVal; // Descending order for numbers
        }

        return 0;
      });
    }

    return formattedData;
  }

  // Method to create detailed HMR events table with enhanced formatting
  static formatHMREventsTable(
    server: CustomProxyServer,
    options: {
      limit?: number;
      includeDetails?: boolean;
      sortBy?: "timestamp" | "duration" | "name";
      filterBy?: string[];
    } = {}
  ) {
    let events = [...server.hmrEvents];

    // Apply filtering
    if (options.filterBy && options.filterBy.length > 0) {
      events = events.filter((event) => options.filterBy!.includes(event.name));
    }

    // Apply sorting
    if (options.sortBy) {
      events.sort((a, b) => {
        switch (options.sortBy) {
          case "timestamp":
            return b.timestamp.getTime() - a.timestamp.getTime(); // Newest first
          case "duration":
            return (b.duration || 0) - (a.duration || 0); // Longest first
          case "name":
            return a.name.localeCompare(b.name);
          default:
            return 0;
        }
      });
    }

    // Apply limit
    if (options.limit && options.limit > 0) {
      events = events.slice(0, options.limit);
    }

    return events.map((event) => ({
      "Event Type": `${this.getEventIcon(event.name)} ${event.name}`,
      Timestamp: event.timestamp.toLocaleString(),
      Module: event.module || "N/A",
      Duration: event.duration ? `${event.duration}ms` : "N/A",
      Status: this.getEventStatus(event),
      Details:
        options.includeDetails && event.details
          ? typeof event.details === "object"
            ? JSON.stringify(event.details, null, 2).slice(0, 100) + "..."
            : String(event.details)
          : "-",
    }));
  }

  // Helper methods for enhanced formatting
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

  private static getServerStatus(
    connections: number,
    maxConnections: number
  ): string {
    const percentage = (connections / maxConnections) * 100;
    if (percentage > 80) return "🟥 High Load";
    if (percentage > 50) return "🟨 Medium Load";
    return "🟩 Normal";
  }

  private static getHealthStatus(server: CustomProxyServer): string {
    const errorRate =
      server.hmrEvents.length > 0
        ? (server.eventCounts["error"] || 0) / server.hmrEvents.length
        : 0;

    if (errorRate > 0.1) return "🔴 Poor";
    if (errorRate > 0.05) return "🟨 Fair";
    if (server.hmrEvents.length === 0) return "⚪ No Data";
    return "🟢 Good";
  }

  private static getEventStatus(event: HMREvent): string {
    if (event.name === "error") return "❌ Error";
    if (event.name.includes("connect")) return "🟢 Connected";
    if (event.name.includes("disconnect")) return "🔴 Disconnected";
    if (event.name.includes("Update")) return "🔄 Updated";
    if (event.name === "invalidate") return "⚠️ Invalidated";
    return "📝 Info";
  }

  private static formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
}

// Create a monitoring dashboard that updates
class HMRDashboard {
  static displayLiveStatus(servers: CustomProxyServer[]) {
    console.clear();
    console.log("🔄 Live HMR Monitoring Dashboard");
    console.log("=".repeat(60));
    console.log(`Last update: ${new Date().toLocaleTimeString()}\n`);

    // Display each server's HMR status
    servers.forEach((server, index) => {
      console.log(`${index + 1}. ${server.name}`);
      console.log(`   HMR Events: ${server.hmrEvents.length}`);
      console.log(
        `   Last Event: ${
          server.hmrEvents.length > 0
            ? `${
                server.hmrEvents[server.hmrEvents.length - 1].name
              } at ${server.hmrEvents[
                server.hmrEvents.length - 1
              ].timestamp.toLocaleTimeString()}`
            : "None"
        }`
      );

      // Show recent events
      const recent = server.hmrEvents.slice(-2);
      if (recent.length > 0) {
        console.log(`   Recent: ${recent.map((e) => e.name).join(", ")}`);
      }

      console.log();
    });

    // Show aggregated statistics
    const allEvents: HMREvent[] = [];
    servers.forEach((server: CustomProxyServer) => {
      allEvents.push(...server.hmrEvents);
    });
    const eventCounts = allEvents.reduce(
      (acc: Record<string, number>, event: HMREvent) => {
        acc[event.name] = (acc[event.name] || 0) + 1;
        return acc;
      },
      {}
    );

    console.log("📈 Aggregate Statistics:");
    console.table(eventCounts);
  }
}

// Export HMR events in various formats
function exportHMRData(
  server: CustomProxyServer,
  format: "csv" | "json" | "markdown" = "json"
) {
  const events = server.hmrEvents;

  switch (format) {
    case "csv":
      const csvHeaders = ["timestamp", "event", "module", "duration"];
      const csvRows = events.map((e) =>
        [
          e.timestamp.toISOString(),
          e.name,
          e.module || "",
          e.duration || "",
        ].join(",")
      );
      return [csvHeaders.join(","), ...csvRows].join("\n");

    case "markdown":
      const mdRows = events.map(
        (e) =>
          `| ${e.timestamp.toLocaleString()} | ${e.name} | ${
            e.module || "N/A"
          } | ${e.duration || "N/A"}ms |`
      );
      return [
        "| Timestamp | Event | Module | Duration |",
        "|-----------|-------|--------|----------|",
        ...mdRows,
      ].join("\n");

    case "json":
    default:
      return JSON.stringify(
        {
          server: server.name,
          totalEvents: events.length,
          events: events.map((e) => ({
            ...e,
            timestamp: e.timestamp.toISOString(),
          })),
        },
        null,
        2
      );
  }
}

// Example usage and demonstration
function demonstrateHMRTracking() {
  // Create servers and simulate HMR events
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
  ];

  // Simulate HMR events on first server
  const devServer = servers[0];
  devServer.logHMREvent("ws:connect", { module: "main.js" });
  devServer.logHMREvent("beforeUpdate", { module: "app.js", duration: 45 });
  devServer.logHMREvent("afterUpdate", { module: "app.js", duration: 120 });
  devServer.logHMREvent("invalidate", { module: "styles.css" });
  devServer.logHMREvent("ws:connect", { module: "utils.js" });
  devServer.logHMREvent("error", {
    module: "component.js",
    details: { error: "Failed to compile" },
  });

  console.log("📊 Server Overview with HMR Status:");
  const serverTable = CustomProxyServer.formatServerTable(servers);
  console.log(Bun.inspect.table(serverTable, { colors: true }));

  console.log("\n📈 Detailed HMR Events for WebSocket Proxy:");
  const hmrEventsTable = CustomProxyServer.formatHMREventsTable(devServer);
  console.log(Bun.inspect.table(hmrEventsTable, { colors: true }));

  console.log("\n📊 HMR Statistics (Nested Object Display):");
  console.log(
    Bun.inspect(devServer.hmrStats, {
      colors: true,
      depth: 3,
      compact: false,
      sorted: true,
    })
  );

  console.log("\n📈 HMR Event Statistics Table:");
  const statsArray: { Metric: string; Value: any }[] = [];
  for (const key in devServer.hmrStats) {
    statsArray.push({
      Metric: key,
      Value: devServer.hmrStats[key],
    });
  }
  console.log(Bun.inspect.table(statsArray, { colors: true }));

  console.log("\n📤 HMR Data Export (JSON):");
  console.log(exportHMRData(devServer, "json"));

  console.log("\n📤 HMR Data Export (Markdown Table):");
  console.log(exportHMRData(devServer, "markdown"));

  return { servers, devServer };
}

// Export for use in other modules
export {
  CustomProxyServer,
  HMRDashboard,
  HMREvent,
  HMREventNames,
  demonstrateHMRTracking,
  exportHMRData,
};

// Run demonstration if this file is executed directly
// Note: In a real environment, you might want to use a different check
// For now, we'll just export the functionality
demonstrateHMRTracking();
