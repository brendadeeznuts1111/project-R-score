#!/usr/bin/env bun

// Standalone T3-Lattice Dashboard Server
// Uses Bun's native CSS import for clean separation

import { COMPONENTS, VIEWS, getViewComponents, getViewConfig, renderGraphASCII } from "../src/core.ts";
import css from "./dashboard.css" with { type: "text" };
import { dnsCacheManager } from "../src/dns-cache.ts";
import config from "../config.toml" with { type: "toml" };

interface DashboardConfig {
  port: number;
  host?: string;
  title?: string;
  theme?: "light" | "dark" | "auto";
  headers?: Record<string, string>;
  cors?: boolean;
  timeout?: number;
}

function generateDashboardHTML(view: keyof typeof VIEWS = "overview"): string {
  const components = getViewComponents(view);
  const viewConfig = getViewConfig(view);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.name} ${config.version}</title>
  <style>${css}</style>
</head>
<body>
  <div class="header">
    <h1>🚀 ${config.name} ${config.version}</h1>
    <p>${config.registry.scope} • ${viewConfig?.description || "Component Registry"}</p>
  </div>

  <div class="tabs">
    <a class="tab ${view === 'overview' ? 'active' : ''}" href="?view=overview">Overview</a>
    <a class="tab ${view === 'detail' ? 'active' : ''}" href="?view=detail">Detail</a>
    <a class="tab ${view === 'expert' ? 'active' : ''}" href="?view=expert">Expert</a>
  </div>

  <div class="stats">
    <div class="stat">
      <div class="stat-value">${components.length}</div>
      <div class="stat-label">Components</div>
    </div>
    <div class="stat">
      <div class="stat-value">${new Set(components.map(c => c.category)).size}</div>
      <div class="stat-label">Categories</div>
    </div>
    <div class="stat">
      <div class="stat-value">${new Set(components.map(c => c.bunVersion)).size}</div>
      <div class="stat-label">Version Types</div>
    </div>
    <div class="stat">
      <div class="stat-value">${components.filter(c => c.status === 'stable').length}</div>
      <div class="stat-label">Stable</div>
    </div>
  </div>

  <div class="grid">
    ${components.map(comp => `
      <div class="card">
        <div class="card-header">
          <span class="color-dot" style="background: ${comp.color.hex}"></span>
          <span class="card-id">#${comp.id.toString().padStart(2, '0')}</span>
          <span class="card-name">${comp.name}</span>
        </div>
        <p style="font-size: 12px; color: var(--text-secondary);">${comp.description}</p>
        <div class="card-meta">
          <span>${comp.slot}</span>
          <span>${comp.category}</span>
          <span class="badge badge-${comp.status}">${comp.status}</span>
        </div>
      </div>
    `).join("")}
  </div>

  <div class="graph-section">
    <h3>Dependency Graph</h3>
    <pre id="graph">${renderGraphASCII()}</pre>
  </div>
