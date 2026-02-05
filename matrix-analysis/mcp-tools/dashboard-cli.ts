#!/usr/bin/env bun
// dashboard-cli.ts - Command-line interface for enhanced dashboard management

import { EnhancedDashboardServer, type EnhancedDashboardConfig } from './enhanced-dashboard';

// CLI Commands
interface CLICommand {
  name: string;
  description: string;
  usage: string;
  handler: (args: string[]) => Promise<void>;
}

class DashboardCLI {
  private commands: Map<string, CLICommand> = new Map();
  private config: EnhancedDashboardConfig;

  constructor() {
    this.config = this.loadConfig();
    this.registerCommands();
  }

  private loadConfig(): EnhancedDashboardConfig {
    return {
      server: {
        port: parseInt(process.env.PORT || "3333"),
        host: process.env.HOST || "localhost",
        cors: {
          origin: (process.env.CORS_ORIGIN || "http://localhost:3001").split(","),
          credentials: true
        },
        rateLimit: {
          windowMs: 60000,
          max: 100
        },
        compression: process.env.COMPRESSION !== "false"
      },
      database: {
        path: process.env.DB_PATH || "./data/enhanced-audit.db",
        backup: {
          enabled: process.env.BACKUP_ENABLED !== "false",
          interval: parseInt(process.env.BACKUP_INTERVAL || "3600000"),
          retention: parseInt(process.env.BACKUP_RETENTION || "168")
        },
        optimization: {
          vacuumInterval: parseInt(process.env.VACUUM_INTERVAL || "86400000"),
          analyzeInterval: parseInt(process.env.ANALYZE_INTERVAL || "3600000")
        }
      },
      features: {
        caching: {
          enabled: process.env.CACHE_ENABLED !== "false",
          ttl: parseInt(process.env.CACHE_TTL || "300000"),
          maxSize: parseInt(process.env.CACHE_MAX_SIZE || "1000")
        },
        websockets: process.env.WEBSOCKETS_ENABLED !== "false",
        metrics: process.env.METRICS_ENABLED !== "false",
        alerts: process.env.ALERTS_ENABLED !== "false",
        scheduling: process.env.SCHEDULING_ENABLED !== "false"
      },
      security: {
        apiKey: process.env.API_KEY_ENABLED === "true",
        jwt: {
          enabled: process.env.JWT_ENABLED === "true",
          secret: process.env.JWT_SECRET || "your-secret-key",
          expiry: process.env.JWT_EXPIRY || "1h"
        },
        audit: process.env.AUDIT_ENABLED !== "false"
      },
      monitoring: {
        healthCheck: process.env.HEALTH_CHECK_ENABLED !== "false",
        metricsEndpoint: process.env.METRICS_ENDPOINT_ENABLED !== "false",
        profiling: process.env.PROFILING_ENABLED === "true"
      }
    };
  }

