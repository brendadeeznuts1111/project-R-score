#!/usr/bin/env bun
/**
 * DuoPlus Scoping Matrix Demo Server
 * Demonstrates Bun-native scoping matrix with compliance middleware
 */

import { SCOPING_MATRIX } from "../data/scopingMatrix.ts";
import { complianceMiddleware, strictComplianceMiddleware, debugComplianceMiddleware, complianceEndpointMiddleware, rateLimitMiddleware, featureFlagMiddleware, integrationMiddleware } from "../server/middleware/compliance.ts";
import { getScopeContext, isFeatureEnabled, isIntegrationAllowed } from "../config/scope.config.ts";
import { validateMatrixCompliance, getComplianceReport } from "../utils/matrixValidator.ts";
import { getMatrixRule, isIntegrationAllowed as isIntegrationAllowedMatcher } from "../utils/matrixMatcher.ts";

// ============================================================================
// CLI Argument Parsing
// ============================================================================

interface CLIOptions {
  port?: number;
  host?: string;
  help?: boolean;
  verbose?: boolean;
  strict?: boolean;
  debug?: boolean;
}

function parseCLIArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--help':
      case '-h':
        options.help = true;
        break;

      case '--port':
      case '-p':
        options.port = parseInt(args[++i]);
        break;

      case '--host':
        options.host = args[++i];
        break;

      case '--verbose':
      case '-v':
        options.verbose = true;
        break;

      case '--strict':
        options.strict = true;
        break;

      case '--debug':
        options.debug = true;
        break;

      default:
        if (arg.startsWith('--port=')) {
          options.port = parseInt(arg.split('=')[1]);
        } else if (arg.startsWith('--host=')) {
          options.host = arg.split('=')[1];
        }
        break;
    }
  }

  return options;
}

function printHelp() {
  console.log(`
🎯 DuoPlus Scoping Matrix Demo Server

USAGE:
    bun run scripts/demo-scoping.ts [OPTIONS]

OPTIONS:
    -p, --port <PORT>        Server port (default: 8765, env: PORT)
    --host <HOST>            Server host (default: localhost, env: HOST)
    -v, --verbose            Verbose logging
    --strict                 Use strict compliance middleware
    --debug                  Enable debug mode with detailed logging
    -h, --help               Show this help message

ENVIRONMENT VARIABLES:
    PORT                     Server port (default: 8765)
    HOST                     Server host (default: localhost)
    PLATFORM_OVERRIDE        Override platform detection

EXAMPLES:
    # Basic server
    bun run scripts/demo-scoping.ts

    # Custom port and host
    bun run scripts/demo-scoping.ts --port 3000 --host 0.0.0.0

    # Strict compliance mode
    bun run scripts/demo-scoping.ts --strict --verbose

    # Debug mode
    bun run scripts/demo-scoping.ts --debug

ENDPOINTS:
    /                        Main dashboard
    /compliance             Compliance report
    /matrix                 Matrix information
    /scope.json             Scope configuration
    /debug                  Debug interface
    /performance            Performance metrics
    /api/features           Feature status
    /api/integrations       Integration status
    /api/limits             Current limits
    /api/twitter            Twitter integration test
    /api/cashapp            CashApp integration test
`);
}

// ============================================================================
// Demo Server Setup
// ============================================================================

const cliOptions = parseCLIArgs();

if (cliOptions.help) {
  printHelp();
  process.exit(0);
}

const PORT = cliOptions.port || parseInt(process.env.PORT || "8765");
const HOST = cliOptions.host || process.env.HOST || "localhost";
const VERBOSE = cliOptions.verbose || false;
const STRICT_MODE = cliOptions.strict || false;
const DEBUG_MODE = cliOptions.debug || false;

console.log("🚀 Starting DuoPlus Scoping Matrix Demo Server");
console.log(`📍 Server: http://${HOST}:${PORT}`);
console.log(`🔍 Debug endpoints:`);
console.log(`   - Compliance report: http://${HOST}:${PORT}/compliance`);
console.log(`   - Matrix info: http://${HOST}:${PORT}/matrix`);
console.log(`   - Scope info: http://${HOST}:${PORT}/scope.json`);
console.log(`   - Debug interface: http://${HOST}:${PORT}/debug`);
console.log();

