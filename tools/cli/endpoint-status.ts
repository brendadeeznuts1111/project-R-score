#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';

// @see https://bun.com/docs/runtime/http/server#reference — Server
// @see https://bun.com/docs/runtime/networking/fetch#canceling-a-request — AbortController
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
/**
 * 🎯 Endpoint Status CLI - HSL Color Integrated
 *
 * Comprehensive endpoint health monitoring with advanced HSL color coding.
 * Displays real-time status, severity levels, and performance metrics.
 */

import {
  createEnhancedStatus,
  generateStatusMatrix,
  type SeverityLevel,
  type ContextType,
} from '../../lib/utils/enhanced-status-matrix.ts';
import { colorize, type ColorStatus } from '../../lib/utils/color-system.ts';
import { styled, FW_COLORS } from '../../lib/theme/colors.ts';
import { jsonOut } from '../../lib/console-depth.ts';
import { sleep } from '../../lib/time.ts';

/** Pad string to target visual width (left-aligned) */
function swPad(str: string, width: number, char = ' '): string {
  const diff = width - Bun.stringWidth(str);
  return diff > 0 ? str + char.repeat(diff) : str;
}

interface Endpoint {
  name: string;
  url: string;
  method: string;
  category: string;
}

interface EndpointResult {
  endpoint: Endpoint;
  status: 'success' | 'warning' | 'error' | 'info';
  severity: SeverityLevel;
  responseTime: number;
  statusCode: number;
  message: string;
  timestamp: number;
}

// Default endpoints to monitor
const DEFAULT_ENDPOINTS: Endpoint[] = [
  { name: 'Health Check', url: 'http://localhost:3000/health', method: 'GET', category: 'system' },
  { name: 'API Status', url: 'http://localhost:3000/api/status', method: 'GET', category: 'api' },
  { name: 'MCP Server', url: 'http://localhost:3000/mcp/health', method: 'GET', category: 'mcp' },
  {
    name: 'R2 Storage',
    url: 'http://localhost:3000/r2/status',
    method: 'GET',
    category: 'storage',
  },
  { name: 'RSS Feeds', url: 'http://localhost:3000/rss/status', method: 'GET', category: 'feeds' },
  {
    name: 'Registry',
    url: 'http://localhost:3000/registry/status',
    method: 'GET',
    category: 'registry',
  },
];

/**
 * Check a single endpoint
 */
