#!/usr/bin/env bun

// Enhanced Demo script for HMR Event Tracker with advanced table formatting
import { CustomProxyServer, exportHMRData } from "./hmr-event-tracker";

console.log("🚀 Enhanced HMR Event Tracker Demo");
console.log("==================================\n");

// Create servers with different configurations
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
    details: { error: "Failed to compile", line: 42 },
  });
  devServer.logHMREvent("beforeUpdate", { module: "router.js", duration: 78 });
  devServer.logHMREvent("afterUpdate", { module: "router.js", duration: 156 });
  devServer.logHMREvent("ws:disconnect", { module: "main.js" });
}

// Add events to other servers
if (servers[1]) {
  servers[1].logHMREvent("ws:connect", { module: "api.js" });
  servers[1].logHMREvent("error", {
    module: "auth.js",
    details: { error: "Authentication failed", code: 401 },
  });
}

if (servers[2]) {
  servers[2].logHMREvent("ws:connect", { module: "dev-server.js" });
  servers[2].logHMREvent("beforeUpdate", {
    module: "hot-reload.js",
    duration: 23,
  });
  servers[2].logHMREvent("afterUpdate", {
    module: "hot-reload.js",
    duration: 67,
  });
}

console.log("📊 Enhanced Server Overview with HMR Status:");
// Use enhanced formatting with sorting and computed columns
const serverTable = CustomProxyServer.formatServerTable(servers, {
  sortBy: "connections",
  includeComputed: true,
});
console.log(Bun.inspect.table(serverTable, { colors: true }));

console.log("\n📈 Detailed HMR Events (Sorted by Duration):");
const hmrEventsTable = devServer
  ? CustomProxyServer.formatHMREventsTable(devServer, {
      sortBy: "duration",
      includeDetails: true,
      limit: 10,
    })
  : [];
console.log(Bun.inspect.table(hmrEventsTable, { colors: true }));

console.log("\n🔍 Error Events Only:");
const errorEventsTable = devServer
  ? CustomProxyServer.formatHMREventsTable(devServer, {
      filterBy: ["error"],
      includeDetails: true,
    })
  : [];
console.log(Bun.inspect.table(errorEventsTable, { colors: true }));

console.log("\n📊 Server Health Overview:");
const healthTable = CustomProxyServer.formatServerTable(servers, {
  columns: [
    "name",
    "region",
    "connections",
    "HMR Total",
    "HMR Errors",
    "Health",
    "Status",
  ],
  includeComputed: true,
});
console.log(Bun.inspect.table(healthTable, { colors: true }));

console.log("\n🔄 Recent Events (Last 5, Newest First):");
const recentEventsTable = devServer
  ? CustomProxyServer.formatHMREventsTable(devServer, {
      sortBy: "timestamp",
      limit: 5,
      includeDetails: false,
    })
  : [];
console.log(Bun.inspect.table(recentEventsTable, { colors: true }));

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

console.log("\n📤 HMR Data Export (JSON):");
if (devServer) {
  console.log(exportHMRData(devServer, "json"));
}

console.log("\n📤 HMR Data Export (Markdown Table):");
if (devServer) {
  console.log(exportHMRData(devServer, "markdown"));
}

// Real-time monitoring simulation
console.log("\n🔄 Starting Real-time Monitoring Demo...");
console.log("=====================================");

let eventCount = 0;
const maxEvents = 15;

const simulationInterval = setInterval(() => {
  if (eventCount >= maxEvents) {
    clearInterval(simulationInterval);
    console.log("\n✅ Real-time simulation complete!");

    // Show final statistics
    console.log("\n📊 Final Server Status:");
    const finalTable = CustomProxyServer.formatServerTable(servers, {
      includeComputed: true,
      sortBy: "HMR Total",
    });
    console.log(Bun.inspect.table(finalTable, { colors: true }));

    return;
  }

  // Simulate random HMR events across all servers
  const eventTypes = [
    "ws:connect",
    "beforeUpdate",
    "afterUpdate",
    "invalidate",
    "ws:disconnect",
    "error",
  ];
  const randomServer = servers[Math.floor(Math.random() * servers.length)];
  const randomEvent = eventTypes[Math.floor(Math.random() * eventTypes.length)];

  if (randomServer) {
    randomServer.logHMREvent(randomEvent as any, {
      module: `module-${Math.floor(Math.random() * 10)}.js`,
      duration: Math.floor(Math.random() * 200),
      details:
        randomEvent === "error"
          ? {
              error: "Random error",
              timestamp: new Date().toISOString(),
            }
          : undefined,
    });
  }

  eventCount++;

  // Update display every 3 events
  if (eventCount % 3 === 0) {
    console.log(`\n📊 Update ${Math.floor(eventCount / 3)}:`);
    const updateTable = CustomProxyServer.formatServerTable(servers, {
      columns: ["name", "HMR Total", "Last HMR", "Health", "Status"],
      includeComputed: true,
    });
    console.log(Bun.inspect.table(updateTable, { colors: true }));
  }
}, 800);

console.log("📡 Monitoring HMR events across all servers...");
