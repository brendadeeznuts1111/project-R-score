#!/usr/bin/env bun

/**
 * SportsBet Global Package Manager
 * Seamless integration between global packages, private registry, and BunX
 */

import { $ } from 'bun';
import { existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';

interface PackageInfo {
  name: string;
  version: string;
  registry: string;
  scope?: string;
}

interface RegistryConfig {
  url: string;
  token: string;
  userAgent: string;
  priority: number;
  scopes: string[];
}

class SportsBetGlobalManager {
  private homeDir: string;
  private globalDir: string;
  private binDir: string;
  private bunxCacheDir: string;
  private globalCacheDir: string;
  private registries: Map<string, RegistryConfig>;

  constructor() {
    this.homeDir = process.env.HOME || '';
    this.globalDir = join(this.homeDir, '.bun', 'install', 'global');
    this.binDir = join(this.homeDir, '.bun', 'bin');
    this.bunxCacheDir = join(this.homeDir, '.bun', 'bunx', 'cache');
    this.globalCacheDir = join(this.homeDir, '.bun', 'install', 'cache');

    // Configure registries with priority
    this.registries = new Map([
      [
        'sportsbet',
        {
          url: 'https://registry.sportsbet.com/',
          token: process.env.SPORTSBET_REGISTRY_TOKEN || '',
          userAgent: 'SportsBet-GlobalManager/5.1.0',
          priority: 1,
          scopes: ['@sportsbet-registry', '@sportsbet'],
        },
      ],
      [
        'fire22',
        {
          url: process.env.FIRE22_REGISTRY_URL || 'https://registry.fire22.com/',
          token: process.env.FIRE22_REGISTRY_TOKEN || '',
          userAgent: 'Fire22-GlobalManager/5.1.0',
          priority: 2,
          scopes: ['@fire22', '@enterprise'],
        },
      ],
      [
        'npm',
        {
          url: 'https://registry.npmjs.org',
          token: process.env.NPM_TOKEN || '',
          userAgent: 'SportsBet-NPM/5.1.0',
          priority: 3,
          scopes: [],
        },
      ],
    ]);
  }

  /**
   * Setup unified global and BunX environment
   */
  async setupUnifiedEnvironment(): Promise<void> {
    console.log('🚀 Setting up unified SportsBet/BunX environment...\n');

    // Create all required directories
    const dirs = [
      this.globalDir,
      this.binDir,
      this.bunxCacheDir,
      this.globalCacheDir,
      join(this.homeDir, '.bun', 'secrets'),
      join(this.homeDir, '.bun', 'certificates'),
    ];

    for (const dir of dirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        console.log(`✅ Created: ${dir.replace(this.homeDir, '~')}`);
      }
    }

    // Create symlink for shared cache
    await this.setupSharedCache();

    // Setup registry authentication
    await this.setupRegistryAuth();

    console.log('\n✅ Unified environment ready!');
  }

  /**
   * Setup shared cache between global and BunX
   */
  private async setupSharedCache(): Promise<void> {
    console.log('\n🔗 Setting up shared cache...');

    // Create cache metadata
    const cacheConfig = {
      version: '1.0.0',
      strategy: 'unified',
      globalCache: this.globalCacheDir,
      bunxCache: this.bunxCacheDir,
      maxSize: '2GB',
      ttl: 3600,
      compression: 6,
      sharedPackages: ['@sportsbet-registry/*', '@fire22/*', '@enterprise/*'],
    };

    await Bun.write(
      join(this.homeDir, '.bun', 'cache-config.json'),
      JSON.stringify(cacheConfig, null, 2)
    );

    console.log('✅ Cache configuration created');
  }

  /**
   * Setup registry authentication
   */
  private async setupRegistryAuth(): Promise<void> {
    console.log('\n🔐 Configuring registry authentication...');

    // Create .npmrc for compatibility
    const npmrcContent = `
# SportsBet Registry Authentication
@sportsbet-registry:registry=https://registry.sportsbet.com/
//registry.sportsbet.com/:_authToken=\${SPORTSBET_REGISTRY_TOKEN}
//registry.sportsbet.com/:always-auth=true

# Fire22 Registry
@fire22:registry=\${FIRE22_REGISTRY_URL}
//registry.fire22.com/:_authToken=\${FIRE22_REGISTRY_TOKEN}

# Default registry
registry=https://registry.npmjs.org

# Performance settings
fetch-retries=3
fetch-retry-mintimeout=1000
fetch-retry-maxtimeout=10000
network-concurrency=48

# Security
audit-level=high
`;

    await Bun.write(join(this.homeDir, '.npmrc'), npmrcContent.trim());
    console.log('✅ Registry authentication configured');
  }

  /**
   * Install SportsBet global packages with BunX compatibility
   */
  async installSportsBetPackages(): Promise<void> {
    console.log('\n📦 Installing SportsBet packages (global + BunX)...\n');

    const packages = [
      // Core SportsBet packages
      { name: '@sportsbet-registry/cli', global: true, bunx: true },
      { name: '@sportsbet-registry/security-scanner', global: true, bunx: true },
      { name: '@sportsbet-registry/compliance-checker', global: true, bunx: true },
      { name: '@sportsbet-registry/betting-engine', global: false, bunx: true },
      { name: '@sportsbet-registry/odds-calculator', global: false, bunx: true },
      { name: '@sportsbet-registry/live-sync', global: false, bunx: true },

      // Fire22 packages
      { name: '@fire22/security-scanner', global: true, bunx: true },
      { name: '@fire22/analytics-dashboard', global: false, bunx: true },
      { name: '@fire22/compliance-core', global: false, bunx: true },
    ];

    for (const pkg of packages) {
      console.log(`📦 ${pkg.name}:`);

      // Install globally if specified
      if (pkg.global) {
        try {
          const { exitCode } = await $`bun add --global ${pkg.name}`
            .env({
              USER_AGENT: 'SportsBet-Installer/5.1.0',
            })
            .quiet();

          if (exitCode === 0) {
            console.log(`  ✅ Global installation successful`);
          }
        } catch (error: any) {
          console.warn(`  ⚠️ Global installation failed: ${error.message}`);
        }
      }

      // Pre-cache for BunX if specified
      if (pkg.bunx) {
        try {
          const { exitCode } = await $`bunx --package ${pkg.name} --help`.quiet();
          if (exitCode === 0 || exitCode === 1) {
            console.log(`  ✅ BunX pre-cached`);
          }
        } catch (error: any) {
          console.warn(`  ⚠️ BunX pre-cache failed: ${error.message}`);
        }
      }
    }
  }

  /**
   * Test BunX integration with private registry
   */
  async testBunXIntegration(): Promise<void> {
    console.log('\n🧪 Testing BunX integration...\n');

    const tests = [
      // Test scope resolution
      {
        command: 'bunx security-scanner --version',
        expected: '@fire22/security-scanner',
        description: 'Default scope resolution',
      },
      // Test explicit SportsBet package
      {
        command: 'bunx @sportsbet-registry/odds-calculator --help',
        expected: 'SportsBet Odds Calculator',
        description: 'SportsBet package execution',
      },
      // Test fallback to npm
      {
        command: 'bunx prettier --version',
        expected: 'prettier',
        description: 'NPM fallback',
      },
    ];

    for (const test of tests) {
      console.log(`🔍 ${test.description}:`);
      try {
        const { stdout, exitCode } = await $`${test.command}`.quiet();
        if (exitCode === 0 || stdout.includes(test.expected)) {
          console.log(`  ✅ Success`);
        } else {
          console.log(`  ⚠️ Unexpected output`);
        }
      } catch (error: any) {
        console.log(`  ❌ Failed: ${error.message}`);
      }
    }
  }

  /**
   * Sync global packages with BunX cache
   */
  async syncGlobalWithBunX(): Promise<void> {
    console.log('\n🔄 Syncing global packages with BunX cache...\n');

    try {
      // Get list of global packages
      const { stdout } = await $`bun pm ls --global --json`.quiet();
      const globalPackages = JSON.parse(stdout || '[]');

      console.log(`Found ${globalPackages.length} global packages`);

      // Pre-cache each for BunX
      for (const pkg of globalPackages) {
        console.log(`Syncing ${pkg.name}...`);
        try {
          await $`bunx --package ${pkg.name}@${pkg.version} --help`.quiet();
          console.log(`  ✅ Synced to BunX cache`);
        } catch {
          console.log(`  ⏭️ Skipped (not executable)`);
        }
      }
    } catch (error: any) {
      console.error(`❌ Sync failed: ${error.message}`);
    }
  }

  /**
   * Audit unified environment
   */
  async auditUnifiedEnvironment(): Promise<void> {
    console.log('\n🔍 Auditing unified environment...\n');

    // Audit global packages
    console.log('📦 Global packages audit:');
    try {
      const { exitCode, stdout } = await $`bun audit --global --audit-level=high --json`.quiet();
      const data = JSON.parse(stdout || '{}');
      const vulns = data.vulnerabilities || [];

      if (vulns.length === 0) {
        console.log('  ✅ No vulnerabilities found');
      } else {
        const critical = vulns.filter((v: any) => v.severity === 'critical').length;
        const high = vulns.filter((v: any) => v.severity === 'high').length;
        console.log(`  ⚠️ Found ${vulns.length} vulnerabilities`);
        if (critical > 0) console.log(`    🔴 Critical: ${critical}`);
        if (high > 0) console.log(`    🟠 High: ${high}`);
      }
    } catch (error: any) {
      console.error(`  ❌ Audit failed: ${error.message}`);
    }

    // Check cache status
    console.log('\n💾 Cache status:');
    try {
      const globalSize = await $`du -sh ${this.globalCacheDir}`.quiet();
      const bunxSize = await $`du -sh ${this.bunxCacheDir}`.quiet();
      console.log(`  Global cache: ${globalSize.stdout.trim()}`);
      console.log(`  BunX cache: ${bunxSize.stdout.trim()}`);
    } catch {
      console.log('  Cache sizes unavailable');
    }

    // Verify registry connectivity
    console.log('\n🌐 Registry connectivity:');
    for (const [name, config] of this.registries) {
      try {
        const { exitCode } = await $`curl -s -o /dev/null -w "%{http_code}" ${config.url}`.quiet();
        console.log(`  ${name}: ✅ Connected`);
      } catch {
        console.log(`  ${name}: ❌ Unreachable`);
      }
    }
  }

  /**
   * Display usage examples
   */
  displayUsageExamples(): void {
    console.log('\n📚 Usage Examples:');
    console.log('='.repeat(60));

    console.log('\n1️⃣ Global package installation:');
    console.log('  bun add --global @sportsbet-registry/cli');

    console.log('\n2️⃣ BunX execution (automatic scope resolution):');
    console.log('  bunx security-scanner  # Resolves to @fire22/security-scanner');
    console.log('  bunx odds-calculator   # Tries @fire22, then @sportsbet-registry');

    console.log('\n3️⃣ Explicit SportsBet package:');
    console.log('  bunx @sportsbet-registry/betting-engine');

    console.log('\n4️⃣ Development registry:');
    console.log('  bunx --registry=https://dev.registry.sportsbet.com/ tool');

    console.log('\n5️⃣ Shared cache benefits:');
    console.log('  - Global install caches for BunX');
    console.log('  - BunX execution caches for global');
    console.log('  - Single cache invalidation');

    console.log('\n' + '='.repeat(60));
  }

  /**
   * Run complete setup
   */
  async run(): Promise<void> {
    console.log('='.repeat(60));
    console.log('   SportsBet Global/BunX Unified Manager v5.1.0');
    console.log('='.repeat(60));

    await this.setupUnifiedEnvironment();
    await this.installSportsBetPackages();
    await this.syncGlobalWithBunX();
    await this.testBunXIntegration();
    await this.auditUnifiedEnvironment();
    this.displayUsageExamples();

    console.log('\n' + '='.repeat(60));
    console.log('✅ Unified SportsBet/BunX setup complete!');
    console.log('='.repeat(60));
  }
}

// CLI interface
const args = process.argv.slice(2);
const manager = new SportsBetGlobalManager();

switch (args[0]) {
  case 'setup':
    await manager.setupUnifiedEnvironment();
    break;
  case 'install':
    await manager.installSportsBetPackages();
    break;
  case 'sync':
    await manager.syncGlobalWithBunX();
    break;
  case 'test':
    await manager.testBunXIntegration();
    break;
  case 'audit':
    await manager.auditUnifiedEnvironment();
    break;
  case 'examples':
    manager.displayUsageExamples();
    break;
  default:
    await manager.run();
}
