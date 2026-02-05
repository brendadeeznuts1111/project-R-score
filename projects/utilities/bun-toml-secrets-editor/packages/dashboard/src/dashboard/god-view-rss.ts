#!/usr/bin/env bun
/**
 * God View Dashboard with RSS monitoring
 */

import { GodViewDashboard } from "../index";

const dashboard = new GodViewDashboard();
const port = parseInt(process.env.PORT || "3000");

try {
  const result = dashboard.start(port);
  console.log(`🚀 Dashboard started successfully!`);
  console.log(`📊 Port: ${result.port}`);
  console.log(`📡 Feeds: ${result.feeds.length} configured`);
  console.log(`🔥 Hot Reload: ${result.hotReload ? "Enabled" : "Disabled"}`);
} catch (error) {
  console.error("❌ Failed to start dashboard:", error);
  process.exit(1);
}