  private registerCommands(): void {
    this.commands.set("start", {
      name: "start",
      description: "Start the enhanced dashboard server",
      usage: "dashboard-cli start [--port PORT] [--host HOST]",
      handler: this.handleStart.bind(this)
    });

    this.commands.set("status", {
      name: "status",
      description: "Check dashboard server status",
      usage: "dashboard-cli status",
      handler: this.handleStatus.bind(this)
    });

    this.commands.set("config", {
      name: "config",
      description: "Show current configuration",
      usage: "dashboard-cli config [--show-secrets]",
      handler: this.handleConfig.bind(this)
    });

    this.commands.set("tenant", {
      name: "tenant",
      description: "Manage tenants",
      usage: "dashboard-cli tenant <list|create|delete|update> [options]",
      handler: this.handleTenant.bind(this)
    });

    this.commands.set("snapshot", {
      name: "snapshot",
      description: "Manage snapshots",
      usage: "dashboard-cli snapshot <create|list|delete|verify> [tenant]",
      handler: this.handleSnapshot.bind(this)
    });

    this.commands.set("metrics", {
      name: "metrics",
      description: "View performance metrics",
      usage: "dashboard-cli metrics [--format json|table]",
      handler: this.handleMetrics.bind(this)
    });

    this.commands.set("alerts", {
      name: "alerts",
      description: "Manage alerts",
      usage: "dashboard-cli alerts <list|create|delete|test>",
      handler: this.handleAlerts.bind(this)
    });

    this.commands.set("cache", {
      name: "cache",
      description: "Manage cache",
      usage: "dashboard-cli cache <stats|clear|size>",
      handler: this.handleCache.bind(this)
    });

    this.commands.set("backup", {
      name: "backup",
      description: "Manage database backups",
      usage: "dashboard-cli backup <create|list|restore|delete>",
      handler: this.handleBackup.bind(this)
    });

    this.commands.set("health", {
      name: "health",
      description: "Check system health",
      usage: "dashboard-cli health [--detailed]",
      handler: this.handleHealth.bind(this)
    });

    this.commands.set("logs", {
      name: "logs",
      description: "View dashboard logs",
      usage: "dashboard-cli logs [--tail] [--level LEVEL]",
      handler: this.handleLogs.bind(this)
    });
  }

  async run(args: string[]): Promise<void> {
    const command = args[0];

    if (!command || command === "help") {
      this.showHelp();
      return;
    }

    const cmd = this.commands.get(command);
    if (!cmd) {
      console.error(`❌ Unknown command: ${command}`);
      console.log("Run 'dashboard-cli help' for available commands");
      process.exit(1);
    }

    try {
      await cmd.handler(args.slice(1));
    } catch (error) {
      console.error(`❌ Error executing command '${command}':`, error);
      process.exit(1);
    }
  }

  private showHelp(): void {
    console.log("🚀 Enhanced Multi-Tenant Dashboard CLI");
    console.log("=" .repeat(50));
    console.log();
    
    console.log("Usage: dashboard-cli <command> [options]");
    console.log();
    
    console.log("Available commands:");
    for (const [name, cmd] of this.commands) {
      console.log(`  ${name.padEnd(12)} ${cmd.description}`);
      console.log(`               ${cmd.usage}`);
      console.log();
    }
    
    console.log("Environment Variables:");
    console.log("  PORT              Server port (default: 3333)");
    console.log("  HOST              Server host (default: localhost)");
    console.log("  CORS_ORIGIN       Allowed CORS origins");
    console.log("  DB_PATH           Database file path");
    console.log("  CACHE_ENABLED     Enable caching (default: true)");
    console.log("  WEBSOCKETS_ENABLED Enable WebSockets (default: true)");
    console.log("  METRICS_ENABLED   Enable metrics (default: true)");
    console.log("  ALERTS_ENABLED    Enable alerts (default: true)");
    console.log();
  }

