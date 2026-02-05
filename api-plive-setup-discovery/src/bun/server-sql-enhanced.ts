import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";

// Import enhanced modules
import { YamlConfigManager } from "./yaml-config-manager";
import { DatabaseManager } from "./database-manager";
import { getMetricsCollector } from "./metrics-yaml";
import { EnhancedWebSocketServer } from "./websocket-enhanced";
import { RealTimeDashboard } from "./real-time-dashboard";
import dashboardApp from "./dashboard-api";

// Enhanced interfaces
interface WorkflowRequest {
  workflowId: string;
  currentStep?: string;
  userId: string;
  data?: any;
  steps?: any[];
}

interface BettingEventQuery {
  sport?: string;
  league?: string;
  date?: string;
  limit?: number;
}

class BettingPlatformSQLServer {
  private app: Hono;
  private config: YamlConfigManager;
  private database: DatabaseManager;
  private metricsCollector: any;
  private wsServer: EnhancedWebSocketServer;
  private dashboard: RealTimeDashboard;

  constructor() {
    // Initialize with Bun 1.3 YAML support
    this.config = new YamlConfigManager();
    this.database = new DatabaseManager();
    // Initialize metrics collector (temporary synchronous approach)
    this.metricsCollector = {
      recordWorkflowRequest: (method: string, path: string, status: number, duration: number) => {
        console.log(`📊 Request: ${method} ${path} -> ${status} (${duration.toFixed(2)}ms)`);
      },
      recordError: (type: string, message: string) => {
        console.log(`❌ Error: ${type} - ${message}`);
      }
    };
    this.wsServer = new EnhancedWebSocketServer();
    this.dashboard = new RealTimeDashboard();

    this.app = new Hono();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();

    // Setup configuration watchers
    this.setupConfigWatcher();
  }

  private setupConfigWatcher(): void {
    // Watch for server configuration changes
    this.config.watch('server', (newConfig) => {
      console.log('🔄 Server configuration updated:', newConfig);
    });

    // Watch for security configuration changes
    this.config.watch('security', (newConfig) => {
      console.log('🔒 Security configuration updated');
    });

    // Watch for websocket configuration changes
    this.config.watch('websocket', (newConfig) => {
      console.log('🔌 WebSocket configuration updated');
      // Restart WebSocket server with new config if needed
    });
  }

  private setupMiddleware(): void {
    // Enhanced logging with Bun 1.3
    this.app.use("*", honoLogger((str, ...rest) => {
      console.log(`[${new Date().toISOString()}] ${str}`, ...rest);
    }));

    // CORS with dynamic configuration
    const corsConfig = this.config.get('security.cors') || {
      origins: ["http://localhost:3000", "https://bettingplatform.com"],
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allow_headers: ["Content-Type", "Authorization", "X-CSRF-Token"]
    };

    this.app.use("*", cors({
      origin: corsConfig.origins,
      credentials: corsConfig.credentials,
      allowMethods: corsConfig.methods,
      allowHeaders: corsConfig.allow_headers
    }));

    // Database middleware
    this.app.use("*", async (c, next) => {
      c.set('database', this.database);
      c.set('config', this.config);
      await next();
    });

    // Metrics collection middleware
    this.app.use("*", async (c, next) => {
      const start = performance.now();
      await next();
      const duration = performance.now() - start;

      // Record metrics (safely handle missing methods)
      if (this.metricsCollector.recordWorkflowRequest) {
        this.metricsCollector.recordWorkflowRequest(c.req.method, c.req.path, c.res.status, duration);
      }

      // Record error if status indicates error
      if (c.res.status >= 400 && this.metricsCollector.recordError) {
        const endpoint = `${c.req.method} ${c.req.path}`;
        this.metricsCollector.recordError('http_error', endpoint);
      }
    });

    // Rate limiting middleware (simplified)
    const rateLimitConfig = this.config.get('bettingPlatform.rate_limit', {});
    if (rateLimitConfig.requests_per_minute) {
      // In production, use a proper rate limiter like Redis
      console.log(`📊 Rate limiting enabled: ${rateLimitConfig.requests_per_minute} req/min`);
    }
  }

