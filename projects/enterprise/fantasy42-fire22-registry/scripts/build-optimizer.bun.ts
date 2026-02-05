#!/usr/bin/env bun

/**
 * ⚡ Build Performance Optimizer for Fantasy42-Fire22
 *
 * Advanced build optimization with caching, parallelization, and incremental builds
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'fs';
import { join, relative, extname } from 'path';
import { execSync, spawn } from 'child_process';

interface BuildConfig {
  cache: {
    enabled: boolean;
    dir: string;
    maxAge: number; // in milliseconds
  };
  parallel: {
    enabled: boolean;
    maxWorkers: number;
  };
  incremental: {
    enabled: boolean;
    trackChanges: boolean;
  };
  optimization: {
    enabled: boolean;
    minify: boolean;
    treeShake: boolean;
    compress: boolean;
  };
}

interface BuildTarget {
  name: string;
  path: string;
  type: 'package' | 'app' | 'library';
  dependencies: string[];
  lastBuild?: number;
  hash?: string;
}

class BuildOptimizer {
  private config: BuildConfig;
  private cache: Map<string, any> = new Map();
  private buildQueue: BuildTarget[] = [];
  private activeBuilds: number = 0;

  constructor(config: Partial<BuildConfig> = {}) {
    this.config = {
      cache: {
        enabled: true,
        dir: './.build-cache',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
      parallel: {
        enabled: true,
        maxWorkers: 4,
      },
      incremental: {
        enabled: true,
        trackChanges: true,
      },
      optimization: {
        enabled: true,
        minify: true,
        treeShake: true,
        compress: true,
      },
      ...config,
    };

    this.initializeCache();
  }

  private initializeCache(): void {
    if (!this.config.cache.enabled) return;

    if (!existsSync(this.config.cache.dir)) {
      mkdirSync(this.config.cache.dir, { recursive: true });
    }

    // Load existing cache
    const cacheFile = join(this.config.cache.dir, 'build-cache.json');
    if (existsSync(cacheFile)) {
      try {
        const cacheData = JSON.parse(readFileSync(cacheFile, 'utf-8'));
        this.cache = new Map(Object.entries(cacheData));
        console.log(`📦 Loaded build cache with ${this.cache.size} entries`);
      } catch (error) {
        console.log('⚠️ Could not load build cache, starting fresh');
      }
    }
  }

  private saveCache(): void {
    if (!this.config.cache.enabled) return;

    const cacheFile = join(this.config.cache.dir, 'build-cache.json');
    const cacheData = Object.fromEntries(this.cache.entries());

    writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2));
  }

  private calculateFileHash(filePath: string): string {
    if (!existsSync(filePath)) return '';

    try {
      const content = readFileSync(filePath);
      const crypto = await import('crypto');
      return crypto.createHash('md5').update(content).digest('hex');
    } catch (error) {
      return '';
    }
  }

  private async isBuildNeeded(target: BuildTarget): Promise<boolean> {
    if (!this.config.incremental.enabled) return true;

    const cacheKey = `build:${target.name}`;
    const cached = this.cache.get(cacheKey);

    if (!cached) return true;

    // Check if cache is expired
    if (this.config.cache.enabled) {
      const cacheAge = Date.now() - cached.timestamp;
      if (cacheAge > this.config.cache.maxAge) {
        console.log(
          `⏰ Cache expired for ${target.name} (${Math.floor(cacheAge / 1000 / 60)}m old)`
        );
        return true;
      }
    }

    // Check if source files changed
    if (this.config.incremental.trackChanges) {
      const currentHash = await this.calculateBuildHash(target);
      if (currentHash !== cached.hash) {
        console.log(`🔄 Source changed for ${target.name}`);
        return true;
      }
    }

    console.log(`✅ Build cache hit for ${target.name}`);
    return false;
  }

  private async calculateBuildHash(target: BuildTarget): Promise<string> {
    const crypto = await import('crypto');
    const hash = crypto.createHash('md5');

    // Hash package.json
    const pkgJsonPath = join(target.path, 'package.json');
    if (existsSync(pkgJsonPath)) {
      hash.update(readFileSync(pkgJsonPath));
    }

    // Hash source files
    const srcPath = join(target.path, 'src');
    if (existsSync(srcPath)) {
      this.hashDirectory(srcPath, hash);
    }

    return hash.digest('hex');
  }

  private hashDirectory(dirPath: string, hash: any): void {
    const items = readdirSync(dirPath);

    for (const item of items) {
      const itemPath = join(dirPath, item);
      const stat = statSync(itemPath);

      if (stat.isDirectory()) {
        this.hashDirectory(itemPath, hash);
      } else if (stat.isFile() && ['.ts', '.tsx', '.js', '.jsx'].includes(extname(item))) {
        hash.update(readFileSync(itemPath));
      }
    }
  }

  private async buildTarget(target: BuildTarget): Promise<boolean> {
    const startTime = Date.now();

    try {
      console.log(`🏗️ Building ${target.name}...`);

      // Change to target directory
      const originalDir = process.cwd();
      process.chdir(target.path);

      // Determine build command
      const buildCommand = this.getBuildCommand(target);

      // Execute build
      execSync(buildCommand, {
        stdio: 'inherit',
        env: {
          ...process.env,
          NODE_ENV: 'production',
          BUILD_OPTIMIZE: this.config.optimization.enabled ? 'true' : 'false',
        },
      });

      // Change back
      process.chdir(originalDir);

      const buildTime = Date.now() - startTime;
      console.log(`✅ Built ${target.name} in ${buildTime}ms`);

      // Update cache
      if (this.config.incremental.enabled) {
        const hash = await this.calculateBuildHash(target);
        this.cache.set(`build:${target.name}`, {
          timestamp: Date.now(),
          hash,
          buildTime,
        });
      }

      return true;
    } catch (error) {
      console.error(`❌ Build failed for ${target.name}:`, error);
      return false;
    }
  }

  private getBuildCommand(target: BuildTarget): string {
    const pkgJsonPath = join(target.path, 'package.json');

    if (existsSync(pkgJsonPath)) {
      const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));

      if (pkgJson.scripts && pkgJson.scripts.build) {
        return 'bun run build';
      }
    }

    // Default build commands based on type
    switch (target.type) {
      case 'package':
        return 'bun build ./src/index.ts --outdir ./dist';
      case 'app':
        return 'bun build ./src/main.ts --outdir ./dist --target browser';
      case 'library':
        return 'bun build ./src/index.ts --outdir ./dist --format esm';
      default:
        return 'bun build ./src/index.ts --outdir ./dist';
    }
  }

  private async buildWithParallelization(targets: BuildTarget[]): Promise<boolean> {
    if (!this.config.parallel.enabled) {
      // Sequential build
      for (const target of targets) {
        if (!(await this.buildTarget(target))) {
          return false;
        }
      }
      return true;
    }

    return new Promise(resolve => {
      let completed = 0;
      let failed = 0;
      const total = targets.length;

      const processNext = async () => {
        if (completed + failed >= total) {
          resolve(failed === 0);
          return;
        }

        if (this.activeBuilds >= this.config.parallel.maxWorkers) {
          return;
        }

        const target = targets[completed + failed];
        if (!target) return;

        this.activeBuilds++;

        const success = await this.buildTarget(target);
        this.activeBuilds--;

        if (success) {
          completed++;
        } else {
          failed++;
        }

        // Process next target
        setTimeout(processNext, 0);
      };

      // Start initial batch
      for (let i = 0; i < Math.min(this.config.parallel.maxWorkers, total); i++) {
        processNext();
      }
    });
  }

  async buildAll(): Promise<boolean> {
    console.log('🚀 Starting optimized build process...\n');

    // Discover build targets
    const targets = await this.discoverBuildTargets();
    console.log(`📦 Found ${targets.length} build targets\n`);

    // Filter targets that need building
    const targetsToBuild: BuildTarget[] = [];

    for (const target of targets) {
      if (await this.isBuildNeeded(target)) {
        targetsToBuild.push(target);
      }
    }

    if (targetsToBuild.length === 0) {
      console.log('🎉 All targets are up to date!');
      return true;
    }

    console.log(`🏗️ Building ${targetsToBuild.length} targets...\n`);

    // Build with parallelization
    const success = await this.buildWithParallelization(targetsToBuild);

    if (success) {
      console.log('\n🎉 Build completed successfully!');

      // Show build stats
      this.showBuildStats(targets);

      // Save cache
      this.saveCache();
    } else {
      console.log('\n❌ Build failed!');
    }

    return success;
  }

  private async discoverBuildTargets(): Promise<BuildTarget[]> {
    const targets: BuildTarget[] = [];

    // Add main application
    if (existsSync('package.json')) {
      targets.push({
        name: 'main-app',
        path: '.',
        type: 'app',
        dependencies: [],
      });
    }

    // Add enterprise packages
    const enterpriseDir = join(process.cwd(), 'enterprise', 'packages');
    if (existsSync(enterpriseDir)) {
      const domains = readdirSync(enterpriseDir).filter(dir =>
        statSync(join(enterpriseDir, dir)).isDirectory()
      );

      for (const domain of domains) {
        const domainPath = join(enterpriseDir, domain);
        const packages = readdirSync(domainPath).filter(
          dir =>
            statSync(join(domainPath, dir)).isDirectory() &&
            existsSync(join(domainPath, dir, 'package.json'))
        );

        for (const pkg of packages) {
          const pkgPath = join(domainPath, pkg);
          const pkgJson = JSON.parse(readFileSync(join(pkgPath, 'package.json'), 'utf-8'));

          targets.push({
            name: pkgJson.name,
            path: pkgPath,
            type: 'package',
            dependencies: Object.keys(pkgJson.dependencies || {}).filter(dep =>
              targets.some(t => t.name === dep)
            ),
          });
        }
      }
    }

    return targets;
  }

  private showBuildStats(targets: BuildTarget[]): void {
    console.log('\n📊 Build Statistics:');

    let totalSize = 0;
    let builtCount = 0;

    for (const target of targets) {
      const distPath = join(target.path, 'dist');
      if (existsSync(distPath)) {
        builtCount++;
        // Calculate size (simplified)
        console.log(`  📦 ${target.name}: Built`);
      } else {
        console.log(`  ⏭️ ${target.name}: Skipped (up to date)`);
      }
    }

    console.log(`\n📈 Summary: ${builtCount}/${targets.length} targets built`);
  }

  async clean(): Promise<void> {
    console.log('🧹 Cleaning build artifacts...');

    const targets = await this.discoverBuildTargets();

    for (const target of targets) {
      const distPath = join(target.path, 'dist');
      if (existsSync(distPath)) {
        execSync(`rm -rf "${distPath}"`);
        console.log(`✅ Cleaned ${target.name}`);
      }
    }

    // Clear cache
    if (this.config.cache.enabled) {
      execSync(`rm -rf "${this.config.cache.dir}"`);
      console.log('✅ Cleared build cache');
    }

    console.log('🎉 Clean completed');
  }

  async watch(): Promise<void> {
    console.log('👀 Starting build watch mode...');

    const targets = await this.discoverBuildTargets();

    // This would implement file watching for incremental builds
    console.log('💡 Watch mode would rebuild targets when source files change');
    console.log('📁 Currently watching:');

    for (const target of targets) {
      console.log(`  📦 ${target.name} (${relative(process.cwd(), target.path)})`);
    }
  }
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const command = args[0] || 'build';

  const optimizer = new BuildOptimizer({
    cache: {
      enabled: !args.includes('--no-cache'),
      dir: './.build-cache',
    },
    parallel: {
      enabled: !args.includes('--no-parallel'),
      maxWorkers: 4,
    },
    incremental: {
      enabled: !args.includes('--no-incremental'),
      trackChanges: true,
    },
    optimization: {
      enabled: !args.includes('--no-optimize'),
      minify: true,
      treeShake: true,
      compress: true,
    },
  });

  switch (command) {
    case 'build':
      await optimizer.buildAll();
      break;

    case 'clean':
      await optimizer.clean();
      break;

    case 'watch':
      await optimizer.watch();
      break;

    case 'cache':
      console.log('📦 Build cache management:');
      console.log('  --no-cache     Disable build caching');
      console.log('  clean          Clear all caches');
      break;

    default:
      console.log('⚡ Build Performance Optimizer\n');
      console.log('Commands:');
      console.log('  build          - Build all targets with optimizations');
      console.log('  clean          - Clean build artifacts and cache');
      console.log('  watch          - Watch mode for incremental builds');
      console.log('  cache          - Cache management options');
      console.log('');
      console.log('Options:');
      console.log('  --no-cache      - Disable build caching');
      console.log('  --no-parallel   - Disable parallel builds');
      console.log('  --no-incremental - Disable incremental builds');
      console.log('  --no-optimize   - Disable build optimizations');
      console.log('');
      console.log('Examples:');
      console.log('  bun run scripts/build-optimizer.bun.ts build');
      console.log('  bun run scripts/build-optimizer.bun.ts build --no-cache');
      console.log('  bun run scripts/build-optimizer.bun.ts clean');
      break;
  }
}

export { BuildOptimizer };
