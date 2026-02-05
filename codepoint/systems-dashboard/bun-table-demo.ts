#!/usr/bin/env bun

// Advanced Bun.inspect.table() demonstrations - No external dependencies!
import { inspect } from "bun";

// Type definitions for better TypeScript support
interface ServerData {
  name: string;
  region: string;
  cpu: number;
  memory: number;
  status: string;
  uptime: number;
  connections: number;
  lastUpdate: Date;
  load: number[];
}

interface PerformanceData {
  metric: string;
  value: number;
  unit: string;
  trend: string;
  threshold: number;
  status: "good" | "warning" | "critical";
}

interface ProcessData {
  id: string;
  name: string;
  cpu: number;
  memory: number;
  requests: number;
  errors: number;
  timestamp: Date;
}

// Enhanced server data with Bun's native styling
const serverData: ServerData[] = [
  {
    name: "web-01",
    region: "us-east",
    cpu: 45,
    memory: 65,
    status: "🟢 healthy",
    uptime: 99.9,
    connections: 2450,
    lastUpdate: new Date(),
    load: [1.2, 1.5, 1.1],
  },
  {
    name: "web-02",
    region: "us-west",
    cpu: 72,
    memory: 78,
    status: "🟡 warning",
    uptime: 98.5,
    connections: 3200,
    lastUpdate: new Date(),
    load: [2.1, 2.3, 2.0],
  },
  {
    name: "db-01",
    region: "eu-central",
    cpu: 89,
    memory: 92,
    status: "🔴 critical",
    uptime: 95.2,
    connections: 890,
    lastUpdate: new Date(),
    load: [3.8, 4.1, 3.9],
  },
];

// 1. Basic table with Bun's auto-formatting
console.log("\n🖥️  Basic Server Overview");
console.log(
  inspect.table(serverData, [
    "name",
    "region",
    "cpu",
    "memory",
    "status",
    "connections",
  ])
);

// 2. Custom formatted table using data transformation
console.log("\n📊 Advanced Metrics with Custom Formatting");
const formattedServerData = serverData.map((server: ServerData) => ({
  "🖥️  Server": server.name.toUpperCase(),
  "💻 CPU":
    server.cpu > 80
      ? `🔴 ${server.cpu}%`
      : server.cpu > 60
        ? `🟡 ${server.cpu}%`
        : `🟢 ${server.cpu}%`,
  "🧠 Memory": `${server.memory}%`.padStart(4),
  "⏱️  Uptime": `${server.uptime}%`.padStart(6),
  "🔗 Connections": server.connections.toLocaleString(),
}));

console.log(inspect.table(formattedServerData));

// 3. Performance metrics with trend analysis
const performanceData: PerformanceData[] = [
  {
    metric: "Response Time",
    value: 120,
    unit: "ms",
    trend: "↓",
    threshold: 200,
    status: "good",
  },
  {
    metric: "Error Rate",
    value: 0.2,
    unit: "%",
    trend: "→",
    threshold: 1.0,
    status: "good",
  },
  {
    metric: "Throughput",
    value: 4500,
    unit: "req/s",
    trend: "↑",
    threshold: 5000,
    status: "warning",
  },
  {
    metric: "CPU Usage",
    value: 67,
    unit: "%",
    trend: "↑",
    threshold: 80,
    status: "good",
  },
  {
    metric: "Memory Usage",
    value: 78,
    unit: "%",
    trend: "↓",
    threshold: 90,
    status: "good",
  },
];

console.log("\n📈 Performance Metrics Dashboard");
const formattedPerformanceData = performanceData.map(
  (metric: PerformanceData) => ({
    Metric: metric.metric.padEnd(16),
    Value: `${metric.value}${metric.unit}`.padStart(10),
    Trend: getColoredTrend(metric.trend),
    Threshold: `${metric.threshold}${metric.unit}`.padStart(10),
    Status: getColoredStatus(metric.status),
  })
);

console.log(inspect.table(formattedPerformanceData));

// Helper functions for formatting
function getColoredTrend(trend: string): string {
  const colors = { "↑": "\x1b[32m", "↓": "\x1b[31m", "→": "\x1b[33m" };
  const color = colors[trend as keyof typeof colors] || "\x1b[0m";
  return `${color}${trend}\x1b[0m`.padStart(6);
}

function getColoredStatus(status: string): string {
  const colors = {
    good: "\x1b[32m",
    warning: "\x1b[33m",
    critical: "\x1b[31m",
  };
  const color = colors[status as keyof typeof colors] || "\x1b[0m";
  return `${color}${status}\x1b[0m`.padEnd(10);
}

// 4. Real-time data simulation with Bun's fast processing
function generateRealtimeData(): ProcessData[] {
  return Array.from({ length: 5 }, (_, i: number) => ({
    id: `proc-${i + 1}`,
    name: `worker-${i + 1}`,
    cpu: Math.random() * 100,
    memory: Math.random() * 100,
    requests: Math.floor(Math.random() * 1000),
    errors: Math.floor(Math.random() * 10),
    timestamp: new Date(),
  }));
}

