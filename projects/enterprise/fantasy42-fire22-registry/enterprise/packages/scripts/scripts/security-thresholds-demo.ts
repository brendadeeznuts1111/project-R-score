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
    console.log('🎯 Security Thresholds Demo');
    console.log('='.repeat(60));
    console.log('Testing different risk tolerance levels with same package set');

    for (const [level, config] of Object.entries(RISK_TOLERANCE_LEVELS)) {
      console.log(`\n🏷️  ${config.name}`);
      console.log(`   📝 ${config.description}`);
      console.log('-'.repeat(50));

      try {
        await enhancedScan(this.testPackages, {
          thresholds: config.thresholds,
          enableLogging: false,
          failOnThresholdExceeded: false, // Demo mode
        });
      } catch (error) {
        console.log(`   🚫 Threshold exceeded: ${error.message}`);
      }
    }
  }

  /**
   * Demonstrate exception handling
   */
  async demonstrateExceptions(): Promise<void> {
    console.log('\n🛡️  Exception Handling Demo');
    console.log('-'.repeat(50));

    const exceptions = Object.values(EXCEPTIONS_DATABASE);

    console.log('📋 Active Security Exceptions:');
    exceptions.forEach((exception, index) => {
      console.log(`\n   ${index + 1}. ${exception.cve || exception.package}`);
      console.log(`      📦 Package: ${exception.package}`);
      console.log(`      📝 Reason: ${exception.reason}`);
      console.log(`      👤 Approved by: ${exception.approvedBy}`);
      console.log(`      ⏰ Expires: ${exception.expiresAt?.toISOString().split('T')[0]}`);
      console.log(`      🛡️  Mitigation: ${exception.mitigation}`);
    });

    console.log('\n🔍 Testing with Exceptions Applied:');
    console.log('-'.repeat(40));

    try {
      await enhancedScan(this.testPackages, {
        thresholds: RISK_TOLERANCE_LEVELS.conservative.thresholds,
        exceptions: exceptions,
        enableLogging: false,
        failOnThresholdExceeded: false,
      });
    } catch (error) {
      console.log(`   🚫 Result: ${error.message}`);
    }
  }

  /**
   * Demonstrate threshold validation
   */
  validateThresholdConfigurations(): void {
    console.log('\n✅ Threshold Configuration Validation');
    console.log('-'.repeat(50));

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
      console.log(`${status} ${name}`);

      if (!validation.valid) {
        validation.errors.forEach(error => {
          console.log(`   ⚠️  ${error}`);
        });
      }
    });
  }

  /**
   * Show recommended thresholds for different environments
   */
  showRecommendedConfigurations(): void {
    console.log('\n📋 Recommended Configurations by Environment');
    console.log('-'.repeat(50));

    const environments = ['development', 'staging', 'production', 'ci'];

    environments.forEach(env => {
      const recommended = getRecommendedThresholds(env);
      console.log(`\n🏭 ${env.toUpperCase()}:`);
      console.log(`   🚨 Max Fatal Issues: ${recommended.maxFatalIssues}`);
      console.log(`   ⚠️  Max Warnings: ${recommended.maxWarningIssues}`);
      console.log(`   📊 Max Risk Score: ${recommended.maxRiskScore}`);
      console.log(`   📅 Max Vulnerability Age: ${recommended.maxVulnerabilityAge} days`);
      console.log(`   📋 Require License Info: ${recommended.requireLicenseInfo}`);
      console.log(`   🔒 Block Untrusted Registries: ${recommended.blockUntrustedRegistries}`);
      console.log(
        `   📜 Allowed Licenses: ${recommended.allowedLicenses?.slice(0, 3).join(', ')}...`
      );
    });
  }

  /**
   * Demonstrate dynamic threshold adjustment
   */
  demonstrateDynamicThresholds(): void {
    console.log('\n🔄 Dynamic Threshold Adjustment');
    console.log('-'.repeat(50));

    const baseThresholds = RISK_TOLERANCE_LEVELS.balanced.thresholds;

    console.log('🎚️  Adjusting thresholds based on project needs:');

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
      console.log(`\n📈 ${scenario}:`);
      Object.entries(adjustment).forEach(([key, value]) => {
        console.log(`   🔧 ${key}: ${value}`);
      });
      console.log(`   📝 Reason: ${reason}`);
    });
  }
}

// ============================================================================
// MAIN DEMONSTRATION
// ============================================================================

async function runSecurityThresholdsDemo(): Promise<void> {
  const demo = new SecurityThresholdsDemo();

  console.log('🎯 Fire22 Security Thresholds Configuration');
  console.log('='.repeat(60));

  console.log('📊 This demo shows how to:');
  console.log('   • Configure security thresholds based on risk tolerance');
  console.log('   • Handle exceptions for specific vulnerabilities');
  console.log('   • Validate threshold configurations');
  console.log('   • Use recommended settings for different environments');
  console.log('   • Dynamically adjust thresholds based on project needs');

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

  console.log('\n🎯 Threshold Configuration Guide');
  console.log('-'.repeat(50));

  console.log('📋 Choosing the Right Thresholds:');
  console.log('   🛡️  CONSERVATIVE: Use for production, critical systems');
  console.log('   ⚖️  BALANCED: Default for most projects');
  console.log('   🔓 PERMISSIVE: Development, proof-of-concepts');
  console.log('   🏢 ENTERPRISE: Maximum security, compliance-focused');

  console.log('\n🛠️  Implementation Steps:');
  console.log('   1. Choose risk tolerance level');
  console.log('   2. Configure thresholds in bunfig.toml');
  console.log('   3. Add exceptions for known acceptable risks');
  console.log('   4. Test with different package scenarios');
  console.log('   5. Monitor and adjust based on findings');

  console.log('\n📊 Key Metrics to Monitor:');
  console.log('   📈 Average risk score over time');
  console.log('   📦 Package health trends');
  console.log('   🚨 Critical issue frequency');
  console.log('   ✅ Compliance rate');

  console.log('\n🎉 Security Thresholds Demo Complete!');
  console.log('   Your Fire22 project now has configurable, enterprise-grade security thresholds!');
  console.log(
    "   Adjust thresholds based on your project's risk tolerance and compliance requirements!"
  );
}

// Run the demo
if (import.meta.main) {
  await runSecurityThresholdsDemo();
}

export { SecurityThresholdsDemo, RISK_TOLERANCE_LEVELS, EXCEPTIONS_DATABASE };
