#!/usr/bin/env bun
// [DUOPLUS][INFRASTRUCTURE][TS][META:{health,monitoring}][#REF:INFRA-HEALTH-01][BUN-NATIVE]

/**
 * Infrastructure Health Check v1.0
 *
 * Comprehensive health verification for:
 * - Cloudflare DNS and domain availability
 * - CDN endpoint status with HTTP keepalive
 * - R2 bucket connectivity
 * - Error handling and structured logging
 *
 * Usage:
 *   bun run scripts/infrastructure-health.ts [--dns] [--cdn] [--r2] [--keepalive] [--all]
 */

import { CloudflareClient, DEFAULT_ZONE_ID, DEFAULT_ACCOUNT_ID, DEFAULT_DOMAIN } from './cloudflare-api';
import { urlLink } from './tty-hyperlink';

// ═══════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  message: string;
  details?: Record<string, unknown>;
  errors?: string[];
}

interface HealthReport {
  timestamp: string;
  overall: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    dns?: HealthCheckResult;
    ssl?: HealthCheckResult;
    cdn?: HealthCheckResult;
    r2?: HealthCheckResult;
    keepalive?: HealthCheckResult;
    cache?: HealthCheckResult;
  };
  errors: string[];
  duration: number;
}

interface EndpointCheck {
  url: string;
  status: number;
  latency: number;
  headers: Record<string, string>;
  keepalive: boolean;
}

// ═══════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════

const CONFIG = {
  // Endpoints to check
  endpoints: [
    'https://empire-pro-status.utahj4754.workers.dev/health',
    'https://empire-pro-status.utahj4754.workers.dev/status',
  ],

  // Subdomains to verify (if CF_API_TOKEN available)
  subdomains: [
    'api.apple',
    'qr.apple',
    'ws.apple',
    'auth.apple',
    'monitor.apple',
    'admin.apple',
  ],

  // R2 bucket for health check
  r2Bucket: process.env.R2_BUCKET || process.env.S3_BUCKET || 'factory-wager-packages',

  // HTTP client settings
  timeout: 10000,
  keepAliveTimeout: 30000,

  // Thresholds
  latencyWarn: 500,   // ms
  latencyCritical: 2000, // ms

  // Cache thresholds (CRITICAL for QR launch)
  cacheHitRateMinimum: 80,    // 80% minimum cache hit rate
  cacheHitRateTarget: 95,     // 95% target for QR endpoints
};

// Cache test endpoints (use workers.dev until custom domain routes are configured)
const CACHE_TEST_ENDPOINTS = [
  'https://empire-pro-status.utahj4754.workers.dev/health',
  'https://empire-pro-status.utahj4754.workers.dev/status',
  'https://empire-pro-status.utahj4754.workers.dev/metrics',
];

// ═══════════════════════════════════════════════════════════
// HEALTH CHECK FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Check DNS records availability via Cloudflare API
 */
async function checkDNS(): Promise<HealthCheckResult> {
  const start = performance.now();
  const errors: string[] = [];

  try {
    // Check if API token is available
    if (!process.env.CF_API_TOKEN) {
      // Fallback to direct DNS resolution
      const hostname = DEFAULT_DOMAIN;
      const resolved = await Bun.dns.lookup(hostname, { family: 4 });
      const latency = Math.round(performance.now() - start);

      return {
        status: 'healthy',
        latency,
        message: `DNS resolves: ${hostname} → ${resolved.address}`,
        details: {
          hostname,
          address: resolved.address,
          method: 'bun-dns-lookup',
        },
      };
    }

    // Full DNS check via Cloudflare API
    const client = new CloudflareClient();
    const records = await client.listDNSRecords();
    const latency = Math.round(performance.now() - start);

    // Verify critical subdomains
    const missingRecords: string[] = [];
    for (const subdomain of CONFIG.subdomains) {
      const fullName = `${subdomain}.${DEFAULT_DOMAIN}`;
      const found = records.some(r => r.name === fullName);
      if (!found) {
        missingRecords.push(subdomain);
      }
    }

    if (missingRecords.length > 0) {
      return {
        status: 'degraded',
        latency,
        message: `Missing DNS records: ${missingRecords.join(', ')}`,
        details: {
          totalRecords: records.length,
          missingSubdomains: missingRecords,
        },
        errors: [`Missing records: ${missingRecords.join(', ')}`],
      };
    }

    return {
      status: 'healthy',
      latency,
      message: `All ${records.length} DNS records verified`,
      details: {
        totalRecords: records.length,
        proxiedRecords: records.filter(r => r.proxied).length,
        zone: DEFAULT_DOMAIN,
      },
    };
  } catch (error) {
    const latency = Math.round(performance.now() - start);
    const message = error instanceof Error ? error.message : String(error);
    errors.push(message);

    return {
      status: 'unhealthy',
      latency,
      message: `DNS check failed: ${message}`,
      errors,
    };
  }
}

