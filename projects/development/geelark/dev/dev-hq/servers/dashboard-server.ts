#!/usr/bin/env bun
/**
 * Dashboard Server - Unified Feature Flag Dashboard
 *
 * Serves the React dashboard UI and provides API endpoints for:
 * - Feature flag management
 * - Build configuration and triggering
 * - Runtime metrics and monitoring
 * - Health checks
 * - Per-IP, per-device, per-environment monitoring
 */

import { BunServe } from "../../src/server/BunServe.js";
import { setupDashboardAPI } from "../../src/server/DashboardAPI.js";
import { MonitoringSystem } from "../../src/server/MonitoringSystem.js";
import { MonitoringAuth } from "../../src/server/MonitoringAuth.js";
import { AlertsSystem } from "../../src/server/AlertsSystem.js";
import { GeoLocationSystem } from "../../src/server/GeoLocationSystem.js";
import { AnomalyDetection } from "../../src/server/AnomalyDetection.js";
import { DashboardConfigSystem } from "../../src/server/DashboardConfig.js";
import { SocketInspectionSystem } from "../../src/server/SocketInspection.js";
import { TelemetrySystem } from "../../src/server/TelemetrySystem.js";
import { UploadService } from "../../src/server/UploadService.js";
import {
  NETWORK,
  HTTP,
  INTERVALS,
  DIR_PATHS,
  ENVIRONMENT,
  WEBSOCKET,
  UPLOAD,
} from "../../src/server/ServerConstants.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Terminal } from "bun";
import {
  getJavaScriptHeapStats,
  getDetailedMemoryUsage,
  getMemoryHealthScore,
  getTopObjectTypes,
  recordMemoryTrend,
  getMemoryTrend,
  calculateMemoryGrowthRate,
  getMemoryReport,
  takeHeapSnapshot,
  forceGarbageCollection,
} from "../../src/server/BunProfiling.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const DIST_DIR = path.join(ROOT_DIR, DIR_PATHS.DASHBOARD_DIST);

// =============================================================================
// TERMINAL SETUP
// =============================================================================

/**
 * Terminal instance with resize support and Unicode-aware output
 */
const term = new Terminal({
  cols: process.stdout.columns || 80,
  rows: process.stdout.rows || 24,
  resize(cols, rows) {
    // Re-render dashboard output on terminal resize
    renderStatusBox(cols);
  }
});

/**
 * Helper function for Unicode-aware padding
 * Uses Bun.stringWidth() to properly handle emoji and wide characters
 */
function padWithWidth(str: string, totalWidth: number): string {
  const strWidth = Bun.stringWidth(str);
  const padding = Math.max(0, totalWidth - strWidth);
  return str + " ".repeat(padding);
}

/**
 * Render terminal output with proper Unicode alignment
 */
function renderMetric(emoji: string, label: string, value: string, maxWidth: number = 70): void {
  const emojiWidth = Bun.stringWidth(emoji);
  const labelWidth = Bun.stringWidth(label);
  const valueWidth = Bun.stringWidth(value);

  const totalTextWidth = emojiWidth + labelWidth + valueWidth + 4; // +4 for spaces and colons
  const padding = Math.max(0, maxWidth - totalTextWidth);

  console.log(`${emoji} ${label}:${" ".repeat(padding)}${value}`);
}

/**
 * Render the final status box with proper Unicode alignment
 */
function renderStatusBox(boxWidth: number = 70): void {
  const envPadding = Math.max(0, boxWidth - Bun.stringWidth(ENVIRONMENT_VALUE) - 16);

  console.log(`
╔════════════════════════════════════════════════════════════╗
║           🎨 Geelark Feature Flag Dashboard                ║
╠════════════════════════════════════════════════════════════╣
║  📊 Dashboard:  http://localhost:${PORT}/dashboard         ║
║  🔌 API:        http://localhost:${PORT}/api               ║
║  📈 Health:     http://localhost:${PORT}/api/health        ║
║  📊 Metrics:    http://localhost:${PORT}/api/metrics       ║
║  🔍 Monitoring: http://localhost:${PORT}/api/monitoring   ║
║  🚨 Alerts:     http://localhost:${PORT}/api/alerts        ║
║  🌍 Geolocation: http://localhost:${PORT}/api/geo          ║
║  🔐 Auth:       http://localhost:${PORT}/api/auth          ║
║  📤 Export:     http://localhost:${PORT}/api/export        ║
║  📊 Anomalies:  http://localhost:${PORT}/api/anomalies     ║
║  🎨 Dashboards: http://localhost:${PORT}/api/dashboards    ║
║  🔌 Sockets:    http://localhost:${PORT}/api/sockets       ║
║  📈 Telemetry:  http://localhost:${PORT}/api/telemetry     ║
║  🔬 Profiling:  http://localhost:${PORT}/api/profiling     ║
╠════════════════════════════════════════════════════════════╣
║  Environment: ${padWithWidth(ENVIRONMENT_VALUE, boxWidth - 16)}║
╚════════════════════════════════════════════════════════════╝
`);
}

// =============================================================================
// CLI ARGUMENT PARSING
// =============================================================================
function parseArgs(args: string[]): Record<string, string | boolean> {
  const parsed: Record<string, string | boolean> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];

      if (nextArg && !nextArg.startsWith("--")) {
        parsed[key] = nextArg;
        i++; // Skip next arg
      } else {
        parsed[key] = true;
      }
    }
  }

  return parsed;
}

const args = parseArgs(process.argv.slice(2));

// CLI flags with fallback to environment variables
const CLI_CONFIG = {
  // Server configuration
  port: args.port ? parseInt(args.port as string) : (process.env.PORT ? parseInt(process.env.PORT) : NETWORK.DASHBOARD_PORT),
  hostname: args.hostname as string || NETWORK.HOSTNAME,
  envFile: args["env-file"] as string || process.env.ENV_FILE || ".env.upload",

  // Upload configuration
  uploadProvider: args["upload-provider"] as string || process.env.UPLOAD_PROVIDER || "local",
  maxHttpHeaderSize: args["max-http-header-size"] ? parseInt(args["max-http-header-size"] as string) : 16384,
  dnsResultOrder: args["dns-result-order"] as string || "verbatim",
  useSystemCa: args["use-system-ca"] !== undefined,
  useOpensslCa: args["use-openssl-ca"] !== undefined,
  useBundledCa: args["use-bundled-ca"] !== undefined,

  // Preconnect URLs
  preconnect: args["fetch-preconnect"]
    ? [args["fetch-preconnect"] as string]
    : [
        "https://s3.amazonaws.com",
        "https://*.amazonaws.com",
        "https://*.r2.cloudflarestorage.com",
      ],

  // User agent
  userAgent: args["user-agent"] as string || "Geelark-Upload/1.0.0 (Bun)",

  // Working directory
  cwd: args.cwd as string || process.cwd(),

  // Config file
  config: args.config as string || args.c as string,
};

// Display CLI help
if (args.help || args.h) {
  console.log(`
Geelark Dashboard Server
=========================

USAGE:
  bun run dashboard-server.ts [OPTIONS]

OPTIONS:
  --port <number>              Server port (default: 3000)
  --hostname <string>          Server hostname (default: localhost)
  --env-file <path>            Environment file (default: .env.upload)
  --cwd <path>                 Working directory
  --config, -c <path>          Path to bunfig.toml

  --upload-provider <string>   Upload provider: local, s3, r2 (default: local)
  --max-http-header-size <n>   Max HTTP header size in bytes (default: 16384)
  --dns-result-order <string>  DNS order: verbatim, ipv4first, ipv6first
  --use-system-ca              Use system's trusted CAs
  --use-openssl-ca             Use OpenSSL's CA store
  --use-bundled-ca             Use bundled CA store
  --fetch-preconnect <url>     Preconnect to URL while loading
  --user-agent <string>        User-Agent header

  -h, --help                   Show this help message

ENVIRONMENT VARIABLES:
  PORT                         Server port
  UPLOAD_PROVIDER              Upload provider (local, s3, r2)
  S3_ACCESS_KEY_ID             AWS access key
  S3_SECRET_ACCESS_KEY         AWS secret key
  S3_BUCKET                    S3 bucket name
  S3_REGION                    AWS region

EXAMPLES:
  # Start on port 3000
  bun run dashboard-server.ts --port 3000

  # Start with S3 uploads
  bun run dashboard-server.ts --upload-provider s3

  # Start with custom env file
  bun run dashboard-server.ts --env-file .env.production

  # Start with system CA and IPv4-first DNS
  bun run dashboard-server.ts --use-system-ca --dns-result-order ipv4first

For more information, see https://bun.sh/docs/cli
`);
  process.exit(0);
}

