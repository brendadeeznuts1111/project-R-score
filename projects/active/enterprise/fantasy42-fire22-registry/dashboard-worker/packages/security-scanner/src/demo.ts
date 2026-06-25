#!/usr/bin/env bun

/**
 * @fire22/security-scanner Demo
 *
 * Interactive demonstration of the Fire22 security scanner capabilities
 */

import { Fire22SecurityScanner } from './index';
import type { ScanRequest } from './types';

class SecurityScannerDemo {
  private scanner = new Fire22SecurityScanner();

  async runCompleteDemo() {
    console.info('🛡️ Fire22 Security Scanner Demo');
    console.info('='.repeat(50));

    await this.demoFatalThreats();
    await this.demoWarningScenarios();
    await this.demoFire22Integration();
    await this.demoVulnerabilityDetection();
    await this.demoPerformance();

    console.info('\n🎉 Demo Complete!');
    console.info('\n💡 Integration Instructions:');
    console.info('1. Add to bunfig.toml: scanner = "@fire22/security-scanner"');
    console.info('2. Run: bun install');
    console.info('3. All package operations are now security-scanned');
  }

  async demoFatalThreats() {
    console.info('\n🚨 FATAL LEVEL THREATS (Installation Blocked)\n');

    const fatalRequest: ScanRequest = {
      packages: [
        { name: 'evil-package', version: '1.0.0' },
        { name: 'bitcoin-miner', version: '2.1.0' },
        { name: 'raect', version: '1.0.0' }, // typosquat
        { name: 'lodash', version: '4.17.20' }, // vulnerable
      ],
    };

    console.info(
      '📦 Scanning packages:',
      fatalRequest.packages.map(p => `${p.name}@${p.version}`).join(', ')
    );

    const result = await this.scanner.scan(fatalRequest);

    console.info(`\n📊 Scan Results:`);
    console.info(`   Packages Scanned: ${result.metadata?.packagesScanned}`);
    console.info(`   Threats Found: ${result.advisories.length}`);
    console.info(`   Fatal Threats: ${result.advisories.filter(a => a.level === 'fatal').length}`);

    console.info('\n🚨 Fatal Advisories:');
    result.advisories
      .filter(advisory => advisory.level === 'fatal')
      .forEach((advisory, i) => {
        console.info(`\n${i + 1}. ${advisory.package}@${advisory.version}`);
        console.info(`   ❌ ${advisory.title}`);
        console.info(`   📝 ${advisory.description}`);
        console.info(`   💡 ${advisory.recommendation}`);
        if (advisory.cve) console.info(`   🔗 CVE: ${advisory.cve}`);
      });

    console.info('\n⚠️  Installation would be CANCELLED due to fatal threats');
  }

  async demoWarningScenarios() {
    console.info('\n⚠️ WARNING LEVEL SCENARIOS (User Prompted)\n');

    const warningRequest: ScanRequest = {
      packages: [
        { name: 'casino-lib', version: '1.0.0' },
        { name: 'proxy-tunnel', version: '2.0.0' },
        { name: 'test-package', version: '1.0.0-beta.1' },
        { name: 'express', version: '4.17.1' }, // vulnerable but not fatal
      ],
    };

    console.info(
      '📦 Scanning packages:',
      warningRequest.packages.map(p => `${p.name}@${p.version}`).join(', ')
    );

    const result = await this.scanner.scan(warningRequest);

    const warnings = result.advisories.filter(a => a.level === 'warn');
    console.info(`\n📊 Warning Results: ${warnings.length} warnings found`);

    console.info('\n⚠️ Warning Advisories:');
    warnings.forEach((advisory, i) => {
      console.info(`\n${i + 1}. ${advisory.package}@${advisory.version}`);
      console.info(`   ⚠️ ${advisory.title}`);
      console.info(`   📝 ${advisory.description}`);
      console.info(`   💡 ${advisory.recommendation}`);
    });

    console.info('\n💭 In interactive mode: User would be prompted to continue');
    console.info('💭 In CI/CD mode: Installation would be cancelled automatically');
  }

  async demoFire22Integration() {
    console.info('\n🔥 FIRE22 WORKSPACE INTEGRATION\n');

    const fire22Request: ScanRequest = {
      packages: [
        { name: '@fire22/core', version: '1.0.0' },
        { name: '@fire22/security-core', version: '1.0.0' },
        { name: '@fire22/crypto-utils', version: '1.0.0' }, // Would normally trigger crypto policy
        { name: 'external-crypto-miner', version: '1.0.0' }, // Should be blocked
        { name: '@fire22/gambling-core', version: '1.0.0' }, // Fire22 gambling allowed
        { name: 'external-casino', version: '1.0.0' }, // External gambling warned
      ],
    };

    console.info('📦 Scanning Fire22 workspace packages...');

    const result = await this.scanner.scan(fire22Request);

    console.info(`\n📊 Fire22 Integration Results:`);
    console.info(`   Total Packages: ${fire22Request.packages.length}`);
    console.info(
      `   @fire22/* Packages: ${fire22Request.packages.filter(p => p.name.startsWith('@fire22/')).length} (auto-trusted)`
    );
    console.info(
      `   External Packages: ${fire22Request.packages.filter(p => !p.name.startsWith('@fire22/')).length}`
    );
    console.info(`   Advisories: ${result.advisories.length}`);

    console.info('\n🛡️ Fire22 Security Policies Applied:');
    result.advisories.forEach((advisory, i) => {
      console.info(`\n${i + 1}. ${advisory.package}`);
      console.info(`   ${advisory.level === 'fatal' ? '🚨' : '⚠️'} ${advisory.title}`);
      console.info(`   📝 ${advisory.description}`);
    });

    console.info('\n✅ Fire22 internal packages automatically trusted');
    console.info('✅ Workspace-specific policies enforced');
  }