async function checkEndpoint(endpoint: Endpoint, timeout = 5000): Promise<EndpointResult> {
  const start = performance.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(endpoint.url, {
      method: endpoint.method,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const responseTime = Math.round(performance.now() - start);

    // Determine status and severity based on response
    let status: ColorStatus;
    let severity: SeverityLevel;
    let message: string;

    if (response.ok) {
      if (responseTime < 100) {
        status = 'success';
        severity = 'low';
        message = 'Optimal';
      } else if (responseTime < 500) {
        status = 'success';
        severity = 'medium';
        message = 'Good';
      } else {
        status = 'warning';
        severity = 'medium';
        message = 'Slow';
      }
    } else if (response.status >= 500) {
      status = 'error';
      severity = 'critical';
      message = 'Server Error';
    } else if (response.status >= 400) {
      status = 'warning';
      severity = 'high';
      message = 'Client Error';
    } else {
      status = 'info';
      severity = 'low';
      message = 'Unknown';
    }

    return {
      endpoint,
      status,
      severity,
      responseTime,
      statusCode: response.status,
      message,
      timestamp: Date.now(),
    };
  } catch (error) {
    const responseTime = Math.round(performance.now() - start);

    return {
      endpoint,
      status: 'error',
      severity: 'critical',
      responseTime,
      statusCode: 0,
      message: error instanceof Error ? error.name : 'Unknown Error',
      timestamp: Date.now(),
    };
  }
}

/**
 * Check all endpoints concurrently
 */
async function checkAllEndpoints(endpoints: Endpoint[]): Promise<EndpointResult[]> {
  console.info(colorize('🔍 Checking endpoints...', 'cyan'));
  console.info();

  const results = await Promise.all(endpoints.map(ep => checkEndpoint(ep)));

  return results;
}

/**
 * Display endpoint results with HSL color coding
 */
function displayEndpointResults(results: EndpointResult[], context: ContextType = 'dark'): void {
  console.info();
  console.info(colorize('═'.repeat(90), 'gray'));
  console.info(
    colorize(
      swPad('  ENDPOINT STATUS', 30) + swPad('CODE', 8) + swPad('TIME', 10) + 'STATUS',
      'white',
      true
    )
  );
  console.info(colorize('═'.repeat(90), 'gray'));

  // Group by category
  const categories = [...new Set(results.map(r => r.endpoint.category))];

  for (const category of categories) {
    console.info();
    console.info(styled`{bold}{magenta}${category.toUpperCase()}{/magenta}{/bold}`);

    const categoryResults = results.filter(r => r.endpoint.category === category);

    for (const result of categoryResults) {
      const statusDisplay = createEnhancedStatus({
        status: result.status,
        severity: result.severity,
        context,
        ensureWCAG: false,
      });

      const name = swPad(result.endpoint.name, 28);
      const code = swPad(result.statusCode.toString(), 8);
      const time = swPad(`${result.responseTime}ms`, 10);

      console.info(`  ${name}${code}${time}${statusDisplay.ansi}`);
    }
  }

  console.info();
  console.info(colorize('═'.repeat(90), 'gray'));

  // Summary
  const total = results.length;
  const success = results.filter(r => r.status === 'success').length;
  const warning = results.filter(r => r.status === 'warning').length;
  const error = results.filter(r => r.status === 'error').length;
  const critical = results.filter(r => r.severity === 'critical').length;

  console.info();
  console.info(colorize('📊 SUMMARY', 'cyan', true));
  console.info(
    `  Total: ${total} | ✅ Success: ${success} | ⚠️  Warning: ${warning} | ❌ Error: ${error}`
  );

  if (critical > 0) {
    console.info(styled`{bold}{red}  🔴 Critical Issues: ${critical}{/red}{/bold}`);
  }

  const avgResponseTime = Math.round(results.reduce((sum, r) => sum + r.responseTime, 0) / total);
  console.info(`  ⏱️  Average Response: ${avgResponseTime}ms`);
}

/**
 * Display detailed endpoint info
 */
function displayEndpointDetails(result: EndpointResult, context: ContextType = 'dark'): void {
  console.info();
  console.info(colorize('═'.repeat(60), 'gray'));
  console.info(colorize('ENDPOINT DETAILS', 'cyan', true));
  console.info(colorize('═'.repeat(60), 'gray'));

  const statusDisplay = createEnhancedStatus({
    status: result.status,
    severity: result.severity,
    context,
    ensureWCAG: false,
  });

  console.info(`Name:    ${result.endpoint.name}`);
  console.info(`URL:     ${result.endpoint.url}`);
  console.info(`Method:  ${result.endpoint.method}`);
  console.info(`Status:  ${statusDisplay.ansi}`);
  console.info(`Code:    ${result.statusCode}`);
  console.info(`Time:    ${result.responseTime}ms`);
  console.info(`Message: ${result.message}`);
  console.info(`HSL:     ${statusDisplay.hsl}`);
  console.info(`Hex:     ${statusDisplay.hex}`);
  console.info(`Brightness: ${(statusDisplay.brightness * 100).toFixed(1)}%`);
  console.info(colorize('═'.repeat(60), 'gray'));
}

/**
 * Watch mode - continuously monitor endpoints
 */
async function watchEndpoints(
  endpoints: Endpoint[],
  interval = 5000,
  context: ContextType = 'dark'
): Promise<void> {
  console.info(colorize('👁️  WATCH MODE', 'cyan', true));
  console.info(colorize(`Checking every ${interval}ms. Press Ctrl+C to stop.`, 'gray'));
  console.info();

  let checkCount = 0;

  while (true) {
    checkCount++;
    console.clear();
    console.info(colorize(`🔄 Check #${checkCount} - ${new Date().toLocaleTimeString()}`, 'cyan'));

    const results = await checkAllEndpoints(endpoints);
    displayEndpointResults(results, context);

    await sleep(interval);
  }
}

/**
 * Show help
 */
function showHelp(): void {
  console.info(colorize('🎯 Endpoint Status CLI', 'cyan', true));
  console.info();
  console.info('Commands:');
  console.info('  check [url]           Check a single endpoint or all defaults');
  console.info('  watch                 Continuously monitor endpoints');
  console.info('  matrix                Display HSL status matrix');
  console.info('  json                  Output results as JSON');
  console.info();
  console.info('Options:');
  console.info('  --light               Use light context colors');
  console.info('  --dark                Use dark context colors (default)');
  console.info('  --interval <ms>       Watch interval in milliseconds');
  console.info('  --timeout <ms>        Request timeout in milliseconds');
  console.info();
  console.info('Examples:');
  console.info('  bun run cli/endpoint-status.ts check');
  console.info('  bun run cli/endpoint-status.ts check http://localhost:3000/health');
  console.info('  bun run cli/endpoint-status.ts watch --interval 10000');
  console.info('  bun run cli/endpoint-status.ts matrix --light');
}

/**
 * Main CLI handler
 */
async function main(): Promise<void> {
  const args = applyUnknownLongOptionGuardFor('status:matrix', Bun.argv.slice(2));
  const command = args[0];

  // Parse options
  const context: ContextType = args.includes('--light') ? 'light' : 'dark';
  const interval = parseInt(args.find((_, i) => args[i - 1] === '--interval') || '5000');
  const timeout = parseInt(args.find((_, i) => args[i - 1] === '--timeout') || '5000');

  switch (command) {
    case 'check': {
      const url = args[1];

      if (url && !url.startsWith('--')) {
        // Check single endpoint
        const endpoint: Endpoint = {
          name: 'Custom Endpoint',
          url,
          method: 'GET',
          category: 'custom',
        };

        const result = await checkEndpoint(endpoint, timeout);

        if (args.includes('--json')) {
          jsonOut(result);
        } else {
          displayEndpointDetails(result, context);
        }
      } else {
        // Check all default endpoints
        const results = await checkAllEndpoints(DEFAULT_ENDPOINTS);

        if (args.includes('--json')) {
          jsonOut(results);
        } else {
          displayEndpointResults(results, context);
        }
      }
      break;
    }

    case 'watch': {
      await watchEndpoints(DEFAULT_ENDPOINTS, interval, context);
      break;
    }

    case 'matrix': {
      const { displayStatusMatrix } = await import('../../lib/utils/enhanced-status-matrix.ts');
      displayStatusMatrix(context);
      break;
    }

    case 'help':
    case '--help':
    case '-h':
    default:
      showHelp();
      break;
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch(console.error);
}

export {
  checkEndpoint,
  checkAllEndpoints,
  displayEndpointResults,
  displayEndpointDetails,
  watchEndpoints,
  type Endpoint,
  type EndpointResult,
};