// Display startup banner
console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║  ███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗                                 ║
║  ████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝                                 ║
║  ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗                                 ║
║  ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║                                 ║
║  ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║                                 ║
║  ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝                                 ║
║                                                                              ║
║  🚀 Feature Flag Dashboard & Upload System                                   ║
║  Version: 1.0.0                                                              ║
╚════════════════════════════════════════════════════════════════════════════╝
`);

// Log configuration with Unicode-aware alignment
console.log("📋 Configuration:");
renderMetric("🌍", "Environment", CLI_CONFIG.envFile);
renderMetric("🔌", "Port", CLI_CONFIG.port.toString());
renderMetric("☁️", "Upload Provider", CLI_CONFIG.uploadProvider);
renderMetric("📦", "Max HTTP Header Size", `${CLI_CONFIG.maxHttpHeaderSize} bytes`);
renderMetric("🔍", "DNS Order", CLI_CONFIG.dnsResultOrder);
renderMetric("🔐", "Use System CA", CLI_CONFIG.useSystemCa.toString());
renderMetric("📁", "Working Directory", CLI_CONFIG.cwd);
console.log("");

// ============================================================================
// Proxy Header Validation Status (if validator module available)
// ============================================================================

(async () => {
  try {
    // Dynamic import to avoid errors if module not available
    const { validateProxyHeader } = await import("../../src/proxy/validator.js");

    console.log("🔒 Proxy Header Validation:");

    // Validate current config headers (demonstration)
    const demoHeaders = {
      "X-Bun-Config-Version": "1",
      "X-Bun-Registry-Hash": "0xa1b2c3d4",
      "X-Bun-Feature-Flags": "0x00000007",
      "X-Bun-Terminal-Mode": "2",
      "X-Bun-Terminal-Rows": "24",
      "X-Bun-Terminal-Cols": "80",
    };

    for (const [name, value] of Object.entries(demoHeaders)) {
      const result = validateProxyHeader(name, value);
      const icon = result.valid ? "✅" : "❌";

      // Use renderMetric for proper alignment
      const shortName = name.replace("X-Bun-", "").replace(/-/g, " ");
      const status = result.valid ? "valid" : result.error.code;
      renderMetric(icon, shortName, `${value} (${status})`);
    }

    console.log("");
  } catch (error) {
    // Validator module not available, skip validation display
    console.log("⚠️  Proxy header validation: module not available");
    console.log("");
  }
})();

const PORT = CLI_CONFIG.port;
const HOSTNAME = CLI_CONFIG.hostname;

// Initialize monitoring system
const monitoring = new MonitoringSystem();

// Initialize authentication system
const auth = new MonitoringAuth();

// Initialize alerts system
const alerts = new AlertsSystem(monitoring);

// Initialize geolocation system
const geoLocation = new GeoLocationSystem();

// Initialize anomaly detection system
const anomalyDetection = new AnomalyDetection(monitoring);

// Initialize dashboard configuration system
const dashboardConfig = new DashboardConfigSystem();

// Initialize socket inspection system
const socketInspection = new SocketInspectionSystem();

// Initialize telemetry system
const telemetry = new TelemetrySystem(monitoring);

// Initialize upload service (feature-guarded)
const uploadConfig = {
  provider: (CLI_CONFIG.uploadProvider as "s3" | "r2" | "local") || "local",
  accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  bucket: process.env.S3_BUCKET || "uploads",
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT,
};
const uploadService = new UploadService(uploadConfig);

// Get environment from env or default to development
const ENVIRONMENT_VALUE = process.env.ENVIRONMENT || process.env.NODE_ENV || ENVIRONMENT.DEVELOPMENT;

console.log(`🔍 Monitoring System initialized for environment: ${ENVIRONMENT_VALUE}`);
console.log(`🔐 Authentication System initialized`);
console.log(`🚨 Alerts System initialized`);
console.log(`🌍 Geolocation System initialized`);
console.log(`📊 Anomaly Detection System initialized`);
console.log(`🎨 Dashboard Configuration System initialized`);
console.log(`🔌 Socket Inspection System initialized (DNS/TCP)`);
console.log(`📈 Telemetry System initialized (Performance & Alerts)`);
console.log(`☁️ Upload Service initialized (provider: ${uploadConfig.provider})`);

// Create server (port from CLI, env, or default)
const server = new BunServe({
  port: PORT,
  hostname: HOSTNAME,
  cors: {
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    headers: ["Content-Type", "Authorization"],
  },
});

// Helper function to fetch geolocation data (basic implementation)
async function fetchGeolocation(ip: string): Promise<Partial<{
  country: string;
  countryCode: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
}> | null> {
  // Skip localhost and private IPs
  if (ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return {
      country: "Local",
      countryCode: "LO",
      city: "Localhost",
    };
  }

  try {
    // Try to use a free geolocation API (ip-api.com)
    // Note: In production, use a paid service or local database like MaxMind GeoLite2
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,city,lat,lon,timezone,isp,org`);
    if (response.ok) {
      const data = await response.json();
      if (data.status === "success") {
        return {
          country: data.country,
          countryCode: data.countryCode,
          region: data.region,
          city: data.city,
          latitude: data.lat,
          longitude: data.lon,
          timezone: data.timezone,
          isp: data.isp,
          organization: data.org,
        };
      }
    }
  } catch (error) {
    // Silently fail - geolocation is optional enhancement
  }

  return null;
}

// Helper function to extract token from Authorization header
function extractToken(req: Request): string | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;

  // Support both "Bearer <token>" and direct token formats
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  return authHeader;
}

