#!/usr/bin/env bun

/**
 * Inspection Server with Full Hierarchy
 * 
 * HTTP server exposing the complete hierarchical inspection system
 * with JSON, HTML table, and real-time debugging capabilities.
 */

import { DomainContext } from "./contexts/DomainContext.js";
import { ScopeContext } from "./contexts/ScopeContext.js";
import * as config from "./config/scope.config.js";

// Expose global for quick access in REPL/debug
(globalThis as any).SCOPE = config.SCOPE;
(globalThis as any).DOMAIN = config.DOMAIN;
(globalThis as any).PLATFORM = config.PLATFORM;

const domainCtx = new DomainContext(config.DOMAIN);

/**
 * Convert inspectable object to serializable format
 */
function serializable(obj: any): any {
  if (obj && typeof obj === "object") {
    if (typeof obj[Symbol.for("Bun.inspect.custom")] === "function") {
      return serializable(obj[Symbol.for("Bun.inspect.custom")]());
    }
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = serializable(v);
    }
    return out;
  }
  return obj;
}

/**
 * Generate HTML table from inspection data
 */
function generateHTMLTable(data: any): string {
  const tableHtml = Bun.inspect.table(data, {
    depth: 8,
    colors: true,
    maxArrayLength: 10,
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FactoryWager Inspection System</title>
  <style>
    body {
      font-family: ui-monospace, 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
      background: #3b82f6;
      color: #3b82f6;
      margin: 0;
      padding: 2rem;
      line-height: 1.5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      color: #3b82f6;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 0.5rem;
      margin-bottom: 2rem;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .info-card {
      background: #3b82f6;
      border: 1px solid #3b82f6;
      border-radius: 6px;
      padding: 1rem;
    }
    .info-card h3 {
      margin: 0 0 0.5rem 0;
      color: #3b82f6;
      font-size: 0.875rem;
    }
    .info-card p {
      margin: 0;
      color: #3b82f6;
      font-size: 0.875rem;
    }
    pre {
      background: #3b82f6;
      border: 1px solid #3b82f6;
      border-radius: 6px;
      padding: 1rem;
      overflow: auto;
      font-size: 0.875rem;
      line-height: 1.4;
    }
    .nav {
      margin-bottom: 2rem;
    }
    .nav a {
      color: #3b82f6;
      text-decoration: none;
      margin-right: 1rem;
      padding: 0.5rem 1rem;
      border: 1px solid #3b82f6;
      border-radius: 6px;
      transition: all 0.2s;
    }
    .nav a:hover {
      background: #3b82f6;
      border-color: #3b82f6;
    }
    .nav a.active {
      background: #3b82f6;
      border-color: #3b82f6;
      color: white;
    }
    .timestamp {
      color: #3b82f6;
      font-size: 0.875rem;
      margin-bottom: 1rem;
    }
    .badge {
      background: #3b82f6;
      color: white;
      padding: 0.125rem 0.375rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🧩 FactoryWager Full Inspection Tree</h1>
    
    <div class="info-grid">
      <div class="info-card">
        <h3>Domain</h3>
        <p>${config.DOMAIN}</p>
      </div>
      <div class="info-card">
        <h3>Scope</h3>
        <p>${config.SCOPE}</p>
      </div>
      <div class="info-card">
        <h3>Platform</h3>
        <p>${config.PLATFORM}</p>
      </div>
      <div class="info-card">
        <h3>Status</h3>
        <p><span class="badge">INSPECTABLE</span></p>
      </div>
    </div>

    <div class="nav">
      <a href="/debug" class="active">Debug View</a>
      <a href="/scope.json">JSON API</a>
      <a href="/metrics">Metrics</a>
      <a href="/health">Health</a>
    </div>

    <div class="timestamp">
      Generated: ${new Date().toISOString()}
    </div>

    <pre><code>${tableHtml}</code></pre>

    <div style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid #3b82f6;">
      <h3>Navigation</h3>
      <p>
        <a href="/scope.json" style="color: #3b82f6;">Raw JSON</a> • 
        <a href="/metrics" style="color: #3b82f6;">System Metrics</a> • 
        <a href="/health" style="color: #3b82f6;">Health Check</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate metrics endpoint
 */
function generateMetrics(): string {
  const scope = domainCtx.getScope(config.SCOPE);
  const stats = {
    domain: config.DOMAIN,
    scope: config.SCOPE,
    platform: config.PLATFORM,
    totalScopes: domainCtx.getScopeNames().length,
    totalTypes: scope?.getTypeNames().length || 0,
    totalProperties: 0,
    totalClasses: 0,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  };

  // Count properties and classes
  if (scope) {
    scope.getTypeNames().forEach(typeName => {
      const type = scope.getType(typeName as any);
      if (type) {
        stats.totalProperties += type.getMetaPropertyNames().length;
        type.getMetaPropertyNames().forEach(propName => {
          const meta = type.getMetaProperty(propName);
          if (meta) {
            stats.totalClasses += meta.getClassNames().length;
          }
        });
      }
    });
  }

  return JSON.stringify(stats, null, 2);
}

/**
 * Generate health check
 */
function generateHealth(): string {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    inspection: {
      domain: config.DOMAIN,
      scope: config.SCOPE,
      platform: config.PLATFORM,
      available: true
    },
    services: {
      inspection: "operational",
      serialization: "operational",
      htmlGeneration: "operational"
    }
  };

  return JSON.stringify(health, null, 2);
}

// Start the inspection server
const server = Bun.serve({
  port: Number(Bun.env.PORT) || 8765,
  async fetch(req) {
    const url = new URL(req.url);

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      switch (url.pathname) {
        case "/":
        case "/debug":
          const tableHtml = generateHTMLTable(domainCtx);
          return new Response(tableHtml, {
            headers: { "Content-Type": "text/html", ...corsHeaders }
          });

        case "/scope.json":
          const jsonData = serializable(domainCtx);
          return Response.json(jsonData, {
            headers: { 
              "Content-Type": "application/json",
              "Cache-Control": "no-cache",
              ...corsHeaders
            }
          });

        case "/metrics":
          const metrics = generateMetrics();
          return new Response(metrics, {
            headers: { 
              "Content-Type": "application/json",
              ...corsHeaders
            }
          });

        case "/health":
          const health = generateHealth();
          return new Response(health, {
            headers: { 
              "Content-Type": "application/json",
              ...corsHeaders
            }
          });

        case "/inspect":
          // Raw Bun.inspect output
          const inspectOutput = Bun.inspect(domainCtx, {
            depth: 8,
            colors: false,
            maxArrayLength: 10,
          });
          return new Response(inspectOutput, {
            headers: { 
              "Content-Type": "text/plain",
              ...corsHeaders
            }
          });

        default:
          return new Response("Not found", { 
            status: 404,
            headers: corsHeaders
          });
      }
    } catch (error) {
      console.error("Inspection server error:", error);
      return new Response(JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
  },
});

console.log("🧩 FactoryWager Inspection System Ready");
console.log(`📊 Server running on http://localhost:${server.port}`);
console.log(`🌐 Debug view: http://localhost:${server.port}/debug`);
console.log(`📄 JSON API: http://localhost:${server.port}/scope.json`);
console.log(`📈 Metrics: http://localhost:${server.port}/metrics`);
console.log(`💚 Health: http://localhost:${server.port}/health`);

// Display initial inspection in terminal
console.log("\n🔍 Initial Inspection Tree:");
console.log(Bun.inspect(domainCtx, { depth: 6, colors: true }));

// Export for external use
export { domainCtx, server };
