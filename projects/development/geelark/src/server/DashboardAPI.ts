/**
 * Dashboard API - Endpoints for the Feature Flag Dashboard
 *
 * Provides API endpoints for feature flags, builds, metrics, and health
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { BunServe } from "./BunServe.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");

/**
 * Setup dashboard API endpoints
 */
export function setupDashboardAPI(server: BunServe): void {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // Handle CORS preflight
  server.addRoute("OPTIONS", "/api/*", () => new Response(null, { headers: corsHeaders }));

  /**
   * GET /api/flags/meta
   * Serve the meta.json file
   */
  server.get("/api/flags/meta", async () => {
    const metaPath = path.join(ROOT_DIR, "meta.json");
    const metaFile = Bun.file(metaPath);
    const metaContent = await metaFile.text();

    return new Response(metaContent, {
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  });

  /**
   * GET /api/flags/merged
   * Get merged feature flags from meta.json and Architect constants
   */
  server.get("/api/flags/merged", async () => {
    // Get meta.json flags
    const metaPath = path.join(ROOT_DIR, "meta.json");
    const meta = await Bun.file(metaPath).json();

    // Architect-specific flags not in meta.json
    const architectFlags = [
      {
        id: "INTEGRATION_GEELARK_API",
        name: "GEELARK API",
        description: "GeeLark API integration",
        category: "integration",
        critical: true,
        badge: { enabled: "🔌 GEELARK API", disabled: "🔌 NO API" },
        impact: { bundleSize: "+20%", performance: "neutral", security: "neutral" },
        default: false
      },
      {
        id: "INTEGRATION_PROXY_SERVICE",
        name: "PROXY",
        description: "Built-in proxy routing",
        category: "integration",
        badge: { enabled: "🌐 PROXY", disabled: "🔌 DIRECT" },
        impact: { bundleSize: "+10%", performance: "+5%", security: "neutral" },
        default: false
      },
      {
        id: "INTEGRATION_EMAIL_SERVICE",
        name: "EMAIL",
        description: "SMTP/SES connector",
        category: "integration",
        badge: { enabled: "📧 EMAIL", disabled: "📧 NO EMAIL" },
        impact: { bundleSize: "+8%", performance: "neutral", security: "neutral" },
        default: false
      },
      {
        id: "INTEGRATION_SMS_SERVICE",
        name: "SMS",
        description: "Twilio/SMS connector",
        category: "integration",
        badge: { enabled: "📱 SMS", disabled: "📱 NO SMS" },
        impact: { bundleSize: "+6%", performance: "neutral", security: "neutral" },
        default: false
      },
      {
        id: "FEAT_FREE",
        name: "FREE",
        description: "Baseline functionality",
        category: "tier",
        badge: { enabled: "🔓 FREE", disabled: "🔓 FREE" },
        impact: { bundleSize: "0%", performance: "neutral", security: "neutral" },
        default: true
      },
      {
        id: "FEAT_ENTERPRISE",
        name: "ENTERPRISE",
        description: "Enterprise tier features",
        category: "tier",
        badge: { enabled: "🏢 ENTERPRISE", disabled: "🔓 STANDARD" },
        impact: { bundleSize: "+25%", performance: "+8%", security: "neutral" },
        default: false
      },
      {
        id: "ENV_STAGING",
        name: "STAGING",
        description: "Staging environment settings",
        category: "environment",
        badge: { enabled: "🌍 STAGING", disabled: "🌍 OTHER" },
        impact: { bundleSize: "0%", performance: "neutral", security: "neutral" },
        default: false
      },
      {
        id: "ENV_TEST",
        name: "TEST",
        description: "Test execution environment",
        category: "environment",
        badge: { enabled: "🧪 TEST", disabled: "🌍 OTHER" },
        impact: { bundleSize: "+5%", performance: "neutral", security: "neutral" },
        default: false
      }
    ];

    // Start with meta.json categories
    const mergedCategories = meta.featureFlags?.categories || [];

    // Create a map of existing flags by ID
    const existingFlagIds = new Set();
    mergedCategories.forEach((cat: any) => {
      (cat.flags || []).forEach((flagId: string) => {
        existingFlagIds.add(flagId);
      });
    });

    // Add Architect-specific flags
    const mergedFlags = meta.featureFlags?.flags || {};
    architectFlags.forEach(flag => {
      // Add flag if not already in meta.json
      if (!existingFlagIds.has(flag.id)) {
        mergedFlags[flag.id] = flag;
      }
    });

    // Ensure integration category exists
    const integrationCategory = mergedCategories.find((cat: any) => cat.id === "integration");
    if (!integrationCategory) {
      mergedCategories.push({
        id: "integration",
        name: "Integration",
        description: "External service integrations",
        flags: ["INTEGRATION_GEELARK_API", "INTEGRATION_PROXY_SERVICE", "INTEGRATION_EMAIL_SERVICE", "INTEGRATION_SMS_SERVICE"]
      });
    }

    return Response.json({
      categories: mergedCategories,
      flags: mergedFlags,
      architectFlags: architectFlags.map(f => f.id)
    }, { headers: corsHeaders });
  });

  /**
   * GET /api/build/configs
   * Get build configurations from meta.json
   */
  server.get("/api/build/configs", async () => {
    const metaPath = path.join(ROOT_DIR, "meta.json");
    const meta = await Bun.file(metaPath).json();

    return Response.json(meta.build?.configurations || [], {
      headers: corsHeaders,
    });
  });

  /**
   * POST /api/build/trigger
   * Trigger a build with specified flags
   */
  server.post("/api/build/trigger", async (req) => {
    try {
      const { configName, flags } = await req.json();

      if (!configName || !flags) {
        return new Response(
          JSON.stringify({ error: "Missing configName or flags" }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          }
        );
      }

      // Validate flags array
      if (!Array.isArray(flags) || flags.length === 0) {
        return new Response(
          JSON.stringify({ error: "Flags must be a non-empty array" }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          }
        );
      }

      // Build the command
      const flagsStr = flags.join(",");
      const outDir = `./dist/${configName}`;

      // Execute the build command
      const command = `bun build ./src/index.ts --outdir=${outDir} --features=${flagsStr} --minify`;
      const proc = Bun.spawn(command, {
        cwd: ROOT_DIR,
        stdout: "pipe",
        stderr: "pipe",
      } as any);

      // Wait for the process to complete
      const output = await proc.exited;
      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();

      const success = output === 0;

      return Response.json(
        {
          status: success ? "success" : "failed",
          config: configName,
          flags,
          exitCode: output,
          stdout,
          stderr,
        },
        { headers: corsHeaders }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Build failed",
          message: error instanceof Error ? error.message : String(error),
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }
  });

  /**
   * GET /api/metrics
   * Get runtime metrics
   */
  server.get("/api/metrics", () => {
    const memory = process.memoryUsage();
    const cpu = process.cpuUsage();

    return Response.json(
      {
        uptime: process.uptime(),
        memory: {
          rss: memory.rss,
          heapTotal: memory.heapTotal,
          heapUsed: memory.heapUsed,
          external: memory.external,
        },
        cpu: {
          user: cpu.user,
          system: cpu.system,
        },
        timestamp: Date.now(),
        pid: process.pid,
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
      },
      { headers: corsHeaders }
    );
  });

  /**
   * GET /api/health
   * Health check endpoint
   */
  server.get("/api/health", () => {
    return Response.json(
      {
        status: "healthy",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
      { headers: corsHeaders }
    );
  });

  /**
   * GET /api/info
   * Get system information
   */
  server.get("/api/info", async () => {
    const metaPath = path.join(ROOT_DIR, "meta.json");
    const meta = await Bun.file(metaPath).json();

    return Response.json(
      {
        system: meta.system || {},
        build: meta.build?.runtime || {},
      },
      { headers: corsHeaders }
    );
  });
}
