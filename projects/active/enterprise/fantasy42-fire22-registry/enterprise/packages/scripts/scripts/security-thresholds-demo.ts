#!/usr/bin/env bun
/**
 * Security Thresholds Demo
 * Demonstrates configurable security thresholds and risk tolerance
 */

import {
  enhancedScan,
  getRecommendedThresholds,
  validateSecurityConfig,
} from '../packages/fire22-security-scanner/src/enhanced-scanner.ts';

interface PackageInfo {
  name: string;
  version: string;
  registry?: string;
}

// ============================================================================
// CONFIGURABLE SECURITY THRESHOLDS
// ============================================================================

const RISK_TOLERANCE_LEVELS = {
  conservative: {
    name: 'Conservative (High Security)',
    description: 'Zero tolerance for security issues',
    thresholds: {
      maxFatalIssues: 0,
      maxWarningIssues: 0,
      maxRiskScore: 30,
      maxVulnerabilityAge: 30,
      requireLicenseInfo: true,
      blockUntrustedRegistries: true,
      allowedLicenses: ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'ISC'],
    },
  },
  balanced: {
    name: 'Balanced (Standard Security)',
    description: 'Accepts minor warnings, blocks critical issues',
    thresholds: {
      maxFatalIssues: 0,
      maxWarningIssues: 5,
      maxRiskScore: 50,
      maxVulnerabilityAge: 60,
      requireLicenseInfo: true,
      blockUntrustedRegistries: true,
      allowedLicenses: ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'ISC', 'BSD-2-Clause'],
    },
  },
  permissive: {
    name: 'Permissive (Development Focus)',
    description: 'Allows more issues for development flexibility',
    thresholds: {
      maxFatalIssues: 2,
      maxWarningIssues: 15,
      maxRiskScore: 75,
      maxVulnerabilityAge: 120,
      requireLicenseInfo: false,
      blockUntrustedRegistries: false,
      allowedLicenses: [
        'MIT',
        'Apache-2.0',
        'BSD-3-Clause',
        'ISC',
        'BSD-2-Clause',
        'GPL-2.0',
        'GPL-3.0',
      ],
    },
  },
  enterprise: {
    name: 'Enterprise (Strict Compliance)',
    description: 'Maximum security for enterprise environments',
    thresholds: {
      maxFatalIssues: 0,
      maxWarningIssues: 0,
      maxRiskScore: 20,
      maxVulnerabilityAge: 7,
      requireLicenseInfo: true,
      blockUntrustedRegistries: true,
      allowedLicenses: ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'ISC'],
    },
  },
};

// ============================================================================
// VULNERABILITY EXCEPTIONS MANAGEMENT
// ============================================================================

const EXCEPTIONS_DATABASE = {
  'CVE-2020-8203': {
    cve: 'CVE-2020-8203',
    package: 'lodash',
    reason: 'Legacy dependency in existing codebase, upgrade planned for Q2 2024',
    approvedBy: 'Security Team Lead',
    expiresAt: new Date('2024-12-31'),
    riskAccepted: true,
    mitigation: 'Internal security controls in place',
  },
  'axios-ssrf': {
    cve: 'CVE-2020-28168',
    package: 'axios',
    reason: 'Internal network isolation mitigates SSRF risk',
    approvedBy: 'DevOps Team',
    expiresAt: new Date('2024-10-15'),
    riskAccepted: true,
    mitigation: 'Network-level SSRF protection',
  },
  'express-open-redirect': {
    package: 'express',
    reason: 'Application-level validation prevents open redirect',
    approvedBy: 'Backend Team',
    riskAccepted: true,
    mitigation: 'Input validation and URL sanitization',
  },
};

// ============================================================================
// THRESHOLDS DEMONSTRATION
// ============================================================================

class SecurityThresholdsDemo {
  private testPackages: PackageInfo[];

  constructor() {
    this.testPackages = [
      { name: 'react', version: '18.2.0' },
      { name: 'typescript', version: '5.0.0' },
      { name: 'lodash', version: '4.17.10' }, // Vulnerable
      { name: 'axios', version: '0.20.0' }, // Vulnerable
      { name: 'express', version: '4.17.1' }, // Vulnerable
      { name: 'fake-package', version: '1.0.0' }, // Malicious
      {
        name: 'unknown-package',
        version: '1.0.0',
        registry: 'https://untrusted-registry.com',
      },
    ];
  }