  private async handleStart(args: string[]): Promise<void> {
    console.log("🚀 Starting Enhanced Dashboard Server...");
    
    // Parse command line arguments
    const portIndex = args.indexOf("--port");
    if (portIndex !== -1 && args[portIndex + 1]) {
      this.config.server.port = parseInt(args[portIndex + 1]);
    }
    
    const hostIndex = args.indexOf("--host");
    if (hostIndex !== -1 && args[hostIndex + 1]) {
      this.config.server.host = args[hostIndex + 1];
    }

    const server = new EnhancedDashboardServer(this.config);
    await server.start();

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log("\n🛑 Shutting down gracefully...");
      process.exit(0);
    });
  }

  private async handleStatus(args: string[]): Promise<void> {
    try {
      const response = await fetch(`http://${this.config.server.host}:${this.config.server.port}/health`);
      const status = await response.json();
      
      console.log("📊 Dashboard Server Status:");
      console.log(`  Status: ${status.status}`);
      console.log(`  Uptime: ${status.uptime}s`);
      console.log(`  Memory: ${Math.round(status.memory.heapUsed / 1024 / 1024)}MB`);
      console.log(`  Cache: ${status.cache.size}/${status.cache.maxSize} entries`);
      console.log(`  Connections: ${status.connections.totalConnections}`);
      
    } catch (error) {
      console.log("❌ Dashboard server is not running or not accessible");
      process.exit(1);
    }
  }

  private async handleConfig(args: string[]): Promise<void> {
    const showSecrets = args.includes("--show-secrets");
    
    console.log("⚙️  Dashboard Configuration:");
    console.log(`  Server: ${this.config.server.host}:${this.config.server.port}`);
    console.log(`  CORS Origins: ${this.config.server.cors.origin.join(", ")}`);
    console.log(`  Database: ${this.config.database.path}`);
    console.log(`  Compression: ${this.config.server.compression}`);
    console.log();
    
    console.log("Features:");
    console.log(`  Caching: ${this.config.features.caching.enabled} (TTL: ${this.config.features.caching.ttl}ms)`);
    console.log(`  WebSockets: ${this.config.features.websockets}`);
    console.log(`  Metrics: ${this.config.features.metrics}`);
    console.log(`  Alerts: ${this.config.features.alerts}`);
    console.log(`  Scheduling: ${this.config.features.scheduling}`);
    console.log();
    
    console.log("Security:");
    console.log(`  API Key Auth: ${this.config.security.apiKey}`);
    console.log(`  JWT Auth: ${this.config.security.jwt.enabled}`);
    if (showSecrets && this.config.security.jwt.enabled) {
      console.log(`  JWT Secret: ${this.config.security.jwt.secret}`);
    }
    console.log(`  Audit Logging: ${this.config.security.audit}`);
  }

  private async handleTenant(args: string[]): Promise<void> {
    const action = args[0];
    
    switch (action) {
      case "list":
        await this.listTenants();
        break;
      case "create":
        await this.createTenant(args.slice(1));
        break;
      case "delete":
        await this.deleteTenant(args[1]);
        break;
      case "update":
        await this.updateTenant(args.slice(1));
        break;
      default:
        console.error("❌ Invalid tenant action. Use: list, create, delete, update");
    }
  }

  private async listTenants(): Promise<void> {
    try {
      const response = await fetch(`http://${this.config.server.host}:${this.config.server.port}/api/tenants/enhanced`);
      const tenants = await response.json();
      
      console.log("📋 Tenants:");
      tenants.forEach((tenant: any) => {
        console.log(`  ${tenant.id} (${tenant.name}) - ${tenant.enabled ? "✅" : "❌"}`);
        console.log(`    Compliance: ${tenant.compliance.score}% (${tenant.compliance.status})`);
        console.log(`    Violations: ${tenant.compliance.violations.total}`);
      });
    } catch (error) {
      console.error("❌ Failed to fetch tenants");
    }
  }

  private async createTenant(args: string[]): Promise<void> {
    const id = args[0];
    const name = args[1];
    
    if (!id || !name) {
      console.error("❌ Usage: dashboard-cli tenant create <id> <name>");
      return;
    }
    
    console.log(`🔧 Creating tenant: ${id} (${name})`);
    // Implementation would call API to create tenant
  }

  private async deleteTenant(tenantId: string): Promise<void> {
    if (!tenantId) {
      console.error("❌ Usage: dashboard-cli tenant delete <tenant-id>");
      return;
    }
    
    console.log(`🗑️  Deleting tenant: ${tenantId}`);
    // Implementation would call API to delete tenant
  }

  private async updateTenant(args: string[]): Promise<void> {
    console.log("📝 Updating tenant...");
    // Implementation would call API to update tenant
  }

  private async handleSnapshot(args: string[]): Promise<void> {
    const action = args[0];
    const tenant = args[1];
    
    switch (action) {
      case "create":
        await this.createSnapshot(tenant);
        break;
      case "list":
        await this.listSnapshots(tenant);
        break;
      case "delete":
        await this.deleteSnapshot(args[1]);
        break;
      case "verify":
        await this.verifySnapshot(args[1]);
        break;
      default:
        console.error("❌ Invalid snapshot action. Use: create, list, delete, verify");
    }
  }

  private async createSnapshot(tenant?: string): Promise<void> {
    console.log(`📸 Creating snapshot${tenant ? ` for ${tenant}` : " for all tenants"}...`);
    // Implementation would call snapshot API
  }

  private async listSnapshots(tenant?: string): Promise<void> {
    try {
      const response = await fetch(`http://${this.config.server.host}:${this.config.server.port}/api/snapshots/enhanced`);
      const snapshots = await response.json();
      
      console.log("📸 Snapshots:");
      snapshots.forEach((snapshot: any) => {
        if (!tenant || snapshot.tenant === tenant) {
          console.log(`  ${snapshot.filename} (${snapshot.tenant})`);
          console.log(`    Size: ${Math.round(snapshot.size / 1024)}KB`);
          console.log(`    Created: ${snapshot.createdAt}`);
        }
      });
    } catch (error) {
      console.error("❌ Failed to fetch snapshots");
    }
  }

  private async deleteSnapshot(snapshotId: string): Promise<void> {
    console.log(`🗑️  Deleting snapshot: ${snapshotId}`);
    // Implementation would call API to delete snapshot
  }

  private async verifySnapshot(snapshotId: string): Promise<void> {
    console.log(`🔍 Verifying snapshot: ${snapshotId}`);
    // Implementation would call verification API
  }

  private async handleMetrics(args: string[]): Promise<void> {
    const format = args.includes("--json") ? "json" : "table";
    
    try {
      const response = await fetch(`http://${this.config.server.host}:${this.config.server.port}/api/analytics/performance`);
      const metrics = await response.json();
      
      if (format === "json") {
        console.log(JSON.stringify(metrics, null, 2));
      } else {
        console.log("📊 Performance Metrics:");
        console.log(`  Total Requests: ${metrics.totalRequests}`);
        console.log(`  Average Response Time: ${Math.round(metrics.averageResponseTime)}ms`);
        console.log(`  Error Rate: ${metrics.errorRate.toFixed(2)}%`);
        console.log(`  Cache Hit Rate: ${metrics.cacheHitRate.toFixed(2)}%`);
        console.log();
        console.log("Top Endpoints:");
        metrics.topEndpoints.forEach((endpoint: any, index: number) => {
          console.log(`  ${index + 1}. ${endpoint.endpoint} (${endpoint.count} requests)`);
        });
      }
    } catch (error) {
      console.error("❌ Failed to fetch metrics");
    }
  }

  private async handleAlerts(args: string[]): Promise<void> {
    const action = args[0];
    
    switch (action) {
      case "list":
        await this.listAlerts();
        break;
      case "create":
        await this.createAlert(args.slice(1));
        break;
      case "delete":
        await this.deleteAlert(args[1]);
        break;
      case "test":
        await this.testAlert();
        break;
      default:
        console.error("❌ Invalid alert action. Use: list, create, delete, test");
    }
  }

  private async listAlerts(): Promise<void> {
    try {
      const response = await fetch(`http://${this.config.server.host}:${this.config.server.port}/api/alerts`);
      const alerts = await response.json();
      
      console.log("🚨 Alerts:");
      alerts.forEach((alert: any) => {
        console.log(`  ${alert.name} (${alert.enabled ? "✅" : "❌"})`);
        console.log(`    ${alert.description}`);
      });
    } catch (error) {
      console.error("❌ Failed to fetch alerts");
    }
  }

  private async createAlert(args: string[]): Promise<void> {
    console.log("🔧 Creating alert...");
    // Implementation would call API to create alert
  }

  private async deleteAlert(alertId: string): Promise<void> {
    console.log(`🗑️  Deleting alert: ${alertId}`);
    // Implementation would call API to delete alert
  }

  private async testAlert(): Promise<void> {
    console.log("🧪 Testing alert system...");
    // Implementation would trigger test alert
  }

  private async handleCache(args: string[]): Promise<void> {
    const action = args[0];
    
    switch (action) {
      case "stats":
        await this.getCacheStats();
        break;
      case "clear":
        await this.clearCache();
        break;
      case "size":
        await this.getCacheSize();
        break;
      default:
        console.error("❌ Invalid cache action. Use: stats, clear, size");
    }
  }

  private async getCacheStats(): Promise<void> {
    try {
      const response = await fetch(`http://${this.config.server.host}:${this.config.server.port}/api/cache/stats`);
      const stats = await response.json();
      
      console.log("💾 Cache Statistics:");
      console.log(`  Size: ${stats.size}/${stats.maxSize} entries`);
      console.log(`  Hit Rate: ${stats.hitRate} hits`);
    } catch (error) {
      console.error("❌ Failed to fetch cache stats");
    }
  }

  private async clearCache(): Promise<void> {
    console.log("🧹 Clearing cache...");
    // Implementation would call API to clear cache
  }

  private async getCacheSize(): Promise<void> {
    try {
      const response = await fetch(`http://${this.config.server.host}:${this.config.server.port}/api/cache/stats`);
      const stats = await response.json();
      
      console.log(`Cache size: ${stats.size} entries`);
    } catch (error) {
      console.error("❌ Failed to fetch cache size");
    }
  }

  private async handleBackup(args: string[]): Promise<void> {
    const action = args[0];
    
    switch (action) {
      case "create":
        await this.createBackup();
        break;
      case "list":
        await this.listBackups();
        break;
      case "restore":
        await this.restoreBackup(args[1]);
        break;
      case "delete":
        await this.deleteBackup(args[1]);
        break;
      default:
        console.error("❌ Invalid backup action. Use: create, list, restore, delete");
    }
  }

  private async createBackup(): Promise<void> {
    console.log("💾 Creating backup...");
    // Implementation would create database backup
  }

  private async listBackups(): Promise<void> {
    console.log("📋 Available backups:");
    // Implementation would list available backups
  }

  private async restoreBackup(backupId: string): Promise<void> {
    console.log(`🔄 Restoring backup: ${backupId}`);
    // Implementation would restore from backup
  }

  private async deleteBackup(backupId: string): Promise<void> {
    console.log(`🗑️  Deleting backup: ${backupId}`);
    // Implementation would delete backup
  }

  private async handleHealth(args: string[]): Promise<void> {
    const detailed = args.includes("--detailed");
    
    try {
      const response = await fetch(`http://${this.config.server.host}:${this.config.server.port}/health`);
      const health = await response.json();
      
      console.log("🏥 System Health:");
      console.log(`  Overall Status: ${health.status}`);
      console.log(`  Uptime: ${health.uptime}s`);
      
      if (detailed) {
        console.log(`  Memory Usage: ${Math.round(health.memory.heapUsed / 1024 / 1024)}MB`);
        console.log(`  Cache Health: ${health.cache.size}/${health.cache.maxSize}`);
        console.log(`  Active Connections: ${health.connections.totalConnections}`);
        console.log(`  Active Rooms: ${Object.keys(health.connections.rooms).length}`);
      }
    } catch (error) {
      console.error("❌ Failed to fetch health status");
    }
  }

  private async handleLogs(args: string[]): Promise<void> {
    const tail = args.includes("--tail");
    const levelIndex = args.indexOf("--level");
    const level = levelIndex !== -1 ? args[levelIndex + 1] : "info";
    
    console.log(`📋 Dashboard Logs (${level}${tail ? ", tailing" : ""}):`);
    
    if (tail) {
      console.log("🔄 Tailing logs... (Ctrl+C to stop)");
      // Implementation would tail logs
    } else {
      console.log("Recent logs:");
      // Implementation would show recent logs
    }
  }
}

// Main execution
async function main() {
  const cli = new DashboardCLI();
  await cli.run(process.argv.slice(2));
}

// Run if called directly
if (import.meta.main) {
  main().catch(console.error);
}

export { DashboardCLI };