/**
 * Check SSL certificate status
 */
async function checkSSL(): Promise<HealthCheckResult> {
  const start = performance.now();

  try {
    if (!process.env.CF_API_TOKEN) {
      // Fallback: Check via HTTPS handshake
      const response = await fetch(`https://${DEFAULT_DOMAIN}`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(CONFIG.timeout),
      });
      const latency = Math.round(performance.now() - start);

      return {
        status: response.ok || response.status === 301 ? 'healthy' : 'degraded',
        latency,
        message: 'SSL handshake successful',
        details: {
          domain: DEFAULT_DOMAIN,
          method: 'https-handshake',
        },
      };
    }

    const client = new CloudflareClient();
    const certPacks = await client.getSSLCertificatePacks();
    const latency = Math.round(performance.now() - start);

    const activeCerts = certPacks.filter((c: any) => c.status === 'active');

    if (activeCerts.length === 0) {
      return {
        status: 'unhealthy',
        latency,
        message: 'No active SSL certificates found',
        errors: ['No active certificates'],
      };
    }

    // Check expiration
    const now = new Date();
    const expiringCerts = activeCerts.filter((c: any) => {
      if (!c.certificates?.[0]?.expires_on) return false;
      const expires = new Date(c.certificates[0].expires_on);
      const daysUntilExpiry = (expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return daysUntilExpiry < 30;
    });

    if (expiringCerts.length > 0) {
      return {
        status: 'degraded',
        latency,
        message: 'SSL certificates expiring within 30 days',
        details: {
          activeCerts: activeCerts.length,
          expiringCerts: expiringCerts.length,
        },
      };
    }

    return {
      status: 'healthy',
      latency,
      message: `${activeCerts.length} active SSL certificate(s)`,
      details: {
        activeCerts: activeCerts.length,
        issuer: activeCerts[0]?.certificates?.[0]?.issuer || 'Cloudflare',
      },
    };
  } catch (error) {
    const latency = Math.round(performance.now() - start);
    const message = error instanceof Error ? error.message : String(error);

    return {
      status: 'unhealthy',
      latency,
      message: `SSL check failed: ${message}`,
      errors: [message],
    };
  }
}

/**
 * Check CDN endpoints with HTTP keepalive
 */
