#!/usr/bin/env bun

/**
 * @fire22/security-scanner - Scoped Package Demo
 *
 * Demonstrates security handling for scoped packages and private registries
 */

import { Fire22SecurityScanner } from './index';
import type { ScanRequest } from './types';

class ScopedPackageSecurityDemo {
  private scanner = new Fire22SecurityScanner();

  async runScopedDemo() {
    console.info('🔐 Fire22 Scoped Package Security Demo');
    console.info('='.repeat(50));

    await this.demoScopedPackages();
    await this.demoRegistryConfiguration();
    await this.demoWorkspaceScopes();
    await this.demoPrivateRegistrySecurity();
    await this.demoScopedPolicies();

    console.info('\n🎉 Scoped Security Demo Complete!');
  }

  async demoScopedPackages() {
    console.info('\n📦 SCOPED PACKAGE SECURITY\n');

    const scopedRequest: ScanRequest = {
      packages: [
        // Fire22 scoped packages (trusted)
        { name: '@fire22/core', version: '1.0.0' },
        { name: '@fire22/security-core', version: '1.0.0' },
        { name: '@fire22/security-scanner', version: '1.0.0' },
        { name: '@fire22/middleware', version: '1.0.0' },
        { name: '@fire22/wager-system', version: '1.0.0' },
        { name: '@fire22/env-manager', version: '1.0.0' },
        { name: '@fire22/testing-framework', version: '1.0.0' },

        // Other scoped packages (need security checking)
        { name: '@types/node', version: '20.0.0' },
        { name: '@evil-corp/malware', version: '1.0.0' },
        { name: '@suspicious/crypto-miner', version: '2.0.0' },

        // Unscoped packages
        { name: 'lodash', version: '4.17.20' }, // vulnerable
        { name: 'express', version: '4.18.2' }, // safe
      ],
    };

    console.info('📊 Scanning scoped and unscoped packages...\n');

    const result = await this.scanner.scan(scopedRequest);

    // Analyze by scope
    const fire22Packages = scopedRequest.packages.filter(p => p.name.startsWith('@fire22/'));
    const otherScopedPackages = scopedRequest.packages.filter(
      p => p.name.startsWith('@') && !p.name.startsWith('@fire22/')
    );
    const unscopedPackages = scopedRequest.packages.filter(p => !p.name.startsWith('@'));

    console.info('📋 Package Breakdown:');
    console.info(`   @fire22/* packages: ${fire22Packages.length} (auto-trusted)`);
    console.info(`   Other scoped packages: ${otherScopedPackages.length}`);
    console.info(`   Unscoped packages: ${unscopedPackages.length}`);
    console.info(`   Total advisories: ${result.advisories.length}\n`);

    // Show advisories by scope
    console.info('🛡️ Security Results by Scope:\n');

    console.info('✅ @fire22/* Scope (Trusted):');
    console.info('   All @fire22/* packages automatically trusted');
    console.info('   No security scanning needed for internal packages\n');

    const scopedAdvisories = result.advisories.filter(a => a.package.startsWith('@'));
    if (scopedAdvisories.length > 0) {
      console.info('⚠️ Other Scoped Packages with Issues:');
      scopedAdvisories.forEach(advisory => {
        console.info(
          `   ${advisory.level === 'fatal' ? '🚨' : '⚠️'} ${advisory.package}: ${advisory.title}`
        );
      });
      console.info('');
    }

    const unscopedAdvisories = result.advisories.filter(a => !a.package.startsWith('@'));
    if (unscopedAdvisories.length > 0) {
      console.info('📦 Unscoped Packages with Issues:');
      unscopedAdvisories.forEach(advisory => {
        console.info(
          `   ${advisory.level === 'fatal' ? '🚨' : '⚠️'} ${advisory.package}: ${advisory.title}`
        );
      });
    }
  }

