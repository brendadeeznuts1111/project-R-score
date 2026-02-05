#!/usr/bin/env bun

/**
 * Domain Validation Script - Cross-Platform Bun Shell
 * TypeScript-powered domain health checking with full autocomplete
 */

import { $, type ShellOutput } from 'bun';

// TypeScript interfaces for better development experience
interface DNSRecord {
  type: 'A' | 'AAAA' | 'CNAME' | 'TXT';
  name: string;
  value: string;
  ttl: number;
}

interface HTTPResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body?: string;
}

interface ValidationResult {
  check: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: string;
  suggestion?: string;
}

interface DomainHealthReport {
  domain: string;
  timestamp: string;
  overallStatus: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  checks: ValidationResult[];
  recommendations: string[];
}

// Configuration with type safety
const CONFIG = {
  domain: 'docs.apexodds.net',
  pagesDomain: 'crystal-clear-architecture.pages.dev',
  expectedRecords: [
    {
      type: 'CNAME' as const,
      name: 'docs',
      target: 'crystal-clear-architecture.pages.dev',
    },
  ],
} as const;

// Utility functions with full TypeScript support
async function resolveDNS(
  domain: string,
  type: 'A' | 'AAAA' | 'CNAME' = 'CNAME'
): Promise<string[]> {
  try {
    const result = await $`dig +short ${type} ${domain}`.text();
    return result
      .trim()
      .split('\n')
      .filter(line => line.length > 0);
  } catch {
    return [];
  }
}

async function makeHTTPRequest(
  url: string,
  method: 'GET' | 'HEAD' = 'HEAD'
): Promise<HTTPResponse> {
  try {
    const response = await fetch(url, { method });

    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: method === 'GET' ? await response.text() : undefined,
    };
  } catch (error) {
    return {
      status: 0,
      statusText: 'Connection Failed',
      headers: {},
      body: `Error: ${error}`,
    };
  }
}

async function checkCommandAvailability(command: string): Promise<boolean> {
  try {
    await $`which ${command}`.quiet();
    return true;
  } catch {
    return false;
  }
}

function log(message: string, level: 'INFO' | 'SUCCESS' | 'ERROR' | 'WARNING' = 'INFO'): void {
  const timestamp = new Date().toISOString();
  const emoji = {
    INFO: '🔍',
    SUCCESS: '✅',
    ERROR: '❌',
    WARNING: '⚠️',
  }[level];

  console.log(`${timestamp} ${emoji} ${message}`);
}

async function validateDNS(): Promise<ValidationResult> {
  log('Checking DNS resolution...', 'INFO');

  const records = await resolveDNS(CONFIG.domain, 'CNAME');

  if (records.length === 0) {
    return {
      check: 'DNS Resolution',
      status: 'FAIL',
      message: `No CNAME records found for ${CONFIG.domain}`,
      suggestion: 'Add CNAME record: docs -> crystal-clear-architecture.pages.dev',
    };
  }

  const expectedTarget = CONFIG.expectedRecords[0].target;
  const hasCorrectRecord = records.some(record => record === expectedTarget);

  if (hasCorrectRecord) {
    return {
      check: 'DNS Resolution',
      status: 'PASS',
      message: `CNAME record correctly points to ${expectedTarget}`,
      details: `Found records: ${records.join(', ')}`,
    };
  } else {
    return {
      check: 'DNS Resolution',
      status: 'FAIL',
      message: `CNAME record points to ${records[0]}, expected ${expectedTarget}`,
      suggestion: `Update CNAME record to point to ${expectedTarget}`,
    };
  }
}

async function validateHTTP(): Promise<ValidationResult> {
  log('Testing HTTP connectivity...', 'INFO');

  const url = `https://${CONFIG.domain}/api/health`;
  const response = await makeHTTPRequest(url);

  if (response.status === 200) {
    return {
      check: 'HTTP Connectivity',
      status: 'PASS',
      message: 'Custom domain responds correctly',
      details: `Status: ${response.status} ${response.statusText}`,
    };
  } else if (response.status === 0) {
    return {
      check: 'HTTP Connectivity',
      status: 'FAIL',
      message: 'Cannot connect to custom domain',
      suggestion: 'Check if DNS records are properly configured and propagated',
    };
  } else {
    return {
      check: 'HTTP Connectivity',
      status: 'WARN',
      message: `Unexpected HTTP status: ${response.status} ${response.statusText}`,
      suggestion: 'Check Cloudflare Pages deployment status',
    };
  }
}

async function validateSSL(): Promise<ValidationResult> {
  log('Validating SSL certificate...', 'INFO');

  const url = `https://${CONFIG.domain}`;
  const response = await makeHTTPRequest(url);

  if (response.status === 0) {
    return {
      check: 'SSL Certificate',
      status: 'FAIL',
      message: 'SSL connection failed',
      suggestion: 'Ensure domain is properly configured in Cloudflare',
    };
  }

  // Check for Cloudflare headers
  const hasCloudflareHeaders = Object.keys(response.headers).some(
    key => key.toLowerCase().includes('cf-') || key.toLowerCase().includes('server')
  );

  if (hasCloudflareHeaders) {
    return {
      check: 'SSL Certificate',
      status: 'PASS',
      message: 'SSL certificate is valid and served by Cloudflare',
      details: 'Cloudflare edge network detected',
    };
  } else {
    return {
      check: 'SSL Certificate',
      status: 'WARN',
      message: 'SSL certificate may not be fully configured',
      suggestion: 'Check Cloudflare SSL/TLS settings',
    };
  }
}

