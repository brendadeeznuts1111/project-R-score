#!/usr/bin/env bun
// apps/dashboard/DashboardServer.ts
// Omega Phase 3.25 - Matrix-Native Dashboard with SSE Telemetry

import { securityHeaders } from "./security.ts";
import { logOmega, logInfo, logWarn, logCrit, getMatrixTelemetry } from "../../core/shared/logger.ts";
import { parseRangersLog } from "../../cli/test.ts";
import { resolveOmegaTool, validateRequiredTools } from "../../utils/omega-tool-resolver.ts";

// Type definitions for globalThis extension
declare global {
  var omegaBroadcast: ((data: any) => void) | undefined;
}

const PORT = 3456;
const clients = new Set<{ enqueue: (data: string) => void }>();
let activeConnections = 0;
let totalRequests = 0;

// Global broadcast function for logger
globalThis.omegaBroadcast = (data: any) => {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  clients.forEach(client => {
    try {
      client.enqueue(message);
    } catch (e) {
      // Client disconnected, will be cleaned up
    }
  });
};

// Update connection count
const updateConnections = (delta: number) => {
  activeConnections += delta;
  totalRequests++;
};

// Get tension anomalies (simulated for now)
const getTensionAnomalies = async () => {
  const telemetry = getMatrixTelemetry();
  if (!telemetry) return [];

  const anomalies = [];

  const heapUsage = telemetry.heap_usage_mb;
  const eventLoopLag = telemetry.event_loop_lag_ns;

  if (heapUsage && heapUsage > 100) {
    anomalies.push({ type: 'memory', severity: 'high', value: heapUsage });
  }
  if (eventLoopLag && eventLoopLag > 50000) {
    anomalies.push({ type: 'lag', severity: 'medium', value: eventLoopLag });
  }

  return anomalies;
};

