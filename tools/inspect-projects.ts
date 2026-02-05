/**
 * 🚀 Prefetch Optimizations
 * 
 * This file includes prefetch hints for optimal performance:
 * - DNS prefetching for external domains
 * - Preconnect for faster handshakes
 * - Resource preloading for critical assets
 * 
 * Generated automatically by optimize-examples-prefetch.ts
 */
#!/usr/bin/env bun
/**
 * Project Matrix Inspection Demo
 * Uses Bun.inspect({ columns: true, depth: N }) to display structured data
 */

console.clear();
console.log("╔═══════════════════════════════════════════════════════════════╗");
console.log("║         PROJECT MATRIX - Bun.inspect Table Visualization     ║");
console.log("╚═══════════════════════════════════════════════════════════════╝\n");

// ============================================================================
// Define the complete project structure
// ============================================================================

const projects = [
  {
    name: "my-bun-app",
    path: "/Users/ashley/PROJECTS/my-bun-app",
    description: "Web server project",
    entryPoint: "index.ts",
    status: "active",
    port: 3000,
    dependencies: ["express", "cors", "helmet"],
    envVars: ["NODE_ENV", "DB_URL", "SESSION_SECRET"],
    features: ["sessions", "hmac", "logging"]
  },
  {
    name: "native-addon-tool",
    path: "/Users/ashley/PROJECTS/native-addon-tool",
    description: "Native module builder",
    entryPoint: "build.ts",
    status: "active",
    port: null,
    dependencies: ["node-gyp", "cmake", "make"],
    envVars: ["BUILD_TARGET", "NATIVE_ARCH"],
    features: ["cross-compile", "bundling"]
  },
  {
    name: "cli-dashboard",
    path: "/Users/ashley/PROJECTS/cli-dashboard",
    description: "Interactive CLI dashboard",
    entryPoint: "dashboard.ts",
    status: "active",
    port: null,
    dependencies: ["blessed", "term-kit"],
    envVars: ["LOG_LEVEL", "THEME"],
    features: ["live-metrics", "tui", "system-monitor"]
  },
  {
    name: "edge-worker",
    path: "/Users/ashley/PROJECTS/edge-worker",
    description: "Edge function deployer",
    entryPoint: "worker.ts",
    status: "active",
    port: null,
    dependencies: ["@cloudflare/workers-types", "wrangler"],
    envVars: ["DEPLOY_TARGET", "KV_NAMESPACE"],
    features: ["deploy", "bundle", "kv-storage"]
  }
];

const cliTools = [
  {
    name: "overseer-cli.ts",
    purpose: "Monorepo manager",
    location: "/Users/nolarose/PROJECTS/overseer-cli.ts",
    uses: ["Bun.main", "Bun.spawn", "entry guard"],
    commands: ["list", "run", "execute"],
    isolation: "full"
  },
  {
    name: "cli-resolver.ts",
    purpose: "Project-specific binary resolution",
    location: "/Users/nolarose/PROJECTS/cli-resolver.ts",
    uses: ["Bun.which", "Bun.spawn", "Bun.main"],
    commands: ["typecheck", "eslint", "any binary"],
    isolation: "project-local"
  },
  {
    name: "guide-cli.ts",
    purpose: "Advanced binary resolution demo",
    location: "/Users/nolarose/PROJECTS/guide-cli.ts",
    uses: ["Bun.which", "Bun.spawn", "caching", "diagnostics"],
    commands: ["--project", "--bin", "--args", "--diagnostics"],
    isolation: "project-local + env"
  },
  {
    name: "profiler.ts",
    purpose: "CPU profiling with project isolation",
    location: "/Users/nolarose/PROJECTS/profiler.ts",
    uses: ["Bun.main", "profile()", "file outputs"],
    commands: ["--run", "--save", "--analyze"],
    isolation: "file-based"
  },
  {
    name: "server.ts",
    purpose: "Web server with sessions",
    location: "/Users/nolarose/PROJECTS/server.ts",
    uses: ["Bun.serve", "HMAC", "cookies"],
    commands: ["start", "dev"],
    isolation: "session-based"
  },
  {
    name: "terminal-tool.ts",
    purpose: "Interactive PTY terminal",
    location: "/Users/nolarose/PROJECTS/terminal-tool.ts",
    uses: ["Bun.Terminal", "PTY", "data events"],
    commands: ["interactive"],
    isolation: "pty-session"
  }
];

// ============================================================================
// Demo 1: Simple projects table (depth: 0 - flat)
// ============================================================================

console.log("1️⃣  PROJECTS TABLE (depth: 0 - flat, no nested arrays)\n");
console.log(Bun.inspect(projects, { 
  columns: true,
  depth: 0  // Don't expand arrays like dependencies, envVars, features
}));

