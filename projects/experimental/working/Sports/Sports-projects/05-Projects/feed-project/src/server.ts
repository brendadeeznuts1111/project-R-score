// Feed Project - MCP Tool Server
//
// Routes:
// GET  /health                    - Server health
// GET  /api/dashboard/:id         - Get enhanced dashboard config
// GET  /api/dashboard/:id/css     - Get CSS variables
// GET  /api/fields                - List all field mappings
// GET  /api/fields/:name          - Get specific field mapping

import type { EnhancedDashboardConfig } from "./types";
import { FIELD_MAPPINGS } from "./types";
import { generateCssVariables } from "./field-mapping";

// Mock dashboard store (replace with actual loader)
const dashboards: Map<string, EnhancedDashboardConfig> = new Map();

export function createServer(port: number = 0) {
  return Bun.serve({
    port,
    routes: {
      "/health": () => {
        return Response.json({
          status: "ok",
          fields: FIELD_MAPPINGS.length,
          timestamp: Date.now(),
        });
      },

      "/api/dashboard/:id": (req) => {
        const dashboard = dashboards.get(req.params.id);
        if (!dashboard) {
          return Response.json({ error: "Dashboard not found" }, { status: 404 });
        }
        return Response.json(dashboard);
      },

      "/api/dashboard/:id/css": (req) => {
        const dashboard = dashboards.get(req.params.id);
        if (!dashboard) {
          return Response.json({ error: "Dashboard not found" }, { status: 404 });
        }
        const cssVars = generateCssVariables(dashboard);
        return Response.json(cssVars);
      },

      "/api/fields": () => {
        return Response.json(FIELD_MAPPINGS);
      },

      "/api/fields/:name": (req) => {
        const mapping = FIELD_MAPPINGS.find((m) => m.field === req.params.name);
        if (!mapping) {
          return Response.json({ error: "Field not found" }, { status: 404 });
        }
        return Response.json(mapping);
      },

      "/api/*": Response.json({ error: "Not found" }, { status: 404 }),
    },

    fetch(req) {
      return Response.json({ error: "Not found" }, { status: 404 });
    },

    error(error: Error) {
      return Response.json({ error: error.message }, { status: 500 });
    },
  });
}

// MCP tool handler
export function getDashboardInfo(dashboardId: string): EnhancedDashboardConfig | null {
  return dashboards.get(dashboardId) ?? null;
}

export function registerDashboard(config: EnhancedDashboardConfig): void {
  dashboards.set(config.id, config);
}

// Entry point
if (import.meta.main) {
  const port = Number(Bun.env.PORT) || 3002;
  const server = createServer(port);
  console.log(`[feed] Field mapping server: http://localhost:${server.port}`);
  console.log(`[feed] Routes: /health, /api/fields, /api/dashboard/:id`);
}
