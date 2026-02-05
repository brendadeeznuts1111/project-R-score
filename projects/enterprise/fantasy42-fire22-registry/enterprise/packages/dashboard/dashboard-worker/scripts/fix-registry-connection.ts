#!/usr/bin/env bun

/**
 * 🔧 Fix Registry Connection Issues
 *
 * Addresses Cloudflare/registry connection problems by:
 * 1. Diagnosing registry connectivity
 * 2. Providing fallback options
 * 3. Fixing bunx global package resolution
 * 4. Ensuring robust connection gating
 */

import { $ } from 'bun';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

interface RegistryConfig {
  name: string;
  url: string;
  priority: number;
  timeout: number;
  description: string;
}

interface ConnectionResult {
  registry: string;
  connected: boolean;
  responseTime: number;
  error?: string;
}

class RegistryConnectionManager {
  private registries: RegistryConfig[] = [
    {
      name: 'npm',
      url: 'https://registry.npmjs.org/',
      priority: 1,
      timeout: 10000,
      description: 'Official NPM Registry',
    },
    {
      name: 'yarn',
      url: 'https://registry.yarnpkg.com/',
      priority: 2,
      timeout: 8000,
      description: 'Yarn Registry Mirror',
    },
    {
      name: 'taobao',
      url: 'https://registry.npmmirror.com/',
      priority: 3,
      timeout: 5000,
      description: 'Taobao NPM Mirror (China)',
    },
    {
      name: 'cloudflare',
      url: 'https://npm.cloudflare.com/',
      priority: 4,
      timeout: 12000,
      description: 'Cloudflare NPM Mirror',
    },
  ];

  private problematicRegistries = [
    'https://packages.apexodds.net/',
    'https://registry.fire22.ag/',
    'https://private.registry.fire22.com/',
  ];

