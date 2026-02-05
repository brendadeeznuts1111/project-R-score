#!/usr/bin/env bun

/**
 * Verification Script for SportsBet Global/BunX Integration
 * Tests all aspects of the unified package management system
 */

import { $ } from 'bun';
import { existsSync } from 'fs';
import { join } from 'path';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: any;
}

class IntegrationVerifier {
  private results: TestResult[] = [];
  private homeDir: string;

  constructor() {
    this.homeDir = process.env.HOME || '';
  }

  /**
   * Run all verification tests
   */
  async runAllTests(): Promise<void> {
    console.log('='.repeat(60));
    console.log('   SportsBet Global/BunX Integration Verification');
    console.log('='.repeat(60));
    console.log();

    await this.testDirectoryStructure();
    await this.testConfigurationFiles();
    await this.testRegistryConnectivity();
    await this.testGlobalPackages();
    await this.testBunXExecution();
    await this.testCacheIntegration();
    await this.testScopeResolution();
    await this.testSecurityFeatures();
    await this.testPerformance();

    this.displayResults();
  }

  /**
   * Test directory structure
   */
  private async testDirectoryStructure(): Promise<void> {
    console.log('📁 Testing directory structure...');

    const dirs = [
      { path: '~/.bun/install/global', name: 'Global packages directory' },
      { path: '~/.bun/bin', name: 'Global binaries directory' },
      { path: '~/.bun/install/cache', name: 'Global cache directory' },
      { path: '~/.bun/bunx/cache', name: 'BunX cache directory' },
      { path: '~/.bun/secrets', name: 'Secrets directory' },
      { path: '~/.bun/certificates', name: 'Certificates directory' },
    ];

    for (const dir of dirs) {
      const fullPath = dir.path.replace('~', this.homeDir);
      const exists = existsSync(fullPath);

      this.results.push({
        name: dir.name,
        status: exists ? 'pass' : 'fail',
        message: exists ? `Directory exists` : `Directory missing`,
        details: { path: dir.path },
      });
    }
  }

  /**
   * Test configuration files
   */
  private async testConfigurationFiles(): Promise<void> {
    console.log('📋 Testing configuration files...');

    const configs = [
      { path: '~/.bunfig.toml', name: 'Global bunfig.toml' },
      { path: '~/.npmrc', name: 'NPM registry config' },
      { path: '~/.bun/cache-config.json', name: 'Cache configuration' },
    ];

    for (const config of configs) {
      const fullPath = config.path.replace('~', this.homeDir);
      const exists = existsSync(fullPath);

      if (exists) {
        try {
          const content = await Bun.file(fullPath).text();
          const hasContent = content.length > 0;

          this.results.push({
            name: config.name,
            status: hasContent ? 'pass' : 'warn',
            message: hasContent ? 'Configuration valid' : 'Configuration empty',
            details: { size: content.length },
          });
        } catch {
          this.results.push({
            name: config.name,
            status: 'fail',
            message: 'Cannot read configuration',
            details: { path: config.path },
          });
        }
      } else {
        this.results.push({
          name: config.name,
          status: 'fail',
          message: 'Configuration missing',
          details: { path: config.path },
        });
      }
    }
  }

  /**
   * Test registry connectivity
   */
  private async testRegistryConnectivity(): Promise<void> {
    console.log('🌐 Testing registry connectivity...');

    const registries = [
      { url: 'https://registry.npmjs.org', name: 'NPM Registry' },
      { url: 'https://registry.sportsbet.com/', name: 'SportsBet Registry' },
      {
        url: process.env.FIRE22_REGISTRY_URL || 'https://registry.fire22.com/',
        name: 'Fire22 Registry',
      },
    ];

    for (const registry of registries) {
      try {
        const { stdout, exitCode } =
          await $`curl -s -o /dev/null -w "%{http_code}" -m 5 ${registry.url}`.quiet();
        const httpCode = parseInt(stdout.trim());

        this.results.push({
          name: registry.name,
          status: httpCode >= 200 && httpCode < 400 ? 'pass' : 'warn',
          message: `HTTP ${httpCode}`,
          details: { url: registry.url, httpCode },
        });
      } catch (error: any) {
        this.results.push({
          name: registry.name,
          status: 'fail',
          message: 'Connection failed',
          details: { url: registry.url, error: error.message },
        });
      }
    }
  }