</body>
</html>`;
}

function startDashboard(runtimeConfig: DashboardConfig = {}): void {
  // Merge TOML config with runtime config
  const mergedConfig: DashboardConfig = {
    port: runtimeConfig.port ?? config.server.port,
    host: runtimeConfig.host ?? config.server.host,
    title: runtimeConfig.title ?? config.name,
    theme: runtimeConfig.theme ?? "auto",
    headers: { ...config.server.headers, ...runtimeConfig.headers },
    cors: runtimeConfig.cors ?? config.server.cors,
    timeout: runtimeConfig.timeout ?? config.server.timeout
  };

  const defaultHeaders = {
    "X-Powered-By": "T3-Lattice",
    "X-Version": config.version,
    "X-Timestamp": new Date().toISOString(),
    ...mergedConfig.headers
  };

  const server = Bun.serve({
    port: mergedConfig.port,
    hostname: mergedConfig.host || "0.0.0.0",
    fetch(req) {
      const url = new URL(req.url);

      // Health check endpoint
      if (url.pathname === "/health") {
        const health = {
          status: "healthy",
          timestamp: new Date().toISOString(),
          version: config.version,
          components: config.components.total,
          categories: config.components.categories,
          stable: config.components.stable,
          beta: config.components.beta,
          experimental: config.components.experimental,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          platform: `${process.platform} ${process.arch}`,
          bun: Bun.version,
          server: {
            port: mergedConfig.port,
            host: mergedConfig.host,
            cors: mergedConfig.cors,
            timeout: mergedConfig.timeout
          },
          registry: {
            base_url: config.registry.base_url,
            scope: config.registry.scope,
            cache_enabled: config.registry.cache_enabled,
            cache_max_age: config.registry.cache_max_age
          }
        };

        const responseHeaders = {
          "Content-Type": "application/json",
          ...defaultHeaders
        };

        if (config.cors) {
          responseHeaders["Access-Control-Allow-Origin"] = "*";
          responseHeaders["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
          responseHeaders["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
        }

        return new Response(JSON.stringify(health, null, 2), {
          headers: responseHeaders
        });
      }

      // API endpoints for prefetching
      if (url.pathname === "/api/prefetch/dns") {
        // DNS prefetching endpoint using advanced DNS cache manager
        const dnsHosts = config.prefetch.dns_enabled ? config.prefetch.dns_hosts : [];

        // Trigger advanced DNS prefetching and caching
        if (config.prefetch.dns_enabled) {
          dnsCacheManager.prefetchHosts(dnsHosts).catch(err =>
            console.error('DNS prefetch failed:', err)
          );
        }

        // Get DNS cache statistics
        const dnsStats = dnsCacheManager.getStats();

        return new Response(JSON.stringify({
          status: config.prefetch.dns_enabled ? "prefetching" : "disabled",
          type: "dns",
          enabled: config.prefetch.dns_enabled,
          hosts: dnsHosts,
          cacheStats: dnsStats
        }), {
          headers: {
            "Content-Type": "application/json",
            ...defaultHeaders,
            ...(config.cors ? {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type, Authorization"
            } : {})
          }
        });
      }

      if (url.pathname === "/api/prefetch/db") {
        // Database prefetching endpoint (simulated)
        const dbConnections = config.prefetch.db_enabled ? config.prefetch.db_connections : [];

        return new Response(JSON.stringify({
          status: config.prefetch.db_enabled ? "prefetching" : "disabled",
          type: "database",
          enabled: config.prefetch.db_enabled,
          connections: dbConnections,
          note: config.prefetch.db_enabled ? "Database connections simulated for demo" : "Database prefetching disabled"
        }), {
          headers: {
            "Content-Type": "application/json",
            ...defaultHeaders,
            ...(config.cors ? {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type, Authorization"
            } : {})
          }
        });
      }

      // Main dashboard
      const searchParams = url.searchParams;
      const view = (searchParams.get("view") as keyof typeof VIEWS) || "overview";

      if (!["overview", "detail", "expert"].includes(view)) {
        return new Response("Invalid view", { status: 400 });
      }

      return new Response(generateDashboardHTML(view), {
        headers: {
          "Content-Type": "text/html",
          ...defaultHeaders,
          ...(config.cors ? {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization"
          } : {})
        }
      });
    }
  });

  console.log(`
╔════════════════════════════════════════════════════════════╗
║  🚀 ${config.name} ${config.version}                       ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
║  URL: http://${mergedConfig.host}:${server.port}             ║
║  Health: http://${mergedConfig.host}:${server.port}/health    ║
║  API: /api/prefetch/dns | /api/prefetch/db                  ║
║  View: overview | detail | expert                           ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   ║
║  Config: Loaded from config.toml                           ║
║  CSS: Loaded via Bun native import                         ║
║  Press Ctrl+C to stop                                      ║
╚════════════════════════════════════════════════════════════╝
  `);
}

// Export functions for testing
export { generateDashboardHTML, startDashboard };

// Auto-start the dashboard
startDashboard();