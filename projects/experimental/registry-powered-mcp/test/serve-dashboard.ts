#!/usr/bin/env bun

/**
 * Simple Bun server to view the testing dashboard
 * Run: bun test/serve-dashboard.ts
 * Then open: http://localhost:3030
 */

import dashboard from "./status-dashboard.html";

const server = Bun.serve({
  port: 3030,
  routes: {
    "/": dashboard,
    "/status": dashboard,
    "/dashboard": dashboard,
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log("\n🧪 Testing Dashboard Server");
console.log("━".repeat(50));
console.log(`\n📊 Dashboard: http://localhost:${server.port}`);
console.log(`🔗 Status:    http://localhost:${server.port}/status`);
console.log(`\n✨ Server running with HMR enabled`);
console.log(`\n📝 Press Ctrl+C to stop\n`);