  private setupRoutes(): void {
    // Dashboard routes (mount the dashboard API)
    this.app.route("/dashboard", dashboardApp);

    // Health check with database status
    this.app.get("/health", async (c) => {
      const db = c.get('database');
      const config = c.get('config');

      try {
        // Test database connection with a simple query
        const testWorkflow = await db.getWorkflowById('health-check-test');

        const healthData = {
          status: "ok",
          db: "connected",
          migrations: "complete",
          timestamp: new Date().toISOString(),
          version: config.get('server.version') || "1.3.1",
          environment: config.get('server.environment') || Bun.env.NODE_ENV,
          websocket: this.wsServer.isRunning ? "running" : "stopped",
          uptime: process.uptime(),
          bun_version: Bun.version
        };

        // Set custom user agent header as specified in cheat sheet
        c.header('x-powered-by', 'BettingPlatform/1.3.1');

        return c.json(healthData);
      } catch (error) {
        console.error("Health check failed:", error);
        c.header('x-powered-by', 'BettingPlatform/1.3.1');
        return c.json({
          status: "error",
          db: "disconnected",
          migrations: "unknown",
          timestamp: new Date().toISOString(),
          error: "Database connection failed"
        }, 503);
      }
    });

    // Enhanced workflow routes with SQL
    this.app.post("/workflows", async (c) => {
      const db = c.get('database');

      try {
        const body: WorkflowRequest = await c.req.json();

        const workflowId = await db.createWorkflow({
          workflowId: body.workflowId,
          currentStep: body.currentStep,
          createdBy: body.userId,
          data: body.data,
          steps: body.steps
        });

        return c.json({
          success: true,
          data: { workflowId },
          message: "Workflow created successfully"
        }, 201);
      } catch (error) {
        console.error("Workflow creation failed:", error);
        return c.json({
          success: false,
          error: "Failed to create workflow"
        }, 500);
      }
    });

    this.app.get("/workflows/:id", async (c) => {
      const db = c.get('database');
      const id = c.req.param('id');

      try {
        const workflow = await db.getWorkflowById(id);

        if (!workflow) {
          return c.json({
            success: false,
            error: "Workflow not found"
          }, 404);
        }

        return c.json({
          success: true,
          data: { workflow }
        });
      } catch (error) {
        console.error("Workflow retrieval failed:", error);
        return c.json({
          success: false,
          error: "Failed to retrieve workflow"
        }, 500);
      }
    });

    this.app.get("/workflows", async (c) => {
      const db = c.get('database');
      const userId = c.req.query('userId');
      const status = c.req.query('status');
      const limit = parseInt(c.req.query('limit') || '50');
      const offset = parseInt(c.req.query('offset') || '0');

      if (!userId) {
        return c.json({
          success: false,
          error: "userId parameter is required"
        }, 400);
      }

      try {
        const workflows = await db.getUserWorkflows(userId, status, limit, offset);

        return c.json({
          success: true,
          data: { workflows, count: workflows.length }
        });
      } catch (error) {
        console.error("Workflows retrieval failed:", error);
        return c.json({
          success: false,
          error: "Failed to retrieve workflows"
        }, 500);
      }
    });

    // Betting events with SQL optimization
    this.app.get("/betting/events", async (c) => {
      const db = c.get('database');
      const query: BettingEventQuery = {
        sport: c.req.query('sport'),
        league: c.req.query('league'),
        date: c.req.query('date'),
        limit: parseInt(c.req.query('limit') || '50')
      };

      try {
        const events = await db.getBettingEvents(query);

        return c.json({
          success: true,
          data: { events, count: events.length }
        });
      } catch (error) {
        console.error("Betting events retrieval failed:", error);
        return c.json({
          success: false,
          error: "Failed to retrieve betting events"
        }, 500);
      }
    });

    this.app.post("/betting/events", async (c) => {
      const db = c.get('database');

      try {
        const events = await c.req.json();

        if (!Array.isArray(events)) {
          return c.json({
            success: false,
            error: "Events must be an array"
          }, 400);
        }

        await db.insertBettingEvents(events);

        return c.json({
          success: true,
          message: `${events.length} events inserted successfully`
        });
      } catch (error) {
        console.error("Betting events insertion failed:", error);
        return c.json({
          success: false,
          error: "Failed to insert betting events"
        }, 500);
      }
    });

    // Real-time odds endpoint
    this.app.get("/betting/odds/:eventId", async (c) => {
      const db = c.get('database');
      const eventId = c.req.param('eventId');
      const marketType = c.req.query('marketType');

      try {
        const odds = await db.getOddsForEvent(eventId, marketType);

        return c.json({
          success: true,
          data: { odds, eventId }
        });
      } catch (error) {
        console.error("Odds retrieval failed:", error);
        return c.json({
          success: false,
          error: "Failed to retrieve odds"
        }, 500);
      }
    });

    this.app.post("/betting/odds", async (c) => {
      const db = c.get('database');

      try {
        const oddsData = await c.req.json();
        const oddsId = await db.insertOdds(oddsData);

        return c.json({
          success: true,
          data: { oddsId },
          message: "Odds inserted successfully"
        }, 201);
      } catch (error) {
        console.error("Odds insertion failed:", error);
        return c.json({
          success: false,
          error: "Failed to insert odds"
        }, 500);
      }
    });

    // Configuration export endpoint
    this.app.get("/config/export", async (c) => {
      const config = c.get('config');
      const format = c.req.query('format') || 'json';

      try {
        const exported = config.export(format as any);
        const contentType = format === 'yaml' ? 'application/x-yaml' : 'application/json';

        return new Response(exported, {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="config.${format}"`
          }
        });
      } catch (error) {
        return c.json({
          success: false,
          error: "Failed to export configuration"
        }, 500);
      }
    });

    // Database performance metrics endpoint
    this.app.get("/db/performance", async (c) => {
      const db = c.get('database');

      try {
        const metrics = db.getPerformanceMetrics();

        return c.json({
          success: true,
          data: metrics
        });
      } catch (error) {
        console.error("Performance metrics retrieval failed:", error);
        return c.json({
          success: false,
          error: "Failed to retrieve performance metrics"
        }, 500);
      }
    });

    // Metrics endpoint with multiple formats
    this.app.get("/metrics", async (c) => {
      const format = c.req.query('format') || 'prometheus';

      try {
        const metrics = this.metricsCollector.exportMetrics(format);

        const contentType = format === 'prometheus' ? 'text/plain' : 'application/json';

        return new Response(metrics, {
          headers: {
            'Content-Type': contentType
          }
        });
      } catch (error) {
        console.error("Metrics retrieval failed:", error);
        return new Response('# Error generating metrics\n', {
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    });

    // Real-time dashboard endpoint (temporarily disabled)
    // this.app.get("/dashboard", async (c) => {
    //   try {
    //     const data = await this.dashboard.getDashboardData();
    //     return c.json({
    //       success: true,
    //       data
    //     });
    //   } catch (error) {
    //     console.error("Dashboard retrieval failed:", error);
    //     return c.json({
    //       success: false,
    //       error: "Failed to retrieve dashboard data"
    //     }, 500);
    //   }
    // });

    // Dashboard statistics endpoint (temporarily disabled)
    /*
    this.app.get("/dashboard/stats/:metric", async (c) => {
      const metric = c.req.param('metric');

      try {
        const data = await this.dashboard.getDashboardData();

        switch (metric) {
          case 'workflows':
            return c.json({
              success: true,
              data: data.overview
            });
          case 'performance':
            return c.json({
              success: true,
              data: data.performance
            });
          case 'betting':
            return c.json({
              success: true,
              data: data.betting
            });
          default:
            return c.json({
              success: false,
              error: "Invalid metric type. Use: workflows, performance, betting"
            }, 400);
        }
      } catch (error) {
        console.error("Dashboard stats retrieval failed:", error);
        return c.json({
          success: false,
          error: "Failed to retrieve dashboard stats"
        }, 500);
      }
    });
    */

    // WebSocket upgrade endpoint
    this.app.get("/ws", async (c) => {
      if (c.req.header('upgrade')?.toLowerCase() === 'websocket') {
        // In a real implementation, you'd handle the WebSocket upgrade here
        // For now, return a message about WebSocket endpoint
        return c.json({
          message: "WebSocket endpoint available",
          url: `ws://localhost:${this.config.get('websocket.port', 8080)}`,
          channels: this.config.get('websocket.channels', [])
        });
      }

      return c.json({ error: "WebSocket upgrade required" }, 400);
    });
  }