  async demoRegistryConfiguration() {
    console.info('\n🌐 REGISTRY CONFIGURATION\n');

    console.info('📋 bunfig.toml Registry Settings:');
    console.info('```toml');
    console.info('[install]');
    console.info('registry = "https://registry.npmjs.org/"');
    console.info('');
    console.info('[install.scopes]');
    console.info('"@fire22" = "https://fire22.workers.dev/registry"');
    console.info('"@types" = "https://registry.npmjs.org/"');
    console.info('"@cloudflare" = "https://registry.npmjs.org/"');
    console.info('```\n');

    console.info('🔒 Security Implications:');
    console.info('   • @fire22/* packages fetched from private registry');
    console.info('   • Private registry packages inherit trust');
    console.info('   • Public registry packages undergo full scanning');
    console.info('   • Mixed registry support with per-scope policies\n');

    // Demonstrate registry-aware scanning
    const registryRequest: ScanRequest = {
      packages: [
        { name: '@fire22/core', version: '1.0.0', registry: 'https://fire22.workers.dev/registry' },
        {
          name: '@fire22/security-core',
          version: '1.0.0',
          registry: 'https://fire22.workers.dev/registry',
        },
        { name: '@types/node', version: '20.0.0', registry: 'https://registry.npmjs.org/' },
        { name: 'express', version: '4.18.2', registry: 'https://registry.npmjs.org/' },
      ],
      context: {
        production: true,
      },
    };

    console.info('🔍 Registry-Aware Scanning:');
    const result = await this.scanner.scan(registryRequest);

    console.info(
      `   Private registry packages: ${registryRequest.packages.filter(p => p.registry?.includes('fire22')).length}`
    );
    console.info(
      `   Public registry packages: ${registryRequest.packages.filter(p => !p.registry?.includes('fire22')).length}`
    );
    console.info(`   Security advisories: ${result.advisories.length}`);
  }

  async demoWorkspaceScopes() {
    console.info('\n🏗️ WORKSPACE SCOPE SECURITY\n');

    const workspaceScopes = [
      '@fire22/core-dashboard',
      '@fire22/pattern-system',
      '@fire22/api-client',
      '@fire22/sports-betting',
      '@fire22/telegram-integration',
      '@fire22/build-system',
    ];

    console.info('📦 Fire22 Workspace Scopes:');
    workspaceScopes.forEach(scope => {
      console.info(`   ✅ ${scope} (workspace:* protocol)`);
    });

    console.info('\n🔗 Workspace Protocol Security:');
    console.info('   • workspace:* packages never leave local system');
    console.info('   • No network requests = no supply chain attacks');
    console.info('   • Automatic trust for workspace protocol');
    console.info('   • Version locking through workspace protocol\n');

    // Demo workspace protocol handling
    const workspaceRequest: ScanRequest = {
      packages: workspaceScopes.map(name => ({
        name,
        version: 'workspace:*',
      })),
    };

    const result = await this.scanner.scan(workspaceRequest);
    console.info(`📊 Workspace Scan Results:`);
    console.info(`   Packages: ${workspaceRequest.packages.length}`);
    console.info(`   Advisories: ${result.advisories.length} (all trusted)`);
  }

  async demoPrivateRegistrySecurity() {
    console.info('\n🔒 PRIVATE REGISTRY SECURITY\n');

    console.info('🌐 Fire22 Private Registry Configuration:');
    console.info('   URL: https://fire22.workers.dev/registry');
    console.info('   Authentication: Bearer token (from Bun.secrets)');
    console.info('   Scope: @fire22/*\n');

    console.info('🛡️ Security Features:');
    console.info('   • Package signing verification');
    console.info('   • Registry authentication via Bun.secrets');
    console.info('   • Automatic trust for authenticated packages');
    console.info('   • Fallback to public registry disabled\n');

    // Show how credentials are secured
    console.info('🔐 Registry Authentication:');
    console.info('```typescript');
    console.info('// Registry token stored securely');
    console.info('await secrets.set({');
    console.info('  service: "fire22-registry",');
    console.info('  name: "auth-token",');
    console.info('  value: "fire22_registry_token_xxxxx"');
    console.info('});');
    console.info('');
    console.info('// Retrieved during package installation');
    console.info('const token = await secrets.get({');
    console.info('  service: "fire22-registry",');
    console.info('  name: "auth-token"');
    console.info('});');
    console.info('```');
  }

