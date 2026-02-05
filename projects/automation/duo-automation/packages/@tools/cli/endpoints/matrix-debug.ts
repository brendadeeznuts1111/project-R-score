/**
 * packages/cli/endpoints/matrix-debug.ts
 * Debug endpoint integration for DuoPlus Scoping Matrix v3.7
 * 
 * Provides `/matrix` endpoint for live validation and compliance inspection
 * Integrates with Elysia-based system-status.ts server
 * 
 * Usage in Elysia app:
 *   import { registerMatrixEndpoint } from './endpoints/matrix-debug';
 *   registerMatrixEndpoint(app);
 */

import type { Elysia } from 'elysia';
import {
  SCOPING_MATRIX,
  getMatrixStats,
  getBestScopingRule,
  exportMatrixAsJSON
} from '../data/scopingMatrix';
import {
  validateRuntimeConfig,
  validateMatrixConsistency,
  type RuntimeConfig
} from '../utils/matrixValidator';

export interface MatrixDebugResponse {
  success: true;
  data: {
    currentConfig: MatrixDebugConfig;
    validation: MatrixValidationStatus;
    matrix: MatrixInfo;
    consistency: MatrixConsistency;
    timestamp: string;
  };
}

export interface MatrixDebugConfig {
  domain: string | undefined;
  platform: string;
  detectedScope: string;
  storagePrefix: string;
  secretsBackend: string;
  serviceName: string;
  bunVersion: string;
}

export interface MatrixValidationStatus {
  valid: boolean;
  rule?: Record<string, unknown>;
  message?: string;
  reason?: string;
  suggestions?: string[];
}

export interface MatrixInfo {
  version: string;
  timestamp: string;
  totalRules: number;
  scopeBreakdown: Record<string, number>;
  platformBreakdown: Record<string, number>;
}