console.log("\n" + "─".repeat(80) + "\n");

// ============================================================================
// Demo 2: Projects with nested data (depth: 1 - show arrays)
// ============================================================================

console.log("2️⃣  PROJECTS WITH DEPENDENCIES & FEATURES (depth: 1 - single level)\n");
console.log(Bun.inspect(projects, {
  columns: true,
  depth: 1,  // Show arrays but don't nest them further
  maxArrayLength: 3  // Limit array display to 3 items
}));

console.log("\n" + "─".repeat(80) + "\n");

// ============================================================================
// Demo 3: Full depth projects table (depth: unlimited)
// ============================================================================

console.log("3️⃣  PROJECTS - FULL DEPTH (depth: null - show everything)\n");
console.log(Bun.inspect(projects, {
  columns: true,
  depth: null,  // Unlimited depth
  maxArrayLength: 10
}));

console.log("\n" + "─".repeat(80) + "\n");

// ============================================================================
// Demo 4: CLI Tools table (depth: 0)
// ============================================================================

console.log("4️⃣  CLI TOOLS (depth: 0 - flat)\n");
console.log(Bun.inspect(cliTools, { 
  columns: true,
  depth: 0
}));

console.log("\n" + "─".repeat(80) + "\n");

// ============================================================================
// Demo 5: CLI Tools with arrays (depth: 1)
// ============================================================================

console.log("5️⃣  CLI TOOLS WITH COMMANDS & USES (depth: 1)\n");
console.log(Bun.inspect(cliTools, {
  columns: true,
  depth: 1,
  maxArrayLength: 4
}));

console.log("\n" + "─".repeat(80) + "\n");

// ============================================================================
// Demo 6: Combined matrix view (projects + CLI as separate tables shows better)
// ============================================================================

console.log("6️⃣  COMBINED OVERVIEW\n");

const overview = {
  summary: {
    totalProjects: projects.length,
    totalCliTools: cliTools.length,
    platformHome: process.env.BUN_PLATFORM_HOME || "/Users/ashley/PROJECTS",
    runtime: "Bun 1.2+"
  },
  projects,
  cliTools
};

console.log(Bun.inspect(overview, {
  columns: true,
  depth: 0,  // Flat tables for both
  maxArrayLength: 5
}));

console.log("\n" + "─".repeat(80) + "\n");

// ============================================================================
// Demo 7: Rich detail with full depth on nested overview
// ============================================================================

console.log("7️⃣  DETAILED NESTED VIEW (depth: 2)\n");

const detailedOverview = {
  platform: {
    BUN_PLATFORM_HOME: process.env.BUN_PLATFORM_HOME || "/Users/ashley/PROJECTS",
    runtime: Bun.version || "1.2.0",
    pid: process.pid,
    platform: Bun.platform,
    arch: Bun.arch
  },
  projectsByStatus: projects.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>),
  cliToolsByIsolation: cliTools.reduce((acc, c) => {
    acc[c.isolation] = (acc[c.isolation] || 0) + 1;
    return acc;
  }, {} as Record<string, number>),
  projectList: projects,
  toolList: cliTools
};

console.log(Bun.inspect(detailedOverview, {
  depth: 2,
  maxArrayLength: 5,
  columns: true // This will format any arrays with columns
}));

console.log("\n" + "─".repeat(80) + "\n");

// ============================================================================
// Demo 8: Quick reference - how to use Bun.inspect yourself
// ============================================================================

console.log("8️⃣  QUICK REFERENCE\n");
console.log("Usage:");
console.log("  Bun.inspect(data, {");
console.log("    columns: true,  // Format arrays as tables (key feature!)");
console.log("    depth: N,       // How deep to show nested objects (0, 1, 2, null)");
console.log("    maxArrayLength: N,  // Truncate long arrays");
console.log("    colors: true,   // ANSI colors (default in terminal)");
console.log("  })");
console.log("\nExamples:");
console.log("  Bun.inspect(projects, { columns: true, depth: 0 }) // flat table");
console.log("  Bun.inspect(projects, { columns: true, depth: 1 }) // show arrays");
console.log("  Bun.inspect(projects, { columns: true, depth: null }) // unlimited");
console.log("  Bun.inspect(projects, { depth: 0 }) // plain object (no columns)");

console.log("\n╔═══════════════════════════════════════════════════════════════╗");
console.log("║  Tip: Run with 'bun --depth 3 inspect-projects.ts' to set   ║");
console.log("║  global depth flag (affects all Bun.inspect calls)          ║");
console.log("╚═══════════════════════════════════════════════════════════════╝");