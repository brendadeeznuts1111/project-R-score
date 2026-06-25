#!/usr/bin/env bun
/**
 * God View Dashboard with RSS monitoring
 */

import { GodViewDashboard } from "../index";

const dashboard = new GodViewDashboard();
const port = parseInt(process.env.PORT || "3000");

try {
  const result = dashboard.start(port);
  console.info(`🚀 Dashboard started successfully!`);
  console.info(`📊 Port: ${result.port}`);
  console.info(`📡 Feeds: ${result.feeds.length} configured`);
  console.info(`🔥 Hot Reload: ${result.hotReload ? "Enabled" : "Disabled"}`);
} catch (error) {
  console.error("❌ Failed to start dashboard:", error);
  process.exit(1);
}
