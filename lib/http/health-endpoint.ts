/**
 * 🏥 HTTP Health Endpoint with HSL Status
 *
 * Express/Bun-native health check endpoint with advanced HSL color-coded status.
 * Provides standardized health metrics for monitoring systems.
 */

import {
  createEnhancedStatus,
  generateStatusMatrix,
  type SeverityLevel,
  type ContextType,
} from '../utils/enhanced-status-matrix.ts';
import type { ColorStatus } from '../utils/color-system.ts';

export interface HealthCheck {
  name: string;
  check: () => Promise<HealthCheckResult> | HealthCheckResult;
  timeout?: number;
}

export interface HealthCheckResult {
  status: ColorStatus;
  severity: SeverityLevel;
  message: string;
  responseTime?: number;
  metadata?: Record<string, unknown>;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  severity: SeverityLevel;
  timestamp: string;
  uptime: number;
  version: string;
  checks: Record<string, HealthCheckResult>;
  summary: {
    total: number;
    passed: number;
    failed: number;
    degraded: number;
  };
  hsl: {
    color: string;
    hex: string;
    brightness: number;
  };
}

/**
 * Health endpoint configuration
 */
export interface HealthEndpointConfig {
  /** API version */
  version: string;
  /** Check interval in ms */
  interval: number;
  /** Default timeout for checks */
  defaultTimeout: number;
  /** Context for colors (light/dark) */
  context: ContextType;
  /** Custom checks */
  checks: HealthCheck[];
}

/**
 * Default health checks
 */
const DEFAULT_CHECKS: HealthCheck[] = [
  {
    name: 'memory',
    check: () => {
      const usage = process.memoryUsage();
      const percentUsed = (usage.heapUsed / usage.heapTotal) * 100;

      if (percentUsed > 90) {
        return {
          status: 'error',
          severity: 'critical',
          message: `Memory critical: ${percentUsed.toFixed(1)}%`,
        };
      } else if (percentUsed > 75) {
        return {
          status: 'warning',
          severity: 'high',
          message: `Memory high: ${percentUsed.toFixed(1)}%`,
        };
      } else {
        return {
          status: 'success',
          severity: 'low',
          message: `Memory OK: ${percentUsed.toFixed(1)}%`,
        };
      }
    },
  },
  {
    name: 'eventLoop',
    check: () => {
      const start = performance.now();
      return new Promise<HealthCheckResult>(resolve => {
        setImmediate(() => {
          const lag = performance.now() - start;
          if (lag > 100) {
            resolve({
              status: 'error',
              severity: 'critical',
              message: `Event loop lag: ${lag.toFixed(2)}ms`,
              responseTime: lag,
            });
          } else if (lag > 50) {
            resolve({
              status: 'warning',
              severity: 'medium',
              message: `Event loop lag: ${lag.toFixed(2)}ms`,
              responseTime: lag,
            });
          } else {
            resolve({
              status: 'success',
              severity: 'low',
              message: `Event loop healthy: ${lag.toFixed(2)}ms`,
              responseTime: lag,
            });
          }
        });
      });
    },
  },
];

/**
 * Create a health endpoint handler
 */