  /**
   * Demonstrate different risk tolerance levels
   */
  async demonstrateRiskTolerance(): Promise<void> {
    console.info('🎯 Security Thresholds Demo');
    console.info('='.repeat(60));
    console.info('Testing different risk tolerance levels with same package set');

    for (const [level, config] of Object.entries(RISK_TOLERANCE_LEVELS)) {
      console.info(`\n🏷️  ${config.name}`);
      console.info(`   📝 ${config.description}`);
      console.info('-'.repeat(50));

      try {
        await enhancedScan(this.testPackages, {
          thresholds: config.thresholds,
          enableLogging: false,
          failOnThresholdExceeded: false, // Demo mode
        });
      } catch (error) {
        console.info(`   🚫 Threshold exceeded: ${error.message}`);
      }
    }
  }

  /**
   * Demonstrate exception handling
   */
  async demonstrateExceptions(): Promise<void> {
    console.info('\n🛡️  Exception Handling Demo');
    console.info('-'.repeat(50));

    const exceptions = Object.values(EXCEPTIONS_DATABASE);

    console.info('📋 Active Security Exceptions:');
    exceptions.forEach((exception, index) => {
      console.info(`\n   ${index + 1}. ${exception.cve || exception.package}`);
      console.info(`      📦 Package: ${exception.package}`);
      console.info(`      📝 Reason: ${exception.reason}`);
      console.info(`      👤 Approved by: ${exception.approvedBy}`);
      console.info(`      ⏰ Expires: ${exception.expiresAt?.toISOString().split('T')[0]}`);
      console.info(`      🛡️  Mitigation: ${exception.mitigation}`);
    });

    console.info('\n🔍 Testing with Exceptions Applied:');
    console.info('-'.repeat(40));

    try {
      await enhancedScan(this.testPackages, {
        thresholds: RISK_TOLERANCE_LEVELS.conservative.thresholds,
        exceptions: exceptions,
        enableLogging: false,
        failOnThresholdExceeded: false,
      });
    } catch (error) {
      console.info(`   🚫 Result: ${error.message}`);
    }
  }

  /**
   * Demonstrate threshold validation
   */
  validateThresholdConfigurations(): void {
    console.info('\n✅ Threshold Configuration Validation');
    console.info('-'.repeat(50));

    const testConfigs = [
      {
        name: 'Valid Conservative Config',
        config: { thresholds: RISK_TOLERANCE_LEVELS.conservative.thresholds },
        expected: true,
      },
      {
        name: 'Invalid: Negative Fatal Issues',
        config: {
          thresholds: { ...RISK_TOLERANCE_LEVELS.conservative.thresholds, maxFatalIssues: -1 },
        },
        expected: false,
      },
      {
        name: 'Invalid: Risk Score > 100',
        config: {
          thresholds: { ...RISK_TOLERANCE_LEVELS.conservative.thresholds, maxRiskScore: 150 },
        },
        expected: false,
      },
      {
        name: 'Valid: Custom Balanced Config',
        config: { thresholds: RISK_TOLERANCE_LEVELS.balanced.thresholds },
        expected: true,
      },
    ];

    testConfigs.forEach(({ name, config, expected }) => {
      const validation = validateSecurityConfig(config);
      const status = validation.valid === expected ? '✅' : '❌';
      console.info(`${status} ${name}`);

      if (!validation.valid) {
        validation.errors.forEach(error => {
          console.info(`   ⚠️  ${error}`);
        });
      }
    });
  }

  /**
   * Show recommended thresholds for different environments
   */
  showRecommendedConfigurations(): void {
    console.info('\n📋 Recommended Configurations by Environment');
    console.info('-'.repeat(50));

    const environments = ['development', 'staging', 'production', 'ci'];

    environments.forEach(env => {
      const recommended = getRecommendedThresholds(env);
      console.info(`\n🏭 ${env.toUpperCase()}:`);
      console.info(`   🚨 Max Fatal Issues: ${recommended.maxFatalIssues}`);
      console.info(`   ⚠️  Max Warnings: ${recommended.maxWarningIssues}`);
      console.info(`   📊 Max Risk Score: ${recommended.maxRiskScore}`);
      console.info(`   📅 Max Vulnerability Age: ${recommended.maxVulnerabilityAge} days`);
      console.info(`   📋 Require License Info: ${recommended.requireLicenseInfo}`);
      console.info(`   🔒 Block Untrusted Registries: ${recommended.blockUntrustedRegistries}`);
      console.info(
        `   📜 Allowed Licenses: ${recommended.allowedLicenses?.slice(0, 3).join(', ')}...`
      );
    });
  }

