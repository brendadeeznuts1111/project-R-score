#!/usr/bin/env bun

/**
 * 🛡️ Fantasy42 Security CLI Tool
 *
 * Command-line interface for Fantasy42 security operations with User-Agent management,
 * compliance checking, and security monitoring.
 */

import { parseArgs } from 'util';
import { Fantasy42UserAgents, UserAgentMonitor } from '../packages/core-security/src/user-agents';
import {
  Fantasy42SecureClient,
  SecureClientFactory,
} from '../packages/core-security/src/secure-client';
import { Fantasy42FraudDetectionClient } from '../packages/core-security/fraud-detection/src/config';
import { Fantasy42AgentMonitor } from '../packages/analytics-dashboard/src/agent-monitor';
import { Fantasy42ComplianceLogger } from '../packages/compliance-core/src/audit-logger';

// Parse command line arguments
const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    package: { type: 'string', default: 'fraud-detection' },
    environment: { type: 'string', default: 'production' },
    endpoint: { type: 'string', default: '/api/v1/health' },
    method: { type: 'string', default: 'GET' },
    verbose: { type: 'boolean', default: false },
    'user-agent': { type: 'string' },
    'geo-region': { type: 'string', default: 'global' },
    'build-version': { type: 'string', default: '1.0.0' },
    compliance: { type: 'boolean', default: true },
    monitor: { type: 'boolean', default: false },
    audit: { type: 'boolean', default: false },
  },
  strict: true,
  allowPositionals: true,
});

const command = positionals[0] || 'help';

