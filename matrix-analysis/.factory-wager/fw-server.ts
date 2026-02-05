#!/usr/bin/env bun
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FactoryWager Native Server with Typed Routes
 * Pure Bun.serve implementation with explicit ServeOptions casting
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ServeOptions } from "bun";
import { EnvManager } from "./fw.ts";

// ═══════════════════════════════════════════════════════════════════════════════
// Native Server with Typed Routes
// ═══════════════════════════════════════════════════════════════════════════════

class FactoryWagerServer {
  private fwConfig: ReturnType<typeof EnvManager.getFactoryWagerConfig>;
  private bunConfig: ReturnType<typeof EnvManager.getBunConfig>;
  private startTime: Date;
  
  constructor() {
    this.fwConfig = EnvManager.getFactoryWagerConfig();
    this.bunConfig = EnvManager.getBunConfig();
    this.startTime = new Date();
  }

  async start(port: number): Promise<void> {
    const server = Bun.serve({
      port,
      hostname: "0.0.0.0",
      
      fetch: (req: Request): Response => {
        const url = new URL(req.url);
        
        // Type-safe route handling
        switch (url.pathname) {
          case "/health":
            return this.healthCheck();
            
          case "/env":
            return this.getEnvStatus();
            
          case "/config":
            return this.getConfig();
            
          case "/status":
            return this.getSystemStatus();
            
          case "/metrics":
            return this.getMetrics();
            
          case "/security":
            return this.getSecurityStatus();
            
          default:
            return new Response("FactoryWager API - Not Found", { 
              status: 404,
              headers: { "Content-Type": "text/plain" }
            });
        }
      },
      
      // WebSocket support with typed messages
      websocket: {
        open: (ws) => {
          console.log(`🔌 FactoryWager WebSocket connected: ${ws.remoteAddress}`);
          // Send welcome message with type safety
          ws.send(JSON.stringify({
            type: "welcome",
            message: "Connected to FactoryWager Server",
            timestamp: new Date().toISOString(),
            server: {
              version: "1.4.0-beta.20260201",
              mode: this.fwConfig.mode,
              uptime: Date.now() - this.startTime.getTime()
            }
          }));
        },
        
        message: (ws, msg: string | Buffer) => {
          // Handle typed messages
          if (typeof msg === "string") {
            try {
              const data = JSON.parse(msg);
              
              // Type-safe message handling
              switch (data.type) {
                case "echo":
                  ws.send(JSON.stringify({
                    type: "echo_response",
                    data: data.message,
                    timestamp: new Date().toISOString()
                  }));
                  break;
                  
                case "config":
                  ws.send(JSON.stringify({
                    type: "config_response",
                    data: {
                      factoryWager: this.fwConfig,
                      bun: this.bunConfig
                    },
                    timestamp: new Date().toISOString()
                  }));
                  break;
                  
                case "status":
                  ws.send(JSON.stringify({
                    type: "status_response",
                    data: this.getSystemStatusData(),
                    timestamp: new Date().toISOString()
                  }));
                  break;
                  
                default:
                  ws.send(JSON.stringify({
                    type: "error",
                    message: `Unknown message type: ${data.type}`,
                    timestamp: new Date().toISOString()
                  }));
              }
            } catch {
              // Fallback for non-JSON messages
              ws.send(JSON.stringify({
                type: "echo",
                data: `FactoryWager echo: ${msg}`,
                timestamp: new Date().toISOString()
              }));
            }
          } else {
            // Handle binary messages
            ws.send(JSON.stringify({
              type: "binary",
              size: msg.length,
              timestamp: new Date().toISOString()
            }));
          }
        },
        
        close: (ws) => {
          console.log(`🔌 FactoryWager WebSocket disconnected: ${ws.remoteAddress}`);
        },
        
        error: (ws, error) => {
          console.error(`WebSocket error for ${ws.remoteAddress}:`, error);
        }
      },
      
      // Error handling with typed responses
      error: (error: Error): Response => {
        console.error("FactoryWager server error:", error);
        return new Response(JSON.stringify({ 
          error: error.message,
          type: "server_error",
          timestamp: new Date().toISOString()
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    } as ServeOptions); // ← explicit cast ensures full type checking

    console.log(`🚀 FactoryWager server running at http://localhost:${server.port}`);
    console.log(`🔧 Environment: ${this.fwConfig.mode} | Debug: ${this.fwConfig.debug}`);
    console.log(`🥟 Bun Version: ${process.versions.bun} | TLS: ${this.bunConfig.tlsRejectUnauthorized ? "Secure" : "Disabled"}`);
    
    // Show security warnings if any
    this.displaySecurityWarnings();
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Typed Route Handlers
  // ═══════════════════════════════════════════════════════════════════════════════

  private healthCheck(): Response {
    return Response.json({
      status: "ok",
      service: "FactoryWager",
      version: "1.4.0-beta.20260201",
      bunVersion: process.versions.bun,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime.getTime(),
      mode: this.fwConfig.mode,
      logLevel: this.fwConfig.logLevel
    });
  }

  private getEnvStatus(): Response {
    return Response.json({
      factoryWager: {
        mode: this.fwConfig.mode,
        logLevel: this.fwConfig.logLevel,
        profile: this.fwConfig.profile,
        reportFormat: this.fwConfig.reportFormat,
        auditMode: this.fwConfig.auditMode,
        debug: this.fwConfig.debug,
        maxRows: this.fwConfig.maxRows,
        timeout: this.fwConfig.timeout,
        retryCount: this.fwConfig.retryCount,
        cacheSize: this.fwConfig.cacheSize
      },
      bun: {
        tlsRejectUnauthorized: this.bunConfig.tlsRejectUnauthorized,
        verboseFetch: this.bunConfig.verboseFetch,
        transpilerCachePath: this.bunConfig.transpilerCachePath,
        maxHttpRequests: this.bunConfig.maxHttpRequests,
        noClearTerminalOnReload: this.bunConfig.noClearTerminalOnReload,
        doNotTrack: this.bunConfig.doNotTrack,
        bunOptions: this.bunConfig.bunOptions,
        tmpdir: this.bunConfig.tmpdir,
        forceColor: this.bunConfig.forceColor,
        noColor: this.bunConfig.noColor
      },
      timestamp: new Date().toISOString()
    });
  }

  private getConfig(): Response {
    return Response.json({
      factoryWager: this.fwConfig,
      bun: this.bunConfig,
      security: this.getSecurityWarnings(),
      server: {
        startTime: this.startTime.toISOString(),
        uptime: Date.now() - this.startTime.getTime(),
        version: "1.4.0-beta.20260201"
      },
      timestamp: new Date().toISOString()
    });
  }

  private getSystemStatus(): Response {
    return Response.json(this.getSystemStatusData());
  }

  private getSystemStatusData() {
    return {
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        bunVersion: process.versions.bun,
        pid: process.pid,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        serverUptime: Date.now() - this.startTime.getTime()
      },
      factoryWager: this.fwConfig,
      bun: this.bunConfig,
      security: {
        warnings: this.getSecurityWarnings(),
        sslValidation: this.bunConfig.tlsRejectUnauthorized,
        telemetry: this.bunConfig.doNotTrack === false,
        debugMode: this.fwConfig.debug
      },
      timestamp: new Date().toISOString()
    };
  }

  private getMetrics(): Response {
    const memUsage = process.memoryUsage();
    const uptime = Date.now() - this.startTime.getTime();
    
    return Response.json({
      server: {
        uptime: uptime,
        uptimeHuman: this.formatUptime(uptime),
        startTime: this.startTime.toISOString()
      },
      memory: {
        rss: memUsage.rss,
        rssHuman: this.formatBytes(memUsage.rss),
        heapUsed: memUsage.heapUsed,
        heapUsedHuman: this.formatBytes(memUsage.heapUsed),
        heapTotal: memUsage.heapTotal,
        heapTotalHuman: this.formatBytes(memUsage.heapTotal),
        external: memUsage.external,
        externalHuman: this.formatBytes(memUsage.external)
      },
      process: {
        pid: process.pid,
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        bunVersion: process.versions.bun
      },
      config: {
        mode: this.fwConfig.mode,
        logLevel: this.fwConfig.logLevel,
        debug: this.fwConfig.debug,
        maxHttpRequests: this.bunConfig.maxHttpRequests
      },
      timestamp: new Date().toISOString()
    });
  }

  private getSecurityStatus(): Response {
    return Response.json({
      security: {
        warnings: this.getSecurityWarnings(),
        sslValidation: {
          enabled: this.bunConfig.tlsRejectUnauthorized,
          status: this.bunConfig.tlsRejectUnauthorized ? "secure" : "vulnerable",
          risk: this.bunConfig.tlsRejectUnauthorized ? "low" : "high"
        },
        telemetry: {
          enabled: this.bunConfig.doNotTrack === false,
          status: this.bunConfig.doNotTrack === false ? "enabled" : "disabled",
          privacy: this.bunConfig.doNotTrack ? "protected" : "sharing"
        },
        debug: {
          enabled: this.fwConfig.debug,
          status: this.fwConfig.debug ? "enabled" : "disabled",
          risk: this.fwConfig.debug && this.fwConfig.mode === "production" ? "high" : "low"
        },
        environment: {
          mode: this.fwConfig.mode,
          production: this.fwConfig.mode === "production",
          development: this.fwConfig.mode === "development",
          risk: this.fwConfig.mode === "production" ? "standard" : "low"
        }
      },
      recommendations: this.getSecurityRecommendations(),
      timestamp: new Date().toISOString()
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Security and Utility Methods
  // ═══════════════════════════════════════════════════════════════════════════════

  private getSecurityWarnings(): string[] {
    const warnings: string[] = [];
    
    if (!this.bunConfig.tlsRejectUnauthorized) {
      warnings.push("SSL certificate validation is DISABLED - SECURITY RISK");
    }
    
    if (this.bunConfig.doNotTrack === false && this.fwConfig.mode === "production") {
      warnings.push("Telemetry enabled in production environment");
    }
    
    if (this.fwConfig.debug && this.fwConfig.mode === "production") {
      warnings.push("Debug mode enabled in production environment");
    }
    
    if (this.fwConfig.mode === "development" && process.env.NODE_ENV === "production") {
      warnings.push("Development mode detected in production environment");
    }
    
    return warnings;
  }

  private getSecurityRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (!this.bunConfig.tlsRejectUnauthorized) {
      recommendations.push("Enable SSL certificate validation by setting NODE_TLS_REJECT_UNAUTHORIZED=1");
    }
    
    if (this.fwConfig.debug && this.fwConfig.mode === "production") {
      recommendations.push("Disable debug mode in production by setting FW_DEBUG=false");
    }
    
    if (this.bunConfig.doNotTrack === false && this.fwConfig.mode === "production") {
      recommendations.push("Consider disabling telemetry in production by setting DO_NOT_TRACK=1");
    }
    
    if (this.fwConfig.mode === "development") {
      recommendations.push("Use production mode for live deployments by setting FW_MODE=production");
    }
    
    return recommendations;
  }

  private displaySecurityWarnings(): void {
    const warnings = this.getSecurityWarnings();
    if (warnings.length > 0) {
      console.log("⚠️  Security Warnings:");
      warnings.forEach(warning => console.log(`   ${warning}`));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Utility Methods
  // ═══════════════════════════════════════════════════════════════════════════════

  private formatBytes(bytes: number): string {
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + " " + sizes[i];
  }

  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLI Interface
// ═══════════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const port = parseInt(args[0]) || 3000;
  
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
🏭 FactoryWager Server — Native Bun.serve with Typed Routes

Usage:
  bun run fw-server.ts [port] [options]

Options:
  --help, -h     Show this help message
  --debug        Enable debug logging
  --production   Force production mode

Examples:
  bun run fw-server.ts 3000           Start server on port 3000
  bun run fw-server.ts 8080 --debug   Start server on port 8080 with debug

API Endpoints:
  GET /health      Health check
  GET /env         Environment status
  GET /config      Full configuration
  GET /status      System status
  GET /metrics     Performance metrics
  GET /security    Security status

WebSocket:
  Connect to ws://localhost:{port}/ for real-time communication
  Message types: echo, config, status
`);
    process.exit(0);
  }

  // Set debug mode if requested
  if (args.includes("--debug")) {
    process.env.FW_DEBUG = "true";
  }

  // Force production mode if requested
  if (args.includes("--production")) {
    process.env.FW_MODE = "production";
  }

  try {
    const server = new FactoryWagerServer();
    await server.start(port);
  } catch (error) {
    console.error("❌ Failed to start FactoryWager server:", (error as Error).message);
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Type-Safe Execution
// ═══════════════════════════════════════════════════════════════════════════════

if (import.meta.main) {
  main().catch((error: Error) => {
    console.error(`❌ Fatal error: ${error.message}`);
    process.exit(1);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS (for library usage)
// ═══════════════════════════════════════════════════════════════════════════════

export { FactoryWagerServer };