  /**
   * Test global packages
   */
  private async testGlobalPackages(): Promise<void> {
    console.log('📦 Testing global packages...');

    try {
      const { stdout, exitCode } = await $`bun pm ls --global --json`.quiet();

      if (exitCode === 0) {
        const packages = JSON.parse(stdout || '[]');

        this.results.push({
          name: 'Global packages installed',
          status: packages.length > 0 ? 'pass' : 'warn',
          message: `${packages.length} packages found`,
          details: { count: packages.length },
        });

        // Check for SportsBet packages
        const sportsbetPackages = packages.filter((p: any) =>
          p.name.startsWith('@sportsbet-registry/')
        );

        this.results.push({
          name: 'SportsBet packages',
          status: sportsbetPackages.length > 0 ? 'pass' : 'warn',
          message: `${sportsbetPackages.length} SportsBet packages`,
          details: { packages: sportsbetPackages.map((p: any) => p.name) },
        });
      } else {
        this.results.push({
          name: 'Global packages',
          status: 'fail',
          message: 'Cannot list global packages',
        });
      }
    } catch (error: any) {
      this.results.push({
        name: 'Global packages',
        status: 'fail',
        message: `Error: ${error.message}`,
      });
    }
  }

  /**
   * Test BunX execution
   */
  private async testBunXExecution(): Promise<void> {
    console.log('🚀 Testing BunX execution...');

    // Test basic BunX
    try {
      const { exitCode } = await $`bunx --version`.quiet();

      this.results.push({
        name: 'BunX availability',
        status: exitCode === 0 ? 'pass' : 'fail',
        message: exitCode === 0 ? 'BunX is available' : 'BunX not found',
      });
    } catch {
      this.results.push({
        name: 'BunX availability',
        status: 'fail',
        message: 'BunX not available',
      });
    }

    // Test package execution
    const testPackages = [
      { cmd: 'bunx prettier --version', name: 'NPM package (prettier)' },
      { cmd: 'bunx @fire22/security-scanner --help 2>/dev/null', name: 'Fire22 package' },
    ];

    for (const test of testPackages) {
      try {
        const { exitCode } = await $`${test.cmd}`.quiet();

        this.results.push({
          name: test.name,
          status: exitCode === 0 || exitCode === 1 ? 'pass' : 'warn',
          message: 'Package executable via BunX',
        });
      } catch {
        this.results.push({
          name: test.name,
          status: 'warn',
          message: 'Package not available or not executable',
        });
      }
    }
  }

  /**
   * Test cache integration
   */
  private async testCacheIntegration(): Promise<void> {
    console.log('💾 Testing cache integration...');

    // Check cache sizes
    const caches = [
      { path: '~/.bun/install/cache', name: 'Global cache' },
      { path: '~/.bun/bunx/cache', name: 'BunX cache' },
    ];

    for (const cache of caches) {
      const fullPath = cache.path.replace('~', this.homeDir);

      if (existsSync(fullPath)) {
        try {
          const { stdout } = await $`du -sh ${fullPath}`.quiet();
          const size = stdout.trim().split('\t')[0];

          this.results.push({
            name: cache.name,
            status: 'pass',
            message: `Size: ${size}`,
            details: { path: cache.path, size },
          });
        } catch {
          this.results.push({
            name: cache.name,
            status: 'warn',
            message: 'Cannot determine size',
          });
        }
      } else {
        this.results.push({
          name: cache.name,
          status: 'warn',
          message: 'Cache directory not found',
        });
      }
    }
  }

  /**
   * Test scope resolution
   */
  private async testScopeResolution(): Promise<void> {
    console.log('🔍 Testing scope resolution...');

    // Read bunfig to check scope configuration
    const bunfigPath = join(this.homeDir, '.bunfig.toml');

    if (existsSync(bunfigPath)) {
      try {
        const content = await Bun.file(bunfigPath).text();

        // Check for SportsBet scope
        const hasSportsBetScope =
          content.includes('@sportsbet-registry') || content.includes('registry.sportsbet.com');

        this.results.push({
          name: 'SportsBet scope configuration',
          status: hasSportsBetScope ? 'pass' : 'warn',
          message: hasSportsBetScope ? 'Scope configured' : 'Scope not configured',
        });

        // Check for Fire22 scope
        const hasFire22Scope = content.includes('@fire22') || content.includes('FIRE22_REGISTRY');

        this.results.push({
          name: 'Fire22 scope configuration',
          status: hasFire22Scope ? 'pass' : 'warn',
          message: hasFire22Scope ? 'Scope configured' : 'Scope not configured',
        });
      } catch {
        this.results.push({
          name: 'Scope configuration',
          status: 'fail',
          message: 'Cannot read bunfig.toml',
        });
      }
    } else {
      this.results.push({
        name: 'Scope configuration',
        status: 'fail',
        message: 'bunfig.toml not found',
      });
    }
  }