export interface MatrixConsistency {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Detect current runtime configuration
 */
function detectCurrentConfig(): MatrixDebugConfig {
  return {
    domain: Bun.env.SERVING_DOMAIN,
    platform: process.platform,
    detectedScope: Bun.env.CLI_SCOPE || Bun.env.DASHBOARD_SCOPE || 'auto-detect',
    storagePrefix: Bun.env.STORAGE_PREFIX || 'auto-detect',
    secretsBackend: Bun.env.SECRETS_BACKEND || 'auto-detect',
    serviceName: Bun.env.SERVICE_NAME || 'auto-detect',
    bunVersion: Bun.version
  };
}

/**
 * Validate current config against matrix
 */
function validateCurrentConfig(config: MatrixDebugConfig): MatrixValidationStatus {
  // Skip validation if auto-detect is set
  if (
    config.detectedScope === 'auto-detect' ||
    config.storagePrefix === 'auto-detect'
  ) {
    return {
      valid: true,
      message: 'Configuration in auto-detect mode - skipping strict validation'
    };
  }

  // Create runtime config for validation
  const runtimeConfig: RuntimeConfig = {
    domain: config.domain,
    platform: config.platform,
    detectedScope: config.detectedScope as any,
    storagePrefix: config.storagePrefix,
    secretsBackend: config.secretsBackend,
    serviceName: config.serviceName
  };

  const result = validateRuntimeConfig(runtimeConfig);

  return {
    valid: result.valid,
    ...(result.valid
      ? {
          message: result.message,
          rule: result.rule
        }
      : {
          reason: result.reason,
          suggestions: result.suggestions
        })
  };
}

/**
 * Get matrix information
 */
function getMatrixInfo(): MatrixInfo {
  const stats = getMatrixStats();
  return {
    version: '3.7',
    timestamp: new Date().toISOString(),
    totalRules: stats.totalRules,
    scopeBreakdown: stats.scopeBreakdown,
    platformBreakdown: stats.platformBreakdown
  };
}

/**
 * Get matrix consistency report
 */
function getMatrixConsistencyReport(): MatrixConsistency {
  return validateMatrixConsistency();
}

/**
 * Handle GET /matrix endpoint
 */
export async function handleMatrixDebug(): Promise<MatrixDebugResponse> {
  const currentConfig = detectCurrentConfig();
  const validation = validateCurrentConfig(currentConfig);
  const matrix = getMatrixInfo();
  const consistency = getMatrixConsistencyReport();

  return {
    success: true,
    data: {
      currentConfig,
      validation,
      matrix,
      consistency,
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Handle GET /matrix/export endpoint - export full matrix as JSON
 */
export async function handleMatrixExport(): Promise<{
  success: true;
  data: Record<string, unknown>;
}> {
  const json = exportMatrixAsJSON();
  return {
    success: true,
    data: JSON.parse(json)
  };
}

/**
 * Handle GET /matrix/rules endpoint - list all rules
 */
export async function handleMatrixRules(): Promise<{
  success: true;
  data: {
    totalRules: number;
    rules: typeof SCOPING_MATRIX;
  };
}> {
  return {
    success: true,
    data: {
      totalRules: SCOPING_MATRIX.length,
      rules: SCOPING_MATRIX
    }
  };
}

/**
 * Handle GET /matrix/lookup?domain=...&platform=... endpoint
 */
export async function handleMatrixLookup(
  domain: string | undefined,
  platform: string
): Promise<{
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}> {
  const rule = getBestScopingRule(domain, platform);

  if (!rule) {
    return {
      success: false,
      error: `No rule found for domain="${domain}", platform="${platform}"`
    };
  }

  return {
    success: true,
    data: rule
  };
}

/**
 * Register all matrix debug endpoints with Elysia app
 */
export function registerMatrixEndpoints(app: Elysia): Elysia {
  return app
    .get('/matrix', handleMatrixDebug, {
      detail: {
        tags: ['Matrix'],
        summary: 'Matrix Debug Dashboard',
        description:
          'View comprehensive scoping matrix validation and compliance status. Shows current runtime configuration, validation results, and matrix statistics.'
      }
    })
    .get('/matrix/export', handleMatrixExport, {
      detail: {
        tags: ['Matrix'],
        summary: 'Export Full Matrix',
        description: 'Export entire scoping matrix to JSON format for CI/CD and tooling'
      }
    })
    .get('/matrix/rules', handleMatrixRules, {
      detail: {
        tags: ['Matrix'],
        summary: 'List All Rules',
        description: 'Get list of all scoping rules in the matrix'
      }
    })
    .get(
      '/matrix/lookup',
      async ({ query }: { query: Record<string, string | undefined> }) => {
        return handleMatrixLookup(query.domain, query.platform || 'Linux');
      },
      {
        detail: {
          tags: ['Matrix'],
          summary: 'Lookup Rule',
          description: 'Lookup scoping rule by domain and platform',
          parameters: [
            {
              name: 'domain',
              in: 'query',
              required: false,
              schema: { type: 'string' }
            },
            {
              name: 'platform',
              in: 'query',
              required: false,
              schema: { type: 'string', default: 'Linux' }
            }
          ]
        }
      }
    );
}

/**
 * Generate HTML dashboard for matrix inspection
 */
export function generateMatrixDashboardHTML(): string {
  const stats = getMatrixStats();
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DuoPlus Scoping Matrix v3.7 - Debug Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', monospace;
      background: #3b82f6;
      color: #3b82f6;
      padding: 20px;
      line-height: 1.6;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #3b82f6; margin-bottom: 30px; }
    h2 { color: #3b82f6; margin-top: 30px; margin-bottom: 15px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .card {
      background: #3b82f6;
      border: 1px solid #3b82f6;
      border-radius: 8px;
      padding: 20px;
    }
    .stat { font-size: 24px; font-weight: bold; color: #3b82f6; }
    .stat-label { color: #999; font-size: 12px; margin-top: 5px; }
    pre {
      background: #3b82f6;
      border: 1px solid #3b82f6;
      border-radius: 4px;
      padding: 15px;
      overflow-x: auto;
      font-size: 12px;
      margin-top: 10px;
    }
    .endpoints {
      display: grid;
      gap: 10px;
      margin-top: 10px;
    }
    .endpoint {
      background: #3b82f6;
      border-left: 3px solid #3b82f6;
      padding: 10px 15px;
      border-radius: 4px;
      font-size: 12px;
      font-family: monospace;
    }
    .endpoint-method {
      color: #3b82f6;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🏗️ DuoPlus Scoping Matrix v3.7 - Debug Dashboard</h1>
    
    <h2>📊 Matrix Statistics</h2>
    <div class="grid">
      <div class="card">
        <div class="stat">${stats.totalRules}</div>
        <div class="stat-label">Total Rules</div>
      </div>
      <div class="card">
        <div class="stat">${stats.scopeBreakdown['ENTERPRISE'] + stats.scopeBreakdown['DEVELOPMENT'] + stats.scopeBreakdown['LOCAL-SANDBOX']}</div>
        <div class="stat-label">Tenant Scopes</div>
      </div>
      <div class="card">
        <div class="stat">3</div>
        <div class="stat-label">Platforms Covered</div>
      </div>
    </div>

    <h2>🔗 API Endpoints</h2>
    <div class="endpoints">
      <div class="endpoint"><span class="endpoint-method">GET</span> /matrix - Current validation status</div>
      <div class="endpoint"><span class="endpoint-method">GET</span> /matrix/export - Export full matrix as JSON</div>
      <div class="endpoint"><span class="endpoint-method">GET</span> /matrix/rules - List all ${stats.totalRules} rules</div>
      <div class="endpoint"><span class="endpoint-method">GET</span> /matrix/lookup?domain=...&platform=... - Lookup specific rule</div>
    </div>

    <h2>📈 Scope Breakdown</h2>
    <pre>ENTERPRISE:     ${stats.scopeBreakdown['ENTERPRISE']} rules
DEVELOPMENT:    ${stats.scopeBreakdown['DEVELOPMENT']} rules
LOCAL-SANDBOX:  ${stats.scopeBreakdown['LOCAL-SANDBOX']} rules
Global:         ${stats.scopeBreakdown['global']} rule (fallback)</pre>

    <h2>💻 Platform Coverage</h2>
    <pre>Windows:  ${stats.platformBreakdown['Windows']} rules
macOS:    ${stats.platformBreakdown['macOS']} rules
Linux:    ${stats.platformBreakdown['Linux']} rules
Any:      ${stats.platformBreakdown['Any']} rule (wildcard)
Other:    ${stats.platformBreakdown['Other']} rule (unknown platforms)</pre>

    <h2>📋 Instructions</h2>
    <pre>1. View current config validation:
   curl http://localhost:3000/matrix

2. Export matrix as JSON:
   curl http://localhost:3000/matrix/export > matrix.json

3. Lookup rule by domain+platform:
   curl 'http://localhost:3000/matrix/lookup?domain=apple.factory-wager.com&platform=macOS'

4. Run validation tests:
   bun test tests/matrix.test.ts

5. Export matrix via CLI:
   bun scripts/export-matrix-json.ts --stats --validate</pre>
  </div>
</body>
</html>
`;
}

/**
 * Handle GET /matrix/dashboard endpoint - HTML dashboard
 */
export async function handleMatrixDashboard(): Promise<Response> {
  return new Response(generateMatrixDashboardHTML(), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}