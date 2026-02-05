#!/usr/bin/env bun

// Focused demo showcasing Bun.inspect.table() with HMR events
import { CustomProxyServer, exportHMRData } from "./hmr-event-tracker";

console.log("🎯 Bun.inspect.table() HMR Demo");
console.log("===============================\n");

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
if (devServer) {
  devServer.logHMREvent("ws:connect", { module: "main.js" });
  devServer.logHMREvent("beforeUpdate", { module: "app.js", duration: 45 });
  devServer.logHMREvent("afterUpdate", { module: "app.js", duration: 120 });
  devServer.logHMREvent("invalidate", { module: "styles.css" });
  devServer.logHMREvent("ws:connect", { module: "utils.js" });
  devServer.logHMREvent("error", {
    module: "component.js",
    details: { error: "Compilation failed" },
  });
}

// Display server overview table with enhanced formatting
console.log("📊 Server Overview with HMR Status:");
const serverTable = CustomProxyServer.formatServerTable(servers, {
  columns: [
    "name",
    "region",
    "connections",
    "HMR Enabled",
    "HMR Total",
    "Last HMR",
    "Status",
  ],
  includeComputed: true,
});

// Note: Bun's table API is simpler than shown in the example
// We'll use the actual Bun API with colors
console.log(Bun.inspect.table(serverTable, { colors: true }));

console.log("\n📈 Detailed HMR Events for WebSocket Proxy:");
const hmrEventsTable = devServer
  ? CustomProxyServer.formatHMREventsTable(devServer, {
      includeDetails: true,
    })
  : [];

// Enhanced event table with status-based coloring (simulated)
console.log(Bun.inspect.table(hmrEventsTable, { colors: true }));

console.log("\n📊 HMR Statistics (Nested Object Display):");
if (devServer) {
  console.log(
    Bun.inspect(devServer.hmrStats, {
      colors: true,
      depth: 3,
      compact: false,
      sorted: true,
    })
  );
}

console.log("\n📈 HMR Event Statistics Table:");
// Create stats array manually since Object.entries might not be available
const statsArray: { Metric: string; Value: any }[] = [];
if (devServer) {
  for (const key in devServer.hmrStats) {
    statsArray.push({
      Metric: key,
      Value: devServer.hmrStats[key],
    });
  }
}
console.log(Bun.inspect.table(statsArray, { colors: true }));

// Additional Bun-specific demonstrations
console.log("\n🎨 Enhanced Table Formatting Examples:");

// 1. Server health overview
console.log("\n🏥 Server Health Overview:");
const healthTable = CustomProxyServer.formatServerTable(servers, {
  columns: ["name", "Health", "Status", "HMR Errors", "Load %"],
  includeComputed: true,
});
console.log(Bun.inspect.table(healthTable, { colors: true }));

// 2. Recent events with enhanced formatting
console.log("\n⏰ Recent Events (Enhanced View):");
const recentEventsTable = devServer
  ? CustomProxyServer.formatHMREventsTable(devServer, {
      limit: 3,
      sortBy: "timestamp",
      includeDetails: true,
    })
  : [];
console.log(Bun.inspect.table(recentEventsTable, { colors: true }));

// 3. Configuration comparison
console.log("\n⚙️ Server Configuration Comparison:");
const configTable = CustomProxyServer.formatServerTable(servers, {
  columns: ["name", "Protocol", "Max Conn", "HMR Enabled", "Timeout"],
  includeComputed: false,
});
console.log(Bun.inspect.table(configTable, { colors: true }));

// 4. Error analysis (if errors exist)
console.log("\n🚨 Error Analysis:");
const errorEventsTable = devServer
  ? CustomProxyServer.formatHMREventsTable(devServer, {
      filterBy: ["error"],
      includeDetails: true,
    })
  : [];
console.log(Bun.inspect.table(errorEventsTable, { colors: true }));

// 5. Performance metrics
console.log("\n📊 Performance Metrics:");
const performanceTable = servers.map((server) => ({
  Server: server.name,
  "Total Events": server.hmrEvents.length,
  "Error Rate":
    server.hmrEvents.length > 0
      ? `${Math.round(
          ((server.eventCounts["error"] || 0) / server.hmrEvents.length) * 100
        )}%`
      : "0%",
  "Avg Duration":
    server.hmrEvents.length > 0
      ? `${Math.round(
          server.hmrEvents.reduce((sum, e) => sum + (e.duration || 0), 0) /
            server.hmrEvents.length
        )}ms`
      : "N/A",
  Connections: server.connections.toLocaleString(),
}));
console.log(Bun.inspect.table(performanceTable, { colors: true }));

// Export demonstration
console.log("\n📤 Export Options:");
console.log("\n📄 JSON Export:");
if (devServer) {
  console.log(exportHMRData(devServer, "json").slice(0, 300) + "...");
}

console.log("\n📝 Markdown Export:");
if (devServer) {
  console.log(exportHMRData(devServer, "markdown"));
}

// Bun-specific inspection features
console.log("\n🔍 Bun Inspection Features:");
console.log("\n1. Deep Object Inspection:");
if (devServer) {
  console.log(
    Bun.inspect(devServer, {
      colors: true,
      depth: 2,
      compact: true,
    })
  );
}

console.log("\n2. HMR Events Array Inspection:");
if (devServer) {
  console.log(
    Bun.inspect(devServer.hmrEvents.slice(0, 2), {
      colors: true,
      depth: 3,
    })
  );
}

console.log("\n3. Configuration Object Inspection:");
if (devServer) {
  console.log(
    Bun.inspect(devServer.config, {
      colors: true,
      sorted: true,
    })
  );
}

console.log("\n✨ Bun.inspect.table() Demo Complete!");
console.log("=====================================");