async function checkCDN(): Promise<HealthCheckResult> {
  const start = performance.now();
  const endpointResults: EndpointCheck[] = [];
  const errors: string[] = [];

  for (const url of CONFIG.endpoints) {
    const checkStart = performance.now();
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Connection': 'keep-alive',
          'Keep-Alive': `timeout=${CONFIG.keepAliveTimeout / 1000}`,
          'User-Agent': 'DuoPlus-HealthCheck/1.0',
        },
        signal: AbortSignal.timeout(CONFIG.timeout),
      });

      const checkLatency = Math.round(performance.now() - checkStart);
      const connectionHeader = response.headers.get('connection') || '';

      endpointResults.push({
        url,
        status: response.status,
        latency: checkLatency,
        headers: {
          'content-type': response.headers.get('content-type') || '',
          'connection': connectionHeader,
          'cf-ray': response.headers.get('cf-ray') || '',
          'cf-cache-status': response.headers.get('cf-cache-status') || '',
        },
        keepalive: connectionHeader.toLowerCase().includes('keep-alive'),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${url}: ${message}`);
      endpointResults.push({
        url,
        status: 0,
        latency: Math.round(performance.now() - checkStart),
        headers: {},
        keepalive: false,
      });
    }
  }

  const latency = Math.round(performance.now() - start);
  const healthyEndpoints = endpointResults.filter(e => e.status >= 200 && e.status < 300);
  const avgLatency = endpointResults.length > 0
    ? Math.round(endpointResults.reduce((sum, e) => sum + e.latency, 0) / endpointResults.length)
    : 0;

  let status: 'healthy' | 'degraded' | 'unhealthy';
  if (healthyEndpoints.length === endpointResults.length) {
    status = avgLatency > CONFIG.latencyCritical ? 'degraded' : 'healthy';
  } else if (healthyEndpoints.length > 0) {
    status = 'degraded';
  } else {
    status = 'unhealthy';
  }

  return {
    status,
    latency,
    message: `${healthyEndpoints.length}/${endpointResults.length} endpoints healthy (avg ${avgLatency}ms)`,
    details: {
      endpoints: endpointResults,
      avgLatency,
      keepaliveSupported: endpointResults.some(e => e.keepalive),
    },
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Check R2 bucket connectivity
 */
async function checkR2(): Promise<HealthCheckResult> {
  const start = performance.now();
  const testKey = `.health-check-${Date.now()}`;
  const testContent = `health-check-${Date.now()}`;

  try {
    const s3 = Bun.s3;
    const file = s3.file(testKey);

    // Write test
    const writeStart = performance.now();
    await file.write(testContent);
    const writeLatency = Math.round(performance.now() - writeStart);

    // Read test
    const readStart = performance.now();
    const content = await file.text();
    const readLatency = Math.round(performance.now() - readStart);

    // Verify content
    if (content !== testContent) {
      throw new Error('Content mismatch after write/read cycle');
    }

    // Delete test file
    const deleteStart = performance.now();
    await file.delete();
    const deleteLatency = Math.round(performance.now() - deleteStart);

    const latency = Math.round(performance.now() - start);

    return {
      status: 'healthy',
      latency,
      message: `R2 bucket operational (W:${writeLatency}ms R:${readLatency}ms D:${deleteLatency}ms)`,
      details: {
        bucket: CONFIG.r2Bucket,
        endpoint: process.env.R2_ENDPOINT || process.env.S3_ENDPOINT || 'default',
        operations: {
          write: { latency: writeLatency, success: true },
          read: { latency: readLatency, success: true },
          delete: { latency: deleteLatency, success: true },
        },
      },
    };
  } catch (error) {
    const latency = Math.round(performance.now() - start);
    const message = error instanceof Error ? error.message : String(error);

    // Check if it's a configuration issue
    const isConfigError = message.includes('credentials') ||
                          message.includes('bucket') ||
                          message.includes('endpoint');

    return {
      status: 'unhealthy',
      latency,
      message: `R2 check failed: ${message}`,
      details: {
        bucket: CONFIG.r2Bucket,
        isConfigError,
      },
      errors: [message],
    };
  }
}

/**
 * Check HTTP keepalive functionality
 */
async function checkKeepalive(): Promise<HealthCheckResult> {
  const start = performance.now();
  const testUrl = CONFIG.endpoints[0];
  const requestCount = 5;
  const latencies: number[] = [];

  try {
    // Make multiple requests to test connection reuse
    for (let i = 0; i < requestCount; i++) {
      const reqStart = performance.now();
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Connection': 'keep-alive',
          'Keep-Alive': `timeout=${CONFIG.keepAliveTimeout / 1000}`,
        },
        signal: AbortSignal.timeout(CONFIG.timeout),
      });

      if (!response.ok) {
        throw new Error(`Request ${i + 1} failed with status ${response.status}`);
      }

      latencies.push(Math.round(performance.now() - reqStart));

      // Small delay between requests
      await Bun.sleep(50);
    }

    const totalLatency = Math.round(performance.now() - start);
    const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
    const firstLatency = latencies[0];
    const subsequentAvg = Math.round(latencies.slice(1).reduce((a, b) => a + b, 0) / (latencies.length - 1));

    // Connection reuse indicator: subsequent requests should be faster
    const connectionReuse = subsequentAvg < firstLatency * 0.8;

    return {
      status: connectionReuse ? 'healthy' : 'degraded',
      latency: totalLatency,
      message: connectionReuse
        ? `Keepalive working (first: ${firstLatency}ms, avg subsequent: ${subsequentAvg}ms)`
        : `Keepalive may not be optimal (first: ${firstLatency}ms, avg: ${avgLatency}ms)`,
      details: {
        requestCount,
        latencies,
        firstRequest: firstLatency,
        subsequentAverage: subsequentAvg,
        connectionReuse,
        improvement: connectionReuse ? `${Math.round((1 - subsequentAvg / firstLatency) * 100)}% faster` : 'none',
      },
    };
  } catch (error) {
    const latency = Math.round(performance.now() - start);
    const message = error instanceof Error ? error.message : String(error);

    return {
      status: 'unhealthy',
      latency,
      message: `Keepalive check failed: ${message}`,
      errors: [message],
    };
  }
}

/**
 * 🚨 CRITICAL: Check Cloudflare cache hit rate
 * Required for QR launch - must be > 80% for production
 */
async function checkCache(): Promise<HealthCheckResult> {
  const start = performance.now();
  const results: Array<{ url: string; status: string; latency: number; cached: boolean }> = [];
  const errors: string[] = [];

  for (const endpoint of CACHE_TEST_ENDPOINTS) {
    try {
      // Make two requests - first populates cache, second should be HIT
      for (let i = 0; i < 2; i++) {
        const reqStart = performance.now();
        const response = await fetch(endpoint, {
          method: 'HEAD',
          headers: {
            'Cache-Control': 'no-transform',
            'User-Agent': 'DuoPlus-CacheCheck/1.0',
          },
          signal: AbortSignal.timeout(CONFIG.timeout),
        });

        const reqLatency = Math.round(performance.now() - reqStart);
        const cacheStatus = response.headers.get('cf-cache-status') || 'UNKNOWN';

        if (i === 1) { // Only record second request (should be cached)
          results.push({
            url: new URL(endpoint).pathname,
            status: cacheStatus,
            latency: reqLatency,
            cached: cacheStatus === 'HIT',
          });
        }

        await Bun.sleep(100); // Wait for cache propagation
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${endpoint}: ${message}`);
      results.push({
        url: new URL(endpoint).pathname,
        status: 'ERROR',
        latency: 0,
        cached: false,
      });
    }
  }

  const latency = Math.round(performance.now() - start);
  const cachedCount = results.filter(r => r.cached).length;
  const hitRate = results.length > 0 ? Math.round((cachedCount / results.length) * 100) : 0;

  // Determine status based on cache hit rate
  let status: 'healthy' | 'degraded' | 'unhealthy';
  if (hitRate >= CONFIG.cacheHitRateTarget) {
    status = 'healthy';
  } else if (hitRate >= CONFIG.cacheHitRateMinimum) {
    status = 'degraded';
  } else {
    status = 'unhealthy';
  }

  const statusEmoji = status === 'healthy' ? '✅' : status === 'degraded' ? '🟡' : '🔴';

  return {
    status,
    latency,
    message: `${statusEmoji} Cache hit rate: ${hitRate}% (${cachedCount}/${results.length} endpoints)`,
    details: {
      hitRate,
      target: CONFIG.cacheHitRateTarget,
      minimum: CONFIG.cacheHitRateMinimum,
      endpoints: results,
      recommendation: hitRate < CONFIG.cacheHitRateMinimum
        ? '🚨 CRITICAL: Run "bun run cf:cache:apply" before QR launch'
        : hitRate < CONFIG.cacheHitRateTarget
          ? '⚠️ Consider optimizing cache rules'
          : 'Cache configuration optimal',
    },
    errors: errors.length > 0 ? errors : undefined,
  };
}