async function main() {
  try {
    switch (command) {
      case 'check':
        await runSecurityCheck();
        break;

      case 'monitor':
        await runMonitoring();
        break;

      case 'audit':
        await runAudit();
        break;

      case 'agent':
        await showAgentInfo();
        break;

      case 'test':
        await runTest();
        break;

      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

async function runSecurityCheck() {
  console.log('🔍 Running Fantasy42 Security Check...');

  // Create User-Agent for this operation
  const userAgent =
    values['user-agent'] ||
    Fantasy42UserAgents.generateEnterpriseAgent(values.package!.toUpperCase(), {
      environment: values.environment as any,
      buildVersion: values['build-version']!,
      geoRegion: values['geo-region']!,
      securityLevel: 'maximum',
      compliance: values.compliance,
    });

  console.log(`🛡️ Using User-Agent: ${userAgent}`);

  // Create appropriate client based on package type
  let client: Fantasy42SecureClient;

  switch (values.package) {
    case 'fraud-detection':
      client = SecureClientFactory.createFraudDetectionClient(values.environment as any, {
        geoRegion: values['geo-region'],
        buildVersion: values['build-version'],
      });
      break;

    case 'payment':
      client = SecureClientFactory.createPaymentClient(values.environment as any, {
        geoRegion: values['geo-region'],
        buildVersion: values['build-version'],
      });
      break;

    case 'analytics':
      client = SecureClientFactory.createAnalyticsClient(values.environment as any, {
        geoRegion: values['geo-region'],
        buildVersion: values['build-version'],
      });
      break;

    default:
      client = new Fantasy42SecureClient(values.package!.toUpperCase(), values.environment as any, {
        geoRegion: values['geo-region'],
        buildVersion: values['build-version'],
      });
  }

  // Track User-Agent usage
  UserAgentMonitor.trackAgent(userAgent);

  // Perform the check
  try {
    const response = await client.request({
      url: values.endpoint!,
      method: values.method as any,
      timeout: 10000,
    });

    console.log('✅ Security check completed successfully');
    console.log(`📊 Status: ${response.status}`);
    console.log(`🆔 Request ID: ${response.requestId}`);

    if (values.verbose) {
      console.log(`📋 Response:`, JSON.stringify(response.data, null, 2));
    }

    // Log to compliance if enabled
    if (values.audit) {
      const logger = Fantasy42ComplianceLogger.getInstance(values.environment as any);
      await logger.logSecurityRequest(values.endpoint!, response.status, {
        userAgent,
        method: values.method,
        duration: Date.now() - new Date(response.timestamp).getTime(),
      });
    }
  } catch (error) {
    console.error('❌ Security check failed:', error);

    // Log error to compliance
    if (values.audit) {
      const logger = Fantasy42ComplianceLogger.getInstance(values.environment as any);
      await logger.logSecurityRequest(values.endpoint!, 500, {
        userAgent,
        method: values.method,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    throw error;
  }
}

async function runMonitoring() {
  console.log('📊 Starting Fantasy42 Security Monitoring...');

  const monitor = new Fantasy42AgentMonitor(values.environment as any);

  if (values.monitor) {
    console.log('🔄 Starting real-time monitoring...');
    monitor.startMonitoring(30000); // Monitor every 30 seconds

    // Run for specified duration or indefinitely
    const duration = 300000; // 5 minutes default
    console.log(`⏱️ Monitoring for ${duration / 1000} seconds...`);

    await new Promise(resolve => setTimeout(resolve, duration));

    monitor.stopMonitoring();
  }

  // Get current metrics
  const metrics = await monitor.getMetrics();

  console.log('\n📈 Current Security Metrics:');
  console.log('='.repeat(50));
  console.log(`Total Requests: ${metrics.totalRequests}`);
  console.log(`Unique Agents: ${metrics.uniqueAgents}`);
  console.log(`Compliance Rate: ${(metrics.complianceRate * 100).toFixed(1)}%`);
  console.log(`Suspicious Agents: ${metrics.suspiciousAgents}`);
  console.log(`Blocked Agents: ${metrics.blockedAgents}`);

  if (metrics.topAgents.length > 0) {
    console.log('\n🏆 Top User-Agents:');
    metrics.topAgents.slice(0, 5).forEach((agent, index) => {
      console.log(`${index + 1}. ${agent.agent} (${agent.count} requests)`);
    });
  }

  // Generate security report
  const report = UserAgentMonitor.generateSecurityReport();
  console.log('\n📋 Security Report:');
  console.log(report);
}

async function runAudit() {
  console.log('📋 Running Fantasy42 Compliance Audit...');

  const logger = Fantasy42ComplianceLogger.getInstance(values.environment as any);

  // Generate audit report for the last 24 hours
  const endDate = new Date().toISOString();
  const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const report = await logger.generateComplianceReport(startDate, endDate);

  console.log('\n📊 Compliance Audit Report');
  console.log('='.repeat(50));
  console.log(`Period: ${startDate} to ${endDate}`);
  console.log(`Total Entries: ${report.summary.totalEntries}`);
  console.log(`Compliance Rate: ${(report.summary.complianceRate * 100).toFixed(1)}%`);
  console.log(`Critical Violations: ${report.summary.criticalViolations}`);
  console.log(`High Violations: ${report.summary.highViolations}`);
  console.log(`Medium Violations: ${report.summary.mediumViolations}`);
  console.log(`Low Violations: ${report.summary.lowViolations}`);

  console.log('\n🏛️ Framework Compliance:');
  console.log(`GDPR: ${report.compliance.gdpr.status} (${report.compliance.gdpr.score}%)`);
  console.log(`PCI: ${report.compliance.pci.status} (${report.compliance.pci.score}%)`);
  console.log(`AML: ${report.compliance.aml.status} (${report.compliance.aml.score}%)`);
  console.log(`Overall: ${report.compliance.overall.status} (${report.compliance.overall.score}%)`);

  if (report.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    report.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
  }

  if (report.violations.length > 0 && values.verbose) {
    console.log('\n🚨 Recent Violations:');
    report.violations.slice(0, 5).forEach((violation, index) => {
      console.log(`${index + 1}. [${violation.level}] ${violation.event}: ${violation.action}`);
    });
  }
}

async function showAgentInfo() {
  console.log('🛡️ Fantasy42 User-Agent Information');

  // Generate User-Agent for current configuration
  const userAgent =
    values['user-agent'] ||
    Fantasy42UserAgents.generateEnterpriseAgent(values.package!.toUpperCase(), {
      environment: values.environment as any,
      buildVersion: values['build-version']!,
      geoRegion: values['geo-region']!,
      securityLevel: 'maximum',
      compliance: values.compliance,
    });

  console.log('\n🔧 Current Configuration:');
  console.log(`Package: ${values.package}`);
  console.log(`Environment: ${values.environment}`);
  console.log(`Geo Region: ${values['geo-region']}`);
  console.log(`Build Version: ${values['build-version']}`);
  console.log(`Compliance: ${values.compliance ? 'Enabled' : 'Disabled'}`);

  console.log('\n🛡️ Generated User-Agent:');
  console.log(userAgent);

  console.log('\n📊 User-Agent Analysis:');
  console.log(`Length: ${userAgent.length} characters`);
  console.log(`Compliance Markers: ${userAgent.includes('GDPR') ? '✅' : '❌'} GDPR`);
  console.log(
    `Security Level: ${userAgent.includes('Sec:Maximum') ? '✅ Maximum' : '❓ Standard'}`
  );
  console.log(
    `Geo Compliance: ${userAgent.includes('GDPR') || userAgent.includes('Market') ? '✅' : '❌'}`
  );

  // Check if it's suspicious
  UserAgentMonitor.trackAgent(userAgent);
  const isSuspicious = UserAgentMonitor.isSuspicious(userAgent);
  console.log(`Suspicious: ${isSuspicious ? '⚠️ Yes' : '✅ No'}`);

  // Show available package types
  console.log('\n📦 Available Package Types:');
  const packages = [
    'FRAUD_DETECTION',
    'PAYMENT_SECURITY',
    'COMPLIANCE_CORE',
    'RISK_ASSESSMENT',
    'AUDIT_LOGGER',
    'WAGER_PROCESSOR',
    'ODDS_CALCULATOR',
    'PAYMENT_GATEWAY',
    'ANALYTICS_DASHBOARD',
    'USER_MANAGEMENT',
  ];

  packages.forEach(pkg => {
    const agent = Fantasy42UserAgents.getEnvironmentAgent(pkg as any, values.environment as any);
    console.log(`  ${pkg}: ${agent}`);
  });

  // Show environment configurations
  console.log('\n🌍 Environment Configurations:');
  const environments = ['production', 'staging', 'development', 'enterprise'];

  environments.forEach(env => {
    const envUserAgent = Fantasy42UserAgents.getEnvironmentAgent(
      values.package!.toUpperCase(),
      env as any
    );
    const isCurrent = env === values.environment ? ' ← Current' : '';
    console.log(`  ${env}: ${envUserAgent}${isCurrent}`);
  });
}

async function runTest() {
  console.log('🧪 Running Fantasy42 Security Tests...');

  // Run the test suite
  const testCommand = 'bun test tests/user-agent-tests.ts';

  console.log(`Executing: ${testCommand}`);

  const process = Bun.spawn(testCommand.split(' '), {
    stdio: 'inherit',
  });

  const exitCode = await process.exited;

  if (exitCode === 0) {
    console.log('✅ All security tests passed!');
  } else {
    console.log('❌ Some security tests failed!');
    process.exit(exitCode);
  }
}

function showHelp() {
  console.log(`
🛡️ Fantasy42 Security CLI Tool

Usage:
  bun run scripts/security-cli.ts <command> [options]

Commands:
  check       Run security check with User-Agent
  monitor     Start security monitoring
  audit       Generate compliance audit report
  agent       Show User-Agent information
  test        Run security test suite

Options:
  --package=<package>         Package type (default: fraud-detection)
  --environment=<env>         Environment (production|staging|development|enterprise)
  --endpoint=<url>           API endpoint to check (default: /api/v1/health)
  --method=<method>          HTTP method (default: GET)
  --user-agent=<agent>        Custom User-Agent string
  --geo-region=<region>       Geographic region (global|us|eu|uk|asia)
  --build-version=<version>   Build version (default: 1.0.0)
  --compliance                Enable compliance mode (default: true)
  --verbose                   Verbose output
  --monitor                   Enable real-time monitoring
  --audit                     Enable audit logging

Package Types:
  fraud-detection, payment-security, compliance-core, risk-assessment
  audit-logger, wager-processor, odds-calculator, payment-gateway
  analytics-dashboard, user-management

Examples:
  bun run scripts/security-cli.ts check --package fraud-detection --environment staging
  bun run scripts/security-cli.ts monitor --verbose
  bun run scripts/security-cli.ts audit --environment production
  bun run scripts/security-cli.ts agent --package payment-gateway --geo-region eu
  bun run scripts/security-cli.ts test

Environment Variables:
  FANTASY42_API_KEY           API key for authentication
  FANTASY42_API_BASE          Base API URL
  FANTASY42_MONITORING_URL    Monitoring service URL
  FANTASY42_MONITORING_KEY    Monitoring service key
  `);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Fantasy42 Security CLI...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down...');
  process.exit(0);
});

// Run the CLI
if (import.meta.main) {
  main();
}
