// @bun/proxy/demo/sorted-table-demo.ts - Demo of inspect.table with sorting and filtering

import { inspect, TableData } from '../src/utils/index.js';

// Define the sorted table data as requested
const sortedTable: TableData = {
  columns: [
    { key: "protocol", header: "Protocol", type: "string", sortable: true },
    { key: "connections", header: "Connections", type: "number", sortable: true },
    { key: "latency", header: "Latency (ms)", type: "number", sortable: true },
    { key: "status", header: "Status", type: "badge" }
  ],
  rows: [
    { protocol: "HTTP", connections: 1500, latency: 28, status: "active" },
    { protocol: "HTTPS", connections: 2200, latency: 45, status: "active" },
    { protocol: "WebSocket", connections: 850, latency: 120, status: "active" },
    { protocol: "WSS", connections: 1200, latency: 85, status: "connecting" },
    { protocol: "MQTT", connections: 450, latency: 65, status: "inactive" }
  ]
};

// Display with sorting and filtering
console.log("=== Sorted and Filtered Table Demo ===\n");

// Original table
console.log("📊 Original Table:");
console.log(inspect.table(sortedTable));

console.log("\n" + "==================================================\n");

// Sorted by connections (descending)
console.log("📈 Sorted by Connections (Descending):");
console.log(inspect.table(sortedTable, {
  sortBy: "connections",
  sortOrder: "desc"
}));

console.log("\n" + "==================================================\n");

// Filtered to exclude inactive services
console.log("🔍 Filtered (excluding inactive):");
console.log(inspect.table(sortedTable, {
  filter: (row) => row.status !== "inactive"
}));

console.log("\n" + "==================================================\n");

// Combined: Sorted and Filtered
console.log("🎯 Sorted by Connections (Descending) + Filtered:");
console.log(inspect.table(sortedTable, {
  sortBy: "connections",
  sortOrder: "desc",
  filter: (row) => row.status !== "inactive"
}));

console.log("\n" + "==================================================\n");

// Additional demos
console.log("🔄 Sorted by Latency (Ascending):");
console.log(inspect.table(sortedTable, {
  sortBy: "latency",
  sortOrder: "asc"
}));

console.log("\n" + "==================================================\n");

console.log("📝 String Filter (contains 'S'):");
console.log(inspect.table(sortedTable, {
  filter: "S"
}));

console.log("\n" + "==================================================\n");

// Demo with more complex data
const complexTable: TableData = {
  columns: [
    { key: "service", header: "Service", type: "string", sortable: true },
    { key: "status", header: "Status", type: "badge", sortable: true },
    { key: "cpu", header: "CPU %", type: "number", sortable: true },
    { key: "memory", header: "Memory (MB)", type: "number", sortable: true },
    { key: "uptime", header: "Uptime", type: "duration", sortable: true }
  ],
  rows: [
    { service: "API Gateway", status: "healthy", cpu: 45.2, memory: 512, uptime: 86400000 },
    { service: "Auth Service", status: "healthy", cpu: 23.4, memory: 256, uptime: 172800000 },
    { service: "Data Service", status: "degraded", cpu: 89.1, memory: 1024, uptime: 3600000 },
    { service: "Cache Service", status: "healthy", cpu: 15.6, memory: 128, uptime: 2592000000 },
    { service: "Message Queue", status: "warning", cpu: 67.8, memory: 768, uptime: 432000000 }
  ]
};

console.log("🔧 Complex Table - Sorted by CPU Usage:");
console.log(inspect.table(complexTable, {
  sortBy: "cpu",
  sortOrder: "desc",
  showBorder: true,
  zebra: true
}));

console.log("\n✅ Demo Complete! The inspect.table() function supports:");
console.log("• Sorting by any column (ascending/descending)");
console.log("• Function-based filtering for complex conditions");
console.log("• String-based filtering for simple text search");
console.log("• Combined sorting and filtering");
console.log("• Custom styling options (borders, zebra striping)");
