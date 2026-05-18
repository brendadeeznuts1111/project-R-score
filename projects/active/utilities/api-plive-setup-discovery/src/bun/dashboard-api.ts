import { Hono } from "hono";
import { EnhancedDashboard } from "./dashboard-enhanced";

const dashboardApp = new Hono();
const dashboard = new EnhancedDashboard();

// Middleware for dashboard authentication (simplified)
dashboardApp.use("*", async (c, next) => {
  // In production, implement proper authentication
  const authHeader = c.req.header("Authorization");
  if (!authHeader && c.req.path !== "/health") {
    return c.json({ error: "Authentication required" }, 401);
  }
  await next();
});

// Get dashboard configuration
dashboardApp.get("/config", async (c) => {
  const format = c.req.query('format') || 'json';

  try {
    const config = dashboard.exportConfig(format as any);

    return new Response(config, {
      headers: {
        'Content-Type': format === 'json' ? 'application/json' :
                       format === 'yaml' ? 'application/yaml' :
                       'text/csv',
        'Content-Disposition': `attachment; filename="dashboard-config.${format}"`
      }
    });
  } catch (error) {
    return c.json({ error: "Failed to export configuration" }, 500);
  }
});

// Get real-time dashboard data
dashboardApp.get("/data/:type", async (c) => {
  const dashboardType = c.req.param('type');
  const realtime = c.req.query('realtime') === 'true';

  try {
    const data = await dashboard.getDashboardData(dashboardType);

    if (realtime) {
      // Set up Server-Sent Events for real-time updates
      const stream = new ReadableStream({
        start(controller) {
          const sendUpdate = async () => {
            try {
              const updatedData = await dashboard.getDashboardData(dashboardType);
              controller.enqueue(`data: ${JSON.stringify(updatedData)}\n\n`);
            } catch (error) {
              console.error("SSE update error:", error);
            }
          };

          // Send initial data
          controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);

          // Set up interval for updates
          const interval = setInterval(sendUpdate, 2000); // Update every 2 seconds

          // Clean up on client disconnect
          c.req.signal.addEventListener('abort', () => {
            clearInterval(interval);
            controller.close();
          });
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Cache-Control'
        }
      });
    }

    return c.json(data);
  } catch (error) {
    console.error("Dashboard data retrieval failed:", error);
    return c.json({ error: "Failed to retrieve dashboard data" }, 500);
  }
});

// Get dashboard statistics endpoint
dashboardApp.get("/stats/:metric", async (c) => {
  const metric = c.req.param('metric');

  try {
    const data = await dashboard.getDashboardData("overview");

    switch (metric) {
      case 'workflows':
        return c.json({
          success: true,
          data: {
            activeWorkflows: data.widgets?.find((w: any) => w.title === "Active Workflows")?.value || 0,
            totalWorkflows: 0, // Would need to implement
            completedWorkflows: 0
          }
        });
      case 'performance':
        return c.json({
          success: true,
          data: data.performance || {}
        });
      case 'betting':
        const bettingData = await dashboard.getDashboardData("betting");
        return c.json({
          success: true,
          data: bettingData.analytics || []
        });
      case 'infrastructure':
        const infraData = await dashboard.getDashboardData("infrastructure");
        return c.json({
          success: true,
          data: infraData.monitors || []
        });
      default:
        return c.json({
          error: "Invalid metric type. Use: workflows, performance, betting, infrastructure"
        }, 400);
    }
  } catch (error) {
    console.error("Dashboard stats retrieval failed:", error);
    return c.json({ error: "Failed to retrieve dashboard stats" }, 500);
  }
});

// Update dashboard layout
dashboardApp.put("/layout", async (c) => {
  try {
    const body = await c.req.json();
    // In a full implementation, this would update the dashboard layout
    // For now, just return success
    return c.json({
      success: true,
      message: "Dashboard layout updated",
      layout: body
    });
  } catch (error) {
    return c.json({ error: "Failed to update layout" }, 500);
  }
});

