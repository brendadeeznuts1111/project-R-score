#!/usr/bin/env bun

/**
 * 🎯 Fantasy42 User-Agent Security Demo
 *
 * Interactive demonstration of the comprehensive User-Agent security system
 * for Fantasy42 operations with Bun's --user-agent flag integration.
 */

import {
  Fantasy42UserAgents,
  EnvironmentConfig,
  UserAgentMonitor,
} from '../packages/core-security/src/user-agents';
import {
  Fantasy42SecureClient,
  SecureClientFactory,
} from '../packages/core-security/src/secure-client';

console.info('🎯 Fantasy42 User-Agent Security Demo');
console.info('=====================================');

async function demoUserAgentRegistry() {
  console.info('\n1️⃣ User-Agent Registry Demonstration');

  // Generate User-Agents for different scenarios
  const scenarios = [
    { package: 'FRAUD_DETECTION', environment: 'production' },
    { package: 'PAYMENT_GATEWAY', environment: 'enterprise', geoRegion: 'eu' },
    { package: 'COMPLIANCE_CORE', environment: 'staging' },
    { package: 'ANALYTICS_DASHBOARD', environment: 'development', compliance: false },
  ];

  scenarios.forEach(({ package: pkg, environment, geoRegion, compliance }) => {
    const agent = Fantasy42UserAgents.generateEnterpriseAgent(pkg, {
      environment: environment as any,
      buildVersion: '3.1.0',
      geoRegion: geoRegion || 'global',
      securityLevel: 'maximum',
      compliance: compliance !== false,
    });

    console.info(`📦 ${pkg} (${environment}):`);
    console.info(`   ${agent.substring(0, 80)}...`);
  });
}

async function demoSecureClient() {
  console.info('\n2️⃣ Secure HTTP Client Demonstration');

  // Create different types of clients
  const fraudClient = SecureClientFactory.createFraudDetectionClient('staging');
  const paymentClient = SecureClientFactory.createPaymentClient('production');

  const clients = [
    { name: 'Fraud Detection', client: fraudClient },
    { name: 'Payment Gateway', client: paymentClient },
  ];

  clients.forEach(({ name, client }) => {
    const info = client.getClientInfo();
    console.info(`🔐 ${name} Client:`);
    console.info(`   User-Agent: ${info.userAgent.substring(0, 60)}...`);
  });

  // Demonstrate client configuration update
  console.info('\n🔄 Updating client configuration...');
  const originalAgent = fraudClient.getClientInfo().userAgent;

  fraudClient.updateConfig({
    geoRegion: 'eu',
    buildVersion: '3.1.1',
  });

  const updatedAgent = fraudClient.getClientInfo().userAgent;
  console.info('✅ Configuration updated successfully');
}

async function demoMonitoringSystem() {
  console.info('\n3️⃣ User-Agent Monitoring Demonstration');

  // Clear previous data
  UserAgentMonitor.clearTracking();

  // Simulate various User-Agent patterns
  const testAgents = [
    'Fantasy42-FraudDetector/3.1.0 (production) (GDPR-Compliant)',
    'curl/7.68.0', // Suspicious
    'python-requests/2.25.1', // Suspicious
    'Fantasy42-CLI/1.9.0 (development)',
  ];

  testAgents.forEach(agent => {
    UserAgentMonitor.trackAgent(agent);
    const isSuspicious = UserAgentMonitor.isSuspicious(agent);
    console.info(`   ${isSuspicious ? '🚨' : '✅'} ${agent.substring(0, 50)}...`);
  });

  // Show statistics
  const stats = UserAgentMonitor.getAgentUsageStats();
  console.info(`\n📊 Total tracked: ${Object.keys(stats.usage).length}`);
  console.info(`🚨 Suspicious: ${stats.suspicious.length}`);
}

async function demoBuildIntegration() {
  console.info('\n4️⃣ Build Integration Demonstration');

  const buildScenarios = [
    {
      package: 'fraud-detection',
      environment: 'production',
      userAgent: Fantasy42UserAgents.generateEnterpriseAgent('FRAUD_DETECTION', {
        environment: 'production',
        buildVersion: '3.1.0',
        geoRegion: 'global',
        securityLevel: 'maximum',
        compliance: true,
      }),
    },
  ];

  buildScenarios.forEach(({ package: pkg, environment, userAgent }) => {
    console.info(`📦 Building ${pkg} for ${environment}:`);
    console.info(`   User-Agent: ${userAgent.substring(0, 80)}...`);
    console.info(`   Build command would include: --user-agent="${userAgent}"`);
  });
}

async function main() {
  console.info('🚀 Starting Fantasy42 User-Agent Security Demo...\n');

  try {
    await demoUserAgentRegistry();
    await demoSecureClient();
    await demoMonitoringSystem();
    await demoBuildIntegration();

    console.info('\n🎉 Fantasy42 User-Agent Security Demo Complete!');
    console.info('\n✨ Key Features Demonstrated:');
    console.info('   ✅ Enterprise User-Agent generation');
    console.info('   ✅ Secure HTTP client with compliance');
    console.info('   ✅ Real-time monitoring and anomaly detection');
    console.info('   ✅ Build integration with security flags');
    console.info('   ✅ Multi-environment and geo-region support');
  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

if (import.meta.main) {
  main();
}
