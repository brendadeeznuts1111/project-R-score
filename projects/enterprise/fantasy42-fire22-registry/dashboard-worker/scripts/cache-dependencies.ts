#!/usr/bin/env bun

/**
 * Dependency Caching Strategy for Fire22 Dashboard
 * Optimizes package installation with smart caching
 */

import { $ } from 'bun';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const CACHE_DIR = './.bun-cache';
const GLOBAL_CACHE = `${process.env.HOME}/.bun/install/cache`;

interface CacheStats {
  localCacheSize: string;
  globalCacheSize: string;
  packagesCount: number;
  lastUpdate: Date;
}

class DependencyCacheManager {
  private cacheDir: string;

  constructor() {
    this.cacheDir = CACHE_DIR;
    this.ensureCacheDirectory();
  }

  private ensureCacheDirectory(): void {
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
      console.log(`📁 Created cache directory: ${this.cacheDir}`);
    }
  }

  async warmCache(): Promise<void> {
    console.log('🔥 Warming dependency cache...');

    // Prefetch heavy packages
    const heavyPackages = [
      'sharp',
      'esbuild',
      '@swc/core',
      '@docusaurus/core',
      '@docusaurus/preset-classic',
      'fsevents',
    ];

    for (const pkg of heavyPackages) {
      console.log(`  📦 Prefetching ${pkg}...`);
      try {
        await $`bun add ${pkg} --dry-run --cache-dir ${this.cacheDir}`.quiet();
      } catch (error) {
        console.log(`  ⚠️ Could not prefetch ${pkg}`);
      }
    }

    console.log('✅ Cache warming complete');
  }

  async getCacheStats(): Promise<CacheStats> {
    const localSize = await $`du -sh ${this.cacheDir} 2>/dev/null || echo "0"`.text();
    const globalSize = await $`du -sh ${GLOBAL_CACHE} 2>/dev/null || echo "0"`.text();
    const packageCount = await $`find ${this.cacheDir} -name "*.tgz" 2>/dev/null | wc -l`.text();

    return {
      localCacheSize: localSize.trim().split('\t')[0] || '0',
      globalCacheSize: globalSize.trim().split('\t')[0] || '0',
      packagesCount: parseInt(packageCount.trim()) || 0,
      lastUpdate: new Date(),
    };
  }

  async optimizeCache(): Promise<void> {
    console.log('🔧 Optimizing cache...');

    // Remove old cache entries (older than 30 days)
    await $`find ${this.cacheDir} -type f -mtime +30 -delete 2>/dev/null`.quiet();

    // Deduplicate cache entries
    console.log('  🔍 Deduplicating cache entries...');
    await $`bun pm cache prune`.quiet();

    console.log('✅ Cache optimization complete');
  }

  async setupCDNMirrors(): Promise<void> {
    console.log('🌐 Setting up CDN mirrors...');

    // Create .npmrc with mirror configurations for CI/CD
    const npmrcContent = `
# CDN Mirrors for heavy packages
sharp_binary_host=https://cdn.jsdelivr.net/npm/sharp
sharp_libvips_binary_host=https://cdn.jsdelivr.net/npm/@img/sharp-libvips
fse_binary_host_mirror=https://cdn.jsdelivr.net/npm/fsevents
swc_binary_host=https://cdn.jsdelivr.net/npm/@swc/core
esbuild_binary_host=https://cdn.jsdelivr.net/npm/esbuild

# Registry configuration
registry=https://registry.npmjs.org/
@fire22:registry=https://fire22-security-registry.nolarose1968-806.workers.dev/

# Performance settings
network-concurrency=20
fetch-retries=5
fetch-retry-mintimeout=10000
fetch-retry-maxtimeout=60000
cache-min=3600
`.trim();

    await Bun.write('.npmrc', npmrcContent);
    console.log('✅ CDN mirrors configured');
  }

  async createLocalRegistry(): Promise<void> {
    console.log('🏗️ Setting up local registry proxy...');

    // Check if Verdaccio is available
    const hasVerdaccio = await $`which verdaccio`
      .quiet()
      .then(() => true)
      .catch(() => false);

    if (!hasVerdaccio) {
      console.log('  ℹ️ Verdaccio not installed. For local registry, run:');
      console.log('    bun add -g verdaccio');
      console.log('    verdaccio --config ./verdaccio.yaml');
      return;
    }

    // Create Verdaccio configuration
    const verdaccioConfig = `
storage: ./storage
auth:
  htpasswd:
    file: ./htpasswd
uplinks:
  npmjs:
    url: https://registry.npmjs.org/
    cache: true
    max_fails: 5
    timeout: 60s
  fire22:
    url: https://fire22-security-registry.nolarose1968-806.workers.dev/
    cache: true
packages:
  '@fire22/*':
    access: $all
    publish: $authenticated
    proxy: fire22
  '**':
    access: $all
    publish: $authenticated
    proxy: npmjs
logs:
  type: file
  level: warn
  path: ./verdaccio.log
`.trim();

    await Bun.write('verdaccio.yaml', verdaccioConfig);
    console.log('✅ Local registry configuration created');
  }

  async generateReport(): Promise<void> {
    console.log('\n📊 Cache Report');
    console.log('═'.repeat(50));

    const stats = await this.getCacheStats();

    console.log(`📦 Local Cache: ${stats.localCacheSize}`);
    console.log(`🌍 Global Cache: ${stats.globalCacheSize}`);
    console.log(`📚 Cached Packages: ${stats.packagesCount}`);
    console.log(`🕐 Last Update: ${stats.lastUpdate.toLocaleString()}`);

    // Test registry connectivity
    console.log('\n🔗 Registry Connectivity:');

    const registries = [
      { name: 'NPM', url: 'https://registry.npmjs.org/-/ping' },
      { name: 'Yarn', url: 'https://registry.yarnpkg.com/-/ping' },
      { name: 'JSDelivr CDN', url: 'https://cdn.jsdelivr.net/' },
      {
        name: 'Fire22',
        url: 'https://fire22-security-registry.nolarose1968-806.workers.dev/health',
      },
    ];

    for (const registry of registries) {
      try {
        const start = Bun.nanoseconds();
        const response = await fetch(registry.url, { signal: AbortSignal.timeout(5000) });
        const end = Bun.nanoseconds();
        const ms = (end - start) / 1_000_000;

        if (response.ok) {
          console.log(`  ✅ ${registry.name}: ${ms.toFixed(2)}ms`);
        } else {
          console.log(`  ⚠️ ${registry.name}: HTTP ${response.status}`);
        }
      } catch (error) {
        console.log(`  ❌ ${registry.name}: Offline`);
      }
    }

    console.log('\n💡 Optimization Tips:');
    console.log('  • Use "bun run install:optimized" for fastest installs');
    console.log('  • Run "bun run cache:warm" before CI builds');
    console.log('  • Enable local registry with Verdaccio for offline development');
    console.log('  • Use CDN mirrors for heavy packages in production');
  }
}

// Main execution
async function main() {
  const manager = new DependencyCacheManager();

  const command = process.argv[2] || 'report';

  switch (command) {
    case 'warm':
      await manager.warmCache();
      break;
    case 'optimize':
      await manager.optimizeCache();
      break;
    case 'cdn':
      await manager.setupCDNMirrors();
      break;
    case 'local':
      await manager.createLocalRegistry();
      break;
    case 'stats':
      const stats = await manager.getCacheStats();
      console.log(JSON.stringify(stats, null, 2));
      break;
    case 'report':
    default:
      await manager.generateReport();
      break;
  }
}

// Run the cache manager
if (import.meta.main) {
  await main();
}