  async demoScopedPolicies() {
    console.info('\n📋 SCOPED PACKAGE POLICIES\n');

    const scopedPolicies = {
      '@fire22/*': {
        trust: 'automatic',
        scanning: 'skip',
        registry: 'private',
        updates: 'workspace-controlled',
      },
      '@types/*': {
        trust: 'high',
        scanning: 'minimal',
        registry: 'public',
        updates: 'auto-patch',
      },
      '@cloudflare/*': {
        trust: 'high',
        scanning: 'standard',
        registry: 'public',
        updates: 'manual',
      },
      '@*': {
        // All other scoped packages
        trust: 'verify',
        scanning: 'full',
        registry: 'public',
        updates: 'manual',
      },
      '*': {
        // Unscoped packages
        trust: 'verify',
        scanning: 'comprehensive',
        registry: 'public',
        updates: 'manual',
      },
    };

    console.info('🔍 Security Policies by Scope:\n');

    for (const [scope, policy] of Object.entries(scopedPolicies)) {
      console.info(`📦 ${scope}:`);
      console.info(`   Trust Level: ${policy.trust}`);
      console.info(`   Scanning: ${policy.scanning}`);
      console.info(`   Registry: ${policy.registry}`);
      console.info(`   Updates: ${policy.updates}`);
      console.info('');
    }

    // Demo custom scope policies
    const customScopeRequest: ScanRequest = {
      packages: [
        { name: '@fire22/new-package', version: '1.0.0' },
        { name: '@partner/integration', version: '2.0.0' },
        { name: '@untrusted/package', version: '1.0.0' },
        { name: 'regular-package', version: '3.0.0' },
      ],
    };

    console.info('🎯 Custom Scope Policy Application:');
    const result = await this.scanner.scan(customScopeRequest);

    customScopeRequest.packages.forEach(pkg => {
      const hasAdvisory = result.advisories.some(a => a.package === pkg.name);
      const icon = pkg.name.startsWith('@fire22/')
        ? '✅'
        : pkg.name.startsWith('@partner/')
          ? '🤝'
          : hasAdvisory
            ? '⚠️'
            : '📦';

      console.info(
        `   ${icon} ${pkg.name}: ${
          pkg.name.startsWith('@fire22/')
            ? 'Auto-trusted (Fire22 scope)'
            : pkg.name.startsWith('@partner/')
              ? 'Partner scope - enhanced scanning'
              : hasAdvisory
                ? 'Security issues detected'
                : 'Standard security scanning applied'
        }`
      );
    });
  }

  async demoScopeSquatting() {
    console.info('\n⚠️ SCOPE SQUATTING DETECTION\n');

    const scopeSquattingRequest: ScanRequest = {
      packages: [
        // Legitimate Fire22 packages
        { name: '@fire22/core', version: '1.0.0' },

        // Potential scope squatting attempts
        { name: '@fire-22/core', version: '1.0.0' }, // Hyphenated variant
        { name: '@fire22js/core', version: '1.0.0' }, // Suffix variant
        { name: '@f1re22/core', version: '1.0.0' }, // Character substitution
        { name: '@firebase22/core', version: '1.0.0' }, // Similar name

        // Other legitimate scopes
        { name: '@types/node', version: '20.0.0' },
      ],
    };

    console.info('🔍 Detecting scope squatting attempts...\n');

    const legitimateScopes = ['@fire22', '@types', '@cloudflare'];

    scopeSquattingRequest.packages.forEach(pkg => {
      const scope = pkg.name.split('/')[0];
      const isLegitimate = legitimateScopes.includes(scope);

      if (!isLegitimate && this.isScopeSquat(scope, '@fire22')) {
        console.info(`🚨 POTENTIAL SCOPE SQUATTING: ${pkg.name}`);
        console.info(`   Suspicious similarity to @fire22 scope`);
        console.info(`   Recommendation: Use official @fire22/* packages only\n`);
      } else if (isLegitimate) {
        console.info(`✅ Legitimate: ${pkg.name}`);
      } else {
        console.info(`📦 Unknown scope: ${pkg.name} (requires security review)`);
      }
    });
  }

  private isScopeSquat(suspectScope: string, legitimateScope: string): boolean {
    // Remove @ symbol for comparison
    const suspect = suspectScope.replace('@', '').toLowerCase();
    const legitimate = legitimateScope.replace('@', '').toLowerCase();

    // Check for common squatting patterns
    const patterns = [
      legitimate.replace('22', '-22'), // Hyphenation
      legitimate.replace('22', '2'), // Number shortening
      legitimate + 'js', // Common suffix
      legitimate + 'io', // Common suffix
      legitimate.replace('i', '1'), // Character substitution
      legitimate.replace('e', '3'), // Leetspeak
    ];

    return (
      patterns.some(pattern => suspect === pattern) ||
      this.levenshteinDistance(suspect, legitimate) <= 2
    );
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix = Array(b.length + 1)
      .fill(null)
      .map(() => Array(a.length + 1).fill(null));

    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[b.length][a.length];
  }
}

// Run demo
async function runScopedDemo() {
  try {
    const demo = new ScopedPackageSecurityDemo();
    await demo.runScopedDemo();
    await demo.demoScopeSquatting();
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  await runScopedDemo();
}

export { ScopedPackageSecurityDemo };