// ═══════════════════════════════════════════════════════════
// MAIN HEALTH CHECK
// ═══════════════════════════════════════════════════════════

async function runHealthChecks(options: {
  dns?: boolean;
  ssl?: boolean;
  cdn?: boolean;
  r2?: boolean;
  keepalive?: boolean;
  cache?: boolean;
  all?: boolean;
}): Promise<HealthReport> {
  const start = performance.now();
  const runAll = options.all || (!options.dns && !options.ssl && !options.cdn && !options.r2 && !options.keepalive && !options.cache);

  const report: HealthReport = {
    timestamp: new Date().toISOString(),
    overall: 'healthy',
    checks: {},
    errors: [],
    duration: 0,
  };

  // Run selected checks in parallel where possible
  const checksToRun: Promise<void>[] = [];

  if (runAll || options.dns) {
    checksToRun.push(
      checkDNS().then(result => { report.checks.dns = result; })
    );
  }

  if (runAll || options.ssl) {
    checksToRun.push(
      checkSSL().then(result => { report.checks.ssl = result; })
    );
  }

  if (runAll || options.cdn) {
    checksToRun.push(
      checkCDN().then(result => { report.checks.cdn = result; })
    );
  }

  if (runAll || options.r2) {
    checksToRun.push(
      checkR2().then(result => { report.checks.r2 = result; })
    );
  }

  if (runAll || options.keepalive) {
    checksToRun.push(
      checkKeepalive().then(result => { report.checks.keepalive = result; })
    );
  }

  if (runAll || options.cache) {
    checksToRun.push(
      checkCache().then(result => { report.checks.cache = result; })
    );
  }

  await Promise.all(checksToRun);

  // Determine overall status
  const statuses = Object.values(report.checks).map(c => c.status);
  if (statuses.some(s => s === 'unhealthy')) {
    report.overall = 'unhealthy';
  } else if (statuses.some(s => s === 'degraded')) {
    report.overall = 'degraded';
  }

  // Collect all errors
  for (const check of Object.values(report.checks)) {
    if (check.errors) {
      report.errors.push(...check.errors);
    }
  }

  report.duration = Math.round(performance.now() - start);

  return report;
}