  /**
   * Demonstrate dynamic threshold adjustment
   */
  demonstrateDynamicThresholds(): void {
    console.info('\n🔄 Dynamic Threshold Adjustment');
    console.info('-'.repeat(50));

    const baseThresholds = RISK_TOLERANCE_LEVELS.balanced.thresholds;

    console.info('🎚️  Adjusting thresholds based on project needs:');

    const adjustments = [
      {
        scenario: 'New Critical Vulnerability Found',
        adjustment: { maxRiskScore: baseThresholds.maxRiskScore - 10 },
        reason: 'Increase scrutiny for new threats',
      },
      {
        scenario: 'Team Size Increased',
        adjustment: { maxWarningIssues: baseThresholds.maxWarningIssues + 5 },
        reason: 'Allow more warnings during expansion',
      },
      {
        scenario: 'Compliance Audit Upcoming',
        adjustment: { maxFatalIssues: 0, maxVulnerabilityAge: 30 },
        reason: 'Strict compliance requirements',
      },
      {
        scenario: 'Legacy System Migration',
        adjustment: { maxVulnerabilityAge: baseThresholds.maxVulnerabilityAge + 30 },
        reason: 'Accept older vulnerabilities during migration',
      },
    ];

    adjustments.forEach(({ scenario, adjustment, reason }) => {
      console.info(`\n📈 ${scenario}:`);
      Object.entries(adjustment).forEach(([key, value]) => {
        console.info(`   🔧 ${key}: ${value}`);
      });
      console.info(`   📝 Reason: ${reason}`);
    });
  }
}

// ============================================================================
// MAIN DEMONSTRATION
// ============================================================================

async function runSecurityThresholdsDemo(): Promise<void> {
  const demo = new SecurityThresholdsDemo();

  console.info('🎯 Fire22 Security Thresholds Configuration');
  console.info('='.repeat(60));

  console.info('📊 This demo shows how to:');
  console.info('   • Configure security thresholds based on risk tolerance');
  console.info('   • Handle exceptions for specific vulnerabilities');
  console.info('   • Validate threshold configurations');
  console.info('   • Use recommended settings for different environments');
  console.info('   • Dynamically adjust thresholds based on project needs');

  // Demonstrate risk tolerance levels
  await demo.demonstrateRiskTolerance();

  // Show exception handling
  await demo.demonstrateExceptions();

  // Validate configurations
  demo.validateThresholdConfigurations();

  // Show recommended configurations
  demo.showRecommendedConfigurations();

  // Demonstrate dynamic adjustments
  demo.demonstrateDynamicThresholds();

  console.info('\n🎯 Threshold Configuration Guide');
  console.info('-'.repeat(50));

  console.info('📋 Choosing the Right Thresholds:');
  console.info('   🛡️  CONSERVATIVE: Use for production, critical systems');
  console.info('   ⚖️  BALANCED: Default for most projects');
  console.info('   🔓 PERMISSIVE: Development, proof-of-concepts');
  console.info('   🏢 ENTERPRISE: Maximum security, compliance-focused');

  console.info('\n🛠️  Implementation Steps:');
  console.info('   1. Choose risk tolerance level');
  console.info('   2. Configure thresholds in bunfig.toml');
  console.info('   3. Add exceptions for known acceptable risks');
  console.info('   4. Test with different package scenarios');
  console.info('   5. Monitor and adjust based on findings');

  console.info('\n📊 Key Metrics to Monitor:');
  console.info('   📈 Average risk score over time');
  console.info('   📦 Package health trends');
  console.info('   🚨 Critical issue frequency');
  console.info('   ✅ Compliance rate');

  console.info('\n🎉 Security Thresholds Demo Complete!');
  console.info('   Your Fire22 project now has configurable, enterprise-grade security thresholds!');
  console.info(
    "   Adjust thresholds based on your project's risk tolerance and compliance requirements!"
  );
}

// Run the demo
if (import.meta.main) {
  await runSecurityThresholdsDemo();
}

export { SecurityThresholdsDemo, RISK_TOLERANCE_LEVELS, EXCEPTIONS_DATABASE };