async function validatePagesAPI(): Promise<ValidationResult> {
  log('Testing Cloudflare Pages API...', 'INFO');

  const url = `https://${CONFIG.domain}/api/health`;
  const response = await makeHTTPRequest(url, 'GET');

  if (response.status === 200 && response.body) {
    try {
      const healthData = JSON.parse(response.body);
      const isHealthy = healthData.status === 'healthy';

      if (isHealthy) {
        return {
          check: 'Pages API',
          status: 'PASS',
          message: 'Pages Functions API is working correctly',
          details: `Service: ${healthData.service}, Version: ${healthData.version}`,
        };
      } else {
        return {
          check: 'Pages API',
          status: 'WARN',
          message: 'Pages Functions API responded but service is not healthy',
          details: `Status: ${healthData.status}`,
        };
      }
    } catch {
      return {
        check: 'Pages API',
        status: 'WARN',
        message: 'Pages Functions API returned invalid JSON',
        suggestion: 'Check API endpoint implementation',
      };
    }
  } else {
    return {
      check: 'Pages API',
      status: 'FAIL',
      message: 'Pages Functions API is not responding',
      suggestion: 'Ensure functions are deployed and routes are configured',
    };
  }
}

function generateReport(results: ValidationResult[]): DomainHealthReport {
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warnings = results.filter(r => r.status === 'WARN').length;

  let overallStatus: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  if (failed > 0) {
    overallStatus = 'UNHEALTHY';
  } else if (warnings > 0) {
    overallStatus = 'DEGRADED';
  } else {
    overallStatus = 'HEALTHY';
  }

  const recommendations = results.filter(r => r.suggestion).map(r => r.suggestion!);

  return {
    domain: CONFIG.domain,
    timestamp: new Date().toISOString(),
    overallStatus,
    checks: results,
    recommendations,
  };
}

function displayReport(report: DomainHealthReport): void {
  console.log('\n📊 Domain Health Report');
  console.log('!==!==!==!===');

  const statusEmoji = {
    HEALTHY: '✅',
    DEGRADED: '⚠️',
    UNHEALTHY: '❌',
  }[report.overallStatus];

  console.log(`Domain: ${report.domain}`);
  console.log(`Status: ${statusEmoji} ${report.overallStatus}`);
  console.log(`Timestamp: ${report.timestamp}`);
  console.log('');

  console.log('Validation Results:');
  report.checks.forEach((check, index) => {
    const emoji = {
      PASS: '✅',
      FAIL: '❌',
      WARN: '⚠️',
    }[check.status];

    console.log(`${index + 1}. ${emoji} ${check.check}: ${check.message}`);
    if (check.details) {
      console.log(`   Details: ${check.details}`);
    }
  });

  if (report.recommendations.length > 0) {
    console.log('\n🔧 Recommendations:');
    report.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
  }

  console.log('\n📈 Summary:');
  console.log(`   Passed: ${report.checks.filter(c => c.status === 'PASS').length}`);
  console.log(`   Warnings: ${report.checks.filter(c => c.status === 'WARN').length}`);
  console.log(`   Failed: ${report.checks.filter(c => c.status === 'FAIL').length}`);
}

async function main(): Promise<void> {
  console.log('🔍 Crystal Clear Architecture - Domain Validation');
  console.log('!==!==!==!==!==!==!==!==!==');

  // Check required tools
  const hasDig = await checkCommandAvailability('dig');
  if (!hasDig) {
    log('dig command not found - DNS checks will be limited', 'WARNING');
  }

  // Run all validations
  const validations = await Promise.all([
    validateDNS(),
    validateHTTP(),
    validateSSL(),
    validatePagesAPI(),
  ]);

  // Generate and display report
  const report = generateReport(validations);
  displayReport(report);

  // Exit with appropriate code
  const exitCode =
    report.overallStatus === 'HEALTHY' ? 0 : report.overallStatus === 'DEGRADED' ? 1 : 2;

  console.log(`\n🏁 Validation completed with exit code: ${exitCode}`);
  process.exit(exitCode);
}

// Handle command line arguments
const args = process.argv.slice(2);
const command = args[0] || 'validate';

switch (command) {
  case 'validate':
    await main();
    break;

  case 'dns':
    const dnsResult = await validateDNS();
    console.log(JSON.stringify(dnsResult, null, 2));
    break;

  case 'http':
    const httpResult = await validateHTTP();
    console.log(JSON.stringify(httpResult, null, 2));
    break;

  case 'ssl':
    const sslResult = await validateSSL();
    console.log(JSON.stringify(sslResult, null, 2));
    break;

  case 'api':
    const apiResult = await validatePagesAPI();
    console.log(JSON.stringify(apiResult, null, 2));
    break;

  case 'help':
    console.log(`
🚀 Domain Validation Tool

Usage:
  bun run scripts/validate-domain-setup.bun.ts [command]

Commands:
  validate  Full validation suite (default)
  dns       DNS resolution check only
  http      HTTP connectivity check only
  ssl       SSL certificate check only
  api       Pages API check only
  help      Show this help

Exit Codes:
  0 - All checks passed (HEALTHY)
  1 - Some warnings (DEGRADED)
  2 - Critical failures (UNHEALTHY)
`);
    break;

  default:
    console.log(`Unknown command: ${command}`);
    console.log('Run with --help for usage information');
    process.exit(1);
}

export {
  type DNSRecord,
  type HTTPResponse,
  type ValidationResult,
  type DomainHealthReport,
  CONFIG,
};