// Display current scope
const context = getScopeContext();
console.log("🎯 Current Scope Configuration:");
console.log(`   Domain: ${context.domain}`);
console.log(`   Platform: ${context.platform}`);
console.log(`   Detected Scope: ${context.detectedScope}`);
console.log(`   Features: ${Object.entries(context.features).filter(([_, v]) => v).map(([k]) => k).join(", ")}`);
console.log(`   Integrations: ${Object.entries(context.integrations).filter(([_, v]) => v).map(([k]) => k).join(", ")}`);
console.log();

// ============================================================================
// Demo API Routes
// ============================================================================

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const method = req.method;
  const path = url.pathname;

  console.log(`${method} ${path}`);

  try {
    // Apply compliance middleware (non-blocking)
    const complianceReq = complianceMiddleware(req);
    if (complianceReq instanceof Response) return complianceReq;

    // Apply debug middleware for detailed logging
    const debugReq = await debugComplianceMiddleware(complianceReq);
    if (debugReq instanceof Response) return debugReq;

    // Apply compliance endpoints
    const endpointReq = await complianceEndpointMiddleware(debugReq);
    if (endpointReq instanceof Response) return endpointReq;

    // Route handling
    switch (path) {
      case "/":
        return handleHomePage();

      case "/api/features":
        return handleFeaturesAPI();

      case "/api/integrations":
        return handleIntegrationsAPI();

      case "/api/limits":
        return handleLimitsAPI();

      case "/api/twitter":
        return handleTwitterAPI(req);

      case "/api/cashapp":
        return handleCashAppAPI(req);

      case "/debug":
        return handleDebugPage();

      case "/performance":
        return handlePerformanceTest();

      default:
        return new Response("Not Found", { status: 404 });
    }
  } catch (error) {
    console.error("Request error:", error);
    return new Response(JSON.stringify({
      error: "Internal Server Error",
      message: error.message,
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// ============================================================================
// Route Handlers
// ============================================================================

function handleHomePage(): Response {
  const context = getScopeContext();
  const compliance = validateMatrixCompliance();

  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>DuoPlus Scoping Matrix Demo</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 40px;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            min-height: 100vh;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
            margin-bottom: 30px;
        }
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 2.5em;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .header p {
            margin: 0;
            opacity: 0.9;
            font-size: 1.1em;
        }
        .section {
            margin: 20px 0;
            padding: 25px;
            background: rgba(255, 255, 255, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(10px);
        }
        .section h2 {
            margin-top: 0;
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 8px;
            display: inline-block;
        }
        .feature-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        .feature {
            padding: 15px;
            border-radius: 8px;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .feature:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        }
        .enabled {
            background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
            border: 2px solid #28a745;
            border-left: 4px solid #28a745;
        }
        .disabled {
            background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
            border: 2px solid #dc3545;
            border-left: 4px solid #dc3545;
        }
        .status {
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: inline-block;
            margin-top: 8px;
        }
        .status.ok {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            box-shadow: 0 2px 4px rgba(40, 167, 69, 0.3);
        }
        .status.violation {
            background: linear-gradient(135deg, #dc3545 0%, #fd7e14 100%);
            color: white;
            box-shadow: 0 2px 4px rgba(220, 53, 69, 0.3);
        }
        pre {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            padding: 15px;
            border-radius: 8px;
            overflow-x: auto;
            border: 1px solid #dee2e6;
            font-size: 13px;
            line-height: 1.4;
        }
        ul {
            background: rgba(255, 255, 255, 0.8);
            border-radius: 8px;
            padding: 15px;
            margin: 10px 0;
        }
        li {
            margin: 5px 0;
            color: #495057;
        }
        a {
            color: #007bff;
            text-decoration: none;
            font-weight: 500;
        }
        a:hover {
            color: #0056b3;
            text-decoration: underline;
        }
        .compliance-status {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 25px;
            font-weight: bold;
            font-size: 14px;
            margin-top: 10px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .compliance-valid {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
        }
        .compliance-invalid {
            background: linear-gradient(135deg, #dc3545 0%, #fd7e14 100%);
            color: white;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎯 DuoPlus Scoping Matrix Demo</h1>
        <p>Bun-native multi-tenant runtime with compliance validation</p>
        <div class="compliance-status ${compliance.valid ? 'compliance-valid' : 'compliance-invalid'}">
            Compliance: ${compliance.valid ? '✅ Valid' : '❌ Violations'}
        </div>
    </div>

    <div class="section">
        <h2>📊 Current Scope</h2>
        <pre>${JSON.stringify({
          domain: context.domain,
          platform: context.platform,
          detectedScope: context.detectedScope,
          features: context.features,
          limits: context.limits,
          integrations: context.integrations,
        }, null, 2)}</pre>
    </div>

    <div class="section">
        <h2>⚙️ Features</h2>
        <div class="feature-grid">
            ${Object.entries(context.features).map(([feature, enabled]) =>
              `<div class="feature ${enabled ? 'enabled' : 'disabled'}">
                <strong>${feature}</strong><br>
                <span class="status ${enabled ? 'ok' : 'violation'}">${enabled ? 'Enabled' : 'Disabled'}</span>
              </div>`
            ).join('')}
        </div>
    </div>

    <div class="section">
        <h2>🔗 Integrations</h2>
        <div class="feature-grid">
            ${Object.entries(context.integrations).map(([integration, enabled]) =>
              `<div class="feature ${enabled ? 'enabled' : 'disabled'}">
                <strong>${integration}</strong><br>
                <span class="status ${enabled ? 'ok' : 'violation'}">${enabled ? 'Allowed' : 'Blocked'}</span>
              </div>`
            ).join('')}
        </div>
    </div>

    <div class="section">
        <h2>📋 Limits</h2>
        <pre>${JSON.stringify(context.limits, null, 2)}</pre>
    </div>

    <div class="section">
        <h2>🔍 Debug Endpoints</h2>
        <ul>
            <li><a href="/compliance">/compliance</a> - Full compliance report</li>
            <li><a href="/matrix">/matrix</a> - Matrix information</li>
            <li><a href="/scope.json">/scope.json</a> - Scope configuration</li>
            <li><a href="/debug">/debug</a> - Debug interface</li>
            <li><a href="/performance">/performance</a> - Performance test</li>
        </ul>
    </div>

    <div class="section">
        <h2>🚀 API Endpoints</h2>
        <ul>
            <li><a href="/api/features">/api/features</a> - Feature status</li>
            <li><a href="/api/integrations">/api/integrations</a> - Integration status</li>
            <li><a href="/api/limits">/api/limits</a> - Current limits</li>
            <li><a href="/api/twitter">/api/twitter</a> - Twitter integration (may be blocked)</li>
            <li><a href="/api/cashapp">/api/cashapp</a> - CashApp integration (may be blocked)</li>
        </ul>
    </div>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
}

function handleFeaturesAPI(): Response {
  const context = getScopeContext();

  return new Response(JSON.stringify({
    features: context.features,
    enabled: Object.entries(context.features).filter(([_, v]) => v).map(([k]) => k),
    disabled: Object.entries(context.features).filter(([_, v]) => !v).map(([k]) => k),
    scope: context.detectedScope,
    timestamp: new Date().toISOString(),
  }, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
}

function handleIntegrationsAPI(): Response {
  const context = getScopeContext();

  return new Response(JSON.stringify({
    integrations: context.integrations,
    allowed: Object.entries(context.integrations).filter(([_, v]) => v).map(([k]) => k),
    blocked: Object.entries(context.integrations).filter(([_, v]) => !v).map(([k]) => k),
    scope: context.detectedScope,
    timestamp: new Date().toISOString(),
  }, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
}

function handleLimitsAPI(): Response {
  const context = getScopeContext();

  return new Response(JSON.stringify({
    limits: context.limits,
    scope: context.detectedScope,
    timestamp: new Date().toISOString(),
  }, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
}

function handleTwitterAPI(req: Request): Response {
  // Apply integration middleware
  const integrationReq = integrationMiddleware("twitter")(req);
  if (integrationReq instanceof Response) return integrationReq;

  return new Response(JSON.stringify({
    integration: "twitter",
    status: "allowed",
    message: "Twitter integration is available in this scope",
    scope: getScopeContext().detectedScope,
    timestamp: new Date().toISOString(),
  }, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
}

function handleCashAppAPI(req: Request): Response {
  // Apply integration middleware
  const integrationReq = integrationMiddleware("cashapp")(req);
  if (integrationReq instanceof Response) return integrationReq;

  return new Response(JSON.stringify({
    integration: "cashapp",
    status: "allowed",
    message: "CashApp integration is available in this scope",
    scope: getScopeContext().detectedScope,
    timestamp: new Date().toISOString(),
  }, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
}

function handleDebugPage(): Response {
  const context = getScopeContext();
  const compliance = validateMatrixCompliance();

  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Debug Interface - DuoPlus Scoping Matrix</title>
    <style>
        body { font-family: monospace; margin: 20px; background: #f5f5f5; }
        .debug-panel { background: white; padding: 20px; margin: 10px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .json { background: #f8f8f8; padding: 10px; border-radius: 4px; overflow-x: auto; }
        .status { padding: 4px 8px; border-radius: 4px; font-weight: bold; }
        .ok { background: #4caf50; color: white; }
        .violation { background: #f44336; color: white; }
        .warning { background: #ff9800; color: white; }
    </style>
</head>
<body>
    <h1>🔍 Debug Interface</h1>

    <div class="debug-panel">
        <h2>Scope Context</h2>
        <div class="json">${JSON.stringify(context, null, 2)}</div>
    </div>

    <div class="debug-panel">
        <h2>Compliance Status</h2>
        <div class="status ${compliance.valid ? 'ok' : 'violation'}">
            ${compliance.valid ? '✅ Compliant' : '❌ Non-compliant'}
        </div>
        ${compliance.reason ? `<p><strong>Reason:</strong> ${compliance.reason}</p>` : ''}
        ${compliance.violations ? `<p><strong>Violations:</strong> ${compliance.violations.join(', ')}</p>` : ''}
        ${compliance.warnings ? `<p><strong>Warnings:</strong> ${compliance.warnings.join(', ')}</p>` : ''}
        <div class="json">${JSON.stringify(compliance, null, 2)}</div>
    </div>

    <div class="debug-panel">
        <h2>Matrix Statistics</h2>
        <div class="json">${JSON.stringify(SCOPING_MATRIX, null, 2)}</div>
    </div>

    <div class="debug-panel">
        <h2>Performance Metrics</h2>
        <div class="json">${JSON.stringify({
          memory: Bun.memoryUsage(),
          uptime: process.uptime(),
          platform: process.platform,
          versions: process.versions,
        }, null, 2)}</div>
    </div>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
}

async function handlePerformanceTest(): Promise<Response> {
  const results = [];

  // Test matrix lookup performance
  const domains = ["apple.com", "localhost", "gmail.com", "public"];
  const platforms = ["macOS", "Windows", "Linux", "Any"];

  for (const domain of domains) {
    for (const platform of platforms) {
      const start = performance.now();
      const rule = getMatrixRule(domain, platform);
      const duration = performance.now() - start;
      results.push({ domain, platform, duration, found: !!rule });
    }
  }

  // Test compliance validation performance
  const complianceStart = performance.now();
  const compliance = validateMatrixCompliance();
  const complianceDuration = performance.now() - complianceStart;

  // Test scope context access
  const scopeStart = performance.now();
  const scope = getScopeContext();
  const scopeDuration = performance.now() - scopeStart;

  return new Response(JSON.stringify({
    timestamp: new Date().toISOString(),
    performance: {
      matrixLookups: results,
      complianceValidation: { duration: complianceDuration, valid: compliance.valid },
      scopeAccess: { duration: scopeDuration },
      memory: Bun.memoryUsage(),
    },
  }, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
}

// ============================================================================
// Server Startup
// ============================================================================

const server = Bun.serve({
  port: PORT,
  hostname: HOST,
  async fetch(req) {
    return handleRequest(req);
  },
});

console.log(`✅ Server started successfully`);
console.log(`🌐 Open http://${HOST}:${PORT} in your browser`);
console.log(`🔄 Server will continue running...`);

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down server...");
  server.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Shutting down server...");
  server.stop();
  process.exit(0);
});