  /**
   * Test security features
   */
  private async testSecurityFeatures(): Promise<void> {
    console.log('🔐 Testing security features...');

    // Test audit capability
    try {
      const { exitCode } = await $`bun audit --help`.quiet();

      this.results.push({
        name: 'Audit capability',
        status: exitCode === 0 ? 'pass' : 'warn',
        message: exitCode === 0 ? 'Audit available' : 'Audit not available',
      });
    } catch {
      this.results.push({
        name: 'Audit capability',
        status: 'warn',
        message: 'Audit command not available',
      });
    }

    // Check for security tokens
    const tokens = [
      { env: 'SPORTSBET_REGISTRY_TOKEN', name: 'SportsBet token' },
      { env: 'FIRE22_REGISTRY_TOKEN', name: 'Fire22 token' },
    ];

    for (const token of tokens) {
      const hasToken = !!process.env[token.env];

      this.results.push({
        name: token.name,
        status: hasToken ? 'pass' : 'warn',
        message: hasToken ? 'Token configured' : 'Token not set',
        details: { env: token.env },
      });
    }
  }

  /**
   * Test performance metrics
   */
  private async testPerformance(): Promise<void> {
    console.log('⚡ Testing performance...');

    // Test BunX execution speed
    const start = performance.now();
    try {
      await $`bunx --version`.quiet();
      const duration = performance.now() - start;

      this.results.push({
        name: 'BunX execution speed',
        status: duration < 500 ? 'pass' : 'warn',
        message: `${duration.toFixed(0)}ms`,
        details: { duration },
      });
    } catch {
      this.results.push({
        name: 'BunX execution speed',
        status: 'fail',
        message: 'Cannot measure',
      });
    }

    // Test package resolution speed
    const pkgStart = performance.now();
    try {
      await $`bunx --package prettier --help`.quiet();
      const pkgDuration = performance.now() - pkgStart;

      this.results.push({
        name: 'Package resolution speed',
        status: pkgDuration < 2000 ? 'pass' : 'warn',
        message: `${pkgDuration.toFixed(0)}ms`,
        details: { duration: pkgDuration },
      });
    } catch {
      this.results.push({
        name: 'Package resolution speed',
        status: 'warn',
        message: 'Cannot measure',
      });
    }
  }

  /**
   * Display test results
   */
  private displayResults(): void {
    console.log('\n' + '='.repeat(60));
    console.log('                    TEST RESULTS');
    console.log('='.repeat(60));

    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const warned = this.results.filter(r => r.status === 'warn').length;

    console.log(`\n📊 Summary: ${passed} passed, ${warned} warnings, ${failed} failed\n`);

    // Group results by status
    const groups = {
      pass: this.results.filter(r => r.status === 'pass'),
      warn: this.results.filter(r => r.status === 'warn'),
      fail: this.results.filter(r => r.status === 'fail'),
    };

    // Display passed tests
    if (groups.pass.length > 0) {
      console.log('✅ Passed:');
      for (const result of groups.pass) {
        console.log(`  • ${result.name}: ${result.message}`);
      }
    }

    // Display warnings
    if (groups.warn.length > 0) {
      console.log('\n⚠️ Warnings:');
      for (const result of groups.warn) {
        console.log(`  • ${result.name}: ${result.message}`);
        if (result.details) {
          console.log(`    Details: ${JSON.stringify(result.details)}`);
        }
      }
    }

    // Display failures
    if (groups.fail.length > 0) {
      console.log('\n❌ Failed:');
      for (const result of groups.fail) {
        console.log(`  • ${result.name}: ${result.message}`);
        if (result.details) {
          console.log(`    Details: ${JSON.stringify(result.details)}`);
        }
      }
    }

    // Overall status
    console.log('\n' + '='.repeat(60));
    if (failed === 0 && warned < 3) {
      console.log('✅ Integration is working correctly!');
    } else if (failed === 0) {
      console.log('⚠️ Integration has some warnings but is functional.');
    } else {
      console.log('❌ Integration has issues that need attention.');
    }
    console.log('='.repeat(60));
  }
}

// Run verification
const verifier = new IntegrationVerifier();
await verifier.runAllTests();