// Process Rangers log with Omega logging
const processLogLine = async (line: string): Promise<void> => {
  const startTime = Bun.nanoseconds();

  try {
    const result = parseRangersLog(line);
    const processingTime = Bun.nanoseconds() - startTime;

    if (result) {
      await logInfo('Rangers log processed', {
        type: (result as any).type || 'unknown',
        hasData: !!(result as any).data,
        processingTime,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    await logWarn('Failed to process log', {
      error: error instanceof Error ? error.message : String(error),
      line_preview: line.substring(0, 100)
    });
  }
};

// Main server with SSE telemetry
const server = Bun.serve({
  port: PORT,
  development: false, // Production mode for optimal performance

  async fetch(req, server) {
    const url = new URL(req.url);
    updateConnections(1);

    try {
      // SSE telemetry endpoint
      if (url.pathname === "/telemetry") {
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();

        // Create a proper controller interface
        const controller = {
          enqueue: (data: string) => writer.write(data)
        };

        clients.add(controller);

        // Send initial connection message
        const initialTelemetry = {
          ...getMatrixTelemetry(),
          active_connections: activeConnections,
          total_requests: totalRequests,
          timestamp: new Date().toISOString()
        };

        controller.enqueue(`data: ${JSON.stringify({ type: 'telemetry', data: initialTelemetry })}\n\n`);

        // Telemetry broadcast interval
        const timer = setInterval(async () => {
          const currentNanos = Bun.nanoseconds();
          const eventLoopLag = currentNanos - lastNanos;
          lastNanos = currentNanos;

          const stats = {
            ...getMatrixTelemetry(),
            active_connections: activeConnections,
            total_requests: totalRequests,
            event_loop_lag_ns: eventLoopLag,
            uptime_ns: currentNanos,
            timestamp: new Date().toISOString()
          };

          controller.enqueue(`data: ${JSON.stringify({ type: 'telemetry', data: stats })}\n\n`);
        }, 1000);

        // Cleanup on disconnect
        req.signal.addEventListener("abort", () => {
          clearInterval(timer);
          clients.delete(controller);
          updateConnections(-1);
          logInfo('Telemetry client disconnected');
          writer.close();
        });

        return new Response(readable, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            ...securityHeaders
          }
        });
      }

      // API endpoint for log submission
      if (url.pathname === "/api/logs" && req.method === "POST") {
        const body = await req.text();
        const lines = body.split('\n').filter(line => line.trim());

        logInfo('Received logs via API', { count: lines.length });

        // Process each line
        for (const line of lines) {
          processLogLine(line);
        }

        return Response.json({
          success: true,
          linesProcessed: lines.length,
          matrix_telemetry: getMatrixTelemetry()
        }, { headers: securityHeaders });
      }

      // Matrix endpoints (columns 76-80)
      if (url.pathname === "/api/matrix/telemetry") {
        const telemetry = getMatrixTelemetry();
        return Response.json({
          bun_info: {
            version: Bun.version,
            revision: Bun.revision,
            main: Bun.main
          },
          columns: {
            76: { name: "heap_usage_mb", value: telemetry?.heap_usage_mb || 0, unit: "MB" },
            77: { name: "event_loop_lag_ns", value: telemetry?.event_loop_lag_ns || 0, unit: "ns" },
            78: { name: "active_connections", value: activeConnections, unit: "count" },
            79: { name: "jit_optimized_count", value: telemetry?.jit_optimized_count || 0, unit: "count" },
            80: { name: "zstd_compression_ratio", value: telemetry?.zstd_compression_ratio || 0, unit: "ratio" }
          },
          timestamp: new Date().toISOString()
        }, { headers: securityHeaders });
      }

      // System info endpoint
      if (url.pathname === "/api/system" && req.method === "GET") {
        // Demonstrate cwd usage for security context
        const secureContext = Bun.which("ls", {
          cwd: "/tmp",
          PATH: "/bin:/usr/bin"
        });

        const systemInfo = {
          bun: {
            version: Bun.version,
            revision: Bun.revision,
            path: await resolveOmegaTool('bun'),
            main: Bun.main
          },
          tools: {
            git: await resolveOmegaTool('git'),
            node: await resolveOmegaTool('node'),
            npm: await resolveOmegaTool('npm'),
            curl: await resolveOmegaTool('curl')
          },
          security: {
            restricted_ls: secureContext,
            cwd_demo: "ls from /tmp with restricted PATH"
          },
          environment: {
            node_env: Bun.env.NODE_ENV,
            path_entries: (Bun.env.PATH || '').split(':').length,
            user: Bun.env.USER
          },
          platform: {
            arch: process.arch,
            platform: process.platform,
            pid: process.pid
          }
        };

        return Response.json(systemInfo, { headers: securityHeaders });
      }

      // Stress test endpoint for tension monitoring
      if (url.pathname === "/api/stress-test" && req.method === "POST") {
        logWarn('Stress test initiated', { duration: url.searchParams.get('duration') || '10s' });

        // Simulate CPU stress with precise timing
        const start = Bun.nanoseconds();
        const duration = parseInt(url.searchParams.get('duration') || '10000');
        const endTime = start + (duration * 1000000); // Convert to nanoseconds

        // Use Bun.sleep for precise timing control
        while (Bun.nanoseconds() < endTime) {
          // Create event loop lag with micro-sleeps
          await Bun.sleep(0);
          // Add some CPU work
          Math.random() * Math.random();
        }

        const telemetry = getMatrixTelemetry();
        logCrit('Stress test completed', {
          duration_ms: duration,
          final_heap_mb: telemetry?.heap_usage_mb || 0,
          max_lag_ns: telemetry?.event_loop_lag_ns || 0
        });

        return Response.json({
          success: true,
          telemetry: telemetry || {},
          anomalies: await getTensionAnomalies()
        }, { headers: securityHeaders });
      }

      // Serve dashboard HTML
      if (url.pathname === "/" || url.pathname === "/index.html") {
        return new Response(Bun.file("./public/index.html"), {
          headers: {
            "Content-Type": "text/html",
            ...securityHeaders
          }
        });
      }

      // 404 for other routes
      return new Response("Not Found", {
        status: 404,
        headers: securityHeaders
      });

    } catch (error) {
      logCrit('Request handling error', {
        path: url.pathname,
        error: error instanceof Error ? error.message : String(error)
      });

      return new Response("Internal Server Error", {
        status: 500,
        headers: securityHeaders
      });
    } finally {
      updateConnections(-1);
    }
  },

  // WebSocket fallback for older browsers
  websocket: {
    open(ws) {
      updateConnections(1);
      logInfo('WebSocket client connected');
    },
    message(ws, message) {
      // Handle WebSocket messages if needed
    },
    close(ws) {
      updateConnections(-1);
      logInfo('WebSocket client disconnected');
    }
  }
});

// Initialize server
// Only run server if this is the main entry point
if (import.meta.path === Bun.main) {
  // Validate required tools using Omega resolver
  const requiredTools = ['bun', 'git'];
  const validation = await validateRequiredTools(requiredTools);

  if (!validation.valid) {
    console.error(`❌ Missing required tools: ${validation.missing.join(', ')}`);
    console.error('Please install missing tools');
    process.exit(1);
  }

  // Log tool locations using Omega resolver
  console.log('🔧 Tool Resolution (Omega Strategy):');
  Object.entries(validation.found).forEach(([tool, path]) => {
    console.log(`  ${tool}: ${path}`);
  });

  // Set Omega PATH for all subprocess calls
  const omegaPathOrder = [
    "/Users/nolarose/.bun/bin",  // Local Bun 1.3.7
    "/opt/homebrew/bin",         // Homebrew tools
    "/usr/local/bin",            // Local binaries
    "/usr/bin",                  // System binaries
    "/bin",                      // Core binaries
    "/usr/sbin",                 // System admin
    "/sbin"                      // Core admin
  ];

  Bun.env.PATH = omegaPathOrder.join(':');

  // Add a small synchronous delay to ensure all initialization is complete
  console.log("🔄 Initializing server with Omega tool resolver...");
  Bun.sleepSync(100); // Brief pause for clean startup

  await logInfo('Omega Dashboard Server Started', {
    port: PORT,
    protocol: 'v3.25',
    git_sha: Bun.env.GIT_SHA || 'dev',
    path: Bun.env.PATH,
    path_strategy: 'omega_phase_3.25_enhanced',
    tool_resolver: 'omega_tool_resolver_v1',
    bun_version: Bun.version,
    bun_revision: Bun.revision,
    main: Bun.main
  });

  console.log(`🏟️ Omega Dashboard: http://localhost:${server.port}`);
  console.log(`📊 Telemetry SSE: http://localhost:${server.port}/telemetry`);
  console.log(`🔗 Matrix API: http://localhost:${server.port}/api/matrix/telemetry`);
  console.log(`🔧 System Info: http://localhost:${server.port}/api/system`);
  console.log(`💪 Stress Test: curl -X POST http://localhost:${server.port}/api/stress-test?duration=5000`);

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log("\n🛑 Shutting down gracefully...");
    Bun.sleepSync(100); // Brief pause for cleanup
    await logCrit('Server shutting down', {
      final_connections: activeConnections,
      total_requests: totalRequests
    });
    process.exit(0);
  });
}

// For event loop lag calculation
let lastNanos = Bun.nanoseconds();