export function createHealthEndpoint(config: Partial<HealthEndpointConfig> = {}) {
  const fullConfig: HealthEndpointConfig = {
    version: '1.0.0',
    interval: 30000,
    defaultTimeout: 5000,
    context: 'dark',
    checks: [...DEFAULT_CHECKS],
    ...config,
  };

  let lastStatus: HealthStatus | null = null;
  let checkInterval: ReturnType<typeof setInterval> | null = null;
  const startTime = Date.now();

  /**
   * Run all health checks
   */
  async function runChecks(): Promise<HealthStatus> {
    const checks: Record<string, HealthCheckResult> = {};
    const results = await Promise.all(
      fullConfig.checks.map(async check => {
        const start = performance.now();
        try {
          const timeoutPromise = new Promise<HealthCheckResult>((_, reject) => {
            setTimeout(
              () => reject(new Error('Timeout')),
              check.timeout || fullConfig.defaultTimeout
            );
          });

          const result = await Promise.race([check.check(), timeoutPromise]);

          return {
            name: check.name,
            result: { ...result, responseTime: performance.now() - start },
          };
        } catch (error) {
          return {
            name: check.name,
            result: {
              status: 'error' as ColorStatus,
              severity: 'critical' as SeverityLevel,
              message: error instanceof Error ? error.message : 'Check failed',
              responseTime: performance.now() - start,
            },
          };
        }
      })
    );

    for (const { name, result } of results) {
      checks[name] = result;
    }

    // Determine overall status
    const severities = results.map(r => r.result.severity);
    const statuses = results.map(r => r.result.status);

    const hasCritical = severities.includes('critical');
    const hasHigh = severities.includes('high');
    const hasErrors = statuses.includes('error');
    const hasWarnings = statuses.includes('warning');

    let status: HealthStatus['status'];
    let severity: SeverityLevel;

    if (hasCritical || hasErrors) {
      status = 'unhealthy';
      severity = 'critical';
    } else if (hasHigh || hasWarnings) {
      status = 'degraded';
      severity = 'high';
    } else {
      status = 'healthy';
      severity = 'low';
    }

    // Get HSL color for status
    const colorStatus: ColorStatus = hasErrors ? 'error' : hasWarnings ? 'warning' : 'success';
    const statusDisplay = createEnhancedStatus({
      status: colorStatus,
      severity,
      context: fullConfig.context,
      ensureWCAG: false,
    });

    const summary = {
      total: results.length,
      passed: results.filter(r => r.result.status === 'success').length,
      failed: results.filter(r => r.result.status === 'error').length,
      degraded: results.filter(r => r.result.status === 'warning').length,
    };

    lastStatus = {
      status,
      severity,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - startTime,
      version: fullConfig.version,
      checks,
      summary,
      hsl: {
        color: statusDisplay.hsl,
        hex: statusDisplay.hex,
        brightness: statusDisplay.brightness,
      },
    };

    return lastStatus;
  }

  /**
   * Start periodic health checks
   */
  function start(): void {
    if (checkInterval) return;

    runChecks(); // Initial check
    checkInterval = setInterval(runChecks, fullConfig.interval);
  }

  /**
   * Stop periodic health checks
   */
  function stop(): void {
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }
  }

  /**
   * HTTP handler for health endpoint
   */
  async function handler(request: Request): Promise<Response> {
    const status = lastStatus || (await runChecks());

    const accept = request.headers.get('accept') || '';
    const isJSON = accept.includes('application/json');

    if (isJSON) {
      return new Response(JSON.stringify(status, null, 2), {
        status: status.status === 'healthy' ? 200 : status.status === 'degraded' ? 200 : 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // HTML response with HSL colors
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Health Status</title>
  <style>
    body { 
      font-family: system-ui, sans-serif; 
      max-width: 800px; 
      margin: 2rem auto; 
      padding: 0 1rem;
      background: #1a1a2e;
      color: #eee;
    }
    .header { 
      background: ${status.hsl.color}; 
      padding: 1.5rem; 
      border-radius: 8px; 
      margin-bottom: 2rem;
      box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    }
    .status-badge {
      display: inline-block;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      font-weight: bold;
      text-transform: uppercase;
      background: rgba(255,255,255,0.2);
    }
    .check { 
      background: #16213e; 
      padding: 1rem; 
      margin: 0.5rem 0; 
      border-radius: 8px;
      border-left: 4px solid ${status.hsl.color};
    }
    .check-success { border-left-color: #4ade80; }
    .check-warning { border-left-color: #fbbf24; }
    .check-error { border-left-color: #f87171; }
    .metric { 
      display: inline-block; 
      margin-right: 2rem; 
      color: #888;
    }
    pre { 
      background: #0f3460; 
      padding: 1rem; 
      border-radius: 4px; 
      overflow-x: auto;
    }
    .hsl-info {
      font-family: monospace;
      background: #0f3460;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      display: inline-block;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🏥 Health Status</h1>
    <span class="status-badge">${status.status}</span>
    <p>Severity: ${status.severity} | Version: ${status.version}</p>
  </div>
  
  <h2>📊 Summary</h2>
  <p>
    <span class="metric">✅ Passed: ${status.summary.passed}</span>
    <span class="metric">⚠️ Degraded: ${status.summary.degraded}</span>
    <span class="metric">❌ Failed: ${status.summary.failed}</span>
    <span class="metric">Total: ${status.summary.total}</span>
  </p>
  
  <h2>🎨 HSL Color</h2>
  <p class="hsl-info">
    ${status.hsl.color} | ${status.hsl.hex} | Brightness: ${(status.hsl.brightness * 100).toFixed(1)}%
  </p>
  
  <h2>🔍 Checks</h2>
  ${Object.entries(status.checks)
    .map(
      ([name, check]) => `
    <div class="check check-${check.status}">
      <strong>${name}</strong> 
      <span style="float: right; text-transform: uppercase; font-size: 0.8rem; opacity: 0.8;">${check.status}</span>
      <p>${check.message}</p>
      ${check.responseTime ? `<small>⏱️ ${check.responseTime.toFixed(2)}ms</small>` : ''}
    </div>
  `
    )
    .join('')}
  
  <h2>📄 Raw JSON</h2>
  <pre>${JSON.stringify(status, null, 2)}</pre>
  
  <footer style="margin-top: 2rem; color: #666; font-size: 0.8rem;">
    <p>Timestamp: ${status.timestamp}</p>
    <p>Uptime: ${Math.floor(status.uptime / 1000)}s</p>
  </footer>
</body>
</html>`;

    return new Response(html, {
      status: status.status === 'healthy' ? 200 : status.status === 'degraded' ? 200 : 503,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  return {
    runChecks,
    handler,
    start,
    stop,
    get lastStatus() {
      return lastStatus;
    },
    get config() {
      return fullConfig;
    },
  };
}

/**
 * Create a simple health endpoint for Bun.serve()
 */
export function createBunHealthEndpoint(config: Partial<HealthEndpointConfig> = {}) {
  const endpoint = createHealthEndpoint(config);
  endpoint.start();

  return {
    ...endpoint,
    route: '/health',
    fetch: endpoint.handler,
  };
}

export default createHealthEndpoint;