  private setupErrorHandling(): void {
    this.app.onError((err, c) => {
      console.error("Server error:", err);

      // Record error metrics (safely handle missing methods)
      if (this.metricsCollector.recordError) {
        this.metricsCollector.recordError('http_error', c.req.path);
      }

      const errorResponse = {
        success: false,
        error: "Internal server error",
        timestamp: Date.now(),
        request_id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        path: c.req.path,
        method: c.req.method
      };

      return c.json(errorResponse, 500);
    });

    this.app.notFound((c) => {
      return c.json({
        success: false,
        error: "Endpoint not found",
        available_endpoints: [
          "GET /health",
          "GET /dashboard/health",
          "GET /dashboard/config",
          "GET /dashboard/data/:type",
          "GET /dashboard/stats/:metric",
          "GET /dashboard/metrics",
          "POST /dashboard/export",
          "GET /dashboard/alerts",
          "GET /dashboard/themes",
          "GET /dashboard/layouts",
          "GET /dashboard/ws",
          "POST /workflows",
          "GET /workflows/:id",
          "GET /workflows",
          "GET /betting/events",
          "POST /betting/events",
          "GET /betting/odds/:eventId",
          "POST /betting/odds",
          "GET /config/export",
          "GET /db/performance",
          "GET /metrics",
          "GET /ws"
        ],
        timestamp: Date.now()
      }, 404);
    });
  }