  /**
   * Test connectivity to a registry
   */
  async testRegistry(registry: RegistryConfig): Promise<ConnectionResult> {
    const startTime = Date.now();

    try {
      console.log(`🔍 Testing ${registry.name}: ${registry.url}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), registry.timeout);

      const response = await fetch(`${registry.url}@changesets/cli/latest`, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Fire22-Registry-Test/1.0',
        },
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (response.ok || response.status === 404) {
        console.log(`✅ ${registry.name}: Connected (${responseTime}ms)`);
        return {
          registry: registry.name,
          connected: true,
          responseTime,
        };
      } else {
        console.log(`❌ ${registry.name}: HTTP ${response.status} (${responseTime}ms)`);
        return {
          registry: registry.name,
          connected: false,
          responseTime,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      console.log(`❌ ${registry.name}: ${error.message} (${responseTime}ms)`);

      return {
        registry: registry.name,
        connected: false,
        responseTime,
        error: error.message,
      };
    }
  }

  /**
   * Test all registries and return the best one
   */
  async findBestRegistry(): Promise<RegistryConfig | null> {
    console.log('🚀 Testing registry connectivity...\n');

    const results: ConnectionResult[] = [];

    for (const registry of this.registries) {
      const result = await this.testRegistry(registry);
      results.push(result);

      // If we find a working registry with good response time, use it
      if (result.connected && result.responseTime < 3000) {
        console.log(`\n🎯 Selected: ${registry.name} (${result.responseTime}ms)\n`);
        return registry;
      }
    }

    // Find the best working registry
    const workingResults = results.filter(r => r.connected);

    if (workingResults.length === 0) {
      console.log('\n❌ No registries are accessible!\n');
      this.showTroubleshootingOptions();
      return null;
    }

    // Sort by response time and get the fastest
    workingResults.sort((a, b) => a.responseTime - b.responseTime);
    const fastest = workingResults[0];
    const selectedRegistry = this.registries.find(r => r.name === fastest.registry);

    console.log(
      `\n🎯 Selected fastest working registry: ${selectedRegistry?.name} (${fastest.responseTime}ms)\n`
    );
    return selectedRegistry || null;
  }

  /**
   * Update bunfig.toml with the best registry
   */
  updateBunConfig(registry: RegistryConfig): void {
    const configPath = 'bunfig.toml';

    const newConfig = `# Fire22 Dashboard - Bun Configuration
# Auto-updated by fix-registry-connection.ts

[install]
registry = "${registry.url}"
linker = "hoisted"
cache = true
exact = true
dev = true
optional = true
auto = false
fallback = true

# Registry configuration
[install.registry]
timeout = ${registry.timeout}
retries = 3
cache_dir = ".bun/install/cache"

# Network settings
[install.network]
max_concurrent_requests = 10
dns_timeout = 5000
connect_timeout = 10000

# Security settings
[install.security]
scanner = "@fire22/security-scanner"

[build]
target = "bun"
format = "esm"
splitting = true
minify = false

[test]
coverage = true

[run]
bun = true
hot = true

# CSS Build Scripts
[scripts]
"css:extract" = "bun run scripts/extract-css.ts"
"css:build" = "bun build ./src/styles/index.css --outdir=public/css --naming='[name].[ext]'"
"css:watch" = "bun build ./src/styles/index.css --outdir=public/css --naming='[name].[ext]' --watch"
"css:consolidate" = "bun run css:extract && bun run css:build"
"build:css" = "bun run css:consolidate"

# Serve configuration
[serve]
port = 3001
host = "0.0.0.0"

[serve.static]
directory = "public"
plugins = []

[serve.static.paths]
"/css" = "./public/css"
"/styles" = "./src/styles"
"/js" = "./src/js"

# Registry fallback configuration
[install.registries]
primary = "${registry.url}"
fallback = "https://registry.npmjs.org/"
mirror = "https://registry.yarnpkg.com/"
`;

    writeFileSync(configPath, newConfig);
    console.log(`✅ Updated bunfig.toml with ${registry.name} registry`);
  }

  /**
   * Create a registry wrapper script for bunx
   */
  createBunxWrapper(): void {
    const wrapperScript = `#!/bin/bash
# Fire22 Registry Wrapper for bunx
# Auto-generated by fix-registry-connection.ts

# Function to try bunx with fallback registries
fire22_bunx() {
    local package="$1"
    shift
    local args="$@"
    
    # Primary registry attempt
    echo "🚀 Attempting with primary registry..."
    if timeout 30s bun x "$package" $args 2>/dev/null; then
        return 0
    fi
    
    # Fallback to NPM registry
    echo "🔄 Falling back to NPM registry..."
    BUN_REGISTRY="https://registry.npmjs.org/" timeout 30s bun x "$package" $args 2>/dev/null && return 0
    
    # Fallback to Yarn registry
    echo "🔄 Falling back to Yarn registry..."
    BUN_REGISTRY="https://registry.yarnpkg.com/" timeout 30s bun x "$package" $args 2>/dev/null && return 0
    
    # Last resort: direct npm
    echo "🔄 Last resort: using npx..."
    if command -v npx >/dev/null 2>&1; then
        npx "$package" $args
        return $?
    fi
    
    echo "❌ All registry attempts failed. Options:"
    echo "  1. Check network connectivity: ping registry.npmjs.org"
    echo "  2. Try manual install: bun add -g $package"
    echo "  3. Use alternative: npm i -g $package && npx $package"
    echo "  4. Contact system administrator"
    return 1
}

# Call the function with all arguments
fire22_bunx "$@"
`;

    writeFileSync('scripts/bunx-wrapper.sh', wrapperScript);

    // Make executable
    try {
      await $`chmod +x scripts/bunx-wrapper.sh`;
      console.log('✅ Created bunx wrapper script at scripts/bunx-wrapper.sh');
    } catch (error) {
      console.log('⚠️ Created wrapper script but could not set executable permissions');
    }
  }

  /**
   * Update package.json scripts to use registry-aware commands
   */
  updatePackageScripts(): void {
    const packagePath = 'package.json';

    if (!existsSync(packagePath)) {
      console.log('❌ package.json not found');
      return;
    }

    try {
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));

      // Update changeset command to be registry-aware
      if (packageJson.scripts) {
        packageJson.scripts['changeset:create'] =
          'bash scripts/bunx-wrapper.sh @changesets/cli changeset';
        packageJson.scripts['changeset:version'] =
          'bash scripts/bunx-wrapper.sh @changesets/cli version';
        packageJson.scripts['changeset:publish'] =
          'bash scripts/bunx-wrapper.sh @changesets/cli publish';

        // Add registry diagnostic commands
        packageJson.scripts['registry:test'] = 'bun run scripts/fix-registry-connection.ts test';
        packageJson.scripts['registry:fix'] = 'bun run scripts/fix-registry-connection.ts fix';
        packageJson.scripts['registry:status'] =
          'bun run scripts/fix-registry-connection.ts status';

        writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
        console.log('✅ Updated package.json with registry-aware scripts');
      }
    } catch (error) {
      console.log('⚠️ Could not update package.json scripts:', error);
    }
  }

  /**
   * Show troubleshooting options when registries fail
   */
  showTroubleshootingOptions(): void {
    console.log('🔧 Registry Connection Troubleshooting Options:\n');
    console.log('1. Network Diagnostics:');
    console.log('   ping registry.npmjs.org');
    console.log('   curl -I https://registry.npmjs.org/');
    console.log('   nslookup registry.npmjs.org\n');

    console.log('2. Proxy/Firewall Check:');
    console.log('   export HTTP_PROXY=http://your-proxy:port');
    console.log('   export HTTPS_PROXY=https://your-proxy:port');
    console.log('   export NO_PROXY=localhost,127.0.0.1\n');

    console.log('3. DNS Resolution:');
    console.log('   echo "nameserver 8.8.8.8" >> /etc/resolv.conf');
    console.log('   echo "nameserver 1.1.1.1" >> /etc/resolv.conf\n');

    console.log('4. Alternative Registries:');
    this.registries.forEach(reg => {
      console.log(`   ${reg.name}: ${reg.url}`);
    });
    console.log();

    console.log('5. Manual Solutions:');
    console.log('   bun add -g @changesets/cli  # Install globally first');
    console.log('   npm i -g @changesets/cli    # Use npm instead');
    console.log('   yarn global add @changesets/cli  # Use yarn instead\n');

    console.log('6. Run Registry Fix:');
    console.log('   bun run registry:fix\n');
  }

  /**
   * Clean up problematic registry references
   */
  cleanupProblematicRegistries(): void {
    console.log('🧹 Cleaning up problematic registry references...');

    // Check for .npmrc files
    const npmrcFiles = ['.npmrc', '.yarnrc', '.yarnrc.yml'];

    npmrcFiles.forEach(file => {
      if (existsSync(file)) {
        try {
          const content = readFileSync(file, 'utf-8');
          let hasProblematic = false;

          this.problematicRegistries.forEach(registry => {
            if (content.includes(registry)) {
              hasProblematic = true;
              console.log(`⚠️ Found problematic registry in ${file}: ${registry}`);
            }
          });

          if (hasProblematic) {
            console.log(`📝 Please manually review and fix ${file}`);
          }
        } catch (error) {
          console.log(`⚠️ Could not read ${file}`);
        }
      }
    });

    console.log('✅ Registry cleanup check completed');
  }
}

// Main execution
async function main() {
  const manager = new RegistryConnectionManager();
  const args = process.argv.slice(2);
  const command = args[0] || 'fix';

  console.log('🔥 Fire22 Registry Connection Fixer\n');

  switch (command) {
    case 'test':
      await manager.findBestRegistry();
      break;

    case 'fix':
      console.log('🔧 Running comprehensive registry fix...\n');

      // Clean up problematic registries
      manager.cleanupProblematicRegistries();

      // Find best working registry
      const bestRegistry = await manager.findBestRegistry();

      if (bestRegistry) {
        // Update configuration
        manager.updateBunConfig(bestRegistry);
        manager.createBunxWrapper();
        manager.updatePackageScripts();

        console.log('✅ Registry configuration fixed!\n');
        console.log('📋 Available commands:');
        console.log('  bun run registry:test    - Test registry connectivity');
        console.log('  bun run registry:status  - Show current registry status');
        console.log('  bash scripts/bunx-wrapper.sh <package> - Use registry-aware bunx\n');
        console.log('🔄 You may need to run: bun install --force');
      } else {
        console.log('❌ Could not establish registry connection');
        process.exit(1);
      }
      break;

    case 'status':
      console.log('📊 Current Registry Status:\n');
      const current = await manager.findBestRegistry();
      if (current) {
        console.log(`Active Registry: ${current.name} - ${current.url}`);
      }
      break;

    default:
      console.log('Usage: bun run scripts/fix-registry-connection.ts [test|fix|status]');
      break;
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { RegistryConnectionManager };