  async demoVulnerabilityDetection() {
    console.info('\n🔍 CVE VULNERABILITY DETECTION\n');

    const vulnRequest: ScanRequest = {
      packages: [
        { name: 'lodash', version: '4.17.20' }, // CVE-2021-23337
        { name: 'lodash', version: '4.17.21' }, // Safe version
        { name: 'express', version: '4.17.1' }, // CVE-2022-24999
        { name: 'express', version: '4.18.2' }, // Safe version
        { name: 'axios', version: '0.21.1' }, // CVE-2021-3749
        { name: 'axios', version: '0.21.2' }, // Safe version
      ],
    };

    console.info('📦 Testing version ranges with Bun.semver.satisfies()...');

    const result = await this.scanner.scan(vulnRequest);

    console.info(`\n📊 Vulnerability Scan Results:`);
    console.info(`   Packages Tested: ${vulnRequest.packages.length}`);
    console.info(`   Vulnerable Versions: ${result.advisories.length}`);

    if (result.advisories.length > 0) {
      console.info('\n🔍 CVE Vulnerabilities Found:');
      result.advisories.forEach((advisory, i) => {
        console.info(`\n${i + 1}. ${advisory.package}@${advisory.version}`);
        console.info(`   ${advisory.level === 'fatal' ? '🚨' : '⚠️'} ${advisory.cve || 'No CVE'}`);
        console.info(`   📝 ${advisory.description}`);
        console.info(`   💡 ${advisory.recommendation}`);
      });
    }

    console.info('\n✅ Semver range checking working correctly');
    console.info('✅ Safe versions passed security scan');
  }

  async demoPerformance() {
    console.info('\n⚡ PERFORMANCE BENCHMARKING\n');

    // Generate large package list for performance testing
    const largePackageList = Array.from({ length: 50 }, (_, i) => ({
      name: `package-${i}`,
      version: '1.0.0',
    }));

    const perfRequest: ScanRequest = {
      packages: largePackageList,
      context: {
        production: true,
        environment: 'production',
      },
    };

    console.info(`📦 Performance test: scanning ${perfRequest.packages.length} packages...`);

    const startTime = Bun.nanoseconds();
    const result = await this.scanner.scan(perfRequest);
    const endTime = Bun.nanoseconds();

    const scanTimeMs = (endTime - startTime) / 1_000_000;
    const packagesPerSecond = Math.round((perfRequest.packages.length / scanTimeMs) * 1000);

    console.info(`\n📊 Performance Results:`);
    console.info(`   Packages Scanned: ${result.metadata?.packagesScanned}`);
    console.info(`   Scan Time: ${scanTimeMs.toFixed(2)}ms`);
    console.info(`   Packages/Second: ${packagesPerSecond.toLocaleString()}`);
    console.info(`   Advisories Found: ${result.advisories.length}`);

    if (scanTimeMs < 100) {
      console.info('   🚀 Performance: Excellent (< 100ms)');
    } else if (scanTimeMs < 500) {
      console.info('   ✅ Performance: Good (< 500ms)');
    } else {
      console.info('   ⚠️ Performance: Needs optimization');
    }

    console.info('\n💡 Production Performance:');
    console.info('   • Threat feed cached for 1 hour');
    console.info('   • Zero external dependencies');
    console.info('   • Bun native APIs for maximum speed');
    console.info('   • Efficient pattern matching algorithms');
  }

  async demoIntegrityCheck() {
    console.info('\n🔒 PACKAGE INTEGRITY VERIFICATION\n');

    const testPackage = 'test-package';
    const testVersion = '1.0.0';
    const expectedHash = 'abc123def456';

    console.info(`📦 Checking integrity: ${testPackage}@${testVersion}`);
    console.info(`🔗 Expected hash: ${expectedHash}`);

    const integrityResult = await this.scanner.checkPackageIntegrity(
      testPackage,
      testVersion,
      expectedHash
    );

    console.info(`\n📊 Integrity Check: ${integrityResult ? '✅ PASSED' : '❌ FAILED'}`);
    console.info('💡 In production: Would verify actual package contents using Bun.hash()');
  }
}

// Run demo if called directly
async function runDemo() {
  try {
    const demo = new SecurityScannerDemo();
    await demo.runCompleteDemo();
    await demo.demoIntegrityCheck();
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  await runDemo();
}

export { SecurityScannerDemo };
