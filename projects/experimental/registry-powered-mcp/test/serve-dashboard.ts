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

console.info("\n🧪 Testing Dashboard Server");
console.info("━".repeat(50));
console.info(`\n📊 Dashboard: http://localhost:${server.port}`);
console.info(`🔗 Status:    http://localhost:${server.port}/status`);
console.info(`\n✨ Server running with HMR enabled`);
console.info(`\n📝 Press Ctrl+C to stop\n`);