// Get dashboard metrics in Prometheus format
dashboardApp.get("/metrics", async (c) => {
  try {
    const metrics = await dashboard.getPrometheusMetrics();

    return new Response(metrics, {
      headers: { 'Content-Type': 'text/plain' }
    });
  } catch (error) {
    console.error("Metrics retrieval failed:", error);
    return new Response('# Error generating metrics\n', {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
});

// Export dashboard data
dashboardApp.post("/export", async (c) => {
  try {
    const { format = 'json', dateRange, panels, dashboardType = 'overview' } = await c.req.json();

    const data = await dashboard.getDashboardData(dashboardType);

    let exportData: string;
    const timestamp = new Date().toISOString().split('T')[0];

    switch (format) {
      case 'json':
        exportData = JSON.stringify(data, null, 2);
        break;
      case 'csv':
        exportData = dashboard.exportConfig('csv');
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    return new Response(exportData, {
      headers: {
        'Content-Type': format === 'json' ? 'application/json' : 'text/csv',
        'Content-Disposition': `attachment; filename="dashboard-${dashboardType}-${timestamp}.${format}"`
      }
    });
  } catch (error) {
    console.error("Dashboard export failed:", error);
    return c.json({ error: "Failed to export dashboard data" }, 500);
  }
});

// WebSocket endpoint for real-time dashboard updates
dashboardApp.get("/ws", async (c) => {
  const upgradeHeader = c.req.header("upgrade");

  if (upgradeHeader !== "websocket") {
    return c.json({ error: "Expected websocket upgrade" }, 426);
  }

  // In Bun, WebSocket handling is done at the server level
  // This endpoint serves as documentation for the WebSocket URL
  return c.json({
    message: "WebSocket endpoint available",
    url: `ws://localhost:3000/dashboard/ws`,
    protocols: ["dashboard-v1"],
    features: [
      "real-time-updates",
      "alerts",
      "performance-metrics",
      "workflow-notifications"
    ]
  });
});

// Health check for dashboard
dashboardApp.get("/health", async (c) => {
  try {
    // Quick health check
    const data = await dashboard.getDashboardData("overview");

    return c.json({
      status: "healthy",
      timestamp: Date.now(),
      dashboard: {
        version: "1.3.0",
        environment: Bun.env.NODE_ENV,
        lastUpdate: data.timestamp
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        bunVersion: Bun.version
      }
    });
  } catch (error) {
    return c.json({
      status: "unhealthy",
      timestamp: Date.now(),
      error: error.message
    }, 503);
  }
});

// Dashboard alerts endpoint
dashboardApp.get("/alerts", async (c) => {
  try {
    // In a full implementation, this would return active alerts
    // For now, return mock data
    const alerts = [
      {
        id: "alert_1",
        name: "High Response Time",
        severity: "warning",
        message: "95th percentile response time exceeds 500ms",
        timestamp: Date.now(),
        active: false
      }
    ];

    return c.json({
      success: true,
      alerts,
      timestamp: Date.now()
    });
  } catch (error) {
    return c.json({ error: "Failed to retrieve alerts" }, 500);
  }
});

// Dashboard themes endpoint
dashboardApp.get("/themes", async (c) => {
  try {
    // Return available dashboard themes
    const themes = [
      {
        name: "dark",
        primary: "#1890ff",
        background: "#141414",
        surface: "#1f1f1f",
        text: "#ffffff"
      },
      {
        name: "light",
        primary: "#1890ff",
        background: "#ffffff",
        surface: "#fafafa",
        text: "#000000"
      },
      {
        name: "betting",
        primary: "#52c41a",
        background: "#001529",
        surface: "#002140",
        text: "#ffffff"
      }
    ];

    return c.json({
      success: true,
      themes,
      current: c.req.query('current') || 'dark'
    });
  } catch (error) {
    return c.json({ error: "Failed to retrieve themes" }, 500);
  }
});

// Dashboard layouts endpoint
dashboardApp.get("/layouts", async (c) => {
  try {
    const layouts = [
      {
        name: "default",
        columns: 12,
        rowHeight: 60,
        description: "Standard 12-column layout"
      },
      {
        name: "compact",
        columns: 16,
        rowHeight: 40,
        description: "Compact 16-column layout"
      },
      {
        name: "mobile",
        columns: 4,
        rowHeight: 80,
        description: "Mobile-optimized layout"
      }
    ];

    return c.json({
      success: true,
      layouts,
      current: c.req.query('current') || 'default'
    });
  } catch (error) {
    return c.json({ error: "Failed to retrieve layouts" }, 500);
  }
});

// CORS headers for dashboard API
dashboardApp.use("*", async (c, next) => {
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");

  if (c.req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  await next();
});

// Error handling for dashboard API
dashboardApp.onError((err, c) => {
  console.error("Dashboard API error:", err);

  return c.json({
    success: false,
    error: "Dashboard API error",
    message: err.message,
    timestamp: Date.now(),
    path: c.req.path,
    method: c.req.method
  }, 500);
});

// 404 handler for dashboard API
dashboardApp.notFound((c) => {
  return c.json({
    success: false,
    error: "Dashboard endpoint not found",
    available_endpoints: [
      "GET /config",
      "GET /data/:type",
      "GET /stats/:metric",
      "PUT /layout",
      "GET /metrics",
      "POST /export",
      "GET /ws",
      "GET /health",
      "GET /alerts",
      "GET /themes",
      "GET /layouts"
    ],
    timestamp: Date.now()
  }, 404);
});

export default dashboardApp;