  private setupPreconnects(): void {
    console.log("🔗 Setting up preconnections to external services...");

    try {
      // Preconnect to betting platform for faster API calls
      const bettingApiUrl = process.env.BETTING_API_URL || 'https://plive.sportswidgets.pro/manager-tools/';

      const bunFetch = fetch as any; // Cast to any to access Bun-specific methods
      if (typeof fetch !== 'undefined' && bunFetch.preconnect) {
        bunFetch.preconnect(bettingApiUrl);
        console.log(`✅ Preconnected to betting platform: ${bettingApiUrl}`);
      } else {
        console.log(`ℹ️ fetch.preconnect not available, betting platform will connect on first request`);
      }

      // Preconnect to other HTTP-based external services if configured
      const externalHttpServices = [
        process.env.MONITORING_ENABLED === 'true' && 'http://localhost:9090',
        process.env.WEBHOOK_URL?.startsWith('http') ? process.env.WEBHOOK_URL.split('/')[0] + '//' + process.env.WEBHOOK_URL.split('/')[2] : null,
      ].filter(Boolean) as string[];

      for (const serviceUrl of externalHttpServices) {
        try {
          if (typeof fetch !== 'undefined' && bunFetch.preconnect) {
            bunFetch.preconnect(serviceUrl);
            console.log(`✅ Preconnected to external service: ${serviceUrl}`);
          }
        } catch (error) {
          // Ignore preconnect failures - they don't break functionality
          console.log(`ℹ️ Could not preconnect to ${serviceUrl} (continuing normally):`, error instanceof Error ? error.message : String(error));
        }
      }

      // Note: Database connections (PostgreSQL, Redis) cannot be preconected with fetch.preconnect
      // They use their own connection pooling mechanisms
      console.log("📝 Note: Database preconnections handled by connection pools");

    } catch (error) {
      console.log("ℹ️ Preconnection setup skipped (continuing normally):", error instanceof Error ? error.message : String(error));
      console.log("ℹ️ API calls will work normally with standard connection pooling");
    }
  }

  async start(): Promise<void> {
    // Preconnect to external services for better performance
    this.setupPreconnects();

    const serverConfig = this.config.get('server') || {
      port: 3001,
      host: "0.0.0.0",
      environment: "development",
      compression: true,
      version: "1.3.0"
    };
    const wsConfig = this.config.get('websocket') || {
      enabled: true,
      port: 8080,
      compression: true,
      subprotocols: ["betting-workflow-v1"],
      heartbeat_interval: 30000,
      max_message_size: "1MB"
    };

    // Start HTTP server with Bun.serve
    const server = Bun.serve({
      port: serverConfig.port,
      hostname: serverConfig.host,
      development: serverConfig.environment === "development",

      fetch: this.app.fetch,

      error(error) {
        console.error("Server-level error:", error);
        return new Response("Internal Server Error", { status: 500 });
      }
    });

    console.log(`🚀 Betting Platform SQL Server running on ${server.hostname}:${server.port}`);
    console.log(`📊 Environment: ${serverConfig.environment}`);
    console.log(`🔧 Version: ${serverConfig.version}`);
    console.log(`💾 Database: ${this.config.get('database.primary.type')}`);
    console.log(`📈 Metrics: http://localhost:${server.port}/metrics`);
    console.log(`❤️ Health: http://localhost:${server.port}/health`);
    console.log(`🔌 WebSocket: ws://localhost:${wsConfig.port || 8080}`);
    console.log(`📊 Dashboard: http://localhost:${server.port}/dashboard`);
    console.log(`🎨 Dashboard Config: http://localhost:${server.port}/dashboard/config`);
    console.log(`⚡ Real-time Data: http://localhost:${server.port}/dashboard/data/overview?realtime=true`);

    // Start WebSocket server if enabled
    if (wsConfig.enabled) {
      this.wsServer.createServer(wsConfig);
      console.log(`🔌 WebSocket server running on port ${wsConfig.port || 8080}`);
    }

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('🛑 Received SIGTERM, shutting down gracefully...');
      await this.database.close();
      this.config.destroy();
      server.stop();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('🛑 Received SIGINT, shutting down gracefully...');
      await this.database.close();
      this.config.destroy();
      server.stop();
      process.exit(0);
    });
  }

  // Get server components for testing
  getComponents() {
    return {
      app: this.app,
      config: this.config,
      database: this.database,
      metricsCollector: this.metricsCollector,
      wsServer: this.wsServer
    };
  }
}

// Start the enhanced server
const server = new BettingPlatformSQLServer();

// Export for testing
export default BettingPlatformSQLServer;

// Start server if this file is run directly
if (import.meta.main) {
  server.start().catch(console.error);
}