console.log("\n⚡ Real-time Process Monitor");
const realtimeData = generateRealtimeData();
const formattedRealtimeData = realtimeData.map((process: ProcessData) => ({
  ID: process.id,
  Process: process.name,
  "CPU %": process.cpu.toFixed(1).padStart(6),
  "Memory %": process.memory.toFixed(1).padStart(8),
  Requests: process.requests.toLocaleString(),
  Errors:
    process.errors > 5
      ? `\x1b[31m${process.errors}\x1b[0m`
      : process.errors.toString(),
}));

console.log(inspect.table(formattedRealtimeData));

// 5. Export functionality using Bun's file system
export function exportTable(data: any[], filename: string): void {
  const tableOutput = inspect.table(data, ["name", "cpu", "memory", "status"]);

  Bun.write(filename, tableOutput);
  console.log(`📁 Table exported to ${filename}`);
}

// 6. Advanced sorting and filtering
function filterAndSort<T>(
  data: T[],
  sortBy: keyof T,
  filterBy?: (item: T) => boolean
): T[] {
  let filtered = filterBy ? data.filter(filterBy) : data;
  return filtered.sort((a: T, b: T) => {
    const aVal = a[sortBy] as number;
    const bVal = b[sortBy] as number;
    return bVal - aVal;
  });
}

console.log("\n🔍 High CPU Usage Servers (Sorted by CPU)");
const highCpuServers = filterAndSort(
  serverData,
  "cpu",
  (server: ServerData) => server.cpu > 60
);
const formattedHighCpuData = highCpuServers.map((server: ServerData) => ({
  Server: server.name,
  "CPU %": server.cpu,
  "Memory %": server.memory,
  Status: server.status,
}));

console.log(inspect.table(formattedHighCpuData));

// 7. JSON export with Bun's fast JSON handling
console.log("\n📄 Export Options");
const jsonData = JSON.stringify(serverData, null, 2);
console.log(`📊 JSON data ready (${jsonData.length} characters)`);

// Export to file using Bun's native file system
exportTable(serverData, "servers-report-fixed.txt");

// 8. Advanced table with custom data transformation
console.log("\n🎨 Custom Data Transformation");
const transformedData = serverData.map((server: ServerData) => {
  const healthScore = calculateHealthScore(server);
  return {
    Server: server.name,
    Region: server.region,
    "Health Score": `${healthScore}/100`,
    Performance: getPerformanceGrade(server.cpu, server.memory),
    Status: server.status,
  };
});

console.log(inspect.table(transformedData));

function calculateHealthScore(server: ServerData): number {
  const cpuScore = Math.max(0, 100 - server.cpu);
  const memoryScore = Math.max(0, 100 - server.memory);
  const uptimeScore = server.uptime;
  return Math.round((cpuScore + memoryScore + uptimeScore) / 3);
}

function getPerformanceGrade(cpu: number, memory: number): string {
  const avg = (cpu + memory) / 2;
  if (avg < 50) return "🟢 Excellent";
  if (avg < 70) return "🟡 Good";
  if (avg < 85) return "🟠 Fair";
  return "🔴 Poor";
}

// 9. Demonstrate Bun's fast file operations
async function demonstrateFileOperations() {
  console.log("\n📁 Fast File Operations with Bun");

  // Write large dataset quickly
  const largeDataset = Array.from({ length: 1000 }, (_, i: number) => ({
    id: i,
    name: `server-${i}`,
    cpu: Math.random() * 100,
    memory: Math.random() * 100,
    timestamp: new Date().toISOString(),
  }));

  const startTime = Date.now();
  await Bun.write("large-dataset.json", JSON.stringify(largeDataset, null, 2));
  const endTime = Date.now();

  console.log(`✅ Wrote 1000 records to file in ${endTime - startTime}ms`);

  // Read and process quickly
  const readStartTime = Date.now();
  const file = Bun.file("large-dataset.json");
  const data = await file.json();
  const readEndTime = Date.now();

  console.log(
    `✅ Read and parsed ${data.length} records in ${readEndTime - readStartTime}ms`
  );

  // Clean up
  await Bun.write("large-dataset.json", "");
}

// 10. Performance comparison
console.log("\n⚡ Performance Comparison");
console.log("Bun Native Features:");
console.log("  • No external dependencies");
console.log("  • Built-in JSON handling");
console.log("  • Fast file operations");
console.log("  • Native table formatting");
console.log("  • TypeScript support");

console.log("\n✅ Advanced Bun Table Demo Complete!");
console.log("💡 Key Benefits Demonstrated:");
console.log("   • Native table formatting");
console.log("   • Custom data transformation");
console.log("   • Fast file operations");
console.log("   • Type-safe implementations");
console.log("   • Performance optimizations");

// Run the file operations demo
await demonstrateFileOperations();
