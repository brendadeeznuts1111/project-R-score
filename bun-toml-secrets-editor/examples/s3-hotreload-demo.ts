#!/usr/bin/env bun
/**
 * Demo: S3 URL Support + Hot Reloading Integration
 * 
 * This example demonstrates:
 * 1. Fetching configuration from S3 using Bun's native S3 support
 * 2. Hot reloading with callbacks when configuration changes
 * 3. Real-time dashboard updates based on S3 data
 */

import { fetchS3JSON, checkS3ObjectExists, S3Credentials } from "../packages/core/src/utils/s3-fetcher";
import { createHotReloadManager } from "../packages/dashboard/src/hot-reload-manager";
import { getLogger } from "../packages/core/src";

interface AppConfig {
  title: string;
  theme: string;
  features: string[];
  lastUpdated: string;
}

class S3ConfigDashboard {
  private logger = getLogger();
  private config: AppConfig | null = null;
  private hotReload = createHotReloadManager({
    acceptSelf: true,
    acceptDependencies: ["./config-loader.ts"],
    onDispose: () => {
      this.logger.info("Cleaning up dashboard resources");
    }
  });

  constructor(private s3ConfigUrl: string, private credentials?: S3Credentials) {
    this.setupHotReload();
  }

  private setupHotReload() {
    // Reload configuration when this module updates
    this.hotReload.onCallback("config-reload", async () => {
      this.logger.info("🔥 Reloading configuration from S3");
      await this.loadConfig();
    });

    // Handle dependency updates
    this.hotReload.onCallback("./config-loader.ts", (newModule) => {
      this.logger.info("🔥 Config loader updated, refreshing data");
      this.loadConfig();
    });

    // Listen for hot reload events
    this.hotReload.onEvent("bun:beforeReload", () => {
      this.logger.info("🔥 Preparing for reload...");
    });
  }

  async loadConfig(): Promise<boolean> {
    try {
      // Check if config exists first
      const exists = await checkS3ObjectExists(this.s3ConfigUrl, {
        credentials: this.credentials
      });

      if (!exists) {
        this.logger.error(`Configuration not found at ${this.s3ConfigUrl}`);
        return false;
      }

      // Fetch configuration from S3
      this.config = await fetchS3JSON<AppConfig>(this.s3ConfigUrl, {
        credentials: this.credentials
      });

      this.logger.info(`✅ Configuration loaded: ${this.config?.title}`);
      this.logger.info(`🎨 Theme: ${this.config?.theme}`);
      this.logger.info(`⚡ Features: ${this.config?.features.join(", ")}`);

      return true;
    } catch (error) {
      this.logger.error(`Failed to load configuration: ${error}`);
      return false;
    }
  }

  getConfig(): AppConfig | null {
    return this.config;
  }

  async startWatching(intervalMs: number = 30000) {
    this.logger.info(`👀 Watching S3 configuration every ${intervalMs}ms`);
    
    const watch = async () => {
      await this.loadConfig();
      setTimeout(watch, intervalMs);
    };

    await watch();
  }

  displayDashboard() {
    if (!this.config) {
      console.log("❌ No configuration loaded");
      return;
    }

    console.clear();
    console.log("🎯 S3 Configuration Dashboard");
    console.log("=".repeat(40));
    console.log(`📝 Title: ${this.config.title}`);
    console.log(`🎨 Theme: ${this.config.theme}`);
    console.log(`📅 Last Updated: ${this.config.lastUpdated}`);
    console.log(`⚡ Features: ${this.config.features.length} enabled`);
    console.log("🔥 Hot Reload: " + (this.hotReload.isHotReloadAvailable() ? "✅ Enabled" : "❌ Disabled"));
    console.log("=".repeat(40));
  }
}

// Demo execution
async function runDemo() {
  const logger = getLogger();

  // Example S3 URL (replace with your actual S3 bucket and object)
  const s3ConfigUrl = "s3://my-app-config/production/config.json";
  
  // Optional credentials (can also use environment variables)
  const credentials: S3Credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "YOUR_ACCESS_KEY",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "YOUR_SECRET_KEY",
    region: process.env.AWS_REGION || "us-east-1"
  };

  logger.info("🚀 Starting S3 + Hot Reload Demo");

  // Create dashboard instance
  const dashboard = new S3ConfigDashboard(s3ConfigUrl, credentials);

  // Load initial configuration
  const loaded = await dashboard.loadConfig();
  
  if (!loaded) {
    logger.warn("⚠️ Using demo configuration (S3 not accessible)");
    // Use demo config for demonstration
    (dashboard as any).config = {
      title: "Demo Application",
      theme: "dark",
      features: ["s3-integration", "hot-reload", "dashboard"],
      lastUpdated: new Date().toISOString()
    };
  }

  // Display dashboard
  dashboard.displayDashboard();

  // Start watching for changes (only if S3 is accessible)
  if (loaded) {
    await dashboard.startWatching(10000); // Check every 10 seconds
  }

  // Setup hot reload for dashboard updates
  if (dashboard["hotReload"].isHotReloadAvailable()) {
    dashboard["hotReload"].onCallback("dashboard-refresh", () => {
      dashboard.displayDashboard();
    });

    logger.info("🔥 Hot reload ready - edit files to see updates!");
  }

  // Keep the process running
  logger.info("⏳ Dashboard is running... Press Ctrl+C to exit");
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n👋 Shutting down dashboard...");
  process.exit(0);
});

// Run the demo
if (import.meta.main) {
  runDemo().catch(console.error);
}

export { S3ConfigDashboard };
