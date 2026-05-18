#!/usr/bin/env bun
// tools/inspect-demo.ts — Demo of Bun.inspect tabular data visualization

console.info("╔═══════════════════════════════════════════════════════════════╗");
console.info("║           Bun.inspect - Tabular Data Visualization            ║");
console.info("╚═══════════════════════════════════════════════════════════════╝\n");

// Example 1: Project Matrix (matches your table from the original request)
console.info("1️⃣  PROJECT MATRIX (from your spec)\n");

const projects = [
  {
    name: "my-bun-app",
    path: "/Users/ashley/PROJECTS/my-bun-app",
    description: "Web server project",
    entryPoint: "index.ts",
    keyVars: "NODE_ENV, DB_URL, PROJECT_BIN"
  },
  {
    name: "native-addon-tool",
    path: "/Users/ashley/PROJECTS/native-addon-tool",
    description: "Native module builder",
    entryPoint: "build.ts",
    keyVars: "BUILD_TARGET, PROJECT_BIN"
  },
  {
    name: "cli-dashboard",
    path: "/Users/ashley/PROJECTS/cli-dashboard",
    description: "Interactive CLI app",
    entryPoint: "dashboard.ts",
    keyVars: "LOG_LEVEL, PROJECT_BIN"
  },
  {
    name: "edge-worker",
    path: "/Users/ashley/PROJECTS/edge-worker",
    description: "Edge function deployer",
    entryPoint: "worker.ts",
    keyVars: "DEPLOY_TARGET, PROJECT_BIN"
  }
];

// Bun.inspect with tabular format (automatic when array of objects with same keys)
console.info(Bun.inspect(projects, { columns: true }));

// Example 2: Process Information
console.info("\n\n2️⃣  SYSTEM PROCESS INFO\n");

const processInfo = [
  { pid: process.pid, platform: Bun.platform, arch: Bun.arch, cpuCount: Bun.cpuCount() },
  { pid: 12345, platform: "darwin", arch: "arm64", cpuCount: 8 },
  { pid: 67890, platform: "linux", arch: "x64", cpuCount: 16 }
];

console.info(Bun.inspect(processInfo, {
  columns: true,
  sort: (a, b) => a.pid - b.pid
}));

// Example 3: Custom Data with Headers
console.info("\n\n3️⃣  CUSTOM TABLE WITH HEADERS\n");

const stats = [
  { metric: "Uptime", value: process.uptime(), unit: "seconds" },
  { metric: "Memory RSS", value: process.memoryUsage().rss / 1024 / 1024, unit: "MB" },
  { metric: "Heap Used", value: process.memoryUsage().heapUsed / 1024 / 1024, unit: "MB" },
  { metric: "External", value: process.memoryUsage().external / 1024 / 1024, unit: "MB" }
];

console.info(Bun.inspect(stats, {
  columns: true,
  sort: (a, b) => a.value - b.value
}));

// Example 4: Using colors and properties
console.info("\n\n4️⃣  NESTED DATA (with properties option)\n");

const projectDetails = {
  platformHome: "/Users/ashley/PROJECTS",
  overseer: "tools/overseer-cli.ts",
  sharedTools: ["utils/guide-cli.ts", "scripts/profiler.ts", "tools/server.ts", "utils/terminal-tool.ts"],
  projects: projects
};

// Show all properties including nested objects
console.info(Bun.inspect(projectDetails, {
  depth: 2,           // How deep to nest
  colors: true,       // ANSI colors (automatically true in terminal)
  maxArrayLength: 10  // Limit array display
}));

// Example 5: Table with specific property selection
console.info("\n\n5️⃣  FILTERED COLUMNS (only name + path)\n");

const simpleProjects = projects.map(p => ({
  name: p.name,
  path: p.path
}));

console.info(Bun.inspect(simpleProjects, { columns: true }));

// Example 6: Sorting and custom comparison
console.info("\n\n6️⃣  SORTED BY DESCRIPTION LENGTH\n");

const sortedByDescLength = [...projects].sort((a, b) =>
  a.description.length - b.description.length
);

console.info(Bun.inspect(sortedByDescLength, { columns: true }));

// Example 7: Different output formats
console.info("\n\n7️⃣  JSON FORMAT (for programmatic use)\n");

const jsonOutput = JSON.stringify(projects, null, 2);
console.info("JSON string (first 500 chars):");
console.info(jsonOutput.slice(0, 500) + "...");

// But Bun.inspect can also output JSON-like format with special option
console.info("\nBun.inspect with { depth: null } (unlimited depth):");
console.info(Bun.inspect(projects[0], { depth: null }));

// Example 8: Real-time dashboard simulation
console.info("\n\n8️⃣  DASHBOARD-STYLE TABLE (live data simulation)\n");

const liveMetrics = [
  { metric: "Active Connections", value: 42, status: "healthy" },
  { metric: "Requests/sec", value: 1247, status: "healthy" },
  { metric: "Avg Response Time", value: 23.5, status: "warning", unit: "ms" },
  { metric: "Error Rate", value: 0.02, status: "healthy", unit: "%" },
  { metric: "Memory Usage", value: 156, status: "healthy", unit: "MB" }
];

console.info(Bun.inspect(liveMetrics, {
  columns: true,
  sort: (a, b) => b.value - a.value  // Descending by value
}));

console.info("\n╔═══════════════════════════════════════════════════════════════╗");
console.info("║  Summary: Bun.inspect() with { columns: true } auto-formats  ║");
console.info("║  arrays of objects into readable tables with aligned cols.   ║");
console.info("║  Perfect for project matrices, metrics, and structured logs.║");
console.info("╚═══════════════════════════════════════════════════════════════╝");