// ═══════════════════════════════════════════════════════════
// CLI OUTPUT
// ═══════════════════════════════════════════════════════════

function printReport(report: HealthReport): void {
  const statusEmoji = {
    healthy: '🟢',
    degraded: '🟡',
    unhealthy: '🔴',
  };

  console.log('\n' + '═'.repeat(60));
  console.log('🏥 Infrastructure Health Report');
  console.log('═'.repeat(60));
  console.log(`📅 Timestamp: ${report.timestamp}`);
  console.log(`⏱️  Duration: ${report.duration}ms`);
  console.log(`${statusEmoji[report.overall]} Overall: ${report.overall.toUpperCase()}`);
  console.log('─'.repeat(60));

  for (const [name, check] of Object.entries(report.checks)) {
    console.log(`\n${statusEmoji[check.status]} ${name.toUpperCase()}`);
    console.log(`   Status: ${check.status} (${check.latency}ms)`);
    console.log(`   ${check.message}`);

    if (check.details) {
      for (const [key, value] of Object.entries(check.details)) {
        if (typeof value === 'object') {
          console.log(`   ${key}: ${JSON.stringify(value)}`);
        } else {
          console.log(`   ${key}: ${value}`);
        }
      }
    }
  }

  if (report.errors.length > 0) {
    console.log('\n❌ Errors:');
    for (const error of report.errors) {
      console.log(`   • ${error}`);
    }
  }

  console.log('\n' + '═'.repeat(60));
}

function printJSON(report: HealthReport): void {
  console.log(JSON.stringify(report, null, 2));
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);

  const options = {
    dns: args.includes('--dns'),
    ssl: args.includes('--ssl'),
    cdn: args.includes('--cdn'),
    r2: args.includes('--r2'),
    keepalive: args.includes('--keepalive'),
    cache: args.includes('--cache'),
    all: args.includes('--all'),
    json: args.includes('--json'),
    help: args.includes('--help') || args.includes('-h'),
  };

  if (options.help) {
    console.log(`
🏥 Infrastructure Health Check v1.1

Usage:
  bun run scripts/infrastructure-health.ts [options]

Options:
  --dns         Check DNS records and resolution
  --ssl         Check SSL certificate status
  --cdn         Check CDN endpoint availability
  --r2          Check R2 bucket connectivity
  --keepalive   Test HTTP keepalive functionality
  --cache       🚨 Check Cloudflare cache hit rate (CRITICAL for QR launch)
  --all         Run all checks (default if no options)
  --json        Output as JSON
  --help, -h    Show this help

Cache Hit Rate Matrix (QR Launch Requirements):
┌─────────────────┬──────────────┬────────────┬─────────────┐
│ Endpoint        │ Min Rate     │ Target     │ Status      │
├─────────────────┼──────────────┼────────────┼─────────────┤
│ /api/qr/*       │ 80%          │ 95%        │ CRITICAL    │
│ /health         │ 80%          │ 90%        │ Required    │
│ /status         │ 80%          │ 90%        │ Required    │
└─────────────────┴──────────────┴────────────┴─────────────┘

Environment:
  CF_API_TOKEN  - Cloudflare API token (optional, enables full DNS check)
  R2_BUCKET     - R2 bucket name (default: factory-wager-packages)
  S3_ENDPOINT   - S3/R2 endpoint URL

Examples:
  bun run scripts/infrastructure-health.ts                    # Run all checks
  bun run scripts/infrastructure-health.ts --cache            # Check cache ONLY (pre-QR launch)
  bun run scripts/infrastructure-health.ts --cdn --r2         # Check CDN and R2 only
  bun run scripts/infrastructure-health.ts --all --json       # Full check, JSON output

Dashboard: ${urlLink('https://dash.cloudflare.com', 'Cloudflare Dashboard')}
    `);
    process.exit(0);
  }

  try {
    const report = await runHealthChecks(options);

    if (options.json) {
      printJSON(report);
    } else {
      printReport(report);
    }

    // Exit code based on overall status
    process.exit(report.overall === 'healthy' ? 0 : report.overall === 'degraded' ? 1 : 2);
  } catch (error) {
    console.error('❌ Health check failed:', error);
    process.exit(2);
  }
}

// Export for programmatic use
export { runHealthChecks, HealthReport, HealthCheckResult };

if (import.meta.main) {
  main();
}