// Authentication middleware for protected endpoints
const authMiddleware = (requiredPermission?: string) => {
  return async (req: Request, next: () => Promise<Response>): Promise<Response> => {
    const token = extractToken(req);

    if (!token) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Authentication token required",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const tokenData = auth.validateToken(token);
    if (!tokenData) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Invalid or expired token",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check permission if required
    if (requiredPermission && !auth.hasPermission(token, requiredPermission)) {
      // Log audit event
      auth.logAudit({
        timestamp: Date.now(),
        token,
        action: "access_denied",
        resource: req.url,
        ip: monitoring.getClientIP(req),
        userAgent: req.headers.get("user-agent") || "",
        success: false,
        reason: `Missing permission: ${requiredPermission}`,
      });

      return new Response(
        JSON.stringify({
          error: "Forbidden",
          message: `Insufficient permissions. Required: ${requiredPermission}`,
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Add token data to request headers for downstream handlers
    const reqWithAuth = new Request(req, {
      headers: {
        ...Object.fromEntries(req.headers.entries()),
        "x-user-role": tokenData.role,
        "x-user-name": tokenData.name,
      },
    });

    return next();
  };
};

// Middleware to track all requests
const monitoringMiddleware = async (req: Request, next: () => Promise<Response>): Promise<Response> => {
  const startTime = Date.now();

  // Get request info
  const ip = monitoring.getClientIP(req);
  const userAgent = req.headers.get("user-agent") || "";
  const deviceFingerprint = monitoring.generateDeviceFingerprint(req);
  const deviceType = monitoring.determineDeviceType(userAgent);
  const url = new URL(req.url);
  const path = url.pathname;

  // Check rate limiting
  if (monitoring.isRateLimited(ip, ENVIRONMENT_VALUE, HTTP.RATE_LIMIT_MAX_REQUESTS, HTTP.RATE_LIMIT_WINDOW / 1000)) {
    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded",
        message: "Too many requests. Please try again later.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Remaining": "0",
          "Retry-After": "60",
        },
      }
    );
  }

  // Continue with request
  const response = await next();

  // Record metrics after response
  const responseTime = Date.now() - startTime;
  const clonedResponse = response.clone();

  try {
    const responseBody = await clonedResponse.text();
    // We can't easily read the body back, so we'll use the status code
  } catch {
    // Body already consumed, that's fine
  }

  monitoring.recordEvent({
    timestamp: startTime,
    ip,
    environment: ENVIRONMENT_VALUE,
    endpoint: path,
    method: req.method,
    statusCode: response.status,
    responseTime,
    userAgent,
    deviceType,
    deviceFingerprint,
    path,
  });

  // Check for alerts asynchronously (don't block response)
  (async () => {
    try {
      const monitoringEvent = {
        timestamp: startTime,
        ip,
        environment: ENVIRONMENT_VALUE,
        endpoint: path,
        method: req.method,
        statusCode: response.status,
        responseTime,
        userAgent,
        deviceType,
        deviceFingerprint,
        path,
      };

      const triggeredAlerts = await alerts.checkEvent(monitoringEvent);
      for (const alert of triggeredAlerts) {
        const createdAlert = alerts.createAlert(alert);
        console.log(`🚨 Alert triggered: ${alert.title} from ${ip}`);
        // TODO: Send notifications via WebSocket
      }
    } catch (error) {
      console.error("Error checking alerts:", error);
    }
  })();

  // Update geolocation asynchronously (don't block response)
  (async () => {
    try {
      // Try to get geolocation data from IP (basic implementation)
      // In production, you'd use a real geolocation service like MaxMind GeoIP2
      const geoData = await fetchGeolocation(ip);
      if (geoData) {
        geoLocation.updateGeoLocation(ip, geoData);
      }
    } catch (error) {
      // Silently fail - geolocation is optional
    }
  })();

  return response;
};

// Add middleware to server
server.use(monitoringMiddleware);

// Setup API endpoints
setupDashboardAPI(server);

// Add monitoring-specific endpoints
setupMonitoringAPI(server);

function setupMonitoringAPI(srv: BunServe): void {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // Handle CORS preflight
  srv.addRoute("OPTIONS", "/api/monitoring/*", () => new Response(null, { headers: corsHeaders }));

  // GET /api/monitoring/summary - Get overall monitoring summary
  srv.get("/api/monitoring/summary", () => {
    const summary = monitoring.getSummary();
    return Response.json(summary, { headers: corsHeaders });
  });

  // GET /api/monitoring/environment/:env - Get metrics for specific environment
  srv.get("/api/monitoring/environment/:env", (req) => {
    const url = new URL(req.url);
    const env = req.params?.env || url.searchParams.get("env") || ENVIRONMENT_VALUE;
    const metrics = monitoring.getEnvironmentMetrics(env);
    return Response.json(metrics, { headers: corsHeaders });
  });

  // GET /api/monitoring/ips/top - Get top IPs by request count
  srv.get("/api/monitoring/ips/top", (req) => {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const env = url.searchParams.get("env") || ENVIRONMENT_VALUE;
    const topIPs = monitoring.getTopIPs(env, limit);
    return Response.json(topIPs, { headers: corsHeaders });
  });

  // GET /api/monitoring/devices/top - Get top devices by request count
  srv.get("/api/monitoring/devices/top", (req) => {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const env = url.searchParams.get("env") || ENVIRONMENT_VALUE;
    const topDevices = monitoring.getTopDevices(env, limit);
    return Response.json(topDevices, { headers: corsHeaders });
  });

  // GET /api/monitoring/ip/:ipAddress - Get events for specific IP
  srv.get("/api/monitoring/ip/:ipAddress/*", (req) => {
    const url = new URL(req.url);
    const ip = req.params?.ipAddress || "";
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const env = url.searchParams.get("env") || ENVIRONMENT_VALUE;

    if (!ip) {
      return new Response(JSON.stringify({ error: "IP address required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const events = monitoring.getIPEvents(ip, env, limit);
    return Response.json(events, { headers: corsHeaders });
  });

  // GET /api/monitoring/device/:fingerprint - Get events for specific device
  srv.get("/api/monitoring/device/:fingerprint/*", (req) => {
    const url = new URL(req.url);
    const fingerprint = req.params?.fingerprint || "";
    const limit = parseInt(url.searchParams.get("limit") || "50");

    if (!fingerprint) {
      return new Response(JSON.stringify({ error: "Device fingerprint required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const events = monitoring.getDeviceEvents(fingerprint, limit);
    return Response.json(events, { headers: corsHeaders });
  });

  // GET /api/monitoring/environments - Get all environments
  srv.get("/api/monitoring/environments", () => {
    const environments = monitoring.getEnvironments();
    return Response.json(environments, { headers: corsHeaders });
  });

  // POST /api/monitoring/cleanup - Cleanup old monitoring data
  srv.post("/api/monitoring/cleanup", async (req) => {
    const body = await req.json();
    const olderThanDays = body?.olderThanDays || 30;

    const deleted = monitoring.cleanup(olderThanDays);
    return Response.json({
      success: true,
      deleted,
      message: `Cleaned up ${deleted} events older than ${olderThanDays} days`,
    }, { headers: corsHeaders });
  });
}

// Setup authentication API endpoints
setupAuthAPI(server);

function setupAuthAPI(srv: BunServe): void {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // Handle CORS preflight
  srv.addRoute("OPTIONS", "/api/auth/*", () => new Response(null, { headers: corsHeaders }));

  // POST /api/auth/login - Authenticate and get token
  srv.post("/api/auth/login", async (req) => {
    try {
      const body = await req.json();
      const { username, password } = body;

      if (!username || !password) {
        return new Response(
          JSON.stringify({
            error: "Bad Request",
            message: "Username and password required",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      const token = auth.authenticate(username, password);

      if (!token) {
        // Log failed attempt
        auth.logAudit({
          timestamp: Date.now(),
          token: "",
          action: "login_failed",
          resource: "/api/auth/login",
          ip: monitoring.getClientIP(req),
          userAgent: req.headers.get("user-agent") || "",
          success: false,
          reason: "Invalid username or password",
        });

        return new Response(
          JSON.stringify({
            error: "Unauthorized",
            message: "Invalid username or password",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      // Log successful login
      auth.logAudit({
        timestamp: Date.now(),
        token: token.token,
        action: "login_success",
        resource: "/api/auth/login",
        ip: monitoring.getClientIP(req),
        userAgent: req.headers.get("user-agent") || "",
        success: true,
      });

      return Response.json(
        {
          success: true,
          token: token.token,
          name: token.name,
          role: token.role,
          permissions: token.permissions,
          expiresAt: token.expiresAt,
        },
        { headers: corsHeaders }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: "Failed to process login request",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
  });

  // POST /api/auth/validate - Validate token
  srv.post("/api/auth/validate", async (req) => {
    const token = extractToken(req);

    if (!token) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Token required",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const tokenData = auth.validateToken(token);

    if (!tokenData) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Invalid or expired token",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    return Response.json(
      {
        success: true,
        valid: true,
        token: {
          name: tokenData.name,
          role: tokenData.role,
          permissions: tokenData.permissions,
          expiresAt: tokenData.expiresAt,
        },
      },
      { headers: corsHeaders }
    );
  });

  // POST /api/auth/logout - Revoke token
  srv.post("/api/auth/logout", async (req) => {
    const token = extractToken(req);

    if (!token) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Token required",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    auth.revokeToken(token);

    // Log logout
    auth.logAudit({
      timestamp: Date.now(),
      token,
      action: "logout",
      resource: "/api/auth/logout",
      ip: monitoring.getClientIP(req),
      userAgent: req.headers.get("user-agent") || "",
      success: true,
    });

    return Response.json(
      {
        success: true,
        message: "Logged out successfully",
      },
      { headers: corsHeaders }
    );
  });

  // GET /api/auth/audit - Get audit log (requires admin permission)
  srv.get("/api/auth/audit", (req) => {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const auditLog = auth.getAuditLog(limit, offset);

    return Response.json(auditLog, { headers: corsHeaders });
  });

  // POST /api/auth/change-password - Change password
  srv.post("/api/auth/change-password", async (req) => {
    try {
      const body = await req.json();
      const { username, newPassword } = body;

      if (!username || !newPassword) {
        return new Response(
          JSON.stringify({
            error: "Bad Request",
            message: "Username and new password required",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      const success = auth.changePassword(username, newPassword);

      if (!success) {
        return new Response(
          JSON.stringify({
            error: "Not Found",
            message: "User not found",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      return Response.json(
        {
          success: true,
          message: "Password changed successfully",
        },
        { headers: corsHeaders }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: "Failed to change password",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
  });
}

// Setup alerts API endpoints
setupAlertsAPI(server);

function setupAlertsAPI(srv: BunServe): void {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // Handle CORS preflight
  srv.addRoute("OPTIONS", "/api/alerts/*", () => new Response(null, { headers: corsHeaders }));

  // GET /api/alerts/active - Get active alerts
  srv.get("/api/alerts/active", (req) => {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "100");

    const activeAlerts = alerts.getActiveAlerts(limit);

    return Response.json(activeAlerts, { headers: corsHeaders });
  });

  // GET /api/alerts/all - Get all alerts (including resolved)
  srv.get("/api/alerts/all", (req) => {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const allAlerts = alerts.getAllAlerts(limit, offset);

    return Response.json(allAlerts, { headers: corsHeaders });
  });

  // GET /api/alerts/stats - Get alert statistics
  srv.get("/api/alerts/stats", () => {
    const stats = alerts.getAlertStats();

    return Response.json(stats, { headers: corsHeaders });
  });

  // POST /api/alerts/resolve/:id - Resolve alert
  srv.post("/api/alerts/resolve/:id/*", async (req) => {
    const url = new URL(req.url);
    const id = parseInt(req.params?.id || url.pathname.split("/").pop() || "0");

    if (isNaN(id)) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid alert ID",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const body = await req.json();
    const resolvedBy = body?.resolvedBy || "system";

    const success = alerts.resolveAlert(id, resolvedBy);

    if (!success) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Alert not found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    return Response.json(
      {
        success: true,
        message: "Alert resolved successfully",
      },
      { headers: corsHeaders }
    );
  });

  // GET /api/alerts/rules - Get alert rules
  srv.get("/api/alerts/rules", () => {
    const rules = alerts.getActiveRules();

    return Response.json(rules, { headers: corsHeaders });
  });

  // PUT /api/alerts/rules/:id - Update alert rule
  srv.post("/api/alerts/rules/:id/*", async (req) => {
    const url = new URL(req.url);
    const ruleId = req.params?.id || url.pathname.split("/").pop() || "";

    if (!ruleId) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Rule ID required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const body = await req.json();
    const success = alerts.updateAlertRule(ruleId, body);

    if (!success) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Rule not found or no changes specified",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    return Response.json(
      {
        success: true,
        message: "Alert rule updated successfully",
      },
      { headers: corsHeaders }
    );
  });
}

// Setup geolocation API endpoints
setupGeolocationAPI(server);

function setupGeolocationAPI(srv: BunServe): void {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // Handle CORS preflight
  srv.addRoute("OPTIONS", "/api/geo/*", () => new Response(null, { headers: corsHeaders }));

  // GET /api/geo/stats - Get geolocation statistics
  srv.get("/api/geo/stats", () => {
    const stats = geoLocation.getGeoStats();

    return Response.json(stats, { headers: corsHeaders });
  });

  // GET /api/geo/countries - Get top countries
  srv.get("/api/geo/countries", (req) => {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "20");

    const topCountries = geoLocation.getTopCountries(limit);

    return Response.json(topCountries, { headers: corsHeaders });
  });

  // GET /api/geo/ip/:ip - Get geolocation for IP
  srv.get("/api/geo/ip/:ip/*", (req) => {
    const url = new URL(req.url);
    const ip = req.params?.ip || "";

    if (!ip) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "IP address required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const geo = geoLocation.getGeoLocation(ip);

    if (!geo) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Geolocation not found for this IP",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    return Response.json(geo, { headers: corsHeaders });
  });

  // GET /api/geo/country/:country - Search by country
  srv.get("/api/geo/country/:country/*", (req) => {
    const url = new URL(req.url);
    const country = req.params?.country || url.searchParams.get("country") || "";

    if (!country) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Country name required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const locations = geoLocation.searchByCountry(country);

    return Response.json(locations, { headers: corsHeaders });
  });

  // GET /api/geo/city/:city - Search by city
  srv.get("/api/geo/city/:city/*", (req) => {
    const url = new URL(req.url);
    const city = req.params?.city || url.searchParams.get("city") || "";

    if (!city) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "City name required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const locations = geoLocation.searchByCity(city);

    return Response.json(locations, { headers: corsHeaders });
  });
}

// Setup export API endpoints
setupExportAPI(server);

function setupExportAPI(srv: BunServe): void {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // Handle CORS preflight
  srv.addRoute("OPTIONS", "/api/export/*", () => new Response(null, { headers: corsHeaders }));

  // Helper function to convert data to CSV
  function toCSV(data: any[], headers: string[]): string {
    const csvRows = [];

    // Add header row
    csvRows.push(headers.join(","));

    // Add data rows
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma
        const escaped = String(value || "").replace(/"/g, '""');
        return /[,\n"]/.test(escaped) ? `"${escaped}"` : escaped;
      });
      csvRows.push(values.join(","));
    }

    return csvRows.join("\n");
  }

  // GET /api/export/monitoring/events - Export monitoring events as CSV or JSON
  srv.get("/api/export/monitoring/events", (req) => {
    const url = new URL(req.url);
    const format = url.searchParams.get("format") || "json";
    const limit = parseInt(url.searchParams.get("limit") || "1000");
    const env = url.searchParams.get("env") || ENVIRONMENT_VALUE;

    const summary = monitoring.getSummary();

    // Get recent events (from all environments or specific)
    let events: any[] = [];

    // Get IPs and their events
    const topIPs = monitoring.getTopIPs(env, Math.min(limit, 100));
    for (const ipInfo of topIPs) {
      const ipEvents = monitoring.getIPEvents(ipInfo.ip, env, Math.min(limit / topIPs.length, 50));
      events = events.concat(ipEvents);
    }

    // Sort by timestamp
    events.sort((a, b) => b.timestamp - a.timestamp);
    events = events.slice(0, limit);

    if (format === "csv") {
      const headers = ["timestamp", "ip", "environment", "endpoint", "method", "statusCode", "responseTime", "userAgent", "deviceType", "path"];
      const csv = toCSV(events, headers);

      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="monitoring-events-${Date.now()}.csv"`,
          ...corsHeaders,
        },
      });
    }

    // Default to JSON
    return Response.json(events, {
      headers: {
        "Content-Disposition": `attachment; filename="monitoring-events-${Date.now()}.json"`,
        ...corsHeaders,
      },
    });
  });

  // GET /api/export/monitoring/summary - Export monitoring summary as JSON
  srv.get("/api/export/monitoring/summary", (req) => {
    const url = new URL(req.url);
    const format = url.searchParams.get("format") || "json";

    const summary = monitoring.getSummary();

    // Get per-environment metrics
    const environments = monitoring.getEnvironments();
    const envMetrics = environments.map(env => ({
      environment: env,
      ...monitoring.getEnvironmentMetrics(env),
    }));

    const exportData = {
      generatedAt: new Date().toISOString(),
      summary,
      environments: envMetrics,
    };

    if (format === "csv") {
      // Export summary as CSV
      const csv = toCSV(environments.map(env => ({
        environment: env,
        ...monitoring.getEnvironmentMetrics(env),
      })), ["environment", "totalRequests", "uniqueIPs", "uniqueDevices", "errorRate", "avgResponseTime"]);

      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="monitoring-summary-${Date.now()}.csv"`,
          ...corsHeaders,
        },
      });
    }

    return Response.json(exportData, {
      headers: {
        "Content-Disposition": `attachment; filename="monitoring-summary-${Date.now()}.json"`,
        ...corsHeaders,
      },
    });
  });

  // GET /api/export/alerts - Export alerts as CSV or JSON
  srv.get("/api/export/alerts", (req) => {
    const url = new URL(req.url);
    const format = url.searchParams.get("format") || "json";
    const limit = parseInt(url.searchParams.get("limit") || "1000");

    const allAlerts = alerts.getAllAlerts(limit);

    if (format === "csv") {
      const headers = ["id", "timestamp", "type", "severity", "title", "description", "ip", "environment", "resolved", "resolvedAt", "resolvedBy"];
      const csv = toCSV(allAlerts, headers);

      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="alerts-${Date.now()}.csv"`,
          ...corsHeaders,
        },
      });
    }

    return Response.json(allAlerts, {
      headers: {
        "Content-Disposition": `attachment; filename="alerts-${Date.now()}.json"`,
        ...corsHeaders,
      },
    });
  });

  // GET /api/export/geo - Export geolocation data as CSV or JSON
  srv.get("/api/export/geo", (req) => {
    const url = new URL(req.url);
    const format = url.searchParams.get("format") || "json";
    const limit = parseInt(url.searchParams.get("limit") || "1000");

    const allLocations = geoLocation.getAllGeoLocations(limit);

    if (format === "csv") {
      const headers = ["ip", "country", "countryCode", "region", "city", "latitude", "longitude", "timezone", "isp", "organization", "lastUpdated"];
      const csv = toCSV(allLocations, headers);

      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="geolocation-${Date.now()}.csv"`,
          ...corsHeaders,
        },
      });
    }

    return Response.json(allLocations, {
      headers: {
        "Content-Disposition": `attachment; filename="geolocation-${Date.now()}.json"`,
        ...corsHeaders,
      },
    });
  });

  // GET /api/export/auth/audit - Export audit log as CSV or JSON
  srv.get("/api/export/auth/audit", (req) => {
    const url = new URL(req.url);
    const format = url.searchParams.get("format") || "json";
    const limit = parseInt(url.searchParams.get("limit") || "1000");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const auditLog = auth.getAuditLog(limit, offset);

    if (format === "csv") {
      const headers = ["id", "timestamp", "token", "action", "resource", "ip", "userAgent", "success", "reason"];
      const csv = toCSV(auditLog, headers);

      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="audit-log-${Date.now()}.csv"`,
          ...corsHeaders,
        },
      });
    }

    return Response.json(auditLog, {
      headers: {
        "Content-Disposition": `attachment; filename="audit-log-${Date.now()}.json"`,
        ...corsHeaders,
      },
    });
  });

  // GET /api/export/full - Export all data as a single JSON file
  srv.get("/api/export/full", (req) => {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "1000");

    const exportData = {
      generatedAt: new Date().toISOString(),
      monitoring: {
        summary: monitoring.getSummary(),
        environments: monitoring.getEnvironments().map(env => ({
          environment: env,
          ...monitoring.getEnvironmentMetrics(env),
        })),
      },
      alerts: {
        stats: alerts.getAlertStats(),
        active: alerts.getActiveAlerts(limit),
      },
      geolocation: geoLocation.getGeoStats(),
      auth: {
        activeTokens: auth.listActiveTokens().length,
      },
    };

    return Response.json(exportData, {
      headers: {
        "Content-Disposition": `attachment; filename="geelark-monitoring-full-${Date.now()}.json"`,
        ...corsHeaders,
      },
    });
  });
}

// Setup anomaly detection API endpoints
setupAnomalyAPI(server);

function setupAnomalyAPI(srv: BunServe): void {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // Handle CORS preflight
  srv.addRoute("OPTIONS", "/api/anomalies/*", () => new Response(null, { headers: corsHeaders }));

  // GET /api/anomalies/recent - Get recent anomalies
  srv.get("/api/anomalies/recent", (req) => {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const type = url.searchParams.get("type") || undefined;

    const recentAnomalies = anomalyDetection.getRecentAnomalies(limit, type);

    return Response.json(recentAnomalies, { headers: corsHeaders });
  });

  // GET /api/anomalies/stats - Get anomaly statistics
  srv.get("/api/anomalies/stats", () => {
    const stats = anomalyDetection.getAnomalyStats();

    return Response.json(stats, { headers: corsHeaders });
  });

  // POST /api/anomalies/resolve/:id - Resolve anomaly
  srv.post("/api/anomalies/resolve/:id/*", (req) => {
    const url = new URL(req.url);
    const id = parseInt(req.params?.id || url.pathname.split("/").pop() || "0");

    if (isNaN(id)) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid anomaly ID",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const success = anomalyDetection.resolveAnomaly(id);

    if (!success) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Anomaly not found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    return Response.json(
      {
        success: true,
        message: "Anomaly resolved successfully",
      },
      { headers: corsHeaders }
    );
  });

  // POST /api/anomalies/detect - Manually trigger anomaly detection
  srv.post("/api/anomalies/detect", async (req) => {
    try {
      const detectedAnomalies = await anomalyDetection.detectAnomalies(ENVIRONMENT_VALUE);

      return Response.json(
        {
          success: true,
          detected: detectedAnomalies.length,
          anomalies: detectedAnomalies,
        },
        { headers: corsHeaders }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: "Failed to detect anomalies",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
  });
}

// Setup dashboard configuration API endpoints
setupDashboardConfigAPI(server);

function setupDashboardConfigAPI(srv: BunServe): void {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // Handle CORS preflight
  srv.addRoute("OPTIONS", "/api/dashboards/*", () => new Response(null, { headers: corsHeaders }));

  // GET /api/dashboards/:environment - Get all dashboards for environment
  srv.get("/api/dashboards/:environment/*", (req) => {
    const url = new URL(req.url);
    const environment = req.params?.environment || url.searchParams.get("env") || ENVIRONMENT_VALUE;

    const dashboards = dashboardConfig.getDashboardsForEnvironment(environment);

    return Response.json(dashboards, { headers: corsHeaders });
  });

  // GET /api/dashboards/:environment/:name - Get specific dashboard
  srv.get("/api/dashboards/:environment/:name/*", (req) => {
    const environment = req.params?.environment || "";
    const name = req.params?.name || "Default";

    const dashboard = dashboardConfig.getDashboard(environment, name);

    if (!dashboard) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Dashboard not found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    return Response.json(dashboard, { headers: corsHeaders });
  });

  // POST /api/dashboards - Create new dashboard
  srv.post("/api/dashboards", async (req) => {
    try {
      const config = await req.json();

      // Validate
      if (!config.name || !config.environment || !config.widgets) {
        return new Response(
          JSON.stringify({
            error: "Bad Request",
            message: "Missing required fields: name, environment, widgets",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      const dashboard = dashboardConfig.createDashboard({
        ...config,
        createdBy: "dashboard",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDefault: false,
      });

      return Response.json(dashboard, {
        status: 201,
        headers: corsHeaders,
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: "Failed to create dashboard",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
  });

  // PUT /api/dashboards/:environment/:name - Update dashboard
  srv.post("/api/dashboards/:environment/:name/*", async (req) => {
    const environment = req.params?.environment || "";
    const name = req.params?.name || "";

    try {
      const updates = await req.json();

      // Add updatedAt
      updates.updatedAt = Date.now();

      const success = dashboardConfig.updateDashboard(environment, name, updates);

      if (!success) {
        return new Response(
          JSON.stringify({
            error: "Not Found",
            message: "Dashboard not found",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      const updated = dashboardConfig.getDashboard(environment, name);
      return Response.json(updated, { headers: corsHeaders });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: "Failed to update dashboard",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
  });

  // DELETE /api/dashboards/:environment/:name - Delete dashboard
  srv.addRoute("DELETE", "/api/dashboards/:environment/:name", (req) => {
    const environment = req.params?.environment || "";
    const name = req.params?.name || "";

    const success = dashboardConfig.deleteDashboard(environment, name);

    if (!success) {
      return new Response(
        JSON.stringify({
          error: "Forbidden",
          message: "Cannot delete dashboard (doesn't exist or is default)",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    return Response.json(
      {
        success: true,
        message: "Dashboard deleted successfully",
      },
      { headers: corsHeaders }
    );
  });

  // POST /api/dashboards/:environment/:name/clone - Clone dashboard
  srv.post("/api/dashboards/:environment/:name/clone/*", async (req) => {
    const sourceEnvironment = req.params?.environment || "";
    const sourceName = req.params?.name || "";

    try {
      const body = await req.json();
      const targetEnvironment = body?.targetEnvironment || sourceEnvironment;
      const newName = body?.name || `${sourceName} (copy)`;

      const cloned = dashboardConfig.cloneDashboard(
        sourceEnvironment,
        sourceName,
        targetEnvironment,
        newName
      );

      if (!cloned) {
        return new Response(
          JSON.stringify({
            error: "Not Found",
            message: "Source dashboard not found",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      return Response.json(cloned, { headers: corsHeaders });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: "Failed to clone dashboard",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
  });

  // POST /api/dashboards/:environment/:name/set-default - Set as default
  srv.post("/api/dashboards/:environment/:name/set-default/*", (req) => {
    const environment = req.params?.environment || "";
    const name = req.params?.name || "";

    const success = dashboardConfig.setAsDefault(environment, name);

    if (!success) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Dashboard not found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    return Response.json(
      {
        success: true,
        message: "Dashboard set as default",
      },
      { headers: corsHeaders }
    );
  });

  // GET /api/dashboards/templates - Get widget templates
  srv.get("/api/dashboards/templates", () => {
    const templates = dashboardConfig.getWidgetTemplates();

    return Response.json(templates, { headers: corsHeaders });
  });

  // GET /api/dashboards/:environment/:name/export - Export dashboard
  srv.get("/api/dashboards/:environment/:name/export/*", (req) => {
    const environment = req.params?.environment || "";
    const name = req.params?.name || "";

    const exported = dashboardConfig.exportDashboard(environment, name);

    if (!exported) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Dashboard not found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    return new Response(exported, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="dashboard-${environment}-${name}.json"`,
        ...corsHeaders,
      },
    });
  });

  // POST /api/dashboards/import - Import dashboard
  srv.post("/api/dashboards/import", async (req) => {
    try {
      const body = await req.json();
      const json = body?.config;
      const overrideName = body?.name;

      if (!json) {
        return new Response(
          JSON.stringify({
            error: "Bad Request",
            message: "Missing config field",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      // If config is a string, parse it
      const config = typeof json === "string" ? json : JSON.stringify(json);

      const imported = dashboardConfig.importDashboard(config, overrideName);

      if (!imported) {
        return new Response(
          JSON.stringify({
            error: "Bad Request",
            message: "Invalid dashboard configuration",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      return Response.json(imported, { headers: corsHeaders });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: "Failed to import dashboard",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
  });
}

// Setup socket inspection API endpoints
setupSocketInspectionAPI(server);

function setupSocketInspectionAPI(srv: BunServe): void {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // Handle CORS preflight
  srv.addRoute("OPTIONS", "/api/sockets/*", () => new Response(null, { headers: corsHeaders }));

  // GET /api/sockets/stats - Get socket statistics
  srv.get("/api/sockets/stats", (req) => {
    const url = new URL(req.url);
    const env = url.searchParams.get("env") || ENVIRONMENT_VALUE;

    const stats = socketInspection.getSocketStats(env);

    return Response.json(stats, { headers: corsHeaders });
  });

  // GET /api/sockets/dns/patterns - Get DNS query patterns
  srv.get("/api/sockets/dns/patterns", (req) => {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "20");

    const patterns = socketInspection.getDNSPatterns(limit);

    return Response.json(patterns, { headers: corsHeaders });
  });

  // GET /api/sockets/tcp/patterns - Get TCP connection patterns
  srv.get("/api/sockets/tcp/patterns", (req) => {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "20");

    const patterns = socketInspection.getTCPPatterns(limit);

    return Response.json(patterns, { headers: corsHeaders });
  });

  // GET /api/sockets/dns/suspicious - Detect suspicious DNS activity
  srv.get("/api/sockets/dns/suspicious", () => {
    const suspicious = socketInspection.detectSuspiciousDNS();

    return Response.json(suspicious, { headers: corsHeaders });
  });

  // GET /api/sockets/dns/:hostname - Get DNS queries for hostname
  srv.get("/api/sockets/dns/:hostname/*", (req) => {
    const url = new URL(req.url);
    const hostname = req.params?.hostname || "";
    const limit = parseInt(url.searchParams.get("limit") || "100");

    if (!hostname) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Hostname required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const queries = socketInspection.getDNSQueries(hostname, limit);

    return Response.json(queries, { headers: corsHeaders });
  });

  // GET /api/sockets/tcp/:ip - Get TCP connections for destination IP
  srv.get("/api/sockets/tcp/:ip/*", (req) => {
    const url = new URL(req.url);
    const ip = req.params?.ip || "";
    const port = url.searchParams.get("port")
      ? parseInt(url.searchParams.get("port") || "0")
      : undefined;
    const limit = parseInt(url.searchParams.get("limit") || "100");

    if (!ip) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "IP address required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const connections = socketInspection.getTCPConnections(ip, port, limit);

    return Response.json(connections, { headers: corsHeaders });
  });

  // GET /api/sockets/active - Get active connections
  srv.get("/api/sockets/active", () => {
    const active = socketInspection.getActiveConnections();

    return Response.json(active, { headers: corsHeaders });
  });

  // GET /api/sockets/events - Get socket events
  srv.get("/api/sockets/events", (req) => {
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || undefined;
    const limit = parseInt(url.searchParams.get("limit") || "100");

    const events = socketInspection.getSocketEvents(type, limit);

    return Response.json(events, { headers: corsHeaders });
  });

  // POST /api/sockets/cleanup - Cleanup old socket data
  srv.post("/api/sockets/cleanup", async (req) => {
    const body = await req.json();
    const olderThanDays = body?.olderThanDays || 7;

    const deleted = socketInspection.cleanup(olderThanDays);

    return Response.json({
      success: true,
      deleted,
      message: `Cleaned up ${deleted} socket records older than ${olderThanDays} days`,
    }, { headers: corsHeaders });
  });

  // GET /api/sockets/export - Export socket data
  srv.get("/api/sockets/export", (req) => {
    const url = new URL(req.url);
    const format = url.searchParams.get("format") || "json";
    const env = url.searchParams.get("env") || undefined;

    const data = socketInspection.exportData(format as "json" | "csv", env);

    return new Response(data, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="socket-data-${Date.now()}.json"`,
        ...corsHeaders,
      },
    });
  });
}

// Setup telemetry API endpoints
setupTelemetryAPI(server);

function setupTelemetryAPI(srv: BunServe): void {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // Handle CORS preflight
  srv.addRoute("OPTIONS", "/api/telemetry/*", () => new Response(null, { headers: corsHeaders }));

  // GET /api/telemetry/alerts - Get active telemetry alerts
  srv.get("/api/telemetry/alerts", (req) => {
    const url = new URL(req.url);
    const environment = url.searchParams.get("env") || ENVIRONMENT_VALUE;

    const alerts = telemetry.getActiveAlertsForEnvironment(environment);

    return Response.json(alerts, { headers: corsHeaders });
  });

  // POST /api/telemetry/alerts/check - Manually check for alerts
  srv.post("/api/telemetry/alerts/check", (req) => {
    const url = new URL(req.url);
    const environment = url.searchParams.get("env") || ENVIRONMENT_VALUE;

    const detectedAlerts = telemetry.checkAlerts(environment);

    return Response.json({
      success: true,
      detected: detectedAlerts.length,
      alerts: detectedAlerts,
    }, { headers: corsHeaders });
  });

  // POST /api/telemetry/alerts/resolve/:id - Resolve telemetry alert
  srv.post("/api/telemetry/alerts/resolve/:id/*", (req) => {
    const url = new URL(req.url);
    const id = parseInt(req.params?.id || url.pathname.split("/").pop() || "0");

    if (isNaN(id)) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid alert ID",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const success = telemetry.resolveAlert(id);

    if (!success) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Alert not found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    return Response.json(
      {
        success: true,
        message: "Alert resolved successfully",
      },
      { headers: corsHeaders }
    );
  });

  // GET /api/telemetry/traces - Get performance traces
  srv.get("/api/telemetry/traces", (req) => {
    const url = new URL(req.url);
    const methodKey = url.searchParams.get("method");
    const limit = parseInt(url.searchParams.get("limit") || "100");

    const traces = telemetry.getTracesByMethodKey(methodKey || undefined, limit);

    return Response.json(traces, { headers: corsHeaders });
  });

  // GET /api/telemetry/traces/stats - Get trace statistics
  srv.get("/api/telemetry/traces/stats", (req) => {
    const url = new URL(req.url);
    const methodKey = url.searchParams.get("method");

    const stats = telemetry.getTraceStatistics(methodKey || undefined);

    return Response.json(stats, { headers: corsHeaders });
  });

  // POST /api/telemetry/traces/clear - Clear old traces
  srv.post("/api/telemetry/traces/clear", async (req) => {
    const body = await req.json();
    const olderThanHours = body?.olderThanHours || 24;

    telemetry.clearOldTraces(olderThanHours);

    return Response.json({
      success: true,
      message: `Cleared traces older than ${olderThanHours} hours`,
    }, { headers: corsHeaders });
  });

  // GET /api/telemetry/snapshots - Get system snapshots
  srv.get("/api/telemetry/snapshots", (req) => {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");

    const snapshots = telemetry.getSnapshots(limit);

    return Response.json(snapshots, { headers: corsHeaders });
  });

  // GET /api/telemetry/snapshots/latest - Get latest snapshot
  srv.get("/api/telemetry/snapshots/latest", (req) => {
    const url = new URL(req.url);
    const environment = url.searchParams.get("env") || ENVIRONMENT_VALUE;

    const snapshot = telemetry.getLatestSnapshot(environment);

    if (!snapshot) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "No snapshots found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    return Response.json(snapshot, { headers: corsHeaders });
  });

  // POST /api/telemetry/snapshots/take - Manually take snapshot
  srv.post("/api/telemetry/snapshots/take", async (req) => {
    const body = await req.json();
    const label = body?.label || "manual";
    const environment = body?.env || ENVIRONMENT_VALUE;

    const snapshot = telemetry.takeSnapshot(label, environment);

    return Response.json({
      success: true,
      snapshot,
    }, { headers: corsHeaders });
  });

  // GET /api/telemetry/config - Get telemetry configuration
  srv.get("/api/telemetry/config", () => {
    const config = telemetry.getConfig();

    return Response.json(config, { headers: corsHeaders });
  });

  // PUT /api/telemetry/config - Update telemetry configuration
  srv.post("/api/telemetry/config", async (req) => {
    try {
      const updates = await req.json();

      telemetry.updateConfig(updates);

      return Response.json({
        success: true,
        message: "Configuration updated",
        config: telemetry.getConfig(),
      }, { headers: corsHeaders });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: "Failed to update configuration",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
  });

  // GET /api/telemetry/health - Get telemetry system health
  srv.get("/api/telemetry/health", () => {
    const health = telemetry.getHealth();

    return Response.json(health, { headers: corsHeaders });
  });
}

// Setup Bun profiling API endpoints
setupBunProfilingAPI(server);

// Setup upload API endpoints
setupUploadAPI(server);

/**
 * Bun Profiling API - JavaScript heap and memory profiling
 */
function setupBunProfilingAPI(srv: BunServe): void {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  srv.addRoute("OPTIONS", "/api/profiling/*", () => new Response(null, { headers: corsHeaders }));

  /**
   * GET /api/profiling/memory/heap
   * Get detailed JavaScript heap statistics
   */
  srv.get("/api/profiling/memory/heap", () => {
    const heapStats = getJavaScriptHeapStats();

    return Response.json(heapStats, { headers: corsHeaders });
  });

  /**
   * GET /api/profiling/memory/detailed
   * Get detailed memory usage with efficiency metrics
   */
  srv.get("/api/profiling/memory/detailed", () => {
    const detailed = getDetailedMemoryUsage();

    return Response.json(detailed, { headers: corsHeaders });
  });

  /**
   * GET /api/profiling/memory/health
   * Get memory health score and issues
   */
  srv.get("/api/profiling/memory/health", () => {
    const health = getMemoryHealthScore();

    return Response.json(health, { headers: corsHeaders });
  });

  /**
   * GET /api/profiling/memory/top-objects
   * Get top object types by count
   */
  srv.get("/api/profiling/memory/top-objects", (req) => {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "10");

    const heapStats = getJavaScriptHeapStats();
    const topObjects = getTopObjectTypes(heapStats, limit);

    return Response.json(topObjects, { headers: corsHeaders });
  });

  /**
   * GET /api/profiling/memory/trend
   * Get memory trend data
   */
  srv.get("/api/profiling/memory/trend", (req) => {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "20");

    const trend = getMemoryTrend(limit);

    return Response.json(trend, { headers: corsHeaders });
  });

  /**
   * GET /api/profiling/memory/growth-rate
   * Calculate memory growth rate
   */
  srv.get("/api/profiling/memory/growth-rate", (req) => {
    const url = new URL(req.url);
    const windowMs = parseInt(url.searchParams.get("window") || "60000");

    const growthRate = calculateMemoryGrowthRate(windowMs);

    return Response.json(growthRate, { headers: corsHeaders });
  });

  /**
   * GET /api/profiling/memory/report
   * Get comprehensive memory report
   */
  srv.get("/api/profiling/memory/report", () => {
    const report = getMemoryReport();

    return Response.json(report, { headers: corsHeaders });
  });

  /**
   * POST /api/profiling/memory/snapshot
   * Take a heap snapshot
   */
  srv.post("/api/profiling/memory/snapshot", async (req) => {
    try {
      const body = await req.json();
      const label = body?.label || "manual";

      const snapshot = await takeHeapSnapshot(label);

      // Publish via WebSocket
      server.publish?.(WEBSOCKET.DASHBOARD_CHANNEL, JSON.stringify({
        type: "heap-snapshot-taken",
        data: snapshot,
      }));

      return Response.json(
        {
          success: true,
          snapshot,
        },
        { headers: corsHeaders }
      );
    } catch (error) {
      return Response.json(
        {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
  });

  /**
   * POST /api/profiling/memory/gc
   * Force garbage collection
   */
  srv.post("/api/profiling/memory/gc", async (req) => {
    try {
      const body = await req.json();
      const sync = body?.sync !== false; // Default to true

      const before = getDetailedMemoryUsage();
      forceGarbageCollection(sync);
      const after = getDetailedMemoryUsage();

      const freed = before.process.heapUsed - after.process.heapUsed;

      return Response.json(
        {
          success: true,
          before: before.calculated,
          after: after.calculated,
          freed: Number(freed.toFixed(2)),
          freedPercent: Number(((freed / before.process.heapUsed) * 100).toFixed(2)),
        },
        { headers: corsHeaders }
      );
    } catch (error) {
      return Response.json(
        {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
  });
}

/**
 * Upload API endpoints (feature-guarded)
 */
function setupUploadAPI(srv: BunServe): void {
  // Compile-time elimination check
  try {
    // @ts-ignore - feature() from bun:bundle
    if (typeof feature === "function" && !feature("FEAT_CLOUD_UPLOAD", false)) {
      return;
    }
  } catch {
    // If feature() is not available, continue anyway
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // OPTIONS handler for CORS preflight
  srv.options("/api/upload/*", () => new Response(null, { headers: corsHeaders }));

  /**
   * POST /api/upload/initiate
   * Start a new upload
   */
  srv.post("/api/upload/initiate", async (req) => {
    try {
      const formData = await req.formData();
      const file = formData.get("file") as File;

      if (!file) {
        return new Response(
          JSON.stringify({ error: "No file provided" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Validate file size
      if (file.size > UPLOAD.MAX_MULTIPART_SIZE) {
        return new Response(
          JSON.stringify({
            error: `File size exceeds maximum of ${UPLOAD.MAX_MULTIPART_SIZE} bytes`
          }),
          { status: 413, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const uploadResult = await uploadService.initiateUpload(file, {
        filename: formData.get("filename") as string || file.name,
        contentType: formData.get("contentType") as string || file.type || UPLOAD.CONTENT_TYPES.APPLICATION_OCTET_STREAM,
        contentDisposition: formData.get("contentDisposition") as "inline" | "attachment" | null,
        metadata: formData.get("metadata") ? JSON.parse(formData.get("metadata") as string) : undefined,
      });

      // Record telemetry
      try {
        telemetry.recordUpload({
          uploadId: uploadResult.uploadId,
          filename: uploadResult.filename,
          fileSize: uploadResult.size,
          duration: uploadResult.duration,
          status: "success",
          provider: uploadResult.provider,
          timestamp: Date.now(),
          uploadSpeed: uploadResult.size / (uploadResult.duration / 1000),
        });
      } catch (telemetryError) {
        console.error("Failed to record upload telemetry:", telemetryError);
      }

      return Response.json({ success: true, ...uploadResult }, { headers: corsHeaders });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
  });

  /**
   * GET /api/upload/status/:id
   * Get upload progress
   */
  srv.get("/api/upload/status/:id", (req) => {
    const url = new URL(req.url);
    const id = url.pathname.split("/").pop() || "";
    const progress = uploadService.getProgress(id);

    if (!progress) {
      return new Response(
        JSON.stringify({ error: "Upload not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return Response.json(progress, { headers: corsHeaders });
  });

  /**
   * GET /api/uploads/active
   * Get all active uploads
   */
  srv.get("/api/uploads/active", () => {
    const activeUploads = uploadService.getActiveUploads();
    return Response.json(activeUploads, { headers: corsHeaders });
  });

  /**
   * POST /api/upload/cancel/:id
   * Cancel an upload
   */
  srv.post("/api/upload/cancel/:id", (req) => {
    const url = new URL(req.url);
    const id = url.pathname.split("/").pop() || "";
    const cancelled = uploadService.cancelUpload(id);

    if (!cancelled) {
      return new Response(
        JSON.stringify({ error: "Upload not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return Response.json({ success: true }, { headers: corsHeaders });
  });

  /**
   * GET /api/uploads/telemetry
   * Get upload metrics (feature-guarded)
   */
  srv.get("/api/uploads/telemetry", (req) => {
    try {
      // @ts-ignore - feature() from bun:bundle
      if (typeof feature === "function" && !feature("FEAT_UPLOAD_ANALYTICS", false)) {
        return new Response(
          JSON.stringify({ error: "Upload analytics not enabled" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    } catch {
      // If feature() is not available, continue anyway
    }

    const stats = telemetry.getUploadStats();
    return Response.json(stats, { headers: corsHeaders });
  });

  /**
   * GET /api/uploads/recent
   * Get recent uploads (feature-guarded)
   */
  srv.get("/api/uploads/recent", (req) => {
    try {
      // @ts-ignore - feature() from bun:bundle
      if (typeof feature === "function" && !feature("FEAT_UPLOAD_ANALYTICS", false)) {
        return new Response(
          JSON.stringify({ error: "Upload analytics not enabled" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    } catch {
      // If feature() is not available, continue anyway
    }

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const recentUploads = telemetry.getRecentUploads(limit);
    return Response.json(recentUploads, { headers: corsHeaders });
  });
}

// Serve static dashboard files
server.get("/dashboard", () => {
  const indexPath = path.join(DIST_DIR, "index.html");
  const indexFile = Bun.file(indexPath);

  return new Response(indexFile, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
});

// Serve dashboard assets (JS, CSS, etc.)
server.get("/dashboard/assets/*", (req) => {
  const url = new URL(req.url);
  const assetPath = path.join(DIST_DIR, url.pathname);
  const assetFile = Bun.file(assetPath);

  // Determine content type based on extension
  const ext = path.extname(assetPath);
  const contentTypes: Record<string, string> = {
    ".js": "application/javascript",
    ".css": "text/css",
    ".html": "text/html",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
  };

  const contentType = contentTypes[ext] || "application/octet-stream";

  return new Response(assetFile, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": `public, max-age=${HTTP.CACHE_MAX_AGE}`,
    },
  });
});

// Root redirect to dashboard
server.get("/", () => {
  return new Response("", {
    status: 302,
    headers: { Location: "/dashboard" },
  });
});

// WebSocket for real-time updates
server.websocket({
  open(ws) {
    console.log("📊 Dashboard WebSocket connected");
    ws.subscribe(WEBSOCKET.DASHBOARD_CHANNEL);

    // Send initial monitoring summary
    const summary = monitoring.getSummary();
    ws.send(JSON.stringify({
      type: "monitoring-summary",
      data: summary,
    }));
  },
  message(ws, message) {
    // Echo back for now
    ws.publish(WEBSOCKET.DASHBOARD_CHANNEL, message);
  },
  close(ws, code, reason) {
    console.log(`📊 Dashboard WebSocket disconnected: ${code} ${reason}`);
  },
});

// Metrics publishing interval (every 1 second)
let metricsInterval: ReturnType<typeof setInterval> | null = null;

// Start telemetry snapshot interval (every hour)
setInterval(() => {
  telemetry.takeSnapshot("hourly", ENVIRONMENT_VALUE);
}, INTERVALS.SNAPSHOT);

// Start telemetry alert checking (every 5 minutes)
setInterval(() => {
  try {
    const detectedAlerts = telemetry.checkAlerts(ENVIRONMENT_VALUE);
    if (detectedAlerts.length > 0) {
      console.log(`📈 Telemetry: Detected ${detectedAlerts.length} alerts`);

      // Publish alerts via WebSocket
      const alertMessage = {
        type: WEBSOCKET.MESSAGE_TYPES.TELEMETRY_ALERTS,
        data: {
          count: detectedAlerts.length,
          alerts: detectedAlerts,
          timestamp: Date.now(),
        },
      };
      server.publish?.(WEBSOCKET.DASHBOARD_CHANNEL, JSON.stringify(alertMessage));
    }
  } catch (error) {
    console.error("Error checking telemetry alerts:", error);
  }
}, INTERVALS.TELEMETRY_ALERT_CHECK);

// Publish upload progress periodically (if feature enabled)
setInterval(() => {
  try {
    // @ts-ignore - feature() from bun:bundle
    if (typeof feature === "function" && !feature("FEAT_UPLOAD_PROGRESS", false)) {
      return;
    }
  } catch {
    // If feature() is not available, continue anyway
  }

  const activeUploads = uploadService.getActiveUploads();

  activeUploads.forEach(upload => {
    if (upload.status === "uploading") {
      const progressMessage = {
        type: WEBSOCKET.MESSAGE_TYPES.UPLOAD_PROGRESS,
        data: upload,
      };
      server.publish?.(WEBSOCKET.DASHBOARD_CHANNEL, JSON.stringify(progressMessage));
    }
  });
}, UPLOAD.PROGRESS_INTERVAL);

server.start();

// Start publishing metrics
metricsInterval = setInterval(() => {
  const memory = process.memoryUsage();
  const cpu = process.cpuUsage();

  // Record memory trend for Bun profiling
  recordMemoryTrend();

  // Log metrics to terminal with Unicode-aware alignment (every 30 seconds)
  if (Date.now() % INTERVALS.MONITORING_SUMMARY < INTERVALS.METRICS_PUBLISH) {
    const memoryMB = (memory.heapUsed / 1024 / 1024).toFixed(2);
    const uptime = Math.floor(process.uptime());

    console.log(""); // Blank line for separation
    renderMetric("⏱️", "Uptime", `${uptime}s`);
    renderMetric("💾", "Memory Used", `${memoryMB} MB`);
    renderMetric("📊", "Active Connections", monitoring.getSummary().totalRequests.toString());
    console.log(""); // Blank line for separation
  }

  const metrics = {
    type: "metrics",
    data: {
      uptime: process.uptime(),
      memory: {
        rss: memory.rss,
        heapTotal: memory.heapTotal,
        heapUsed: memory.heapUsed,
      },
      cpu: {
        user: cpu.user,
        system: cpu.system,
      },
      timestamp: Date.now(),
    },
  };

  // Publish monitoring summary every 30 seconds
  if (Date.now() % INTERVALS.MONITORING_SUMMARY < INTERVALS.METRICS_PUBLISH) {
    const monitoringSummary = {
      type: WEBSOCKET.MESSAGE_TYPES.MONITORING_SUMMARY,
      data: monitoring.getSummary(),
    };
    server.publish?.(WEBSOCKET.DASHBOARD_CHANNEL, JSON.stringify(monitoringSummary));
  }

  // Publish to all dashboard subscribers
  server.publish?.(WEBSOCKET.DASHBOARD_CHANNEL, JSON.stringify(metrics));
}, INTERVALS.METRICS_PUBLISH);

// Cleanup old monitoring data daily (runs every hour, checks if 24h passed)
setInterval(() => {
  const deleted = monitoring.cleanup(7); // Keep last 7 days
  if (deleted > 0) {
    console.log(`🧹 Cleaned up ${deleted} old monitoring events`);
  }
}, INTERVALS.DATA_CLEANUP);

// Run anomaly detection periodically (every 10 minutes)
setInterval(async () => {
  try {
    const detectedAnomalies = await anomalyDetection.detectAnomalies(ENVIRONMENT_VALUE);
    if (detectedAnomalies.length > 0) {
      console.log(`📊 Detected ${detectedAnomalies.length} anomalies`);

      // Publish anomalies via WebSocket
      const anomalyMessage = {
        type: WEBSOCKET.MESSAGE_TYPES.ANOMALIES_DETECTED,
        data: {
          count: detectedAnomalies.length,
          anomalies: detectedAnomalies,
          timestamp: Date.now(),
        },
      };
      server.publish?.(WEBSOCKET.DASHBOARD_CHANNEL, JSON.stringify(anomalyMessage));
    }
  } catch (error) {
    console.error("Error running anomaly detection:", error);
  }
}, INTERVALS.ANOMALY_DETECTION);

// Render status box with proper Unicode alignment
renderStatusBox();

// Graceful shutdown
const shutdown = async () => {
  console.log("\n🛑 Shutting down dashboard server...");

  if (metricsInterval) {
    clearInterval(metricsInterval);
  }

  monitoring.close();
  auth.close();
  alerts.close();
  geoLocation.close();
  anomalyDetection.close();
  dashboardConfig.close();
  socketInspection.close();
  telemetry.close();
  await server.stop();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
